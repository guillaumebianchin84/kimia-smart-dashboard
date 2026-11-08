/* KIMIA Studio V2 — administration isolée.
 * Aucune modification d'un dashboard ou d'un autre composant KIMIA.
 * Le moteur HA exécute les scripts et automatisations.
 */
(()=>{
"use strict";
const TAG="kimia-studio-v2-admin-card";
if(customElements.get(TAG))return;
const H=()=>window.KimiaRoutineEngineV16;
const e=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const canon=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?
 Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const DOMAINS={light:"Lumières",switch:"Prises",input_boolean:"Options",cover:"Volets",climate:"Chauffage / clim",fan:"Ventilation",media_player:"Musique",scene:"Scènes",script:"Scénarios"};
const ICONS={light:"mdi:lightbulb-outline",switch:"mdi:power-socket-eu",input_boolean:"mdi:toggle-switch-outline",cover:"mdi:window-shutter",climate:"mdi:thermostat",fan:"mdi:fan",media_player:"mdi:music",scene:"mdi:palette-outline",script:"mdi:play-box-multiple-outline",automation:"mdi:robot-outline"};
const PRESETS=[
 ["blank-script","script","Scénario libre","Créer des actions sur mesure","mdi:play-circle-outline"],
 ["night","script","Bonne nuit","Éteindre, fermer et se reposer","mdi:weather-night"],
 ["departure","script","Départ","Éteindre avant de sortir","mdi:door-open"],
 ["arrival","script","Retour","Retrouver une maison accueillante","mdi:home-import-outline"],
 ["blank-automation","automation","Automatisation libre","Réagir à un événement","mdi:robot-outline"],
 ["evening","automation","Éclairage du soir","Allumer au coucher du soleil","mdi:weather-sunset-down"],
 ["morning","automation","Réveil","Programmer une heure","mdi:weather-sunset-up"],
 ["energy","automation","Confort & énergie","Déclencher selon un seuil","mdi:solar-power"]
];
const CSS=[
":host{display:block;color:var(--primary-text-color);font-family:inherit}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}",
"ha-card{display:block;border-radius:23px;overflow:hidden;background:var(--card-background-color,#fff);box-shadow:0 14px 34px rgba(8,25,45,.08)}",
".hero{background:linear-gradient(117deg,#11283d 0%,#1c5162 52%,#087774 100%);color:#fff;padding:25px 27px;position:relative}.hero:after{content:'';position:absolute;width:230px;height:230px;border-radius:50%;border:38px solid rgba(255,255,255,.04);right:-65px;top:-105px;pointer-events:none}.brand{color:#a8f0df;font-size:11px;letter-spacing:2px;font-weight:900;display:flex;align-items:center;gap:7px}.hero h1{font-size:clamp(25px,3.1vw,36px);margin:12px 0 9px;letter-spacing:-.8px;line-height:1.1}.hero p{font-size:13px;line-height:1.5;max-width:680px;color:#d7eaf0;margin:0}.hero-top{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;z-index:1}.main{padding:22px}",
".btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--divider-color,#d7e0e5);background:var(--secondary-background-color,#f5f7fa);color:var(--primary-text-color);font-weight:750;font-size:12px;padding:10px 12px;border-radius:11px;min-height:40px;text-decoration:none}.btn ha-icon{--mdc-icon-size:18px}.btn.primary{color:#fff;background:linear-gradient(110deg,#07a492,#0b8095);border-color:#0a928c}.btn.ghost{color:#fff;background:rgba(255,255,255,.13);border-color:rgba(255,255,255,.24)}.btn.small{font-size:11px;min-height:33px;padding:7px 9px}.btn.danger{color:var(--error-color,#c03939)}.btn:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--primary-color);outline-offset:2px}",
".nav{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:17px}.tabs{display:flex;gap:4px;background:var(--secondary-background-color,#f2f6f8);border-radius:12px;padding:5px}.tab{border:0;background:transparent;font-weight:800;color:var(--secondary-text-color);border-radius:9px;padding:9px 12px}.tab[aria-selected=true]{background:var(--card-background-color,#fff);color:var(--primary-text-color);box-shadow:0 2px 8px rgba(0,0,0,.08)}",
".stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:17px}.stat{border:1px solid var(--divider-color,#dfe6e9);padding:13px;border-radius:14px;display:flex;align-items:center;gap:10px}.stat ha-icon{color:var(--primary-color,#13998d);--mdc-icon-size:26px}.stat strong{font-size:24px;display:block}.stat small{font-size:11px;color:var(--secondary-text-color)}",
".tools{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px}.tools input{flex:1;min-width:170px}.tools select{max-width:155px}.field,input[type=text],input[type=time],input[type=number],select,textarea{background:var(--card-background-color,#fff);color:var(--primary-text-color);border:1px solid var(--divider-color,#d6dfe5);padding:10px 11px;min-height:41px;border-radius:10px;width:100%}.tools .btn{flex:none}",
".cards,.options,.devices,.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.routine,.option,.block,.choice{border:1px solid var(--divider-color,#dce4e8);background:var(--card-background-color,#fff);border-radius:15px;padding:14px;min-width:0}.routine{display:flex;flex-direction:column;gap:12px}.rtop{display:flex;gap:11px;align-items:center}.r-icon,.o-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:13px;flex:none;background:color-mix(in srgb,var(--primary-color,#149b8b) 12%,var(--card-background-color))}.r-icon ha-icon,.o-icon ha-icon{color:var(--primary-color,#0d9d8e);--mdc-icon-size:25px}.rname{font-weight:850;line-height:1.3;font-size:15px;overflow-wrap:anywhere}.sub,.help{font-size:12px;line-height:1.5;color:var(--secondary-text-color)}.actions{display:flex;gap:7px;flex-wrap:wrap}.actions .btn{flex:1}",
".chip{font-size:11px;font-weight:700;padding:5px 9px;border:1px solid var(--divider-color,#d9e2e6);border-radius:999px;display:inline-flex;gap:5px;align-items:center}.dot{width:7px;height:7px;border-radius:50%;background:#17a473}.dot.off{background:#d8a843}.empty{border:1px dashed var(--divider-color,#cbd7df);border-radius:15px;padding:32px;text-align:center;grid-column:1/-1;color:var(--secondary-text-color)}.empty b{display:block;margin-bottom:7px;color:var(--primary-text-color)}",
".wizard-top{display:flex;align-items:center;justify-content:space-between;gap:9px}.wizard-top h2{margin:0;font-size:22px;letter-spacing:-.4px}.progress{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:17px 0 13px}.progress i{height:5px;background:var(--divider-color,#dfe7ed);border-radius:8px}.progress i.done{background:#0d9b91}.step-label{font-size:11px;color:var(--secondary-text-color);font-weight:900;letter-spacing:1.1px;margin-bottom:9px}.option{display:flex;align-items:center;text-align:left;gap:12px;min-height:106px}.option:hover,.choice:hover{border-color:var(--primary-color,#11a99c)}.option b,.choice b{display:block;font-size:14px;color:var(--primary-text-color)}.option small,.choice small{display:block;font-size:11px;color:var(--secondary-text-color);line-height:1.4;margin-top:4px}",
"label.fieldlabel{display:flex;flex-direction:column;gap:6px;color:var(--secondary-text-color);font-size:12px;font-weight:750;min-width:0}label.fieldlabel input,label.fieldlabel select{font-size:13px;color:var(--primary-text-color)}.section-title{display:flex;align-items:center;gap:7px;font-weight:850;margin:19px 0 12px}.section-title ha-icon{color:var(--primary-color)}.device-tools{display:flex;gap:10px;margin:12px 0;flex-wrap:wrap}.device-tools select{max-width:250px}.device-tools input{flex:1;min-width:170px}.devices{max-height:335px;overflow:auto;padding:3px}.choice{display:flex;align-items:center;gap:9px;min-height:64px;cursor:pointer;padding:9px}.choice.selected{background:color-mix(in srgb,var(--primary-color,#11998e) 7%,var(--card-background-color));border-color:var(--primary-color)}.choice input{width:18px;height:18px;accent-color:var(--primary-color)}.choice ha-icon{color:var(--primary-color);flex:none}",
".block{margin:11px 0}.blocktop{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}.blocktop strong{font-size:14px}.blocktop .actions .btn{flex:initial}.footer{border-top:1px solid var(--divider-color,#dce5e9);margin-top:19px;padding-top:16px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.note{border-left:3px solid var(--primary-color,#0da699);padding:11px 13px;background:var(--secondary-background-color,#f2f8f8);border-radius:4px 11px 11px 4px;font-size:12px;line-height:1.5;margin:14px 0}.feedback{border:1px solid var(--primary-color,#169c91);border-radius:11px;padding:11px 13px;margin:0 0 13px;font-size:13px;font-weight:650;white-space:pre-wrap}.feedback.error{border-color:var(--error-color,#be3535);color:var(--error-color,#be3535)}.summary{display:grid;gap:9px}.summary-item{border:1px solid var(--divider-color,#dce5e9);border-radius:11px;padding:12px;display:flex;align-items:center;gap:10px}.summary-item ha-icon{color:var(--primary-color)}",
"@media(max-width:750px){.hero{padding:22px}.main{padding:14px}.cards,.options,.devices,.fields{grid-template-columns:1fr}.stats{gap:5px}.stat{padding:10px;flex-direction:column;text-align:center;gap:5px}.stat strong{font-size:21px}.stat small{font-size:10px}.option{min-height:90px}.hero h1{font-size:27px}.btn{padding:9px}.tab{padding:8px}}"
].join("\n");
const areaFor=(reg,devices)=>reg?.area_id||devices?.find(d=>d.id===reg?.device_id)?.area_id||"";
function deviceCatalog(states,entities,devices,areas,operations){
 const reg=new Map((entities||[]).map(x=>[x.entity_id,x])),names=new Map((areas||[]).map(x=>[x.area_id,x.name]));
 return Object.entries(states||{}).filter(([id])=>(operations[id.split(".")[0]]||[]).length).map(([id,v])=>{
  const area=areaFor(reg.get(id),devices),dom=id.split(".")[0];
  return {id,name:String(v?.attributes?.friendly_name||id),area,room:names.get(area)||"Sans pièce",domain:dom};
 }).sort((a,b)=>a.room.localeCompare(b.room,"fr")||a.name.localeCompare(b.name,"fr"));
}
function routineCatalog(states){
 return Object.entries(states||{}).filter(([id])=>id.startsWith("script.")||id.startsWith("automation.")).map(([id,s])=>{
  const script=id.startsWith("script."),idPart=id.split(".")[1];
  return {id,name:String(s?.attributes?.friendly_name||id),kind:script?"script":"automation",state:String(s?.state||""),
   own:script?/^(ks_|kimia_)/.test(idPart):String(s?.attributes?.id||"").startsWith("kimia_"),
   configId:script?idPart:String(s?.attributes?.id||idPart)};
 }).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
}
const missing=e=>e?.status===404||e?.status_code===404||/404|Not Found/i.test(String(e?.message||e));
const defaultOp=(dom,preset,ops)=>{
 const variants=ops[dom]||[];
 const preferred=["night","departure"].includes(preset)?
  {light:"turn_off",switch:"turn_off",input_boolean:"turn_off",cover:"close_cover",fan:"turn_off",media_player:"media_pause"}:
  {light:"turn_on",switch:"turn_on",input_boolean:"turn_on",cover:"open_cover",fan:"turn_on",media_player:"media_play"};
 return variants.some(x=>x[0]===preferred[dom])?preferred[dom]:variants[0]?.[0]||"";
};
class Studio extends HTMLElement{
 constructor(){
  super();this.attachShadow({mode:"open"});this._hass=null;this._page="library";this._tab="all";this._q="";this._filter="all";
  this._step=0;this._preset="blank-script";this._draft=null;this._editing=null;this._selected=new Set();
  this._reg={areas:[],entities:[],devices:[]};this._loaded=false;this._area="*";this._query="";
  this._busy=false;this._notice="";this._error=false;this._advanced=null;
  this.shadowRoot.addEventListener("click",ev=>this._click(ev));
  this.shadowRoot.addEventListener("change",ev=>this._change(ev));
  this.shadowRoot.addEventListener("input",ev=>this._input(ev));
  this._draw();
 }
 setConfig(c){this._config=c||{};}
 set hass(h){
  const oldUser=this._hass?.user?.id;
  const oldDigest=oldUser&&this._page==="library"?
   JSON.stringify(routineCatalog(this._hass?.states).map(x=>[x.id,x.name,x.state,x.own])):"";
  if(oldUser!==h?.user?.id){this._loaded=false;this._reg={areas:[],entities:[],devices:[]};}
  this._hass=h;
  if(h?.user?.is_admin&&!this._loaded){this._loaded=true;void this._load();}
  if(this._advanced)this._advanced.hass=h;
  // Le frontend HA met à jour hass très souvent : ne pas interrompre une
  // recherche en cours en recréant tous les boutons/champs à chaque capteur.
  const nextDigest=this._page==="library"?
   JSON.stringify(routineCatalog(h?.states).map(x=>[x.id,x.name,x.state,x.own])):"";
  if(this._page==="library"&&(oldUser!==h?.user?.id||oldDigest!==nextDigest))this._draw();
 }
 getCardSize(){return 12;}
 getGridOptions(){return {columns:12,rows:10};}
 _admin(){return this._hass?.user?.is_admin===true;}
 _I(icon){return '<ha-icon icon="'+e(icon)+'"></ha-icon>';}
 _B(label,act,kind,attr){return '<button type="button" class="btn '+(kind||"")+'" data-act="'+act+'" '+(attr||"")+'>'+label+'</button>';}
 async _load(){
  const h=this._hass;
  try{
   const out=await Promise.allSettled(["config/area_registry/list","config/entity_registry/list","config/device_registry/list"].map(type=>h.callWS({type})));
   if(h!==this._hass)return;
   this._reg={areas:out[0].status==="fulfilled"?out[0].value:[],
    entities:out[1].status==="fulfilled"?out[1].value:[],
    devices:out[2].status==="fulfilled"?out[2].value:[]};
   if(this._page==="wizard")this._draw();
  }catch(err){this._msg("Chargement des pièces partiellement indisponible : "+(err?.message||err),true);}
 }
 _all(){return routineCatalog(this._hass?.states);}
 _devices(){return deviceCatalog(this._hass?.states,this._reg.entities,this._reg.devices,this._reg.areas,H()?.OPERATIONS||{});}
 _msg(text,err=false){this._notice=text;this._error=err;this._draw();}
 _notification(){return this._notice?'<div role="status" class="feedback'+(this._error?' error':'')+'">'+e(this._notice)+'</div>':"";}
 _draw(){
  const denied=!this._admin(),noEngine=!H();
  const content=!this._hass?'<div class="main">Chargement…</div>':
   denied?'<div class="main"><div class="empty"><b>Réservé à l’administrateur</b>Tu dois utiliser un compte Home Assistant administrateur.</div></div>':
   noEngine?'<div class="main"><div class="feedback error">Charge la ressource kimia-routine-engine-v16.js avant Studio V2.</div></div>':
   this._page==="wizard"?this._wizard():this._page==="advanced"?this._advancedPage():this._library();
  this.shadowRoot.innerHTML='<style>'+CSS+'</style><ha-card>'+this._header()+content+'</ha-card>';
  if(this._page==="advanced")this._mountAdvanced();
 }
 _header(){
  return '<div class="hero"><div class="hero-top"><span class="brand">'+this._I("mdi:creation")+' KIMIA SMART · ADMIN</span>'+
   (this._admin()?this._B(this._I(this._page==="library"?"mdi:plus":"mdi:arrow-left")+(this._page==="library"?" Nouvelle routine":" Mes routines"),this._page==="library"?"new":"home","ghost"):"")+'</div>'+
   '<h1>KIMIA Studio <span style="color:#96e5d5;font-weight:400">V2</span></h1><p>Créer, programmer et piloter toute la maison. La puissance Home Assistant, avec une interface pensée pour les humains.</p></div>';
 }
 _library(){
  const list=this._all(),script=list.filter(x=>x.kind==="script").length,auto=list.length-script;
  const tabs=[["all","Toutes"],["script","Scénarios"],["automation","Automatisations"]];
  return '<div class="main">'+this._notification()+
   '<div class="nav"><div class="tabs" role="tablist">'+tabs.map(([id,label])=>
    '<button class="tab" role="tab" type="button" aria-selected="'+(this._tab===id)+'" data-act="tab" data-value="'+id+'">'+label+'</button>').join("")+
   '</div>'+this._B(this._I("mdi:tune-vertical")+" Atelier avancé","advanced")+'</div>'+
   '<div class="stats">'+[[list.length,"Routines","mdi:playlist-play"],[script,"Scénarios","mdi:play-box-multiple-outline"],[auto,"Automatisations","mdi:robot-outline"]].map(([n,name,icon])=>
   '<div class="stat">'+this._I(icon)+'<div><strong>'+n+'</strong><small>'+name+'</small></div></div>').join("")+'</div>'+
   '<div class="tools"><input id="studio-search" type="text" aria-label="Rechercher une routine" placeholder="Rechercher une routine…" value="'+e(this._q)+'"/>'+
   '<select id="studio-filter" aria-label="Filtrer l’état"><option value="all">Tous les états</option><option value="on"'+(this._filter==="on"?" selected":"")+'>Actives</option><option value="off"'+(this._filter==="off"?" selected":"")+'>Désactivées</option></select>'+
   this._B(this._I("mdi:refresh")+" Actualiser","refresh")+'</div>'+
   '<div class="cards" id="studio-results">'+this._results()+'</div>'+
   '<p class="help" style="margin-top:17px">Les routines existantes de Home Assistant sont conservées. Les créations KIMIA ne suppriment ni les scripts ni les automatisations actuels.</p></div>';
 }
 _results(){
  const query=this._q.trim().toLowerCase();
  const items=this._all().filter(r=>(this._tab==="all"||r.kind===this._tab)&&
   (this._filter==="all"||r.kind==="script"||r.state===this._filter)&&
   (!query||r.name.toLowerCase().includes(query)||r.id.includes(query)));
  if(!items.length)return '<div class="empty">'+this._I("mdi:playlist-remove")+'<b>Aucune routine trouvée</b>Crée une routine ou modifie les filtres.</div>';
  return items.map(r=>{
   const auto=r.kind==="automation",on=r.state==="on";
   return '<div class="routine"><div class="rtop"><span class="r-icon">'+this._I(ICONS[r.kind])+'</span>'+
    '<div style="min-width:0"><div class="rname">'+e(r.name)+'</div><div class="sub">'+(auto?"Automatisation":"Scénario")+' · '+(r.own?"KIMIA":"Home Assistant")+'</div></div></div>'+
    '<div><span class="chip"><span class="dot '+(auto&&!on?"off":"")+'"></span>'+(auto?(on?"Active":"Désactivée"):"Prêt à lancer")+'</span></div>'+
    '<div class="actions">'+(auto?
     this._B(this._I(on?"mdi:pause-circle-outline":"mdi:power")+(on?" Désactiver":" Activer"),"toggle","small",'data-id="'+e(r.id)+'"'):
     this._B(this._I("mdi:play")+" Lancer","run","small primary",'data-id="'+e(r.id)+'"'))+
    this._B(this._I("mdi:pencil-outline")+" Modifier","edit","small",'data-id="'+e(r.id)+'"')+'</div></div>';
  }).join("");
 }
 _new(){this._page="wizard";this._step=0;this._notice="";this._draft=null;this._editing=null;this._draw();}
 _presetStart(key){
  const p=PRESETS.find(x=>x[0]===key)||PRESETS[0];
  this._preset=key;this._editing=null;this._draft=H().create(p[1]);this._draft.alias=p[2].includes(" libre")?"":p[2];
  if(p[1]==="automation")this._draft.triggers=[H().trigger(key==="evening"?"sun":key==="energy"?"numeric_state":"time")];
  this._selected=new Set();this._area="*";this._query="";this._step=1;this._notice="";this._draw();
 }
 _wizard(){
  const labels=["Objectif","Équipements","Actions","Conditions","Validation"];
  const main=this._step===0?this._choose():this._step===1?this._equipmentStep():this._step===2?this._actionsStep():this._step===3?this._conditionsStep():this._review();
  return '<div class="main"><div class="wizard-top"><h2>'+(this._editing?"Modifier la routine":"Nouvelle routine")+'</h2>'+this._B("Fermer","home","small")+'</div>'+
   '<div class="progress">'+labels.map((_,i)=>'<i class="'+(i<=this._step?"done":"")+'"></i>').join("")+'</div>'+
   '<div class="step-label">ÉTAPE '+(this._step+1)+' / 5 · '+labels[this._step].toUpperCase()+'</div>'+
   this._notification()+main+
   '<div class="footer">'+this._B(this._I("mdi:arrow-left")+" Retour",this._step===0?"home":"prev")+
   '<div class="actions">'+this._B(this._I("mdi:code-braces")+" Expert","advanced")+
   (this._step===4?this._B(this._I("mdi:content-save-check-outline")+' Enregistrer dans HA',"save","primary",this._busy?"disabled":""):
     this._B("Continuer "+this._I("mdi:arrow-right"),"next","primary"))+'</div></div></div>';
 }
 _choose(){
  return '<p class="help">Choisis ce que tu veux accomplir. Les modèles préparent uniquement les réglages, sans commander les appareils.</p><div class="options">'+
   PRESETS.map(p=>'<button class="option" data-act="preset" data-value="'+p[0]+'" type="button"><span class="o-icon">'+this._I(p[4])+'</span>'+
    '<span><b>'+e(p[2])+'</b><small>'+e(p[3])+'</small></span></button>').join("")+'</div>';
 }
 _equipmentStep(){
  const devices=this._devices(),listed=devices.filter(x=>(this._area==="*"||x.area===this._area)&&
   (x.name.toLowerCase().includes(this._query.toLowerCase())||x.id.includes(this._query.toLowerCase())));
  const areaNames=new Map(this._reg.areas.map(a=>[a.area_id,a.name]));
  const used=[...new Set(devices.map(x=>x.area))];
  return '<p class="help">On utilise les pièces Home Assistant du client, jamais les coordonnées de son plan. Tu peux sélectionner plusieurs équipements.</p>'+
   '<div class="fields"><label class="fieldlabel">Nom de la routine<input id="draft-name" type="text" maxlength="70" placeholder="Ex. Bonne nuit" value="'+e(this._draft.alias)+'"/></label>'+
   '<label class="fieldlabel">Description facultative<input id="draft-desc" type="text" maxlength="240" value="'+e(this._draft.description)+'"/></label></div>'+
   '<div class="section-title">'+this._I("mdi:home-search-outline")+' Choisir les équipements <span class="chip" id="selected-count">'+this._selected.size+' sélectionné(s)</span></div>'+
   '<div class="device-tools"><select id="area-filter"><option value="*">Toutes les pièces</option>'+
   used.map(a=>'<option value="'+e(a)+'" '+(this._area===a?"selected":"")+'>'+e(areaNames.get(a)||"Sans pièce")+'</option>').join("")+'</select>'+
   '<input id="device-search" type="text" placeholder="Rechercher un appareil…" value="'+e(this._query)+'"/></div>'+
   '<div class="devices" id="device-results">'+this._deviceResults(listed)+'</div>'+
   '<p class="help">Les appareils nécessitant des actions particulières peuvent être configurés dans l’éditeur avancé.</p>';
 }
 _deviceResults(items){
  if(!items.length)return '<div class="empty">Aucun appareil compatible ici.</div>';
  return items.map(x=>'<label class="choice '+(this._selected.has(x.id)?"selected":"")+'">'+
   '<input type="checkbox" data-entity="'+e(x.id)+'" '+(this._selected.has(x.id)?"checked":"")+'/>'+
   this._I(ICONS[x.domain]||"mdi:flash")+'<span style="min-width:0"><b>'+e(x.name)+'</b>'+
   '<small>'+e(x.room)+' · '+e(DOMAINS[x.domain]||x.domain)+'</small></span></label>').join("");
 }
 _syncActions(){
  // Impératif pour l'édition : conserver l'ordre des commandes et pauses.
  // Ne jamais déplacer une attente au bout de la séquence !
  const ops=H().OPERATIONS,known=new Set(),next=[];
  for(const action of this._draft.actions){
   if(action.type!=="call"){next.push(action);continue;}
   if(this._selected.has(action.entity)&&!known.has(action.entity)){
    next.push(action);known.add(action.entity);
   }
  }
  for(const id of this._selected){
   if(known.has(id))continue;
   const x=H().action("call");x.entity=id;x.operation=defaultOp(id.split(".")[0],this._preset,ops);
   x.value=x.operation==="set_temperature"?"20":x.operation==="set_cover_position"?"50":x.operation==="volume_set"?"0.5":"";
   next.push(x);
  }
  this._draft.actions=next;
 }
 _entityOptions(current){
  return '<option value="">Choisir un appareil</option>'+
   Object.entries(this._hass.states||{}).sort((a,b)=>String(a[1]?.attributes?.friendly_name||a[0]).localeCompare(String(b[1]?.attributes?.friendly_name||b[0]),"fr"))
   .map(([id,v])=>'<option value="'+e(id)+'" '+(current===id?"selected":"")+'>'+e(v?.attributes?.friendly_name||id)+'</option>').join("");
 }
 _actionsStep(){
  const ops=H().OPERATIONS,names=new Map(this._devices().map(x=>[x.id,x.name]));
  return '<p class="help">Les commandes seront exécutées dans cet ordre. Le déplacement fonctionne aussi sur tablette avec les flèches.</p>'+
  (this._draft.actions.length?this._draft.actions.map((x,i)=>
   '<div class="block"><div class="blocktop"><strong>Action '+(i+1)+' · '+e(x.type==="call"?(names.get(x.entity)||x.entity):x.type==="delay"?"Attente":"Attendre un capteur")+'</strong>'+
   '<div class="actions">'+this._B(this._I("mdi:arrow-up"),"move","small",'data-index="'+i+'" data-direction="-1" '+(i===0?"disabled":""))+
    this._B(this._I("mdi:arrow-down"),"move","small",'data-index="'+i+'" data-direction="1" '+(i===this._draft.actions.length-1?"disabled":""))+
    this._B(this._I("mdi:trash-can-outline"),"del-action","small danger",'data-index="'+i+'"')+'</div></div>'+
   (x.type==="call"?'<div class="fields"><label class="fieldlabel">Équipement<input type="text" value="'+e(names.get(x.entity)||x.entity)+'" disabled /></label>'+
    '<label class="fieldlabel">Action<select data-action-field="operation" data-index="'+i+'">'+(ops[x.entity.split(".")[0]]||[]).map(([op,label])=>
    '<option value="'+e(op)+'" '+(op===x.operation?"selected":"")+'>'+e(label)+'</option>').join("")+'</select></label></div>'+
    (["set_temperature","set_cover_position","volume_set"].includes(x.operation)?'<label class="fieldlabel" style="margin-top:10px">Valeur ('+
    (x.operation==="set_temperature"?"°C":x.operation==="set_cover_position"?"%":"0 à 1")+
    ')<input type="number" step="any" data-action-field="value" data-index="'+i+'" value="'+e(x.value)+'"/></label>':""):
    x.type==="delay"?'<label class="fieldlabel">Durée en secondes<input type="number" data-action-field="seconds" data-index="'+i+'" min="1" value="'+e(x.seconds)+'"/></label>':
    '<div class="fields"><label class="fieldlabel">Capteur<select data-action-field="entity" data-index="'+i+'">'+this._entityOptions(x.entity)+'</select></label>'+
    '<label class="fieldlabel">État attendu<input type="text" data-action-field="to" data-index="'+i+'" value="'+e(x.to)+'"/></label>'+
    '<label class="fieldlabel">Limite (secondes)<input type="number" data-action-field="timeout" data-index="'+i+'" value="'+e(x.timeout)+'"/></label></div>')+
   '</div>').join(""):'<div class="empty"><b>Aucune action</b>Reviens choisir des appareils ou ajoute une attente.</div>')+
   '<div class="actions">'+this._B(this._I("mdi:timer-outline")+" Ajouter une pause","add-delay")+
   this._B(this._I("mdi:progress-clock")+" Attendre un capteur","add-wait")+'</div>'+
   '<div class="note">Les branches SI / ALORS / SINON, boucles, répétitions, groupes ET / OU et paramètres experts sont disponibles dans l’atelier avancé. Aucun bloc complexe n’est simplifié automatiquement.</div>';
 }
 _conditionBlock(x,i,isTrigger){
  const prefix=isTrigger?"trigger":"condition",dataAttr='data-'+prefix+'-field',types=isTrigger?
   [["time","Heure"],["sun","Soleil"],["state","État"],["numeric_state","Seuil numérique"]]:
   [["state","État"],["numeric_state","Seuil"],["time","Heure"],["sun","Jour / nuit"]];
  const field=(name,value,key,type="text")=>'<label class="fieldlabel">'+name+'<input type="'+type+'" '+dataAttr+'="'+key+'" data-index="'+i+'" value="'+e(value??"")+'"/></label>';
  let extra="";
  if(x.type==="time")extra=isTrigger?field("Heure",x.at?.slice(0,5),"at","time"):
   field("Après",x.after?.slice(0,5),"after","time")+field("Avant",x.before?.slice(0,5),"before","time");
  else if(x.type==="sun")extra='<label class="fieldlabel">Événement<select '+dataAttr+'="'+(isTrigger?"event":"after")+'" data-index="'+i+'"><option value="sunset">Coucher du soleil</option><option value="sunrise" '+((isTrigger?x.event:x.after)==="sunrise"?"selected":"")+'>Lever du soleil</option></select></label>'+
   (isTrigger?field("Décalage (minutes)",x.offset,"offset","number"):
    '<label class="fieldlabel">Avant<select '+dataAttr+'="before" data-index="'+i+'"><option value="sunrise">Lever du soleil</option><option value="sunset" '+(x.before==="sunset"?"selected":"")+'>Coucher du soleil</option></select></label>');
  else extra='<label class="fieldlabel">Capteur / appareil<select '+dataAttr+'="entity" data-index="'+i+'">'+this._entityOptions(x.entity)+'</select></label>'+
   (x.type==="state"?field("État",isTrigger?x.to:x.state,isTrigger?"to":"state"):
    field("Au-dessus de",x.above,"above","number")+field("En dessous de",x.below,"below","number"));
  return '<div class="block"><div class="blocktop"><strong>'+(isTrigger?"Déclencheur":"Condition")+' '+(i+1)+'</strong>'+
   this._B(this._I("mdi:trash-can-outline"),isTrigger?"remove-trigger":"remove-condition","small danger",'data-index="'+i+'"')+
   '</div><div class="fields"><label class="fieldlabel">Type<select '+dataAttr+'="type" data-index="'+i+'">'+
   types.map(([id,name])=>'<option value="'+id+'" '+(x.type===id?"selected":"")+'>'+name+'</option>').join("")+'</select></label>'+extra+'</div></div>';
 }
 _conditionsStep(){
  const d=this._draft,auto=d.kind==="automation";
  return '<p class="help">'+(auto?"Les déclencheurs sont reliés par OU : un seul suffit. Les conditions sont vérifiées ensuite.":"Un scénario se lance manuellement. Des conditions facultatives peuvent arrêter son exécution.")+'</p>'+
   (auto?'<div class="section-title">'+this._I("mdi:calendar-clock")+' QUAND · Déclencheurs</div>'+
    d.triggers.map((x,i)=>this._conditionBlock(x,i,true)).join("")+
    this._B(this._I("mdi:plus")+" Ajouter un déclencheur","add-trigger"):"")+
   '<div class="section-title">'+this._I("mdi:filter-check-outline")+' SI · Conditions facultatives</div>'+
   d.conditions.map((x,i)=>this._conditionBlock(x,i,false)).join("")+
   this._B(this._I("mdi:plus")+" Ajouter une condition","add-condition")+
   '<p class="help">Pour un groupe OU / NON, plusieurs branches ou un template, utilise l’atelier avancé.</p>';
 }
 _review(){
  const d=this._draft,names=new Map(this._devices().map(x=>[x.id,x.name]));
  return '<h2>'+e(d.alias)+'</h2><p class="help">Aucune action ne sera exécutée pendant la sauvegarde.</p>'+
   '<div class="summary"><div class="summary-item">'+this._I(ICONS[d.kind])+
   '<div><strong>'+(d.kind==="script"?"Scénario":"Automatisation")+'</strong><div class="sub">'+e(d.description||"Sans description")+'</div></div></div>'+
   '<div class="summary-item">'+this._I("mdi:calendar-check")+
   '<div><strong>'+d.triggers.length+' déclencheur(s) · '+d.conditions.length+' condition(s)</strong></div></div>'+
   d.actions.map((x,i)=>'<div class="summary-item">'+this._I("mdi:check")+
    '<div><strong>'+(i+1)+'. '+e(x.type==="call"?(names.get(x.entity)||x.entity)+" → "+x.operation:
     x.type==="delay"?"Attendre "+x.seconds+" secondes":"Attendre un capteur")+'</strong></div></div>').join("")+
   '</div><div class="note">KIMIA enregistre une véritable routine Home Assistant. Les autres automatisations et scripts sont intacts.</div>';
 }
 _advancedPage(){
  return '<div class="main">'+this._notification()+
   '<div class="nav"><h2>Atelier avancé</h2>'+this._B("Retour","home")+'</div>'+
   '<div class="note">Blocs conditionnels, répétitions, attentes, déclencheurs et actions avancées de KIMIA V1.6. Si un script HA contient des paramètres non représentables sans perte, utilise l’éditeur natif.</div>'+
   '<div id="studio-advanced"></div></div>';
 }
 _mountAdvanced(){
  const host=this.shadowRoot.getElementById("studio-advanced");
  if(!host)return;
  if(!customElements.get("kimia-routine-editor-v16-card")){host.textContent="La ressource kimia-routine-editor-v16-card.js manque. Charge-la avant Studio V2.";return;}
  const card=document.createElement("kimia-routine-editor-v16-card");
  card.setConfig?.({});card.hass=this._hass;host.append(card);this._advanced=card;
 }
 _input(ev){
  const x=ev.target;
  if(x.id==="studio-search"){this._q=x.value;const out=this.shadowRoot.getElementById("studio-results");if(out)out.innerHTML=this._results();}
  else if(x.id==="draft-name"){this._draft.alias=x.value;}
  else if(x.id==="draft-desc"){this._draft.description=x.value;}
  else if(x.id==="device-search"){
   this._query=x.value;const out=this.shadowRoot.getElementById("device-results");
   if(out)out.innerHTML=this._deviceResults(this._devices().filter(y=>(this._area==="*"||y.area===this._area)&&
    (y.name.toLowerCase().includes(this._query.toLowerCase())||y.id.includes(this._query.toLowerCase()))));
  }
 }
 _change(ev){
  const x=ev.target,d=x.dataset;
  if(x.id==="studio-filter"){this._filter=x.value;this._draw();return;}
  if(x.id==="area-filter"){this._area=x.value;this._draw();return;}
  if(d.entity){if(x.checked)this._selected.add(d.entity);else this._selected.delete(d.entity);
   x.closest(".choice")?.classList.toggle("selected",x.checked);
   const counter=this.shadowRoot.getElementById("selected-count");if(counter)counter.textContent=this._selected.size+" sélectionné(s)";return;
  }
  if(d.actionField){
   const action=this._draft?.actions[Number(d.index)];if(!action)return;
   action[d.actionField]=x.value;
   if(d.actionField==="operation"){
    action.value=action.operation==="set_temperature"?"20":action.operation==="set_cover_position"?"50":action.operation==="volume_set"?"0.5":"";this._draw();
   }return;
  }
  for(const type of ["trigger","condition"]){
   if(!d[type+"Field"])continue;
   const arr=type==="trigger"?this._draft.triggers:this._draft.conditions,idx=Number(d.index);
   if(!arr[idx])return;
   if(d[type+"Field"]==="type")arr[idx]=type==="trigger"?H().trigger(x.value):H().condition(x.value);
   else arr[idx][d[type+"Field"]]=x.value;
   if(d[type+"Field"]==="type")this._draw();return;
  }
 }
 _click(ev){
  const b=ev.target.closest("[data-act]");if(!b||!this._admin()||this._busy)return;
  const a=b.dataset.act,i=Number(b.dataset.index);
  if(a==="home"){this._page="library";this._advanced=null;this._notice="";this._draw();}
  else if(a==="new")this._new();
  else if(a==="tab"){this._tab=b.dataset.value;this._draw();}
  else if(a==="refresh")this._msg("Liste actualisée depuis Home Assistant.");
  else if(a==="advanced"){this._page="advanced";this._draw();}
  else if(a==="preset")this._presetStart(b.dataset.value);
  else if(a==="prev"){this._step=Math.max(0,this._step-1);this._notice="";this._draw();}
  else if(a==="next")this._next();
  else if(a==="save")void this._save();
  else if(a==="run")void this._run(b.dataset.id);
  else if(a==="toggle")void this._toggle(b.dataset.id);
  else if(a==="edit")this._edit(b.dataset.id);
  else if(a==="add-delay"){this._draft.actions.push(H().action("delay"));this._draw();}
  else if(a==="add-wait"){this._draft.actions.push(H().action("wait_state"));this._draw();}
  else if(a==="del-action"){this._draft.actions.splice(i,1);this._draw();}
  else if(a==="move"){const to=i+Number(b.dataset.direction),list=this._draft.actions;if(to>=0&&to<list.length){[list[i],list[to]]=[list[to],list[i]];this._draw();}}
  else if(a==="add-trigger"){this._draft.triggers.push(H().trigger("time"));this._draw();}
  else if(a==="remove-trigger"){this._draft.triggers.splice(i,1);this._draw();}
  else if(a==="add-condition"){this._draft.conditions.push(H().condition("state"));this._draw();}
  else if(a==="remove-condition"){this._draft.conditions.splice(i,1);this._draw();}
 }
 _next(){
  if(this._step===0)return this._msg("Choisis un modèle pour commencer.");
  if(this._step===1){
   if(!this._draft.alias.trim()||this._draft.alias.trim().length<3)return this._msg("Donne un nom d’au moins trois caractères.",true);
   this._syncActions();
  }
  if(this._step===2&&!this._draft.actions.length)return this._msg("Ajoute un équipement ou une action.",true);
  if(this._step===3){
   try{H().serialize(this._draft,"kimia_validation");}
   catch(err){return this._msg("À compléter : "+(err.message||err),true);}
  }
  this._step=Math.min(this._step+1,4);this._notice="";this._draw();
 }
 async _edit(id){
  const record=this._all().find(x=>x.id===id);if(!record)return;
  const native="/config/"+record.kind+"/edit/"+encodeURIComponent(record.configId);
  // Les automations créées hors de KIMIA ont un modèle inconnu : laisser HA gérer.
  if(!record.own){window.location.assign(native);return;}
  const url="config/"+record.kind+"/config/"+encodeURIComponent(record.configId);
  this._busy=true;
  try{
   const raw=await this._hass.callApi("GET",url);
   const draft=H().deserialize(raw,record.kind);
   // Ne jamais ouvrir un éditeur guidé qui modifierait silencieusement
   // des champs HA non maîtrisés (icône, options supplémentaires, etc.).
   // Pour ces routines, utiliser l'éditeur natif ou l'atelier avancé.
   if(canon(H().serialize(draft,record.configId))!==canon(raw)){
    window.location.assign(native);return;
   }
   const common=["call","delay","wait_state"];
   const conditions=["state","numeric_state","time","sun"];
   const actions=draft.actions||[],targets=actions.filter(x=>x.type==="call").map(x=>x.entity);
   // Les actions répétées sur la même entité et les branches complexes
   // requièrent l'atelier avancé : sinon la sélection par cases les écraserait.
   if(actions.some(x=>!common.includes(x.type))||
     draft.conditions.some(x=>!conditions.includes(x.type))||
     draft.triggers.some(x=>!["state","numeric_state","time","sun"].includes(x.type))||
     targets.length!==new Set(targets).size||
     targets.some(entity=>!this._devices().some(d=>d.id===entity))){
    this._page="advanced";
    this._notice="Routine avancée : garde son éditeur complet pour éviter toute perte de commandes ou d'ordre.";
    return;
   }
   this._editing={kind:record.kind,id:record.configId,baseline:clone(raw)};
   this._draft=draft;this._selected=new Set(targets);this._preset="blank-script";
   this._step=1;this._area="*";this._query="";this._page="wizard";
   this._notice="Routine chargée sans modification. Tu peux la personnaliser avant d'enregistrer.";
  }catch(err){
   this._page="advanced";
   this._notice="Édition guidée indisponible : "+(err?.message||err)+". Utilise l’atelier avancé ou l’éditeur HA.";
  }finally{this._busy=false;this._draw();}
 }
 async _run(id){
  const r=this._all().find(x=>x.id===id);if(!r||r.kind!=="script")return;
  if(!window.confirm("Lancer « "+r.name+" » maintenant ? Les appareils réagiront immédiatement."))return;
  this._busy=true;
  try{await this._hass.callService("script","turn_on",{entity_id:id});this._msg("Commande envoyée à Home Assistant. Consulte les traces pour vérifier l’exécution.");}
  catch(err){this._msg("Impossible de lancer : "+(err?.message||err),true);}
  finally{this._busy=false;this._draw();}
 }
 async _toggle(id){
  const r=this._all().find(x=>x.id===id);if(!r||r.kind!=="automation")return;
  if(!["on","off"].includes(r.state))return this._msg("État HA inconnu.",true);
  this._busy=true;
  try{await this._hass.callService("automation",r.state==="on"?"turn_off":"turn_on",{entity_id:id});this._msg("Changement demandé à Home Assistant.");}
  catch(err){this._msg("Commande impossible : "+(err?.message||err),true);}
  finally{this._busy=false;this._draw();}
 }
 async _save(){
  if(!this._admin()||this._busy||!this._draft)return;
  const d=clone(this._draft);
  const editing=this._editing;
  const id=editing?.id||(d.kind==="script"?"ks_":"kimia_")+H().slug(d.alias)+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6);
  let payload;
  try{payload=H().serialize(d,id);}catch(err){return this._msg("Configuration incomplète : "+(err?.message||err),true);}
  const url="config/"+d.kind+"/config/"+encodeURIComponent(id);
  this._busy=true;this._notice="";this._draw();
  try{
   if(editing){
    const latest=await this._hass.callApi("GET",url);
    if(JSON.stringify(latest)!==JSON.stringify(editing.baseline))
     throw Error("Cette routine a été modifiée ailleurs. Recharge-la avant d'enregistrer.");
   }else{
    let exists=null;
    try{exists=await this._hass.callApi("GET",url);}catch(err){if(!missing(err))throw err;}
    if(exists)throw Error("Identifiant existant : aucune modification effectuée.");
   }
   await this._hass.callApi("POST",url,payload);
   this._page="library";this._tab=d.kind;this._editing=null;
   this._notice="« "+d.alias+" » "+(editing?"mise à jour":"créée")+" dans Home Assistant sans exécution.";
   this._error=false;
  }catch(err){this._notice="Enregistrement impossible : "+(err?.message||err);this._error=true;}
  finally{this._busy=false;this._draw();}
 }
}
customElements.define(TAG,Studio);
window.KimiaStudioV2=Object.freeze({routineCatalog,deviceCatalog,defaultOp});
window.customCards=window.customCards||[];
if(!window.customCards.some(c=>c.type===TAG))
 window.customCards.push({type:TAG,name:"KIMIA Studio V2 — Administration",description:"Bibliothèque de routines et assistant guidé par pièces Home Assistant"});
})();
