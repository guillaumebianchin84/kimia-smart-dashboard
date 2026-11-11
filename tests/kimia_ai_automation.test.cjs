/* KIMIA AI — safety, persistence and read-only Home Assistant diagnostic. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const script=fs.readFileSync("www/kimia-ai-automation-studio-v1-card.js","utf8");
const exposed=script.replace(/\}\)\(\);\s*$/,
  "window.__test={compile,aiEntityList,compilePrompt,getPlan,summarizeHealth};\n})();");
assert.notEqual(script,exposed);
const components=new Map(),window={customCards:[],confirm:()=>true,location:{href:""}};
const context={window,HTMLElement:class{},customElements:{
 get:name=>components.get(name),
 define:(name,klass)=>components.set(name,klass)
}};
vm.runInNewContext(exposed,context,{timeout:1500});
const {compile,aiEntityList,summarizeHealth}=window.__test;
assert.equal(components.size,2);
const states=[
 {entity_id:"light.cuisine",state:"on",attributes:{friendly_name:"Cuisine"}},
 {entity_id:"scene.kimia_romance",state:"2026-11-11T10:00",attributes:{friendly_name:"Romance"}},
 {entity_id:"binary_sensor.presence",state:"off",attributes:{device_class:"occupancy"}},
 {entity_id:"switch.relais_pac",state:"on",attributes:{}},
 {entity_id:"lock.porte",state:"locked",attributes:{}}
];
const e=aiEntityList(Object.fromEntries(states.map(s=>[s.entity_id,s])));
assert.equal(e.length,3);
const automation=compile({
 name:"Lumière en présence",
 trigger:{type:"state",entity_id:"binary_sensor.presence",to:"on"},
 time_window:{after:"19:00",before:"22:00"},
 actions:[{entity_id:"light.cuisine",service:"turn_on",brightness_pct:40}]
},"automation",e);
assert.equal(automation.config.initial_state,false);
assert.equal(automation.config.triggers[0].trigger,"state");
assert.equal(automation.config.conditions[0].condition,"time");
assert.equal(automation.config.actions[0].data.brightness_pct,40);
const scriptPlan=compile({name:"Mode soir",
 actions:[{entity_id:"scene.kimia_romance",service:"turn_on"}]},"script",e);
assert.equal(scriptPlan.config.sequence[0].action,"scene.turn_on");
assert.throws(()=>compile({name:"Chauffer",
 actions:[{entity_id:"switch.relais_pac",service:"turn_on"}]},"script",e),/autorisé/);
assert.throws(()=>compile({name:"Ouvrir la porte",
 actions:[{entity_id:"lock.porte",service:"unlock"}]},"script",e),/autorisé/);
assert.throws(()=>compile({name:"Commande cachée",
 actions:[{entity_id:"light.cuisine",service:"toggle"}]},"script",e),/non autorisée/);
assert.throws(()=>compile({name:"Lumière fausse",
 actions:[{entity_id:"light.fictive",service:"turn_on"}]},"script",e),/absent/);
assert.throws(()=>compile({name:"Trop intense",
 actions:[{entity_id:"light.cuisine",service:"turn_on",brightness_pct:400}]},"script",e),/invalide/);
const report=summarizeHealth({
 config:{version:"2026.11.0"},core:{state:"RUNNING",recorder_state:{migration_in_progress:false}},
 validation:{result:"valid"},states,devices:[{id:"1"}],integrations:["zha","frontend"]
});
assert(report.includes("configuration.yaml valide"));
assert(report.includes("5 entités"));
async function testPersistence(){
 const Class=components.get("kimia-ai-automation-studio-v1-card");
 const card=Object.create(Class.prototype);
 let posts=0,reloads=0;
 card._hass={user:{is_admin:true},
  callApi:async (method,path,payload)=>{
    if(method==="GET"){const error=new Error("404 not found");error.status=404;throw error;}
    assert.equal(method,"POST");
    assert.ok(path.startsWith("config/automation/config/kimia_ai_"));
    assert.equal(payload.initial_state,false);
    assert.equal(payload.triggers[0].entity_id,"binary_sensor.presence");
    posts++;return {};
  },
  callService:async (domain,service)=>{
    assert.equal(domain,"automation");assert.equal(service,"reload");reloads++;
  }};
 card.draft=automation;card.busy=false;
 card.propose={disabled:false};card.save={disabled:false};card.model={value:"ai_task.google_ai_task"};
 card.clear=()=>{card.draft=null;card.save.disabled=true};
 card.say=(m,bad)=>{card.message=m;card.bad=bad};
 window.confirm=()=>false;
 await card.persist();
 assert.equal(posts,0,"No change without user confirmation");
 window.confirm=()=>true;
 await card.persist();
 assert.equal(posts,1);
 assert.equal(reloads,1);
 assert.equal(card.draft,null);
}
async function testDiagnostic(){
 const Class=components.get("kimia-ha-diagnostic-v1-card");
 const card=Object.create(Class.prototype);
 card.busy=false;card.button={disabled:false};card.report={hidden:true,textContent:""};
 card.status={textContent:""};let writes=[];
 card._hass={user:{is_admin:true},
  callApi:async(method,path)=>{
    writes.push(method+" "+path);
    if(method==="GET"&&path==="config")return {version:"2026.11.0",state:"RUNNING"};
    if(method==="GET"&&path==="core/state")return {state:"RUNNING"};
    if(method==="POST"&&path==="config/core/check_config")return {result:"valid"};
    if(method==="GET"&&path==="components")return ["zha"];
    if(method==="GET"&&path==="error_log")
      return "2026 ERROR Device offline\n2026 WARNING Zigbee route\n2026 INFO Test";
    throw Error("Unexpected API "+path);
  },
  callWS:async request=>{
    if(request.type==="get_states")return states;
    if(request.type==="config/device_registry/list")return [{id:"d1"}];
    if(request.type==="config/entity_registry/list")
      return [{entity_id:"light.cuisine",disabled_by:null},
        {entity_id:"sensor.disabled",disabled_by:"integration"}];
    throw Error("Unexpected WS: "+request.type);
  }};
 await card.run();
 assert.equal(card.report.hidden,false);
 assert(card.report.textContent.includes("configuration.yaml valide"));
 assert(card.report.textContent.includes("1 lignes d'erreur"));
 assert(card.report.textContent.includes("1 désactivées"));
 assert(writes.every(c=>c.startsWith("GET ")||c==="POST config/core/check_config"),
  "Health is read-only aside from the official validation endpoint");
}
(async()=>{
 await testPersistence();
 await testDiagnostic();
 console.log("KIMIA AI: whitelist, admin confirmation, disabled automation & diagnostic OK");
})().catch(error=>{console.error(error);process.exitCode=1;});
