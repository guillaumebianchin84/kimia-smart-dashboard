const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("www/kimia-settings-lock-v1-card.js", "utf8");
const originalStatus = {instance:"boot-1",core:true,zigbee:"smlight",retry_after:0};

async function setup({admin=true,status=originalStatus,handle=()=>({})}={}) {
  let Card;
  const requests = [], listeners = new Map(), timers = new Map(), appended = [];
  const confirmations = [], cardListeners = new Map();
  const storage = new Map([["kimia-settings-session-v1",JSON.stringify({user:"client",token:"test-token",until:601000})]]);
  const connection = {connected:true};
  const hass = {user:{id:"client",is_admin:admin},connection,async callWS(request) {
    requests.push(request);
    if (request.type === "kimia_settings/session") return {unlocked:true};
    if (request.action === "status") return status;
    return handle(request);
  }};
  const tick = fn => { const id=Symbol(); timers.set(id,fn); return id; };
  const clearTimer = id => timers.delete(id);
  const window = {
    addEventListener(name,fn) { listeners.set(name,fn); },
    removeEventListener(name) { listeners.delete(name); },
    dispatchEvent(event) { listeners.get(event.type)?.(); },
    async loadCardHelpers() { return {createCardElement(config) {
      return {config, setConfig(updated) { this.config=updated; },
        addEventListener(name,fn) { this[name]=fn; }};
    }}; }
  };
  const flush = () => new Promise(resolve => setImmediate(resolve));
  vm.runInNewContext(source,{
    window,HTMLElement:class {}, customElements:{define(_,ctor) { Card=ctor; }},
    Event:class {constructor(type) {this.type=type;}},
    CustomEvent:class {constructor(type,options) {this.type=type; Object.assign(this,options);}},
    Date:{now:()=>1000}, setTimeout:tick, setInterval:tick,clearInterval:clearTimer,clearTimeout:clearTimer,
    sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}
  });
  const card = Object.assign(new Card(),{
    isConnected:true,hidden:false,toggleAttribute(){},shadowRoot:{append:child=>appended.push(child)},
    addEventListener(name,fn) { cardListeners.set(name,fn); },
    removeEventListener(name) { cardListeners.delete(name); },
    dispatchEvent(event) {
      if(event.type==="hass-action") {
        assert(event.bubbles && event.composed);
        const tapAction=event.detail.config.tap_action;
        confirmations.push(()=>this.dispatchEvent({type:"ll-custom",detail:tapAction}));
      }
      cardListeners.get(event.type)?.(event);
    }
  });
  card.setConfig({mode:"maintenance",grid_options:{columns:12,rows:"auto"}});
  card.connectedCallback();
  card.hass = hass;
  await flush();
  const tap = config=>{
    let intercepted=false;
    card.child["hass-action"]({detail:{action:"tap",config},stopPropagation(){intercepted=true;}});
    assert(intercepted,"Intercept before HA binds the confirmation to a native button that may be replaced");
    assert.equal(confirmations.length,1);
    return confirmations.shift();
  };
  return {card,connection,flush,requests,storage,timers,appended,tap};
}

(async () => {
  let resolveCommand;
  const radio = await setup({handle:()=>new Promise(resolve=>{resolveCommand=resolve;})});
  const stack = radio.card.child;
  assert.equal(stack.config.type,"vertical-stack");
  const [heading, core, zigbee] = stack.config.cards;
  assert.equal(heading.heading,"Maintenance du système");
  assert.equal(core.type,"button");
  assert.equal(zigbee.type,"button");
  assert.equal(core.grid_options.columns,12);
  assert.equal(zigbee.grid_options.columns,12);
  assert.match(core.tap_action.confirmation.text,/temporairement indisponible/);
  assert.match(zigbee.tap_action.confirmation.text,/puce Zigbee/);
  assert(!radio.requests.some(r=>r.action.startsWith("restart")),"No action before the native confirmed event");
  const confirmZigbee=radio.tap(zigbee);
  stack.setConfig({...stack.config,cards:stack.config.cards.map(config=>({...config}))});
  assert(!radio.requests.some(r=>r.action==="restart_zigbee"));
  confirmZigbee();
  confirmZigbee();
  assert.equal(radio.requests.filter(r=>r.action==="restart_zigbee").length,1);
  assert.equal(radio.requests.at(-1).zigbee_mode,"smlight");
  await radio.flush();
  assert.equal(radio.card.child.config.cards[1].tap_action.action,"none");
  resolveCommand({accepted:true});
  await radio.flush();
  assert.match(radio.card.child.config.cards.at(-1).content,/Commande envoyée à la puce/);

  const usb = await setup({status:{...originalStatus,zigbee:"zha",zigbee_note:"ZHA sur USB"}});
  const reload = usb.card.child.config.cards[2];
  assert.equal(reload.name,"Recharger Zigbee (ZHA)");
  assert.match(reload.tap_action.confirmation.text,/ne redémarre pas/);
  const unavailable = await setup({status:{...originalStatus,zigbee:null,zigbee_note:"Zigbee indisponible"}});
  assert.equal(unavailable.card.child.config.cards[2].tap_action.action,"none");
  assert.match(unavailable.card.child.config.cards.at(-1).content,/Zigbee indisponible/);
  const ordinaryUser = await setup({admin:false});
  assert.equal(ordinaryUser.card.child.config.cards[1].tap_action.action,"none");
  assert.equal(ordinaryUser.card.child.config.cards[2].tap_action.action,"none");
  assert(!ordinaryUser.requests.some(r=>r.type==="kimia_settings/maintenance"));

  let boot = {instance:"boot-1",running:true};
  const restarted = await setup({handle:request=>{
    if (request.action==="instance") return boot;
    throw Error("WS disconnected before the reply");
  }});
  const initialTimers = new Set(restarted.timers.keys());
  restarted.tap(restarted.card.child.config.cards[1]); // Close the dialog without confirming.
  assert(!restarted.requests.some(r=>r.action==="restart_core"));
  const confirmCore=restarted.tap(restarted.card.child.config.cards[1]);
  confirmCore();
  await restarted.flush();
  assert.equal(restarted.requests.filter(r=>r.action==="restart_core").length,1);
  assert.match(restarted.card.child.config.cards.at(-1).content,/Redémarrage demandé/);
  const probe = [...restarted.timers].find(([id])=>!initialTimers.has(id))[1];
  await probe();
  assert(restarted.card.maintenanceRequest,"The old instance is still running");
  restarted.connection.connected = false;
  await probe();
  assert(restarted.card.maintenanceRequest,"Losing the connection alone is not success");
  restarted.connection.connected = true;
  boot = {instance:"boot-2",running:false};
  await probe();
  assert(restarted.card.maintenanceRequest,"The new instance is not ready yet");
  boot.running = true;
  await probe();
  assert.equal(restarted.card.maintenanceRequest,undefined);
  assert.equal(restarted.card.hidden,true,"The advanced buttons are locked again after restart");
  assert.equal(restarted.storage.size,0);
  assert(restarted.requests.every(r=>r.action!=="restart_zigbee"));

  const refused = await setup({handle:()=>{ throw {code:"unknown_error",message:"Configuration invalide"}; }});
  await refused.card.runMaintenance("restart_core");
  assert.equal(refused.card.maintenanceRequest,undefined);
  assert.match(refused.card.child.config.cards.at(-1).content,/Configuration invalide/);

  console.log("KIMIA maintenance UI OK: native cards, confirmations, unavailable/USB, duplicate click and new-instance reconnect.");
})().catch(error=>{console.error(error);process.exitCode=1;});
