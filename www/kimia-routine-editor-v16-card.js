/* KIMIA V1.6 — atelier commun Scénarios & Automatisations.
 * Compatible scripts V1.4 (ks_) en lecture/édition si modèle simple.
 * Seules les routines reconnues KIMIA sont éditables et jamais écrasées sans vérification.
 * Nécessite /local/kimia-routine-engine-v16.js chargé avant cette ressource.
 */
(()=>{
 "use strict";
 const TAG="kimia-routine-editor-v16-card";
 if(customElements.get(TAG))return;
 const H=()=>window.KimiaRoutineEngineV16;
 const n=(tag,text,cls)=>{
  const v=document.createElement(tag);
  if(text!==undefined)v.textContent=text;
  if(cls)v.className=cls;
  return v;
 };
 const css=[
 ":host{display:block;color:var(--primary-text-color)}",
 "ha-card{display:block;border-radius:18px;padding:19px;background:var(--card-background-color)}",
 "h2{font-size:21px;margin:0 0 7px}h3{font-size:18px;margin:0}h4{font-size:15px;margin:6px 0}",
 "p,.help{font-size:13px;line-height:1.5;color:var(--secondary-text-color)}",
 ".top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0}",
 ".grow{flex:1;min-width:160px}",
 "label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:650;min-width:105px;flex:1}",
 "input,select,textarea{box-sizing:border-box;min-width:0;width:100%;padding:10px 9px;border-radius:9px;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit}",
 "input[type=checkbox]{width:18px;height:18px;min-width:18px;accent-color:var(--primary-color)}",
 "textarea{min-height:65px;resize:vertical}",
 "button{font:inherit;font-weight:650;border:0;border-radius:10px;cursor:pointer;padding:10px 13px;background:var(--primary-color);color:var(--text-primary-color,#fff)}",
 "button.secondary{background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}",
 "button.mini{padding:5px 9px;font-size:12px;min-width:31px}",
 "button:disabled{opacity:.42;cursor:default}",
 ".tabs{display:flex;gap:7px;flex-wrap:wrap;margin:15px 0}",
 ".tabs button{flex:1;min-width:150px}",
 ".tabs button:not(.chosen){background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}",
 ".section{margin:20px 0 12px;padding:14px;border:1px solid var(--divider-color);border-radius:15px}",
 ".sectionhead{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap}",
 ".items{display:flex;flex-direction:column;gap:10px;margin-top:13px}",
 ".block{border:1px solid var(--divider-color);border-radius:12px;padding:11px;background:var(--card-background-color)}",
 ".blockhead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:11px}",
 ".blockhead strong{flex:1;min-width:125px;font-size:14px}",
 ".fields{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-top:8px}",
 ".nested{margin-top:12px;margin-left:11px;padding-left:10px;border-left:3px solid var(--divider-color)}",
 ".nested .section{margin:9px 0;padding:10px}",
 ".drag{cursor:grab;touch-action:pan-y}",
 ".drag:active{cursor:grabbing}",
 ".choice{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
 ".choice select{max-width:220px}",
 ".muted{color:var(--secondary-text-color);font-size:12px}",
 ".status{background:var(--secondary-background-color);border-radius:9px;padding:11px;font-size:13px;line-height:1.5;overflow-wrap:anywhere}",
 ".error{color:var(--error-color,#cc5454)}",
 ".days{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}",
 ".day{display:flex;align-items:center;gap:5px;font-size:12px;min-width:auto;flex:none;border:1px solid var(--divider-color);padding:7px;border-radius:8px}",
 ".footer{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:15px 0}",
 ".divider{border-top:1px solid var(--divider-color);margin:17px 0}",
 ".khelp{margin:5px 0 12px}",
 "@media(max-width:560px){ha-card{padding:12px}.blockhead{gap:4px}.fields label{min-width:135px}.nested{margin-left:4px;padding-left:7px}.section{padding:10px}}"
 ].join("\n");
 const TRIG_TYPES=[["state","Changement d'état"],["numeric_state","Seuil numérique"],["time","Heure fixe"],["sun","Soleil"]];
 const COND_TYPES=[["state","État d'un appareil"],["numeric_state","Seuil numérique"],["time","Heure / jours"],["sun","Jour / nuit"],["and","ET (toutes)"],["or","OU (une suffit)"],["not","NON (aucune)"]];
 const ACTION_TYPES=[["call","Commander un appareil"],["delay","Attendre"],["wait_state","Attendre un capteur"],["condition","Arrêter si condition fausse"],["if","Si / Alors / Sinon"],["repeat","Répéter des actions"]];
 const MODES=[["single","Ignorer les nouveaux déclenchements"],["restart","Recommencer au déclenchement suivant"],["queued","Exécuter dans l'ordre (file d'attente)"],["parallel","Autoriser plusieurs exécutions"]];
 const WEEK=[["mon","Lun"],["tue","Mar"],["wed","Mer"],["thu","Jeu"],["fri","Ven"],["sat","Sam"],["sun","Dim"]];
 const desc=(model,kind)=>kind==="trigger"?
  model.type==="time"?"À "+(model.at||"…"):model.type==="sun"?(model.event==="sunset"?"Au coucher du soleil":"Au lever du soleil"):
  (model.entity||"Appareil")+" → "+(model.type==="state"?(model.to||"état modifié"):"seuil"):
  kind==="condition"?model.type==="and"?"Toutes les conditions":model.type==="or"?"Au moins une condition":
  model.type==="not"?"Aucune condition":(model.entity||"Condition")+" ("+model.type+")":
  model.type==="if"?"Si / Alors / Sinon":model.type==="delay"?"Attendre "+model.seconds+" s":
  model.type==="repeat"?"Répéter "+model.count+" fois":model.type==="call"?(model.entity||"Appareil")+" · "+(model.operation||"action"):model.type;
 class Editor extends HTMLElement{
  constructor(){
   super();this.attachShadow({mode:"open"});
   this._hass=null;this._started=false;this._busy=false;
   this._draft=null;this._editing=null;this._baseline=null;
   this._catalog=[];this._selected="";this._notice="";this._error="";
   this._drag=null;this._render();
  }
  setConfig(cfg){this._cfg=cfg||{};}
  set hass(hass){
   this._hass=hass;
   if(hass&&!this._started){this._started=true;this._draft=H()?.create("script")||null;this._catalogRefresh();this._render();}
  }
  getCardSize(){return 14;}
  _admin(){return this._hass?.user?.is_admin===true;}
  _catalogRefresh(){
   const found=[];
   for(const [entityId,obj] of Object.entries(this._hass?.states||{})){
    const [domain,objId]=entityId.split(".");
    if(domain==="script"&&(/^(ks_|kimia_)/.test(objId))){
     // V1.4 stocke les clés ks_ sous la même forme que l'entity_id.
     found.push({kind:"script",id:objId,entityId,name:obj.attributes?.friendly_name||entityId});
    }
    if(domain==="automation"&&String(obj.attributes?.id||"").startsWith("kimia_"))
     found.push({kind:"automation",id:String(obj.attributes.id),entityId,name:obj.attributes?.friendly_name||entityId});
   }
   found.sort((a,b)=>a.name.localeCompare(b.name,"fr"));
   this._catalog=found;
  }
  _message(message,error=false){
   this._error=error?message:"";this._notice=error?"":message;this._render();
  }
  _button(label,click,cls="secondary",disabled=false){
   const b=n("button",label,cls);b.type="button";b.disabled=disabled||this._busy;
   b.addEventListener("click",click);return b;
  }
  _field(label,value,change,opt={}){
   const wrap=n("label"),text=n("span",label);
   const input=n(opt.multiline?"textarea":"input");
   if(!opt.multiline)input.type=opt.type||"text";
   input.value=value==null?"":String(value);
   if(opt.min!==undefined)input.min=String(opt.min);
   if(opt.max!==undefined)input.max=String(opt.max);
   if(opt.step!==undefined)input.step=String(opt.step);
   input.disabled=this._busy;input.placeholder=opt.placeholder||"";
   input.addEventListener(opt.type==="number"?"change":"input",()=>change(input.value));
   wrap.append(text,input);return wrap;
  }
  _selector(label,value,choices,change){
   const wrap=n("label");wrap.append(n("span",label));
   const select=n("select");select.disabled=this._busy;
   for(const [val,title] of choices){
    const op=n("option",title);op.value=val;select.append(op);
   }
   select.value=value??"";
   if(select.value!==value && value){const op=n("option",value+" (non disponible)");op.value=value;op.selected=true;select.append(op);}
   select.addEventListener("change",()=>change(select.value));
   wrap.append(select);return wrap;
  }
  _entities(allowed){
   const all=Object.keys(this._hass?.states||{}).filter(id=>allowed(id)&&
    this._hass.states[id]?.state!=="unavailable").sort((a,b)=>
      (this._hass.states[a].attributes?.friendly_name||a).localeCompare(
      this._hass.states[b].attributes?.friendly_name||b,"fr"));
   return [["","Choisir un appareil ou capteur"],...all.map(id=>[
     id,(this._hass.states[id].attributes?.friendly_name||id)+" · "+id
   ])];
  }
  _entity(label,value,change,filter=()=>true){
   return this._selector(label,value,this._entities(filter),change);
  }
  _choice(label,field,choices,change){
   return this._selector(label,field,choices,change);
  }
  _nested(parent,list,kind,title,depth){
   const wrap=n("div",undefined,"nested");
   this._section(wrap,list,kind,title,depth);
   parent.append(wrap);
  }
  _section(parent,list,kind,title,depth=0){
   const section=n("section",undefined,"section"),head=n("div",undefined,"sectionhead");
   head.append(n(depth>0?"h4":"h3",title));
   const add=n("div",undefined,"choice");
   const types=kind==="trigger"?TRIG_TYPES:kind==="condition"?COND_TYPES:ACTION_TYPES;
   const picker=n("select");picker.setAttribute("aria-label","Type de bloc : "+title);
   for(const [key,title] of types){const option=n("option",title);option.value=key;picker.append(option);}
   const addBtn=this._button("+ Ajouter",()=>{
    if(list.length>=25)return this._message("Limite de 25 blocs par section.",true);
    list.push(kind==="trigger"?H().trigger(picker.value):
      kind==="condition"?H().condition(picker.value):H().action(picker.value));
    this._render();
   },"secondary");
   if(depth>=5)addBtn.disabled=true;
   add.append(picker,addBtn);head.append(add);section.append(head);
   if(!list.length)section.append(n("p","Aucun bloc. Ajoutez-en un ci-dessus.","muted"));
   const container=n("div",undefined,"items");
   list.forEach((step,i)=>container.append(this._block(step,list,i,kind,depth)));
   section.append(container);parent.append(section);
  }
  _block(step,list,i,kind,depth){
   const box=n("div",undefined,"block");
   const head=n("div",undefined,"blockhead");
   const grip=n("button","⠿","secondary mini drag");
   grip.type="button";grip.draggable=!this._busy;
   grip.title="Déplacer par glisser-déposer";
   grip.addEventListener("dragstart",event=>{
    this._drag={list,index:i};
    event.dataTransfer?.setData("text/plain","kimia-routine-block");
    if(event.dataTransfer)event.dataTransfer.effectAllowed="move";
   });
   grip.addEventListener("dragend",()=>{this._drag=null;});
   box.addEventListener("dragover",e=>{if(this._drag?.list===list)e.preventDefault();});
   box.addEventListener("drop",e=>{
    if(this._drag?.list!==list)return;
    e.preventDefault();
    const original=this._drag.index;this._drag=null;
    if(original!==i){const [m]=list.splice(original,1);list.splice(i,0,m);this._render();}
   });
   head.append(grip,n("strong",String(i+1)+". "+desc(step,kind)));
   head.append(this._button("↑",()=>{
    if(i>0){[list[i-1],list[i]]=[list[i],list[i-1]];this._render();}
   },"secondary mini",i===0));
   head.append(this._button("↓",()=>{
    if(i<list.length-1){[list[i],list[i+1]]=[list[i+1],list[i]];this._render();}
   },"secondary mini",i===list.length-1));
   head.append(this._button("⧉",()=>{
    if(list.length>=25)return this._message("Maximum 25 blocs.",true);
    list.splice(i+1,0,H().clone(step));this._render();
   },"secondary mini"));
   head.append(this._button("✕",()=>{list.splice(i,1);this._render();},"secondary mini"));
   box.append(head);
   const body=n("div",undefined,"fields");
   const types=kind==="trigger"?TRIG_TYPES:kind==="condition"?COND_TYPES:ACTION_TYPES;
   body.append(this._choice("Type",step.type,types,value=>{
    list[i]=kind==="trigger"?H().trigger(value):kind==="condition"?H().condition(value):H().action(value);
    this._render();
   }));
   if(kind==="trigger")this._triggerControls(body,step);
   else if(kind==="condition")this._conditionControls(body,step,depth,box);
   else this._actionControls(body,step,depth,box);
   box.append(body);return box;
  }
  _stateControl(wrap,step,kind){
   wrap.append(this._entity(kind==="trigger"?"Capteur / appareil":"Appareil / capteur",
    step.entity,v=>{step.entity=v;}));
  }
  _numericControls(wrap,step){
   this._stateControl(wrap,step,"condition");
   wrap.append(this._field("Supérieur à",step.above,v=>{step.above=v;},
    {type:"number",step:"any",placeholder:"Optionnel"}));
   wrap.append(this._field("Inférieur à",step.below,v=>{step.below=v;},
    {type:"number",step:"any",placeholder:"Optionnel"}));
  }
  _triggerControls(row,step){
   if(step.type==="time")
    row.append(this._field("Heure",step.at,v=>step.at=v,{type:"time"}));
   else if(step.type==="sun"){
    row.append(this._choice("Événement",step.event,
      [["sunset","Coucher du soleil"],["sunrise","Lever du soleil"]],v=>step.event=v));
    row.append(this._field("Décalage (minutes)",step.offset,v=>step.offset=v,{type:"number",min:-720,max:720}));
   }else if(step.type==="numeric_state")this._numericControls(row,step);
   else{
    this._stateControl(row,step,"trigger");
    row.append(this._field("Nouvel état",step.to,v=>step.to=v,{placeholder:"on, off, home…"}));
    row.append(this._field("État précédent (facultatif)",step.from,v=>step.from=v));
    row.append(this._field("Maintenir pendant (s)",step.seconds,v=>step.seconds=v,{type:"number",min:0,max:86400}));
   }
  }
  _conditionControls(row,step,depth,box){
   if(["and","or","not"].includes(step.type)){
    this._nested(box,step.conditions,"condition","Conditions du groupe "+step.type.toUpperCase(),depth+1);
   }else if(step.type==="state"){
    this._stateControl(row,step,"condition");
    row.append(this._field("État attendu",step.state,v=>step.state=v,{placeholder:"on, off, home…"}));
   }else if(step.type==="numeric_state")this._numericControls(row,step);
   else if(step.type==="sun"){
    row.append(this._choice("Après",step.after,[["sunset","Coucher du soleil"],["sunrise","Lever du soleil"]],v=>step.after=v));
    row.append(this._choice("Avant",step.before,[["sunrise","Lever du soleil"],["sunset","Coucher du soleil"]],v=>step.before=v));
   }else if(step.type==="time"){
    row.append(this._field("Après",step.after,v=>step.after=v,{type:"time"}));
    row.append(this._field("Avant",step.before,v=>step.before=v,{type:"time"}));
    const days=n("div",undefined,"days");
    for(const [day,title] of WEEK){
     const lab=n("label",undefined,"day"),check=n("input");
     check.type="checkbox";check.checked=(step.weekdays||[]).includes(day);check.disabled=this._busy;
     check.addEventListener("change",()=>{
      const current=new Set(step.weekdays||[]);
      if(check.checked)current.add(day);else current.delete(day);
      step.weekdays=[...current];
     });
     lab.append(check,n("span",title));days.append(lab);
    }
    box.append(days);
   }
  }
  _actionControls(row,step,depth,box){
   if(step.type==="call"){
    row.append(this._entity("Équipement",step.entity,v=>{
     step.entity=v;
     const domain=v.split(".")[0],ops=H().OPERATIONS[domain]||[];
     step.operation=ops[0]?.[0]||"";step.value="";
     this._render();
    },id=>Boolean(H().OPERATIONS[id.split(".")[0]])));
    const operations=H().OPERATIONS[step.entity?.split(".")[0]]||[];
    row.append(this._choice("Commande",step.operation,operations,v=>{
      step.operation=v;step.value="";this._render();
    }));
    if(["set_temperature","set_cover_position","volume_set"].includes(step.operation)){
     const opts=step.operation==="set_temperature"?{min:5,max:40,step:".5"}:
       step.operation==="set_cover_position"?{min:0,max:100,step:1}:{min:0,max:1,step:".05"};
     row.append(this._field(step.operation==="set_temperature"?"Température (°C)":
      step.operation==="volume_set"?"Volume (0–1)":"Position (%)",
      step.value,v=>step.value=v,{type:"number",...opts}));
    }
   }else if(step.type==="delay"){
    row.append(this._field("Durée en secondes",step.seconds,v=>step.seconds=v,
      {type:"number",min:1,max:86400}));
   }else if(step.type==="wait_state"){
    row.append(this._entity("Capteur à surveiller",step.entity,v=>step.entity=v));
    row.append(this._field("Attendre l'état",step.to,v=>step.to=v));
    row.append(this._field("Temps maximum (s)",step.timeout,v=>step.timeout=v,
      {type:"number",min:1,max:86400}));
    box.append(n("p","Si le capteur ne change pas d'état dans ce délai, la routine s'arrête.","muted"));
   }else if(step.type==="condition"){
    const sub=n("div",undefined,"nested");box.append(sub);
    const select=this._choice("Type de condition",step.condition.type,COND_TYPES,v=>{
     step.condition=H().condition(v);this._render();
    });
    sub.append(select);
    const f=n("div",undefined,"fields");sub.append(f);
    this._conditionControls(f,step.condition,depth+1,sub);
   }else if(step.type==="if"){
    this._nested(box,step.conditions,"condition","SI — tester ces conditions",depth+1);
    this._nested(box,step.then,"action","ALORS — actions exécutées",depth+1);
    this._nested(box,step.else,"action","SINON — actions facultatives",depth+1);
   }else if(step.type==="repeat"){
    row.append(this._field("Nombre de répétitions (max. 20)",step.count,v=>step.count=v,
      {type:"number",min:1,max:20,step:1}));
    this._nested(box,step.actions,"action","Actions à répéter",depth+1);
   }
  }
  _currentUrl(){
   if(!this._editing)return "";
   return "config/"+(this._editing.kind==="script"?"script":"automation")+"/config/"+encodeURIComponent(this._editing.id);
  }
  _new(kind){
   this._editing=null;this._baseline=null;this._draft=H().create(kind);
   this._selected="";this._error="";this._notice="Nouvelle routine : choisissez vos blocs et enregistrez.";
   this._render();
  }
  _duplicate(){
   if(!this._draft)return;
   this._draft=H().clone(this._draft);
   this._draft.alias="Copie de "+this._draft.alias;
   this._editing=null;this._baseline=null;
   this._selected="";this._message("La copie n'a pas encore été enregistrée.");
  }
  async _open(){
   if(this._busy||!this._admin())return;
   const entry=this._catalog.find(c=>c.kind+":"+c.id===this._selected);
   if(!entry){this._message("Sélectionnez d'abord un scénario ou une automatisation KIMIA.",true);return;}
   this._busy=true;this._render();
   try{
    const url="config/"+entry.kind+"/config/"+encodeURIComponent(entry.id);
    const raw=await this._hass.callApi("GET",url);
    const draft=H().deserialize(raw,entry.kind);
    this._editing={...entry};this._baseline=H().clone(raw);this._draft=draft;
    this._error="";this._notice="Routine chargée. Les changements restent locaux jusqu'à l'enregistrement.";
   }catch(e){
    this._error="Ouverture impossible : "+(e?.message||e)+
      " Aucune donnée HA n'a été modifiée.";
   }finally{this._busy=false;this._render();}
  }
  _generateId(){
   const prefix=this._draft.kind==="script"?"ks_":"kimia_";
   return prefix+H().slug(this._draft.alias||"routine")+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6);
  }
  async _save(){
   if(this._busy||!this._admin()||!this._draft)return;
   const editing=this._editing,kind=this._draft.kind,id=editing?.id||this._generateId();
   let data;
   try{data=H().serialize(this._draft,id);}
   catch(e){this._message("Vérifiez les blocs : "+(e.message||e),true);return;}
   if(typeof this._hass.callApi!=="function"){this._message("API Home Assistant inaccessible.",true);return;}
   this._busy=true;this._render();
   try{
    const url="config/"+kind+"/config/"+encodeURIComponent(id);
    if(editing){
     const latest=await this._hass.callApi("GET",url);
     if(JSON.stringify(latest)!==JSON.stringify(this._baseline))
      throw Error("Cette routine a été modifiée ailleurs. Rechargez-la avant d'enregistrer.");
    }else{
     // Les IDs aléatoires incluent date et suffixe. Vérifier quand même le serveur.
     let existing=null;
     try{existing=await this._hass.callApi("GET",url);}
     catch(e){if(e?.status!==404&&e?.status_code!==404&&!/404|Not Found/i.test(String(e?.message||e)))throw e;}
     if(existing)throw Error("Identifiant déjà existant. Création refusée.");
    }
    await this._hass.callApi("POST",url,data);
    this._editing={kind,id,entityId:editing?.entityId||"",name:this._draft.alias};
    try{this._baseline=H().clone(await this._hass.callApi("GET",url));}
    catch{this._baseline=null;}
    this._notice="Enregistré dans Home Assistant : "+this._draft.alias+
      ". Rafraîchissez la liste si cette nouvelle routine n'y apparaît pas encore.";
    this._error="";this._catalogRefresh();
   }catch(e){this._error="Enregistrement refusé : "+(e?.message||e);this._notice="";}
   finally{this._busy=false;this._render();}
  }
  async _remove(){
   if(this._busy||!this._admin()||!this._editing)return;
   if(!window.confirm("Supprimer définitivement la routine « "+this._draft.alias+" » ? Cette opération est irréversible."))return;
   this._busy=true;this._render();
   try{
    const latest=await this._hass.callApi("GET",this._currentUrl());
    if(JSON.stringify(latest)!==JSON.stringify(this._baseline))
     throw Error("Routine modifiée entre-temps. Suppression refusée : rechargez.");
    await this._hass.callApi("DELETE",this._currentUrl());
    const kind=this._editing.kind;
    this._editing=null;this._baseline=null;this._draft=H().create(kind);
    this._catalogRefresh();this._selected="";
    this._error="";this._notice="Routine supprimée de Home Assistant.";
   }catch(e){this._error="Suppression refusée : "+(e?.message||e);this._notice="";}
   finally{this._busy=false;this._render();}
  }
  _statusCard(card){
   const msg=this._error||this._notice;
   if(msg)card.append(n("div",msg,"status"+(this._error?" error":"")));
  }
  _render(){
   const style=n("style",css),card=n("ha-card");
   card.append(n("h2","Atelier KIMIA · Scénarios et automatisations"));
   card.append(n("p","Composez vos routines sans YAML. Les scénarios se lancent manuellement ; les automatisations réagissent à un événement et vérifient leurs conditions."));
   if(!H()){
    card.append(n("div","Module kimia-routine-engine-v16.js manquant ou chargé après l'éditeur.","status error"));
    this.shadowRoot.replaceChildren(style,card);return;
   }
   if(!this._admin()){
    card.append(n("div","Création et modification réservées à l'administrateur KIMIA.","status"));
    this.shadowRoot.replaceChildren(style,card);return;
   }
   if(!this._draft)this._draft=H().create("script");
   const pickrow=n("div",undefined,"top"),sel=n("select",undefined,"grow");
   sel.setAttribute("aria-label","Routine KIMIA enregistrée");
   const first=n("option","— Choisir une routine enregistrée —");first.value="";sel.append(first);
   for(const rec of this._catalog){
    const o=n("option",(rec.kind==="script"?"Scénario · ":"Automatisation · ")+rec.name);
    o.value=rec.kind+":"+rec.id;sel.append(o);
   }
   sel.value=this._selected;
   sel.disabled=this._busy;sel.addEventListener("change",()=>{this._selected=sel.value;});
   pickrow.append(sel);
   pickrow.append(this._button("Ouvrir",()=>void this._open(),"secondary",!this._catalog.length));
   pickrow.append(this._button("↻ Liste",()=>{this._catalogRefresh();this._render();}));
   card.append(pickrow);
   const tabs=n("div",undefined,"tabs");
   tabs.append(this._button("Scénario (manuel)",()=>this._new("script"),
    this._draft.kind==="script"?"chosen":"",false));
   tabs.append(this._button("Automatisation",()=>this._new("automation"),
    this._draft.kind==="automation"?"chosen":"",false));
   card.append(tabs);
   if(this._editing){
    card.append(n("p","Édition : "+this._editing.name+" · Seules les routines KIMIA prises en charge peuvent être modifiées.","muted"));
   }
   const basics=n("div",undefined,"fields");
   basics.append(this._field("Nom",this._draft.alias,v=>this._draft.alias=v,
     {placeholder:"Ex. Bonne nuit",maxLength:70}));
   basics.append(this._choice("Exécutions simultanées",this._draft.mode,MODES,v=>this._draft.mode=v));
   card.append(basics);
   const descRow=n("div",undefined,"fields");
   descRow.append(this._field("Description (facultative)",this._draft.description,
    v=>this._draft.description=v,{multiline:true}));
   card.append(descRow);
   if(this._draft.kind==="automation"){
    this._section(card,this._draft.triggers,"trigger","QUAND — Déclencheurs");
    card.append(n("p","Plusieurs déclencheurs fonctionnent en OU : l'un d'eux suffit à lancer la routine.","muted"));
   }
   this._section(card,this._draft.conditions,"condition","SI — Conditions (facultatives)");
   card.append(n("p",this._draft.kind==="script"?
    "Pour un scénario, ces conditions sont vérifiées quand on lance le script.":
    "Les conditions principales doivent toutes être vraies. Ajoutez un groupe OU pour d'autres combinaisons.","muted"));
   this._section(card,this._draft.actions,"action","ALORS — Actions dans l'ordre");
   const controls=n("div",undefined,"footer");
   controls.append(this._button(this._editing?"Enregistrer les modifications":"Créer la routine",
     ()=>void this._save(),"primary"));
   controls.append(this._button("Nouveau",()=>this._new(this._draft.kind)));
   controls.append(this._button("Dupliquer",()=>this._duplicate(),"secondary",!this._draft.actions.length));
   if(this._editing){
    controls.append(this._button("Supprimer",()=>void this._remove()));
    const link=n("a","Ouvrir dans Home Assistant");
    const dest=this._editing.kind==="script"?"script":"automation";
    link.href="/config/"+dest+"/edit/"+encodeURIComponent(this._editing.id);
    link.setAttribute("target","_self");
    controls.append(link);
   }
   card.append(controls);
   const caution=n("p","Aucune action n'est lancée pendant la création. Les blocs ↑ ↓ et ⠿ permettent de changer l'ordre. Les scripts/automatisations extérieurs à KIMIA restent inchangés.","khelp");
   card.append(caution);this._statusCard(card);
   this.shadowRoot.replaceChildren(style,card);
  }
 }
 customElements.define(TAG,Editor);
 window.customCards=window.customCards||[];
 if(!window.customCards.some(c=>c.type===TAG))
  window.customCards.push({type:TAG,name:"KIMIA · Atelier Routines V1.6",
   description:"Scénarios et automatisations avec déclencheurs, conditions et actions réorganisables"});
})();