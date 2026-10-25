/* KIMIA Smart by PROMAINT — moteur de tableaux de bord v1 (prototype isolé).
 * Une pièce / un appareil = cartes natives indépendantes (Area / Tile).
 * Ecriture additive uniquement sur kimia-next. Aucun accès au dashboard actif.
 * Les données restent dans les registres officiels Home Assistant.
 */
(() => {
  "use strict";
  if (window.KimiaSmartCore) return;
  const DASHBOARD = "kimia-next";
  const PRODUCT = "KIMIA Smart";
  const CATEGORIES = [
    ["lumieres", ["light"]],
    ["volets", ["cover"]],
    ["climatisation", ["climate", "fan"]],
    ["prises", ["switch"]],
    ["musique", ["media_player"]],
    ["securite", ["binary_sensor", "alarm_control_panel"]]
  ];
  const SUPPORTED = new Set(CATEGORIES.flatMap(x => x[1]));
  const safeClone = obj => JSON.parse(JSON.stringify(obj));
  const natural = (a, b) => a.localeCompare(b, "fr", { sensitivity: "base" });
  const getArea = (e, devices) => e.area_id || devices.get(e.device_id)?.area_id || null;
  const entityName = (entity, hass) =>
    hass.states?.[entity.entity_id]?.attributes?.friendly_name ||
    entity.name || entity.original_name || entity.entity_id;
  const tile = e => {
    const x = {
      type: "tile",
      entity: e.entity_id,
      name: undefined,
      grid_options: { columns: 6, rows: 1 }
    };
    // Ne jamais appliquer de fonctions incompatibles aux entités.
    if (e.entity_id.startsWith("light.")) x.features = [{ type: "light-brightness" }];
    if (e.entity_id.startsWith("cover.")) x.features = [{ type: "cover-open-close" }];
    return x;
  };
  const heading = (label, icon = "mdi:home-outline") => ({
    type: "heading", heading: label, icon, heading_style: "subtitle",
    grid_options: { columns: "full", rows: 1 }
  });
  const roomCard = area => ({
    type: "area",
    area: area.area_id,
    display_type: "compact",
    features: [{ type: "area-controls" }],
    features_position: "bottom",
    grid_options: { columns: 6, rows: "auto" },
    tap_action: { action: "navigate", navigation_path: "/kimia-next/pieces" }
  });
  const allCards = view =>
    (view.sections || []).flatMap(s => Array.isArray(s.cards) ? s.cards : [])
      .concat(Array.isArray(view.cards) ? view.cards : []);
  const sectionWithHeader = (view, name) => (view.sections || [])
    .find(s => s.type === "grid" && Array.isArray(s.cards) &&
      s.cards.some(c => c.type === "heading" && c.heading === name));
  const sectionForRoom = (view, areaId) => (view.sections || [])
    .find(s => s.type === "grid" && Array.isArray(s.cards) &&
      s.cards.some(c => c.type === "area" && c.area === areaId));
  const createRoomSection = area => ({
    type: "grid",
    cards: [heading(area.name, "mdi:home-heart-outline"), roomCard(area)]
  });
  const countCards = cfg => (cfg.views || []).reduce((n, v) =>
    n + allCards(v).length, 0);

  let active = null;
  let _last = { state: "idle", added: 0, message: "KIMIA est prêt." };
  const notify = x => {
    _last = x;
    window.dispatchEvent(new CustomEvent("kimia-sync-status", { detail: x }));
  };
  async function getDashboards(hass) {
    const data = await hass.callWS({ type: "lovelace/dashboards/list" });
    return Array.isArray(data) ? data : data?.dashboards;
  }

  async function synchronize(hass) {
    if (active) return active;
    if (!hass || hass.user?.is_admin !== true)
      throw new Error("Réservé aux comptes administrateurs KIMIA.");
    active = (async () => {
      notify({ state: "busy", message: "Organisation de la maison…", added: 0 });
      try {
        // La confirmation storage évite toute écriture sur un dashboard YAML.
        const [dashboards, areas, devices, entities, config] = await Promise.all([
          getDashboards(hass),
          hass.callWS({ type: "config/area_registry/list" }),
          hass.callWS({ type: "config/device_registry/list" }),
          hass.callWS({ type: "config/entity_registry/list" }),
          hass.callWS({ type: "lovelace/config", url_path: DASHBOARD })
        ]);
        if (!Array.isArray(dashboards) ||
            !dashboards.some(d => d.url_path === DASHBOARD && d.mode === "storage")) {
          throw new Error("Le dashboard KIMIA Nouvelle génération n'est pas créé en mode Interface.");
        }
        if (!Array.isArray(areas) || !Array.isArray(devices) ||
            !Array.isArray(entities) || !config || !Array.isArray(config.views) ||
            config.strategy) {
          throw new Error("Registres ou configuration KIMIA indisponibles.");
        }
        const views = new Map(config.views.map(v => [v.path, v]));
        const home = views.get("accueil"), rooms = views.get("pieces");
        if (!home || !rooms ||
            !sectionWithHeader(home, "Mes pièces") ||
            !sectionWithHeader(rooms, "Pièces de la maison")) {
          throw new Error("Le modèle KIMIA v1 est incomplet : n'écris aucun changement.");
        }
        for (const [path] of CATEGORIES) if (!views.has(path))
          throw new Error("Vue manquante : " + path);
        const orderedAreas = [...areas].filter(a => typeof a.area_id === "string")
          .sort((a, b) => natural(a.name || "", b.name || ""));
        const mapDevices = new Map(devices.map(d => [d.id, d]));
        const byArea = new Map(orderedAreas.map(a => [a.area_id, []]));
        for (const e of entities) {
          if (!e.entity_id || e.disabled_by || e.hidden_by ||
              !SUPPORTED.has(e.entity_id.split(".")[0])) continue;
          const area = getArea(e, mapDevices);
          if (!byArea.has(area)) continue;
          byArea.get(area).push(e);
        }
        for (const [, list] of byArea)
          list.sort((a, b) => natural(entityName(a, hass), entityName(b, hass)));

        const next = safeClone(config), vmap = new Map(next.views.map(v => [v.path, v]));
        let added = 0, updated = 0;
        const homeCards = allCards(vmap.get("accueil"));
        const roomCards = allCards(vmap.get("pieces"));
        const homeTargets = sectionWithHeader(vmap.get("accueil"), "Mes pièces");
        const roomSummary = sectionWithHeader(vmap.get("pieces"), "Pièces de la maison");
        // Toutes les pièces, en cartes Area NATIVES et individuelles sur l'accueil.
        for (const area of orderedAreas) {
          if (!homeCards.some(c => c.type === "area" && c.area === area.area_id)) {
            homeTargets.cards.push(roomCard(area));
            homeCards.push(homeTargets.cards[homeTargets.cards.length - 1]);
            added++;
          }
          if (!roomCards.some(c => c.type === "area" && c.area === area.area_id)) {
            const section = createRoomSection(area);
            vmap.get("pieces").sections.push(section);
            roomCards.push(...section.cards);
            added += 2;
          }
        }
        // Dans Pièces : cartes Tile réelles, une par entité, au-dessous de chaque Area.
        const roomView = vmap.get("pieces");
        const foundInRooms = new Set(allCards(roomView).filter(c => c.type === "tile").map(c => c.entity));
        for (const area of orderedAreas) {
          const target = sectionForRoom(roomView, area.area_id);
          if (!target) continue;
          for (const e of byArea.get(area.area_id) || []) {
            if (foundInRooms.has(e.entity_id)) continue;
            target.cards.push(tile(e));
            foundInRooms.add(e.entity_id);
            added++;
          }
        }
        // Dans chaque rubrique : vraies cartes Tile, classées automatiquement par pièce.
        for (const [path, domains] of CATEGORIES) {
          const v = vmap.get(path), existing = new Set(allCards(v)
            .filter(c => c.type === "tile").map(c => c.entity));
          for (const area of orderedAreas) {
            const matching = (byArea.get(area.area_id) || [])
              .filter(e => domains.some(d => e.entity_id.startsWith(d + ".")) &&
                // Les capteurs binaires de sécurité ne doivent pas envahir l'écran.
                (path !== "securite" || e.entity_id.startsWith("alarm_control_panel.") ||
                 ["door","window","moisture","smoke","motion","occupancy"].includes(
                   hass.states?.[e.entity_id]?.attributes?.device_class)));
            if (!matching.length) continue;
            let target = sectionForRoom(v, area.area_id);
            if (!target) {
              target = createRoomSection(area);
              v.sections.push(target);
              added += 2;
            }
            for (const e of matching) {
              if (existing.has(e.entity_id)) continue;
              target.cards.push(tile(e));
              existing.add(e.entity_id);
              added++;
            }
          }
        }
        if (added === 0 && updated === 0) {
          const result = { state: "ok", added: 0,
            message: "Votre maison est déjà à jour. Rien à modifier." };
          notify(result);
          return result;
        }
        // Pas de sauvegarde si quelqu'un édite le dashboard en parallèle.
        const latest = await hass.callWS({ type: "lovelace/config", url_path: DASHBOARD });
        if (JSON.stringify(latest) !== JSON.stringify(config)) {
          throw new Error("Le dashboard a été modifié pendant la synchronisation. Réessayez.");
        }
        if (countCards(next) - countCards(config) !== added) {
          throw new Error("Contrôle de cohérence non satisfait : aucune écriture.");
        }
        await hass.callWS({ type: "lovelace/config/save", url_path: DASHBOARD, config: next });
        const after = await hass.callWS({
          type: "lovelace/config", url_path: DASHBOARD, force: true
        });
        if (!after || !Array.isArray(after.views) ||
            countCards(after) < countCards(next)) {
          throw new Error("L'enregistrement doit être vérifié dans KIMIA.");
        }
        const result = { state: "ok", added,
          message: added + " carte(s) indépendante(s) ajoutée(s). Votre maison est à jour." };
        notify(result);
        return result;
      } catch (err) {
        const msg = err?.message || String(err);
        notify({ state: "error", added: 0, message: msg });
        throw err;
      } finally {
        active = null;
      }
    })();
    return active;
  }
  window.KimiaSmartCore = Object.freeze({
    sync: synchronize,
    getStatus: () => ({ ..._last }),
    dashboard: DASHBOARD,
    version: "1.0.0"
  });
})();