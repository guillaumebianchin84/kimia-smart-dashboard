/* Tests autonomes : un seul équipement = une carte native ; aucune régression. */
const assert=require("node:assert/strict");
const ext=require("../www/kimia-native-extension-v1.js");
const clone=x=>JSON.parse(JSON.stringify(x));
const keep={type:"custom:button-card",custom_fields:{logo:"KIMIA by PROMAINT",slogan:"Sécurité"}};
const navbar={type:"custom:navbar-card",routes:[
 {url:"/kimia-next/accueil",icon:"mdi:home",label:"Accueil"},
 {url:"/kimia-next/securite",icon:"mdi:shield-home-outline",label:"Sécurité"}
]};
const original={title:"KIMIA Smart",views:[
 {title:"Accueil",path:"accueil",type:"sections",sections:[{type:"grid",cards:[{type:"markdown",content:"Accueil validé"}]}]},
 {title:"Sécurité",path:"securite",icon:"mdi:shield-home-outline",type:"sections",
  sections:[{type:"grid",cards:[keep]},{type:"grid",cards:[{
   type:"tile",entity:"binary_sensor.porte",name:"Porte principale",
   grid_options:{columns:6,rows:1}
  }]},{type:"grid",cards:[navbar]}]},
 {title:"Paramètres",path:"parametres",sections:[{type:"grid",cards:[{type:"markdown",content:"Réglages validés"}]}]}
]};
const states={
 "camera.camera_salon_main":{state:"idle",attributes:{friendly_name:"Caméra salon"}},
 "camera.camera_salon_sub":{state:"idle",attributes:{friendly_name:"Flux bas"}},
 "camera.camera_cour":{state:"unavailable",attributes:{friendly_name:"Caméra cour"}},
 "binary_sensor.porte":{state:"off",attributes:{device_class:"door"}},
 "sensor.energie_w":{state:"1200",attributes:{friendly_name:"Puissance instantanée",device_class:"power",unit_of_measurement:"W"}},
 "sensor.energie_kwh":{state:"18.2",attributes:{friendly_name:"Énergie",device_class:"energy",unit_of_measurement:"kWh"}},
 "sensor.pressure":{state:"1.8",attributes:{unit_of_measurement:"bar"}},
 "switch.pompe":{state:"off",attributes:{friendly_name:"Surpresseur"}},
 "binary_sensor.secteur":{state:"on",attributes:{friendly_name:"Réseau public"}},
 "switch.demande_groupe":{state:"off",attributes:{friendly_name:"Contact demande groupe"}},
 "binary_sensor.groupe_tourne":{state:"off",attributes:{friendly_name:"Retour fonctionnement groupe"}}
};
const areas=[{area_id:"salon",name:"Salon"},{area_id:"cour",name:"Cour"}];
const devices=[{id:"c1",area_id:"salon",name:"Caméra du salon"},
 {id:"c2",area_id:"cour",name:"Caméra extérieure"},
 {id:"m1",area_id:"salon",name:"Compteur principal"}];
const entities=[
 {entity_id:"camera.camera_salon_main",device_id:"c1",name:"Flux principal"},
 {entity_id:"camera.camera_salon_sub",device_id:"c1",name:"Flux secondaire"},
 {entity_id:"camera.camera_cour",device_id:"c2"},
 {entity_id:"binary_sensor.porte",area_id:"salon"},
 {entity_id:"sensor.energie_w",device_id:"m1"},
 {entity_id:"sensor.energie_kwh",device_id:"m1"},
 {entity_id:"sensor.pressure",area_id:"cour"},
 {entity_id:"switch.pompe",area_id:"cour"},
 {entity_id:"binary_sensor.secteur"},
 {entity_id:"switch.demande_groupe"},
 {entity_id:"binary_sensor.groupe_tourne"}
];
const equipment={
 pressureSensor:"sensor.pressure",pumpCommand:"switch.pompe",
 mainsPresent:"binary_sensor.secteur",generatorRequest:"switch.demande_groupe",
 generatorRunning:"binary_sensor.groupe_tourne"
};
const p=x=>ext.plan({dashboard:x,states,entities,devices,areas,equipment});
const first=p(original);
assert(first.changed);
assert.equal(first.added.camera,2);
assert.equal(first.added.energy,1);
assert.equal(first.url,"/kimia-next/energie");
const next=first.config;
const originalSecurity=original.views[1];
const security=next.views[1],energy=next.views.find(v=>v.path==="energie");
assert.equal(original.views.length,3,"Aucune mutation de l'objet d'origine");
assert.deepEqual(security.sections.slice(0,3),originalSecurity.sections,
 "AUCUNE modification du bandeau, navbar, tuiles, icônes, ordre ou capteurs");
assert.deepEqual(next.views[0],original.views[0]);
assert.deepEqual(next.views[2],original.views[2]);
assert.equal(security.icon,"mdi:shield-home-outline");
const all=view=>view.sections.flatMap(s=>s.cards||[]);
const photos=all(security).filter(c=>c.type==="picture-entity");
assert.equal(photos.length,2,"Une caméra physique => une seule carte native");
assert(photos.every(c=>c.camera_view==="live"));
assert(photos.some(c=>c.entity==="camera.camera_salon_main"));
assert(!photos.some(c=>c.entity==="camera.camera_salon_sub"));
assert(photos.some(c=>c.entity==="camera.camera_cour"),
 "Une caméra momentanément indisponible reste visible");
assert(all(security).some(c=>c.entity==="binary_sensor.porte"),
 "Les capteurs de porte restent inchangés");
const newSecurity=security.sections.slice(3).flatMap(s=>s.cards);
assert(newSecurity.every(c=>!c.type.startsWith("custom:")));
const native=all(energy);
assert(native.every(c=>!c.type.startsWith("custom:")),
 "Énergie et Eau : uniquement cartes natives HA");
assert.equal(native.filter(c=>c.type==="entities").length,1,
 "Le compteur physique avec W et kWh n'a qu'une carte native");
assert.deepEqual(native.find(c=>c.type==="entities").entities,["sensor.energie_w","sensor.energie_kwh"]);
for(const id of ["sensor.pressure","switch.pompe","binary_sensor.secteur","switch.demande_groupe","binary_sensor.groupe_tourne"])
 assert.equal(native.filter(c=>c.entity===id).length,1,"Une seule carte native pour "+id);
assert(energy.subview&&energy.back_path==="/kimia-next/accueil");
const again=p(next);
assert.equal(again.changed,false,"Deuxième application strictement idempotente");
assert.deepEqual(again.config,next);
const manually=clone(original);
manually.views[1].sections.push({type:"grid",cards:[{
 type:"picture-entity",entity:"camera.camera_salon_sub",camera_view:"live"
}]});
const hand=p(manually);
assert.equal(hand.added.camera,1,
 "N'ajoute jamais un flux caméra en double si l'utilisateur a placé une autre entité du même appareil");
assert.deepEqual(hand.config.views[1].sections.slice(0,manually.views[1].sections.length),
 manually.views[1].sections);
const drafts=ext.automationDrafts({
 pressureSensor:"sensor.pressure",pumpRequest:"switch.pompe",
 pumpPermissive:"binary_sensor.pompe_autorisee",
 mainsPresent:"binary_sensor.secteur",
 generatorRequest:"switch.demande_groupe",generatorReady:"binary_sensor.groupe_pret",
 pressureLow:1.5,pressureHigh:3,delaySeconds:30
});
assert.equal(drafts.length,4);
assert(drafts.every(d=>d.initial_state===false&&d.actions.every(a=>a.action.startsWith("switch."))),
 "Les automations ne démarrent jamais par défaut et n'utilisent pas ATS/contactor");
assert(drafts[0].conditions.some(c=>c.entity_id==="binary_sensor.pompe_autorisee"));
assert(drafts[2].conditions.some(c=>c.entity_id==="binary_sensor.groupe_pret"));
assert.throws(()=>ext.automationDrafts({
 pressureSensor:"sensor.pressure",pumpRequest:"switch.pompe",
 pumpPermissive:"binary_sensor.pompe_autorisee",mainsPresent:"binary_sensor.secteur",
 generatorRequest:"switch.demande_groupe",generatorReady:"binary_sensor.groupe_pret",
 pressureLow:3,pressureHigh:1
}),/Seuils de pression invalides/);
const calls=[];
let live=clone(original);
const hass={user:{is_admin:true},states,callWS:async request=>{
 calls.push(request.type);
 if(request.type==="lovelace/dashboards/list")return [{url_path:"kimia-next",mode:"storage"}];
 if(request.type==="lovelace/config")return clone(live);
 if(request.type==="config/entity_registry/list")return clone(entities);
 if(request.type==="config/device_registry/list")return clone(devices);
 if(request.type==="config/area_registry/list")return clone(areas);
 if(request.type==="lovelace/config/save"){live=clone(request.config);return {};}
 throw Error("WS inconnu "+request.type);
}};
(async()=>{
 await assert.rejects(ext.apply(hass,{equipment}),/Confirme explicitement/);
 assert.deepEqual(calls,[],"Pas de lecture ni écriture sans consentement");
 await assert.rejects(ext.apply({...hass,user:{is_admin:false}},{confirm:true,equipment}),/administrateur/);
 assert.deepEqual(calls,[]);
 const applied=await ext.apply(hass,{confirm:true,equipment});
 assert(applied.changed&&calls.includes("lovelace/config/save"));
 const totalWrites=calls.filter(x=>x==="lovelace/config/save").length;
 const same=await ext.apply(hass,{confirm:true,equipment});
 assert(!same.changed&&calls.filter(x=>x==="lovelace/config/save").length===totalWrites);
 console.log("KIMIA native V1 OK : Sécurité, Energie, Eau, Secours, 1 équipement = 1 carte, conservation navbar/banner et aucun custom ni effet automatique.");
})().catch(e=>{console.error(e);process.exitCode=1});
