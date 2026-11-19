"""Exercise production handlers against ZHA 2.4.3-shaped devices, without radios."""

import asyncio
import importlib
import sys
import unittest
from pathlib import Path
from types import ModuleType, SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock, patch


class HAError(Exception):
    pass


def module(name, **attributes):
    result = ModuleType(name)
    vars(result).update(attributes)
    return result


def load_bulbs():
    dependencies = [
        module("probatio", Required=lambda key: key, Optional=lambda key, **_: key, In=tuple),
        module("homeassistant.auth.const", GROUP_ID_USER="system-users"),
        module("homeassistant.auth.permissions.const", POLICY_CONTROL="control"),
        module("homeassistant.components", websocket_api=NS(websocket_command=lambda _: lambda fn: fn, async_response=lambda fn: fn)),
        module("homeassistant.components.lovelace", LOVELACE_DATA="lovelace"),
        module("homeassistant.exceptions", HomeAssistantError=HAError),
        module("homeassistant.helpers",
               entity_registry=NS(async_get=lambda hass: hass.registry),
               device_registry=NS(async_get=lambda hass: NS(async_get=hass.devices.get)),
               area_registry=NS(async_get=lambda hass: NS(async_get_area=lambda area: NS(name=area)))),
        module("bulbs_under_test", __path__=[str(Path(__file__).resolve().parents[1] / "custom_components/kimia_cudy_clients")]),
    ]
    with patch.dict(sys.modules, {dep.__name__: dep for dep in dependencies}):
        return importlib.import_module("bulbs_under_test.bulbs")


bulbs = load_bulbs()


class Cluster:
    def __init__(self, values):
        self.values = values.copy()
        self.unsupported_attributes = set()
        self.read_attributes = AsyncMock(side_effect=self.read)
        self.identify = AsyncMock(return_value=NS(status=0))

    def get(self, key):
        return self.values.get(key)

    async def read(self, attributes, **kwargs):
        self.unsupported_attributes.update(key for key in attributes if key not in self.values)
        return {key: self.values[key] for key in attributes if key in self.values}, {}


class BulbsTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.areas = {"client": ["bedroom"]}
        self.config = {"views": [{"path": "utilisateurs", "sections": [{"cards": [{
            "type": bulbs.PROFILE_CARD, "hidden_areas_by_user": self.areas,
        }]}]}]}
        self.registry = {}
        self.devices = {}
        self.zha = {}
        self.states = {}
        self.hass = NS(data={"lovelace": NS(dashboards={"kimia-admin-next": NS(async_load=AsyncMock(return_value=self.config))})},
                       registry=NS(entities=self.registry, async_get=self.registry.get), devices=self.devices,
                       states=NS(get=self.states.get), services=NS(async_call=AsyncMock()))
        self.settings = NS(session=lambda user, token: token == user+"-token")
        self.hass.data["kimia_settings"] = self.settings
        self.user = NS(id="client", is_admin=False, is_active=True, system_generated=False,
                       groups=[NS(id="system-users")], permissions=NS(check_entity=lambda *args: True))
        self.manager = bulbs.BulbSettings(self.hass)
        self.hass.data["kimia_bulb_settings"] = self.manager
        self.gateway_patch = patch.object(bulbs, "get_gateway", return_value=NS(devices=self.zha))
        self.gateway_patch.start()
        self.addCleanup(self.gateway_patch.stop)
        self.add_bulb("light.first", "living")
        self.add_bulb("light.second", "kitchen")

    def add_bulb(self, key, area):
        unique = key+"-endpoint-1"
        clusters = {6: Cluster({0x4003: 255}), 8: Cluster({0x4000: 255, 0x11: 255, 0x12: 10, 0x13: 10, 0x10: 10}),
                    0x300: Cluster({0x4010: 65535, 0x400B: 153, 0x400C: 500}), 3: Cluster({})}
        device = NS(ieee=key, platform_entities={("light", unique): NS(endpoint=NS(id=1))}, available=True,
                    lqi=180, rssi=-58, async_get_clusters=lambda: {1: {"in": clusters}})

        async def write(endpoint, cluster_id, attribute, value):
            clusters[cluster_id].values[attribute] = value
            return [[NS(status=0)]]

        device.write_zigbee_attribute = AsyncMock(side_effect=write)
        self.registry[key] = NS(entity_id=key, domain="light", platform="zha", device_id=key, unique_id=unique,
                                disabled_by=None, hidden_by=None, area_id=None)
        self.devices[key] = NS(identifiers={("zha", key)}, area_id=area, model="RB 282 C", disabled_by=None)
        self.states[key] = NS(state="off", name=key)
        self.zha[key] = device
        return device

    async def request(self, action, entities=None, **kwargs):
        connection = NS(user=self.user, send_error=Mock(), send_result=Mock())
        await bulbs.ws_bulbs(self.hass, connection, {"id": 1, "action": action, "token": self.user.id+"-token",
                                                   "entities": entities or ["light.first"], **kwargs})
        return connection

    def result(self, response):
        response.send_error.assert_not_called()
        return response.send_result.call_args.args[1]

    async def test_offline_inventory_uses_cache_only_and_never_claims_hardware_validation(self):
        for key in self.states:
            self.states[key].state = "unavailable"
        result = self.result(await self.request("list"))
        self.assertEqual(len(result["bulbs"]), 2)
        for bulb in result["bulbs"]:
            self.assertEqual(bulb["model"], "RB 282 C")
            self.assertFalse(bulb["available"])
            self.assertFalse(bulb["fresh"])
            self.assertTrue(all(not field["editable"] for field in bulb["fields"]))
        await self.request("read", list(self.states))
        for device in self.zha.values():
            for cluster in device.async_get_clusters()[1]["in"].values():
                cluster.read_attributes.assert_not_awaited()
            device.write_zigbee_attribute.assert_not_awaited()

    async def test_real_reads_confirm_capabilities_and_white_limits(self):
        bulb = self.result(await self.request("read"))["bulbs"][0]
        self.assertTrue(bulb["fresh"])
        self.assertTrue(all(field["editable"] for field in bulb["fields"]))
        white = next(field for field in bulb["fields"] if field["key"] == "start_white")
        self.assertEqual((white["min_mired"], white["max_mired"]), (153, 500))
        for cluster in self.zha["light.first"].async_get_clusters()[1]["in"].values():
            for call in cluster.read_attributes.await_args_list:
                self.assertEqual(call.kwargs, {"allow_cache": False, "only_cache": False})

    async def test_nonadmin_power_on_setting_uses_physical_attribute_and_fresh_readback(self):
        result = self.result(await self.request("apply", settings={"start_state": 1}))
        self.assertEqual(result["results"][0]["status"], "confirmed")
        self.zha["light.first"].write_zigbee_attribute.assert_awaited_once_with(1, 6, 0x4003, 1)
        self.assertEqual(result["results"][0]["fields"][0]["actual"], 1)
        self.hass.services.async_call.assert_not_awaited()

    async def test_absent_or_unreadable_attributes_are_never_writable(self):
        cluster = self.zha["light.first"].async_get_clusters()[1]["in"][8]
        del cluster.values[0x12]
        fields = self.result(await self.request("read"))["bulbs"][0]["fields"]
        unsupported = next(field for field in fields if field["key"] == "on_transition")
        self.assertEqual(unsupported["status"], "unsupported")
        self.assertFalse(unsupported["editable"])
        (await self.request("apply", settings={"on_transition": 10})).send_error.assert_called_once()
        self.zha["light.first"].write_zigbee_attribute.assert_not_awaited()

    async def test_transport_timeout_never_becomes_success(self):
        cluster = self.zha["light.first"].async_get_clusters()[1]["in"][6]
        cluster.read_attributes.side_effect = TimeoutError
        field = self.result(await self.request("read"))["bulbs"][0]["fields"][0]
        self.assertEqual(field["status"], "unreadable")
        self.assertFalse(field["editable"])
        (await self.request("apply", settings={"start_state": 1})).send_error.assert_called_once()

    async def test_rejected_write_and_wrong_readback_remain_unconfirmed(self):
        self.zha["light.first"].write_zigbee_attribute.side_effect = None
        self.zha["light.first"].write_zigbee_attribute.return_value = [[NS(status=0)]]
        result = self.result(await self.request("apply", settings={"start_state": 1}))
        self.assertEqual(result["results"][0]["status"], "not_confirmed")
        self.manager.last_mutation.clear()
        self.zha["light.first"].write_zigbee_attribute.return_value = [[NS(status=0x87)]]
        result = self.result(await self.request("apply", settings={"start_state": 1}))
        self.assertEqual(result["results"][0]["fields"][0]["status"], "rejected")

    async def test_batch_validates_all_devices_before_any_write(self):
        cluster = self.zha["light.second"].async_get_clusters()[1]["in"][6]
        del cluster.values[0x4003]
        (await self.request("apply", list(self.zha), settings={"start_state": 1})).send_error.assert_called_once()
        for device in self.zha.values():
            device.write_zigbee_attribute.assert_not_awaited()

    async def test_offline_apply_is_rejected_without_any_write(self):
        self.states["light.second"].state = "unavailable"
        (await self.request("apply", list(self.zha), settings={"start_state": 1})).send_error.assert_called_once()
        for device in self.zha.values():
            device.write_zigbee_attribute.assert_not_awaited()

    async def test_pin_session_is_per_account_and_expires_even_for_admin(self):
        for token in ("", "someone-else-token"):
            response = await self.request("list", token=token)
            self.assertEqual(response.send_error.call_args.args[1], "pin_required")
        self.settings.session = lambda *args: False
        self.user.is_admin = True
        self.assertEqual((await self.request("read")).send_error.call_args.args[1], "pin_required")

    async def test_hidden_rooms_and_ha_control_permissions_are_applied_server_side(self):
        self.areas["client"] = ["living"]
        self.assertEqual([item["entity_id"] for item in self.result(await self.request("list"))["bulbs"]], ["light.second"])
        (await self.request("apply", settings={"start_state": 1})).send_error.assert_called_once()
        self.registry["light.first"].area_id = "kitchen"
        self.assertEqual(len(self.result(await self.request("list"))["bulbs"]), 2)
        self.user.permissions.check_entity = lambda key, policy: key != "light.first"
        self.assertEqual(len(self.result(await self.request("list"))["bulbs"]), 1)
        self.zha["light.first"].write_zigbee_attribute.assert_not_awaited()

    async def test_missing_acl_fails_closed_for_client_and_admin_retains_access(self):
        self.hass.data.clear()
        self.hass.data.update({"kimia_settings": self.settings, "kimia_bulb_settings": self.manager})
        (await self.request("list")).send_error.assert_called_once()
        self.user.is_admin = True
        self.assertEqual(len(self.result(await self.request("list"))["bulbs"]), 2)

    async def test_readonly_inactive_and_system_users_are_rejected(self):
        for change in ({"is_active": False}, {"system_generated": True}, {"groups": [NS(id="read-only")]}):
            original = vars(self.user).copy()
            vars(self.user).update(change)
            (await self.request("list")).send_error.assert_called_once()
            vars(self.user).update(original)

    async def test_nonlighting_foreign_targets_and_arbitrary_attributes_rejected(self):
        for changes in ({"entity_id": "switch.plug", "domain": "switch"}, {"platform": "mqtt"}, {"unique_id": "bogus"}):
            entry = self.registry["light.first"]
            original = vars(entry).copy()
            vars(entry).update(changes)
            (await self.request("apply", settings={"start_state": 1})).send_error.assert_called_once()
            vars(entry).update(original)
        for settings in ({"factory_reset": 1}, {"start_state": True}, {"start_white": 100}, {"start_level": 256}, {"start_state": "1"}):
            (await self.request("apply", settings=settings)).send_error.assert_called_once()
        self.zha["light.first"].write_zigbee_attribute.assert_not_awaited()

    async def test_identify_and_cooldown_are_limited_to_one_real_lighting_endpoint(self):
        self.result(await self.request("identify"))
        self.zha["light.first"].async_get_clusters()[1]["in"][3].identify.assert_awaited_once_with(identify_time=3)
        (await self.request("identify")).send_error.assert_called_once()
        (await self.request("identify", list(self.zha))).send_error.assert_called_once()
        self.zha["light.first"].write_zigbee_attribute.assert_not_awaited()

    async def test_overlap_and_expiry_during_read_are_rejected(self):
        async with self.manager.lock:
            (await self.request("read")).send_error.assert_called_once()
        cluster = self.zha["light.first"].async_get_clusters()[1]["in"][6]
        original = cluster.read

        async def expire(*args, **kwargs):
            self.settings.session = lambda *args: False
            return await original(*args, **kwargs)

        cluster.read_attributes.side_effect = expire
        (await self.request("apply", settings={"start_state": 1})).send_error.assert_called_once()
        self.zha["light.first"].write_zigbee_attribute.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
