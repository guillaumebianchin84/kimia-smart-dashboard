/* Validation du bouton « Actualiser ma maison » réel, dashboard et configuration admin
 * sur les imports YAML historiques : aucune carte custom créée par extension.
 */
const assert=require("node:assert/strict");
const {spawnSync}=require("node:child_process");
const vm=require("node:vm");
const fs=require("node:fs");
function loadYaml(file){
 const child=spawnSync("python3",["-c",
  "import yaml,json,sys;print(json.dumps(yaml.safe_load(open(sys.argv[1],encoding='utf8'))))",file],
  {encoding:"utf8",maxBuffer:10*1024*1024});
 if(child.status!==0)throw Error(child.stderr);
 return JSON.parse(child.stdout);
}
const originalClient=loadYaml("dashboard-kimia-next-ui-import.yaml");
const originalAdmin=loadYaml("kimia-admin-next-ui-import.yaml");
const yamlPackage=loadYaml("packages/kimia_energie_eau_secours_v1.yaml");
assert.equal(Object.keys(yamlPackage.input_text).length,5);
assert(!yamlPackage.automation&&!yamlPackage.script&&!yamlPackage.switch,
 "Le package n'automatise et ne déclenche aucun équipement");
const copy=x=>JSON.parse(JSON.stringify(x));
const window={dispatchEvent:()=>{}};
class CustomEvent {constructor(name,args){this.type=name;this.detail=args?.detail;}}
vm.runInNewContext(fs.readFileSync("www/kimia-native-extension-v1.js","utf8"),{window,CustomEvent});
vm.runInNewContext(fs.readFileSync("www/kimia-smart-core-v1.js","utf8"),{window,CustomEvent});
const client=originalClient,admin=originalAdmin;
const areas=[{area_id:"salon",name:"Salon"},{area_id:"cour",name:"Cour"}];
const devices=[{id:"cam1",area_id:"salon",name:"Caméra du salon"},
 {id:"cam2",area_id:"cour",name:"Caméra terrasse"},
 {id:"compteur1",area_id:"salon",name:"Compteur principal"},
 {id:"pompe1",area_id:"cour",name:"Pompe eau"}];
const entities=[
 {entity_id:"camera.test_salon",device_id:"cam1"},
 {entity_id:"camera.test_terrasse",device_id:"cam2"},
 {entity_id:"sensor.test_w",device_id:"compteur1"},
 {entity_id:"sensor.test_kwh",device_id:"compteur1"},
 {entity_id:"sensor.test_pression",device_id:"pompe1"},
 {entity_id:"switch.test_pompe",device_id:"pompe1"},
 {entity_id:"binary_sensor.test_secteur",area_id:"cour"},
 {entity_id:"switch.test_demande_groupe",area_id:"cour"},
 {entity_id:"binary_sensor.test_groupe_marche",area_id:"cour"}
];
const states={
 "camera.test_salon":{state:"idle",attributes:{friendly_name:"Salon"}},
 "camera.test_terrasse":{state:"unavailable",attributes:{friendly_name:"Caméra jardin"}},
 "sensor.test_w":{state:"250",attributes:{device_class:"power",unit_of_measurement:"W"}},
 "sensor.test_kwh":{state:"16",attributes:{device_class:"energy",unit_of_measurement:"kWh"}},
 "sensor.test_pression":{state:"1.5",attributes:{device_class:"pressure",unit_of_measurement:"bar"}},
 "switch.test_pompe":{state:"off",attributes:{}},
 "binary_sensor.test_secteur":{state:"on",attributes:{}},
 "switch.test_demande_groupe":{state:"off",attributes:{}},
 "binary_sensor.test_groupe_marche":{state:"off",attributes:{}}
};
const binding={
 "input_text.kimia_eau_pression_entite":"sensor.test_pression",
 "input_text.kimia_eau_surpresseur_entite":"switch.test_pompe",
 "input_text.kimia_secours_reseau_entite":"binary_sensor.test_secteur",
 "input_text.kimia_secours_demande_groupe_entite":"switch.test_demande_groupe",
 "input_text.kimia_secours_groupe_marche_entite":"binary_sensor.test_groupe_marche"
};
for(const [id,state] of Object.entries(binding))states[id]={state,attributes:{}};
let savedClient=copy(client),savedAdmin=copy(admin);
const writes=[];
const hass={
 user:{is_admin:true},states,
 callWS:async request=>{
  switch(request.type){
   case "lovelace/dashboards/list":return [
    {url_path:"kimia-next",mode:"storage"},
    {url_path:"kimia-admin-next",mode:"storage"}];
   case "config/area_registry/list":return copy(areas);
   case "config/device_registry/list":return copy(devices);
   case "config/entity_registry/list":return copy(entities);
   case "config/auth/list":return [];
   case "lovelace/config":return copy(request.url_path==="kimia-next"?savedClient:savedAdmin);
   case "lovelace/config/save":
    writes.push(request.url_path);
    if(request.url_path==="kimia-next")savedClient=copy(request.config);
    else if(request.url_path==="kimia-admin-next")savedAdmin=copy(request.config);
    else throw Error("Chemin sauvegarde non autorisé");
    return {};
   default:throw Error("WS inconnue: "+request.type);
  }
 }
};
const all=view=>(view?.sections||[]).flatMap(s=>s.cards||[]);
(async()=>{
 const result=await window.KimiaSmartCore.sync(hass);
 assert.equal(result.state,"ok");
 assert(writes.includes("kimia-next")&&writes.includes("kimia-admin-next"),
  "Le même bouton actualise dashboard client ET configuration admin");
 assert(!writes.some(x=>!["kimia-next","kimia-admin-next"].includes(x)));
 const securityOld=client.views.find(v=>v.path==="securite");
 const securityNew=savedClient.views.find(v=>v.path==="securite");
 assert.deepEqual(securityNew.sections.slice(0,securityOld.sections.length),
  securityOld.sections,"Section Sécurité historique, navbar, cartes et bandeau inchangés");
 assert(all(securityNew).some(c=>c.entity==="camera.test_salon"));
 assert(all(securityNew).some(c=>c.entity==="camera.test_terrasse"));
 const energy=savedClient.views.find(v=>v.path==="energie");
 assert(energy&&energy.subview);
 const energyCards=all(energy);
 assert(energyCards.some(c=>c.type==="entities"&&c.entities.includes("sensor.test_w")&&
    c.entities.includes("sensor.test_kwh")),
   "Puissance et énergie = une seule carte par compteur");
 assert(energyCards.some(c=>c.type==="entities"&&c.entities.some(x=>x.entity==="sensor.test_pression")&&
    c.entities.some(x=>x.entity==="switch.test_pompe")),
   "Pression et commande du même contrôleur = carte native unique");
 assert(energyCards.every(c=>!c.type.startsWith("custom:")));
 const adminNew=savedAdmin.views.find(v=>v.path==="energie-eau");
 assert(adminNew&&adminNew.subview);
 assert(all(adminNew).some(c=>c.type==="entities"&&c.entities.length===5),
   "Cinq champs HA natifs dans configuration admin");
 assert(all(adminNew).every(c=>!c.type.startsWith("custom:")));
 assert.deepEqual(savedAdmin.views.find(v=>v.path==="demarrer").sections.slice(0,
    admin.views.find(v=>v.path==="demarrer").sections.length),
  admin.views.find(v=>v.path==="demarrer").sections,
  "Configuration admin déjà validée inchangée");
 const accueilOld=client.views.find(v=>v.path==="accueil");
 // Le moteur KIMIA existant migre déjà la Maquette via son enveloppe ACL.
 // L'extension, elle, ne modifie ni bandeau, ni navbar ni cartes visuelles.
 const actualHome=all(savedClient.views.find(v=>v.path==="accueil"));
 for(const type of ["custom:button-card","custom:navbar-card","custom:clock-weather-card"]){
  assert.deepEqual(actualHome.filter(card=>card.type===type),
   all(accueilOld).filter(card=>card.type===type),
   "Bandeau, navbar et cartes historiques inchangés : "+type);
 }
 const home=all(savedClient.views.find(v=>v.path==="accueil"));
 assert(home.some(c=>c.type==="shortcut"&&c.tap_action.navigation_path==="/kimia-next/energie"));
 assert.equal(savedClient.views.filter(v=>v.path==="energie").length,1);
 assert.equal(savedAdmin.views.filter(v=>v.path==="energie-eau").length,1);
 const countBefore=writes.length;
 const again=await window.KimiaSmartCore.sync(hass);
 assert.equal(again.state,"ok");
 console.log("DEBUG second sync :",JSON.stringify({second:again,writes:writes.slice(countBefore)}));
 assert.equal(writes.length,countBefore,
  "AUCUNE nouvelle sauvegarde au deuxième Actualiser ma maison");
 console.log("KIMIA réel + admin OK : boutons existants, 2 dashboards synchronisés, native-only, idempotence, aucune navigation historique changée.");
})().catch(e=>{console.error(e);process.exitCode=1});
