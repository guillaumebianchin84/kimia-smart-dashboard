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
 const list=x=>Array.isArray(x)?x:(typeof x==="string"?x.split(",").map(s=>s.trim()).filter(Boolean):[]);
 const polygonContains=(pt,poly)=>{
  if(!Array.isArray(pt)||!Array.isArray(poly)||poly.length<3)return false;
  const x=Number(pt[0]),y=Number(pt[1]);
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if(!Array.isArray(a)||!Array.isArray(b))continue;
   const ax=Number(a[0]),ay=Number(a[1]),bx=Number(b[0]),by=Number(b[1]);
   if(![ax,ay,bx,by].every(Number.isFinite))continue;
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
 };
 const floorList=cfg=>Array.isArray(cfg.floors)&&cfg.floors.length?cfg.floors:[cfg];
 const denyAreas=(hass,policy)=>{
  if(!hass?.user||hass.user.is_admin)return new Set();
  const id=hass.user.id;
  if(!id)return new Set();
  return new Set(Object.entries(policy||{})
   .filter(([area,ids])=>area&&Array.isArray(ids)&&ids.includes(id))
   .map(([area])=>area));
 };
 const zoneOf=r=>typeof r?.area==="string"?r.area:
                 typeof r?.zone==="string"?r.zone:"";
 const lockedRooms=(floor,deny)=>Array.isArray(floor?.rooms)
  ?floor.rooms.filter(r=>deny.has(zoneOf(r))):[];
 const guardFloor=(floor,deny)=>{
  const locked=lockedRooms(floor,deny),polys=locked.map(r=>r.poly).filter(Array.isArray);
  for(const room of locked){
   room.name=String(room.name||"Pièce").replace(/^🔒\s*/,"");
   room.name="🔒 "+room.name;
   room.zoom=false;
   room.tap="";
   room.auto_actions=false;
   room.automations=false;
   room.actions=[];
   // Pas de widgets propres à une pièce dont l'utilisateur est exclu.
   room.panels={left:[],right:[]};
  }
  const inLocked=pt=>polys.some(poly=>polygonContains(pt,poly));
  for(const field of ["badges","furniture"]){
   for(const item of floor[field]||[]){
    if(inLocked(item.pos)){item.tap="none";if(item.action)delete item.action;}
   }
  }
  for(const opening of floor.openings||[]){
   const s=opening.seg;
   if(Array.isArray(s)&&s.length===4&&inLocked([(s[0]+s[2])/2,(s[1]+s[3])/2])){
    opening.tap="none";
   }
  }
  return locked.length;
 };
 const filtered=(source,deny)=>{
  const cfg=copy(source);
  let count=0;
  for(const floor of floorList(cfg))count+=guardFloor(floor,deny);
  return {cfg,count};
 };
 const blockedTargets=(data,target,deny,registry)=>{
  const forbiddenEntity=new Set(),forbiddenDevice=new Set();
  for(const id of deny){
   const reg=registry?.[id];
   for(const e of reg?.entities||[])forbiddenEntity.add(e);
   for(const d of reg?.devices||[])forbiddenDevice.add(d);
  }
  for(const p of [data,target]){
   if(!p||typeof p!=="object")continue;
   if(list(p.area_id).some(x=>deny.has(x)))return true;
   if(list(p.entity_id).some(x=>forbiddenEntity.has(x)))return true;
   if(list(p.device_id).some(x=>forbiddenDevice.has(x)))return true;
  }
  return false;
 };
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
   this._signature=null;this._request=0;
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
   if(this._child||this._loading||!this._source)return;
   this._loading=true;
   const req=++this._request;
   void helpers().then(h=>{
    if(req!==this._request)return;
    if(typeof h?.createCardElement!=="function")throw Error("Créateur Lovelace indisponible");
    const c=h.createCardElement({type:"custom:maquette-card"});
    for(const ev of ["click","pointerdown","change","keydown"])
     c.addEventListener(ev,this._blockedEvent,true);
    this._child=c;this._frame.replaceChildren(c);
    this._loading=false;
    this._update();
   }).catch(e=>{
    if(req!==this._request)return;
    this._loading=false;this._noteText("Maquette indisponible : "+(e?.message||e),true);
   });
  }
  _update(){
   if(!this._source)return;
   this._deny=denyAreas(this._hass,this._policy);
   if(!this._child){this._create();return;}
   if(!this._hass)return;
   const signature=JSON.stringify([this._source,[...this._deny].sort()]);
   if(signature!==this._signature){
    const {cfg,count}=filtered(this._source,this._deny);
    this._child.setConfig(cfg);
    this._signature=signature;
    if(count)this._noteText("🔒 "+count+" pièce(s) verrouillée(s) pour ce compte.");
    else this._noteText("");
   }
   // Proxy limité à cette instance Maquette : aucune modification du hass global.
   // Défense supplémentaire, particulièrement pour les commandes de widgets.
   if(this._deny.size && this._hass.callService){
    const source=this._hass,deny=this._deny,registry=this._registry;
    const isolated=Object.create(source);
    isolated.callService=(domain,service,data,target)=>{
     if(blockedTargets(data,target,deny,registry))
      return Promise.reject(Error("KIMIA : appareil d'une pièce verrouillée"));
     return source.callService(domain,service,data,target);
    };
    this._child.hass=isolated;
   }else this._child.hass=this._hass;
  }
  _intercept(ev){
   if(!this._deny.size||!this._child)return;
   const cfg=this._child._config; // Maquette v0.4.0 : étage courant, normalisé.
   if(!cfg||!Array.isArray(cfg.pieces))return;
   const locked=cfg.pieces.filter(r=>this._deny.has(r.zone));
   if(!locked.length)return;
   const poly=pt=>locked.some(r=>polygonContains(pt,r.poly));
   const idx=(value,arr)=>value==null?null:arr?.[Number(value)];
   let forbidden=cfg.pieces[this._child._iso]&&this._deny.has(cfg.pieces[this._child._iso].zone);
   for(const node of ev.composedPath?.()||[]){
    const d=node?.dataset;
    if(!d)continue;
    const room=idx(d.l??d.p,cfg.pieces);
    if(room&&this._deny.has(room.zone))forbidden=true;
    const badge=idx(d.q??d.fq,cfg.points);
    if(badge&&(poly(badge.pos)||this._blockedEntity(badge.entite)))forbidden=true;
    const furniture=idx(d.mbq??d.mb,cfg.meubles);
    if(furniture&&poly(furniture.pos))forbidden=true;
    const opening=idx(d.o??d.fo,cfg.ouvertures);
    if(opening&&Array.isArray(opening.seg)&&opening.seg.length===4 &&
      poly([(opening.seg[0]+opening.seg[2])/2,(opening.seg[1]+opening.seg[3])/2]))
     forbidden=true;
    if(d.e&&this._blockedEntity(d.e))forbidden=true;
   }
   if(!forbidden)return;
   ev.preventDefault();ev.stopImmediatePropagation();ev.stopPropagation();
   if(ev.type==="click")this._noteText("🔒 Cette pièce est verrouillée pour votre compte.");
  }
  _blockedEntity(entity){
   if(!entity)return false;
   return [...this._deny].some(area=>(this._registry[area]?.entities||[]).includes(entity));
  }
 }
 customElements.define(TAG,GuardCard);
 window.KimiaMaquetteACL=Object.freeze({denyAreas,guardFloor,filtered,blockedTargets,polygonContains});
 window.customCards=window.customCards||[];
 if(!window.customCards.some(c=>c.type===TAG))
  window.customCards.push({type:TAG,name:"KIMIA · Maquette par utilisateur",
   description:"Plan libre, pièces visibles mais verrouillées selon leurs zones Home Assistant."});
})();
