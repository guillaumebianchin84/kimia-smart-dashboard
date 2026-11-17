/* Catalogue IA, restauration des scènes et sélection native. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const components=new Map(),storage=new Map();
const context=vm.createContext({
 window:{customCards:[],localStorage:{setItem:(k,v)=>storage.set(k,v)}},
 HTMLElement:class {},setTimeout,URL,
 customElements:{get:key=>components.get(key),define:(key,value)=>components.set(key,value)}
});
const source=fs.readFileSync("www/kimia-ai-scenes-v1-card.js","utf8");
vm.runInContext(source.replace(/\}\)\(\);\s*$/,
 "window.test={validate,stateFor,idAt,assignStableIds,voiceScript,visibleSelection,changeScenes};\n})();"),context);
vm.runInContext(fs.readFileSync("www/kimia-smart-core-v1.js","utf8"),context);
const {validate,stateFor,idAt,assignStableIds,voiceScript,visibleSelection,changeScenes}=context.window.test;
const clone=x=>JSON.parse(JSON.stringify(x));
const rgb={entity_id:"light.couleur",state:"off",attributes:{supported_color_modes:["rgbww"]}};
const white={entity_id:"light.blanc",state:"on",attributes:{supported_color_modes:["color_temp"],
 min_color_temp_kelvin:2200,max_color_temp_kelvin:4800}};
const draft={scenes:Array.from({length:20},(_,i)=>({
 name:i===0?"Horreur":"Ambiance "+(i+1),description:i===0?"Violet sombre à faible intensité":"Effet "+(i+1),
 lights:[{entity_id:rgb.entity_id,off:false,brightness_pct:1+i*4,mode:"color",color:"#8800CC"},
  {entity_id:white.entity_id,off:false,brightness_pct:50+i,mode:"white",kelvin:2000+i*150}]
}))};
const result=validate(JSON.stringify(draft),[rgb,white]);
assert.equal(result.length,20);
assert.equal(result[19].id,"kimia_ambiance_20");
assert.deepEqual(clone(result[0].entities[rgb.entity_id].rgbww_color),[136,0,204,0,0]);
assert.equal(result[0].entities[white.entity_id].color_temp_kelvin,2200);
assert.equal(result[19].entities[white.entity_id].color_temp_kelvin,4800);
assert.equal(stateFor({entity_id:"light.simple",attributes:{supported_color_modes:["onoff"]}},
 {off:false,mode:"white",brightness_pct:42}).brightness,undefined);
assert.throws(()=>validate("{invalide}",[rgb,white]));
assert.throws(()=>validate({scenes:draft.scenes.slice(1)},[rgb,white]),/20 scènes/);
const foreign=clone(draft);foreign.scenes[19].lights[0].entity_id="light.autre";
assert.throws(()=>validate(foreign,[rgb,white]),/ampoules/);
const duplicated=clone(draft);duplicated.scenes[1].lights=duplicated.scenes[0].lights;
assert.throws(()=>validate(duplicated,[rgb,white]),/déjà utilisé/);
const incompatible=clone(draft);incompatible.scenes[3].lights[1].mode="color";incompatible.scenes[3].lights[1].color="#123456";
assert.throws(()=>validate(incompatible,[rgb,white]),/non prise en charge/);
const reordered=assignStableIds([...result].reverse(),result,[idAt(0),idAt(19)]);
assert.equal(reordered.scenes[0].id,idAt(19));
assert.deepEqual(clone(reordered.selection),[idAt(0),idAt(19)]);
assert.equal(assignStableIds(result,[],[]).selection.length,10);
assert.equal(assignStableIds(result,result,[]).selection.length,0);
const replaced=result.map((s,i)=>i?s:{...s,name:"KIMIA · Scène différente"});
assert.deepEqual(clone(assignStableIds(replaced,result,[idAt(0),idAt(19)]).selection),[idAt(19),idAt(0)]);
const states=Object.fromEntries(result.map((scene,i)=>["scene.kimia_"+(i+1),{
 entity_id:"scene.kimia_"+(i+1),state:"scening",attributes:{
  id:scene.id,friendly_name:scene.name,entity_id:Object.keys(scene.entities)}}
]));
const catalog=Object.fromEntries(Object.values(states).map((s,i)=>[s.entity_id,{
 id:s.attributes.id,entity_id:s.entity_id,name:draft.scenes[i].name,description:result[i].description,lights:Object.keys(result[i].entities)}]));
const script=voiceScript(catalog);
assert.equal(script.fields.ambiance.selector.select.options.length,20);
assert.ok(script.fields.ambiance.description.includes("Violet sombre"));
assert.equal(script.sequence[5].target.entity_id,"{{ ambiance }}");
if(process.env.KIMIA_TEMPLATE_FIXTURE)fs.writeFileSync(process.env.KIMIA_TEMPLATE_FIXTURE,JSON.stringify(script));
assert.equal(visibleSelection({},Object.values(states)).length,10);
assert.equal(visibleSelection({kimia_ai_scenes:{selection:[]}},Object.values(states)).length,0);
async function testDashboard(){
 const personal={type:"grid",cards:[{type:"tile",entity:"scene.personnelle"}]};
 const original={views:[{path:"lumieres",sections:[personal]}, {path:"accueil",sections:[]}]};
 let config=clone(original),writes=0;
 const hass={user:{is_admin:true},states,async callWS(request){
  if(request.type==="lovelace/config")return clone(config);
  assert.equal(request.type,"lovelace/config/save");config=clone(request.config);writes++;
 }};
 const save=context.window.KimiaSmartCore.saveSceneSelection;
 await save(hass,[idAt(19),idAt(3)]);
 const cards=config.views[0].sections[1].cards[1].cards;
 assert.deepEqual(cards.map(c=>c.entity),["scene.kimia_4","scene.kimia_20"]);
 assert(cards.every(c=>c.type==="tile"&&c.tap_action.perform_action==="scene.turn_on"));
 assert.deepEqual(config.views[0].sections[0],personal);
 assert.deepEqual(config.views[1],original.views[1]);
 await save(hass,[idAt(19),idAt(3)]);
 assert.equal(writes,1);
 await assert.rejects(save(hass,result.slice(0,11).map(s=>s.id)),/invalide/);
 await save(hass,[]);
 assert.deepEqual(config.views,original.views);
 assert.deepEqual(config.kimia_ai_scenes.selection,[]);
}
async function testRollback(){
 const old=new Map([[idAt(0),{id:idAt(0),name:"KIMIA · Ancienne",entities:{}}],[idAt(1),null]]);
 const saved=new Map(old);
 const changes=new Map(result.slice(0,2).map(({id,name,entities})=>[id,{id,name,entities}]));
 const hass={async callApi(method,path,value){
  const id=path.split("/").at(-1);
  if(method==="GET"){
   if(!saved.get(id))throw {status:404};
   return saved.get(id);
  }
  if(method==="POST"&&id===idAt(1))throw Error("Écriture interrompue");
  if(method==="POST")saved.set(id,value);
  else saved.delete(id);
 },async callService(){}};
 await assert.rejects(changeScenes(hass,changes,old,()=>true),/précédentes sont conservées/);
 assert.deepEqual(saved,old);
}
async function testGenerationAndDelete(){
 const Generator=components.get("kimia-ai-scenes-settings-card");
 const scenes=new Map(), exposure={"scene.personnelle":{conversation:true}};
 let savedScript,config={views:[{path:"lumieres",sections:[]}]};
 const scriptEntity="script.kimia_ambiances_lumineuses";
 const getStates=()=>[rgb,white,...[...scenes.values()].map(scene=>({
  entity_id:"scene.kimia_"+scene.id.slice(-2),state:"scening",
  attributes:{id:scene.id,friendly_name:scene.name,entity_id:Object.keys(scene.entities)}
 })),...(savedScript?[{entity_id:scriptEntity,state:"off"}]:[])];
 const generator=Object.assign(Object.create(Generator.prototype),{
  _hass:{user:{is_admin:true},states:{[rgb.entity_id]:rgb,[white.entity_id]:white},
   async callApi(method,path,value){
    if(path.startsWith("services/ai_task/"))return {service_response:{data:draft}};
    const id=path.split("/").at(-1);
    const isScript=path.startsWith("config/script/");
    if(method==="GET"){
     const saved=isScript?savedScript:scenes.get(id);
     if(!saved)throw {status:404};
     return saved;
    }
    if(method==="DELETE"){
      scenes.delete(id);delete exposure["scene.kimia_"+id.slice(-2)];
    }else if(isScript)savedScript=value;
    else{scenes.set(id,value);exposure["scene.kimia_"+id.slice(-2)]={conversation:true};}
   },async callWS(message){
    switch(message.type){
     case "get_states":return getStates();
     case "get_services":return {script:{kimia_ambiances_lumineuses:savedScript}};
     case "config/entity_registry/list":return [{platform:"script",unique_id:"kimia_ambiances_lumineuses",entity_id:scriptEntity}];
     case "homeassistant/expose_entity/list":return {exposed_entities:exposure};
     case "homeassistant/expose_entity":
      assert.deepEqual(clone(message.assistants),["conversation"]);
      for(const id of message.entity_ids)exposure[id]={conversation:message.should_expose};
      return {};
     case "lovelace/config":return clone(config);
     case "lovelace/config/save":config=clone(message.config);return {};
     default:throw Error(message.type);
    }
   },async callService(){}},
  sel:new Set([rgb.entity_id,white.entity_id]),aiSelect:{value:"ai_task.google_ai_task"},
  refreshBulbs(){},renderScenes(){},say(message,bad){this.message=message;this.failed=bad;}
 });
 await generator.generate();
 assert.notEqual(generator.failed,true,generator.message);
 assert.equal(scenes.size,20);
 assert.equal(config.kimia_ai_scenes.selection.length,10);
 assert.equal(savedScript.fields.ambiance.selector.select.options.length,20);
 assert.equal(exposure[scriptEntity].conversation,true);
 assert.equal(Object.entries(exposure).filter(([id,v])=>id.startsWith("scene.kimia_")&&v.conversation).length,0);
 assert.equal(exposure["scene.personnelle"].conversation,true);
 context.window.confirm=()=>true;
 await generator.deleteScenes([generator.listScenes()[0]]);
 assert.notEqual(generator.failed,true,generator.message);
 assert.equal(scenes.size,19);
 assert.equal(config.kimia_ai_scenes.selection.length,9);
 assert.equal(savedScript.fields.ambiance.selector.select.options.length,19);
 await generator.deleteScenes(generator.listScenes());
 assert.notEqual(generator.failed,true,generator.message);
 assert.equal(scenes.size,0);
 assert.equal(config.views[0].sections.length,0);
 assert.deepEqual(config.kimia_ai_scenes.entities,[]);
 assert.equal(exposure["scene.personnelle"].conversation,true);
}
(async()=>{
 await testDashboard();
 await testRollback();
 await testGenerationAndDelete();
 const Generator=components.get("kimia-ai-scenes-settings-card");
 let calls=0;
 const generator=Object.assign(Object.create(Generator.prototype),{
  _hass:{user:{is_admin:true},states:{"light.couleur":{...rgb,state:"unavailable"}},
    callApi:async()=>{calls++;},callWS:async()=>{calls++;}},
  sel:new Set(["light.couleur"]),refreshBulbs(){},renderScenes(){},
  loadSelection:async()=>{},say(message){this.message=message;}
 });
 await generator.generate();
 assert.equal(calls,0);
 assert.match(generator.message,/scènes existantes sont conservées/);
 console.log("KIMIA : 20 scènes, RGBWW/blanc, identifiants, limite 10, tuiles natives, rollback et ampoules injoignables OK.");
})().catch(error=>{console.error(error);process.exitCode=1;});
