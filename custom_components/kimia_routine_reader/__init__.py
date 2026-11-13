"""KIMIA routine-reader: read-only, administrator-only routine summaries.

Only automations.yaml, scripts.yaml and direct YAML files in packages/ are read.
Never expose raw YAML or arbitrary paths. No write endpoints.
"""
from __future__ import annotations

import logging
from pathlib import Path

import yaml
import probatio

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)
DOMAIN = "kimia_routine_reader"
MAX_SIZE = 2_000_000
MAX_ITEMS = 300
MAX_DEPTH = 7
MAX_LIST = 20
ALLOWED = frozenset({
    "alias", "description", "triggers", "trigger", "conditions", "condition",
    "actions", "action", "sequence", "mode", "initial_state", "enabled",
    "platform", "type", "entity_id", "domain", "service", "target",
    "to", "from", "for", "at", "after", "before", "weekday", "event",
    "offset", "above", "below", "state", "delay", "repeat", "count",
    "if", "then", "else", "choose", "default", "wait_for_trigger",
    "timeout", "continue_on_timeout", "id",
})


def _safe(value, depth=0):
    """Allowlist of structural fields; never pass secrets/templates/parameters."""
    if depth > MAX_DEPTH:
        return "[too deep]"
    if isinstance(value, list):
        return [_safe(item, depth + 1) for item in value[:MAX_LIST]]
    if isinstance(value, dict):
        result = {
            k: _safe(v, depth + 1)
            for k, v in value.items() if isinstance(k, str) and k in ALLOWED
        }
        if any(k in value for k in ("value_template", "template", "data_template")):
            result["template_present"] = True
        if any(k in value for k in ("data", "service_data", "variables", "value")):
            result["parameters_omitted"] = True
        return result
    if isinstance(value, str):
        return value[:160]
    if isinstance(value, (bool, int, float)) or value is None:
        return value
    return "[non-standard value]"


def _read_file(path: Path, kind: str):
    if not path.is_file():
        return [], "not_found"
    if path.is_symlink() or path.stat().st_size > MAX_SIZE:
        return [], "unsafe_or_too_large"
    try:
        # safe_load rejects custom Home Assistant !include/!secret directives:
        # do not silently resolve arbitrary references or secret-bearing values.
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError, UnicodeError) as ex:
        _LOGGER.debug("KIMIA cannot parse %s: %s", path.name, type(ex).__name__)
        return [], "not_parseable"
    if data is None:
        return [], None
    if kind == "automation" and not isinstance(data, list):
        return [], "unsupported_structure"
    if kind == "script" and not isinstance(data, dict):
        return [], "unsupported_structure"
    records = []
    items = enumerate(data) if kind == "automation" else data.items()
    for key, raw in items:
        if len(records) >= MAX_ITEMS:
            break
        if not isinstance(raw, dict):
            continue
        rec_id = str(raw.get("id", "")) if kind == "automation" else str(key)
        records.append({
            "kind": kind,
            "id": rec_id[:100],
            "name": str(raw.get("alias", rec_id))[:100],
            "source": path.name,
            "config": _safe(raw),
        })
    return records, None


def _read_packages(root: Path):
    """Inspect direct YAML package files; no recursive traversal or include expansion."""
    folder = root / "packages"
    if not folder.is_dir() or folder.is_symlink():
        return [], {}
    records, errors = [], {}
    # Bounded scanning to avoid accidental large directories or infinite work.
    paths = sorted(list(folder.glob("*.yaml")) + list(folder.glob("*.yml")))[:80]
    for path in paths:
        if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_SIZE:
            errors[path.name] = "unsafe_or_too_large"
            continue
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except (OSError, yaml.YAMLError, UnicodeError):
            errors[path.name] = "not_parseable"
            continue
        if not isinstance(data, dict):
            errors[path.name] = "unsupported_structure"
            continue
        for kind, payload in (("automation", data.get("automation")), ("script", data.get("script"))):
            if payload is None:
                continue
            if kind == "automation" and not isinstance(payload, list):
                errors[path.name] = "unsupported_automation_structure"
                continue
            if kind == "script" and not isinstance(payload, dict):
                errors[path.name] = "unsupported_script_structure"
                continue
            items = enumerate(payload) if kind == "automation" else payload.items()
            for key, raw in items:
                if len(records) >= MAX_ITEMS:
                    return records, {**errors, "packages": "truncated"}
                if not isinstance(raw, dict):
                    continue
                rec_id = str(raw.get("id", "")) if kind == "automation" else str(key)
                records.append({
                    "kind": kind, "id": rec_id[:100],
                    "name": str(raw.get("alias", rec_id))[:100],
                    "source": "packages/" + path.name, "config": _safe(raw),
                })
    return records, errors


@websocket_api.require_admin
@websocket_api.websocket_command({probatio.Required("type"): "kimia_routine_reader/list"})
@websocket_api.async_response
async def ws_list(hass, connection, msg):
    """Return sanitized summaries from explicitly allowlisted files."""
    root = Path(hass.config.path()).resolve()
    def read():
        collected = []
        errors = {}
        for filename, kind in (("automations.yaml", "automation"), ("scripts.yaml", "script")):
            records, issue = _read_file(root / filename, kind)
            collected.extend(records)
            if issue:
                errors[filename] = issue
        package_records, package_errors = _read_packages(root)
        collected.extend(package_records)
        errors.update({"packages/" + k: v for k, v in package_errors.items()})
        return {"routines": collected[:MAX_ITEMS], "errors": errors,
                "scope": "automations.yaml, scripts.yaml and direct packages/*.yaml; read-only"}
    response = await hass.async_add_executor_job(read)
    connection.send_result(msg["id"], response)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register WebSocket command; no entities or write services."""
    websocket_api.async_register_command(hass, ws_list)
    return True
