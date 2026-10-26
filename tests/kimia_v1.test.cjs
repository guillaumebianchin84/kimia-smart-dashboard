/* KIMIA v1 : tests du générateur de cartes, sans Home Assistant réel.
 * Lancer : node tests/kimia_v1.test.cjs
 */
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const source=fs.readFileSync("www/kimia-smart-core-v1.js","utf8");
const window={dispatchEvent:()=>{}};
class CustomEvent{constructor(type,args){this.type=type;this.detail=args?.detail}}
vm.runInNewContext(source,{window,CustomEvent});
const rooms=[{area_id:"salon",name:"Salon"},{area_id:"cuisine",name:"Cuisine"}];
const devices=[{id:"d1",area_id:"salon"},{id:"d2",area_id:"cuisine"}];
const entities=[
 {entity_id:"light.lampe",device_id:"d1"},
 {entity_id:"switch.prise_tv",device_id:"d1"},
 {entity_id:"cover.volet",device_id:"d2"},
 {entity_id:"climate.chaudiere",device_id:"d2"},
 {entity_id:"sensor.battery",device_id:"d1"},
 {entity_id:"light.disabled",device_id:"d2",disabled_by:"user"}
];
const original={
 title:"KIMIA - Nouvelle génération",
 views:["accueil","pieces","lumieres","volets","climatisation","prises","musique","securite"].map(path=>({
  path,type:"sections",
  sections:[{type:"grid",cards:[
   {type:"heading",heading:path==="accueil"?"Mes pièces":path==="pieces"?"Pièces de la maison":"Introduction"},
   {type:"markdown",content:"Cette carte personnalisée doit survivre à la synchronisation."}
  ]}]
 }))
};
async function main(){
 let config=JSON.parse(JSON.stringify(original)),saveCount=0,savePath;
 const hass={
  user:{is_admin:true},
  states:{"light.lampe":{attributes:{friendly_name:"Lampe du salon"}}},
  callWS:async request=>{
   switch(request.type){
    case "lovelace/dashboards/list":return [{url_path:"kimia-next",mode:"storage"}];
    case "config/area_registry/list":return rooms;
    case "config/device_registry/list":return devices;
    case "config/entity_registry/list":return entities;
    case "lovelace/config":return JSON.parse(JSON.stringify(config));
    case "lovelace/config/save":
     saveCount++;savePath=request.url_path;config=JSON.parse(JSON.stringify(request.config));return {};
    default:throw Error("Commande inattendue: "+request.type);
   }
  }
 };
 const first=await window.KimiaSmartCore.sync(hass);
 assert(first.added>10,"Ajout automatique attendu");
 assert.equal(savePath,"kimia-next","KIMIA production ne doit JAMAIS être modifié");
 const afterFirst=JSON.stringify(config);
 const again=await window.KimiaSmartCore.sync(hass);
 assert.equal(again.added,0,"Aucun doublon");
 assert.equal(saveCount,1,"Une seule écriture");
 assert.equal(JSON.stringify(config),afterFirst,"Dashboard stable");
 const home=config.views.find(v=>v.path==="accueil");
 assert.equal(home.sections.flatMap(s=>s.cards).filter(c=>c.type==="area").length,2);
 assert.equal(config.views.find(v=>v.path==="lumieres").sections.flatMap(s=>s.cards)
  .filter(c=>c.type==="tile"&&c.entity==="light.lampe").length,1);
 assert(!JSON.stringify(config).includes("light.disabled"),"Une entité désactivée ne doit pas apparaître");
 for(const v of config.views)assert(v.sections[0].cards.some(c=>
  c.type==="markdown"&&c.content.includes("personnalisée")),"Préservation des personnalisations");
 await assert.rejects(window.KimiaSmartCore.sync({...hass,user:{is_admin:false}}),/administrateur/);
 // Le moteur doit retirer les cartes automatiques après déplacement ou désaffectation.
 // Il ne doit jamais supprimer une carte personnalisée.
 const roomView=config.views.find(v=>v.path==="pieces");
 const salonSection=roomView.sections.find(s=>s.cards.some(c=>c.type==="area"&&c.area==="salon"));
 const personal=salonSection.cards.find(c=>c.entity==="light.lampe");
 personal.name="Lampe personnalisée par l'habitant";
 devices.find(d=>d.id==="d1").area_id=null;
 const removed=await window.KimiaSmartCore.sync(hass);
 assert(removed.removed>0,"Les cartes générées obsolètes doivent être retirées");
 assert(salonSection!==null);
 const afterRoom=config.views.find(v=>v.path==="pieces").sections
  .find(s=>s.cards.some(c=>c.type==="area"&&c.area==="salon"));
 assert(afterRoom.cards.some(c=>c.entity==="light.lampe"&&c.name==="Lampe personnalisée par l'habitant"),
  "La carte personnalisée doit rester en place");
 const lights=config.views.find(v=>v.path==="lumieres");
 assert(!lights.sections.flatMap(s=>s.cards).some(c=>c.entity==="light.lampe"),
  "Une tuile générée sans pièce doit disparaître");
 assert.equal((await window.KimiaSmartCore.sync(hass)).added,0,"Pas de doublons après désaffectation");
 assert.equal((await window.KimiaSmartCore.sync(hass)).removed,0,"Pas de suppressions répétées");
 // Suppression d'une pièce : aucune carte d'origine "Pièce non trouvée" ne doit rester.
 // Le nettoyage respecte les éléments personnalisés d'une section.
 rooms.splice(rooms.findIndex(a=>a.area_id==="cuisine"),1);
 const pruneCuisine=await window.KimiaSmartCore.sync(hass);
 assert(pruneCuisine.removed>=3,"La suppression d'une pièce doit nettoyer ses cartes");
 const homeAfter=config.views.find(v=>v.path==="accueil");
 assert(!homeAfter.sections.flatMap(s=>s.cards).some(c=>c.type==="area"&&c.area==="cuisine"),
   "Carte Accueil orpheline après suppression de Cuisine");
 for(const p of ["pieces","climatisation","volets"]) {
   assert(!config.views.find(v=>v.path===p).sections
     .flatMap(s=>s.cards).some(c=>c.type==="area"&&c.area==="cuisine"),
     "La carte Cuisine obsolète doit disparaître de "+p);
 }
 // Rejouer sans rien changer ne modifie plus le dashboard.
 const savesAfterCuisine=saveCount;
 const idempotent=await window.KimiaSmartCore.sync(hass);
 assert.equal(idempotent.removed,0,"Une suppression ne doit pas se répéter");
 assert.equal(saveCount,savesAfterCuisine,"Aucune écriture lors d'une synchro sans changement");

 rooms.splice(rooms.findIndex(a=>a.area_id==="salon"),1);
 const pruneSalon=await window.KimiaSmartCore.sync(hass);
 assert(pruneSalon.removed>=1);
 const afterCustomizedRoom=config.views.find(v=>v.path==="pieces").sections
   .find(s=>s.cards.some(c=>c.type==="tile"&&
     c.entity==="light.lampe"&&c.name==="Lampe personnalisée par l'habitant"));
 assert(afterCustomizedRoom,"La section personnalisée doit être conservée");
 assert(!afterCustomizedRoom.cards.some(c=>c.type==="area"&&c.area==="salon"),
   "La carte Pièce standard obsolète doit disparaître même si la section est conservée");
 assert(!config.views.find(v=>v.path==="accueil").sections.flatMap(s=>s.cards)
   .some(c=>c.type==="area"&&c.area==="salon"),
   "L'Accueil ne doit pas afficher la pièce supprimée");
 const allPaths=["accueil","pieces","lumieres","volets","climatisation","prises","musique","securite"];
 for(const p of allPaths) {
   assert(!config.views.find(v=>v.path===p).sections
     .flatMap(s=>s.cards).some(c=>c.type==="area"&&["salon","cuisine"].includes(c.area)),
     "Pièce fantôme dans "+p);
 }
 console.log("Tests KIMIA v1 : OK - ajout, répartition, non-écrasement, idempotence et accès admin, retrait sécurisé et respect des personnalisations et retrait des pièces supprimées");
}
main().catch(error=>{console.error(error);process.exitCode=1;});