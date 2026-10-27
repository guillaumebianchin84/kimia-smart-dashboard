/* Test de non-régression sur le véritable dashboard d'import KIMIA du dépôt.
 * Convertit YAML -> JSON en lecture seule avec PyYAML, jamais de save HA.
 */
const assert=require("node:assert/strict");
const {spawnSync}=require("node:child_process");
const ext=require("../www/kimia-native-extension-v1.js");
const p=spawnSync("python3",["-c",
 "import yaml,json; print(json.dumps(yaml.safe_load(open('dashboard-kimia-next-ui-import.yaml',encoding='utf-8'))))"],
 {encoding:"utf8",maxBuffer:5*1024*1024});
if(p.status!==0)throw Error("Lecture YAML échouée : "+p.stderr);
const original=JSON.parse(p.stdout);
const clone=x=>JSON.parse(JSON.stringify(x));
const before=clone(original);
const states={
 "binary_sensor.test_porte":{state:"off",attributes:{device_class:"door"}},
 "camera.test_salon":{state:"idle",attributes:{friendly_name:"Caméra test"}},
 "sensor.test_puissance":{state:"940",attributes:{device_class:"power",unit_of_measurement:"W"}},
 "sensor.test_energie":{state:"3.1",attributes:{device_class:"energy",unit_of_measurement:"kWh"}}
};
const entities=[
 {entity_id:"binary_sensor.test_porte",device_id:"capteur1"},
 {entity_id:"camera.test_salon",device_id:"camera1"},
 {entity_id:"sensor.test_puissance",device_id:"compteur1"},
 {entity_id:"sensor.test_energie",device_id:"compteur1"}
],devices=[
 {id:"camera1",area_id:"salon",name:"Caméra de test"},
 {id:"compteur1",area_id:"salon",name:"Compteur électrique"}
],areas=[{area_id:"salon",name:"Salon"}];
const p1=ext.plan({dashboard:original,states,entities,devices,areas});
assert.deepEqual(original,before,"Le plan n'altère JAMAIS l'objet du dashboard source");
assert(p1.changed);
assert.equal(p1.added.camera,1);
assert.equal(p1.added.energy,1);
const originalSec=original.views.find(v=>v.path==="securite");
const newSec=p1.config.views.find(v=>v.path==="securite");
assert(originalSec&&newSec);
assert.deepEqual(newSec.sections.slice(0,originalSec.sections.length),originalSec.sections,
 "Bandeau, icônes, cartes et navbar de Sécurité restent rigoureusement identiques");
for(const view of original.views.filter(v=>v.path!=="securite")){
 assert.deepEqual(p1.config.views.find(v=>v.path===view.path),view,
 "Vue historique non modifiée : "+view.path);
}
assert.equal(p1.config.views.length,original.views.length+1,
 "Une seule nouvelle vue native Énergie");
const newCards=p1.config.views.find(v=>v.path==="energie").sections.flatMap(s=>s.cards||[]);
assert(newCards.every(c=>!c.type.startsWith("custom:")));
const newCameras=newSec.sections.slice(originalSec.sections.length).flatMap(s=>s.cards||[]);
assert(newCameras.every(c=>!c.type.startsWith("custom:")));
assert.deepEqual(ext.plan({dashboard:p1.config,states,entities,devices,areas}).config,p1.config,
 "Import KIMIA réel reste stable au deuxième passage");
console.log("KIMIA snapshot réel OK : "+original.views.length+" vues historiques intouchées, Sécurité préservée, extension native sans doublon.");
