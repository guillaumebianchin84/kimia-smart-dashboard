/* KIMIA Routines V3 — tests d'isolation et de fidélité. */
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const window={customCards:[],confirm:()=>true,location:{assign:url=>navigation.push(url)}};
const navigation=[],elements=new Map();
const customElements={get:t=>elements.get(t),define:(t,c)=>elements.set(t,c)};
const ctx={window,customElements,HTMLElement:class HTMLElement{}};
for(const name of ["www/kimia-routine-engine-v16.js","www/kimia-routines-v3-card.js"])
 vm.runInNewContext(fs.readFileSync(name,"utf8"),ctx,{filename:name});
const H=window.KimiaRoutineEngineV16,V=window.KimiaRoutinesV3,Card=elements.get("kimia-routines-v3-card");
assert(H&&V&&Card);
const clone=v=>JSON.parse(JSON.stringify(v));
const states={
 "automation.kimia_tech_theme":{state:"on",attributes:{id:"kimia_tech_theme",friendly_name:"KIMIA - Appliquer le thème client"}},
 "automation.kimia_tech_pieces":{state:"on",attributes:{id:"kimia_tech_pieces",friendly_name:"KIMIA - Initialiser le bouton Pièces une seule fois"}},
 "automation.kimia_tech_tabs":{state:"on",attributes:{id:"kimia_tech_tabs",friendly_name:"KIMIA - Initialiser les onglets visibles une seule fois"}},
 "automation.eclairage_salon":{state:"on",attributes:{id:"eclairage_salon",friendly_name:"Éclairage du salon"}},
 "script.bonne_nuit":{state:"off",attributes:{friendly_name:"Bonne nuit"}},
 "input_boolean.kimia_onglet_musique":{state:"on",attributes:{friendly_name:"Afficher Musique"}},
 "light.salon":{state:"off",attributes:{friendly_name:"Plafonnier salon"}},
 "cover.salon":{state:"open",attributes:{friendly_name:"Volet salon"}},
 "sensor.temperature":{state:"21",attributes:{friendly_name:"Thermomètre"}},
 "binary_sensor.mouvement":{state:"off",attributes:{friendly_name:"Mouvement salon"}}
};
const all=clone(V.listRoutines(states));
assert.equal(all.length,5);
assert.equal(all.filter(x=>x.internal).length,3,"automations système masquées dans l'UI seulement");
assert.equal(all.filter(x=>!x.internal).length,2);
assert(!all.find(x=>x.name==="Éclairage du salon").internal);
assert(!all.find(x=>x.name==="Bonne nuit").internal);
assert.equal(V.nativeUrl("script"),"/config/script/dashboard");
assert.equal(V.nativeUrl("automation","auto_test"),"/config/automation/edit/auto_test");
const areas=[{area_id:"salon",name:"Salon"},{area_id:"chambre",name:"Chambre"}];
const devices=[{id:"d1",area_id:"salon"}];
const entities=[{entity_id:"light.salon",device_id:"d1"},
 {entity_id:"cover.salon",area_id:"salon"},
 {entity_id:"sensor.temperature",area_id:"chambre"},
 {entity_id:"binary_sensor.mouvement",area_id:"salon"}];
const lights=clone(V.availableEntities(states,entities,devices,areas,"light",false));
assert.equal(lights.length,1);
assert.equal(lights[0].areaName,"Salon");
assert.equal(V.availableEntities(states,entities,devices,areas,"input_boolean",false).length,0,
 "Pas de helper 'Afficher Musique' dans les appareils ordinaires");
assert.equal(V.availableEntities(states,entities,devices,areas,"input_boolean",true).length,1);
const simple=H.create("automation");
simple.alias="Lumière salon";
simple.triggers=[H.trigger("time")];
simple.actions=[{type:"call",entity:"light.salon",operation:"turn_on",value:""}];
assert(V.guardSimple(simple));
simple.actions.push({type:"delay",seconds:90});
assert(V.guardSimple(simple));
simple.actions.push({type:"call",entity:"light.salon",operation:"turn_off",value:""});
assert.equal(V.guardSimple(simple),true,"Deux commandes successives sur la même lampe restent éditables, sans relecture destructive");
simple.actions=[{type:"if",conditions:[H.condition("state")],then:[],else:[]}];
assert.equal(V.guardSimple(simple),false,"Routines complexes => Home Assistant");
const hold=H.create("automation");hold.alias="Conservation état";hold.actions=[H.action("delay")];
hold.triggers=[{type:"state",entity:"binary_sensor.mouvement",to:"on",from:"off",seconds:45}];
assert.equal(V.guardSimple(hold),false,"État précédent et durée masqués => ouverture native");
const tech=H.create("script");tech.alias="Paramètres internes";
tech.actions=[{type:"call",entity:"input_boolean.kimia_onglet_musique",operation:"turn_on",value:""}];
assert.equal(V.guardSimple(tech),false,"Ne pas afficher l'édition des helpers techniques en mode novice");

const db=new Map(),apiCalls=[],serviceCalls=[];
const ha={
 user:{is_admin:true,id:"admin"},
 states,
 callApi:async(method,path,data)=>{
  apiCalls.push({method,path,data});
  if(method==="GET"){if(!db.has(path))throw Object.assign(Error("Not Found"),{status:404});return clone(db.get(path));}
  if(method==="POST"){db.set(path,clone(data));return {};}
  throw Error("Unsupported method "+method);
 },
 callService:async(domain,action,params)=>{serviceCalls.push({domain,action,params});return {};},
 callWS:async()=>[]
};
const card=Object.create(Card.prototype);
Object.assign(card,{_hass:ha,_busy:false,_page:"edit",_notice:"",_error:false,
 _draft:H.create("script"),_editing:null,_drawer:null,
 _registry:{areas,entities,devices},_experimental:false,_render(){},
 _clearPicker(){this._drawer=null;}});
card._draft.alias="Coucher du soleil";
card._draft.actions=[
 {type:"call",entity:"light.salon",operation:"turn_off",value:""},
 {type:"delay",seconds:10},
 {type:"call",entity:"cover.salon",operation:"close_cover",value:""}
];
assert.match(card._editor(),/ACTIONS/);
assert.doesNotMatch(card._editor(),/QUAND…/,"Le script n'a pas de déclencheur");
const auto=H.create("automation");auto.alias="Automatisme test";auto.triggers=[H.trigger("sun")];auto.actions=[H.action("delay")];
card._draft=auto;
assert.match(card._editor(),/QUAND/);
assert.match(card._editor(),/ALORS/);
card._draft=H.create("script");card._draft.alias="Scénario test";
card._draft.actions=[{type:"call",entity:"light.salon",operation:"turn_on",value:""}];

async function test(){
 await card._save();
 assert.equal(db.size,1);
 assert.equal(serviceCalls.length,0,"Aucun appareil n'est commandé lors de création");
 assert.equal(card._page,"home");
 const created=[...db.entries()][0];
 assert.match(created[0],/^config\/script\/config\/ks_/);
 assert.equal(created[1].sequence[0].action,"light.turn_on");
 const savedURL=created[0],scriptId=savedURL.split("/").at(-1);
 // Contrôle de conformité avant modification guidée : même configuration HA en entrée/sortie.
 states["script."+scriptId]={state:"off",attributes:{friendly_name:"Scénario test"}};
 await card._load("script."+scriptId);
 assert.equal(card._page,"edit");
 assert.equal(card._editing.id,scriptId);
 card._draft.actions[0].operation="turn_off";
 await card._save();
 assert.equal(db.get(savedURL).sequence[0].action,"light.turn_off");
 // Interdire toute réécriture concurrente.
 await card._load("script."+scriptId);
 db.get(savedURL).description="Modification externe";
 await card._save();
 assert(card._error);
 assert.equal(db.get(savedURL).description,"Modification externe");
 // Complexité HA inconnue : redirection native, sans write.
 const complexId="config/automation/config/auto_complex";
 db.set(complexId,{id:"auto_complex",alias:"Automatisation complexe",mode:"single",
  triggers:[{trigger:"time",at:"18:00:00"}],conditions:[],
  actions:[{choose:[{conditions:[],sequence:[{action:"light.turn_on"}]}]}]});
 states["automation.auto_complex"]={state:"on",attributes:{friendly_name:"Automatisation complexe",id:"auto_complex"}};
 const n=apiCalls.filter(x=>x.method==="POST").length;
 await card._load("automation.auto_complex");
 assert.equal(navigation.at(-1),"/config/automation/edit/auto_complex");
 assert.equal(apiCalls.filter(x=>x.method==="POST").length,n);
 // Aucune écriture depuis les comptes non admin.
 const denied=Object.create(Card.prototype);
 Object.assign(denied,{_hass:{...ha,user:{id:"child",is_admin:false}},_draft:H.create("script"),_busy:false});
 await denied._save();assert.equal(apiCalls.filter(x=>x.method==="POST").length,n);
 const src=fs.readFileSync("www/kimia-routines-v3-card.js","utf8");
 assert(!/lovelace\/config\/save|area_registry\/update|input_text\.kimia_|theme\/set/.test(src),
  "Code indépendant de la maquette, des thèmes, des users et du dashboard");
 console.log("KIMIA Routines V3 OK : éditeur un écran, HA, CRUD sûr, scènes, aides, zones, routage natif, isolation.");
}
test().catch(err=>{console.error(err);process.exitCode=1;});
