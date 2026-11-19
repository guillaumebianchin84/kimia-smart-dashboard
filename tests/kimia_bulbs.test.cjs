/* Native form behavior against the real card, without HA or a Zigbee device. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const test=require("node:test");

class Element {
  constructor(){this.hidden=false;this.disabled=false;this.listeners=new Map();this.children=[];}
  addEventListener(name,fn){this.listeners.set(name,fn);}
  replaceChildren(...children){this.children=children;}
  append(...children){this.children.push(...children);}
}
function harness(){
  let Card,open=true;
  const elements=new Map();
  class Host extends Element {
    attachShadow(){this.shadowRoot={innerHTML:"",querySelector:key=>{
      if(key==="dialog")return null;
      if(!elements.has(key))elements.set(key,new Element());
      return elements.get(key);
    }};}
  }
  const calls=[];
  const native=[];
  const window={KimiaSettingsLock:{isOpen:()=>open,token:()=>open?"session":undefined},
    addEventListener(){},removeEventListener(){},loadCardHelpers:async()=>({createCardElement:config=>{
      native.push(config);return new Element();
    }})};
  const customElements={get:tag=>tag==="ha-form"?Element:undefined,define:(_,value)=>{Card=value;}};
  vm.runInNewContext(fs.readFileSync("www/kimia-bulb-settings-card.js","utf8"),
    {window,customElements,HTMLElement:Host,document:{createElement:()=>new Element()}});
  const card=new Card();card.setConfig({});card.isConnected=true;
  card._hass={user:{id:"client"},callWS:async request=>{calls.push(request);return {bulbs:[]};}};
  return {card,elements,calls,native,close:()=>{open=false;card.checkLock();}};
}
const field=(key,kind,value,extra={})=>({key,kind,value,label:key,editable:true,status:"confirmed",...extra});
const bulb=(id="light.a",extra={})=>({entity_id:id,name:id,model:"RB 282 C",area:"Salon",available:true,
  fresh:true,identify:true,lqi:180,rssi:-50,fields:[
    field("start_state","select",255,{options:[{value:"1",label:"Toujours allumée"},{value:"255",label:"Dernier état"}]}),
    field("start_level","level",255),field("on_level","level",254),
    field("start_white","white",65535,{min_mired:153,max_mired:500}),
    field("on_transition","seconds",10)
  ],...extra});

test("unavailable bulbs are visible with no editable settings or apply action",async()=>{
  const h=harness(),b=bulb("light.a",{available:false,fresh:false});
  h.card.bulbs=[b];h.card.selected=[b.entity_id];
  await h.card.render();
  assert.equal(h.elements.get("#settings").schema.length,0);
  assert(h.elements.get("#apply").disabled);
  assert(h.elements.get("#identify").disabled);
  assert(h.native.some(config=>config.content?.includes("Déconnectée")));
  assert.equal(h.calls.length,0);
});

test("power-on mode and batch percentages are sent only after user changes",async()=>{
  const h=harness();h.card.bulbs=[bulb(),bulb("light.b")];h.card.selected=["light.a","light.b"];
  await h.card.render();
  assert(h.elements.get("#apply").disabled,"Unchanged defaults do not write values");
  h.card.formData={...h.card.formData,start_state:"1",start_level_mode:"custom",start_level:50,
    start_white_mode:"custom",start_white:4000,on_transition_mode:"custom",on_transition:1.5};
  h.card._hass.callWS=async request=>{
    h.calls.push(request);
    return {results:request.entities.map(entity_id=>({entity_id,status:"confirmed",fields:[]}))};
  };
  h.card.updateButtons();assert(!h.elements.get("#apply").disabled);
  await h.card.apply();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].action,"apply");
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].settings)),{start_state:1,start_level:127,start_white:250,on_transition:15});
  assert.deepEqual(Array.from(h.calls[0].entities),["light.a","light.b"]);
  assert.match(h.elements.get("[role=status]").textContent,/enregistrés et relus/);
  assert(h.card.bulbs.every(b=>!b.fresh),"A new batch needs a fresh read");
});

test("batch form offers only common confirmed capabilities and intersected limits",async()=>{
  const h=harness(),a=bulb(),b=bulb("light.b");
  b.fields.find(f=>f.key==="start_white").min_mired=200;
  b.fields.find(f=>f.key==="on_transition").editable=false;
  h.card.bulbs=[a,b];h.card.selected=[a.entity_id,b.entity_id];await h.card.render();
  const schema=h.elements.get("#settings").schema;
  assert(!schema.some(s=>s.name.startsWith("on_transition")));
  assert.equal(schema.find(s=>s.name==="start_white").selector.number.max,5000);
  assert.equal(h.calls.length,0);
});

test("partial write results never display a success message",async()=>{
  const h=harness();h.card.bulbs=[bulb()];h.card.selected=["light.a"];
  await h.card.render();h.card.formData.start_state="1";
  h.card._hass.callWS=async()=>({results:[{entity_id:"light.a",status:"not_confirmed"}]});
  await h.card.apply();
  assert.match(h.elements.get("[role=status]").textContent,/partiel ou non confirmé/);
  assert.doesNotMatch(h.elements.get("[role=status]").textContent,/enregistrés et relus/);
});

test("locking clears values and rejects requests, including delayed responses",async()=>{
  const h=harness();h.card.bulbs=[bulb()];h.card.selected=["light.a"];
  let finish;
  h.card._hass.callWS=()=>new Promise(resolve=>{finish=resolve;});
  const request=h.card.load();
  h.close();finish({bulbs:[bulb()]});await request;
  assert.equal(h.card.bulbs.length,0);
  assert(h.elements.get("#controls").hidden);
  await assert.rejects(h.card.command("list"),/verrouillés/);
});

test("account change discards selection and never shares cached bulb details",()=>{
  const h=harness();h.card.bulbs=[bulb()];h.card.selected=["light.a"];h.card.loaded=true;
  h.card.isConnected=false;h.card.hass={user:{id:"other"},callWS:async()=>({bulbs:[]})};
  assert.equal(h.card.bulbs.length,0);assert.equal(h.card.selected.length,0);
});
