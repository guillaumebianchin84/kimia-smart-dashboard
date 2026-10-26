"""Vérifier que le modèle KIMIA reproduit la refonte utilisateur et reste générique."""
from pathlib import Path
import yaml

main = yaml.safe_load(Path("dashboard-kimia-next-ui-import.yaml").read_text(encoding="utf-8"))
source = yaml.safe_load(Path("docs/KIMIA_REFONTE_CLIENT_SOURCE_20261026.yaml").read_text(encoding="utf-8"))
admin = yaml.safe_load(Path("kimia-admin-next-ui-import.yaml").read_text(encoding="utf-8"))
views = {v["path"]: v for v in main["views"]}
source_views = {v["path"]: v for v in source["views"]}
admin_views = {v["path"]: v for v in admin["views"]}
expected = {
    "accueil": "Accueil", "lumieres": "Lumières", "volets": "Volets",
    "climatisation": "Climatisation", "musique": "Musique",
    "securite": "Sécurité", "prises": "Prises", "actualites": "Actualités",
    "parametres": "Paramètres", "pieces": "Pièces",
}
assert len(views) == 12 and len(source_views) == 10
assert len(admin_views) == 6
assert all(k in views for k in expected)
assert "localStorage.getItem" in main["kiosk_mode"]["non_admin_settings"]["kiosk"]
assert main["kiosk_mode"] == source["kiosk_mode"]

def cards(view):
    return [c for s in view.get("sections", []) for c in s.get("cards", [])]

for path, label in expected.items():
    v = views[path]
    assert v["title"] == source_views[path]["title"], path
    assert v["max_columns"] == source_views[path]["max_columns"], path
    banners = [c for c in cards(v) if c.get("type") == "custom:button-card"]
    assert len(banners) == 1, f"Bannière manquante dans {path}"
    assert "by PROMAINT" in banners[0]["custom_fields"]["logo"], path
    assert label in banners[0]["custom_fields"]["slogan"], path
    assert any(c.get("type") == "custom:navbar-card" for c in cards(v)), path
    # Ne livrer aucun équipement provenant du laboratoire de démonstration.
    assert not any(c.get("type") in ("area", "tile") for c in cards(v)), path

home = cards(views["accueil"])
assert len(home) == 9, f"Accueil épuré : 9 cartes attendues, {len(home)}"
assert sum(c.get("type") == "custom:maquette-card" for c in home) == 1
assert sum(c.get("type") == "custom:clock-weather-card" for c in home) == 1
assert sum(c.get("type") == "shortcut" for c in home) == 4
assert not any(c.get("type") == "custom:rss-news-card" for c in home)
assert not any(c.get("heading") == "Mes pièces" for c in home)
assert all(c.get("grid_options") == {"columns": 12, "rows": 1}
           for c in home if c.get("type") == "shortcut")
assert views["accueil"]["sections"][1]["column_span"] == 2
assert views["accueil"]["sections"][2]["column_span"] == 1
assert all(c.get("type") == "custom:rss-news-card" or c.get("type") in ("custom:button-card","custom:navbar-card")
           for c in cards(views["actualites"]))
assert any(c.get("type") == "custom:kimia-header-toggle-v1-card"
           for c in cards(views["parametres"]))
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
# Deux nouveaux onglets natifs ; la source esthétique V1.3 reste inchangée.
for slug, title, typ in (("carte","Carte","map"),("listes","Listes","markdown")):
    v=views[slug]
    assert v["title"] == title
    v_cards=cards(v)
    assert len([x for x in v_cards if x.get("type")=="custom:button-card"])==1
    assert any(x.get("type")==typ for x in v_cards), slug
    assert any(x.get("type")=="custom:navbar-card" for x in v_cards)
assert cards(views["carte"])[1]["entities"] == ["zone.home"]
assert cards(views["carte"])[1]["show_all"] is False
for slug,v in views.items():
    nav=next(c for c in cards(v) if c.get("type")=="custom:navbar-card")
    for extra_path in ("pieces","carte","listes"):
        matches=[r for r in nav["routes"] if r["url"]=="/kimia-next/"+extra_path]
        assert len(matches)==1, (slug,extra_path)
        assert "kimia_onglet_"+extra_path in matches[0]["hidden"]
assert any(c.get("type")=="custom:kimia-services-v14-card" for c in cards(admin_views["apparence"]))
assert any(c.get("type")=="custom:kimia-script-builder-v14-card" for c in cards(admin_views["scenarios"]))
nav_helpers=yaml.safe_load(Path("packages/kimia_admin_navigation.yaml").read_text(encoding="utf-8"))
assert "kimia_onglet_pieces" in nav_helpers["input_boolean"]
assert any(c.get("entity")=="input_boolean.kimia_onglet_pieces" for c in cards(admin_views["apparence"]))
assert "kimia_onglet_carte" in nav_helpers["input_boolean"]
assert "kimia_onglet_listes" in nav_helpers["input_boolean"]

package_text=Path("packages/kimia_tablette_v1.yaml").read_text(encoding="utf-8")
package=yaml.safe_load(package_text)
assert len(package["script"]) == 7
assert len(package["input_text"]) == 7
assert "Dans KIMIA Configuration" in package_text
print("YAML KIMIA V1.4 OK : 12 vues, carte native privée, listes, navigation et configuration administrateur.")
