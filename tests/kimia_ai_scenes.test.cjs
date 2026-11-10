/* Smoke tests for Gemini scene draft validation / stable IDs / colours. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const script=fs.readFileSync("www/kimia-ai-scenes-v1-card.js","utf8");
const exposed=script.replace(/\}\)\(\);\s*$/, "window.__test={validate,stateFor,idAt};\n})();");
assert.notEqual(script,exposed,"Test hooks must attach inside IIFE");
const components=new Map();
const context={
  window:{customCards:[]},HTMLElement:class {},
  customElements:{
    get(name){return components.get(name)},
    define(name,cls){components.set(name,cls)}
  }
};
vm.runInNewContext(exposed,context,{timeout:1500});
const {validate,idAt}=context.window.__test;
const bulb={entity_id:"light.kimia_test",attributes:{
  supported_color_modes:["xy","color_temp"],
  min_color_temp_kelvin:2000,max_color_temp_kelvin:6500
}};
const source={scenes:Array.from({length:10},(_,index)=>({
  name:"Essai "+(index+1),
  lights:[{entity_id:bulb.entity_id,off:false,brightness_pct:30+index*5,
    mode:index%2?"color":"white",color:"#FF6633",kelvin:3200}]
}))};
const result=validate(JSON.stringify(source),[bulb]);
assert.equal(result.length,10);
assert.equal(result[0].id,"kimia_ambiance_01");
assert.equal(result[9].id,"kimia_ambiance_10");
assert.equal(result[0].entities[bulb.entity_id].color_temp_kelvin,3200);
assert.equal(result[1].entities[bulb.entity_id].color_mode,"xy");
assert.equal(result[1].entities[bulb.entity_id].xy_color.length,2);
assert.throws(()=>validate(JSON.stringify({scenes:[source.scenes[0]]}),[bulb]),/10 scènes/);
assert.throws(()=>validate(JSON.stringify(source),[bulb,{entity_id:"light.other",attributes:{supported_color_modes:["brightness"]}}]),/ampoules/);
assert.equal(components.size,2);
const core=fs.readFileSync("www/kimia-smart-core-v1.js","utf8");
assert.ok(core.includes('custom:kimia-ai-scenes-settings-card'));
assert.ok(core.includes('custom:kimia-ai-scenes-shortcuts-card'));
// Suppression permanente via l'API de configuration HA, jamais scene.delete.
async function testDelete(){
  let confirmed=true,deletes=0,syncs=0,gets=0;
  const owned={entity_id:"scene.kimia_detente",attributes:{
    id:"kimia_ambiance_01",friendly_name:"KIMIA · Détente"}};
  const other={entity_id:"scene.une_autre",attributes:{
    id:"outside_scene",friendly_name:"Scène personnelle"}};
  let states=[owned,other],protectedName="KIMIA · Détente";
  context.window.confirm=()=>confirmed;
  context.window.KimiaSmartCore={sync:async hass=>{
    syncs++;
    assert.equal(hass.states["scene.kimia_detente"],undefined);
    assert.ok(hass.states["scene.une_autre"]);
  }};
  const C=components.get("kimia-ai-scenes-settings-card");
  const generator=Object.create(C.prototype);
  generator.busy=false;
  generator.button={disabled:false};
  generator.aiSelect={value:"ai_task.google_ai_task"};
  generator.renderScenes=()=>{};
  generator.say=(msg,bad)=>{generator.lastMessage=msg;generator.lastBad=bad;};
  generator._hass={
    user:{is_admin:true},states:Object.fromEntries(states.map(x=>[x.entity_id,x])),
    callApi:async(method,path)=>{
      if(method==="GET"){
        gets++;
        return {id:"kimia_ambiance_01",name:protectedName};
      }
      if(method==="DELETE"){
        assert.equal(path,"config/scene/config/kimia_ambiance_01");
        deletes++;
        states=[other];
        return {};
      }
      throw Error("Unexpected API method: "+method);
    },
    callWS:async request=>{
      assert.equal(request.type,"get_states");
      return states;
    },
    callService:async(domain,service)=>{
      assert.equal(domain,"scene");assert.equal(service,"reload");
    }
  };
  // Refuser d'effacer un enregistrement sans le nom KIMIA.
  protectedName="Scène personnelle";
  await generator.deleteScenes([owned]);
  assert.equal(deletes,0);
  assert.equal(generator.lastBad,true);
  protectedName="KIMIA · Détente";
  confirmed=false;
  await generator.deleteScenes([owned]);
  assert.equal(deletes,0,"Confirmation obligatoire");
  confirmed=true;
  await generator.deleteScenes([other]);
  assert.equal(deletes,0,"Scene étrangère hors du périmètre");
  await generator.deleteScenes([owned]);
  assert.equal(deletes,1);
  assert.equal(syncs,1,"Lumières se synchronise automatiquement");
  assert.equal(gets,2);
  assert.equal(generator.lastBad,undefined);
  assert.ok(generator.lastMessage.includes("supprimée"));
  assert.equal(generator.listScenes().length,0);
}
testDelete().then(()=>{
 console.log("KIMIA AI: generation, suppression sélective et protection des scènes OK");
}).catch(error=>{console.error(error);process.exitCode=1;});

