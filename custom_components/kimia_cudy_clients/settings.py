"""Local KIMIA settings sessions and the Cudy Wi-Fi operations they allow."""

import asyncio
import hashlib
import hmac
import secrets
from pathlib import Path
from time import monotonic

import probatio
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry

IDLE_SECONDS = 300
WISP = {
    "scan": ("button", "wisp-scan", "press"),
    "network": ("select", "wisp-network", "select_option"),
    "password": ("text", "wisp-password", "set_value"),
    "connect": ("button", "wisp-connect", "press"),
}


def load_pin(path):
    try:
        salt, digest = Path(path).read_text(encoding="ascii").strip().split(":", 1)
        salt, digest = bytes.fromhex(salt), bytes.fromhex(digest)
    except (OSError, ValueError):
        return None
    return (salt, digest) if len(salt) == 16 and len(digest) == 32 else None


class Settings:
    def __init__(self, hass, pin):
        self.hass = hass
        self.pin = pin
        self.sessions = {}
        self.attempts = {}
        self.wifi_lock = asyncio.Lock()

    def session(self, user, token, touch=False):
        now = monotonic()
        for key, (_, expires) in list(self.sessions.items()):
            if expires <= now:
                del self.sessions[key]
        entry = self.sessions.get(token)
        if not entry or entry[0] != user:
            return False
        if touch:
            self.sessions[token] = (user, now + IDLE_SECONDS)
        return True

    def unlock(self, user, pin):
        if not self.pin:
            return None, "pin_unconfigured"
        now = monotonic()
        tries, until = self.attempts.get(user, (0, now + 60))
        if now >= until:
            tries, until = 0, now + 60
        if tries >= 5:
            return None, "pin_rate_limited"
        if len(pin) != 4 or not pin.isascii() or not pin.isdecimal():
            return None, "pin_invalid"
        salt, expected = self.pin
        if not hmac.compare_digest(hashlib.sha256(salt + pin.encode()).digest(), expected):
            self.attempts[user] = (tries + 1, until)
            return None, "pin_invalid"
        self.attempts.pop(user, None)
        self.session(user, "")
        token = secrets.token_urlsafe(32)
        self.sessions[token] = (user, now + IDLE_SECONDS)
        return token, None

    def wifi_entities(self, requested, kinds):
        registry = entity_registry.async_get(self.hass)
        result = {}
        entries = set()
        for kind in kinds:
            domain, suffix, _ = WISP[kind]
            entity_id = requested.get(kind)
            if not isinstance(entity_id, str):
                raise ValueError
            entity = registry.async_get(entity_id)
            state = self.hass.states.get(entity_id)
            if (not entity or entity.platform != "cudy_router" or entity.domain != domain
                or entity.disabled_by or not entity.config_entry_id
                or entity.unique_id != f"{entity.config_entry_id}-{suffix}"
                or not state or state.state == "unavailable"):
                raise ValueError
            entries.add(entity.config_entry_id)
            result[kind] = entity_id
        if len(entries) != 1:
            raise ValueError
        return result

    async def wifi(self, connection, msg):
        action = msg["action"]
        if action not in ("scan", "connect"):
            raise ValueError
        kinds = ("scan",) if action == "scan" else ("network", "password", "connect")
        async with self.wifi_lock:
            if not self.session(connection.user.id, msg["token"], touch=True):
                raise PermissionError
            ids = self.wifi_entities(msg["entities"], kinds)
            values = {}
            if action == "connect":
                ssid, password = msg.get("ssid", ""), msg.get("password", "")
                if (not ssid or len(ssid.encode()) > 32 or len(password) > 64 or
                    ssid not in self.hass.states.get(ids["network"]).attributes.get("options", [])):
                    raise ValueError
                values = {"network": {"option": ssid}, "password": {"value": password}}
            context = connection.context(msg)
            for kind in kinds:
                domain, _, service = WISP[kind]
                await self.hass.services.async_call(domain, service,
                    {"entity_id": ids[kind], **values.get(kind, {})},
                    blocking=True, context=context)


@websocket_api.websocket_command({
    probatio.Required("type"): "kimia_settings/session",
    probatio.Required("action"): str,
    probatio.Optional("token", default=""): str,
    probatio.Optional("pin", default=""): str,
})
@websocket_api.async_response
async def ws_session(hass, connection, msg):
    settings = hass.data["kimia_settings"]
    user, action, token = connection.user.id, msg["action"], msg["token"]
    if action == "unlock":
        token, error = settings.unlock(user, msg["pin"])
        if error:
            connection.send_error(msg["id"], error, "Déverrouillage refusé")
            return
        connection.send_result(msg["id"], {"token": token, "unlocked": True})
        return
    if action == "lock":
        if settings.session(user, token):
            settings.sessions.pop(token, None)
    elif action not in ("status", "touch"):
        connection.send_error(msg["id"], "invalid_format", "Action inconnue")
        return
    connection.send_result(msg["id"], {
        "unlocked": settings.session(user, token, touch=action == "touch"),
    })


@websocket_api.websocket_command({
    probatio.Required("type"): "kimia_settings/wifi",
    probatio.Required("action"): str,
    probatio.Required("token"): str,
    probatio.Required("entities"): dict,
    probatio.Optional("ssid"): str,
    probatio.Optional("password"): str,
})
@websocket_api.async_response
async def ws_wifi(hass, connection, msg):
    try:
        await hass.data["kimia_settings"].wifi(connection, msg)
    except PermissionError:
        connection.send_error(msg["id"], "pin_required", "Paramètres verrouillés")
        return
    except (ValueError, HomeAssistantError):
        connection.send_error(msg["id"], "wifi_unavailable", "Commande Wi-Fi indisponible")
        return
    connection.send_result(msg["id"], {})


async def async_setup_settings(hass: HomeAssistant):
    path = hass.config.path("kimia", "settings_pin")
    pin = await hass.async_add_executor_job(load_pin, path)
    hass.data["kimia_settings"] = Settings(hass, pin)
    websocket_api.async_register_command(hass, ws_session)
    websocket_api.async_register_command(hass, ws_wifi)
