/* KIMIA V1.6 — modèle partagé scripts/automatisations + CRUD simulé. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const window={customCards:[],confirm:()=>true};
const elements=new Map();
const customElements={get:x=>elements.get(x),define:(x,c)=>elements.set(x,c)};
const document={createElement:tag=>({
 tag,children:[],textContent:"",className:"",value:"",setAttribute(){},
 append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},
 addEventListener(){},getAttribute(){return null;}
})};
for(const src of ["www/kimia-routine-engine-v16.js","www/kimia-routine-editor-v16-card.js"]){
 vm.runInNewContext(fs.readFileSync(src,"utf8"),{window,document,HTMLElement:class HTMLElement{},customElements,Date,Math});
}
const E=window.KimiaRoutineEngineV16;
const Card=customElements.get("kimia-routine-editor-v16-card");
assert(E&&Card);
const plain=x=>JSON.parse(JSON.stringify(x));
const script=E.create("script");
script.alias="Bonne nuit";
script.conditions=[
 {type:"state",entity:"person.parent",state:"home"},
 {type:"or",conditions:[
  {type:"numeric_state",entity:"sensor.lumiere",above:"",below:"25"},
  {type:"state",entity:"sun.sun",state:"below_horizon"}
 ]}
];
script.actions=[
 {type:"call",entity:"light.salon",operation:"turn_off",value:""},
 {type:"if",conditions:[{type:"state",entity:"media_player.tv",state:"on"}],
  then:[{type:"call",entity:"media_player.tv",operation:"media_pause",value:""}],
  else:[{type:"delay",seconds:1}]},
 {type:"repeat",count:2,actions:[{type:"delay",seconds:5}]},
 {type:"wait_state",entity:"binary_sensor.motion",to:"off",timeout:300}
];
const ss=plain(E.serialize(script,"ignored"));
assert.equal(ss.alias,"Bonne nuit");
assert.equal(ss.sequence.length,6,"conditions are in the executable script before actions");
assert.equal(ss.sequence[0].condition,"state");
assert.equal(ss.sequence[1].condition,"or");
assert.equal(ss.sequence[3].if[0].condition,"state");
assert.equal(ss.sequence[4].repeat.count,2);
assert.equal(ss.sequence[5].continue_on_timeout,false);
assert.deepEqual(plain(E.serialize(E.deserialize(ss,"script"),"test")),ss,
 "script -> HA -> KIMIA -> HA must be lossless");
const legacy={alias:"Je pars",mode:"single",icon:"mdi:play-box-multiple-outline",
 sequence:[{action:"light.turn_off",target:{entity_id:"light.salon"}}]};
assert.equal(E.deserialize(legacy,"script").actions[0].operation,"turn_off",
 "previous V1.4 scripts remain editable");

const auto=E.create("automation");
auto.alias="Lumière salon la nuit";
auto.mode="restart";
auto.triggers=[
 {type:"state",entity:"binary_sensor.mouvement",to:"on",from:"",seconds:0},
 {type:"time",at:"22:00:00"},
 {type:"sun",event:"sunset",offset:-30},
 {type:"numeric_state",entity:"sensor.luminosite",below:"20",above:""}
];
auto.conditions=[{
 type:"and",conditions:[
  {type:"state",entity:"person.parent",state:"home"},
  {type:"or",conditions:[
   {type:"time",after:"19:00:00",before:"07:00:00",weekdays:["mon","tue"]},
   {type:"sun",after:"sunset",before:"sunrise"}
  ]}
 ]}];
auto.actions=[
 {type:"call",entity:"light.salon",operation:"turn_on",value:""},
 {type:"delay",seconds:60},
 {type:"call",entity:"light.salon",operation:"turn_off",value:""}
];
const aa=plain(E.serialize(auto,"kimia_auto_demo"));
assert.equal(aa.id,"kimia_auto_demo");
assert.equal(aa.triggers.length,4);
assert.equal(aa.triggers[2].offset,"-00:30:00");
assert.equal(aa.conditions[0].conditions[1].condition,"or");
assert.deepEqual(plain(E.serialize(E.deserialize(aa,"automation"),"kimia_auto_demo")),aa,
 "automation must round-trip without lost trigger/condition/action");
assert.equal(aa.actions[0].action,"light.turn_on");
[auto.actions[0],auto.actions[2]]=[auto.actions[2],auto.actions[0]];
assert.equal(E.serialize(auto,"kimia_auto_demo").actions[0].action,"light.turn_off",
 "reordering blocks must change the saved action order");

assert.throws(()=>E.serialize({...auto,actions:[]},"id"),/au moins une action/);
assert.throws(()=>E.serialize({...auto,triggers:[]},"id"),/au moins un déclencheur/);
assert.throws(()=>E.actionToHA({type:"repeat",count:100,actions:[E.action("delay")]}),/Répétitions/);
assert.throws(()=>E.actionToHA({type:"call",entity:"lock.front",operation:"unlock"}),/non prise en charge/);
assert.throws(()=>E.deserialize({...aa,actions:[{action:"shell_command.run"}]},"automation"),/non représentable/);
assert.throws(()=>E.deserialize({...aa,trace:{stored_traces:10}},"automation"),/avancés/);
assert.throws(()=>E.conditionToHA({type:"numeric_state",entity:"sensor.x",above:30,below:10}),/borne basse/);
assert.equal(E.triggerToHA({type:"sun",event:"sunrise",offset:15}).offset,"+00:15:00");

// Gestion API : création, relecture, modification, conflit et suppression.
const db=new Map(),requests=[];
const hass={user:{is_admin:true},states:{},callApi:async(method,path,data)=>{
 requests.push({method,path,data});
 if(method==="GET"){
  if(!db.has(path))throw Object.assign(Error("Not Found"),{status:404});
  return plain(db.get(path));
 }
 if(method==="POST"){db.set(path,plain(data));return {};}
 if(method==="DELETE"){db.delete(path);return {};}
 throw Error("Method "+method);
}};
const card=Object.create(Card.prototype);
Object.assign(card,{_hass:hass,_busy:false,_draft:plain(E.create("automation")),
 _editing:null,_baseline:null,_catalog:[],_notice:"",_error:"",_selected:"",
 _render(){},_catalogRefresh(){}});
card._draft.alias="Détection mouvement salon";
card._draft.triggers=[E.trigger("time")];
card._draft.actions=[{type:"call",entity:"light.salon",operation:"turn_off",value:""}];
async function test(){
 await card._save();
 assert(!card._error,card._error);
 assert.equal(card._editing.kind,"automation");
 assert.match(card._editing.id,/^kimia_/);
 assert(db.has(card._currentUrl()));
 assert.equal(db.get(card._currentUrl()).triggers[0].trigger,"time");
 const savedUrl=card._currentUrl();
 card._draft.actions.push({type:"delay",seconds:6});
 await card._save();
 assert(!card._error,card._error);
 assert.equal(db.get(savedUrl).actions.length,2);
 db.get(savedUrl).description="Modification extérieure";
 card._draft.actions.push({type:"delay",seconds:2});
 await card._save();
 assert.match(card._error,/modifiée ailleurs/);
 assert.equal(db.get(savedUrl).actions.length,2,"conflict blocked overwrite");
 await card._remove();
 assert.match(card._error,/modifiée entre-temps/);
 assert(db.has(savedUrl),"conflict blocked delete");

 const read=plain(db.get(savedUrl));
 card._baseline=read;
 card._draft=E.deserialize(read,"automation");
 await card._remove();
 assert(!db.has(savedUrl));
 assert(!card._editing);

 card._draft=plain(E.create("script"));
 card._draft.alias="Rituel soirée";
 card._draft.actions=[{type:"call",entity:"light.salon",operation:"turn_on",value:""}];
 await card._save();
 assert(card._editing.id.startsWith("ks_"));
 assert(db.has(card._currentUrl()));
 const scriptId=card._editing.id;
 assert(!JSON.stringify(requests).includes("script.ks_"),"No spurious scripts created");

 const doc=plain(db.get(card._currentUrl()));
 const imported=Object.create(Card.prototype);
 Object.assign(imported,{_hass:hass,_busy:false,_draft:null,_editing:null,_baseline:null,
  _selected:"script:"+scriptId,_catalog:[{kind:"script",id:scriptId,entityId:"script."+scriptId,name:"Rituel soirée"}],
  _notice:"",_error:"",_render(){}});
 await imported._open();
 assert.equal(imported._draft.alias,"Rituel soirée");
 assert.equal(imported._draft.actions[0].operation,"turn_on");
 console.log("KIMIA V1.6 OK : 2 types, logique, blocs imbriqués, aller-retour sans perte, conflit CRUD.");
}
test().catch(e=>{console.error(e);process.exitCode=1;});
