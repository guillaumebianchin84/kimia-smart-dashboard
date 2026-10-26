"""Valider les deux fichiers d'import KIMIA v1 (PyYAML)."""
from pathlib import Path
import yaml

main = yaml.safe_load(Path("dashboard-kimia-next-ui-import.yaml").read_text(encoding="utf-8"))
admin = yaml.safe_load(Path("kimia-admin-next-ui-import.yaml").read_text(encoding="utf-8"))
assert isinstance(main, dict) and isinstance(admin, dict)
views = {v["path"]: v for v in main["views"]}
admin_views = {v["path"]: v for v in admin["views"]}
assert len(views) == 10, f"10 pages attendues, {len(views)}"
assert len(admin_views) == 6, f"6 pages admin attendues, {len(admin_views)}"
assert "accueil" in views and "pieces" in views
# Le bandeau HA est masqué pour les clients par défaut et activable localement.
assert "localStorage.getItem" in main["kiosk_mode"]["non_admin_settings"]["kiosk"]

assert "demarrer" in admin_views and "appareils" in admin_views and "inventaire" in admin_views

def cards(view):
    return [c for section in view.get("sections", []) for c in section.get("cards", [])]

home = cards(views["accueil"])
assert sum(c.get("type") == "shortcut" and c.get("label") in (
    "Au lit", "Départ", "Retour", "Réveil") for c in home) == 4
assert not any(c.get("type") == "grid" and any(
    x.get("type") == "shortcut" for x in c.get("cards", [])) for c in home)
for required in ("custom:maquette-card", "custom:clock-weather-card", "custom:rss-news-card"):
    assert any(c.get("type") == required for c in home), required
assert any(c.get("type") == "heading" and c.get("heading") == "Mes pièces" for c in home)
assert any(c.get("type") == "heading" and c.get("heading") == "Pièces de la maison"
           for c in cards(views["pieces"]))
assert all(any(c.get("type") == "custom:navbar-card" for c in cards(v))
           for v in views.values())
assert any(c.get("type") == "custom:kimia-header-toggle-v1-card"
           for c in cards(views["parametres"])), "Réglage bandeau absent"
assert not any(c.get("type") == "custom:button-card" for v in views.values()
               for c in cards(v))
assert any(c.get("type") == "custom:kimia-inventory-v1-card"
           for c in cards(admin_views["inventaire"]))
assert any(c.get("type") == "custom:kimia-room-manager-v1-card"
           for c in cards(admin_views["pieces"]))
assert any(c.get("type") == "custom:kimia-zigbee-manager-v1-card"
           for c in cards(admin_views["appareils"]))
assert any(c.get("type") == "custom:kimia-scenarios-v1-card"
           for c in cards(admin_views["scenarios"]))
assert any(c.get("type") == "custom:kimia-setup-v1-card"
           for c in cards(admin_views["demarrer"]))
assert "kimia-smart/" not in str(main) and "kimia-test/" not in str(main)
package_text = Path("packages/kimia_tablette_v1.yaml").read_text(encoding="utf-8")
package = yaml.safe_load(package_text)
assert len(package["script"]) == 7
assert len(package["input_text"]) == 7
assert "script.xxx" not in package_text
assert "Dans KIMIA Configuration" in package_text
print("YAML KIMIA v1 : OK - 10 vues client, 6 vues admin, cartes independantes, isolation")
