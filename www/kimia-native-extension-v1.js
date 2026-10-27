/* KIMIA Smart — extension native Énergie / Eau / Secours / Caméras (V1).
 * AUCUNE nouvelle carte custom. AUCUN changement aux cartes, navbar,
 * icônes et bandeaux existants. Aucun lancement automatique.
 *
 * Ressource facultative côté administrateur: fournit plan(...) et apply(...)
 * sans inscrire de listeners, cartes ou effets au chargement.
 */
(()=>{
"use strict";
const TAG="KimiaNativeExtensionV1";
if(typeof window!=="undefined" && window[TAG])return;
const copy=x=>JSON.parse(JSON.stringify(x));
const validId=id=>typeof id==="string"&&/^[a-z_]+\.[a-z0-9_]+$/.test(id);
const cards=view=>(view?.sections||[]).flatMap(s=>s.cards||[])
  .concat(Array.isArray(view?.cards)?view.cards:[]);
const entityOf=x=>x?.entity||x?.camera_image||
 (typeof x==="string"?x:"");
const cardEntities=card=>{
 const values=[card?.entity,card?.camera_image,...(card?.entities||[]).map(entityOf)];
 return values.filter(validId);
};
const IDs=Object.freeze({
 pressureSensor:"pressureSensor",pumpCommand:"pumpCommand",
 mainsPresent:"mainsPresent",generatorRequest:"generatorRequest",
 generatorRunning:"generatorRunning"
});
const mainCameraScore=r=>{
 const n=String(r.entity_id||"").toLowerCase();
 const l=String(r.name||r.original_name||"").toLowerCase();
 return (/main|principal|haute_resolution|high_res/.test(n+" "+l)?6:0)-
  (/sub|secondary|secondaire|low_res|basse_resolution/.test(n+" "+l)?10:0);
};
const primaryCameras=(states,entities,devices,areas)=>{
 const areaNames=new Map(areas.map(a=>[a.area_id,a.name]));
 const deviceIndex=new Map(devices.map(d=>[d.id,d]));
 const registry=new Map(entities.map(e=>[e.entity_id,e]));
 const ids=new Set([...Object.keys(states||{}),...registry.keys()].filter(id=>id.startsWith("camera.")));
 const best=new Map();
 for(const id of [...ids].sort()){
  const r=registry.get(id);
  if(r?.disabled_by||r?.hidden_by)continue;
  const deviceId=r?.device_id||"ent:"+id;
  const d=deviceIndex.get(r?.device_id);
  const area=r?.area_id||d?.area_id||"";
  const candidate={entityId:id,deviceId,area,name:areaNames.get(area)||"Sans pièce",score:mainCameraScore(r||{entity_id:id})};
  const current=best.get(deviceId);
  if(!current||candidate.score>current.score)best.set(deviceId,candidate);
 }
 return [...best.values()].sort((a,b)=>
  a.name.localeCompare(b.name,"fr")||a.entityId.localeCompare(b.entityId));
};
const oneCameraCard=id=>({
 type:"picture-entity",entity:id,camera_view:"live",
 show_name:true,show_state:false,
 grid_options:{columns:6,rows:4}
});
const head=(label,icon)=>({type:"heading",heading:label,icon,heading_style:"subtitle",
 grid_options:{columns:"full",rows:1}});
const grid=c=>({type:"grid",column_span:3,cards:c});
const help=(message)=>({type:"markdown",content:message,
 grid_options:{columns:"full",rows:"auto"}});
const addCameraCards=(security,source)=>{
 const old=cards(security);
 const used=new Set(old.flatMap(cardEntities).filter(x=>x.startsWith("camera.")));
 const registered=new Map(source.entities.map(e=>[e.entity_id,e]));
 const existingDevices=new Set([...used].map(id=>registered.get(id)?.device_id).filter(Boolean));
 let count=0;
 for(const camera of primaryCameras(source.states,source.entities,source.devices,source.areas)){
  if(used.has(camera.entityId)||existingDevices.has(camera.deviceId))continue;
  const title="Caméras · "+camera.name;
  let section=security.sections.find(s=>
   (s.cards||[]).some(c=>c.type==="heading"&&c.heading===title));
  if(!section){
   section=grid([head(title,"mdi:cctv")]);
   security.sections.push(section);
  }
  // Ne crée pas une deuxième carte si l'utilisateur l'a déjà placée manuellement.
  const card=oneCameraCard(camera.entityId);
  section.cards.push(card);used.add(camera.entityId);existingDevices.add(camera.deviceId);count++;
 }
 return count;
};
const electricityClasses=new Set(["power","energy"]);
const isEnergySensor=(id,reg,state)=>{
 if(!id.startsWith("sensor.")||reg?.disabled_by||reg?.hidden_by)return false;
 const a=state?.attributes||{};
 const unit=String(a.unit_of_measurement||"").toLowerCase();
 if(!electricityClasses.has(a.device_class))return false;
 return a.device_class==="power"?["w","kw"].includes(unit):["wh","kwh","mwh"].includes(unit);
};
const energyDevices=source=>{
 const regs=new Map(source.entities.map(x=>[x.entity_id,x]));
 const dev=new Map(source.devices.map(x=>[x.id,x]));
 const found=new Map();
 for(const id of new Set([...Object.keys(source.states),...regs.keys()])){
  const r=regs.get(id),state=source.states[id];
  if(!isEnergySensor(id,r,state))continue;
  const key=r?.device_id||"entity:"+id;
  if(!found.has(key))found.set(key,{key,name:dev.get(key)?.name_by_user||dev.get(key)?.name||
   state?.attributes?.friendly_name||id,ids:[]});
  found.get(key).ids.push(id);
 }
 return [...found.values()].map(x=>({...x,ids:x.ids.sort((a,b)=>{
  const aa=source.states[a]?.attributes?.device_class,bb=source.states[b]?.attributes?.device_class;
  return (aa==="power"?-1:0)-(bb==="power"?-1:0)||a.localeCompare(b);
 })})).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
};
const nativeEquipmentCard=(group,rows=true)=>group.ids.length===1?
 {type:"tile",entity:group.ids[0],grid_options:{columns:6,rows:1}}:
 {type:"entities",title:group.name,show_header_toggle:false,
  entities:group.ids,grid_options:{columns:6,rows:"auto"}};
const assureSection=(view,title,icon)=>{
 let section=(view.sections||[]).find(s=>s.cards?.some(c=>c.type==="heading"&&c.heading===title));
 if(!section){section=grid([head(title,icon)]);view.sections.push(section);}
 return section;
};
const maybeSetPlaceholder=(section,message)=>{
 const data=section.cards.slice(1);
 if(!data.length)section.cards.push(help(message));
 else if(data.length>1)section.cards=section.cards.filter(c=>c.type!=="markdown"||
  !c.content.startsWith("KIMIA : aucun"));
};
const energyView=()=>({
 title:"Énergie",path:"energie",icon:"mdi:flash",
 type:"sections",max_columns:3,subview:true,back_path:"/kimia-next/accueil",
 sections:[]
});
const knownId=(id,source)=>{
 if(!id)return null;
 if(!validId(id))throw Error("Entité invalide : "+String(id));
 const recognized=id in source.states||source.entities.some(e=>e.entity_id===id);
 if(!recognized)throw Error("Entité inexistante dans Home Assistant : "+id);
 return id;
};
const categorySection=(view,title,icon,labels,settings,source)=>{
 const section=assureSection(view,title,icon);
 const used=new Set(cards(view).flatMap(cardEntities));
 const reg=new Map(source.entities.map(e=>[e.entity_id,e]));
 const dev=new Map(source.devices.map(d=>[d.id,d]));
 const groups=new Map();
 for(const [key,label] of labels){
  const id=knownId(settings[key],source);
  if(!id||used.has(id))continue;
  const dom=id.split(".")[0];
  if(!["sensor","binary_sensor","switch"].includes(dom))
   throw Error("Type incompatible avec le module "+label+" : "+id);
  const deviceId=reg.get(id)?.device_id;
  // Un identifiant physique => UNE carte même pour plusieurs entités du contrôleur.
  const identity=deviceId||"entity:"+id;
  if(!groups.has(identity))groups.set(identity,[]);
  groups.get(identity).push({id,label});
  used.add(id);
 }
 for(const [identity,items] of groups){
  if(items.length===1)section.cards.push({type:"tile",entity:items[0].id,name:items[0].label,
   grid_options:{columns:6,rows:1}});
  else section.cards.push({type:"entities",
   title:dev.get(identity)?.name_by_user||dev.get(identity)?.name||items[0].label,
   show_header_toggle:false,entities:items.map(x=>({entity:x.id,name:x.label})),
   grid_options:{columns:6,rows:"auto"}});
 }
 maybeSetPlaceholder(section,"KIMIA : aucun appareil configuré dans cette catégorie. Ajouter les entités après installation.");
};
function plan({dashboard,states={},entities=[],devices=[],areas=[],equipment={}}={}){
 if(!dashboard||!Array.isArray(dashboard.views)||!dashboard.views.some(v=>v.path==="securite"))
  throw Error("Dashboard KIMIA invalide : vue Sécurité manquante.");
 if(!Array.isArray(entities)||!Array.isArray(devices)||!Array.isArray(areas))
  throw Error("Registres Home Assistant invalides.");
 const source={states,entities,devices,areas};
 const next=copy(dashboard),security=next.views.find(v=>v.path==="securite");
 if(!Array.isArray(security.sections))throw Error("Vue Sécurité incompatible.");
 const addedCameras=addCameraCards(security,source);
 let energy=next.views.find(v=>v.path==="energie");
 if(energy&&!cards(energy).some(c=>c.type==="heading"&&c.heading==="Consommation électrique"))
  throw Error("Un onglet « energie » non géré existe déjà : aucune modification.");
 if(!energy){energy=energyView();next.views.push(energy);}
 const electric=assureSection(energy,"Consommation électrique","mdi:flash");
 const seen=new Set(cards(energy).flatMap(cardEntities));
 let addedEnergy=0;
 for(const group of energyDevices(source)){
  if(group.ids.some(id=>seen.has(id)))continue;
  electric.cards.push(nativeEquipmentCard(group));
  for(const id of group.ids)seen.add(id);
  addedEnergy++;
 }
 maybeSetPlaceholder(electric,"KIMIA : aucun compteur de puissance ou d'énergie détecté. Ajouter un capteur électrique compatible Home Assistant.");
 categorySection(energy,"Eau & surpresseur","mdi:water",
  [["pressureSensor","Pression d'eau"],["pumpCommand","Surpresseur"]],equipment,source);
 categorySection(energy,"Réseau & groupe électrogène","mdi:transmission-tower",
  [["mainsPresent","Réseau électrique"],["generatorRequest","Demande groupe"],
   ["generatorRunning","Groupe en marche"]],equipment,source);
 return {config:next,changed:JSON.stringify(next)!==JSON.stringify(dashboard),
  added:{camera:addedCameras,energy:addedEnergy},
  url:"/kimia-next/energie"};
}
// Contrôle volontaire et explicite. Jamais appelé automatiquement au chargement.
async function apply(hass,{confirm=false,equipment={}}={}){
 if(!confirm)throw Error("Confirme explicitement l'installation (confirm:true).");
 if(hass?.user?.is_admin!==true)throw Error("Compte administrateur Home Assistant requis.");
 const dashboards=await hass.callWS({type:"lovelace/dashboards/list"});
 if(!dashboards.some(d=>d.url_path==="kimia-next"&&d.mode==="storage"))
  throw Error("Le dashboard kimia-next doit être en mode Interface.");
 const requests=[
  {type:"lovelace/config",url_path:"kimia-next"},
  {type:"config/entity_registry/list"},{type:"config/device_registry/list"},
  {type:"config/area_registry/list"}];
 const [config,entities,devices,areas]=await Promise.all(requests.map(req=>hass.callWS(req)));
 const output=plan({dashboard:config,states:hass.states,entities,devices,areas,equipment});
 if(!output.changed)return {changed:false,added:output.added,url:output.url};
 const latest=await hass.callWS({type:"lovelace/config",url_path:"kimia-next"});
 if(JSON.stringify(latest)!==JSON.stringify(config))
  throw Error("Le dashboard a changé depuis la lecture. Aucun enregistrement.");
 await hass.callWS({type:"lovelace/config/save",url_path:"kimia-next",config:output.config});
 return {changed:true,added:output.added,url:output.url};
}
// Modèles d'automatisations natifs exclusivement : jamais installés ni activés.
// Les contacts de demande sont ceux d'un contrôleur matériel, pas ceux d'un inverseur ATS.
function automationDrafts(o={}){
 const must=(s,domain,key)=>{
  if(!validId(s)||!s.startsWith(domain+"."))throw Error("Configurer "+key+" ("+domain+").");
  return s;
 };
 const toSeconds=x=>Number.isInteger(x)&&x>=10&&x<=3600?x:null;
 const pressure=must(o.pressureSensor,"sensor","capteur de pression");
 const pump=must(o.pumpRequest,"switch","commande surpresseur");
 const pumpPermissive=must(o.pumpPermissive,"binary_sensor","autorisation matérielle pompe");
 const mains=must(o.mainsPresent,"binary_sensor","arrivée secteur");
 const group=must(o.generatorRequest,"switch","demande de groupe");
 const genReady=must(o.generatorReady,"binary_sensor","contrôleur groupe prêt");
 const low=Number(o.pressureLow),high=Number(o.pressureHigh);
 if(!Number.isFinite(low)||!Number.isFinite(high)||low<0||high<=low)
  throw Error("Seuils de pression invalides : haut doit dépasser bas.");
 const hold=toSeconds(o.delaySeconds??30);
 if(hold===null)throw Error("Durée de confirmation invalide.");
 const make=(alias,triggers,conditions,actions)=>({
  alias,description:"KIMIA V1 · brouillon inactif. Valider les protections du contrôleur avant activation.",
  mode:"single",initial_state:false,triggers,conditions,actions
 });
 const state=(id,value)=>({condition:"state",entity_id:id,state:value});
 const cmd=(id,mode)=>({action:"switch."+mode,target:{entity_id:id}});
 return [
  make("KIMIA — Demande surpresseur (inactif)",
   [{trigger:"numeric_state",entity_id:pressure,below:low,for:{seconds:hold}}],
   [state(pumpPermissive,"on"),{condition:"numeric_state",entity_id:pressure,below:low}],
   [cmd(pump,"turn_on")]),
  make("KIMIA — Fin demande surpresseur (inactif)",
   [{trigger:"numeric_state",entity_id:pressure,above:high,for:{seconds:hold}}],
   [{condition:"numeric_state",entity_id:pressure,above:high}],
   [cmd(pump,"turn_off")]),
  make("KIMIA — Demande groupe sur coupure (inactif)",
   [{trigger:"state",entity_id:mains,to:"off",for:{seconds:hold}}],
   [state(mains,"off"),state(genReady,"on")],
   [cmd(group,"turn_on")]),
  make("KIMIA — Fin demande groupe au retour secteur (inactif)",
   [{trigger:"state",entity_id:mains,to:"on",for:{seconds:Math.max(60,hold)}}],
   [state(mains,"on")],[cmd(group,"turn_off")])
 ];
}

/* Connexion avec le bouton standard « Actualiser ma maison ».
 * Les champs de configuration sont des helpers natifs input_text, lisibles
 * directement depuis Home Assistant. Aucune nouvelle carte personnalisée.
 */
const CONFIG=Object.freeze([
 ["pressureSensor","input_text.kimia_eau_pression_entite","sensor"],
 ["pumpCommand","input_text.kimia_eau_surpresseur_entite","switch"],
 ["mainsPresent","input_text.kimia_secours_reseau_entite","binary_sensor"],
 ["generatorRequest","input_text.kimia_secours_demande_groupe_entite","switch"],
 ["generatorRunning","input_text.kimia_secours_groupe_marche_entite","binary_sensor"]
]);
function equipmentFromStates(states={},entities=[]){
 const known=new Set([...Object.keys(states),...entities.map(e=>e.entity_id)]);
 const equipment={},errors=[];
 for(const [key,helper,domain] of CONFIG){
  const value=String(states[helper]?.state||"").trim().toLowerCase();
  if(!value||["unknown","unavailable","none"].includes(value))continue;
  if(!validId(value)||!value.startsWith(domain+".")||!known.has(value)){
   errors.push("Vérifier "+helper+" : entité "+value+" absente ou de type incorrect.");
   continue;
  }
  equipment[key]=value;
 }
 return {equipment,errors};
}
const SHORTCUT_LABEL="Suivi Énergie, Eau et Secours";
const ADMIN_LINK_LABEL="Configurer Énergie, Eau et Secours";
function appendShortcut(view,label,target,icon){
 if(!view?.sections)return 0;
 if(cards(view).some(card=>card.type==="shortcut"&&
    card.tap_action?.navigation_path===target))return 0;
 view.sections.push({type:"grid",column_span:Math.min(Number(view.max_columns)||3,3),
   cards:[{type:"shortcut",label,
     description:"Électricité, pression et groupe électrogène",
     icon,color:"teal",grid_options:{columns:6,rows:2},
     tap_action:{action:"navigate",navigation_path:target}}]});
 return 1;
}
const adminEntitiesHelp=(states)=>{
 const ready=CONFIG.filter(([,id])=>!!states[id]).map(([,id])=>id);
 return ready.length===CONFIG.length?{
  type:"entities",title:"Associer les équipements de l'installation",
  show_header_toggle:false,entities:ready,grid_options:{columns:"full",rows:"auto"}
 }:{
  type:"markdown",
  content:"Les cinq champs de configuration ne sont pas encore disponibles. Installer le fichier package \`kimia_energie_eau_secours_v1.yaml\` dans /config/packages/, puis recharger la configuration Home Assistant. Ensuite revenir ici pour renseigner les identifiants d'entités. Les champs ne commandent aucun appareil.",
  grid_options:{columns:"full",rows:"auto"}
 };
};
function planAdmin({adminDashboard,states={},entities=[]}={}){
 if(!adminDashboard||!Array.isArray(adminDashboard.views)||
   !adminDashboard.views.some(v=>v.path==="demarrer"))
  throw Error("Configuration admin KIMIA invalide : vue Démarrer absente.");
 const next=copy(adminDashboard);
 appendShortcut(next.views.find(v=>v.path==="demarrer"),ADMIN_LINK_LABEL,
  "/kimia-admin-next/energie-eau","mdi:cog-outline");
 if(!next.views.some(v=>v.path==="energie-eau")){
  next.views.push({
   title:"Énergie, Eau et Secours",path:"energie-eau",type:"sections",max_columns:2,
   subview:true,back_path:"/kimia-admin-next/demarrer",
   sections:[
    {type:"grid",column_span:2,cards:[
      {type:"heading",heading:"Installation Énergie, Eau et Secours",
       heading_style:"title",icon:"mdi:lightning-bolt-outline"},
      {type:"markdown",content:
       "Renseignez les identifiants des entités Home Assistant ci-dessous (exemple \`sensor.pression_eau\`). "
       +"Le bouton **Actualiser ma maison** de l'accueil admin appliquera l'affichage des équipements. "
       +"KIMIA ne démarre automatiquement ni pompe ni groupe. La commande groupe doit viser **une entrée de demande du contrôleur**, jamais un contacteur de puissance ni un ATS."},
      adminEntitiesHelp(states)
    ]},
    {type:"grid",column_span:2,cards:[
      {type:"heading",heading:"Installation et suivi",icon:"mdi:view-dashboard-outline"},
      {type:"shortcut",label:"Ouvrir Énergie, Eau et Secours",
       description:"Dashboard client natif",icon:"mdi:flash",color:"teal",
       tap_action:{action:"navigate",navigation_path:"/kimia-next/energie"}},
      {type:"shortcut",label:"Mes appareils Home Assistant",
       description:"Consulter leurs véritables identifiants",icon:"mdi:devices",
       color:"blue",tap_action:{action:"navigate",navigation_path:"/config/entities"}}
    ]}
   ]
  });
 }
 // Une installation du package après la création de la vue doit mettre
 // à jour UNIQUEMENT notre propre carte d'aide, pas la configuration admin.
 const adminView=next.views.find(v=>v.path==="energie-eau");
 if(adminView){
  const available=CONFIG.every(([,id])=>!!states[id]);
  for(const section of adminView.sections||[]){
   const idx=(section.cards||[]).findIndex(card=>card.type==="markdown"&&
    typeof card.content==="string"&&card.content.startsWith("Les cinq champs de configuration"));
   if(idx>=0 && available)section.cards[idx]=adminEntitiesHelp(states);
  }
 }
 const equipmentInfo=equipmentFromStates(states,entities);
 return {config:next,changed:JSON.stringify(next)!==JSON.stringify(adminDashboard),
  equipment:equipmentInfo.equipment,warnings:equipmentInfo.errors};
}
function enhanceClientPlan({dashboard,states={},entities=[],devices=[],areas=[]}={}){
 const {equipment,errors}=equipmentFromStates(states,entities);
 const output=plan({dashboard,states,entities,devices,areas,equipment});
 appendShortcut(output.config.views.find(v=>v.path==="accueil"),
  SHORTCUT_LABEL,"/kimia-next/energie","mdi:flash");
 output.changed=JSON.stringify(output.config)!==JSON.stringify(dashboard);
 output.warnings=errors;
 return output;
}

const api=Object.freeze({plan,apply,planAdmin,enhanceClientPlan,equipmentFromStates,automationDrafts,primaryCameras,energyDevices});
if(typeof window!=="undefined")window[TAG]=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();
