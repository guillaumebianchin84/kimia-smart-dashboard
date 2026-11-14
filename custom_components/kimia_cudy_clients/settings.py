"""Local KIMIA settings sessions and their permitted operations."""

import asyncio
import hashlib
import hmac
import secrets
from copy import deepcopy
from math import isfinite
from pathlib import Path
from time import monotonic

import probatio
from homeassistant.components import websocket_api
from homeassistant.components.lovelace import LOVELACE_DATA
from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry

IDLE_SECONDS = 300
WISP = {
    "scan": ("button", "wisp-scan", "press"),
    "network": ("select", "wisp-network", "select_option"),
    "password": ("text", "wisp-password", "set_value"),
    "connect": ("button", "wisp-connect", "press"),
}
EMPTY_LISTS = "Aucune liste sélectionnée. Choisissez les listes à afficher dans les paramètres KIMIA."


def managed_todo(card):
    title = card.get("title")
    return (
        card.get("type") == "todo-list"
        and isinstance(title, str)
        and (title == "Mes listes" or title.startswith("KIMIA · "))
        and set(card) == {"type", "entity", "title", "grid_options"}
        and card["grid_options"] == {"columns": 12, "rows": "auto"}
    )


def todo_placeholder(card):
    content = card.get("content", "")
    return card.get("type") == "markdown" and (
        content == EMPTY_LISTS or content.startswith("KIMIA V1.4 : aucune liste To-do détectée.")
    )


def with_todo_selection(config, selected, states):
    after = deepcopy(config)
    view = next((view for view in after["views"] if view.get("path") == "listes"), None)
    if not view or not view.get("sections"):
        raise HomeAssistantError("La vue Listes de KIMIA est introuvable.")
    sections = [section["cards"] for section in view["sections"] if "cards" in section]
    target = next((cards for cards in sections if any(
        card.get("type") == "todo-list" or todo_placeholder(card) for card in cards
    )), None)
    if target is None:
        raise HomeAssistantError("La section To-do de KIMIA est introuvable.")
    existing = [card for cards in [*sections, view.get("cards", [])] for card in cards
                if card.get("type") == "todo-list"]
    if any(not managed_todo(card) and card.get("entity") not in selected for card in existing):
        raise HomeAssistantError("Une liste personnalisée est présente. Elle doit rester sélectionnée.")
    if set(selected) == {card.get("entity") for card in existing} and (
        selected or any(card.get("content") == EMPTY_LISTS for card in target)
    ):
        return config
    for cards in sections:
        cards[:] = [card for card in cards if not (
            managed_todo(card) and card.get("entity") not in selected or todo_placeholder(card)
        )]
    kept = {card.get("entity") for card in existing if card.get("entity") in selected}
    for entity in selected:
        if entity not in kept:
            target.append({"type": "todo-list", "entity": entity,
                           "title": "KIMIA · " + (states.get(entity).name or entity),
                           "grid_options": {"columns": 12, "rows": "auto"}})
    if not selected:
        target.append({"type": "markdown", "content": EMPTY_LISTS,
                       "grid_options": {"columns": 12, "rows": "auto"}})
    return after


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
        self.todo_lock = asyncio.Lock()
        self.zone_lock = asyncio.Lock()

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


@websocket_api.websocket_command({
    probatio.Required("type"): "kimia_settings/todo",
    probatio.Required("action"): probatio.In(("save", "create")),
    probatio.Required("token"): str,
    probatio.Optional("entities"): [str],
    probatio.Optional("name"): str,
})
@websocket_api.async_response
async def ws_todo(hass, connection, msg):
    settings = hass.data["kimia_settings"]
    async with settings.todo_lock:
        if not settings.session(connection.user.id, msg["token"], touch=True):
            connection.send_error(msg["id"], "pin_required", "Paramètres verrouillés")
            return
        try:
            if msg["action"] == "create":
                name = msg.get("name", "").strip()
                if not name or len(name) > 70:
                    raise HomeAssistantError("Saisissez un nom de liste valide.")
                flow = await hass.config_entries.flow.async_init("local_todo", context={"source": SOURCE_USER})
                if flow["type"] != FlowResultType.FORM:
                    raise HomeAssistantError("La création Local To-do est indisponible.")
                result = await hass.config_entries.flow.async_configure(flow["flow_id"], {"todo_list_name": name})
                if result["type"] != FlowResultType.CREATE_ENTRY:
                    raise HomeAssistantError("La liste n’a pas été créée. Vérifiez qu’une liste du même nom n’existe pas.")
            else:
                selected = list(dict.fromkeys(msg.get("entities", [])))
                if len(selected) > 3 or any(not key.startswith("todo.") or not hass.states.get(key) for key in selected):
                    raise HomeAssistantError("Choisissez jusqu’à trois listes disponibles.")
                lovelace = hass.data.get(LOVELACE_DATA)
                dashboard = lovelace.dashboards.get("kimia-next") if lovelace else None
                if not dashboard or dashboard.mode != "storage":
                    raise HomeAssistantError("Le tableau de bord KIMIA n’est pas disponible en mode stockage.")
                config = await dashboard.async_load(False)
                after = with_todo_selection(config, selected, hass.states)
                if after is not config:
                    await dashboard.async_save(after)
        except HomeAssistantError as err:
            connection.send_error(msg["id"], "todo_failed", str(err))
            return
    connection.send_result(msg["id"], {})


@websocket_api.websocket_command({
    probatio.Required("type"): "kimia_settings/zone/create",
    probatio.Required("token"): str,
    probatio.Required("name"): str,
    probatio.Required("latitude"): probatio.Any(int, float),
    probatio.Required("longitude"): probatio.Any(int, float),
    probatio.Required("radius"): probatio.Any(int, float),
})
@websocket_api.async_response
async def ws_create_zone(hass, connection, msg):
    settings = hass.data["kimia_settings"]
    async with settings.zone_lock:
        if not settings.session(connection.user.id, msg["token"], touch=True):
            connection.send_error(msg["id"], "pin_required", "Paramètres verrouillés")
            return
        name = msg["name"].strip()
        latitude, longitude, radius = (msg[key] for key in ("latitude", "longitude", "radius"))
        if (not name or len(name) > 70 or not -90 <= latitude <= 90
                or not -180 <= longitude <= 180 or not 1 <= radius <= 40_000_000
                or not all(isfinite(value) for value in (latitude, longitude, radius))):
            connection.send_error(msg["id"], "zone_invalid", "Vérifiez le nom, la position et le rayon de la zone.")
            return
        zones = hass.data.get("zone")
        # Home Assistant 2026.11 stores the collection on ZoneData. Earlier
        # versions stored the collection itself under the same key.
        collection = getattr(zones, "storage_collection", zones)
        if collection is None:
            connection.send_error(msg["id"], "zone_unavailable", "La gestion des zones est indisponible.")
            return
        try:
            if any(state.name.strip().casefold() == name.casefold() for state in hass.states.async_all("zone")):
                connection.send_error(msg["id"], "zone_exists", "Une zone porte déjà ce nom.")
                return
            item = await collection.async_create_item({
                "name": name, "latitude": latitude, "longitude": longitude, "radius": radius,
            })
        except (probatio.Invalid, HomeAssistantError):
            connection.send_error(msg["id"], "zone_failed", "Home Assistant n’a pas pu créer cette zone.")
            return
    connection.send_result(msg["id"], {"id": item["id"]})


async def async_setup_settings(hass: HomeAssistant):
    path = hass.config.path("kimia", "settings_pin")
    pin = await hass.async_add_executor_job(load_pin, path)
    hass.data["kimia_settings"] = Settings(hass, pin)
    websocket_api.async_register_command(hass, ws_session)
    websocket_api.async_register_command(hass, ws_wifi)
    websocket_api.async_register_command(hass, ws_todo)
    websocket_api.async_register_command(hass, ws_create_zone)
