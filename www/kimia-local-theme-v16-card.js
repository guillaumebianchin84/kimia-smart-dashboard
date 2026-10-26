/* KIMIA V1.6 correctif — thèmes exclusivement locaux au navigateur/appareil.
 * Aucun appel à frontend.set_theme ni écriture dans un profil HA ou helper global.
 * La CSS de la page est surchargée localement avec !important pour surclasser le
 * thème global HA, sans écrire dans la configuration serveur.
 */
(()=>{
 "use strict";
 const TAG="kimia-local-theme-v16-card";
 if(customElements.get(TAG))return;
 // Préserver les 8 cartes, couleurs et icônes de l'interface native V1.4.
 // Les teintes des accents sont visuelles et restent indépendantes du thème HA.
 const OPTIONS=[
  ["KIMIA Gris Premium","Gris Premium","mdi:palette","#15b8ad"],
  ["KIMIA Clair","Clair","mdi:weather-sunny","#00acc1"],
  ["KIMIA Sombre","Sombre","mdi:weather-night","#5c6bc0"],
  ["KIMIA Signature","Signature","mdi:home-heart","#42a5f5"],
  ["KIMIA Vert Sauge","Vert Sauge","mdi:leaf","#43a047"],
  ["KIMIA Violet Nuit","Violet Nuit","mdi:weather-night","#8e57d6"],
  ["KIMIA Sable Doré","Sable Doré","mdi:weather-sunny","#d49c20"],
  ["KIMIA Terracotta","Terracotta","mdi:fireplace","#ed6c32"]
 ];
 const PREFIX="kimia_theme_appareil_v16_";
 const key=hass=>PREFIX+String(hass?.user?.id||hass?.user?.name||"");
 const store={
  get(hass){try{return window.localStorage.getItem(key(hass))||"";}catch{return "";}},
  set(hass,value){window.localStorage.setItem(key(hass),value);}
 };
 let sheetStyle=null,lastHass=null,currentVars={};
 const addStyle=()=>{
  if(sheetStyle?.isConnected&&sheetStyle.sheet?.cssRules?.length)return sheetStyle;
  sheetStyle=document.createElement("style");
  sheetStyle.id="kimia-device-only-theme-v16";
  sheetStyle.textContent="html {}";
  (document.head||document.documentElement).appendChild(sheetStyle);
  return sheetStyle;
 };
 const rulesFor=(hass,name)=>{
  const t=hass?.themes?.themes?.[name];
  if(!t||typeof t!=="object")return null;
  const {modes,...base}=t;
  // Comme HA, un thème uniquement sombre doit utiliser sa variante sombre.
  const dark=modes?.dark && !modes?.light ? true:
   modes?.light && !modes?.dark ? false:
   typeof hass?.selectedTheme?.dark==="boolean"?hass.selectedTheme.dark:
   Boolean(hass?.themes?.darkMode);
  return {...base,...(modes?.[dark?"dark":"light"]||{})};
 };
 const clear=()=>{
  if(sheetStyle?.sheet?.cssRules?.length){
   const style=sheetStyle.sheet.cssRules[0].style;
   for(const key of Object.keys(currentVars))style.removeProperty("--"+key);
  }
  currentVars={};
 };
 const apply=(hass)=>{
  if(!hass?.user?.id&&!hass?.user?.name)return false;
  lastHass=hass;
  const name=store.get(hass);
  if(!name){clear();return true;}
  const vars=rulesFor(hass,name);
  if(!vars)return false; // Thèmes non chargés : ne pas effacer le choix stocké.
  const style=addStyle().sheet.cssRules[0].style;
  clear();
  for(const [k,value] of Object.entries(vars)){
   if(!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(k))continue;
   if(value==null || typeof value==="object")continue;
   style.setProperty("--"+k,String(value),"important");
   currentVars[k]=true;
   // Les versions récentes de HA attendent des dérivés rgb-* pour plusieurs composants.
   if(/^#[\da-fA-F]{6}$/.test(String(value))){
    const hex=String(value);
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(",");
    const rgbKey="rgb-"+k;
    if(!(rgbKey in vars)){style.setProperty("--"+rgbKey,rgb,"important");currentVars[rgbKey]=true;}
   }
  }
  return true;
 };
 const select=(hass,name)=>{
  if(name && !OPTIONS.some(x=>x[0]===name))throw Error("Thème KIMIA inconnu");
  if(name && !rulesFor(hass,name))throw Error("Ce thème n'est pas chargé dans Home Assistant");
  store.set(hass,name);
  if(!apply(hass))throw Error("Impossible d'appliquer ce thème sur cet appareil");
  window.dispatchEvent(new CustomEvent("kimia-device-theme-updated",{detail:{name}}));
 };
 // Les ressources JavaScript sont chargées avant les cartes, dans toutes les vues.
 // Restaurer le thème dès que le frontend a chargé le contexte HA.
 let remaining=60;
 const restore=()=>{
  const hass=document.querySelector("home-assistant")?.hass||lastHass;
  if(hass?.themes?.themes&&hass.user){
   apply(hass);return true;
  }
  return false;
 };
 const boot=()=>{
  if(restore())return;
  if(--remaining>0)setTimeout(boot,250);
 };
 setTimeout(boot,0);
 window.addEventListener("pageshow",restore);
 window.KimiaLocalThemeV16=Object.freeze({OPTIONS,key,get:store.get,apply,select,clear});
 // Garder le rendu officiel Home Assistant : pas de bouton HTML recréé.
 // Les cartes hui-button-card émettent "hass-action" ; KIMIA intercepte
 // exclusivement ce clic pour changer la préférence locale, jamais le serveur.
 let helperPromise=null;
 const helpers=()=>helperPromise||(helperPromise=Promise.resolve()
  .then(()=>{if(typeof window.loadCardHelpers!=="function")
    throw Error("Chargeur de cartes natives Home Assistant indisponible");
   return window.loadCardHelpers();
  }).catch(error=>{helperPromise=null;throw error;}));
 class Card extends HTMLElement{
  constructor(){
   super();
   this.attachShadow({mode:"open"});
   this._hass=null;
   this._renderToken=0;
   this._tiles=[];
   this._render();
  }
  setConfig(c){this._config=c||{};}
  set hass(hass){
   const oldUser=this._hass?.user?.id||this._hass?.user?.name;
   const newUser=hass?.user?.id||hass?.user?.name;
   const previousThemes=this._hass?.themes?.themes;
   this._hass=hass;
   apply(hass);
   // L'état HA change continuellement : garder les cartes en place pour
   // éviter de les détruire et recréer à chaque mise à jour d'appareil.
   if(oldUser!==newUser||(!this._tiles.length&&hass)||
     (!previousThemes&&hass?.themes?.themes))this._render();
   else for(const tile of this._tiles)tile.hass=hass;
  }
  getCardSize(){return 6;}
  _render(){
   const token=++this._renderToken;
   const root=this.shadowRoot;
   const style=document.createElement("style");
   style.textContent=[
    "ha-card{display:block;padding:16px;border-radius:16px;background:var(--card-background-color);color:var(--primary-text-color)}",
    "h3{margin:0 0 7px;font-size:18px;font-weight:700}",
    "p{font-size:12px;line-height:1.5;color:var(--secondary-text-color)}",
    ".choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}",
    ".choice{min-width:0;min-height:92px;border-radius:14px;position:relative}",
    ".choice hui-button-card{display:block;height:100%;min-height:92px}",
    ".choice.selected{outline:2px solid var(--primary-color);outline-offset:2px}",
    ".choice.disabled{opacity:.45;pointer-events:none}",
    ".status{font-weight:600;min-height:18px;margin-top:13px}",
    "@media(max-width:390px){.choices{gap:8px}.choice,.choice hui-button-card{min-height:82px}}"
   ].join("\n");
   const card=document.createElement("ha-card");
   const title=document.createElement("h3");
   title.textContent="Mes thèmes";
   const explanation=document.createElement("p");
   explanation.textContent="Choisissez votre ambiance. Elle s'applique uniquement sur cet appareil.";
   const choices=document.createElement("div");
   choices.className="choices";
   const msg=document.createElement("p");
   msg.className="status";msg.setAttribute("aria-live","polite");
   msg.textContent=this._message||"Chaque appareil conserve son propre thème.";
   card.append(title,explanation,choices,msg);
   root.replaceChildren(style,card);
   this._tiles=[];
   if(!this._hass)return;
   const current=store.get(this._hass);
   const allowed=this._hass?.themes?.themes||{};
   // Même ordre, mêmes couleurs HA, mêmes icônes que les boutons natifs V1.5.
   const colorByName={
    "KIMIA Gris Premium":"teal",
    "KIMIA Clair":"cyan",
    "KIMIA Sombre":"indigo",
    "KIMIA Signature":"blue",
    "KIMIA Vert Sauge":"green",
    "KIMIA Violet Nuit":"deep-purple",
    "KIMIA Sable Doré":"amber",
    "KIMIA Terracotta":"deep-orange"
   };
   const options=[["","Thème HA par défaut","mdi:palette-outline"],...OPTIONS];
   void helpers().then(helper=>{
    if(token!==this._renderToken)return;
    if(!helper?.createCardElement)throw Error("Création des cartes HA indisponible");
    for(const [value,label,icon] of options){
     const wrapper=document.createElement("div");
     const enabled=!value||Boolean(allowed[value]);
     wrapper.className="choice"+(current===value?" selected":"")+(enabled?"":" disabled");
     const tile=helper.createCardElement({
      type:"button",name:label,icon,show_icon:true,show_name:true,
      color:colorByName[value]||"teal",
      tap_action:{action:"fire-dom-event"},
      hold_action:{action:"none"},
      double_tap_action:{action:"none"}
     });
     // L'événement natif est émis par hui-button-card, avec action "tap".
     // Il est intercepté AVANT Home Assistant : aucun appel de service global.
     tile.addEventListener("hass-action",event=>{
      event.stopPropagation();
      event.preventDefault();
      if(event.detail?.action!=="tap"||!enabled||!this._hass)return;
      try{
       select(this._hass,value);
       this._message="Thème appliqué uniquement sur cet appareil.";
      }catch(error){
       this._message="Erreur : "+(error?.message||error);
      }
      this._render();
     });
     tile.hass=this._hass;
     wrapper.append(tile);
     choices.append(wrapper);
     this._tiles.push(tile);
    }
   }).catch(error=>{
    if(token!==this._renderToken)return;
    msg.textContent="Impossible d'afficher les cartes natives : "+(error?.message||error)+
     ". Vérifiez le chargement des ressources Home Assistant.";
   });
  }
 }
 customElements.define(TAG,Card);
 window.customCards=window.customCards||[];
 if(!window.customCards.some(c=>c.type===TAG))
  window.customCards.push({type:TAG,name:"KIMIA · Thèmes locaux V1.6",
   description:"Personnalisation propre à cet appareil, sans automatisation ni thème global"});
})();
