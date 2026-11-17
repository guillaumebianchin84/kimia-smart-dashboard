/* KIMIA V1.5 — évolution additive de l'administration sans remplacement YAML. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
class CustomEvent {constructor(type,p){this.type=type;this.detail=p?.detail;}}
const window={dispatchEvent(){}};
vm.runInNewContext(fs.readFileSync("www/kimia-smart-core-v1.js","utf8"),{window,CustomEvent});
const clone=x=>JSON.parse(JSON.stringify(x));
const paths=["accueil","pieces","lumieres","volets","climatisation","prises","musique","securite","actualites","parametres"];
const client={views:paths.map(path=>({path,title:path,type:"sections",max_columns:3,
 sections:[{type:"grid",cards:[{type:"custom:navbar-card",routes:[
 {url:"/kimia-next/accueil",label:"Accueil"}]}]}]}))};
const originalCard={type:"markdown",content:"Carte manuelle conservée"};
const admin={views:[
 {path:"apparence",type:"sections",sections:[
  {type:"grid",cards:[{type:"heading",heading:"Mes rubriques"},
   {type:"tile",entity:"input_boolean.kimia_onglet_lumieres",name:"Lumières"}]},
  {type:"grid",cards:[clone(originalCard)]},
  {type:"grid",cards:[{type:"heading",heading:"Les thèmes KIMIA"}]}]},
 {path:"scenarios",type:"sections",sections:[
  {type:"grid",cards:[{type:"custom:kimia-scenarios-v1-card"}]}]}
]};
let c=clone(client),a=clone(admin),clientWrites=0,adminWrites=0;
const hass={user:{is_admin:true},states:{},callWS:async q=>{
 switch(q.type){
  case "lovelace/dashboards/list":return [
   {url_path:"kimia-next",mode:"storage"},
   {url_path:"kimia-admin-next",mode:"storage"}];
  case "config/area_registry/list":
  case "config/device_registry/list":
  case "config/entity_registry/list":return [];
  case "config/label_registry/list":return [];
  case "config/auth/list":return [{id:"user_parent",name:"Parent",is_active:true}];
  case "lovelace/config":
   return clone(q.url_path==="kimia-next"?c:a);
  case "lovelace/config/save":
   if(q.url_path==="kimia-next"){c=clone(q.config);clientWrites++;}
   else if(q.url_path==="kimia-admin-next"){a=clone(q.config);adminWrites++;}
   else throw Error(q.url_path);
   return {};
  default:throw Error("Unknown WS "+q.type);
 }
}};
const cards=path=>a.views.find(v=>v.path===path).sections.flatMap(s=>s.cards||[]);
(async()=>{
 const first=await window.KimiaSmartCore.sync(hass);
 assert(first.adminAdded>0,"Le premier passage ajoute les fonctionnalités absentes");
 assert.equal(adminWrites,1,"une seule sauvegarde admin");
 assert.equal(cards("apparence").filter(c=>c.type==="tile"&&
  c.entity==="input_boolean.kimia_onglet_pieces").length,1);
 assert.equal(cards("apparence").filter(c=>c.type==="tile"&&
  c.entity==="input_boolean.kimia_onglet_carte").length,1);
 assert.equal(cards("apparence").filter(c=>c.type==="tile"&&
  c.entity==="input_boolean.kimia_onglet_listes").length,1);
 assert.equal(cards("apparence").filter(c=>c.type==="custom:kimia-services-v14-card").length,1);
 assert.equal(cards("scenarios").filter(c=>c.type==="custom:kimia-routine-editor-v16-card").length,1);
 assert.equal(cards("scenarios").filter(c=>c.type==="custom:kimia-ai-scenes-settings-card").length,1);
 assert.equal(cards("automatisations-ia").filter(c=>c.type==="custom:kimia-ai-automation-studio-v1-card").length,1);
 assert.equal(a.views.filter(v=>v.path==="utilisateurs").length,1);
 assert.equal(a.views.find(v=>v.path==="utilisateurs").sections.flatMap(s=>s.cards||[])
  .filter(c=>c.type==="custom:kimia-user-visibility-v15-card").length,1);
 assert(cards("apparence").some(c=>c.content===originalCard.content));
 assert(cards("scenarios").some(c=>c.type==="custom:kimia-scenarios-v1-card"));
 const previous=clientWrites;
 const second=await window.KimiaSmartCore.sync(hass);
 assert.equal(second.adminAdded,0,"idempotence admin");
 assert.equal(adminWrites,1,"pas de doublon");
 assert.equal(clientWrites,previous,"pas de nouvelle écriture côté client");
 // Ne jamais remplacer le nom, l'ordre ou le style d'un interrupteur personnalisé.
 const tile=cards("apparence").find(c=>c.entity==="input_boolean.kimia_onglet_carte");
 tile.name="Mon affichage personnel";
 tile.icon="mdi:star";
 await window.KimiaSmartCore.sync(hass);
 assert.equal(adminWrites,1);
 assert.equal(cards("apparence").find(c=>c.entity===tile.entity).name,
  "Mon affichage personnel");
 // Une installation ayant déjà Studio V2 peut contenir l'ancien doublon standard.
 const scenarios=a.views.find(v=>v.path==="scenarios");
 const studio={type:"custom:kimia-studio-v2-admin-card",grid_options:{columns:"full",rows:"auto"}};
 const personalEditor={type:"custom:kimia-routine-editor-v16-card",grid_options:{columns:6,rows:4}};
 scenarios.sections.push({type:"grid",column_span:2,cards:[studio,personalEditor]});
 const cleanup=await window.KimiaSmartCore.sync(hass);
 assert.equal(cleanup.adminAdded,0);
 assert.equal(cleanup.adminRemoved,1);
 assert.equal(adminWrites,2);
 assert.deepEqual(cards("scenarios").filter(c=>c.type==="custom:kimia-routine-editor-v16-card"),
  [personalEditor],"L’éditeur personnalisé est préservé");
 assert.deepEqual(cards("scenarios").filter(c=>c.type===studio.type),[studio]);
 for(let i=0;i<3;i++){
  const repeated=await window.KimiaSmartCore.sync(hass);
  assert.equal(repeated.adminAdded,0);
  assert.equal(repeated.adminRemoved,0);
 }
 assert.equal(adminWrites,2,"Aucun doublon réintroduit");
 assert.equal(clientWrites,previous,"Aucune écriture client pendant ce nettoyage admin");
 console.log("KIMIA V1.5 OK : synchro admin additive, idempotente, personnalisations conservées.");
})().catch(e=>{console.error(e);process.exitCode=1;});
