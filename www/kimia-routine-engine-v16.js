/* KIMIA V1.6 — modèle partagé Scénario/Automatisation.
 * Fonctions pures, aucune action HA et aucune donnée personnelle stockée.
 * Traduit seulement les blocs que l'éditeur sait reproduire fidèlement.
 */
(()=>{
 "use strict";
 if(window.KimiaRoutineEngineV16)return;
 const clone=v=>JSON.parse(JSON.stringify(v));
 const OPERATIONS={
  light:[["turn_on","Allumer"],["turn_off","Éteindre"],["toggle","Basculer"]],
  switch:[["turn_on","Allumer"],["turn_off","Éteindre"],["toggle","Basculer"]],
  input_boolean:[["turn_on","Activer"],["turn_off","Désactiver"]],
  fan:[["turn_on","Démarrer"],["turn_off","Arrêter"]],
  cover:[["open_cover","Ouvrir"],["close_cover","Fermer"],["stop_cover","Stopper"],["set_cover_position","Position (%)"]],
  climate:[["set_temperature","Température (°C)"],["turn_off","Arrêter"]],
  media_player:[["media_play","Lecture"],["media_pause","Pause"],["media_stop","Arrêt"],["volume_set","Volume (0–1)"]],
  scene:[["turn_on","Activer"]],
  script:[["turn_on","Exécuter"]]
 };
 const slug=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,40);
 const create=kind=>({kind,alias:"",description:"",mode:"single",
  triggers:[],conditions:[],actions:[]});
 const trigger=type=>type==="time"?{type,at:"07:00:00"}:
  type==="sun"?{type,event:"sunset",offset:0}:
  type==="numeric_state"?{type,entity:"",below:"20",above:""}:
  {type:"state",entity:"",to:"on",from:"",seconds:0};
 const condition=type=>["and","or","not"].includes(type)?
  {type,conditions:[condition("state")]}:
  type==="numeric_state"?{type,entity:"",below:"20",above:""}:
  type==="time"?{type,after:"21:00:00",before:"07:00:00",weekdays:[]}:
  type==="sun"?{type,after:"sunset",before:"sunrise"}:
  {type:"state",entity:"",state:"on"};
 const action=type=>type==="delay"?{type,seconds:10}:
  type==="if"?{type,conditions:[condition("state")],then:[action("call")],else:[]}:
  type==="wait_state"?{type,entity:"",to:"on",timeout:300}:
  type==="repeat"?{type,count:2,actions:[action("call")]}:
  type==="condition"?{type,condition:condition("state")}:
  {type:"call",entity:"",operation:"turn_on",value:""};
 const required=(ok,label)=>{if(!ok)throw Error(label);};
 const num=(value,min,max,label)=>{
  const n=Number(value);required(value!==""&&value!==null&&Number.isFinite(n)&&n>=min&&n<=max,label+" : valeur invalide");
  return n;
 };
 const time=(s,label)=>{required(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s||""),label+" : heure invalide");return s.length===5?s+":00":s;};
 const entity=(v,label)=>{required(/^[a-z_]+\.[a-z0-9_]+$/.test(v||""),label+" : choisissez une entité");return v;};
 const bound=(s,prefix)=>{
  const b={};
  if(s.above!=="")b.above=num(s.above,-100000,100000,prefix+" au-dessus");
  if(s.below!=="")b.below=num(s.below,-100000,100000,prefix+" en dessous");
  required(b.above!==undefined||b.below!==undefined,prefix+" : au moins un seuil");
  if(b.above!==undefined&&b.below!==undefined)required(b.above<b.below,prefix+" : la borne basse doit précéder la borne haute");
  return b;
 };
 function triggerToHA(s){
  if(s.type==="time")return {trigger:"time",at:time(s.at,"Déclencheur horaire")};
  if(s.type==="sun"){
   required(["sunrise","sunset"].includes(s.event),"Événement solaire inconnu");
   return {trigger:"sun",event:s.event,offset:{minutes:num(s.offset,-720,720,"Décalage solaire")}};
  }
  if(s.type==="state"){
   const out={trigger:"state",entity_id:entity(s.entity,"Déclencheur")};
   if(s.from!=="")out.from=s.from;
   if(s.to!=="")out.to=s.to;
   required(s.from!==""||s.to!=="","Déclencheur : indiquez l'état à détecter");
   if(s.seconds)out.for={seconds:num(s.seconds,1,86400,"Durée déclenchement")};
   return out;
  }
  if(s.type==="numeric_state")
   return {trigger:"numeric_state",entity_id:entity(s.entity,"Déclencheur numérique"),...bound(s,"Déclencheur numérique")};
  throw Error("Type de déclencheur non géré : "+s.type);
 }
 function conditionToHA(s,depth=0){
  required(depth<6,"Conditions trop imbriquées (6 niveaux maximum)");
  if(["and","or","not"].includes(s.type)){
   required(Array.isArray(s.conditions)&&s.conditions.length>0,"Un groupe logique doit contenir au moins une condition");
   return {condition:s.type,conditions:s.conditions.map(x=>conditionToHA(x,depth+1))};
  }
  if(s.type==="state")return {condition:"state",entity_id:entity(s.entity,"Condition"),state:String(s.state??"")};
  if(s.type==="numeric_state")return {condition:"numeric_state",entity_id:entity(s.entity,"Condition numérique"),...bound(s,"Condition numérique")};
  if(s.type==="time"){
   const out={condition:"time"};
   if(s.after)out.after=time(s.after,"Condition horaire début");
   if(s.before)out.before=time(s.before,"Condition horaire fin");
   if(s.weekdays?.length){
    const allowed=["mon","tue","wed","thu","fri","sat","sun"];
    required(s.weekdays.every(v=>allowed.includes(v)),"Jours invalides");
    out.weekday=[...new Set(s.weekdays)];
   }
   required(Object.keys(out).length>1,"Condition horaire vide");
   return out;
  }
  if(s.type==="sun"){
   required(["sunrise","sunset"].includes(s.after)&&["sunrise","sunset"].includes(s.before),"Condition soleil invalide");
   return {condition:"sun",after:s.after,before:s.before};
  }
  throw Error("Type de condition non géré : "+s.type);
 }
 function actionToHA(s,depth=0){
  required(depth<6,"Actions trop imbriquées (6 niveaux maximum)");
  if(s.type==="delay")return {delay:{seconds:num(s.seconds,1,86400,"Attente")}};
  if(s.type==="wait_state")return {
   wait_for_trigger:[{trigger:"state",entity_id:entity(s.entity,"Attente capteur"),to:String(s.to)}],
   timeout:{seconds:num(s.timeout,1,86400,"Délai maximum attente")},
   continue_on_timeout:false
  };
  if(s.type==="condition")return conditionToHA(s.condition,depth+1);
  if(s.type==="if"){
   required(s.conditions?.length,"Si : ajoutez une condition");
   required(s.then?.length,"Si : ajoutez au moins une action Alors");
   const out={if:s.conditions.map(c=>conditionToHA(c,depth+1)),then:s.then.map(a=>actionToHA(a,depth+1))};
   if(s.else?.length)out.else=s.else.map(a=>actionToHA(a,depth+1));
   return out;
  }
  if(s.type==="repeat"){
   const count=num(s.count,1,20,"Répétitions");
   required(Number.isInteger(count),"Le nombre de répétitions doit être entier");
   required(s.actions?.length,"Répétition : ajoutez au moins une action");
   return {repeat:{count,sequence:s.actions.map(a=>actionToHA(a,depth+1))}};
  }
  if(s.type==="call"){
   const id=entity(s.entity,"Action");
   const domain=id.split(".")[0];
   const accepted=(OPERATIONS[domain]||[]).map(o=>o[0]);
   required(accepted.includes(s.operation),"Action non prise en charge pour "+domain);
   const out={action:domain+"."+s.operation,target:{entity_id:id}};
   if(s.operation==="set_temperature")out.data={temperature:num(s.value,5,40,"Température")};
   if(s.operation==="set_cover_position")out.data={position:num(s.value,0,100,"Position volet")};
   if(s.operation==="volume_set")out.data={volume_level:num(s.value,0,1,"Volume")};
   return out;
  }
  throw Error("Type d'action non géré : "+s.type);
 }
 function serialize(d,id){
  const alias=(d.alias||"").trim();
  required(alias.length>=3&&alias.length<=70,"Nom : entre 3 et 70 caractères");
  required(d.actions?.length>0,"Ajoutez au moins une action");
  required(["single","restart","queued","parallel"].includes(d.mode),"Mode d'exécution inconnu");
  const sequence=d.actions.map(s=>actionToHA(s));
  const base={alias,description:String(d.description||"").slice(0,240),mode:d.mode};
  if(d.kind==="script")return {...base,icon:"mdi:play-box-multiple-outline",sequence};
  required(d.kind==="automation","Type de routine invalide");
  required(d.triggers?.length>0,"Une automatisation doit avoir au moins un déclencheur");
  return {...base,id,triggers:d.triggers.map(triggerToHA),
   conditions:(d.conditions||[]).map(s=>conditionToHA(s)),actions:sequence};
 }
 const arr=v=>Array.isArray(v)?v:v?[v]:[];
 function fromTrigger(t){
  const type=t.trigger||t.platform;
  if(type==="time"&&typeof t.at==="string")return {type,at:t.at};
  if(type==="sun"&&["sunrise","sunset"].includes(t.event))
   return {type,event:t.event,offset:Number(t.offset?.minutes||0)};
  if(type==="state"&&typeof t.entity_id==="string")
   return {type,entity:t.entity_id,to:t.to??"",from:t.from??"",seconds:Number(t.for?.seconds||0)};
  if(type==="numeric_state"&&typeof t.entity_id==="string")
   return {type,entity:t.entity_id,above:t.above===undefined?"":String(t.above),below:t.below===undefined?"":String(t.below)};
  throw Error("Déclencheur existant non représentable dans KIMIA : utiliser l'éditeur HA.");
 }
 function fromCondition(c,depth=0){
  required(depth<6,"Condition existante trop imbriquée");
  if(["and","or","not"].includes(c.condition)&&Array.isArray(c.conditions))
   return {type:c.condition,conditions:c.conditions.map(v=>fromCondition(v,depth+1))};
  if(c.condition==="state"&&typeof c.entity_id==="string"&&typeof c.state==="string"&&!c.for)
   return {type:"state",entity:c.entity_id,state:c.state};
  if(c.condition==="numeric_state"&&typeof c.entity_id==="string")
   return {type:"numeric_state",entity:c.entity_id,below:c.below===undefined?"":String(c.below),above:c.above===undefined?"":String(c.above)};
  if(c.condition==="time"){
   return {type:"time",after:c.after||"",before:c.before||"",weekdays:arr(c.weekday)};
  }
  if(c.condition==="sun"&&!c.after_offset&&!c.before_offset)
   return {type:"sun",after:c.after,before:c.before};
  throw Error("Condition avancée non représentable dans KIMIA : conserver l'éditeur HA.");
 }
 function fromAction(s,depth=0){
  required(depth<6,"Actions existantes trop imbriquées");
  if(s.delay&&Object.keys(s).every(k=>["delay","alias","enabled"].includes(k))){
   required(s.enabled!==false,"Bloc désactivé : ouvrez l'éditeur HA.");
   return {type:"delay",seconds:Number(s.delay.seconds??0)};
  }
  if(s.wait_for_trigger?.length===1&&s.continue_on_timeout===false){
   const tr=fromTrigger(s.wait_for_trigger[0]);
   required(tr.type==="state"&&!tr.from&&!tr.seconds,"Attente avancée : éditeur HA requis");
   return {type:"wait_state",entity:tr.entity,to:tr.to,timeout:Number(s.timeout?.seconds||300)};
  }
  if(s.if&&s.then){
   return {type:"if",conditions:arr(s.if).map(v=>fromCondition(v,depth+1)),
    then:arr(s.then).map(v=>fromAction(v,depth+1)),
    else:arr(s.else).map(v=>fromAction(v,depth+1))};
  }
  if(s.repeat&&typeof s.repeat.count==="number"&&Array.isArray(s.repeat.sequence))
   return {type:"repeat",count:s.repeat.count,actions:s.repeat.sequence.map(v=>fromAction(v,depth+1))};
  if(s.condition)return {type:"condition",condition:fromCondition(s,depth+1)};
  const op=s.action||s.service;
  if(typeof op==="string"&&typeof s.target?.entity_id==="string"){
   const [domain,method]=op.split(".");
   required((OPERATIONS[domain]||[]).some(o=>o[0]===method),"Action non gérée : "+op);
   const value=method==="set_temperature"?s.data?.temperature:
    method==="set_cover_position"?s.data?.position:
    method==="volume_set"?s.data?.volume_level:"";
   const allowed=JSON.stringify(Object.keys(s.data||{}).sort());
   required((!s.data||Object.keys(s.data).length===0)||
     (["set_temperature","set_cover_position","volume_set"].includes(method)&&
      Object.keys(s.data).length===1),
     "Action avec options supplémentaires : utilisez l'éditeur HA.");
   return {type:"call",entity:s.target.entity_id,operation:method,value:value===undefined?"":String(value)};
  }
  throw Error("Action avancée non représentable dans KIMIA : aucune modification autorisée.");
 }
 function deserialize(raw,kind){
  required(raw&&typeof raw==="object"&&!raw.use_blueprint,"Configuration HA absente ou blueprint : éditeur HA requis");
  const allowed=kind==="script"
   ?["alias","description","mode","icon","sequence","max","max_exceeded","fields","variables"]
   :["alias","description","mode","id","triggers","trigger","conditions","condition","actions","action","initial_state","trace","max","max_exceeded"];
  required(Object.keys(raw).every(k=>allowed.includes(k)),"Cette routine utilise des options avancées : ouvrez-la dans Home Assistant.");
  required(!raw.fields&&!raw.variables&&!raw.trace&&!raw.max&&!raw.max_exceeded&&raw.initial_state===undefined,
   "Cette routine utilise des réglages avancés : ouvrez-la dans Home Assistant.");
  const d=create(kind);
  d.alias=String(raw.alias||"");d.description=String(raw.description||"");d.mode=raw.mode||"single";
  const as=kind==="script"?raw.sequence:(raw.actions??raw.action);
  required(Array.isArray(as),"Aucune séquence d'actions reconnue");
  d.actions=as.map(a=>fromAction(a));
  if(kind==="automation"){
   d.triggers=arr(raw.triggers??raw.trigger).map(fromTrigger);
   d.conditions=arr(raw.conditions??raw.condition).map(c=>fromCondition(c));
  }
  // Test de validité en lecture avant de proposer l'édition.
  serialize(d,raw.id||"kimia_test");
  return d;
 }
 window.KimiaRoutineEngineV16=Object.freeze({
  OPERATIONS,clone,slug,create,trigger,condition,action,serialize,deserialize,
  triggerToHA,conditionToHA,actionToHA
 });
})();