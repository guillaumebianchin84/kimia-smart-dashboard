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
    "ha-card{display:block;border-radius:16px;padding:17px;background:var(--card-background-color);color:var(--primary-text-color)}",
    "h3{margin:0 0 7px;font-size:18px;font-weight:700}",
    "p{font-size:12px;line-height:1.5;color:var(--secondary-text-color)}",
    ".choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:15px}",
    ".theme{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;min-width:0;min-height:105px;padding:16px 12px;box-sizing:border-box;border:1px solid var(--divider-color);border-radius:15px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit;font-weight:650;font-size:14px;line-height:1.25;text-align:center;cursor:pointer;transition:border-color .12s ease,box-shadow .12s ease}",
    ".theme ha-icon{--mdc-icon-size:28px;width:28px;height:28px;color:var(--theme-accent)}",
    ".icon{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:color-mix(in srgb,var(--theme-accent) 17%,transparent)}",
    ".name{overflow-wrap:anywhere}",
    ".theme.selected{border:2px solid var(--theme-accent);padding:15px 11px;box-shadow:inset 0 0 0 1px var(--theme-accent)}",
    ".theme.selected .icon{background:color-mix(in srgb,var(--theme-accent) 24%,transparent)}",
    ".theme:focus-visible{outline:3px solid var(--theme-accent);outline-offset:2px}",
    ".theme:hover:not(:disabled){border-color:var(--theme-accent)}",
    ".theme:disabled{opacity:.45;cursor:not-allowed}",
    ".status{font-weight:600;margin-top:14px;min-height:18px}",
    "@media(max-width:370px){.choices{gap:8px}.theme{min-height:92px;padding:11px 6px;font-size:13px}.theme.selected{padding:10px 5px}}"
   ].join("\n");
   const card=document.createElement("ha-card");
   const title=document.createElement("h3");title.textContent="Mon thème sur cet appareil";
   const p=document.createElement("p");
   p.textContent="Choisissez votre ambiance KIMIA. Les autres appareils et comptes conservent leur affichage.";
   card.append(title,p);
   const choices=document.createElement("div");choices.className="choices";
   const current=this._hass?store.get(this._hass):"";
   const allowed=this._hass?.themes?.themes||{};
   const fallback=["","Thème HA par défaut","mdi:palette-outline","#607d8b"];
   for(const [value,label,icon,color] of [fallback,...OPTIONS]){
    const btn=document.createElement("button");
    btn.type="button";btn.className="theme"+(current===value?" selected":"");
    btn.style.setProperty("--theme-accent",color);
    btn.setAttribute("aria-pressed",String(current===value));
    btn.setAttribute("aria-label",label+(current===value?" (sélectionné)":""));
    btn.disabled=!this._hass || !!(value&&!allowed[value]);
    const visual=document.createElement("span");visual.className="icon";
    const glyph=document.createElement("ha-icon");
    glyph.setAttribute("icon",icon);
    visual.append(glyph);
    const text=document.createElement("span");
    text.className="name";text.textContent=label;
    btn.append(visual,text);
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
