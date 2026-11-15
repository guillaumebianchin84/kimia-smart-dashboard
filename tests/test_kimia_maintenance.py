"""Exercise the real KIMIA handlers with Home Assistant registry and service fakes."""

import asyncio
import hashlib
import importlib
import sys
import unittest
from enum import Enum
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch


class State(Enum):
    running = "RUNNING"
    starting = "STARTING"
    LOADED = "loaded"


class HomeAssistantError(Exception):
    pass


class Context:
    def __init__(self, user_id=None, parent_id=None, id="request-context"):
        self.user_id = user_id
        self.parent_id = parent_id
        self.id = id


class Store:
    def __init__(self, hass, _version, _key, **_options):
        self.data = hass.storage

    async def async_load(self):
        return self.data.copy()

    async def async_save(self, data):
        self.data.update(data)


def load_settings():
    def module(name, **attributes):
        result = ModuleType(name)
        vars(result).update(attributes)
        return result

    websocket_api = SimpleNamespace(websocket_command=lambda _: lambda fn: fn, async_response=lambda fn: fn)
    registry = SimpleNamespace(async_get=lambda hass: hass.registry,
                               async_entries_for_config_entry=lambda reg, key: reg.get(key, []))
    devices = SimpleNamespace(async_get=lambda hass: SimpleNamespace(async_get=hass.devices.get))
    dependencies = [
        module("probatio", Required=lambda key: key, Optional=lambda key, **_: key, In=tuple, Any=lambda *types: types),
        module("homeassistant.auth.const", GROUP_ID_USER="system-users"),
        module("homeassistant.components", websocket_api=websocket_api),
        module("homeassistant.components.lovelace", LOVELACE_DATA="lovelace"),
        module("homeassistant.config_entries", ConfigEntryState=State, SOURCE_USER="user"),
        module("homeassistant.const", STATE_UNAVAILABLE="unavailable"),
        module("homeassistant.core", Context=Context, CoreState=State, HomeAssistant=object),
        module("homeassistant.data_entry_flow", FlowResultType=object),
        module("homeassistant.exceptions", HomeAssistantError=HomeAssistantError),
        module("homeassistant.helpers", device_registry=devices, entity_registry=registry),
        module("homeassistant.helpers.storage", Store=Store),
        module("settings_under_test", __path__=[str(Path(__file__).resolve().parents[1] /
                                                   "custom_components" / "kimia_cudy_clients")]),
    ]
    with patch.dict(sys.modules, {dep.__name__: dep for dep in dependencies}):
        return importlib.import_module("settings_under_test.settings"), sys.modules["settings_under_test.maintenance"]


settings_module, maintenance_module = load_settings()


class MaintenanceTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.smlight = SimpleNamespace(entry_id="sml", state=State.LOADED, disabled_by=None)
        self.radio = SimpleNamespace(entity_id="button.renamed", platform="smlight", domain="button",
                                     unique_id="integration-id-zigbee_restart", device_id="key", disabled_by=None)
        other_button = SimpleNamespace(**{**vars(self.radio), "unique_id": "integration-id-core_restart"})
        self.entries = {"smlight": [self.smlight]}
        self.hass = SimpleNamespace(
            state=State.running, storage={}, data={}, registry={"sml": [other_button, self.radio]},
            devices={"key": SimpleNamespace(model="SLZB-06U")}, states={"button.renamed": SimpleNamespace(state="unknown")},
            config_entries=SimpleNamespace(async_entries=lambda domain: self.entries.get(domain, []),
                                           async_reload=AsyncMock(return_value=True)),
            services=SimpleNamespace(has_service=lambda *args: True, async_call=AsyncMock()),
        )
        self.pin, salt = "3176", b"test salt"
        self.settings = settings_module.Settings(self.hass, (salt, hashlib.sha256(salt + self.pin.encode()).digest()))
        self.hass.data["kimia_settings"] = self.settings
        self.token, _ = self.settings.unlock("admin", self.pin)
        self.client_token, _ = self.settings.unlock("client", self.pin)
        self.context = Context(user_id="admin")

    async def request(self, action, user="admin", is_admin=True, token=None, *,
                      group="system-users", active=True, system_generated=False, **kwargs):
        account = SimpleNamespace(id=user, is_admin=is_admin, is_active=active,
                                  system_generated=system_generated, groups=[SimpleNamespace(id=group)])
        context = self.context if is_admin else Context(user_id=user)
        connection = SimpleNamespace(user=account, send_error=Mock(), send_result=Mock(),
                                     context=Mock(return_value=context))
        await maintenance_module.ws_maintenance(self.hass, connection,
                                                {"id": 7, "action": action, "token": self.token if token is None else token, **kwargs})
        return connection

    async def test_matching_pin_and_eligible_account_required(self):
        for kwargs, error in (({"active": False}, "unauthorized"), ({"system_generated": True}, "unauthorized"),
                              ({"token": ""}, "pin_required"), ({"user": "other-admin"}, "pin_required"),
                              ({"user": "client", "is_admin": False, "token": self.token}, "pin_required"),
                              ({"user": "client", "is_admin": False, "token": self.client_token,
                                "group": "system-read-only"}, "unauthorized")):
            self.assertEqual((await self.request("restart_core", **kwargs)).send_error.call_args.args[1], error)
        clock = self.settings.sessions[self.token][1]
        with patch.object(settings_module, "monotonic", return_value=clock - 1):
            self.assertTrue(self.settings.session("admin", self.token))
        with patch.object(settings_module, "monotonic", return_value=clock):
            self.assertEqual((await self.request("restart_core")).send_error.call_args.args[1], "pin_required")
        self.assertEqual(settings_module.IDLE_SECONDS, 600)
        self.hass.services.async_call.assert_not_awaited()

    async def test_client_can_restart_only_core_with_own_pin(self):
        client = {"user": "client", "is_admin": False, "token": self.client_token}
        status = await self.request("status", **client)
        result = status.send_result.call_args.args[1]
        self.assertTrue(result["core"])
        self.assertIsNone(result["zigbee"])
        refused = await self.request("restart_zigbee", **client, zigbee_mode="smlight")
        self.assertEqual(refused.send_error.call_args.args[1], "unauthorized")
        self.hass.services.async_call.assert_not_awaited()
        (await self.request("restart_core", **client)).send_result.assert_called_once_with(7, {"accepted": True})
        call = self.hass.services.async_call.await_args
        self.assertEqual(call.args, ("homeassistant", "restart"))
        self.assertIsNone(call.kwargs["context"].user_id)
        self.assertEqual(call.kwargs["context"].parent_id, "request-context")
        instance = await self.request("instance", user="client", is_admin=False, token="")
        instance.send_result.assert_called_once_with(7, {"instance": self.settings.maintenance.instance, "running": True})

    async def test_core_only_and_cooldown_across_users_and_boot(self):
        first, second = await asyncio.gather(
            self.request("restart_core"),
            self.request("restart_core", user="client", is_admin=False, token=self.client_token),
        )
        first.send_result.assert_called_once_with(7, {"accepted": True})
        self.assertEqual(second.send_error.call_args.args[1], "maintenance_failed")
        self.hass.services.async_call.assert_awaited_once_with("homeassistant", "restart", blocking=True, context=self.context)
        new_instance = maintenance_module.Maintenance(self.hass)
        self.assertNotEqual(new_instance.instance, self.settings.maintenance.instance)
        self.assertGreater(await new_instance.retry_after(), 0)
        self.settings.maintenance = new_instance
        self.hass.state = State.starting
        check = await self.request("instance", token="")
        check.send_result.assert_called_once_with(7, {"instance": new_instance.instance, "running": False})

    async def test_smlight_uses_official_radio_even_when_renamed(self):
        result = await self.request("restart_zigbee", zigbee_mode="smlight", entity_id="button.unrelated")
        result.send_result.assert_called_once_with(7, {"accepted": True})
        self.hass.services.async_call.assert_awaited_once_with("button", "press", {"entity_id": "button.renamed"},
                                                              blocking=True, context=self.context)
        self.hass.config_entries.async_reload.assert_not_awaited()

    async def test_ambiguous_hardware_stays_disabled(self):
        self.hass.registry["sml"].append(SimpleNamespace(**vars(self.radio)))
        self.assertIsNone((await self.settings.maintenance.status())["zigbee"])
        self.hass.services.async_call.assert_not_awaited()

    async def test_usb_fallback_requires_its_own_confirmation_and_reports_failure(self):
        self.hass.states["button.renamed"].state = "unavailable"
        entry = SimpleNamespace(entry_id="usb-zha", state=State.LOADED, supports_unload=True, disabled_by=None,
                                data={"device": {"path": "socket://zigbee:6638"}})
        self.entries["zha"] = [entry]
        self.assertIsNone((await self.settings.maintenance.status())["zigbee"])
        entry.data["device"]["path"] = "/dev/serial/by-id/usb-Test_Radio"
        self.assertEqual((await self.settings.maintenance.status())["zigbee"], "zha")
        (await self.request("restart_zigbee", zigbee_mode="smlight")).send_error.assert_called_once()
        self.hass.services.async_call.assert_not_awaited()
        self.hass.config_entries.async_reload.return_value = False
        result = await self.request("restart_zigbee", zigbee_mode="zha")
        result.send_error.assert_called_once_with(7, "maintenance_failed", "Home Assistant n’a pas pu recharger ZHA.")
        self.hass.config_entries.async_reload.assert_awaited_once_with("usb-zha")
        self.hass.config_entries.async_reload.return_value = True
        with patch.object(maintenance_module, "time", return_value=self.settings.maintenance.until + 1):
            (await self.request("restart_zigbee", zigbee_mode="zha")).send_result.assert_called_once_with(
                7, {"accepted": True}
            )
        self.hass.services.async_call.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
