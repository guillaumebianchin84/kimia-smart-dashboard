/* KIMIA Smart by PROMAINT — moteur de tableaux de bord v1.3 (refonte client).
 * Une pièce / un appareil = cartes natives indépendantes (Area / Tile).
 * Ecriture limitée au dashboard kimia-next. Aucun accès au dashboard actif.
 * Retrait uniquement des cartes créées par KIMIA et restées non personnalisées.
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
    grid_options: { columns: 12, rows: "auto" },
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
  // Carte de pièce sur toute la section, commandes natives en dessous (2 tuiles/ligne).
  const createRoomSection = (area, view) => ({
    type: "grid",
    column_span: Math.min(Number(view.max_columns) || 3, 3),
    cards: [roomCard(area)]
  });
  const countCards = cfg => (cfg.views || []).reduce((n, v) =>
    n + allCards(v).length, 0);
  // Identité visuelle client historique : bandeau natif button-card sur chaque vue.
  // Important : ce bandeau KIMIA est indépendant du bandeau HA masqué par Kiosk Mode.
  const brandBanner = view => ({
    type: "grid",
    column_span: Math.min(Math.max(Number(view.max_columns) || 3, 1), 3),
    cards: [{
      type: "custom:button-card",
      show_icon: false,
      show_name: false,
      show_state: false,
      show_label: false,
      grid_options: { columns: "full", rows: "auto" },
      tap_action: { action: "none" },
      custom_fields: {
        logo: "[[[ return '<div style=\"font-size:23px;font-weight:900;letter-spacing:-.8px;white-space:nowrap;\">KIMIA <span style=\"color:#3FD6CB\">Smart</span><div style=\"font-size:10px;letter-spacing:2px;font-weight:600;color:var(--secondary-text-color);margin-top:-2px\">by PROMAINT</div></div>'; ]]]",
        slogan: "[[[ return '<div style=\"font-size:20px;font-weight:800;letter-spacing:.2px;\">Ma maison</div>'; ]]]",
        localisation: "[[[ return '<div style=\"font-size:12px;font-weight:600;opacity:.8;\">LIBREVILLE · GABON</div>'; ]]]"
      },
      styles: {
        card: [
          { background: "linear-gradient(105deg, rgba(12,137,147,.25), var(--card-background-color) 68%)" },
          { border: "1px solid rgba(56,205,203,.28)" },
          { "border-radius": "18px" },
          { padding: "9px 18px" },
          { "box-shadow": "0 5px 22px rgba(0,25,35,.12)" }
        ],
        grid: [
          { "grid-template-areas": "[[[ return window.innerWidth < 680 ? '\"logo localisation\" \"slogan slogan\"' : '\"logo slogan localisation\"'; ]]]" },
          { "grid-template-columns": "[[[ return window.innerWidth < 680 ? '1fr auto' : '225px 1fr 150px'; ]]]" },
          { "grid-template-rows": "auto" },
          { "align-items": "center" }
        ],
        custom_fields: {
          logo: [{ "text-align": "left" }, { "justify-self": "start" }],
          slogan: [{ "text-align": "center" }, { color: "var(--primary-text-color)" }],
          localisation: [{ "text-align": "right" }, { "justify-self": "end" }, { color: "var(--secondary-text-color)" }]
        }
      }
    }]
  });
  const isKimiaBrand = card => card?.type === "custom:button-card" &&
    typeof card.custom_fields?.logo === "string" &&
    card.custom_fields.logo.includes("by PROMAINT") &&
    card.custom_fields.logo.includes("KIMIA");
  const isDefaultHomeIntro = section => section?.type === "grid" &&
    section.cards?.length === 2 &&
    section.cards[0]?.type === "heading" &&
    section.cards[0]?.heading === "KIMIA Smart · Ma maison" &&
    section.cards[1]?.type === "markdown" &&
    section.cards[1]?.content === "**by PROMAINT** · LIBREVILLE, GABON";

  // Ne retirer que les tuiles à la forme strictement identique à celles
  // produites par KIMIA. Une tuile personnalisée ne doit pas être effacée.
  const isGeneratedTile = card =>
    card?.type === "tile" && typeof card.entity === "string" &&
    JSON.stringify(card) === JSON.stringify(safeClone(tile({entity_id:card.entity})));
  // Une carte Pièce n'est gérée par KIMIA que si toutes ses options sont intactes.
  // Les variantes personnalisées doivent rester sous contrôle de l'habitant.
  const isGeneratedRoomCard = card => {
    if(card?.type !== "area" || typeof card.area !== "string") return false;
    const now=roomCard({area_id:card.area});
    const old={...now,grid_options:{columns:6,rows:"auto"}};
    return JSON.stringify(card)===JSON.stringify(now) ||
      JSON.stringify(card)===JSON.stringify(old);
  };
  const isGeneratedRoomHeading = (card, areaName) =>
    card?.type==="heading" && card.heading_style==="subtitle" &&
    card.icon==="mdi:home-heart-outline" &&
    card.grid_options?.columns==="full" &&
    card.grid_options?.rows===1 &&
    (!areaName || card.heading===areaName);
  const managedRoom = section => {
    if (section?.type!=="grid" || !Array.isArray(section.cards)) return null;
    return section.cards.find(isGeneratedRoomCard) || null;
  };
  const expectedDomain = (path, e, hass) => {
    if(path==="pieces")return true;
    const category=CATEGORIES.find(c=>c[0]===path);
    if(!category || !category[1].some(d=>e.entity_id.startsWith(d+"."))) return false;
    if(path!=="securite" || e.entity_id.startsWith("alarm_control_panel."))return true;
    return ["door","window","moisture","smoke","motion","occupancy"].includes(
      hass.states?.[e.entity_id]?.attributes?.device_class);
  };
  const bannerSlogan = label => {
    const escaped=String(label || "Ma maison").replace(/&/g,"&amp;")
      .replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/'/g,"&#39;");
    return "[[[ return '<div style=\\\"font-size:20px;font-weight:800;letter-spacing:.2px;\\\">"+
      escaped+"</div>'; ]]]";
  };

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
        if (!views.has("accueil") || !views.has("pieces")) {
          throw new Error("Les vues Accueil et Pièces sont absentes du modèle KIMIA.");
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
        let added = 0, removed = 0, modified = 0;
        // Le bandeau de marque doit refléter le TITRE de l'onglet, pas "Ma maison"
        // partout. L'Accueil conserve "Ma maison".
        for (const view of next.views) {
          if (!Array.isArray(view.sections)) continue;
          const banner=allCards(view).find(isKimiaBrand);
          const title=view.path==="accueil"?"Ma maison":view.title || "Ma maison";
          if (!banner) {
            view.sections.unshift(brandBanner(view));
            const generated=allCards(view).find(isKimiaBrand);
            generated.custom_fields.slogan=bannerSlogan(title);
            added++;
          } else {
            const current=String(banner.custom_fields.slogan || "");
            const currentName=current.replace(/\s+/g," ");
            // Préserver un slogan personnalisé; migrer seulement le slogan standard
            // "Ma maison" ou les titres que le moteur a précédemment créés.
            if(currentName.includes("Ma maison") ||
                currentName.includes(bannerSlogan(title).replace(/\s+/g," "))) {
              const expected=bannerSlogan(title);
              if(current!==expected) { banner.custom_fields.slogan=expected; modified++; }
            }
          }
        }

        // Sur un ancien dashboard, enlever seulement les cartes Pièce introduites
        // automatiquement sur Accueil. Aucun nouvel appareil ne doit y revenir.
        const home=vmap.get("accueil");
        const oldHome=sectionWithHeader(home,"Mes pièces");
        if(oldHome) {
          const previous=oldHome.cards.length;
          oldHome.cards=oldHome.cards.filter(c=>!isGeneratedRoomCard(c));
          removed+=previous-oldHome.cards.length;
          // Une ancienne section vide ne doit pas laisser un titre "Mes pièces".
          if(oldHome.cards.length===1 &&
              oldHome.cards[0]?.type==="heading" &&
              oldHome.cards[0].heading==="Mes pièces") {
            home.sections=home.sections.filter(s=>s!==oldHome);
            removed++;
          }
        }

        // Répartition par pièce dans les vrais onglets, jamais dans Accueil.
        // Chaque salle occupe toute la largeur; les tuiles 6/12 se placent dessous.
        const targets=["pieces",...CATEGORIES.map(x=>x[0])];
        const areaIds=new Set(orderedAreas.map(a=>a.area_id));
        const names=new Map(orderedAreas.map(a=>[a.area_id,a.name]));
        for(const path of targets) {
          const view=vmap.get(path);
          const desired=new Map(orderedAreas.map(area=>[
            area.area_id,(byArea.get(area.area_id)||[])
              .filter(e=>expectedDomain(path,e,hass))
          ]));
          const kept=[];
          for(const section of view.sections || []) {
            const areaCard=managedRoom(section);
            if(!areaCard) { kept.push(section); continue; }
            const areaId=areaCard.area;
            const alive=areaIds.has(areaId);
            const entitiesWanted=new Set((desired.get(areaId)||[]).map(e=>e.entity_id));
            if(!alive) {
              // Pièce supprimée : retirer ses éléments standard uniquement.
              const before=section.cards.length;
              section.cards=section.cards.filter(c=>
                !isGeneratedRoomCard(c) && !isGeneratedTile(c) &&
                !isGeneratedRoomHeading(c));
              removed+=before-section.cards.length;
              if(section.cards.length)kept.push(section);
              continue;
            }
            // Les rubriques Lumières, Musique, etc., n'affichent pas de salle vide.
            if(path!=="pieces" && entitiesWanted.size===0) {
              const before=section.cards.length;
              section.cards=section.cards.filter(c=>
                !isGeneratedRoomCard(c) && !isGeneratedTile(c) &&
                !isGeneratedRoomHeading(c,names.get(areaId)));
              removed+=before-section.cards.length;
              if(section.cards.length)kept.push(section);
              continue;
            }
            // Réécriture uniquement des cartes Area standard KIMIA.
            if(areaCard.grid_options?.columns!==12) {
              areaCard.grid_options={columns:12,rows:"auto"};
              modified++;
            }
            const span=Math.min(Number(view.max_columns)||3,3);
            if(section.column_span!==span) {section.column_span=span;modified++;}
            // Le nom figure déjà DANS la carte de pièce : pas de titre doublé.
            const oldCount=section.cards.length;
            section.cards=section.cards.filter(c=>
              !isGeneratedRoomHeading(c,names.get(areaId)));
            removed+=oldCount-section.cards.length;
            // Les tuiles déplacées ou désactivées sont retirées uniquement
            // si elles portent toujours exactement la configuration auto.
            const tileCount=section.cards.length;
            section.cards=section.cards.filter(c=>
              !isGeneratedTile(c) || entitiesWanted.has(c.entity));
            removed+=tileCount-section.cards.length;
            kept.push(section);
          }
          view.sections=kept;
          // Ajouts après nettoyage : pas de doublon, même après déplacement.
          const existing=new Set(allCards(view)
            .filter(c=>c.type==="tile").map(c=>c.entity));
          for(const area of orderedAreas) {
            const selected=desired.get(area.area_id)||[];
            if(path!=="pieces" && !selected.length)continue;
            let section=sectionForRoom(view,area.area_id);
            if(!section) {
              section=createRoomSection(area,view);
              view.sections.push(section);
              added+=section.cards.length;
            }
            for(const e of selected) {
              if(existing.has(e.entity_id))continue;
              section.cards.push(tile(e));
              existing.add(e.entity_id);
              added++;
            }
          }
        }
        if (added === 0 && removed === 0 && modified === 0) {
          const result = { state: "ok", added: 0, removed: 0,
            message: "Votre maison est déjà à jour. Rien à modifier." };
          notify(result);
          return result;
        }
        // Pas de sauvegarde si quelqu'un édite le dashboard en parallèle.
        const latest = await hass.callWS({ type: "lovelace/config", url_path: DASHBOARD });
        if (JSON.stringify(latest) !== JSON.stringify(config)) {
          throw new Error("Le dashboard a été modifié pendant la synchronisation. Réessayez.");
        }
        if (countCards(next) - countCards(config) !== added - removed) {
          throw new Error("Contrôle de cohérence non satisfait : aucune écriture.");
        }
        await hass.callWS({ type: "lovelace/config/save", url_path: DASHBOARD, config: next });
        const after = await hass.callWS({
          type: "lovelace/config", url_path: DASHBOARD
        });
        if (!after || !Array.isArray(after.views) ||
            countCards(after) < countCards(next)) {
          throw new Error("L'enregistrement doit être vérifié dans KIMIA.");
        }
        const result = { state: "ok", added, removed, modified,
          message: added + " carte(s) ajoutée(s), "+removed+
            " supprimée(s), "+modified+" mise(s) en forme. Votre maison est à jour." };
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
    version: "1.3.0"
  });
})();