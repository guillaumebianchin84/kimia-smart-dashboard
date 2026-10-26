/* KIMIA Smart by PROMAINT — moteur de tableaux de bord v1.5 (socle admin).
 * Une pièce / un appareil = cartes natives indépendantes (Area / Tile).
 * Écrit dans kimia-next et ajoute uniquement les réglages manquants à kimia-admin-next.
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


  // V1.4 : une source pour les nouvelles routes, commune à toutes les vues.
  // Ne jamais remplacer les cartes ni les préférences d'un utilisateur.
  const V14_TABS = [
    { path: "carte", title: "Carte", label: "Carte",
      icon: "mdi:map-marker-radius-outline", toggle: "input_boolean.kimia_onglet_carte" },
    { path: "listes", title: "Listes", label: "Listes",
      icon: "mdi:format-list-checks", toggle: "input_boolean.kimia_onglet_listes" }
  ];
  const V14_NO_TODO = "KIMIA V1.4 : aucune liste To-do détectée. Activez une intégration de listes dans Home Assistant puis cliquez sur Actualiser ma maison.";
  const v14Route = tab => ({
    url: "/kimia-next/" + tab.path, icon: tab.icon, label: tab.label,
    // Absent = masqué : un helper manquant ne doit pas rendre une vue publique.
    hidden: '[[[ return states["' + tab.toggle + '"]?.state !== "on"; ]]]'
  });
  const kimiaNav = c => c?.type === "custom:navbar-card" &&
    Array.isArray(c.routes) &&
    c.routes.some(r => r.url === "/kimia-next/accueil");
  const upgradeNav = card => {
    if(!kimiaNav(card))return 0;
    let changed=0;
    for (const tab of V14_TABS) {
      if(card.routes.some(r => r.url === "/kimia-next/" + tab.path))continue;
      const idx=card.routes.findIndex(r => r.url === "/kimia-next/actualites");
      card.routes.splice(idx<0?card.routes.length:idx,0,v14Route(tab));
      changed++;
    }
    return changed;
  };
  const initialV14Card = (path, hass) => {
    if(path === "carte") return {
      type: "map", entities: ["zone.home"], show_all: false,
      auto_fit: true, default_zoom: 12,
      hours_to_show: 0, aspect_ratio: "16:9",
      grid_options: { columns: 12, rows: 6 }
    };
    const todo=Object.keys(hass.states||{}).filter(k=>k.startsWith("todo.")).sort()[0];
    return todo ? {type:"todo-list",entity:todo,title:"Mes listes",
      grid_options:{columns:12,rows:"auto"}} :
      {type:"markdown",content:V14_NO_TODO,grid_options:{columns:12,rows:"auto"}};
  };
  const newV14View = (tab, templateNav, hass) => {
    const view={title:tab.title,path:tab.path,icon:tab.icon,
      type:"sections",max_columns:3,sections:[]};
    const brand=brandBanner(view);
    brand.cards[0].custom_fields.slogan=bannerSlogan(tab.title);
    view.sections.push(brand,
      {type:"grid",column_span:3,cards:[initialV14Card(tab.path,hass)]},
      {type:"grid",column_span:3,cards:[safeClone(templateNav)]});
    return view;
  };
  // Migrer exclusivement la carte exacte générée lors des premiers tests V1.4.
  // Une carte native modifiée par l'utilisateur n'est jamais réécrite.
  const isLegacyCollapsedMap = card =>
    card?.type === "map" &&
    Array.isArray(card.entities) && card.entities.length === 1 &&
    card.entities[0] === "zone.home" &&
    card.show_all === false && card.hours_to_show === 0 &&
    card.aspect_ratio === "16:9" &&
    card.grid_options?.columns === 12 && card.grid_options?.rows === "auto" &&
    Object.keys(card).sort().join("|") ===
      "aspect_ratio|entities|grid_options|hours_to_show|show_all|type" &&
    Object.keys(card.grid_options).sort().join("|") === "columns|rows";
  const applyV14 = (next,hass) => {
    let added=0,modified=0;
    const current=new Set(next.views.map(v=>v.path));
    const nav=next.views.flatMap(allCards).find(kimiaNav);
    if(!nav)throw Error("Navbar KIMIA introuvable : création V1.4 interrompue.");
    // Mettre les routes dans TOUTES les navbars existantes, sans changer
    // leurs autres entrées, leur ordre personnalisé ou leur disposition.
    for(const view of next.views)for(const card of allCards(view))
      if(kimiaNav(card))modified+=upgradeNav(card);
    for(const tab of V14_TABS){
      if(current.has(tab.path))continue;
      const view=newV14View(tab,nav,hass);
      next.views.push(view);
      added+=countCards({views:[view]});
    }
    // Anciennes cartes Map V1.4 (hauteur auto) : seul le modèle exact
    // est corrigé. Les cartes géographiques personnalisées restent intactes.
    const mapView=next.views.find(v=>v.path==="carte");
    if(mapView)for(const card of allCards(mapView)) {
      if(!isLegacyCollapsedMap(card))continue;
      card.grid_options.rows=6;
      card.auto_fit=true;
      card.default_zoom=12;
      modified++;
    }
    // Migration non destructive du placeholder quand une liste apparaît.
    const listView=next.views.find(v=>v.path==="listes");
    const todo=Object.keys(hass.states||{}).filter(k=>k.startsWith("todo.")).sort()[0];
    if(listView && todo)for(const section of listView.sections||[])
      for(let i=0;i<(section.cards||[]).length;i++)
        if(section.cards[i]?.type==="markdown" &&
           section.cards[i]?.content===V14_NO_TODO) {
          section.cards[i]=initialV14Card("listes",hass);modified++;
        }
    return {added,modified};
  };
  // V1.5 : mise à jour additive du tableau de bord administrateur.
  // N'efface ni ne recompose aucune carte existante (notamment personnalisée).
  const ADMIN_DASHBOARD = "kimia-admin-next";
  const v15AdminCards = {
    carte: {type:"tile",entity:"input_boolean.kimia_onglet_carte",
      name:"Carte",icon:"mdi:map-marker-radius-outline",tap_action:{action:"toggle"}},
    listes: {type:"tile",entity:"input_boolean.kimia_onglet_listes",
      name:"Listes",icon:"mdi:format-list-checks",tap_action:{action:"toggle"}}
  };
  const hasCard = (view,predicate) => allCards(view).some(predicate);

  // Profils stockés dans la configuration persistante du dashboard admin,
  // jamais dans le navigateur. Une préférence absente signifie "tout afficher".
  const PROFILE_CARD = "custom:kimia-user-visibility-v15-card";
  const profileCard = view => view ? allCards(view).find(c=>c.type===PROFILE_CARD) : undefined;
  const isKimiaVisibility = value =>
    Array.isArray(value) && value.length===1 &&
    value[0]?.condition==="not" &&
    Array.isArray(value[0].conditions) && value[0].conditions.length===1 &&
    value[0].conditions[0]?.condition==="user" &&
    Array.isArray(value[0].conditions[0].users) &&
    Object.keys(value[0]).sort().join("|")==="condition|conditions" &&
    Object.keys(value[0].conditions[0]).sort().join("|")==="condition|users";
  const hideForUsers = ids => [{
    condition:"not",conditions:[{condition:"user",users:ids.sort()}]
  }];
  async function loadHiddenByArea(hass,dashboards) {
    if(!dashboards.some(d=>d.url_path===ADMIN_DASHBOARD && d.mode==="storage"))
      return new Map();
    const admin=await hass.callWS({type:"lovelace/config",url_path:ADMIN_DASHBOARD});
    const v=admin?.views?.find(v=>v.path==="utilisateurs");
    const profiles=profileCard(v)?.hidden_areas_by_user;
    const byArea=new Map();
    if(!profiles || typeof profiles!=="object" || Array.isArray(profiles))
      return byArea;
    // Ne jamais fabriquer une condition pour un compte disparu/système.
    const users=await hass.callWS({type:"config/auth/list"});
    const valid=new Set((Array.isArray(users)?users:[])
      .filter(u=>u?.id&&!u.system_generated&&u.is_active!==false).map(u=>u.id));
    for(const [user,hidden] of Object.entries(profiles)){
      if(!valid.has(user)||!Array.isArray(hidden))continue;
      for(const area of hidden){
        if(typeof area!=="string"||!area)continue;
        if(!byArea.has(area))byArea.set(area,[]);
        if(!byArea.get(area).includes(user))byArea.get(area).push(user);
      }
    }
    return byArea;
  }
  // Appliquer uniquement aux sections contenant des cartes Area générées KIMIA.
  // Toute visibilité personnalisée d'un autre format reste intouchée.
  const applyRoomVisibility = (next,hiddenByArea) => {
    let modified=0;
    for(const path of ["pieces",...CATEGORIES.map(x=>x[0])]){
      const view=next.views.find(v=>v.path===path);
      for(const section of view?.sections||[]){
        const area=managedRoom(section)?.area;
        if(!area)continue;
        const ids=hiddenByArea.get(area)||[];
        const old=section.visibility;
        if(old!==undefined && !isKimiaVisibility(old))continue;
        const desired=ids.length?hideForUsers([...ids]):undefined;
        if(JSON.stringify(old)===JSON.stringify(desired))continue;
        if(desired)section.visibility=desired;
        else delete section.visibility;
        modified++;
      }
    }
    return modified;
  };

  async function upgradeAdminDashboard(hass,dashboards) {
    if(!Array.isArray(dashboards) ||
       !dashboards.some(d=>d.url_path===ADMIN_DASHBOARD && d.mode==="storage"))return 0;
    const config=await hass.callWS({type:"lovelace/config",url_path:ADMIN_DASHBOARD});
    if(!Array.isArray(config?.views)||config.strategy)return 0;
    const next=safeClone(config);
    const appearance=next.views.find(v=>v.path==="apparence");
    const scenarios=next.views.find(v=>v.path==="scenarios");
    let added=0;
    if(appearance?.sections) {
      const rubriques=appearance.sections.find(s=>Array.isArray(s.cards)&&
        s.cards.some(c=>c.type==="heading"&&c.heading==="Mes rubriques"));
      if(rubriques){
        for(const key of ["carte","listes"]){
          const card=v15AdminCards[key];
          if(!hasCard(appearance,c=>c.type==="tile"&&c.entity===card.entity)){
            rubriques.cards.push(safeClone(card));added++;
          }
        }
      }
      if(!hasCard(appearance,c=>c.type==="custom:kimia-services-v14-card")){
        const themesIdx=appearance.sections.findIndex(s=>s.cards?.some(c=>
          c.type==="heading"&&c.heading==="Les thèmes KIMIA"));
        const target=themesIdx<0?appearance.sections.length:themesIdx;
        appearance.sections.splice(target,0,{type:"grid",column_span:2,cards:[
          {type:"custom:kimia-services-v14-card",
           grid_options:{columns:"full",rows:"auto"}}]});
        added++;
      }
    }
    if(scenarios?.sections &&
       !hasCard(scenarios,c=>c.type==="custom:kimia-script-builder-v14-card")){
      const oldIdx=scenarios.sections.findIndex(s=>s.cards?.some(c=>
        c.type==="custom:kimia-scenarios-v1-card"));
      const target=oldIdx<0?scenarios.sections.length:oldIdx;
      scenarios.sections.splice(target,0,{type:"grid",column_span:2,cards:[
        {type:"custom:kimia-script-builder-v14-card",
         grid_options:{columns:"full",rows:"auto"}}]});
      added++;
    }
    // Ajouter une page dédiée au choix des pièces par compte HA.
    // Aucune vue existante n'est réécrite ni déplacée.
    let usersView=next.views.find(v=>v.path==="utilisateurs");
    if(!usersView){
      usersView={title:"Utilisateurs",path:"utilisateurs",icon:"mdi:account-group",
        type:"sections",max_columns:2,sections:[
        {type:"grid",column_span:2,cards:[
          {type:"heading",heading:"Visibilité des pièces",heading_style:"title",
           icon:"mdi:account-eye"},
          {type:"markdown",content:"Choisissez les pièces affichées pour chaque compte Home Assistant. Masquage visuel uniquement : ce n'est pas une restriction d'accès."}
        ]},
        {type:"grid",column_span:2,cards:[
          {type:PROFILE_CARD,hidden_areas_by_user:{},
           grid_options:{columns:"full",rows:"auto"}}
        ]}
      ]};
      next.views.push(usersView);
      added++;
    }else if(usersView.sections && !hasCard(usersView,c=>c.type===PROFILE_CARD)){
      // Ne toucher à aucune carte en place : ajouter seulement notre gestionnaire.
      usersView.sections.push({type:"grid",column_span:2,cards:[
        {type:PROFILE_CARD,hidden_areas_by_user:{},
         grid_options:{columns:"full",rows:"auto"}}
      ]});
      added++;
    }
    if(!added)return 0;
    const latest=await hass.callWS({type:"lovelace/config",url_path:ADMIN_DASHBOARD});
    if(JSON.stringify(latest)!==JSON.stringify(config))
      throw Error("L'administration KIMIA a changé pendant la synchronisation. Réessayez.");
    await hass.callWS({type:"lovelace/config/save",url_path:ADMIN_DASHBOARD,config:next});
    const saved=await hass.callWS({type:"lovelace/config",url_path:ADMIN_DASHBOARD});
    if(!saved?.views || (appearance&&
       !saved.views.some(v=>v.path==="apparence"))){
      throw Error("Vérification de la sauvegarde de KIMIA Configuration impossible.");
    }
    return added;
  }
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
          const title=view.title || "Accueil";
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
        // Préférences par utilisateur : les nouveaux comptes voient tout par défaut.
        // L'ancienne navigation, la maquette et les cartes personnalisées restent intactes.
        const hiddenByArea=await loadHiddenByArea(hass,dashboards);
        modified+=applyRoomVisibility(next,hiddenByArea);
        const v14=applyV14(next,hass);
        added+=v14.added;modified+=v14.modified;
        if (added === 0 && removed === 0 && modified === 0) {
          const adminAdded=await upgradeAdminDashboard(hass,dashboards);
          const result = { state: "ok", added: 0, removed: 0, adminAdded,
            message: adminAdded
              ? "KIMIA Configuration : "+adminAdded+" élément(s) ajouté(s). Votre maison est à jour."
              : "Votre maison est déjà à jour. Rien à modifier." };
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
        const adminAdded=await upgradeAdminDashboard(hass,dashboards);
        const result = { state: "ok", added, removed, modified, adminAdded,
          message: added + " carte(s) ajoutée(s), "+removed+
            " supprimée(s), "+modified+" mise(s) en forme. "+
            (adminAdded?adminAdded+" réglage(s) admin ajouté(s). ":"")+
            "Votre maison est à jour." };
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
    version: "1.5.0-dev"
  });
})();