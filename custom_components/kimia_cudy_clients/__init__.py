"""KIMIA Smart: read-only inventory from the Cudy Router integration cache.

This adapter never logs in to the router, modifies its configuration, or
returns credentials. It exposes the exact device_list already fetched by
ha-cudy-router (not a guess reconstructed from sensor entity IDs).
"""
from __future__ import annotations

import logging
import re

import probatio
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

DOMAIN = "kimia_cudy_clients"
_LOGGER = logging.getLogger(__name__)

MAX_CLIENTS = 300
IPV4_RE = re.compile(r"^(?:\d{1,3}\.){3}\d{1,3}$")


def _text(value, limit=100):
    return str(value).strip()[:limit] if isinstance(value, (str, int, float)) else ""


def _ipv4(value):
    candidate = _text(value, 40)
    if IPV4_RE.fullmatch(candidate) and all(int(x) <= 255 for x in candidate.split(".")):
        return candidate
    return ""


def _clients_from_coordinators(coordinators):
    devices = []
    reported = 0
    healthy = True
    seen = set()

    for coordinator in list(coordinators.values())[:5]:
        healthy = healthy and bool(getattr(coordinator, "last_update_success", False))
        data = getattr(coordinator, "data", None) or {}
        module = data.get("devices", {}) if isinstance(data, dict) else {}
        if not isinstance(module, dict):
            continue
        rows = module.get("device_list", [])
        if not isinstance(rows, list):
            continue

        count_value = module.get("device_count", {})
        if isinstance(count_value, dict):
            try:
                reported += max(0, int(count_value.get("value") or 0))
            except (TypeError, ValueError):
                reported += len(rows)
        else:
            reported += len(rows)

        for row in rows:
            if not isinstance(row, dict) or len(devices) >= MAX_CLIENTS:
                continue
            ip = _ipv4(row.get("ip"))
            mac = _text(row.get("mac"), 32).upper()
            name = _text(row.get("hostname")) or mac or ip or "Appareil sans nom"
            key = mac or ip or (name + str(len(devices)))
            if key in seen:
                continue
            seen.add(key)
            devices.append({
                "name": name,
                "ip": ip,
                "mac": mac,
                "connection": _text(row.get("connection_type"), 40),
                "ip_assignment": "unknown",
            })

    devices.sort(key=lambda entry: (entry["name"].casefold(), entry["ip"]))
    return {
        "status": "ok",
        "source": "cudy_router/devices/device_list",
        "devices": devices,
        "count": len(devices),
        "reported_count": reported,
        "last_update_success": healthy,
        "truncated": len(devices) >= MAX_CLIENTS,
    }


@websocket_api.websocket_command({probatio.Required("type"): "kimia_cudy_clients/list"})
@websocket_api.async_response
async def ws_list(hass, connection, msg):
    """Read only; gate with the existing KIMIA Settings toggle.

    Note: Settings is a global UI toggle, not a secure per-user ACL.
    """
    admin = bool(connection.user and connection.user.is_admin)
    settings = hass.states.get("input_boolean.kimia_onglet_parametres")
    if not admin and (settings is None or settings.state != "on"):
        connection.send_error(msg["id"], "unauthorized", "KIMIA Paramètres non autorisés")
        return

    coordinators = hass.data.get("cudy_router") or {}
    if not isinstance(coordinators, dict) or not coordinators:
        connection.send_result(msg["id"], {
            "status": "cudy_missing",
            "devices": [],
            "count": 0,
            "reported_count": 0,
            "last_update_success": False,
        })
        return
    try:
        connection.send_result(msg["id"], _clients_from_coordinators(coordinators))
    except (ValueError, TypeError, AttributeError) as exc:
        _LOGGER.warning("KIMIA Cudy inventory unavailable: %s", type(exc).__name__)
        connection.send_error(msg["id"], "inventory_unavailable", "Inventaire Cudy indisponible")


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    websocket_api.async_register_command(hass, ws_list)
    return True
