/* KIMIA V1.6 correctif — thèmes exclusivement locaux au navigateur/appareil.
 * Aucun appel à frontend.set_theme ni écriture dans un profil HA ou helper global.
 * La CSS de la page est surchargée localement avec !important pour surclasser le
 * thème global HA, sans écrire dans la configuration serveur.
 */
(()=>{
 "use strict";
 const TAG="kimia-local-theme-v16-card";
 if(customElements.get(TAG))return;
 const OPTIONS=[
  ["KIMIA Gris Premium","Gris Premium","mdi:palette"],
  ["KIMIA Clair","Clair","mdi:weather-sunny"],
  ["KIMIA Sombre","Sombre","mdi:weather-night"],
  ["KIMIA Signature","Signature","mdi:home-heart"],
  ["KIMIA Vert Sauge","Vert Sauge","mdi:leaf"],
  ["KIMIA Violet Nuit","Violet Nuit","mdi:moon-waning-crescent"],
  ["KIMIA Sable Doré","Sable Doré","mdi:weather-sunny"],
  ["KIMIA Terracotta","Terracotta","mdi:fireplace"]
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
 class Card extends HTMLElement{
  constructor(){
   super();this.attachShadow({mode:"open"});this._hass=null;this._render();
  }
  setConfig(c){this._config=c||{};}
  set hass(hass){
   this._hass=hass;
   apply(hass);
   this._render();
  }
  getCardSize(){return 5;}
  _render(){
   const root=this.shadowRoot;
   const style=document.createElement("style");
   style.textContent=[
    "ha-card{display:block;border-radius:16px;padding:15px;background:var(--card-background-color)}",
    "h3{margin:0 0 7px;font-size:17px}",
    "p{font-size:12px;line-height:1.5;color:var(--secondary-text-color)}",
    ".choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:9px;margin-top:12px}",
    "button{min-height:54px;border:1px solid var(--divider-color);border-radius:12px;background:var(--secondary-background-color);color:var(--primary-text-color);font-weight:650;cursor:pointer;padding:9px}",
    "button.selected{border:2px solid var(--primary-color);background:var(--card-background-color)}",
    "button:disabled{opacity:.5}",
    ".status{font-weight:650;min-height:18px}"
   ].join("\n");
   const card=document.createElement("ha-card");
   const title=document.createElement("h3");title.textContent="Mon thème sur cet appareil";
   const p=document.createElement("p");
   p.textContent="Ce thème ne change que cet appareil et ce compte. Les autres navigateurs, utilisateurs et téléphones gardent leur propre affichage.";
   card.append(title,p);
   const choices=document.createElement("div");choices.className="choices";
   const current=this._hass?store.get(this._hass):"";
   const allowed=this._hass?.themes?.themes||{};
   for(const [value,label] of [["","Thème HA par défaut"],...OPTIONS]){
    const btn=document.createElement("button");btn.textContent=label;btn.type="button";
    btn.className=current===value?"selected":"";
    btn.setAttribute("aria-pressed",String(current===value));
    btn.disabled=!this._hass || !!(value&&!allowed[value]);
    btn.addEventListener("click",()=>{
     try{select(this._hass,value);this._message="Thème appliqué uniquement sur cet appareil.";}
     catch(e){this._message="Erreur : "+(e?.message||e);}
     this._render();
    });
    choices.append(btn);
   }
   card.append(choices);
   const msg=document.createElement("p");msg.className="status";
   msg.textContent=this._message||"Aucun changement n'est envoyé au serveur Home Assistant.";
   card.append(msg);root.replaceChildren(style,card);
  }
 }
 customElements.define(TAG,Card);
 window.customCards=window.customCards||[];
 if(!window.customCards.some(c=>c.type===TAG))
  window.customCards.push({type:TAG,name:"KIMIA · Thèmes locaux V1.6",
   description:"Personnalisation propre à cet appareil, sans automatisation ni thème global"});
})();
