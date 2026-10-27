/* KIMIA Smart by PROMAINT — moteur de tableaux de bord v1.6 (socle admin).
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
    // Onglet Pièces jusque-là visible dans le header HA, absent de la navbar KIMIA.
    if(!card.routes.some(r=>r.url==="/kimia-next/pieces")){
      const home=card.routes.findIndex(r=>r.url==="/kimia-next/accueil");
      card.routes.splice(home<0?0:home+1,0,{
        url:"/kimia-next/pieces",icon:"mdi:floor-plan",label:"Pièces",
        hidden:'[[[ return states["input_boolean.kimia_onglet_pieces"]?.state !== "on"; ]]]'
      });
      changed++;
    }
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
    pieces: {type:"tile",entity:"input_boolean.kimia_onglet_pieces",
      name:"Pièces",icon:"mdi:floor-plan",tap_action:{action:"toggle"}},
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
        // La pièce peut avoir été personnalisée : le filtre concerne la section,
        // pas la configuration interne de la carte Area ni de ses tuiles.
        const area=section.cards?.find(c=>c.type==="area"&&typeof c.area==="string")?.area;
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

  // V1.7 : les droits portent exclusivement sur les zones HA (area_id).
  // Le plan, ses noms de pièces, ses étages et ses coordonnées sont propres
  // au client et ne sont jamais réécrits par le moteur de synchronisation.
  const MAQUETTE_ACL_CARD="custom:kimia-maquette-acl-v17-card";
  const updateMaquetteRights=(next,hiddenByArea,areas,devices,entities)=>{
    let added=0,modified=0;
    const known=new Set(areas.map(a=>a.area_id));
    const hidden={};
    const registry={};
    const devMap=new Map(devices.map(d=>[d.id,d]));
    for(const [area,users] of [...hiddenByArea].sort(([a],[b])=>natural(a,b))){
      if(!known.has(area)||!users.length)continue;
      hidden[area]=[...new Set(users)].sort();
      registry[area]={entities:[],devices:[]};
    }
    for(const d of devices)if(registry[d.area_id])
      registry[d.area_id].devices.push(d.id);
    for(const e of entities){
      if(!e.entity_id)continue;
      const area=getArea(e,devMap);
      if(registry[area])registry[area].entities.push(e.entity_id);
    }
    for(const v of Object.values(registry)){
      v.entities.sort();v.devices.sort();
    }
    // Les cartes Maquette restent dans leur section d'origine et leur
    // objet YAML COMPLET est conservé sous card. L'éditeur natif Maquette
    // retrouve récursivement cet objet et sauvegarde ses modifications.
    const visit=cards=>{
      if(!Array.isArray(cards))return;
      for(let i=0;i<cards.length;i++){
        const c=cards[i];
        if(!c||typeof c!=="object")continue;
        if(c.type==="custom:maquette-card"){
          cards[i]={type:MAQUETTE_ACL_CARD,card:c,
            hidden_users_by_area:safeClone(hidden),
            entities_by_area:safeClone(registry)};
          modified++;
        }else if(c.type===MAQUETTE_ACL_CARD &&
                 c.card?.type==="custom:maquette-card"){
          if(JSON.stringify(c.hidden_users_by_area||{})!==JSON.stringify(hidden)){
            c.hidden_users_by_area=safeClone(hidden);modified++;
          }
          if(JSON.stringify(c.entities_by_area||{})!==JSON.stringify(registry)){
            c.entities_by_area=safeClone(registry);modified++;
          }
        }else if(Array.isArray(c.cards))visit(c.cards);
      }
    };
    for(const view of next.views||[]){
      for(const section of view.sections||[])visit(section.cards);
      visit(view.cards);
    }
    return {added,modified};
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
        for(const key of ["pieces","carte","listes"]){
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
    // V1.6 : faire évoluer uniquement la carte standard de création de scripts.
    // Les scénarios Home Assistant sont conservés et la carte d'association aussi.
    // Une carte V1.4 personnalisée reste intacte ; le nouvel atelier est ajouté à part.
    if(scenarios?.sections){
      const editor="custom:kimia-routine-editor-v16-card";
      const legacy="custom:kimia-script-builder-v14-card";
      for(const section of scenarios.sections){
        for(const card of section.cards||[]){
          if(card.type!==legacy)continue;
          const onlyStandard=Object.keys(card).sort().join("|")==="grid_options|type" &&
            card.grid_options?.columns==="full" && card.grid_options?.rows==="auto";
          if(onlyStandard && !hasCard(scenarios,c=>c.type===editor)){
            card.type=editor;added++;
          }
        }
      }
      if(!hasCard(scenarios,c=>c.type===editor)){
        const oldIdx=scenarios.sections.findIndex(s=>s.cards?.some(c=>
          c.type==="custom:kimia-scenarios-v1-card"));
        const target=oldIdx<0?scenarios.sections.length:oldIdx;
        scenarios.sections.splice(target,0,{type:"grid",column_span:2,cards:[
          {type:editor,grid_options:{columns:"full",rows:"auto"}}]});
        added++;
      }
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
    // Extension native Énergie/Eau : ne crée qu'une sous-vue admin et un raccourci.
    // Aucune carte ni icône historique n'est réécrite.
    const nativeExtension=window.KimiaNativeExtensionV1;
    if(nativeExtension?.planAdmin){
      const nativeAdmin=nativeExtension.planAdmin({
        adminDashboard:next,states:hass.states,entities:[]
      });
      if(nativeAdmin.changed){
        next.views=nativeAdmin.config.views;
        added+=1;
      }
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

  // V1.5 : portail Paramètres conçu comme extension non destructive.
  // Les thèmes et le contrôle du bandeau HA sont déplacés, puis migrés vers des réglages locaux.
  const SETTINGS_BASE="/kimia-next/";
  const SETTINGS_PAGES=[
    {path:"reglages-utilisateurs",title:"Utilisateurs",icon:"mdi:account-group",
     label:"Utilisateurs",description:"Profils et pièces visibles",color:"teal"},
    {path:"reglages-affichage",title:"Affichage",icon:"mdi:monitor-eye",
     label:"Affichage",description:"Interface et bandeau HA",color:"blue"},
    {path:"reglages-localisation",title:"Zones et carte",icon:"mdi:map-marker-radius-outline",
     label:"Zones et carte",description:"Lieux et carte géographique",color:"cyan"},
    {path:"reglages-listes",title:"Mes listes",icon:"mdi:format-list-checks",
     label:"Mes listes",description:"Tâches du foyer",color:"green"},
    {path:"reglages-apparence",title:"Apparence",icon:"mdi:palette-outline",
     label:"Apparence",description:"Mes thèmes KIMIA",color:"deep-purple"}
  ];
  const settingsShortcut=(label,description,icon,path,color="teal")=>({
    type:"shortcut",label,description,icon,color,
    grid_options:{columns:6,rows:2},
    tap_action:{action:"navigate",navigation_path:path}
  });
  const settingsHelp=(message)=>({type:"markdown",content:message,
    grid_options:{columns:"full",rows:"auto"}});
  const settingsGrid=cards=>({type:"grid",column_span:2,cards});
  const settingsHeading=text=>({type:"heading",heading:text,icon:"mdi:cog-outline"});
  const settingsMenu=()=>settingsGrid([
    {type:"heading",heading:"Mon espace KIMIA",icon:"mdi:view-dashboard-outline",
     heading_style:"title",grid_options:{columns:"full",rows:1}},
    ...SETTINGS_PAGES.map(p=>settingsShortcut(
      p.label,p.description,p.icon,SETTINGS_BASE+p.path,p.color))
  ]);
  const getSettingsNav=param=>allCards(param).find(kimiaNav);
  const cloneSettingsBanner=(param,spec)=>{
    const source=(param.sections||[]).find(s=>s.cards?.some(isKimiaBrand));
    const banner=source?safeClone(source):brandBanner({
      max_columns:2,title:spec.title
    });
    const card=banner.cards.find(isKimiaBrand);
    if(card)card.custom_fields.slogan=bannerSlogan(spec.title);
    banner.column_span=2;
    return banner;
  };
  const makeSettingsSubview=(param,spec)=>{
    const nav=getSettingsNav(param);
    const cards=[
      settingsShortcut("Retour aux paramètres",
        "Revenir au menu principal","mdi:arrow-left",
        SETTINGS_BASE+"parametres","teal")
    ];
    const view={title:spec.title,path:spec.path,icon:spec.icon,
      type:"sections",max_columns:2,subview:true,
      back_path:SETTINGS_BASE+"parametres",
      sections:[cloneSettingsBanner(param,spec),settingsGrid(cards)]};
    const add=(...items)=>view.sections.push(settingsGrid(items));
    if(spec.path==="reglages-utilisateurs")add(
      settingsHeading("Mes accès"),
      settingsHelp("Les pièces visibles sont définies par l'administrateur KIMIA. Il s'agit d'un masquage visuel, pas d'une interdiction d'accès aux appareils."),
      settingsShortcut("Gérer les utilisateurs","Administration KIMIA",
        "mdi:account-cog-outline","/kimia-admin-next/utilisateurs","teal")
    );
    if(spec.path==="reglages-localisation")add(
      settingsHeading("Carte géographique"),
      settingsShortcut("Ouvrir ma carte","Zones et positions sélectionnées",
        "mdi:map-marker-radius-outline","/kimia-next/carte","cyan"),
      settingsShortcut("Configurer la carte","Choisir les positions affichées",
        "mdi:map-cog-outline","/kimia-admin-next/apparence","teal"),
      settingsShortcut("Créer ou modifier une zone",
        "Gestion native Home Assistant · admin",
        "mdi:map-marker-plus","/config/zone","cyan"),
      settingsHelp("Les zones Home Assistant restent la référence. La création intégrée à KIMIA avec choix sur la carte fera l'objet d'un module dédié.")
    );
    if(spec.path==="reglages-listes")add(
      settingsHeading("Mes listes"),
      settingsShortcut("Ouvrir mes listes","Liste To-do du foyer",
        "mdi:format-list-checks","/kimia-next/listes","green"),
      settingsHelp("Le choix de plusieurs listes (trois maximum, empilées) sera intégré ici. Les listes existantes ne sont pas modifiées.")
    );
    if(spec.path==="reglages-affichage")add(
      settingsHeading("Mon affichage"),
      settingsHelp("Retrouvez ici le contrôle du bandeau Home Assistant, avec sa préférence actuelle propre à cet appareil.")
    );
    if(spec.path==="reglages-apparence")add(
      settingsHeading("Personnalisation"),
      settingsHelp("Choisissez ici un thème uniquement pour cet appareil. Aucun changement global sur Home Assistant.")
    );
    if(nav)view.sections.push(settingsGrid([safeClone(nav)]));
    return view;
  };
  const applySettingsPortal = next=>{
    const param=next.views.find(v=>v.path==="parametres");
    if(!Array.isArray(param?.sections))return {added:0,modified:0};
    const before=countCards(next);
    let modified=0;
    for(const spec of SETTINGS_PAGES){
      if(next.views.some(v=>v.path===spec.path))continue;
      next.views.push(makeSettingsSubview(param,spec));
    }
    // Déplacer sans reconstituer : conserve toutes les options existantes
    // (thèmes, couleurs, bouton Kiosk, tuiles et personnalisations).
    const relocations=[
      ["Affichage de l'application","reglages-affichage"],
      ["Mes thèmes","reglages-apparence"]
    ];
    for(const [heading,target] of relocations){
      const to=next.views.find(v=>v.path===target);
      if(!to?.subview)continue;
      if(allCards(to).some(c=>c.type==="heading"&&c.heading===heading))continue;
      const idx=param.sections.findIndex(s=>s.cards?.some(c=>
        c.type==="heading"&&c.heading===heading));
      if(idx<0)continue;
      const moved=param.sections.splice(idx,1)[0];
      // Garder les sections copiées intactes, à l'exception de leur emplacement.
      const navIndex=to.sections.findIndex(s=>s.cards?.some(kimiaNav));
      to.sections.splice(navIndex<0?to.sections.length:navIndex,0,moved);
      modified++;
    }
    // Placer le portail juste après le bandeau de marque et laisser toutes
    // les autres sections non reconnues à leur place.
    if(!param.sections.some(s=>s.cards?.some(c=>
      c.type==="heading"&&c.heading==="Mon espace KIMIA"))){
      const bannerIndex=param.sections.findIndex(s=>s.cards?.some(isKimiaBrand));
      param.sections.splice(bannerIndex<0?0:bannerIndex+1,0,settingsMenu());
      modified++;
    }
    return {added:countCards(next)-before,modified};
  };

  // V1.6.1 : revenir à des préférences strictement locales pour les thèmes
  // et le bandeau HA. Ne modifier QUE les anciennes cartes standard KIMIA.
  const LOCAL_THEME_CARD="custom:kimia-local-theme-v16-card";
  const LEGACY_THEME_ENTITY="input_select.kimia_theme_global";
  const KIMIA_THEMES=new Set([
    "KIMIA Gris Premium","KIMIA Clair","KIMIA Sombre","KIMIA Signature",
    "KIMIA Vert Sauge","KIMIA Violet Nuit","KIMIA Sable Doré","KIMIA Terracotta"
  ]);
  const themeOption = card=>card?.tap_action?.action==="perform-action" &&
    card.tap_action.perform_action==="input_select.select_option" &&
    card.tap_action.target?.entity_id===LEGACY_THEME_ENTITY &&
    KIMIA_THEMES.has(card.tap_action.data?.option);
  const legacyThemeSelect = card=>card?.type==="entities" &&
    card.title==="Mon ambiance actuelle" &&
    card.entities?.length===1 &&
    (card.entities[0]?.entity||card.entities[0])===LEGACY_THEME_ENTITY;
  const localThemeUI = next=>{
    let added=0,removed=0,modified=0;
    const targets=next.views.filter(v=>v.path==="reglages-apparence"||v.path==="parametres");
    for(const view of targets){
      if(!Array.isArray(view.sections))continue;
      for(const section of view.sections){
        const cards=section.cards;
        if(!Array.isArray(cards))continue;
        if(!cards.some(c=>c.type==="heading"&&c.heading==="Mes thèmes"))continue;
        const has=cards.some(c=>c.type===LOCAL_THEME_CARD);
        const olds=cards.filter(c=>themeOption(c)||legacyThemeSelect(c));
        if(olds.length){
          section.cards=cards.filter(c=>!themeOption(c)&&!legacyThemeSelect(c));
          removed+=olds.length;
        }
        if(!has){
          const head=section.cards.findIndex(c=>c.type==="heading"&&c.heading==="Mes thèmes");
          section.cards.splice(head+1,0,{type:LOCAL_THEME_CARD,
            grid_options:{columns:"full",rows:"auto"}});
          added++;
        }
      }
    }
    return {added,removed,modified};
  };
  // Migration prudente : ne réécrit jamais un Kiosk Mode personnalisé.
  // L'ancien réglage ne s'appliquait qu'aux non-admin et pouvait donc
  // laisser l'administrateur avec un bandeau impossible à masquer.
  const localKioskUI = next=>{
    const km=next.kiosk_mode;
    if(!km||typeof km!=="object")return 0;
    // KIMIA V1.6.1 créait par erreur kiosk au niveau racine :
    // les admins perdaient leur bandeau HA. Migrer cette valeur uniquement
    // lorsqu'elle porte la signature exacte de notre ancien réglage.
    const managed=value=>typeof value==="string" &&
      value.includes("kimia_bandeau_ha_") &&
      value.includes("localStorage.getItem");
    const local='[[[ return window.localStorage.getItem("kimia_bandeau_ha_" + user_name) !== "visible"; ]]]';
    let changed=0;
    if(managed(km.kiosk)){
      delete km.kiosk;
      // La config Kiosk pour admin ne doit JAMAIS hériter de ce réglage.
      // Conserver les autres personnalisations déjà en place.
      if(!km.non_admin_settings)km.non_admin_settings={};
      if(km.non_admin_settings.kiosk===undefined ||
         managed(km.non_admin_settings.kiosk)){
        km.non_admin_settings.kiosk=local;
      }
      changed++;
    }else if(managed(km?.non_admin_settings?.kiosk) &&
             km.non_admin_settings.kiosk!==local){
      km.non_admin_settings.kiosk=local;
      changed++;
    }
    return changed;
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
          // La sous-vue Énergie est volontairement 100 % native.
          // Ne pas lui injecter l'ancien bandeau custom lors d'une 2e synchro.
          if(view.path==="energie" && view.subview===true)continue;
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

        // Gemini sur Accueil : un seul raccourci natif, juste après Réveil.
        // Ouvre Assist avec le pipeline préféré (qui doit utiliser Gemini dans HA).
        const scenarioSection=(home.sections||[]).find(section=>
          (section.cards||[]).some(card=>card.type==="heading"&&card.heading==="Mes scénarios")&&
          (section.cards||[]).some(card=>card.type==="shortcut"&&card.label==="Réveil"));
        if(scenarioSection &&
           !allCards(home).some(card=>card.type==="shortcut"&&card.label==="Parler à Gemini")){
          const wakeIndex=scenarioSection.cards.findIndex(card=>
            card.type==="shortcut"&&card.label==="Réveil");
          scenarioSection.cards.splice(wakeIndex+1,0,{
            type:"shortcut",grid_options:{columns:12,rows:1},
            label:"Parler à Gemini",description:"Converser avec l'assistant",
            icon:"mdi:creation",color:"purple",
            tap_action:{action:"assist",pipeline_id:"preferred"}
          });
          added++;
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
        const maquetteRights=updateMaquetteRights(next,hiddenByArea,orderedAreas,devices,entities);
        added+=maquetteRights.added;modified+=maquetteRights.modified;
        const v14=applyV14(next,hass);
        added+=v14.added;modified+=v14.modified;
        const settings=applySettingsPortal(next);
        added+=settings.added;modified+=settings.modified;
        const appearanceFix=localThemeUI(next);
        added+=appearanceFix.added;removed+=appearanceFix.removed;
        modified+=appearanceFix.modified;
        modified+=localKioskUI(next);
        // Extension optionnelle : raccordement au bouton natif « Actualiser ma maison ».
        // Préserve les vues et cartes existantes ; ajoute seulement le suivi et les
        // caméras dans Sécurité, jamais une rubrique caméra supplémentaire.
        const nativeExtension=window.KimiaNativeExtensionV1;
        if(nativeExtension?.enhanceClientPlan){
          const beforeNative=countCards(next);
          const enhanced=nativeExtension.enhanceClientPlan({
            dashboard:next,states:hass.states,entities,devices,areas
          });
          if(enhanced.changed){
            const newCount=countCards(enhanced.config)-beforeNative;
            next.views=enhanced.config.views;
            added+=Math.max(0,newCount);
            removed+=Math.max(0,-newCount);
            modified++;
          }
        }
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
    version: "1.7.0-dev"
  });
})();