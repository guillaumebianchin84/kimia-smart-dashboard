/* V1.4 : vérification en simulation des nouveaux onglets sans toucher à une VM */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
class CustomEvent { constructor(type,p){this.type=type;this.detail=p?.detail;} }
const window={dispatchEvent(){}};
vm.runInNewContext(fs.readFileSync("www/kimia-smart-core-v1.js","utf8"),{window,CustomEvent});
const clone=x=>JSON.parse(JSON.stringify(x));
const basePaths=["accueil","pieces","lumieres","volets","climatisation","prises","musique","securite","actualites","parametres"];
const config0={views:basePaths.map(path=>({path,title:path,type:"sections",max_columns:3,
 sections:[{type:"grid",cards:[{type:"custom:navbar-card",
 routes:[{url:"/kimia-next/accueil",label:"Accueil"},{url:"/kimia-next/actualites",label:"Actualités"}]}]}]}))};
let cfg=clone(config0),writes=0;
const hass={user:{is_admin:true},states:{"todo.shopping_list":{state:"0"}},callWS:async r=>{
 switch(r.type){
  case "lovelace/dashboards/list":return [{url_path:"kimia-next",mode:"storage"}];
  case "config/area_registry/list":return [];
  case "config/device_registry/list":return [];
  case "config/entity_registry/list":return [];
  case "lovelace/config":return clone(cfg);
  case "lovelace/config/save":
   assert.equal(r.url_path,"kimia-next");cfg=clone(r.config);writes++;return {};
  default:throw Error(r.type);
 }
}};
const view=path=>cfg.views.find(v=>v.path===path);
const cards=path=>(view(path)?.sections||[]).flatMap(s=>s.cards||[]);
async function run(){
 assert.match(window.KimiaSmartCore.version,/^1\.(4|5)\.0-dev$/);
 await window.KimiaSmartCore.sync(hass);
 assert.equal(cfg.views.length,17,"V1.4 + cinq sous-vues de réglages");
 const map=cards("carte").find(c=>c.type==="map");
 assert.deepEqual(Array.from(map.entities),["zone.home"]);
 assert.equal(map.show_all,false,"pas de suivi de position implicite");
 assert.equal(map.grid_options.rows,6,"carte native avec hauteur fixe en vue Sections");
 const todo=cards("listes").find(c=>c.type==="todo-list");
 assert.equal(todo.entity,"todo.shopping_list");
 for(const v of cfg.views){
  const nav=(v.sections||[]).flatMap(s=>s.cards||[]).find(c=>c.type==="custom:navbar-card");
  assert(nav,v.path+" navbar manquante");
  for(const slug of ["carte","listes"]){
   const routes=nav.routes.filter(r=>r.url==="/kimia-next/"+slug);
   assert.equal(routes.length,1,v.path+" "+slug);
   assert(routes[0].hidden.includes("input_boolean.kimia_onglet_"+slug));
  }
 }
 const written=writes;
 await window.KimiaSmartCore.sync(hass);
 assert.equal(writes,written,"idempotence obligatoire");

 // Une carte V1.4 déjà créée avec rows:auto est corrigée à la prochaine synchro.
 const legacyMap=cards("carte").find(c=>c.type==="map");
 legacyMap.grid_options.rows="auto";
 delete legacyMap.auto_fit;
 delete legacyMap.default_zoom;
 const previous=writes;
 const fixed=await window.KimiaSmartCore.sync(hass);
 assert.equal(fixed.modified,1,"migration de la carte standard uniquement");
 assert.equal(writes,previous+1);
 assert.equal(cards("carte").find(c=>c.type==="map").grid_options.rows,6);
 assert.equal(cards("carte").find(c=>c.type==="map").auto_fit,true);
 const afterMigration=writes;
 await window.KimiaSmartCore.sync(hass);
 assert.equal(writes,afterMigration,"migration répétée sans effet");

 // Une carte modifiée manuellement reste sous contrôle de l'utilisateur.
 const customMap=cards("carte").find(c=>c.type==="map");
 customMap.grid_options.rows=4;
 customMap.entities=["zone.home","person.parent"];
 const ownTodo=cards("listes").find(c=>c.type==="todo-list");
 ownTodo.entity="todo.autre_liste";
 await window.KimiaSmartCore.sync(hass);
 assert.equal(writes,afterMigration,"ne pas écraser une carte native personnalisée");
 assert.equal(cards("carte").find(c=>c.type==="map").grid_options.rows,4);
 assert.deepEqual(Array.from(cards("carte").find(c=>c.type==="map").entities),["zone.home","person.parent"]);
 assert.equal(cards("listes").find(c=>c.type==="todo-list").entity,"todo.autre_liste");
 await assert.rejects(window.KimiaSmartCore.sync({...hass,user:{is_admin:false}}),/administrateurs/);
 // Pas de To-do : le moteur présente un texte puis une carte native après apparition de l'intégration.
 cfg=clone(config0);writes=0;delete hass.states["todo.shopping_list"];
 await window.KimiaSmartCore.sync(hass);
 assert(cards("listes").some(c=>c.type==="markdown"&&c.content.includes("aucune liste To-do")));
 hass.states["todo.achats"]={state:"0"};
 await window.KimiaSmartCore.sync(hass);
 assert(cards("listes").some(c=>c.type==="todo-list"&&c.entity==="todo.achats"));
 assert.equal(cards("listes").filter(c=>c.type==="todo-list").length,1);
 console.log("KIMIA V1.4 OK : carte privée, To-do, navbar uniforme, modifications préservées, synchro idempotente.");
}
run().catch(err=>{console.error(err);process.exitCode=1;});