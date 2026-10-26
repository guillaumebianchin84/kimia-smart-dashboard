/* KIMIA Routines V3 — application autonome, approche Quand / Si / Alors.
 * Ne modifie aucun dashboard ni aucun module historique KIMIA.
 * Les routines sont de vrais scripts / automations Home Assistant.
 * Les routines inconnues/complexes restent éditées nativement dans HA.
 * Dépend du moteur de sérialisation conservateur V1.6, chargé avant cette carte.
 */
(()=>{
"use strict";
const TAG="kimia-routines-v3-card";
if(customElements.get(TAG))return;
const engine=()=>window.KimiaRoutineEngineV16;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cp=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==="object"&&!Array.isArray(v)?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const categories=[
 ["light","Lumières","mdi:lightbulb-group-outline"],
 ["cover","Volets et stores","mdi:window-shutter"],
 ["switch","Prises et appareils","mdi:power-socket-eu"],
 ["climate","Chauffage et clim","mdi:thermostat"],
 ["fan","Ventilation","mdi:fan"],
 ["media_player","Musique et TV","mdi:television-play"],
 ["scene","Scènes","mdi:palette-outline"],
 ["script","Autres scénarios","mdi:play-box-multiple-outline"],
 ["input_boolean","Options avancées","mdi:toggle-switch-outline"]
];
const familyName=id=>categories.find(c=>c[0]===id)?.[1]||id;
const familyIcon=id=>categories.find(c=>c[0]===id)?.[2]||"mdi:flash-outline";
const modeName={single:"Ignorer les nouvelles demandes",restart:"Recommencer",queued:"Attendre son tour",parallel:"Exécuter en parallèle"};
const icon=x=>'<ha-icon icon="'+esc(x)+'"></ha-icon>';
const mkButton=(txt,action,cl="",attrs="")=>'<button type="button" class="km-btn '+cl+'" data-do="'+action+'" '+attrs+'>'+txt+'</button>';
const opt=(value,label,selected)=>'<option value="'+esc(value)+'"'+(String(value)===String(selected)?" selected":"")+'>'+esc(label)+'</option>';
const nativeUrl=(kind,id)=>id?"/config/"+kind+"/edit/"+encodeURIComponent(id):
 "/config/"+kind+"/dashboard";
const internalAutomation=(r)=>{
 if(r.kind!=="automation")return false;
 return /^(KIMIA\s*[-·:]\s*)?(Appliquer le th[eè]me client|Initialiser le bouton Pi[eè]ces une seule fois|Initialiser les onglets visibles une seule fois)$/i.test(r.name) ||
  /^(kimia_)?(appliquer_le_theme_client|initialiser_le_bouton_pieces_une_seule_fois|initialiser_les_onglets_visibles_une_seule_fois)$/.test(r.id.split(".")[1]||"");
};
function listRoutines(states){
 const all=[];
 for(const [entityId,s] of Object.entries(states||{})){
  const kind=entityId.startsWith("script.")?"script":entityId.startsWith("automation.")?"automation":null;
  if(!kind)continue;
  const fallback=entityId.split(".")[1];
  const name=String(s?.attributes?.friendly_name||entityId),rawId=kind==="script"?fallback:String(s?.attributes?.id||fallback);
  all.push({entityId,kind,name,id:rawId,state:String(s?.state||"unknown"),
   last:s?.attributes?.last_triggered||null,internal:false});
 }
 for(const r of all)r.internal=internalAutomation(r);
 return all.sort((a,b)=>a.name.localeCompare(b.name,"fr"));
}
function availableEntities(states,registry,deviceRegistry,areas,domain,includeTechnical=false){
 const ent=new Map((registry||[]).map(r=>[r.entity_id,r]));
 const dev=new Map((deviceRegistry||[]).map(d=>[d.id,d]));
 const zone=new Map((areas||[]).map(a=>[a.area_id,a.name]));
 return Object.entries(states||{}).filter(([id,s])=>{
  const dom=id.split(".")[0];
  if(domain&&dom!==domain)return false;
  if(!includeTechnical&&["input_boolean","input_number","input_text","button","number","select","update"].includes(dom))return false;
  if(!includeTechnical&&/^(script|automation)\.kimia_/.test(id))return false;
  if(s?.state==="unavailable"||s?.state==="unknown")return false;
  return true;
 }).map(([id,s])=>{
  const info=ent.get(id),area=info?.area_id||dev.get(info?.device_id)?.area_id||"";
  return {id,domain:id.split(".")[0],area,areaName:zone.get(area)||"Autres équipements",
   label:String(s?.attributes?.friendly_name||id),state:String(s?.state??"")};
 }).sort((a,b)=>a.areaName.localeCompare(b.areaName,"fr")||a.label.localeCompare(b.label,"fr"));
}
function guardSimple(d){
 const basicActions=["call","delay"];
 const basicTriggers=["time","sun","state","numeric_state"];
 const basicConditions=["time","sun","state","numeric_state"];
 const seen=new Set();
 for(const x of d.actions||[]){
  if(!basicActions.includes(x.type))return false;
  if(x.type==="call"){if(seen.has(x.entity))return false;seen.add(x.entity);}
 }
 return (d.triggers||[]).every(x=>basicTriggers.includes(x.type))&&
  (d.conditions||[]).every(x=>basicConditions.includes(x.type));
}
const CSS=[
 ":host{display:block;color:var(--primary-text-color)}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.48;cursor:not-allowed}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid var(--primary-color,#06a6a1);outline-offset:3px}",
 "ha-card{display:block;border:1px solid var(--divider-color,#e3e8ea);border-radius:22px;overflow:hidden;background:var(--card-background-color,#fff);box-shadow:0 12px 35px rgba(10,40,48,.075)}",
 ".km-head{background:linear-gradient(119deg,#12364b,#14556a 55%,#0d7772);padding:24px 26px;color:#fff}.km-over{color:#a3e9dd;font-size:11px;letter-spacing:1.7px;font-weight:850;display:flex;align-items:center;gap:7px}.km-over ha-icon{--mdc-icon-size:18px}.km-head h2{margin:9px 0 7px;font-size:clamp(23px,3vw,31px);letter-spacing:-.6px;line-height:1.14}.km-head p{margin:0;color:#daebed;font-size:13px;line-height:1.5}.km-body{padding:20px 22px}.km-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}",
 ".km-btn{background:var(--secondary-background-color,#f3f7f8);border:1px solid var(--divider-color,#dce3e6);border-radius:11px;color:var(--primary-text-color);padding:10px 13px;min-height:40px;display:inline-flex;justify-content:center;align-items:center;gap:7px;font-size:13px;font-weight:750;text-decoration:none;line-height:1.2}.km-btn ha-icon{--mdc-icon-size:19px}.km-btn.main{color:#fff;background:linear-gradient(112deg,#0ba397,#0983a4);border-color:#0b9b99}.km-btn.flat{background:transparent}.km-btn.small{min-height:33px;font-size:12px;padding:7px 9px}.km-btn.warn{color:var(--error-color,#c63d36)}.km-btn.light{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:#fff}",
 ".km-choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:22px}.km-start{background:var(--card-background-color);border:1px solid var(--divider-color,#dce3e7);border-radius:17px;padding:20px;text-align:left;display:flex;align-items:center;gap:13px;min-height:111px}.km-start:hover{border-color:var(--primary-color,#169f9a)}.km-picto{background:color-mix(in srgb,var(--primary-color,#0f9a9b) 12%,var(--card-background-color));color:var(--primary-color,#078e92);width:46px;height:46px;border-radius:12px;flex-shrink:0;display:grid;place-items:center}.km-picto ha-icon{--mdc-icon-size:26px}.km-start b{display:block;font-size:15px}.km-start small{display:block;font-size:12px;line-height:1.45;color:var(--secondary-text-color);margin-top:5px}",
 ".km-section-label{font-weight:850;font-size:15px;display:flex;align-items:center;gap:8px;margin:17px 0 12px}.km-section-label ha-icon{color:var(--primary-color);--mdc-icon-size:20px}.km-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:13px}.km-filter{border:1px solid var(--divider-color,#d9e3e6);padding:7px 12px;border-radius:999px;color:var(--secondary-text-color);background:transparent;font-weight:730;font-size:12px}.km-filter.active{color:var(--primary-text-color);background:var(--secondary-background-color);border-color:var(--primary-color)}.km-input{background:var(--card-background-color,#fff);color:var(--primary-text-color);border:1px solid var(--divider-color,#dbe3e5);border-radius:10px;padding:11px;min-height:42px;width:100%;min-width:0}.km-row{display:flex;gap:10px;align-items:center}.km-row.wrap{flex-wrap:wrap}.km-search{flex:1;min-width:170px}",
 ".km-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.km-routine{border:1px solid var(--divider-color,#e1e6e9);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:11px;min-width:0}.km-rtitle{display:flex;gap:10px;align-items:center;min-width:0}.km-rtitle b{display:block;line-height:1.25;overflow-wrap:anywhere;font-size:14px}.km-note{font-size:12px;line-height:1.45;color:var(--secondary-text-color)}.km-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:760;border:1px solid var(--divider-color,#dde5e8);border-radius:50px;padding:4px 8px;width:max-content}.km-dot{width:7px;height:7px;border-radius:100%;background:#18a477}.km-dot.off{background:#d3a14a}.km-rbuttons{display:flex;gap:7px}.km-rbuttons .km-btn{flex:1}",
 ".km-main{max-width:1000px;margin:auto}.km-editor-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.km-title{font-size:21px;letter-spacing:-.5px;margin:6px 0}.km-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:740;color:var(--secondary-text-color);min-width:0}.km-field input,.km-field select{color:var(--primary-text-color);font-weight:500}.km-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}.km-stack{display:grid;gap:12px;margin:20px 0}",
 ".km-panel{border:1px solid var(--divider-color,#dce4e7);border-radius:16px;overflow:hidden}.km-panel-head{padding:13px 16px;display:flex;align-items:center;gap:11px;background:var(--secondary-background-color,#f5f9f9)}.km-bullet{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--primary-color,#079d9b) 13%,var(--card-background-color));color:var(--primary-color,#0e9e9a)}.km-bullet ha-icon{--mdc-icon-size:20px}.km-panel-head b{display:block;font-size:15px}.km-panel-head small{font-size:11px;color:var(--secondary-text-color);display:block;margin-top:2px}.km-panel-content{padding:13px 15px}.km-empty{padding:8px 0 12px;font-size:12px;color:var(--secondary-text-color);line-height:1.5}.km-line{border:1px solid var(--divider-color,#e0e7e8);border-radius:11px;padding:10px 11px;display:flex;align-items:center;gap:9px;min-width:0;margin-bottom:8px}.km-line .km-ltext{flex:1;min-width:0;font-size:13px;font-weight:710;overflow-wrap:anywhere}.km-line .km-ltext small{display:block;color:var(--secondary-text-color);font-size:11px;font-weight:500;margin-top:2px}.km-line ha-icon{color:var(--primary-color)}",
 ".km-tool{border:1px solid var(--divider-color,#dce5e7);background:var(--secondary-background-color,#f7f9f9);padding:14px;border-radius:12px;margin:9px 0 11px}.km-tool-head{font-size:14px;font-weight:800;margin-bottom:10px}.km-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.km-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:13px 8px;min-height:84px;background:var(--card-background-color);border:1px solid var(--divider-color,#d7e0e3);border-radius:11px;font-weight:720;color:var(--primary-text-color);font-size:12px;text-align:center}.km-tile:hover{border-color:var(--primary-color)}.km-tile ha-icon{--mdc-icon-size:24px;color:var(--primary-color)}.km-tile.selected{border:2px solid var(--primary-color)}.km-divider{height:1px;background:var(--divider-color);margin:12px 0}.km-action-picker{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px;margin:10px 0}.km-selection{max-height:210px;overflow:auto;border:1px solid var(--divider-color);border-radius:11px;background:var(--card-background-color);padding:6px}.km-device{display:block;text-align:left;border:0;background:transparent;color:var(--primary-text-color);border-radius:8px;padding:10px;width:100%;font-size:12px;font-weight:740}.km-device.selected{background:color-mix(in srgb,var(--primary-color) 12%,var(--card-background-color));color:var(--primary-text-color)}.km-device:hover{background:var(--secondary-background-color)}.km-device small{display:block;color:var(--secondary-text-color);font-weight:400;margin-top:3px}.km-formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
 ".km-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--divider-color);padding-top:17px;margin-top:16px}.km-message{border-radius:11px;border:1px solid var(--primary-color);padding:11px 13px;font-size:12px;font-weight:650;line-height:1.5;margin-bottom:13px;white-space:pre-wrap}.km-message.error{border-color:var(--error-color,#c53b3b);color:var(--error-color,#c53b3b)}.km-muted{font-size:12px;color:var(--secondary-text-color);line-height:1.5}.km-summary{border-radius:12px;padding:12px;background:var(--secondary-background-color);font-size:12px;line-height:1.6;margin-top:13px}.km-empty-list{padding:25px;border:1px dashed var(--divider-color);border-radius:13px;text-align:center;grid-column:1/-1;color:var(--secondary-text-color);font-size:13px}",
 "@media(max-width:740px){.km-head{padding:19px}.km-body{padding:13px}.km-choice,.km-list,.km-fields,.km-action-picker,.km-formgrid{grid-template-columns:1fr}.km-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.km-panel-content{padding:11px}.km-line{flex-wrap:wrap}.km-rbuttons .km-btn{flex:1}.km-btn{padding:9px}.km-start{min-height:90px;padding:14px}.km-editor-top{align-items:flex-start}}"
].join("\n");
class Card extends HTMLElement{
 constructor(){
  super();this.attachShadow({mode:"open"});
  this._hass=null;this._ready=false;this._registry={areas:[],entities:[],devices:[]};
  this._page="home";this._filter="all";this._query="";this._draft=null;this._editing=null;
  this._drawer=null;this._entry=null;this._busy=false;this._notice="";this._error=false;
  this._experimental=false;this._triggerOptions=false;this._conditionsVisible=false;
  this._lastDigest="";
  this.shadowRoot.addEventListener("click",ev=>this._click(ev));
  this.shadowRoot.addEventListener("input",ev=>this._input(ev));
  this.shadowRoot.addEventListener("change",ev=>this._change(ev));
  this._render();
 }
 setConfig(c){this._config=c||{};}
 getCardSize(){return 12;}
 getGridOptions(){return {columns:12,rows:9};}
 get hass(){return this._hass;}
 set hass(h){
  const oldId=this._hass?.user?.id;
  this._hass=h;
  if(oldId!==h?.user?.id){
   this._ready=false;this._registry={areas:[],entities:[],devices:[]};
   this._page="home";this._draft=null;this._editing=null;
  }
  if(h?.user?.is_admin&&!this._ready){this._ready=true;void this._loadRegistry();}
  if(this._page==="home"){
   const digest=JSON.stringify(listRoutines(h?.states).map(x=>[x.entityId,x.name,x.state,x.internal]));
   if(this._lastDigest!==digest||oldId!==h?.user?.id){this._lastDigest=digest;this._render();}
  }
 }
 _admin(){return this._hass?.user?.is_admin===true;}
 _list(){return listRoutines(this._hass?.states).filter(r=>!r.internal);}
 _allEntities(domain=null,advanced=this._experimental){
  return availableEntities(this._hass?.states,this._registry.entities,this._registry.devices,
   this._registry.areas,domain,advanced);
 }
 async _loadRegistry(){
  const h=this._hass;
  try{
   const rs=await Promise.allSettled([
    h.callWS({type:"config/area_registry/list"}),
    h.callWS({type:"config/entity_registry/list"}),
    h.callWS({type:"config/device_registry/list"})]);
   if(h!==this._hass)return;
   this._registry={areas:rs[0].status==="fulfilled"?rs[0].value:[],
    entities:rs[1].status==="fulfilled"?rs[1].value:[],
    devices:rs[2].status==="fulfilled"?rs[2].value:[]};
   if(this._page==="edit")this._render();
  }catch(err){this._message("Impossible de lire certaines pièces : "+(err?.message||err),true);}
 }
 _btn(text,doIt,variant="",args=""){return mkButton(text,doIt,variant,args+(this._busy?' disabled':""));}
 _message(text,err=false){this._notice=text;this._error=err;this._render();}
 _alert(){return this._notice?'<div role="status" class="km-message'+(this._error?" error":"")+'">'+esc(this._notice)+'</div>':"";}
 _native(kind,id){
  const dest=nativeUrl(kind,id);
  return '<a class="km-btn flat small" href="'+esc(dest)+'" title="Utiliser toutes les fonctionnalités Home Assistant">'+icon("mdi:open-in-new")+' Éditeur HA</a>';
 }
 _render(){
  const notReady=!this._hass,denied=!this._admin(),missing=!engine();
  const body=notReady?'<div class="km-body">Chargement des routines…</div>':
   denied?'<div class="km-body"><div class="km-empty-list">La création et la modification des routines nécessitent un compte administrateur Home Assistant.</div></div>':
   missing?'<div class="km-body"><div class="km-message error">Charge d’abord la ressource JavaScript kimia-routine-engine-v16.js.</div></div>':
   this._page==="home"?this._home():this._editor();
  this.shadowRoot.innerHTML='<style>'+CSS+'</style><ha-card>'+
    '<div class="km-head"><div class="km-over">'+icon("mdi:creation")+' KIMIA SMART · MA MAISON</div>'+
    '<h2>'+(this._page==="home"?"Mes routines":"Créer et modifier une routine")+'</h2>'+
    '<p>'+(this._page==="home"?"Des gestes simples pour automatiser la maison. Le reste, Home Assistant sait le faire.":"Tu décides de ce qui se passe. Pas de jargon, pas de configuration en cinq pages.")+'</p></div>'+
    body+'</ha-card>';
 }
 _home(){
  const rec=this._list();
  const shown=rec.filter(x=>(this._filter==="all"||x.kind===this._filter)&&
   (!this._query||x.name.toLowerCase().includes(this._query.toLowerCase())));
  return '<div class="km-body"><div class="km-choice">'+
   '<button class="km-start" type="button" data-do="create" data-kind="script"><span class="km-picto">'+icon("mdi:gesture-tap")+'</span>'+
    '<span><b>Créer un scénario</b><small>Un bouton pour faire plusieurs actions. Bonne nuit, Départ, Retour…</small></span></button>'+
   '<button class="km-start" type="button" data-do="create" data-kind="automation"><span class="km-picto">'+icon("mdi:auto-mode")+'</span>'+
    '<span><b>Créer une automatisation</b><small>La maison agit seule à une heure ou lors d’un événement.</small></span></button></div>'+
   this._alert()+
   '<div class="km-top"><div class="km-section-label" style="margin:0">'+icon("mdi:home-automation")+
   ' Mes scénarios et automatisations <span class="km-chip">'+rec.length+'</span></div>'+
   this._native("automation",null)+'</div>'+
   '<div class="km-filters">'+[["all","Tout voir"],["script","Scénarios"],["automation","Automatisations"]].map(([k,t])=>
    '<button type="button" class="km-filter'+(this._filter===k?" active":"")+'" data-do="filter" data-value="'+k+'">'+t+'</button>').join("")+'</div>'+
   '<div class="km-row wrap" style="margin-bottom:13px"><input class="km-input km-search" id="kimia-search" placeholder="Rechercher une routine…" aria-label="Rechercher une routine" value="'+esc(this._query)+'"/>'+
   this._btn(icon("mdi:refresh")+" Actualiser","refresh","small")+'</div>'+
   '<div class="km-list" id="kimia-results">'+this._routineTiles(shown)+'</div>'+
   '<p class="km-muted" style="margin-top:15px">Les automatisations de maintenance KIMIA sont masquées ici, jamais désactivées ni supprimées. Tu peux toujours les retrouver dans Home Assistant.</p></div>';
 }
 _routineTiles(items){
  if(!items.length)return '<div class="km-empty-list">Aucune routine trouvée. Tu peux en créer une juste au-dessus.</div>';
  return items.map(r=>'<div class="km-routine"><div class="km-rtitle"><span class="km-picto">'+
   icon(r.kind==="script"?"mdi:play-circle-outline":"mdi:robot-outline")+'</span><div style="min-width:0"><b>'+esc(r.name)+'</b>'+
   '<span class="km-note">'+(r.kind==="script"?"Scénario manuel":"Automatisation")+'</span></div></div>'+
   '<span class="km-chip"><span class="km-dot'+(r.kind==="automation"&&r.state!=="on"?" off":"")+'"></span>'+
   (r.kind==="script"?"À lancer":r.state==="on"?"Active":r.state==="off"?"Désactivée":"État inconnu")+'</span>'+
   '<div class="km-rbuttons">'+
   (r.kind==="script"?this._btn(icon("mdi:play")+" Lancer","run","main small",'data-id="'+esc(r.entityId)+'"'):
    this._btn(icon(r.state==="on"?"mdi:pause-circle-outline":"mdi:power")+(r.state==="on"?" Désactiver":" Activer"),"toggle","small",'data-id="'+esc(r.entityId)+'"'+(["on","off"].includes(r.state)?"":" disabled")))+
   this._btn(icon("mdi:pencil-outline")+" Modifier","load","small",'data-id="'+esc(r.entityId)+'"')+'</div></div>').join("");
 }
 _new(kind){
  const h=engine();this._draft=h.create(kind);this._editing=null;
  this._page="edit";this._drawer=null;this._entry=null;this._experimental=false;
  this._conditionsVisible=false;this._triggerOptions=false;this._notice="";
  this._render();
 }
 _editor(){
  const d=this._draft;if(!d)return '<div class="km-body">Aucune routine sélectionnée.</div>';
  const auto=d.kind==="automation";
  return '<div class="km-body km-main">'+this._alert()+
   '<div class="km-editor-top">'+this._btn(icon("mdi:arrow-left")+" Mes routines","back","flat small")+
    this._native(d.kind,this._editing?.id)+'</div>'+
   '<div class="km-fields" style="margin-top:16px"><label class="km-field">Nom de la routine'+
   '<input class="km-input" id="routine-title" type="text" maxlength="70" placeholder="'+(auto?"Ex. Lumière du soir":"Ex. Bonne nuit")+'" value="'+esc(d.alias)+'"/></label>'+
   '<label class="km-field">Description (facultatif)<input class="km-input" id="routine-desc" type="text" maxlength="240" placeholder="À quoi sert cette routine ?" value="'+esc(d.description)+'"/></label></div>'+
   '<div class="km-stack">'+
    (auto?this._section("trigger",icon("mdi:clock-outline"),"QUAND…","Qu’est-ce qui déclenche la routine ?",d.triggers,"Ajouter un déclencheur"):"")+
    this._section("condition",icon("mdi:filter-outline"),"SI…","Seulement si ces conditions sont vraies (facultatif)",d.conditions,"Ajouter une condition")+
    this._section("action",icon("mdi:flash-outline"),auto?"ALORS…":"ACTIONS…","Ce que KIMIA doit faire, dans cet ordre",d.actions,"Ajouter une action")+
   '</div><div class="km-summary">'+
    '<b>'+esc(d.alias||"Ma nouvelle routine")+'</b> · '+(auto?"Automatique":"Manuel")+"<br/>"+
    (auto?d.triggers.length+" déclencheur(s), ":"")+d.conditions.length+" condition(s), "+d.actions.length+" action(s)."+
    '<br/><span class="km-muted">Enregistrer ne lance jamais les équipements.</span></div>'+
   '<div class="km-foot"><div class="km-row wrap">'+this._btn(icon("mdi:arrow-left")+" Annuler","back","flat")+
    this._btn(icon("mdi:tune-variant")+" Paramètres avancés","expert","flat small")+'</div>'+
   this._btn(icon("mdi:content-save-check-outline")+(this._editing?" Enregistrer les modifications":" Créer la routine"),"save","main")+
   '</div>'+(this._experimental?this._expert(): "")+'</div>';
 }
 _section(type,ico,title,subtitle,steps,addText){
  let content=steps.length?steps.map((s,i)=>this._line(type,s,i)).join(""):
   '<div class="km-empty">'+(type==="trigger"?"Clique sur Ajouter pour choisir une heure, un capteur ou un événement.":
     type==="condition"?"Pas obligatoire : la routine fonctionnera sans condition.":"Choisis ce que ta maison doit faire.")+'</div>';
  return '<section class="km-panel"><div class="km-panel-head"><span class="km-bullet">'+ico+'</span>'+
   '<div style="flex:1"><b>'+title+'</b><small>'+subtitle+'</small></div><span class="km-chip">'+steps.length+'</span></div>'+
   '<div class="km-panel-content">'+content+
   (this._drawer===type?this._picker(type):this._btn(icon("mdi:plus-circle-outline")+" "+addText,"open","flat",'data-type="'+type+'"'))+
   '</div></section>';
 }
 _stepLabel(type,x){
  if(type==="action"){
   if(x.type==="delay")return "Attendre "+(x.seconds||0)+" secondes";
   if(x.type!=="call")return "Action avancée";
   const ent=this._allEntities(null,true).find(r=>r.id===x.entity);
   const fn=engine().OPERATIONS[x.entity?.split(".")[0]]?.find(o=>o[0]===x.operation)?.[1]||x.operation;
   let val=x.value!==""&&x.value!==undefined?" ("+x.value+")":"";
   return fn+" · "+(ent?.label||x.entity)+val;
  }
  if(x.type==="time")return type==="trigger"?"À "+(x.at||"l’heure choisie"):
   "Dans la plage "+(x.after||"")+" – "+(x.before||"");
  if(x.type==="sun")return type==="trigger"?(x.event==="sunrise"?"Au lever":"Au coucher")+" du soleil":
   "Selon le lever/coucher du soleil";
  const ent=this._allEntities(null,true).find(r=>r.id===x.entity);
  return (ent?.label||x.entity||"Capteur")+(x.type==="numeric_state"?
   " · Seuil "+(x.above!==""?"> "+x.above:"")+(x.below!==""?" < "+x.below:""):
   " · "+(type==="trigger"?(x.to||"changement"):(x.state||"état")));
 }
 _line(type,x,i){
  const arr=type==="trigger"?this._draft.triggers:type==="condition"?this._draft.conditions:this._draft.actions;
  return '<div class="km-line"><span class="km-bullet">'+icon(type==="action"&&x.type==="delay"?"mdi:timer-outline":type==="action"?"mdi:check-circle-outline":type==="trigger"?"mdi:clock-check-outline":"mdi:check-outline")+'</span>'+
   '<span class="km-ltext">'+esc(this._stepLabel(type,x))+'</span>'+
   '<div class="km-row">'+
    (type==="action"?this._btn(icon("mdi:arrow-up"),"up","flat small",'aria-label="Monter l’action" data-type="'+type+'" data-index="'+i+'"'+(i===0?" disabled":""))+
      this._btn(icon("mdi:arrow-down"),"down","flat small",'aria-label="Descendre l’action" data-type="'+type+'" data-index="'+i+'"'+(i===arr.length-1?" disabled":"")):"")+
    this._btn(icon("mdi:pencil"),"edit","flat small",'aria-label="Modifier" data-type="'+type+'" data-index="'+i+'"')+
    this._btn(icon("mdi:close"),"remove","flat small",'aria-label="Supprimer" data-type="'+type+'" data-index="'+i+'"')+
   '</div></div>';
 }
 _makeEntry(type,index){
  const d=this._draft,arr=type==="action"?d.actions:type==="condition"?d.conditions:d.triggers;
  return Number.isInteger(index)?cp(arr[index]):null;
 }
 _open(type,index=null){
  this._drawer=type;this._idx=index;this._entry=this._makeEntry(type,index);
  if(!this._entry){this._entry=type==="action"?null:type==="condition"?null:null;}
  this._pickerCat="";this._pickArea="*";this._pickEntity="";this._pickSearch="";this._render();
 }
 _picker(type){
  if(type==="action")return this._actionPicker();
  return this._logicPicker(type);
 }
 _actionPicker(){
  const item=this._entry;
  const h=engine();
  if(item?.type==="delay")return '<div class="km-tool"><div class="km-tool-head">Attendre avant l’action suivante</div>'+
   '<label class="km-field">Durée (secondes)<input class="km-input" type="number" min="1" max="86400" id="pick-delay" value="'+esc(item.seconds)+'"/></label>'+this._pickerFooter("action")+'</div>';
  const domain=this._pickerCat||(item?.type==="call"?item.entity?.split(".")[0]:"");
  const categoriesShown=categories.filter(c=>["light","cover","switch","climate","fan","media_player"].includes(c[0])||
   this._experimental&&["scene","script","input_boolean"].includes(c[0]));
  const tiles='<div class="km-tiles">'+categoriesShown.map(([dom,title,ico])=>
   '<button class="km-tile'+(domain===dom?" selected":"")+'" type="button" data-do="category" data-domain="'+dom+'">'+icon(ico)+esc(title)+'</button>').join("")+
   this._btn(icon("mdi:timer-outline")+" Attendre","delay-category","km-tile")+'</div>';
  let settings="";
  if(domain){
   const all=this._allEntities(domain);
   const id=this._pickEntity||(item?.type==="call"?item.entity:"");
   const regAreas=new Set(all.map(x=>x.area));
   const roomSelect='<label class="km-field">Pièce<select class="km-input" id="pick-area">'+
    opt("*","Toutes les pièces",this._pickArea)+
    [...regAreas].sort((a,b)=>String(a).localeCompare(String(b))).map(area=>opt(area,
     all.find(x=>x.area===area)?.areaName||"Autres équipements",this._pickArea)).join("")+'</select></label>';
   const entries=all.filter(x=>(this._pickArea==="*"||x.area===this._pickArea)&&
    (x.label.toLowerCase().includes(this._pickSearch.toLowerCase())||x.id.includes(this._pickSearch.toLowerCase())));
   const rows='<div class="km-selection" id="pick-entities">'+
    (entries.length?entries.map(x=>'<button class="km-device'+(id===x.id?" selected":"")+'" type="button" data-do="select-entity" data-id="'+esc(x.id)+'">'+esc(x.label)+
      '<small>'+esc(x.areaName)+'</small></button>').join(""):'<div class="km-empty">Aucun équipement ici. Essaie une autre pièce.</div>')+'</div>';
   const opSelected=this._pickOp||(item?.type==="call"?item.operation:"");
   const opts=h.OPERATIONS[domain]||[];
   const operation=opSelected||opts[0]?.[0]||"";
   const opSelect='<label class="km-field">Que doit-il faire ?<select class="km-input" id="pick-operation">'+
    opts.map(([v,label])=>opt(v,label,operation)).join("")+'</select></label>';
   let value="";
   if(["set_temperature","set_cover_position","volume_set"].includes(operation)){
    const n=this._pickValue??(item?.type==="call"?item.value:"");
    const spec=operation==="set_temperature"?["Température (°C)","5","40","0.5","20"]:
     operation==="set_cover_position"?["Position (%)","0","100","1","50"]:["Volume (0–1)","0","1","0.05","0.5"];
    value='<label class="km-field">'+spec[0]+'<input class="km-input" type="number" id="pick-value" min="'+spec[1]+'" max="'+spec[2]+'" step="'+spec[3]+'" value="'+esc(n===""?spec[4]:n)+'"/></label>';
   }
   settings='<div class="km-divider"></div><div class="km-formgrid">'+roomSelect+
     '<label class="km-field">Rechercher un équipement<input class="km-input" id="pick-search" placeholder="Ex. plafonnier" value="'+esc(this._pickSearch)+'"/></label></div>'+
     rows+'<div class="km-formgrid" style="margin-top:11px">'+opSelect+value+'</div>';
  }
  return '<div class="km-tool"><div class="km-tool-head">'+(item?"Modifier l’action":"Que veux-tu faire ?")+'</div>'+
   tiles+settings+this._pickerFooter("action")+'</div>';
 }
 _logicPicker(type){
  const item=this._entry,trigger=type==="trigger",selection=this._pickerCat||item?.type||"";
  const options=trigger?[
   ["time","À une heure","mdi:clock-outline"],
   ["sun","Avec le soleil","mdi:weather-sunset"],
   ["state","Quand un appareil change","mdi:motion-sensor"],
   ["numeric_state","Quand un seuil est franchi","mdi:thermometer"]
  ]:[
   ["state","État d’un appareil","mdi:toggle-switch"],
   ["numeric_state","Température / valeur","mdi:thermometer"],
   ["time","Plage horaire","mdi:clock-outline"],
   ["sun","Jour ou nuit","mdi:weather-sunset"]
  ];
  let details="";
  const draft=item&&item.type===selection?item:
   selection?(trigger?engine().trigger(selection):engine().condition(selection)):null;
  if(selection&&draft){
   const attrs=['data-field="event"'];
   if(selection==="time"){
    details=trigger?
     '<label class="km-field">Heure<input class="km-input" id="logic-at" type="time" value="'+esc(draft.at||"07:00")+'"/></label>':
     '<div class="km-formgrid"><label class="km-field">À partir de<input class="km-input" id="logic-after" type="time" value="'+esc(draft.after||"19:00")+'"/></label>'+
     '<label class="km-field">Jusqu’à<input class="km-input" id="logic-before" type="time" value="'+esc(draft.before||"07:00")+'"/></label></div>';
   }else if(selection==="sun"){
    if(trigger)details='<label class="km-field">Événement<select class="km-input" id="logic-event">'+
      opt("sunrise","Lever du soleil",draft.event)+opt("sunset","Coucher du soleil",draft.event)+'</select></label>'+
      '<label class="km-field">Décalage (minutes, facultatif)<input class="km-input" id="logic-offset" type="number" min="-720" max="720" value="'+esc(draft.offset||0)+'"/></label>';
    else details='<div class="km-formgrid"><label class="km-field">Après<select class="km-input" id="logic-after">'+
      opt("sunset","Coucher du soleil",draft.after)+opt("sunrise","Lever du soleil",draft.after)+'</select></label>'+
      '<label class="km-field">Avant<select class="km-input" id="logic-before">'+
      opt("sunrise","Lever du soleil",draft.before)+opt("sunset","Coucher du soleil",draft.before)+'</select></label></div>';
   }else{
    const permitted=selection==="numeric_state"?
     ["sensor","number","input_number"]:
     ["light","binary_sensor","sensor","switch","cover","climate","person","device_tracker","input_boolean","sun"];
    const es=this._allEntities(null,true).filter(x=>permitted.includes(x.domain));
    const areaSet=new Set(es.map(x=>x.area));
    const filtered=es.filter(x=>(this._pickArea==="*"||x.area===this._pickArea)&&
     (x.label.toLowerCase().includes(this._pickSearch.toLowerCase())||x.id.includes(this._pickSearch.toLowerCase())));
    const selected=this._pickEntity||draft.entity;
    details='<div class="km-formgrid">'+
     '<label class="km-field">Pièce<select class="km-input" id="pick-area">'+
      opt("*","Toutes les pièces",this._pickArea)+
      [...areaSet].map(area=>opt(area,es.find(x=>x.area===area)?.areaName||"Autres équipements",this._pickArea)).join("")+
     '</select></label><label class="km-field">Rechercher un capteur<input id="pick-search" class="km-input" placeholder="Ex. mouvement, température…" value="'+esc(this._pickSearch)+'"/></label></div>'+
     '<div class="km-selection" id="pick-entities">'+
     (filtered.length?filtered.map(x=>'<button type="button" class="km-device'+(x.id===selected?" selected":"")+'" data-do="select-entity" data-id="'+esc(x.id)+'">'+esc(x.label)+'<small>'+esc(x.areaName)+'</small></button>').join(""):'<div class="km-empty">Aucun capteur ici.</div>')+'</div>';
    if(selection==="state")details+='<label class="km-field" style="margin-top:9px">'+
     (trigger?"Nouvel état":"État attendu")+
     '<select id="logic-state" class="km-input">'+
      [...new Set([trigger?draft.to:draft.state,"on","off","open","closed","home","not_home","below_horizon","above_horizon"].filter(Boolean))]
       .map(v=>opt(v,v,trigger?draft.to:draft.state)).join("")+'</select></label>';
    else details+='<div class="km-formgrid" style="margin-top:9px">'+
     '<label class="km-field">Au-dessus de<input id="logic-above" class="km-input" type="number" step="any" value="'+esc(draft.above||"")+'"/></label>'+
     '<label class="km-field">En dessous de<input id="logic-below" class="km-input" type="number" step="any" value="'+esc(draft.below||"")+'"/></label></div>';
   }
  }
  return '<div class="km-tool"><div class="km-tool-head">'+(trigger?"Quand cela doit-il se produire ?":"Quelle condition vérifier ?")+'</div>'+
   '<div class="km-tiles">'+options.map(([key,name,ico])=>'<button class="km-tile'+(selection===key?" selected":"")+
    '" type="button" data-do="logic-type" data-value="'+key+'">'+icon(ico)+esc(name)+'</button>').join("")+'</div>'+
   (details?'<div class="km-divider"></div>'+details:"")+
   this._pickerFooter(type)+'</div>';
 }
 _pickerFooter(type){
  return '<div class="km-row wrap" style="justify-content:flex-end;margin-top:14px">'+
   this._btn("Annuler","close","flat small")+
   this._btn(icon("mdi:check")+(this._idx==null?" Ajouter":" Appliquer"),"apply","main small",'data-type="'+type+'"')+'</div>';
 }
 _expert(){
  const d=this._draft;
  return '<div class="km-tool" style="margin-top:17px"><div class="km-tool-head">Paramètres supplémentaires</div>'+
   '<p class="km-muted">Pour les modèles Jinja, blueprints, variables, actions parallèles, branches complexes et services spéciaux, ouvre la routine directement dans Home Assistant. Les routines non prises en charge restent intactes.</p>'+
   '<label class="km-field">Si la routine est relancée avant la fin<select class="km-input" id="mode">'+
    Object.entries(modeName).map(([id,text])=>opt(id,text,d.mode)).join("")+'</select></label>'+
   '<p class="km-muted" style="margin-top:12px">Afficher les commandes d’helpers et les scénarios HA dans le sélecteur d’actions :</p>'+
   this._btn(this._triggerOptions?"Masquer ces commandes":"Afficher ces commandes","show-technical","flat small")+
   '<div style="margin-top:12px">'+this._native(d.kind,this._editing?.id)+'</div></div>';
 }
 _clearPicker(){this._drawer=null;this._entry=null;this._pickerCat="";this._pickArea="*";this._pickEntity="";this._pickOp="";this._pickValue=undefined;this._pickSearch="";this._idx=null;}
 _pickerData(){
  const root=this.shadowRoot;
  const val=id=>root.getElementById(id)?.value??"";
  const type=this._drawer;
  if(type==="action"){
   if(this._entry?.type==="delay"||this._pickerCat==="delay"){
    return {type:"delay",seconds:val("pick-delay")};
   }
   const dom=this._pickerCat||this._entry?.entity?.split(".")[0]||"";
   const entity=this._pickEntity||this._entry?.entity||"";
   if(!dom||!entity||entity.split(".")[0]!==dom)throw Error("Choisis un type d’équipement puis un appareil.");
   const operation=val("pick-operation");
   if(!(engine().OPERATIONS[dom]||[]).some(x=>x[0]===operation))throw Error("Choisis une action valide.");
   const uses=["set_temperature","set_cover_position","volume_set"].includes(operation);
   return {type:"call",entity,operation,value:uses?val("pick-value"):""};
  }
  const key=this._pickerCat||this._entry?.type;
  if(!key)throw Error("Choisis une situation.");
  const draft=cp(this._entry?.type===key?this._entry:
   (type==="trigger"?engine().trigger(key):engine().condition(key)));
  if(key==="time"){
   if(type==="trigger")draft.at=val("logic-at");
   else{draft.after=val("logic-after");draft.before=val("logic-before");}
  }else if(key==="sun"){
   if(type==="trigger"){draft.event=val("logic-event");draft.offset=Number(val("logic-offset"));}
   else{draft.after=val("logic-after");draft.before=val("logic-before");}
  }else{
   draft.entity=this._pickEntity||draft.entity||"";
   if(!draft.entity)throw Error("Choisis un appareil ou capteur.");
   if(key==="state"){
    if(type==="trigger")draft.to=val("logic-state");
    else draft.state=val("logic-state");
   }else{
    draft.above=val("logic-above");draft.below=val("logic-below");
   }
  }
  return draft;
 }
 _apply(){
  const type=this._drawer;if(!type)return;
  try{
   const data=this._pickerData();
   if(type==="action")engine().actionToHA(data);
   else if(type==="trigger")engine().triggerToHA(data);
   else engine().conditionToHA(data);
   const arr=type==="trigger"?this._draft.triggers:type==="condition"?this._draft.conditions:this._draft.actions;
   if(this._idx==null)arr.push(data);else arr[this._idx]=data;
   this._clearPicker();this._notice="";this._render();
  }catch(err){this._message("À compléter : "+(err?.message||err),true);}
 }
 _focusEntities(){
  const q=this._pickSearch.toLowerCase(),area=this._pickArea,type=this._drawer;
  let list=[];
  if(type==="action")list=this._allEntities(this._pickerCat||this._entry?.entity?.split(".")[0]);
  else{
   const domainList=(this._pickerCat||this._entry?.type)==="numeric_state"?
    ["sensor","number","input_number"]:
    ["light","binary_sensor","sensor","switch","cover","climate","person","device_tracker","input_boolean","sun"];
   list=this._allEntities(null,true).filter(x=>domainList.includes(x.domain));
  }
  return list.filter(x=>(area==="*"||x.area===area)&&
   (x.label.toLowerCase().includes(q)||x.id.includes(q)));
 }
 _renderEntityChoices(){
  const el=this.shadowRoot.getElementById("pick-entities");
  if(!el)return;
  const id=this._pickEntity||this._entry?.entity;
  const items=this._focusEntities();
  el.innerHTML=items.length?items.map(x=>'<button class="km-device'+(id===x.id?" selected":"")+'" type="button" data-do="select-entity" data-id="'+esc(x.id)+'">'+esc(x.label)+'<small>'+esc(x.areaName)+'</small></button>').join(""):
   '<div class="km-empty">Aucun équipement correspondant.</div>';
 }
 _click(ev){
  const b=ev.target.closest("[data-do]");if(!b||!this._admin()||this._busy)return;
  const act=b.dataset.do,kind=b.dataset.kind;
  if(act==="create")this._new(kind);
  else if(act==="back"){this._page="home";this._draft=null;this._editing=null;this._notice="";this._clearPicker();this._render();}
  else if(act==="filter"){this._filter=b.dataset.value;this._render();}
  else if(act==="refresh"){this._notice="Liste actualisée depuis Home Assistant.";this._render();}
  else if(act==="open"){this._open(b.dataset.type);}
  else if(act==="edit"){this._open(b.dataset.type,Number(b.dataset.index));}
  else if(act==="remove"){
   const a=b.dataset.type,arr=a==="action"?this._draft.actions:a==="trigger"?this._draft.triggers:this._draft.conditions;
   arr.splice(Number(b.dataset.index),1);this._render();
  }
  else if(act==="up"||act==="down"){
   const arr=this._draft.actions,i=Number(b.dataset.index),j=i+(act==="up"?-1:1);
   if(j>=0&&j<arr.length){[arr[i],arr[j]]=[arr[j],arr[i]];this._render();}
  }
  else if(act==="close"){this._clearPicker();this._notice="";this._render();}
  else if(act==="logic-type"||act==="category"){
   this._pickerCat=act==="logic-type"?b.dataset.value:b.dataset.domain;
   this._entry=null;this._pickEntity="";this._pickOp="";this._pickValue=undefined;
   this._pickArea="*";this._pickSearch="";this._render();
  }
  else if(act==="delay-category"){
   this._pickerCat="delay";this._entry={type:"delay",seconds:10};this._render();
  }
  else if(act==="select-entity"){
   this._pickEntity=b.dataset.id;
   const list=this.shadowRoot.querySelectorAll("button[data-do='select-entity']");
   for(const x of list)x.classList.toggle("selected",x.dataset.id===this._pickEntity);
  }
  else if(act==="apply")this._apply();
  else if(act==="expert"){this._experimental=!this._experimental;this._render();}
  else if(act==="show-technical"){this._triggerOptions=!this._triggerOptions;this._experimental=true;this._render();}
  else if(act==="save")void this._save();
  else if(act==="run")void this._run(b.dataset.id);
  else if(act==="toggle")void this._toggle(b.dataset.id);
  else if(act==="load")void this._load(b.dataset.id);
 }
 _input(ev){
  const x=ev.target;
  if(x.id==="kimia-search"){
   this._query=x.value.toLowerCase();const out=this.shadowRoot.getElementById("kimia-results");
   if(out)out.innerHTML=this._routineTiles(this._list().filter(r=>
    (this._filter==="all"||r.kind===this._filter)&&r.name.toLowerCase().includes(this._query)));
  }else if(x.id==="routine-title")this._draft.alias=x.value;
  else if(x.id==="routine-desc")this._draft.description=x.value;
  else if(x.id==="pick-search"){this._pickSearch=x.value;this._renderEntityChoices();}
  else if(x.id==="pick-value")this._pickValue=x.value;
 }
 _change(ev){
  const x=ev.target;
  if(x.id==="pick-area"){this._pickArea=x.value;this._renderEntityChoices();}
  else if(x.id==="pick-operation"){this._pickOp=x.value;this._pickValue=undefined;this._render();}
  else if(x.id==="mode")this._draft.mode=x.value;
 }
 async _load(entityId){
  const r=this._list().find(x=>x.entityId===entityId);
  if(!r)return;
  const url="config/"+r.kind+"/config/"+encodeURIComponent(r.id);
  this._busy=true;
  try{
   const raw=await this._hass.callApi("GET",url);
   const draft=engine().deserialize(raw,r.kind);
   if(!guardSimple(draft)||canonical(engine().serialize(draft,r.id))!==canonical(raw)){
    window.location.assign(nativeUrl(r.kind,r.id));return;
   }
   this._draft=draft;this._editing={id:r.id,kind:r.kind,baseline:cp(raw)};
   this._page="edit";this._drawer=null;this._notice="";this._error=false;
  }catch(err){
   // L'éditeur natif sait gérer les objets YAML/blueprints complexes.
   window.location.assign(nativeUrl(r.kind,r.id));return;
  }finally{this._busy=false;this._render();}
 }
 async _save(){
  if(!this._admin()||this._busy||!this._draft)return;
  const d=cp(this._draft),editing=this._editing;
  const id=editing?.id||(d.kind==="script"?"ks_":"kimia_")+
   engine().slug(d.alias)+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6);
  let payload;
  try{payload=engine().serialize(d,id);}
  catch(err){this._message("Vérifie les champs de la routine : "+(err?.message||err),true);return;}
  this._busy=true;
  try{
   const url="config/"+d.kind+"/config/"+encodeURIComponent(id);
   if(editing){
    const latest=await this._hass.callApi("GET",url);
    if(canonical(latest)!==canonical(editing.baseline))throw Error("La routine a changé dans Home Assistant. Recharge-la avant d’enregistrer.");
   }else{
    let exists=null;try{exists=await this._hass.callApi("GET",url);}
    catch(err){if(err?.status!==404&&err?.status_code!==404&&!/404|Not Found/i.test(String(err?.message||err)))throw err;}
    if(exists)throw Error("Cette routine existe déjà. Aucun écrasement.");
   }
   await this._hass.callApi("POST",url,payload);
   this._page="home";this._draft=null;this._editing=null;this._clearPicker();
   this._notice="Routine « "+d.alias+" » "+(editing?"modifiée":"créée")+" dans Home Assistant, sans démarrer d’équipement.";
   this._error=false;
  }catch(err){this._notice="Enregistrement refusé : "+(err?.message||err);this._error=true;}
  finally{this._busy=false;this._render();}
 }
 async _run(entityId){
  const r=this._list().find(x=>x.entityId===entityId);
  if(!r||r.kind!=="script")return;
  if(!window.confirm("Lancer « "+r.name+" » ? Les appareils vont réagir immédiatement."))return;
  this._busy=true;
  try{await this._hass.callService("script","turn_on",{entity_id:entityId});
   this._notice="Lancement demandé à Home Assistant.";this._error=false;
  }catch(err){this._notice="Impossible d’exécuter : "+(err?.message||err);this._error=true;}
  finally{this._busy=false;this._render();}
 }
 async _toggle(entityId){
  const r=this._list().find(x=>x.entityId===entityId);
  if(!r||r.kind!=="automation"||!["on","off"].includes(r.state))return;
  this._busy=true;
  try{await this._hass.callService("automation",r.state==="on"?"turn_off":"turn_on",{entity_id:entityId});
   this._notice="Modification demandée à Home Assistant.";this._error=false;
  }catch(err){this._notice="Impossible de modifier : "+(err?.message||err);this._error=true;}
  finally{this._busy=false;this._render();}
 }
}
customElements.define(TAG,Card);
window.KimiaRoutinesV3=Object.freeze({listRoutines,availableEntities,internalAutomation,guardSimple,nativeUrl});
window.customCards=window.customCards||[];
if(!window.customCards.some(x=>x.type===TAG))
 window.customCards.push({type:TAG,name:"KIMIA Routines V3",description:"Scénarios et automatisations simples sur un écran Quand / Si / Alors."});
})();