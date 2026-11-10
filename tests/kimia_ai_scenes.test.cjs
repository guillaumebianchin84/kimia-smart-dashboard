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
console.log("KIMIA AI: 10 scenes and integration checks OK");
