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
  const SAFE_TILE_TYPE="custom:kimia-safe-tile-v1-card";
  // Encapsule exclusivement la carte Tile native Home Assistant.
  // L'instance reçoit les mises à jour HA en direct, sans toucher au réseau
  // Zigbee, à hass global ou à la configuration des autres cartes.
  if(typeof customElements!=="undefined" &&
     typeof HTMLElement!=="undefined" &&
     !customElements.get("kimia-safe-tile-v1-card")) {
    let cardHelpersPromise=null;
    const helpers=()=>{
      if(typeof window.loadCardHelpers!=="function")
        return Promise.reject(Error("Cartes natives Home Assistant indisponibles"));
      if(!cardHelpersPromise)cardHelpersPromise=window.loadCardHelpers()
        .catch(error=>{cardHelpersPromise=null;throw error;});
      return cardHelpersPromise;
    };
    class KimiaSafeTile extends HTMLElement {
      constructor(){
        super();
        this.attachShadow({mode:"open"});
        this._config=null;this._hass=null;this._child=null;
        this._mode="";this._signature="";this._loading=false;this._request=0;
        this._commandFailed=false;this._previousState=null;this._seenName="";
        const style=document.createElement("style");
        style.textContent=[
          ":host{display:block}",
          ".notice{font-size:12px;color:var(--secondary-text-color);padding:5px 8px}",
          ".notice[hidden]{display:none}",
          ".notice.error{color:var(--error-color,#c62828)}",
          ".retry{font:inherit;font-size:12px;color:var(--primary-color);background:none;",
          "border:0;text-decoration:underline;cursor:pointer;margin-left:7px}",
          ".missing{padding:14px;min-height:42px;box-sizing:border-box}",
          ".missing strong{display:block;font-size:14px;overflow-wrap:anywhere}"
        ].join("\n");
        this._frame=document.createElement("div");
        this._notice=document.createElement("div");
        this._notice.className="notice";
        this._notice.setAttribute("aria-live","polite");
        this._notice.hidden=true;
        this._message=document.createElement("span");
        this._retry=document.createElement("button");
        this._retry.type="button";this._retry.className="retry";
        this._retry.textContent="Réessayer";this._retry.hidden=true;
        this._retry.addEventListener("click",()=>{
          this._commandFailed=false;this._update();
        });
        this._notice.append(this._message,this._retry);
        this.shadowRoot.append(style,this._frame,this._notice);
      }
      setConfig(config){
        if(config?.card?.type!=="tile" ||
           typeof config.card.entity!=="string" ||
           (config.entity&&config.entity!==config.card.entity))
          throw Error("KIMIA : tuile native et entité requises");
        this._config=JSON.parse(JSON.stringify(config.card));
        this._request++;
        this._signature="";
        this._loading=false;
        this._child=null;
        this._frame.replaceChildren();
        this._update();
      }
      set hass(hass){
        const current=hass?.states?.[this._config?.entity];
        const newState=current?.state||null;
        if(current?.attributes?.friendly_name)
          this._seenName=current.attributes.friendly_name;
        // Réautoriser après changement d'état (reconnexion incluse).
        if(this._commandFailed &&
           this._previousState!==null && newState!==this._previousState)
          this._commandFailed=false;
        this._previousState=newState;
        this._hass=hass;
        this._update();
      }
      connectedCallback(){this._update();}
      getCardSize(){return this._child?.getCardSize?.()||2;}
      getGridOptions(){
        return this._config?.grid_options||{columns:12,rows:1};
      }
      _status(message,failed=false,retry=false){
        this._notice.hidden=!message;
        this._notice.className="notice"+(failed?" error":"");
        this._message.textContent=message||"";
        this._retry.hidden=!retry;
      }
      _modeForState(){
        const obj=this._hass?.states?.[this._config?.entity];
        if(!this._hass)return "pending";
        if(!obj)return "missing";
        if(obj.state==="unknown"||obj.state==="unavailable")return "offline";
        return this._commandFailed?"failed":"online";
      }
      _cardConfig(mode){
        const cfg=JSON.parse(JSON.stringify(this._config));
        if(mode!=="online") {
          for(const action of ["tap_action","hold_action","double_tap_action",
            "icon_tap_action","icon_hold_action","icon_double_tap_action"])
            cfg[action]={action:"none"};
          delete cfg.features;
        }
        return cfg;
      }
      _isOurTarget(data,target){
        const id=this._config?.entity;
        const matches=value=>value===id ||
          (Array.isArray(value)&&value.includes(id));
        return matches(data?.entity_id)||matches(target?.entity_id);
      }
      _safeHass(){
        const source=this._hass,instance=this;
        if(!source||typeof source.callService!=="function")return source;
        const local=Object.create(source);
        local.callService=(domain,service,data,target)=>{
          if(!instance._isOurTarget(data,target))
            return source.callService(domain,service,data,target);
          if(instance._modeForState()!=="online"){
            instance._status("Commande désactivée : appareil indisponible.",true,
              instance._commandFailed);
            return Promise.resolve();
          }
          // Capture locale : un timeout Zigbee ou réseau n'endommage pas les
          // autres widgets et l'usager voit que la commande n'a pas abouti.
          try {
            return Promise.resolve(source.callService(domain,service,data,target))
              .catch(error=>{
                instance._commandFailed=true;
                instance._status("Commande impossible. Vérifiez l'appareil.",true,true);
                instance._update();
              });
          }catch(error){
            instance._commandFailed=true;
            instance._status("Commande impossible. Vérifiez l'appareil.",true,true);
            instance._update();
            return Promise.resolve();
          }
        };
        return local;
      }
      _loadNative(){
        if(this._child||this._loading||!this._config)return;
        this._loading=true;
        const request=++this._request;
        void helpers().then(helper=>{
          if(request!==this._request)return;
          if(typeof helper?.createCardElement!=="function")
            throw Error("Création de tuile native indisponible");
          this._child=helper.createCardElement(this._cardConfig("online"));
          this._loading=false;
          this._signature="";
          this._frame.replaceChildren(this._child);
          this._update();
        }).catch(error=>{
          if(request!==this._request)return;
          this._loading=false;
          this._status("Tuile indisponible : "+(error?.message||error),true);
        });
      }
      _update(){
        if(!this._config)return;
        const mode=this._modeForState();
        if(mode==="pending")return;
        if(mode==="missing"){
          if(this._mode!=="missing"){
            const card=document.createElement("ha-card");
            const label=document.createElement("div");
            label.className="missing";
            const title=document.createElement("strong");
            title.textContent=this._seenName||this._config.name||
              this._config.entity;
            const desc=document.createElement("span");
            desc.textContent="Appareil absent de Home Assistant";
            label.append(title,desc);
            card.appendChild(label);
            this._frame.replaceChildren(card);
            this._mode="missing";
          }
          this._status("Indisponible · aucune commande possible.");
          return;
        }
        if(!this._child){
          this._mode=mode;
          this._loadNative();
          return;
        }
        // En retour d'une entité absente, la même carte native est recréée
        // sans laisser une erreur d'une autre carte casser le dashboard.
        if(this._mode==="missing"){
          this._frame.replaceChildren(this._child);
          this._signature="";
        }
        this._mode=mode;
        const cfg=this._cardConfig(mode);
        const signature=JSON.stringify(cfg);
        if(signature!==this._signature){
          try {
            this._child.setConfig(cfg);
            this._signature=signature;
          }catch(error){
            this._status("Erreur isolée sur cette carte : "+(error?.message||error),true);
            return;
          }
        }
        try {this._child.hass=this._safeHass();}
        catch(error){
          this._status("Erreur d'affichage sur cet appareil.",true);
          return;
        }
        if(mode==="online")this._status("");
        else if(mode==="failed")this._status(
          "Commande impossible. Vérifiez l'appareil.",true,true);
        else this._status("Indisponible · commandes désactivées.");
      }
    }
    customElements.define("kimia-safe-tile-v1-card",KimiaSafeTile);
    window.customCards=window.customCards||[];
    if(!window.customCards.some(c=>c.type==="kimia-safe-tile-v1-card"))
      window.customCards.push({type:"kimia-safe-tile-v1-card",
        name:"KIMIA · Tuile protégée",description:
        "Carte native Home Assistant, commandes bloquées si l'appareil est indisponible."});
  }
  // Les 4 raccourcis de l'accueil gardent des cartes natives "shortcut".
  // Aucune dépendance à input_text : les choix sont stockés dans le
  // dashboard kimia-next (configuration de cette carte).
  if(typeof customElements!=="undefined" &&
     !customElements.get("kimia-home-scenarios-v1-card")) {
    const CARD="kimia-home-scenarios-v1-card";
    const homeHelpers=()=>typeof window.loadCardHelpers==="function"
      ?window.loadCardHelpers()
      :Promise.reject(Error("Composants natifs Home Assistant indisponibles"));
    class KimiaHomeScenarios extends HTMLElement {
      constructor(){
        super();this.attachShadow({mode:"open"});
        this._slots=[];this._hass=null;this._cards=[];this._signature="";
        this._token=0;
        const style=document.createElement("style");
        style.textContent=":host{display:block}.scenarios{display:grid;grid-template-columns:1fr;gap:8px}.empty{font-size:13px;color:var(--secondary-text-color);padding:10px}.error{font-size:12px;color:var(--error-color);padding:8px}";
        this._root=document.createElement("div");
        this._root.className="scenarios";
        this.shadowRoot.append(style,this._root);
      }
      setConfig(config){
        if(!Array.isArray(config?.slots)||config.slots.length>4)
          throw Error("KIMIA accueil : quatre emplacements maximum");
        this._slots=[...config.slots, null,null,null,null].slice(0,4)
          .map(v=>typeof v==="string"&&/^script\.[a-z0-9_]+$/.test(v)?v:null);
        this._signature="";this._update();
      }
      set hass(hass){this._hass=hass;this._update();}
      getGridOptions(){return {columns:12,rows:"auto"};}
      getCardSize(){return Math.max(1,this._slots.filter(Boolean).length);}
      _update(){
        if(!this._hass)return;
        const visible=this._slots.filter(Boolean).map((id,index)=>{
          const entity=this._hass.states?.[id];
          const unavailable=!entity||["unknown","unavailable"].includes(entity.state);
          const label=entity?.attributes?.friendly_name||id.replace(/^script\./,"").replace(/_/g," ");
          return {id,label,icon:entity?.attributes?.icon||"mdi:play-circle-outline",
            color:["purple","green","blue","amber"][index],unavailable};
        });
        const signature=JSON.stringify(visible);
        if(signature===this._signature){
          for(const card of this._cards)card.hass=this._hass;
          return;
        }
        this._signature=signature;
        const token=++this._token;
        this._root.replaceChildren();
        this._cards=[];
        if(!visible.length){
          const empty=document.createElement("div");
          empty.className="empty";empty.textContent="Aucun scénario configuré.";
          this._root.append(empty);return;
        }
        void homeHelpers().then(helper=>{
          if(token!==this._token)return;
          if(typeof helper?.createCardElement!=="function")
            throw Error("Cartes natives non chargées");
          const cards=visible.map(item=>{
            const config={type:"shortcut",label:item.label,
              description:item.unavailable?"Scénario indisponible":"Lancer le scénario",
              icon:item.icon,color:item.color,
              tap_action:item.unavailable?{action:"none"}:
                {action:"perform-action",perform_action:"script.turn_on",
                  target:{entity_id:item.id}},
              hold_action:{action:"none"}};
            const card=helper.createCardElement(config);
            card.hass=this._hass;
            return card;
          });
          if(token!==this._token)return;
          this._cards=cards;
          this._root.replaceChildren(...cards);
        }).catch(error=>{
          if(token!==this._token)return;
          const msg=document.createElement("div");msg.className="error";
          msg.textContent="Raccourcis indisponibles : "+(error?.message||error);
          this._root.replaceChildren(msg);
        });
      }
    }
    customElements.define(CARD,KimiaHomeScenarios);
    window.customCards=window.customCards||[];
    if(!window.customCards.some(c=>c.type===CARD))
      window.customCards.push({type:CARD,name:"KIMIA · 4 scénarios accueil",
        description:"Quatre raccourcis de scénarios configurables avec cartes natives."});
  }
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
  // Labels natifs HA partagés avec le gestionnaire Zigbee KIMIA.
  // Une seule utilisation principale, mais une prise reste toujours dans Prises.
  const USE_LABELS={
    lampe:"KIMIA · usage · Lampe",
    surpresseur:"KIMIA · usage · Surpresseur",
    clim:"KIMIA · usage · Climatisation",
    ventilateur:"KIMIA · usage · Ventilateur"
  };
  const plugUsage=(device,labels) => {
    if(!Array.isArray(device?.labels))return "autre";
    for(const [usage,name] of Object.entries(USE_LABELS)) {
      const label=labels.find(x=>x.name===name);
      if(label&&device.labels.includes(label.label_id))return usage;
    }
    return "autre";
  };
  const safeClone = obj => JSON.parse(JSON.stringify(obj));
  const natural = (a, b) => a.localeCompare(b, "fr", { sensitivity: "base" });
  const getArea = (e, devices) => e.area_id || devices.get(e.device_id)?.area_id || null;
  const entityName = (entity, hass) =>
    hass.states?.[entity.entity_id]?.attributes?.friendly_name ||
    entity.name || entity.original_name || entity.entity_id;
  // Les réglages du matériel (ex. "LED réseau") ne sont pas des commandes
  // d'équipement à proposer à l'habitant. Ils restent dans Home Assistant.
  const isClientEntity = (e,hass) => {
    const category=e.entity_category ||
      hass.states?.[e.entity_id]?.attributes?.entity_category;
    if(category==="config"||category==="diagnostic")return false;
    if(e.entity_id.startsWith("switch.")) {
      const label=[e.original_name,e.name,entityName(e,hass)].filter(Boolean).join(" ");
      if(/(?:led|voyant)\s*(?:de\s*)?(?:réseau|network|status)/i.test(label))
        return false;
    }
    return true;
  };
  // Icônes natives MDI par fonction de l'équipement, sans carte custom.
  const tileIcon=(e,usage="autre")=>{
    const id=e.entity_id||"";
    const kind=id.split(".")[0];
    const deviceClass=e.device_class||e.attributes?.device_class||
      (/snzb_06p|presence|motion|mouvement/i.test(id)?"motion":
       /contact|door|porte/i.test(id)?"door":
       /humidity|humidite|hygrometrie/i.test(id)?"humidity":
       /temperature|temp_/i.test(id)?"temperature":"");
    if(usage==="clim"||kind==="climate")return "mdi:air-conditioner";
    if(usage==="ventilateur"||kind==="fan")return "mdi:fan";
    if(usage==="surpresseur")return "mdi:water-pump";
    if(usage==="lampe"&&kind==="switch")return "mdi:floor-lamp";
    if(kind==="switch")return "mdi:power-socket-eu";
    if(kind==="light")return "mdi:lightbulb-variant";
    if(kind==="cover")return "mdi:window-shutter";
    if(kind==="media_player")return "mdi:speaker";
    if(kind==="camera")return "mdi:cctv";
    if(kind==="binary_sensor"){
      const icons={motion:"mdi:motion-sensor",occupancy:"mdi:motion-sensor",
        door:"mdi:door-closed",window:"mdi:window-closed",
        moisture:"mdi:water-alert",smoke:"mdi:smoke-detector",
        safety:"mdi:shield-check",presence:"mdi:motion-sensor"};
      return icons[deviceClass]||"mdi:shield-check-outline";
    }
    if(kind==="sensor"){
      const icons={temperature:"mdi:thermometer",humidity:"mdi:water-percent",
        battery:"mdi:battery",power:"mdi:flash",energy:"mdi:lightning-bolt"};
      return icons[deviceClass]||"mdi:gauge";
    }
    return "mdi:devices";
  };
  // Modele HA retenu : vraie carte Tile native 12 colonnes.
  const tile=(e,path="",usage="autre")=>{
    const id=e.entity_id,kind=id.split(".")[0];
    const x={type:"tile",entity:id,
      grid_options:{columns:12,rows:kind==="light"?2:1},
      icon:tileIcon(e,usage)};
    if(kind==="light"){
      // Identique aux deux ampoules corrigées dans le YAML utilisateur.
      x.features=[{type:"light-color"}];
      x.features_position="bottom";
      x.tap_action={action:"more-info"};
      x.icon_tap_action={action:"toggle"};
    }else if(kind==="cover"){
      x.features=[{type:"cover-open-close"}];
    }else if(kind==="switch"){
      if(usage==="clim"){
        x.tap_action={action:"more-info"};
        x.icon_tap_action={action:"more-info"};
      }else{
        x.tap_action={action:"toggle"};
      }
      x.hold_action={action:"more-info"};
    }
    return x;
  };
  // Conserver les piles natives des capteurs comme dans l'onglet Sécurité
  // fourni; les autres tuiles restent directement dans la grille Sections.
  const safeTile=(e,path="",usage="autre")=>
    e.entity_id.startsWith("binary_sensor.")
      ?{type:"vertical-stack",cards:[tile(e,path,usage)]}
      :tile(e,path,usage);
  const generatedEntity=card=>
    typeof card?.entity==="string"?card.entity:
    card?.type==="vertical-stack"&&card.cards?.length===1&&
    typeof card.cards[0]?.entity==="string"?card.cards[0].entity:null;
  // Reproduit les cartes historiques KIMIA pour les reconnaître à la migration
  // sans écraser une carte modifiée manuellement.
  const oldCoreTile=(e,path="",usage="autre")=>{
    const id=e.entity_id;
    const x={type:"tile",entity:id,name:undefined,
      grid_options:{columns:12,rows:1}};
    if(id.startsWith("light.")){
      x.features=[{type:"light-brightness"}];
      x.tap_action={action:"more-info"};
      x.icon_tap_action={action:"toggle"};
    }
    if(id.startsWith("cover."))x.features=[{type:"cover-open-close"}];
    if(id.startsWith("switch.")){
      if(usage==="clim"){
        x.tap_action={action:"more-info"};
        x.icon_tap_action={action:"more-info"};
      }else{x.tap_action={action:"toggle"};}
      x.hold_action={action:"more-info"};
    }
    return x;
  };
  const oldUnsizedStack=(e,path="",usage="autre")=>{
    const native=oldCoreTile(e,path,usage);
    delete native.grid_options;
    return {type:"vertical-stack",cards:[native]};
  };
  // La version précédente utilisait 6 colonnes pour les lumières,
  // volets, climatisations, enceintes, etc. Migrer ces cartes inchangées.
  const previousTile=(e,usage="autre")=>{
    const x=oldCoreTile(e,"",usage);
    const domain=e.entity_id.split(".")[0];
    x.grid_options={columns:["switch","sensor","binary_sensor"].includes(domain)
      ?12:6,rows:1};
    return x;
  };
  const previousSafeTile=(e,usage="autre")=>{
    const native=previousTile(e,usage);
    return {type:SAFE_TILE_TYPE,entity:e.entity_id,card:native,
      grid_options:{...native.grid_options}};
  };
  const oldTapTile=e=>{
    const x=oldCoreTile(e,"","autre");
    x.grid_options={columns:6,rows:1};
    return x;
  };
  const legacyTile=e=>{
    const x=oldTapTile(e);
    delete x.tap_action;delete x.hold_action;
    return x;
  };
  const heading = (label, icon = "mdi:home-outline") => ({
    type: "heading", heading: label, icon, heading_style: "subtitle",
    grid_options: { columns: "full", rows: 1 }
  });
  // Ancien correctif Sécurité : le titre natif remplaçait la carte Area.
  // Le reconnaître UNIQUEMENT pour restaurer l'esthétique d'origine.
  const securityRoomTitle=area=>({
    type:"heading",
    heading:area.name,
    heading_style:"subtitle",
    grid_options:{columns:"full",rows:1}
  });
  const isSecurityRoomTitle=card=>
    card?.type==="heading" &&
    !Object.prototype.hasOwnProperty.call(card,"icon") &&
    card.heading_style==="subtitle" &&
    card.grid_options?.columns==="full" &&
    card.grid_options?.rows===1 &&
    Object.keys(card).length===4 &&
    typeof card.heading==="string";
  // Carte native Area identique dans TOUTES les rubriques : icône,
  // intitulé, fond et largeur conservés. Une zone ne commande plus
  // les prises/lumières/volets par accident.
  // 2 lignes natives HA compensent l'absence de la rangée de boutons.
  const roomCard = area => ({
    type: "area",area:area.area_id,display_type:"compact",
    features:[],features_position:"bottom",
    vertical:true,
    tap_action:{action:"none"},
    grid_options:{columns:12,rows:2}
  });
  // Signature de la carte avant centrage vertical : permet la migration
  // des pièces existantes sans doublon.
  const previousHorizontalRoomCard=area=>({
    type:"area",area:area.area_id,display_type:"compact",
    features:[],features_position:"bottom",
    tap_action:{action:"none"},grid_options:{columns:12,rows:2}
  });
  const oldUnsizedRoomCard=area=>({
    type:"area",area:area.area_id,display_type:"compact",
    features:[],features_position:"bottom",tap_action:{action:"none"}
  });
  // Ancienne carte de pièce KIMIA, dimensions 12x2 imposées.
  const oldSizedRoomCard=area=>({
    type:"area",area:area.area_id,display_type:"compact",
    features:[],features_position:"bottom",
    grid_options:{columns:12,rows:2},
    tap_action:{action:"none"}
  });
  // Reconnaître strictement les versions publiées avec un clic de navigation,
  // pour les migrer vers une carte non interactive sans toucher à son apparence.
  const oldNavigableRoomCard=area=>({
    ...oldSizedRoomCard(area),
    tap_action:{action:"navigate",navigation_path:"/kimia-next/pieces"}
  });
  const previousRoomCard = (area,path="") => ({
    ...oldNavigableRoomCard(area),
    features:["securite","eau","climatisation"].includes(path)
      ?[]:[{type:"area-controls"}],
    grid_options:{columns:12,rows:"auto"}
  });
  const allCards = view =>
    (view.sections || []).flatMap(s => Array.isArray(s.cards) ? s.cards : [])
      .concat(Array.isArray(view.cards) ? view.cards : []);
  const sectionWithHeader = (view, name) => (view.sections || [])
    .find(s => s.type === "grid" && Array.isArray(s.cards) &&
      s.cards.some(c => c.type === "heading" && c.heading === name));
  const sectionForRoom = (view, area) => (view.sections || [])
    .find(s => s.type==="grid" && Array.isArray(s.cards) &&
      s.cards.some(c=>c.type==="area"&&c.area===area.area_id));
  // Même carte Pièce native partout : y compris en Sécurité.
  const createRoomSection = (area, view) => ({
    type:"grid",
    column_span:Math.min(Number(view.max_columns)||3,3),
    cards:[roomCard(area)]
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
  const isLegacyGeneratedTile = card =>
    card?.type === "tile" && typeof card.entity === "string" &&
    JSON.stringify(card) === JSON.stringify(safeClone(legacyTile({entity_id:card.entity})));
  // Ancienne carte d'équipement 12x1 (prises, volets, clim, capteurs).
  // Garder l'ancienne signature exacte pour migrer sans écraser les cartes personnalisées.
  const previousWideTile=(e,path="",usage="autre")=>{
    const x=oldCoreTile(e,path,usage);
    x.grid_options={columns:12,rows:1};
    return x;
  };
  const previousWideSafeTile=(e,usage="autre")=>{
    const native=previousWideTile(e,"",usage);
    return {type:SAFE_TILE_TYPE,entity:e.entity_id,card:native,
      grid_options:{...native.grid_options}};
  };
  // Dernière version compacte : Tile native emballée dans une carte
  // "safe" KIMIA, largeur forcée à 12. Reconnaissance stricte pour migration.
  const previousCompactLightSafeTile=e=>{
    if(!e.entity_id.startsWith("light."))return null;
    const native=oldCoreTile(e);native.grid_options={columns:12,rows:1};
    return {type:SAFE_TILE_TYPE,entity:e.entity_id,card:native,
      grid_options:{...native.grid_options}};
  };
  // Migrer les tuiles KIMIA RGB déployées avec les 3 bandes de couleur
  // vers une seule bande compacte. Ne jamais modifier une carte personnalisée.
  const previousExpandedLightTile=e=>{
    const x=oldCoreTile(e);
    if(!e.entity_id.startsWith("light."))return x;
    x.grid_options={columns:12,rows:"auto"};
    x.features=[
      {type:"light-brightness"},
      {type:"light-color",controls:"hue_saturation"},
      {type:"light-color-temp"}
    ];
    delete x.icon_tap_action;
    return x;
  };
  const previousExpandedLightSafeTile=e=>{
    const native=previousExpandedLightTile(e);
    return {type:SAFE_TILE_TYPE,entity:e.entity_id,card:native,
      grid_options:{...native.grid_options}};
  };
  // Reconnaître les cartes plus anciennes limitées à la luminosité.
  const previousBrightnessTile=(e,columns=12)=>{
    const x=oldCoreTile(e);
    if(!e.entity_id.startsWith("light."))return x;
    x.features=[{type:"light-brightness"}];
    x.grid_options={columns,rows:1};
    delete x.tap_action;
    delete x.icon_tap_action;
    return x;
  };
  const previousBrightnessSafeTile=(e,columns=12)=>{
    const native=previousBrightnessTile(e,columns);
    return {type:SAFE_TILE_TYPE,entity:e.entity_id,card:native,
      grid_options:{...native.grid_options}};
  };
  // Conserver la reconnaissance stricte des cartes KIMIA déjà générées,
  // quel que soit l'usage attribué à une prise (lampe, clim, ventilateur...).
  // Une carte modifiée manuellement ne correspondra plus à sa signature.
  const isGeneratedTile=card=>{
    const id=generatedEntity(card);
    if(!id)return false;
    const e={entity_id:id};
    const usages=["autre","lampe","clim","ventilateur","surpresseur"];
    const candidates=[];
    for(const usage of usages){
      if(card.type==="vertical-stack"){
        candidates.push(safeTile(e,"",usage),oldUnsizedStack(e,"",usage));
      }else if(card.type===SAFE_TILE_TYPE){
        candidates.push(previousWideSafeTile(e,usage),
          previousSafeTile(e,usage));
      }else if(card.type==="tile"){
        candidates.push(tile(e,"",usage),previousWideTile(e,"",usage),
          previousTile(e,usage));
      }
    }
    if(card.type===SAFE_TILE_TYPE){
      candidates.push(previousCompactLightSafeTile(e),
        previousExpandedLightSafeTile(e),
        previousBrightnessSafeTile(e),
        previousBrightnessSafeTile(e,6));
    }else if(card.type==="tile"){
      candidates.push(legacyTile(e),oldTapTile(e),
        previousExpandedLightTile(e),
        previousBrightnessTile(e),previousBrightnessTile(e,6));
    }
    return candidates.filter(Boolean).some(candidate=>
      JSON.stringify(card)===JSON.stringify(safeClone(candidate)));
  };
  // Une carte Pièce n'est gérée par KIMIA que si toutes ses options sont intactes.
  // Les variantes personnalisées doivent rester sous contrôle de l'habitant.
  const isGeneratedRoomCard = card => {
    if(card?.type!=="area"||typeof card.area!=="string")return false;
    const area={area_id:card.area};
    const variants=[roomCard(area),previousHorizontalRoomCard(area),
      oldUnsizedRoomCard(area),oldSizedRoomCard(area),oldNavigableRoomCard(area),
      {...roomCard(area),tap_action:{action:"navigate",navigation_path:"/kimia-next/pieces"}},
      {...oldUnsizedRoomCard(area),tap_action:{action:"navigate",navigation_path:"/kimia-next/pieces"}}];
    for(const path of ["","securite","eau","climatisation"]){
      const old=previousRoomCard(area,path);
      variants.push(old,{...old,grid_options:{columns:6,rows:"auto"}});
    }
    return variants.some(v=>JSON.stringify(card)===JSON.stringify(v));
  };
  const isGeneratedRoomHeading = (card, areaName) =>
    card?.type==="heading" && card.heading_style==="subtitle" &&
    card.icon==="mdi:home-heart-outline" &&
    card.grid_options?.columns==="full" &&
    card.grid_options?.rows===1 &&
    (!areaName || card.heading===areaName);
  const managedRoom = (section,path) => {
    if(section?.type!=="grid"||!Array.isArray(section.cards))return null;
    // Conserve la migration du correctif précédent (heading en Sécurité).
    return section.cards.find(isGeneratedRoomCard) ||
      (path==="securite"?section.cards.find(isSecurityRoomTitle):null);
  };
  const expectedDomain = (path,e,hass,devices,labels) => {
    const domain=e.entity_id.split(".")[0];
    const usage=plugUsage(devices.get(e.device_id),labels);
    if(path==="pieces")return true;
    if(path==="prises")return domain==="switch";
    if(path==="lumieres")return domain==="light" ||
      (domain==="switch"&&usage==="lampe");
    if(path==="climatisation")return ["climate","fan"].includes(domain) ||
      (domain==="switch"&&["clim","ventilateur"].includes(usage));
    if(path==="eau")return domain==="switch"&&usage==="surpresseur";
    const category=CATEGORIES.find(c=>c[0]===path);
    if(!category||!category[1].includes(domain))return false;
    if(path!=="securite"||domain==="alarm_control_panel")return true;
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
  // L'onglet Eau apparaît uniquement si un surpresseur est classé dans KIMIA
  // (ou s'il existe déjà). Aucun onglet fantôme dans une maison sans eau.
  const ensureWaterView=(next,hasPump)=>{
    const existing=next.views.find(v=>v.path==="eau");
    if(!hasPump&&!existing)return {added:0,modified:0};
    let added=0,modified=0;
    const nav=next.views.flatMap(allCards).find(kimiaNav);
    if(!nav)throw Error("Navigation KIMIA introuvable pour l'onglet Eau.");
    const route={
      url:"/kimia-next/eau",
      icon:"mdi:water-pump",
      label:"Eau"
    };
    for(const view of next.views) {
      for(const card of allCards(view)) {
        if(!kimiaNav(card)||card.routes.some(r=>r.url===route.url))continue;
        const idx=card.routes.findIndex(r=>r.url==="/kimia-next/prises");
        card.routes.splice(idx<0?card.routes.length:idx+1,0,safeClone(route));
        modified++;
      }
    }
    if(!existing) {
      const water={
        title:"Eau",path:"eau",icon:"mdi:water-pump",
        type:"sections",max_columns:3,sections:[
          brandBanner({max_columns:3}),
          {type:"grid",column_span:3,cards:[safeClone(nav)]}
        ]
      };
      water.sections[0].cards[0].custom_fields.slogan=bannerSlogan("Eau");
      next.views.push(water);
      added+=countCards({views:[water]});
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
    for(const path of ["pieces",...CATEGORIES.map(x=>x[0]),"eau"]){
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
    // Atelier IA dans un onglet d'administration séparé : le manuel reste intact.
    const aiAutomationType="custom:kimia-ai-automation-studio-v1-card";
    const haHealthType="custom:kimia-ha-diagnostic-v1-card";
    const aiTabPath="automatisations-ia";
    let aiView=next.views.find(v=>v.path===aiTabPath);
    if(!aiView){
      aiView={
        title:"Automatisations IA",path:aiTabPath,icon:"mdi:robot-outline",
        type:"sections",max_columns:2,
        sections:[
          {type:"grid",column_span:2,cards:[
            {type:"heading",heading:"Atelier IA KIMIA",icon:"mdi:creation",heading_style:"title",
              grid_options:{columns:"full",rows:1}},
            {type:"button",name:"Création manuelle",icon:"mdi:hand-back-right-outline",
              show_name:true,show_icon:true,show_state:false,
              tap_action:{action:"navigate",navigation_path:"/kimia-admin-next/scenarios"},
              grid_options:{columns:12,rows:2}}
          ]},
          {type:"grid",column_span:2,cards:[{type:aiAutomationType,
            grid_options:{columns:"full",rows:"auto"}}]},
          {type:"grid",column_span:2,cards:[{type:haHealthType,
            grid_options:{columns:"full",rows:"auto"}}]}
        ]
      };
      const i=scenarios?next.views.indexOf(scenarios)+1:next.views.length;
      next.views.splice(i,0,aiView);added+=4;
    }else if(aiView.sections){
      for(const type of [aiAutomationType,haHealthType]){
        if(!hasCard(aiView,c=>c.type===type)){
          aiView.sections.push({type:"grid",column_span:2,cards:[
            {type,grid_options:{columns:"full",rows:"auto"}}
          ]});
          added++;
        }
      }
    }
    // Raccourci vers l'IA depuis les scénarios manuels, sans déplacer
    // leurs cartes ni altérer l'éditeur Home Assistant.
    if(scenarios?.sections&&!hasCard(scenarios,c=>
       c.type==="button"&&c.name==="Automatisations IA KIMIA")){
      scenarios.sections.push({type:"grid",column_span:2,cards:[{
        type:"button",name:"Automatisations IA KIMIA",
        icon:"mdi:creation",show_name:true,show_icon:true,show_state:false,
        tap_action:{action:"navigate",navigation_path:"/kimia-admin-next/"+aiTabPath},
        grid_options:{columns:12,rows:2}
      }]});
      added++;
    }
    // Generateur Gemini : ajout non destructif dans la page Scenarios.
    const aiSettingsCard="custom:kimia-ai-scenes-settings-card";
    if(scenarios?.sections &&
       !hasCard(scenarios,c=>c.type===aiSettingsCard)){
      scenarios.sections.push({type:"grid",column_span:2,cards:[
        {type:aiSettingsCard,grid_options:{columns:"full",rows:"auto"}}
      ]});
      added++;
    }
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
        const [dashboards,areas,devices,entities,labels,config]=await Promise.all([
          getDashboards(hass),
          hass.callWS({type:"config/area_registry/list"}),
          hass.callWS({type:"config/device_registry/list"}),
          hass.callWS({type:"config/entity_registry/list"}),
          hass.callWS({type:"config/label_registry/list"}),
          hass.callWS({type:"lovelace/config",url_path:DASHBOARD})
        ]);
        if (!Array.isArray(dashboards) ||
            !dashboards.some(d => d.url_path === DASHBOARD && d.mode === "storage")) {
          throw new Error("Le dashboard KIMIA Nouvelle génération n'est pas créé en mode Interface.");
        }
        if (!Array.isArray(areas) || !Array.isArray(devices) ||
            !Array.isArray(entities) || !Array.isArray(labels) ||
            !config || !Array.isArray(config.views) ||
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
              !SUPPORTED.has(e.entity_id.split(".")[0]) ||
              !isClientEntity(e,hass)) continue;
          const area = getArea(e, mapDevices);
          if (!byArea.has(area)) continue;
          byArea.get(area).push(e);
        }
        for (const [, list] of byArea)
          list.sort((a, b) => natural(entityName(a, hass), entityName(b, hass)));

        const next=safeClone(config);
        const hasPump=devices.some(d=>plugUsage(d,labels)==="surpresseur") &&
          entities.some(e=>e.entity_id?.startsWith("switch.") &&
            plugUsage(devices.find(d=>d.id===e.device_id),labels)==="surpresseur");
        const water=ensureWaterView(next,hasPump);
        const vmap=new Map(next.views.map(v=>[v.path,v]));
        let added=water.added,removed=0,modified=water.modified;
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
        // Chaque section occupe toute la largeur; les lampes sont en Tile HA 6x1.
        const targets=["pieces",...CATEGORIES.map(x=>x[0]),
          ...(vmap.has("eau")?["eau"]:[])];
        const areaIds=new Set(orderedAreas.map(a=>a.area_id));
        const names=new Map(orderedAreas.map(a=>[a.area_id,a.name]));
        for(const path of targets) {
          const view=vmap.get(path);
          const desired=new Map(orderedAreas.map(area=>[
            area.area_id,(byArea.get(area.area_id)||[])
              .filter(e=>expectedDomain(path,e,hass,mapDevices,labels))
          ]));
          const kept=[];
          for(const section of view.sections || []) {
            const areaCard=managedRoom(section,path);
            if(!areaCard) { kept.push(section); continue; }
            const areaId=areaCard.type==="area"?areaCard.area:
              orderedAreas.find(a=>a.name===areaCard.heading)?.area_id;
            const alive=!!areaId&&areaIds.has(areaId);
            const entitiesWanted=new Set((desired.get(areaId)||[]).map(e=>e.entity_id));
            if(!alive) {
              // Pièce supprimée : retirer ses éléments standard uniquement.
              const before=section.cards.length;
              section.cards=section.cards.filter(c=>
                c!==areaCard && !isGeneratedTile(c) &&
                !isGeneratedRoomHeading(c) && !isSecurityRoomTitle(c));
              removed+=before-section.cards.length;
              if(section.cards.length)kept.push(section);
              continue;
            }
            // Les rubriques Lumières, Musique, etc., n'affichent pas de salle vide.
            if(path!=="pieces" && entitiesWanted.size===0) {
              const before=section.cards.length;
              section.cards=section.cards.filter(c=>
                c!==areaCard && !isGeneratedTile(c) &&
                !isGeneratedRoomHeading(c,names.get(areaId)) &&
                !isSecurityRoomTitle(c));
              removed+=before-section.cards.length;
              if(section.cards.length)kept.push(section);
              continue;
            }
            // Restaurer partout la même carte Area native, sans commandes.
            // Conserve la silhouette d'origine et remplace l'ancien titre Sécurité.
            const wantedArea=roomCard({area_id:areaId});
            if(JSON.stringify(areaCard)!==JSON.stringify(wantedArea)){
              section.cards[section.cards.indexOf(areaCard)]=wantedArea;
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
              !isGeneratedTile(c) || entitiesWanted.has(generatedEntity(c)));
            removed+=tileCount-section.cards.length;
            // Migrer seulement les cartes KIMIA intactes vers la taille adaptée.
            // Les tuiles personnalisées restent strictement inchangées.
            for(let i=0;i<section.cards.length;i++){
              const card=section.cards[i];
              const id=generatedEntity(card);
              if(!isGeneratedTile(card)||!entitiesWanted.has(id))continue;
              const registry=entities.find(e=>e.entity_id===id);
              if(!registry)continue;
              const use=plugUsage(mapDevices.get(registry.device_id),labels);
              const expected=safeTile(registry,path,use);
              if(JSON.stringify(card)!==JSON.stringify(expected)){
                section.cards[i]=expected;
                modified++;
              }
            }
            kept.push(section);
          }
          view.sections=kept;
          // Ajouts après nettoyage : pas de doublon, même après déplacement.
          const existing=new Set(allCards(view)
            .map(generatedEntity).filter(Boolean));
          for(const area of orderedAreas) {
            const selected=desired.get(area.area_id)||[];
            if(path!=="pieces" && !selected.length)continue;
            let section=sectionForRoom(view,area);
            if(!section) {
              section=createRoomSection(area,view);
              view.sections.push(section);
              added+=section.cards.length;
            }
            for(const e of selected) {
              if(existing.has(e.entity_id))continue;
              section.cards.push(safeTile(e,path,
                plugUsage(mapDevices.get(e.device_id),labels)));
              existing.add(e.entity_id);
              added++;
            }
          }
        }
        // Scènes IA : cartouche à gauche, vraie pile verticale Tile HA à droite.
        const lightsView=vmap.get("lumieres");
        const sceneList=Object.values(hass.states||{}).filter(st=>
          st.entity_id?.startsWith("scene.") &&
          /^kimia_ambiance_\d{2}$/.test(st.attributes?.id||""))
          .sort((a,b)=>String(a.attributes.id).localeCompare(String(b.attributes.id)))
          .slice(0,10);
        const sceneIcon=st=>{
          const title=String(st.attributes?.friendly_name||st.entity_id)
            .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
          const icons=[
            ["detente","mdi:weather-sunset"],["cinema","mdi:movie-open"],
            ["lecture","mdi:book-open-variant"],["romance","mdi:heart"],
            ["concentration","mdi:brain"],["soiree","mdi:party-popper"],
            ["nuit","mdi:weather-night"],["reveil","mdi:weather-sunset-up"],
            ["tropicale","mdi:palm-tree"],["douceur","mdi:weather-cloudy"]
          ];
          return icons.find(([name])=>title.includes(name))?.[1]||"mdi:palette";
        };
        const sceneTile=st=>({
          type:"tile",entity:st.entity_id,icon:sceneIcon(st),
          tap_action:{action:"perform-action",perform_action:"scene.turn_on",
            target:{entity_id:st.entity_id}},
          icon_tap_action:{action:"perform-action",perform_action:"scene.turn_on",
            target:{entity_id:st.entity_id}}
        });
        const sceneTiles=sceneList.map(sceneTile);
        // Sans area valide, le titre est un bouton natif non interactif.
        const sceneHeading=()=>({
          type:"button",name:"Scènes lumineuses",icon:"mdi:palette",
          show_name:true,show_icon:true,show_state:false,
          tap_action:{action:"none"},hold_action:{action:"none"},
          grid_options:{columns:12,rows:2}
        });
        const sceneSection=()=>({
          type:"grid",column_span:Math.min(Number(lightsView?.max_columns)||3,3),
          cards:[sceneHeading(),{type:"vertical-stack",cards:sceneTiles}]
        });
        const isSceneAction=card=>
          card?.type==="tile" && card.entity?.startsWith("scene.") &&
          card.tap_action?.perform_action==="scene.turn_on" &&
          card.tap_action?.target?.entity_id===card.entity &&
          card.icon_tap_action?.perform_action==="scene.turn_on" &&
          card.icon_tap_action?.target?.entity_id===card.entity;
        const legacyScenes=section=>section?.cards?.length===1 &&
          section.cards[0]?.type==="custom:kimia-ai-scenes-shortcuts-card";
        const generatedScenes=section=>section?.cards?.length===2 &&
          ((section.cards[0]?.type==="button" &&
              section.cards[0].name==="Scènes lumineuses") ||
           (section.cards[0]?.type==="vertical-stack" &&
              section.cards[0].cards?.[0]?.name==="Scènes lumineuses")) &&
          section.cards[1]?.cards?.every(isSceneAction);
        const manualScenes=section=>section?.cards?.length===2 &&
          section.cards[0]?.type==="area" &&
          /sc[eè]nes lumineus/i.test(section.cards[0].name||"") &&
          section.cards[1]?.type==="vertical-stack" &&
          section.cards[1].cards?.every(isSceneAction);
        // Réconcilie les scènes lorsque la liste change (suppression partielle
        // ou totale), tout en préservant les autres sections et cartes client.
        if(lightsView?.sections){
          const owned=lightsView.sections.filter(section=>
            legacyScenes(section)||generatedScenes(section)||manualScenes(section));
          const desired=sceneList.length?sceneSection():null;
          if(!desired){
            // Aucune scène KIMIA : le titre ET les boutons disparaissent.
            for(const section of owned){
              lightsView.sections.splice(lightsView.sections.indexOf(section),1);
              removed+=section.cards.length;
            }
          }else if(owned.length){
            // Remplace le faux "area" (qui provoquait l'erreur HA) par
            // un bouton natif inactif, avec l'icône palette centrée.
            const first=owned[0];
            if(JSON.stringify(first)!==JSON.stringify(desired)){
              if(first.cards.length===desired.cards.length)modified++;
              else{
                removed+=first.cards.length;added+=desired.cards.length;
              }
              lightsView.sections[lightsView.sections.indexOf(first)]=desired;
            }
            for(const duplicate of owned.slice(1)){
              lightsView.sections.splice(lightsView.sections.indexOf(duplicate),1);
              removed+=duplicate.cards.length;
            }
          }else{
            const lastRoom=lightsView.sections.reduce((n,sec,i)=>
              managedRoom(sec,"lumieres")?i:n,-1);
            const nav=lightsView.sections.findIndex(sec=>
              (sec.cards||[]).some(c=>c.type==="custom:navbar-card"));
            const at=lastRoom>=0?lastRoom+1:nav>=0?nav:lightsView.sections.length;
            lightsView.sections.splice(at,0,desired);added+=2;
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