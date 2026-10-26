/* KIMIA V1.5 — visibilité par personne, pièces natives, nouveaux utilisateurs. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
class CustomEvent{constructor(type,p){this.type=type;this.detail=p?.detail;}}
const window={dispatchEvent(){}};
vm.runInNewContext(fs.readFileSync("www/kimia-smart-core-v1.js","utf8"),{window,CustomEvent});
const clone=x=>JSON.parse(JSON.stringify(x));
const paths=["accueil","pieces","lumieres","volets","climatisation",
 "prises","musique","securite","actualites","parametres"];
let client={views:paths.map(path=>({title:path,path,type:"sections",max_columns:3,
 sections:[{type:"grid",cards:[{type:"custom:navbar-card",
 routes:[{url:"/kimia-next/accueil",label:"Accueil"}]}]}]}))};
// Plan fourni par un client : deux étages, géométries indépendantes,
// exactement les mêmes zones HA servant aux permissions KIMIA.
const layout={type:"custom:maquette-card",id:"plan-libre",title:"Exemple",
 floors:[{id:"rdc",rooms:[
  {name:"Salon libre",area:"salon",poly:[[0,0],[100,0],[100,100],[0,100]]},
  {name:"Chambre parents",area:"parents",poly:[[100,0],[200,0],[200,100],[100,100]]}]},
  {id:"etage",rooms:[{name:"Autre chambre du client",area:"parents",
   poly:[[10,10],[90,10],[90,90],[10,90]]}]}]};
client.views.find(v=>v.path==="accueil").sections.push({type:"grid",cards:[clone(layout)]});
let admin={views:[{title:"Utilisateurs",path:"utilisateurs",type:"sections",
 sections:[{type:"grid",cards:[{type:"custom:kimia-user-visibility-v15-card",
 hidden_areas_by_user:{enfant:["parents"]}}]}]}]};
let clientWrites=0;
const areas=[{area_id:"parents",name:"Chambre parents"},{area_id:"salon",name:"Salon"}];
const devices=[{id:"d1",area_id:"parents"},{id:"d2",area_id:"salon"}];
const entities=[{entity_id:"light.parents",device_id:"d1"},
 {entity_id:"media_player.parents",device_id:"d1"},
 {entity_id:"light.salon",device_id:"d2"}];
const accounts=[
 {id:"admin",name:"Administrateur",is_active:true},
 {id:"enfant",name:"Enfant",is_active:true},
 {id:"nouveau",name:"Nouveau",is_active:true}
];
const hass={user:{is_admin:true,id:"admin"},
 states:{"light.parents":{attributes:{friendly_name:"Lampe chambre parents"}},
 "light.salon":{attributes:{friendly_name:"Lampe salon"}},
 "media_player.parents":{attributes:{friendly_name:"Enceinte parents"}}},
 callWS:async q=>{
  switch(q.type){
   case "lovelace/dashboards/list":return [
    {url_path:"kimia-next",mode:"storage"},{url_path:"kimia-admin-next",mode:"storage"}];
   case "config/area_registry/list":return clone(areas);
   case "config/device_registry/list":return clone(devices);
   case "config/entity_registry/list":return clone(entities);
   case "config/auth/list":return clone(accounts);
   case "lovelace/config":return clone(q.url_path==="kimia-next"?client:admin);
   case "lovelace/config/save":
    if(q.url_path==="kimia-next"){client=clone(q.config);clientWrites++;}
    else if(q.url_path==="kimia-admin-next")admin=clone(q.config);
    else throw Error("Unexpected "+q.url_path);
    return {};
   default:throw Error("Unsupported command "+q.type);
  }
 }};
const sections=(path,area)=>client.views.find(v=>v.path===path).sections
 .filter(s=>(s.cards||[]).some(c=>c.type==="area"&&c.area===area));
(async()=>{
 await window.KimiaSmartCore.sync(hass);
 const holder=client.views.find(v=>v.path==="accueil").sections
  .flatMap(s=>s.cards).find(c=>c.type==="custom:kimia-maquette-acl-v17-card");
 assert(holder,"La carte Maquette est enveloppée une seule fois, sans recréer le plan");
 assert.equal(JSON.stringify(holder.card),JSON.stringify(layout),
  "Géométrie/noms/images/étages conservés à l'octet fonctionnel près");
 assert.deepEqual(Array.from(holder.hidden_users_by_area.parents),["enfant"]);
 assert.equal(holder.hidden_users_by_area.salon,undefined);
 assert(holder.entities_by_area.parents.entities.includes("light.parents"));
 assert(holder.entities_by_area.parents.devices.includes("d1"));
 for(const path of ["pieces","lumieres","musique"]){
  const room=sections(path,"parents")[0];
  assert(room,path+" doit contenir la chambre des parents");
  assert.equal(room.visibility?.[0]?.condition,"not");
  assert.equal(room.visibility?.[0]?.conditions?.[0]?.condition,"user");
  assert.deepEqual(Array.from(room.visibility[0].conditions[0].users),["enfant"]);
 }
 assert.equal(sections("pieces","salon")[0].visibility,undefined,
  "pièce non masquée visible par tous");
 assert.equal(sections("lumieres","salon")[0].visibility,undefined);
 const before=clientWrites;
 await window.KimiaSmartCore.sync(hass);
 assert.equal(clientWrites,before,"2e synchro sans écriture");
 assert.equal(JSON.stringify(holder.card),JSON.stringify(layout),"Plan intact après 2e synchro");

 // Après réactivation, seule la visibilité issue de KIMIA disparaît.
 const cfg=admin.views.find(v=>v.path==="utilisateurs").sections[0].cards[0];
 delete cfg.hidden_areas_by_user.enfant;
 await window.KimiaSmartCore.sync(hass);
 const nextHolder=client.views.find(v=>v.path==="accueil").sections
  .flatMap(s=>s.cards).find(c=>c.type==="custom:kimia-maquette-acl-v17-card");
 assert.deepEqual(Object.keys(nextHolder.hidden_users_by_area),[],
  "Après restitution du droit, plus de verrouillage dans la carte");
 for(const path of ["pieces","lumieres","musique"])
  assert.equal(sections(path,"parents")[0].visibility,undefined);

 // Carte Area personnalisée : la section reste filtrée sans changer la carte.
 const customRoom=sections("musique","parents")[0];
 const customArea=customRoom.cards.find(c=>c.type==="area");
 customArea.name="Chambre parents — personnalisé";
 cfg.hidden_areas_by_user.enfant=["parents"];
 await window.KimiaSmartCore.sync(hass);
 assert.equal(sections("musique","parents")[0].visibility[0].condition,"not");
 assert.equal(sections("musique","parents")[0].cards.find(c=>c.type==="area").name,
  "Chambre parents — personnalisé");
 // Conditions créées manuellement : ne jamais écraser leur réglage.
 const manual=sections("pieces","parents")[0];
 manual.visibility=[{condition:"state",entity:"input_boolean.demo",state:"on"}];
 cfg.hidden_areas_by_user.enfant=["parents"];
 await window.KimiaSmartCore.sync(hass);
 assert.equal(sections("pieces","parents")[0].visibility[0].condition,"state");
 assert.equal(sections("lumieres","parents")[0].visibility[0].condition,"not");
 console.log("KIMIA V1.5 OK : profils HA, masquage par section, nouveau compte visible par défaut, réglages manuels préservés.");
})().catch(e=>{console.error(e);process.exitCode=1;});
