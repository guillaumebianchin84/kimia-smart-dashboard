/* KIMIA V1.7 — carte Maquette par zones Home Assistant et utilisateurs.
 * Un plan est libre : ni coordonnées, ni noms, ni nombre d'étages en dur.
 * Filtrage visuel et interception d'actions, PAS une ACL serveur HA.
 * La véritable carte maquette-card est conservée comme enfant de ce conteneur,
 * afin que son éditeur interne retrouve toujours sa configuration d'origine.
 */
(()=>{
 "use strict";
 const TAG="kimia-maquette-acl-v17-card";
 if(customElements.get(TAG))return;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const items=x=>Array.isArray(x)?x.filter(v=>v&&typeof v==="object"):[];
 const list=x=>Array.isArray(x)?x:(typeof x==="string"?x.split(",").map(s=>s.trim()).filter(Boolean):[]);
 const entityId=/^[a-z0-9_]+\.[a-z0-9_]+$/;
 const polygonContains=(pt,poly,includeEdge=false)=>{
  if(!Array.isArray(pt)||!Array.isArray(poly)||poly.length<3)return false;
  const x=Number(pt[0]),y=Number(pt[1]);
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if(!Array.isArray(a)||!Array.isArray(b))continue;
   const ax=Number(a[0]),ay=Number(a[1]),bx=Number(b[0]),by=Number(b[1]);
   if(![ax,ay,bx,by].every(Number.isFinite))continue;
   if(includeEdge && Math.abs((x-ax)*(by-ay)-(y-ay)*(bx-ax))<1e-7 &&
      x>=Math.min(ax,bx) && x<=Math.max(ax,bx) && y>=Math.min(ay,by) && y<=Math.max(ay,by))return true;
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
 };
 const floorList=cfg=>items(cfg.floors).length?items(cfg.floors):[cfg];
 const denyAreas=(hass,policy)=>{
  if(!hass?.user||hass.user.is_admin)return new Set();
  const id=hass.user.id;
  if(!id)return new Set();
  return new Set(Object.entries(policy||{})
   .filter(([area,ids])=>area&&Array.isArray(ids)&&ids.includes(id))
   .map(([area])=>area));
 };
 const zoneOf=room=>[room?.area,room?.area_id,room?.zone].find(v=>typeof v==="string"&&v.trim())?.trim();
 const unlinkedRooms=(source,areas)=>{
  const hasAreas=Object.keys(areas||{}).length>0;
  return floorList(source).flatMap(floor=>items(floor.rooms)
   .filter(room=>!zoneOf(room)||(hasAreas&&!Object.hasOwn(areas,zoneOf(room))))
   .map(room=>floor===source?room.name||"Pièce":[floor.name||floor.id,room.name||"Pièce"].filter(Boolean).join(" / ")));
 };

 const registryFor=(deny,fallback,hass)=>{
  const entities=new Set(),devices=new Set(),areas=new Map();
  for(const id of deny){
   const reg=fallback?.[id];
   for(const entity of reg?.entities||[])areas.set(entity,id);
   for(const device of reg?.devices||[])devices.add(device);
  }
  for(const [id,device] of Object.entries(hass?.devices||{})){
   if(deny.has(device.area_id))devices.add(id);
   else devices.delete(id);
  }
  const live=hass?.entities||{};
  for(const [id,entry] of Object.entries(live)){
   const device=hass.devices?.[entry.device_id];
   if(entry.area_id||device||!entry.device_id)areas.set(id,entry.area_id||device?.area_id||null);
  }
  for(const [id,area] of areas){
   if(!deny.has(area))continue;
   entities.add(id);
   if(live[id]?.device_id)devices.add(live[id].device_id);
  }
  return {entities,devices,areas};
 };
 const references=value=>{
  if(typeof value==="string")return list(value).filter(id=>entityId.test(id));
  if(Array.isArray(value))return value.flatMap(references);
  if(value&&typeof value==="object")return Object.entries(value)
   .filter(([key])=>!["name","title","text","note"].includes(key))
   .flatMap(([key,child])=>[...(entityId.test(key)?[key]:[]),...references(child)]);
  return [];
 };
 const midpoint=seg=>Array.isArray(seg)&&seg.length===4?
  [(Number(seg[0])+Number(seg[2]))/2,(Number(seg[1])+Number(seg[3]))/2]:null;
 const locatedIn=(room,item,point,includeEdge=false)=>
  ((room.name&&item.room===room.name)||polygonContains(point,room.poly,includeEdge));
 const groupsIn=states=>Object.entries(states||{}).flatMap(([id,state])=>{
  const members=list(state?.attributes?.entity_id);
  return members.length?[[id,members]]:[];
 });
 const groupRestrictions=(entities,groups)=>{
  const parents=new Map();
  for(const [id,members] of groups){
   for(const member of members){
    if(!parents.has(member))parents.set(member,[]);
    parents.get(member).push(id);
   }
  }
  // Set visits entries added during iteration, including nested groups.
  for(const id of entities)for(const group of parents.get(id)||[])entities.add(group);
 };
 const OPENING_DATA=["entity","contact","shutter","shutter_only","tap","card","name","confirm",
  "protected","animation","shutter_animation"];
 const CLIMATE_DATA=["temperature","humidity","temperature_attribute","humidity_attribute"];
 const filterList=(owner,key,keep)=>{
  if(Array.isArray(owner[key]))owner[key]=owner[key].filter(keep);
 };
 const filtered=(source,deny,registry=registryFor(deny),groups=[])=>{
  const cfg=copy(source);
  const entities=new Set(registry.entities);
  if(!deny.size)return {cfg,count:0,entities};
  const floors=floorList(cfg);
  const locks=floors.map(floor=>items(floor.rooms).filter(room=>deny.has(zoneOf(room))));
  const count=locks.reduce((sum,rooms)=>sum+rooms.length,0);
  // Some Maquette elements predate registry assignments. Infer only for entities with no HA area.
  const infer=value=>{
   for(const id of references(value))if(!registry.areas.get(id))entities.add(id);
  };
  floors.forEach((floor,index)=>{
   const rooms=locks[index];
   for(const room of rooms)for(const key of CLIMATE_DATA.slice(0,2))infer(room[key]);
   for(const key of ["badges","furniture","texts"]){
    for(const item of items(floor[key]))if(rooms.some(room=>locatedIn(room,item,item.pos)))infer(item);
   }
   for(const opening of items(floor.openings)){
    if(rooms.some(room=>locatedIn(room,opening,midpoint(opening.seg),true)))infer(opening);
   }
  });
  groupRestrictions(entities,groups);
  const touches=value=>references(value).some(id=>entities.has(id));
  const panels=owner=>{
   if(!owner.panels||typeof owner.panels!=="object")return;
   for(const side of ["left","right"]){
    filterList(owner.panels,side,widget=>{
     // Keep safe rows of a mixed sensor list, but drop widgets driven by a restricted input.
     for(const key of ["rows","entities"])filterList(widget,key,row=>!touches(row));
     return !touches(widget)&&(!Array.isArray(widget.rows)||widget.rows.length>0)&&
      (!Array.isArray(widget.entities)||widget.entities.length>0);
    });
   }
  };
  for(const [index,floor] of floors.entries()){
   const locked=new Set(locks[index]);
   const inside=(item,pt=item.pos,includeEdge=false)=>locks[index].some(room=>locatedIn(room,item,pt,includeEdge));
   for(const room of items(floor.rooms)){
    if(locked.has(room)){
     // Keep the polygon and retain a native room label.
     room.area=zoneOf(room);
     room.name="🔒 "+String(room.name||"Pièce").replace(/^🔒\s*/,"");
     room.zoom=false;
     room.tap="";
     room.auto_actions=false;
     room.automations=false;
     delete room.actions;
     delete room.panels;
     for(const key of CLIMATE_DATA)delete room[key];
    }else{
     for(const key of CLIMATE_DATA)if(touches(room[key]))delete room[key];
     if(touches(room.tap))delete room.tap;
     filterList(room,"actions",action=>!touches(action)&&!blockedTargets(action.data,action.target,deny,{entities,devices:registry.devices}));
     panels(room);
    }
   }
   filterList(floor,"badges",badge=>!inside(badge)&&!touches(badge));
   filterList(floor,"texts",label=>!inside(label)&&!touches(label));
   if(Array.isArray(floor.furniture))floor.furniture=floor.furniture.map(item=>{
    if(!item||!(touches(item)||(inside(item)&&(references(item).length||item.card))))return item;
    // Maquette can index furniture for the energy layer. Retain the slot without any data or control.
    return {type:item.type,pos:item.pos,size:item.size,hidden:true};
   });
   for(const opening of items(floor.openings)){
    if(!inside(opening,midpoint(opening.seg),true)&&!touches(opening))continue;
    for(const key of OPENING_DATA)delete opening[key];
    opening.tap="none";
   }
   if(floor!==cfg)panels(floor);
  }
  panels(cfg);
  for(const key of ["summary","alerts"])filterList(cfg,key,item=>!touches(item));
  if(touches(cfg.presence))delete cfg.presence;
  for(const key of ["day_night","weather","people"]){
   if(touches(cfg.ambience?.[key]))delete cfg.ambience[key];
  }
  return {cfg,count,entities};
 };
 const blockedTargets=(data,target,deny,{entities,devices})=>
  [data,target].some(p=>p&&typeof p==="object"&&(
   list(p.area_id).some(id=>deny.has(id)||id==="all")||
   list(p.entity_id).some(id=>entities.has(id)||id==="all")||
   list(p.device_id).some(id=>devices.has(id)||id==="all")||
   (deny.size>0&&(list(p.floor_id).length>0||list(p.label_id).length>0))
  ));
 let cardHelperPromise;
 const helpers=()=>{
  if(typeof window.loadCardHelpers!=="function")return Promise.reject(Error("Home Assistant : cartes Lovelace indisponibles"));
  return cardHelperPromise||(cardHelperPromise=window.loadCardHelpers()
   .catch(e=>{cardHelperPromise=null;throw e;}));
 };
 class GuardCard extends HTMLElement{
  constructor(){
   super();
   this.attachShadow({mode:"open"});
   this._source=null;this._policy={};this._registry={};
   this._hass=null;this._child=null;this._deny=new Set();
   this._blockedEvent=e=>this._intercept(e);
   const style=document.createElement("style");
   style.textContent=[
    ":host{display:block}",
    ".note{font-size:12px;color:var(--secondary-text-color);padding:6px 3px}",
    ".note[hidden]{display:none}",
    ".error{color:var(--error-color,#c62828)}"
   ].join("\n");
   this._frame=document.createElement("div");
   this._note=document.createElement("div");
   this._note.className="note";this._note.hidden=true;
   this._note.setAttribute("aria-live","polite");
   this.shadowRoot.append(style,this._frame,this._note);
  }
  setConfig(cfg){
   if(!cfg?.card||cfg.card.type!=="custom:maquette-card")
    throw Error("KIMIA Maquette : la carte enfant doit être custom:maquette-card");
   this._source=cfg.card;
   this._policy=cfg.hidden_users_by_area||{};
   this._registry=cfg.entities_by_area||{};
   this._input=null;
   this._update();
  }
  set hass(hass){this._hass=hass;this._update();}
  getCardSize(){return this._child?.getCardSize?.()||6;}
  getGridOptions(){return this._child?.getGridOptions?.()||{columns:12,rows:6};}
  connectedCallback(){this._update();}
  _noteText(txt,error=false){
   this._note.hidden=!txt;this._note.textContent=txt||"";
   this._note.className="note"+(error?" error":"");
  }
  _create(){
   if(this._child||this._loading||!this._source||!this._hass?.user?.id)return;
   this._loading=true;
   void helpers().then(h=>{
    if(typeof h?.createCardElement!=="function")throw Error("Créateur Lovelace indisponible");
    const c=h.createCardElement({type:"custom:maquette-card"});
    for(const ev of ["click","pointerdown","change","keydown","hass-more-info"])
     c.addEventListener(ev,this._blockedEvent,true);
    this._child=c;this._frame.replaceChildren(c);
    this._loading=false;
    this._update();
   }).catch(e=>{
    this._child=null;this._frame.replaceChildren();
    this._loading=false;this._noteText("Maquette indisponible : "+(e?.message||e),true);
   });
  }
  _update(){
   const hass=this._hass,user=hass?.user;
   if(!this._source||!user?.id){
    this._account=null;this._child=null;this._frame.replaceChildren();
    return;
   }
   const account=JSON.stringify([user.id,!!user.is_admin]);
   if(this._account!==account){
    this._account=account;this._child=null;this._input=null;
    this._frame.replaceChildren();this._noteText("");
   }
   if(!this._child){this._create();return;}
   const deny=denyAreas(hass,this._policy);
   const groups=deny.size?groupsIn(hass.states):[];
   const inputs=[this._source,this._policy,this._registry,hass.areas,hass.devices,hass.entities,JSON.stringify(groups)];
   if(!this._input||inputs.some((v,i)=>v!==this._input[i])||inputs.length!==this._input.length){
    const registry=registryFor(deny,this._registry,hass);
    const view=filtered(this._source,deny,registry,groups);
    const signature=JSON.stringify(view.cfg);
    this._deny=deny;this._forbidden={entities:view.entities,devices:registry.devices};
    if(signature!==this._signature||this._configuredChild!==this._child){
     if(this._configuredChild===this._child && deny.size){
      if(this._child._rp)this._child._replayFermer?.();
      this._child.revenirAuPlan?.();
     }
     this._child.setConfig(view.cfg);
     this._signature=signature;this._configuredChild=this._child;
    }
    this._input=inputs;
    if(user.is_admin){
     const unlinked=unlinkedRooms(this._source,hass.areas);
     this._noteText(unlinked.length?"Pièces sans zone Home Assistant : "+unlinked.join(", ")+".":"");
    } else if(view.count)this._noteText("🔒 "+view.count+" pièce(s) verrouillée(s) pour ce compte.");
    else this._noteText("");
   }
   if(!deny.size){this._child.hass=hass;return;}
   // Maquette resolves live statuses and related entities from hass. Restrict only its own copy.
   const isolated=Object.create(hass);
   isolated.states=Object.fromEntries(Object.entries(hass.states||{}).filter(([id])=>!this._blockedEntity(id)));
   if(hass.callService)isolated.callService=(domain,service,data,target)=>{
    if(blockedTargets(data,target,this._deny,this._forbidden))
     return Promise.reject(Error("KIMIA : appareil d'une pièce verrouillée"));
    return hass.callService(domain,service,data,target);
   };
   this._child.hass=isolated;
  }
  _intercept(ev){
   if(!this._deny.size||!this._child)return;
   const rooms=this._child._config?.pieces||[]; // Rooms on the currently selected Maquette floor.
   let forbidden=this._blockedEntity(ev.detail?.entityId);
   for(const node of ev.composedPath?.()||[]){
    const d=node?.dataset;
    if(!d)continue;
    const index=d.l??d.p;
    if(this._deny.has(rooms[index]?.zone)||this._blockedEntity(d.e))forbidden=true;
   }
   if(!forbidden)return;
   ev.preventDefault();ev.stopImmediatePropagation();ev.stopPropagation();
   if(ev.type==="click")this._noteText("🔒 Cette pièce est verrouillée pour votre compte.");
  }
  _blockedEntity(entity){
   return this._forbidden?.entities.has(entity)===true;
  }
 }
 customElements.define(TAG,GuardCard);
 window.KimiaMaquetteACL=Object.freeze({denyAreas,filtered,blockedTargets,registryFor,unlinkedRooms,groupsIn});
 window.customCards=window.customCards||[];
 if(!window.customCards.some(c=>c.type===TAG))
  window.customCards.push({type:TAG,name:"KIMIA · Maquette par utilisateur",
   description:"Plan libre, pièces visibles mais verrouillées selon leurs zones Home Assistant."});
})();
