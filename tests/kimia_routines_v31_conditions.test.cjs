/* V3.1: conditions scripts et automations, ET/OU/NON, jours, présence et météo.
 * Un seul fichier UI changé, moteur V1.6 et autres dashboards inchangés.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const elements=new Map(),window={customCards:[]};
const customElements={get:k=>elements.get(k),define:(k,v)=>elements.set(k,v)};
for(const file of ["www/kimia-routine-engine-v16.js","www/kimia-routines-v3-card.js"])
 vm.runInNewContext(fs.readFileSync(file,"utf8"),
 {window,customElements,HTMLElement:class HTMLElement{}},{filename:file});
const H=window.KimiaRoutineEngineV16,V=window.KimiaRoutinesV3,Card=elements.get("kimia-routines-v3-card");
assert(H&&V&&Card);
const norm=x=>JSON.parse(JSON.stringify(x));
const stateCond={type:"state",entity:"person.jade",state:"home"};
const weatherCond={type:"state",entity:"weather.maison",state:"rainy"};
const dayCond={type:"time",after:"",before:"",weekdays:["sat","sun"]};
const group={type:"and",conditions:[stateCond,{type:"or",conditions:[weatherCond,dayCond]}]};
const basicGroup={type:"or",conditions:[stateCond,weatherCond]};
for(const kind of ["script","automation"]){
 const d=H.create(kind);d.alias="Routine avec conditions";d.conditions=[group];
 d.actions=[{type:"call",entity:"light.salon",operation:"turn_on",value:""}];
 if(kind==="automation")d.triggers=[{type:"state",entity:"binary_sensor.mouvement",to:"on",from:"",seconds:45}];
 const ha=norm(H.serialize(d,"kimia_test"));
 assert.equal(ha[kind==="script"?"sequence":"conditions"][0].condition,"and");
 if(kind==="script")assert.equal(ha.sequence[0].conditions[1].condition,"or");
 else assert.equal(ha.triggers[0].for.seconds,45);
 const restored=H.deserialize(ha,kind);
 assert.deepEqual(norm(H.serialize(restored,"kimia_test")),ha);
 assert.equal(V.guardSimple({...d,conditions:[basicGroup]}),true);
 assert.equal(V.guardSimple({...d,conditions:[{type:"and",conditions:[stateCond]}]}),true);
}
const card=Object.create(Card.prototype);
Object.assign(card,{
 _hass:{user:{is_admin:true},states:{
  "person.jade":{state:"home",attributes:{friendly_name:"Jade"}},
  "weather.maison":{state:"cloudy",attributes:{friendly_name:"Météo"}},
  "zone.home":{state:"0",attributes:{friendly_name:"Maison"}},
  "light.salon":{state:"off",attributes:{friendly_name:"Salon"}}}},
 _draft:H.create("script"),_registry:{entities:[],devices:[],areas:[]},
 _experimental:false,_busy:false,_entry:null,_pickerCat:"",_pickSearch:"",
 _pickEntity:"",_pickArea:"*",_idx:null,_drawer:"condition",_groupDraft:null,
 _groupChildEditor:false,_groupChildIndex:null,_render(){},_notice:""
});
const html=card._logicPicker("condition");
for(const text of ["Présence / localisation","Météo","Horaires et jours","Toutes vraies (ET)","Au moins une (OU)","Aucune vraie (NON)"])
 assert(html.includes(text),"Condition manquante "+text);
assert(card._editor().includes("SI…"),"Script SI disponible");
card._draft=H.create("automation");
assert(card._editor().includes("SI…")&&card._editor().includes("QUAND…"),"Automation SI et QUAND");
assert.deepEqual(norm(card._logicDomains("presence",null)),["person","device_tracker"]);
assert.deepEqual(norm(card._logicDomains("weather",null)),["weather"]);
assert.equal(card._logicPicker("trigger").includes("Arrivée / départ"),true);
card._groupDraft={type:"and",conditions:[stateCond,weatherCond]};
card._pickerCat="and";
assert(card._groupPicker("and").includes("Ajouter un critère"));
assert(card._groupPicker("and").includes("Jade")===false); // ID not friendly in generic mock
const controls={
 "logic-after":{value:""},
 "logic-before":{value:""},
 "logic-state":{value:"rainy"},
 "logic-seconds":{value:"45"}
};
card.shadowRoot={
 getElementById:id=>controls[id]||null,
 querySelectorAll:selector=>selector==="#logic-weekdays input:checked"?
  [{value:"sat"},{value:"sun"}]:[]
};
card._entry=null;card._pickerCat="time";card._groupChildEditor=true;
const selected=norm(card._pickerData());
assert.deepEqual(selected,{type:"time",after:"",before:"",weekdays:["sat","sun"]});
card._apply();
assert.equal(card._groupDraft.conditions.length,3);
assert.equal(card._groupDraft.conditions[2].weekdays.length,2);
card._pickerCat="and";card._groupChildEditor=false;card._entry=null;
card._apply();
assert.equal(card._draft.conditions.length,1);
assert.equal(card._draft.conditions[0].type,"and");
const source=fs.readFileSync("www/kimia-routines-v3-card.js","utf8");
assert(!/lovelace\/config\/save|area_registry\/update/.test(source));
console.log("KIMIA V3.1 OK : scripts et autos, présence/météo/jours, groupes ET/OU/NON, réouverture fidèle, socle isolé.");
