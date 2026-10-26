/* KIMIA Studio V2 — isolé, aucune mutation des dashboards ou des cartes existantes. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const window={customCards:[],confirm:()=>true,location:{assign:path=>links.push(path)}};
const links=[],registered=new Map();
const customElements={get:name=>registered.get(name),define:(name,clazz)=>registered.set(name,clazz)};
const context={window,customElements,HTMLElement:class{}};
for(const file of ["www/kimia-routine-engine-v16.js","www/kimia-studio-v2-admin-card.js"])
 vm.runInNewContext(fs.readFileSync(file,"utf8"),context,{filename:file});
const E=window.KimiaRoutineEngineV16,S=window.KimiaStudioV2,Card=registered.get("kimia-studio-v2-admin-card");
assert(E&&S&&Card,"moteur et carte V2 enregistrés sans dépendance aux autres dashboards");
const plain=x=>JSON.parse(JSON.stringify(x));
const states={
 "light.salon":{state:"off",attributes:{friendly_name:"Lumière du salon"}},
 "light.chambre":{state:"on",attributes:{friendly_name:"Lumière chambre"}},
 "cover.salon":{state:"closed",attributes:{friendly_name:"Volet salon"}},
 "sensor.solaire":{state:"350",attributes:{friendly_name:"Production solaire"}},
 "script.ks_dodo":{state:"off",attributes:{friendly_name:"Bonne nuit"}},
 "script.script_externe":{state:"off",attributes:{friendly_name:"Depuis Home Assistant"}},
 "automation.arrivee":{state:"on",attributes:{friendly_name:"Automatisation externe",id:"outside"}},
 "automation.kimia_auto":{state:"off",attributes:{friendly_name:"KIMIA énergie",id:"kimia_energy"}}
};
const areas=[{area_id:"salon",name:"Salon / séjour"},{area_id:"chambre",name:"Chambre"}];
const devs=[{id:"dev_salon",area_id:"salon"},{id:"dev_chambre",area_id:"chambre"}];
const ents=[{entity_id:"light.salon",device_id:"dev_salon"},
 {entity_id:"light.chambre",area_id:"chambre"},
 {entity_id:"cover.salon",device_id:"dev_salon"}];
const catalog=plain(S.routineCatalog(states));
assert.equal(catalog.length,4,"Liste de toutes les routines HA, pas seulement KIMIA");
assert.equal(catalog.find(r=>r.id==="automation.arrivee").own,false);
assert.equal(catalog.find(r=>r.id==="automation.kimia_auto").own,true);
assert.equal(catalog.find(r=>r.id==="script.script_externe").own,false);
const devices=plain(S.deviceCatalog(states,ents,devs,areas,E.OPERATIONS));
assert.equal(devices.find(d=>d.id==="light.salon").room,"Salon / séjour");
assert.equal(devices.find(d=>d.id==="light.chambre").area,"chambre");
assert(!devices.some(d=>d.id==="sensor.solaire"),"Capteur brut n'est pas un appareil actionnable");
assert.equal(S.defaultOp("light","night",E.OPERATIONS),"turn_off");
assert.equal(S.defaultOp("cover","night",E.OPERATIONS),"close_cover");
assert.equal(S.defaultOp("light","arrival",E.OPERATIONS),"turn_on");
assert.equal(S.defaultOp("climate","energy",E.OPERATIONS),"set_temperature");

const db=new Map(),calls=[];
const hass={user:{is_admin:true,id:"admin"},states,callApi:async(method,path,payload)=>{
 calls.push({method,path,payload});
 if(method==="GET"){
  if(!db.has(path))throw Object.assign(new Error("404 Not Found"),{status:404});
  return plain(db.get(path));
 }
 if(method==="POST"){db.set(path,plain(payload));return {};}
 throw Error("Only GET and POST allowed");
},callService:async(domain,service,data)=>{calls.push({domain,service,data});},callWS:async()=>[]};
const card=Object.create(Card.prototype);
Object.assign(card,{_hass:hass,_busy:false,_notice:"",_error:false,_page:"wizard",_tab:"all",
 _draft:E.create("script"),_selected:new Set(["light.salon","cover.salon"]),
 _reg:{areas,entities:ents,devices:devs},_preset:"night",_step:1,_devices(){return devices;},
 _draw(){},_all(){return catalog;},_msg(msg,err){this._notice=msg;this._error=err;}});
card._draft.alias="Bonne nuit";
card._syncActions();
assert.deepEqual(plain(card._draft.actions.map(x=>[x.entity,x.operation])),
 [["light.salon","turn_off"],["cover.salon","close_cover"]]);
card._step=3;card._next();assert.equal(card._step,4);
const parsed=plain(E.serialize(card._draft,"test_id"));
assert.equal(parsed.sequence.length,2);
assert(!calls.some(x=>x.domain),"Aucune commande HA lancée à l'édition");
async function check(){
 await card._save();
 assert(!card._error,card._notice);
 assert.equal(card._page,"library");
 assert.equal(db.size,1);
 assert.equal([...db.values()][0].alias,"Bonne nuit");
 assert(!calls.some(x=>x.domain),"Création ne doit pas appeler un service");
 const autom=E.create("automation");
 autom.alias="Soleil salon";autom.triggers=[E.trigger("sun")];
 autom.actions=[{type:"call",entity:"light.salon",operation:"turn_on",value:""}];
 card._draft=autom;card._page="wizard";card._step=4;
 await card._save();
 assert(!card._error,card._notice);
 assert.equal(db.size,2,"Créer script et automatisation sans toucher aux autres");
 const auto=[...db.values()].find(x=>x.triggers);
 assert.equal(auto.triggers[0].trigger,"sun");
 assert.equal(auto.actions[0].action,"light.turn_on");
 card._edit("automation.arrivee");
 assert.equal(links.at(-1),"/config/automation/edit/outside",
  "Routines externes redirigées à HA sans réécriture");
 card._edit("automation.kimia_auto");
 assert.equal(card._page,"advanced","Éditeur avancé KIMIA accessible");
 const notAdmin=Object.create(Card.prototype);
 Object.assign(notAdmin,{_hass:{...hass,user:{id:"child",is_admin:false}},_busy:false,
  _draft:autom,_draw(){},_msg(){throw Error("Unauthorized should not save");}});
 const n=db.size;
 await notAdmin._save();assert.equal(db.size,n,"Non-admin ne peut jamais créer");
 assert(!calls.some(c=>c.path?.includes("lovelace")||c.domain),
  "Pas de modification dashboard, réglages KIMIA, pièces ou équipements");
 const file=fs.readFileSync("www/kimia-studio-v2-admin-card.js","utf8");
 assert(!/lovelace\/config\/save|input_text\.kimia_|set_theme|area_registry\/update/.test(file),
  "Nouveau Studio isolé et sans mutation globale HA");
 console.log("KIMIA Studio V2 OK : catalogue HA, zones dynamiques, scénarios, automatisations, permissions, isolation.");
}
check().catch(e=>{console.error(e);process.exitCode=1;});
