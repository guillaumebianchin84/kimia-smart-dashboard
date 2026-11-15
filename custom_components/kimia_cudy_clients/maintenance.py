"""Maintenance commands available from the PIN-protected KIMIA settings."""

import asyncio
import re
from math import ceil
from time import time
from uuid import uuid4

import probatio
from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import Context, CoreState
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry, entity_registry
from homeassistant.helpers.storage import Store

COOLDOWN_SECONDS = 90
USB_PATH = re.compile(r"/dev/(?:serial/by-(?:id|path)/.+|tty(?:ACM|USB)\d+)$")


class Maintenance:
    def __init__(self, hass):
        self.hass = hass
        self.instance = uuid4().hex
        self.store = Store(hass, 1, "kimia_settings.maintenance", atomic_writes=True)
        self.until = None
        self.lock = asyncio.Lock()

    async def retry_after(self):
        if self.until is None:
            data = await self.store.async_load() or {}
            if self.until is None:
                self.until = min(data.get("until", 0), time() + COOLDOWN_SECONDS)
        return max(0, ceil(self.until - time()))

    def core_available(self):
        return (self.hass.state is CoreState.running
                and self.hass.services.has_service("homeassistant", "restart"))

    def zigbee_target(self):
        hass = self.hass
        smlight_entries = hass.config_entries.async_entries("smlight")
        registry = entity_registry.async_get(hass)
        devices = device_registry.async_get(hass)
        buttons = []
        for entry in smlight_entries:
            for entity in entity_registry.async_entries_for_config_entry(registry, entry.entry_id):
                if (entity.platform != "smlight" or entity.domain != "button"
                        or not entity.unique_id.endswith("-zigbee_restart")):
                    continue
                device = devices.async_get(entity.device_id) if entity.device_id else None
                if device and (device.model or "").strip().upper() == "SLZB-06U":
                    buttons.append((entry, entity))
        if len(buttons) > 1:
            return None, None, "Plusieurs SLZB-06U sont configurées. Le coordinateur à redémarrer est ambigu."
        if buttons:
            entry, entity = buttons[0]
            state = hass.states.get(entity.entity_id)
            if (entry.state is ConfigEntryState.LOADED and not entry.disabled_by
                    and not entity.disabled_by and state and state.state != STATE_UNAVAILABLE
                    and hass.services.has_service("button", "press")):
                return "smlight", entity.entity_id, None

        zha_entries = [entry for entry in hass.config_entries.async_entries("zha") if not entry.disabled_by]
        if len(zha_entries) == 1:
            entry = zha_entries[0]
            path = entry.data.get("device", {}).get("path", "")
            if (entry.state is ConfigEntryState.LOADED and entry.supports_unload
                    and isinstance(path, str) and USB_PATH.fullmatch(path)):
                return "zha", entry.entry_id, "Recharge ZHA sur USB. La puce Zigbee ne redémarre pas."

        if smlight_entries:
            note = "Le bouton Zigbee de la SLZB-06U est indisponible et aucun rechargement ZHA sur USB n’est disponible."
        else:
            note = "L’intégration SMLIGHT est absente et aucun rechargement ZHA sur USB n’est disponible."
        return None, None, note

    async def status(self, *, include_zigbee=True):
        retry_after = await self.retry_after()
        mode, _, note = self.zigbee_target() if include_zigbee else (None, None, None)
        return {"instance": self.instance, "core": self.core_available(),
                "zigbee": mode, "zigbee_note": note, "retry_after": retry_after}

    async def run(self, settings, connection, msg):
        action = msg["action"]
        async with self.lock:
            remaining = await self.retry_after()
            if remaining:
                raise HomeAssistantError(f"Une commande de maintenance a déjà été lancée. Réessaie dans {remaining} s.")
            if self.hass.state is not CoreState.running:
                raise HomeAssistantError("Home Assistant n’est pas encore prêt.")
            if action == "restart_core" and not self.core_available():
                raise HomeAssistantError("L’action de redémarrage Home Assistant est indisponible.")
            if action == "restart_zigbee":
                mode, _, note = self.zigbee_target()
                if not mode or mode != msg.get("zigbee_mode"):
                    raise HomeAssistantError(note or "La méthode Zigbee a changé. Confirme la nouvelle commande.")

            # Reserve the cooldown before calling a service that may stop this process.
            if not settings.session(connection.user.id, msg["token"]):
                raise PermissionError
            self.until = time() + COOLDOWN_SECONDS
            await self.store.async_save({"until": self.until})
            if not settings.session(connection.user.id, msg["token"]):
                raise PermissionError
            context = connection.context(msg)
            if action == "restart_core":
                if not connection.user.is_admin:
                    # KIMIA delegates only this fixed service after verifying the user's PIN session.
                    context = Context(parent_id=context.id)
                await self.hass.services.async_call("homeassistant", "restart", blocking=True, context=context)
                return
            current_mode, target, note = self.zigbee_target()
            if current_mode != mode:
                raise HomeAssistantError(note or "La méthode Zigbee a changé. Confirme la nouvelle commande.")
            if mode == "smlight":
                await self.hass.services.async_call("button", "press", {"entity_id": target},
                                                    blocking=True, context=context)
                return
            if not await self.hass.config_entries.async_reload(target):
                raise HomeAssistantError("Home Assistant n’a pas pu recharger ZHA.")


@websocket_api.websocket_command({
    probatio.Required("type"): "kimia_settings/maintenance",
    probatio.Required("action"): probatio.In(("instance", "status", "restart_core", "restart_zigbee")),
    probatio.Optional("token", default=""): str,
    probatio.Optional("zigbee_mode"): probatio.In(("smlight", "zha")),
})
@websocket_api.async_response
async def ws_maintenance(hass, connection, msg):
    user = connection.user
    action = msg["action"]
    if (not user.is_active or user.system_generated
            or not (user.is_admin or any(group.id == GROUP_ID_USER for group in user.groups))):
        connection.send_error(msg["id"], "unauthorized", "Ce compte ne peut pas utiliser la maintenance KIMIA.")
        return
    if action == "restart_zigbee" and not user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Un compte administrateur Home Assistant est nécessaire.")
        return
    settings = hass.data["kimia_settings"]
    maintenance = settings.maintenance
    if action == "instance":
        # The old PIN session is lost on restart. This read-only check can use the HA login.
        connection.send_result(msg["id"], {"instance": maintenance.instance,
                                          "running": hass.state is CoreState.running})
        return
    try:
        if not settings.session(user.id, msg["token"]):
            raise PermissionError
        if action == "status":
            result = await maintenance.status(include_zigbee=user.is_admin)
        else:
            await maintenance.run(settings, connection, msg)
            result = {"accepted": True}
    except PermissionError:
        connection.send_error(msg["id"], "pin_required", "Paramètres verrouillés.")
        return
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "maintenance_failed", str(err))
        return
    connection.send_result(msg["id"], result)
