/* Tests de l'inventaire : Zigbee ou non, commandes, pièces, fonctions.
 * node tests/kimia_inventory_v1.test.cjs
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source=fs.readFileSync("www/kimia-inventory-v1-card.js","utf8");
const window={};
const registry=new Map();
const customElements={get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)};
vm.runInNewContext(source,{window,customElements,HTMLElement:class {}});
const build=window.KimiaInventoryModelV1.build;
const areas=[{area_id:"salon",name:"Salon"}];
const devices=[
  {id:"zig1",name:"Ampoule LEDVANCE",area_id:"salon",identifiers:[["zha","ieee:1234"]]},
  {id:"wifi1",name:"Enceinte Wi-Fi",area_id:null,identifiers:[["cast","abcd"]]},
  {id:"tech1",name:"Service technique",area_id:null,identifiers:[["homeassistant","core"]],entry_type:"service"}
];
const entities=[
  {entity_id:"light.ledvance",device_id:"zig1",platform:"zha"},
  {entity_id:"sensor.ledvance_battery",device_id:"zig1",platform:"zha"},
  {entity_id:"media_player.enceinte",device_id:"wifi1",platform:"cast"},
  {entity_id:"button.service_reload",device_id:"tech1"},
  {entity_id:"switch.virtual_switch",platform:"template"}
];
const states={
  "light.ledvance":{attributes:{friendly_name:"Plafonnier"}},
  "media_player.enceinte":{attributes:{friendly_name:"Enceinte salon"}}
};
const data=build(areas,devices,entities,states);
assert.equal(data.total,3);
assert.equal(data.controls,3,"Light + media_player + virtual switch");
assert.equal(data.controlsOnDevices,2);
assert.equal(data.independentControls.length,1);
assert.equal(data.zigbee,1);
const bulb=data.rows.find(x=>x.id==="zig1");
assert.equal(bulb.source,"Zigbee (ZHA)");
assert.equal(bulb.area,"Salon");
assert.equal(bulb.status,"ready");
assert.equal(bulb.entities.length,2,"Les capteurs liés restent visibles");
const speaker=data.rows.find(x=>x.id==="wifi1");
assert.equal(speaker.source,"Google Cast");
assert.equal(speaker.status,"unassigned");
assert.equal(speaker.area,"Sans pièce");
assert.equal(speaker.zigbee,false);
assert.equal(data.unassigned,1);
assert.equal(data.independentControls[0].area,"Sans pièce");
console.log("Tests Inventaire KIMIA : OK — Zigbee et non-Zigbee, association, capteurs et commandes virtuelles");
