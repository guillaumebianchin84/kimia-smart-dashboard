"""PIN-authorized, area-scoped access to standard Zigbee lighting settings.

No arbitrary attributes, services or commands are accepted from the browser.
Listing uses the ZHA cache only. Radio reads require an explicit refresh.
"""

import asyncio
from dataclasses import dataclass
from time import monotonic

import probatio
from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.auth.permissions.const import POLICY_CONTROL
from homeassistant.components import websocket_api
from homeassistant.components.lovelace import LOVELACE_DATA
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import area_registry, device_registry, entity_registry


@dataclass(frozen=True)
class Setting:
    cluster: int
    attribute: int
    label: str
    kind: str


SETTINGS = {
    "start_state": Setting(0x0006, 0x4003, "État au retour du courant", "select"),
    "start_level": Setting(0x0008, 0x4000, "Luminosité au retour du courant", "level"),
    "start_white": Setting(0x0300, 0x4010, "Blanc au retour du courant", "white"),
    "on_level": Setting(0x0008, 0x0011, "Luminosité à l’allumage normal", "level"),
    "on_transition": Setting(0x0008, 0x0012, "Transition à l’allumage", "seconds"),
    "off_transition": Setting(0x0008, 0x0013, "Transition à l’extinction", "seconds"),
    "on_off_transition": Setting(0x0008, 0x0010, "Transition commune", "seconds"),
}
POWER_OPTIONS = [("0", "Toujours éteinte"), ("1", "Toujours allumée"),
                 ("255", "Restaurer le dernier état"), ("2", "Inverser le dernier état")]
PROFILE_CARD = "custom:kimia-user-visibility-v15-card"
MAX_TARGETS = 20


def walk_cards(value):
    if isinstance(value, dict):
        if "type" in value:
            yield value
        for child in value.values():
            yield from walk_cards(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_cards(child)


def get_gateway(hass):
    # Import lazily so the existing settings still start when ZHA is absent.
    from homeassistant.components.zha.helpers import get_zha_gateway

    try:
        return get_zha_gateway(hass)
    except (ValueError, KeyError) as err:
        raise HomeAssistantError("ZHA n’est pas encore disponible.") from err


def cached(cluster, attribute):
    value = cluster.get(attribute) if cluster is not None else None
    return int(value) if isinstance(value, int) else None


def valid_value(key, value, limits):
    if type(value) is not int:
        return False
    if key == "start_state":
        return value in (0, 1, 2, 255)
    if key in ("start_level", "on_level"):
        return 1 <= value <= 255 or key == "start_level" and value == 0
    if key == "start_white":
        low, high = limits
        return value == 65535 or low is not None and high is not None and low <= value <= high
    return 0 <= value <= 65534 or key != "on_off_transition" and value == 65535


def successful_write(response):
    if not isinstance(response, (list, tuple)):
        return False
    records = []
    for group in response:
        records.extend(group if isinstance(group, (list, tuple)) else [group])
    return bool(records) and all(getattr(record, "status", None) == 0 for record in records)


class BulbSettings:
    def __init__(self, hass):
        self.hass = hass
        self.lock = asyncio.Lock()
        self.last_mutation = {}

    async def hidden_areas(self, user):
        if user.is_admin:
            return set()
        data = self.hass.data.get(LOVELACE_DATA)
        dashboard = data.dashboards.get("kimia-admin-next") if data else None
        if dashboard is None:
            raise HomeAssistantError("Les autorisations des pièces KIMIA sont indisponibles.")
        config = await dashboard.async_load(False)
        view = next((view for view in config.get("views", []) if view.get("path") == "utilisateurs"), {})
        profiles = [card for card in walk_cards(view) if card.get("type") == PROFILE_CARD]
        if len(profiles) != 1:
            raise HomeAssistantError("Les autorisations des pièces KIMIA sont indisponibles.")
        mapping = profiles[0].get("hidden_areas_by_user", {})
        hidden = mapping.get(user.id, []) if isinstance(mapping, dict) else None
        if not isinstance(hidden, list) or any(not isinstance(area, str) for area in hidden):
            raise HomeAssistantError("Les autorisations de ce compte doivent être vérifiées.")
        return set(hidden)

    def resolve(self, entity_id, user, hidden):
        registry = entity_registry.async_get(self.hass)
        entry = registry.async_get(entity_id)
        if (not entry or entry.domain != "light" or entry.platform != "zha"
                or entry.disabled_by or entry.hidden_by or not entry.device_id
                or not user.permissions.check_entity(entity_id, POLICY_CONTROL)):
            raise HomeAssistantError("Ampoule inaccessible pour ce compte.")
        device = device_registry.async_get(self.hass).async_get(entry.device_id)
        if device is None or device.disabled_by:
            raise HomeAssistantError("Ampoule inaccessible pour ce compte.")
        area_id = entry.area_id or device.area_id
        if area_id in hidden:
            raise HomeAssistantError("Cette pièce est masquée pour ce compte.")
        gateway = get_gateway(self.hass)
        zha_device = next((item for item in gateway.devices.values()
                           if ("zha", str(item.ieee)) in device.identifiers), None)
        if zha_device is None:
            raise HomeAssistantError("Cette ampoule ZHA est indisponible.")
        matches = [light for (platform, unique_id), light in zha_device.platform_entities.items()
                   if str(platform) == "light" and unique_id == entry.unique_id]
        if len(matches) != 1:
            raise HomeAssistantError("Le point de commande de cette ampoule est introuvable.")
        endpoint_id = matches[0].endpoint.id
        clusters = zha_device.async_get_clusters().get(endpoint_id, {}).get("in", {})
        if 0x0006 not in clusters:
            raise HomeAssistantError("Cette entité n’est pas une ampoule compatible.")
        state = self.hass.states.get(entity_id)
        area = area_registry.async_get(self.hass).async_get_area(area_id) if area_id else None
        return {"entity_id": entity_id, "device": zha_device, "endpoint": endpoint_id,
                "clusters": clusters, "state": state,
                "name": state.name if state else entry.name or entry.original_name or entity_id,
                "model": device.model or "Modèle non renseigné",
                "area": area.name if area else "Sans pièce", "area_id": area_id,
                "available": bool(zha_device.available and state and state.state not in ("unavailable", "unknown"))}

    def describe(self, target, readings=None):
        clusters = target["clusters"]
        color = clusters.get(0x0300)
        low, high = cached(color, 0x400B), cached(color, 0x400C)
        bounds = readings.get(0x0300, {}) if readings is not None else {}
        low, high = bounds.get(0x400B, low), bounds.get(0x400C, high)
        if low is None or high is None or not 0 < low <= high < 65535:
            low = high = None
        fields = []
        for key, spec in SETTINGS.items():
            cluster = clusters.get(spec.cluster)
            value = cached(cluster, spec.attribute)
            unsupported = cluster is None or spec.attribute in getattr(cluster, "unsupported_attributes", set())
            fresh = readings is not None and spec.attribute in readings.get(spec.cluster, {})
            if fresh:
                value = readings[spec.cluster][spec.attribute]
            status = "unsupported" if unsupported else "confirmed" if fresh else "cached" if value is not None else "unknown"
            if readings is not None and not fresh and not unsupported:
                status = "unreadable"
            field = {"key": key, "label": spec.label, "kind": spec.kind, "value": value,
                     "status": status, "editable": fresh and valid_value(key, value, (low, high)),
                     "stored_in": "bulb"}
            if key == "start_state":
                field["options"] = [{"value": value, "label": label} for value, label in POWER_OPTIONS]
            if key == "start_white":
                field.update({"min_mired": low, "max_mired": high})
            fields.append(field)
        device = target["device"]
        return {key: target[key] for key in ("entity_id", "name", "model", "area", "area_id", "available")} | {
            "lqi": device.lqi, "rssi": device.rssi, "fields": fields,
            "identify": target["available"] and 0x0003 in clusters,
            "fresh": readings is not None,
        }

    async def list(self, user):
        hidden = await self.hidden_areas(user)
        bulbs = []
        for entry in entity_registry.async_get(self.hass).entities.values():
            if entry.domain != "light" or entry.platform != "zha":
                continue
            try:
                target = self.resolve(entry.entity_id, user, hidden)
            except HomeAssistantError:
                continue
            bulbs.append(self.describe(target))
        return {"bulbs": sorted(bulbs, key=lambda item: (item["area"], item["name"]))}

    async def read_target(self, target):
        if not target["available"]:
            return self.describe(target)
        readings = {}
        for cluster_id in dict.fromkeys(spec.cluster for spec in SETTINGS.values()):
            cluster = target["clusters"].get(cluster_id)
            if cluster is None:
                continue
            attributes = [spec.attribute for spec in SETTINGS.values() if spec.cluster == cluster_id]
            if cluster_id == 0x0300:
                attributes.extend([0x400B, 0x400C])
            try:
                async with asyncio.timeout(12):
                    success, _ = await cluster.read_attributes(attributes, allow_cache=False, only_cache=False)
                readings[cluster_id] = {attribute: int(value) for attribute, value in success.items()
                                        if isinstance(value, int)}
            except (TimeoutError, HomeAssistantError, ValueError):
                readings[cluster_id] = {}
            except Exception as err:
                # Zigpy and ZHA transport exceptions vary across supported versions.
                if not err.__class__.__module__.startswith(("zigpy", "zha")):
                    raise
                readings[cluster_id] = {}
        return self.describe(target, readings)

    async def run(self, settings, connection, msg):
        user = connection.user
        if msg["action"] == "list":
            return await self.list(user)
        ids = list(dict.fromkeys(msg.get("entities", [])))
        if not 1 <= len(ids) <= MAX_TARGETS:
            raise HomeAssistantError("Choisissez entre une et vingt ampoules.")
        if self.lock.locked():
            raise HomeAssistantError("Une lecture ou un réglage est déjà en cours. Patientez.")
        async with self.lock:
            self.authorize(settings, user, msg["token"])
            hidden = await self.hidden_areas(user)
            targets = [self.resolve(entity_id, user, hidden) for entity_id in ids]
            if msg["action"] == "read":
                return {"bulbs": [await self.read_target(target) for target in targets]}
            if any(not target["available"] for target in targets):
                raise HomeAssistantError("Une ampoule est déconnectée. Rebranchez-la puis relisez ses réglages.")
            if msg["action"] == "identify" and len(targets) != 1:
                raise HomeAssistantError("Identifiez une seule ampoule à la fois.")
            if any(monotonic() - self.last_mutation.get(entity_id, -10) < 3 for entity_id in ids):
                raise HomeAssistantError("Une commande vient d’être envoyée. Patientez quelques secondes.")
            if msg["action"] == "identify":
                cluster = targets[0]["clusters"].get(0x0003)
                if cluster is None:
                    raise HomeAssistantError("L’identification n’est pas disponible sur cette ampoule.")
                self.authorize(settings, user, msg["token"])
                self.last_mutation[ids[0]] = monotonic()
                async with asyncio.timeout(12):
                    response = await cluster.identify(identify_time=3)
                status = getattr(response, "status", None)
                if status is None and isinstance(response, (list, tuple)) and len(response) == 2:
                    status = response[1]
                if status != 0:
                    raise HomeAssistantError("L’ampoule n’a pas confirmé l’identification.")
                return {"accepted": True, "message": "Commande d’identification confirmée par l’ampoule."}
            requested = msg.get("settings", {})
            if not requested or requested.keys() - SETTINGS.keys():
                raise HomeAssistantError("Choisissez un réglage autorisé.")
            # Validate every selected device before the first write. Unsupported
            # attributes on a second bulb cannot cause a partially applied batch.
            snapshots = [await self.read_target(target) for target in targets]
            for snapshot in snapshots:
                fields = {field["key"]: field for field in snapshot["fields"]}
                white = fields["start_white"]
                for key, value in requested.items():
                    if not fields[key]["editable"] or not valid_value(key, value, (white.get("min_mired"), white.get("max_mired"))):
                        raise HomeAssistantError(f"{snapshot['name']} ne permet pas ce réglage. Relisez les paramètres.")
            results = []
            for target in targets:
                self.authorize(settings, user, msg["token"])
                hidden = await self.hidden_areas(user)
                target = self.resolve(target["entity_id"], user, hidden)
                if not target["available"]:
                    results.append({"entity_id": target["entity_id"], "status": "unavailable", "fields": []})
                    continue
                self.last_mutation[target["entity_id"]] = monotonic()
                outcomes = []
                for key, value in requested.items():
                    self.authorize(settings, user, msg["token"])
                    spec = SETTINGS[key]
                    cluster = target["clusters"][spec.cluster]
                    outcome = {"key": key, "requested": value, "status": "not_confirmed"}
                    try:
                        async with asyncio.timeout(12):
                            response = await target["device"].write_zigbee_attribute(
                                target["endpoint"], spec.cluster, spec.attribute, value)
                        if successful_write(response):
                            async with asyncio.timeout(12):
                                values, _ = await cluster.read_attributes([spec.attribute], allow_cache=False, only_cache=False)
                            actual = values.get(spec.attribute)
                            outcome["actual"] = int(actual) if isinstance(actual, int) else None
                            if outcome["actual"] == value:
                                outcome["status"] = "confirmed"
                        else:
                            outcome["status"] = "rejected"
                    except Exception as err:
                        if not isinstance(err, (TimeoutError, HomeAssistantError, ValueError)) and not err.__class__.__module__.startswith(("zigpy", "zha")):
                            raise
                    outcomes.append(outcome)
                results.append({"entity_id": target["entity_id"], "fields": outcomes,
                                "status": "confirmed" if all(item["status"] == "confirmed" for item in outcomes) else "not_confirmed"})
            return {"results": results}

    @staticmethod
    def authorize(settings, user, token):
        if (not user.is_active or user.system_generated or not
                (user.is_admin or any(group.id == GROUP_ID_USER for group in user.groups))):
            raise PermissionError
        if not settings.session(user.id, token):
            raise PermissionError


@websocket_api.websocket_command({
    probatio.Required("type"): "kimia_settings/bulbs",
    probatio.Required("action"): probatio.In(("list", "read", "apply", "identify")),
    probatio.Required("token"): str,
    probatio.Optional("entities"): [str],
    probatio.Optional("settings"): dict,
})
@websocket_api.async_response
async def ws_bulbs(hass, connection, msg):
    settings = hass.data["kimia_settings"]
    try:
        BulbSettings.authorize(settings, connection.user, msg["token"])
        manager = hass.data.get("kimia_bulb_settings")
        if manager is None:
            manager = hass.data["kimia_bulb_settings"] = BulbSettings(hass)
        result = await manager.run(settings, connection, msg)
        BulbSettings.authorize(settings, connection.user, msg["token"])
    except PermissionError:
        connection.send_error(msg["id"], "pin_required", "Paramètres verrouillés ou compte non autorisé.")
        return
    except (HomeAssistantError, TimeoutError) as err:
        connection.send_error(msg["id"], "bulbs_failed", str(err) or "L’ampoule ne répond pas.")
        return
    connection.send_result(msg["id"], result)
