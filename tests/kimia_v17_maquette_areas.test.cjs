const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");

class Element {
  listeners = new Map();
  attachShadow() { return this.shadowRoot = new Element(); }
  setAttribute() {}
  append(...children) { this.children = children; }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, callback) { this.listeners.set(event, callback); }
}
const elements = new Map();
const children = [];
const window = {
  loadCardHelpers: async () => ({
    createCardElement: () => {
      const child = new Element();
      child.configurations = [];
      child.setConfig = config => child.configurations.push(config);
      child.revenirAuPlan = () => { child.closedRoom = true; };
      children.push(child);
      return child;
    },
  }),
};
vm.runInNewContext(fs.readFileSync("www/kimia-maquette-acl-v17-card.js", "utf8"), {
  customElements: { get: tag => elements.get(tag), define: (tag, klass) => elements.set(tag, klass) }, window, HTMLElement: Element,
  document: { createElement: () => new Element() },
});
const ACL = window.KimiaMaquetteACL;
const copy = value => JSON.parse(JSON.stringify(value));
const who = (id, is_admin = false) => ({ user: { id, is_admin } });
const policy = { salon: ["u2", "admin"] };
const fallback = { salon: {
  entities: ["switch.plug", "sensor.heat", "sensor.moisture", "cover.blind", "binary_sensor.door", "light.moved"],
  devices: ["device_salon"],
} };
const rooms = {
  living: { name: "Salon est", area: "salon", poly: [[0,0],[20,0],[20,20],[0,20]],
    temperature: "sensor.heat", humidity: "sensor.moisture", temperature_attribute: "value",
    tap: "sensor.unmapped", auto_actions: true, automations: true,
    panels: { left: [{ type: "tile", entity: "switch.plug" }] } },
  kitchen: { name: "Cuisine", area: "kitchen", poly: [[20,0],[40,0],[40,20],[20,20]],
    temperature: "sensor.heat", humidity: "sensor.kitchen",
    actions: [{ name: "Mixte", data: { entity_id: ["light.kitchen", "switch.plug"] } },
      { name: "Autorisé", data: { entity_id: "light.kitchen" } }] },
};
const plan = { type: "custom:maquette-card", id: "kimia_plan", grid_options: { columns: 12 },
  alerts: [{ name: "Salon", entities: ["switch.plug"] }],
  summary: [{ type: "lights" }, { type: "entity", entity: "sensor.unmapped" }],
  panels: { left: [{ type: "entities", rows: ["switch.plug", { entity: "light.kitchen" }] },
    { type: "tile", entity: "group.downstairs" }, { type: "tile", entity: "light.kitchen" }] },
  floors: [
    { id: "ground", rooms: [rooms.living, rooms.kitchen], walls: [[0,0,0,20]],
      badges: [{ entity: "switch.plug", pos: [30,10] }, { entity: "sensor.unmapped", pos: [4,8] },
        { entity: "light.kitchen", pos: [30,9] }, { entity: "light.moved", pos: [31,10] }],
      texts: [{ text: "Alerte", pos: [35,4], info: [{ entity: "sensor.unmapped" }] },
        { text: "Cuisine", pos: [36,4] }],
      openings: [{ type: "door", seg: [20,5,20,15], contact: ["binary_sensor.door"],
        shutter: "cover.blind", name: "Accès salon", card: { widgets: [{ entity: "sensor.heat" }] } }],
      furniture: [{ type: "rect", pos: [4,4], size: [2,2], entity: "switch.plug" },
        { type: "sofa", pos: [14,5] }],
    },
    { id: "upper", name: "Étage", rooms: [
      { name: "Salon ouest", area: "salon", poly: [[100,100],[200,100],[200,200],[100,200]] },
      { name: "Pièce libre" }, { name: "Ancienne pièce", area: "deleted" },
    ], panels: { right: [{ type: "tile", entity: "sensor.moisture" }] } },
  ],
};
const registry = {
  areas: { salon: { area_id: "salon" }, kitchen: { area_id: "kitchen" } },
  devices: { device_salon: { area_id: "salon" }, device_kitchen: { area_id: "kitchen" } },
  entities: {
    "switch.plug": { device_id: "device_salon", area_id: null },
    "sensor.heat": { device_id: "device_kitchen", area_id: "salon" },
    "light.moved": { device_id: "device_kitchen", area_id: null },
    "sensor.new_sensor": { device_id: "device_salon", area_id: null },
  },
};
const states = {
  "switch.plug": { state: "on" },
  "sensor.new_sensor": { state: "15" },
  "light.kitchen": { state: "on" },
  "group.floor": { attributes: { entity_id: ["switch.plug", "light.kitchen"] } },
  "group.downstairs": { attributes: { entity_id: ["group.floor"] } },
};
const deny = ACL.denyAreas(who("u2"), policy);

test("permissions par compte, administrateur exempté, source et largeur intactes", () => {
  assert.deepEqual([...deny], ["salon"]);
  for (const account of [who("admin", true), who("new"), {}]) {
    assert.deepEqual(copy(ACL.filtered(plan, ACL.denyAreas(account, policy)).cfg), plan);
  }
  const result = ACL.filtered(plan, deny);
  assert.equal(result.count, 2);
  assert.equal(result.cfg.grid_options.columns, 12);
  assert.equal(plan.floors[0].rooms[0].name, "Salon est");
  assert.equal(result.cfg.floors[1].rooms[0].name, "🔒 Salon ouest");
  assert.equal(ACL.filtered(result.cfg, deny).cfg.floors[1].rooms[0].name, "🔒 Salon ouest");
});

test("coupe le contenu des pièces, des résumés et des calques sans retirer les murs ni les portes", () => {
  const result = ACL.filtered(plan, deny, ACL.registryFor(deny, fallback, registry), ACL.groupsIn(states));
  const { cfg } = result;
  const [ground, upper] = copy(cfg.floors);
  assert.deepEqual(ground.walls, plan.floors[0].walls);
  assert.deepEqual(ground.openings, [{ type: "door", seg: [20,5,20,15], tap: "none" }]);
  assert.deepEqual(ground.badges.map(b => b.entity), ["light.kitchen", "light.moved"]);
  assert.deepEqual(ground.texts, [{ text: "Cuisine", pos: [36,4] }]);
  assert.equal(ground.rooms[0].auto_actions, false);
  assert.equal(ground.rooms[0].automations, false);
  assert.equal(ground.rooms[0].zoom, false);
  assert.deepEqual(ground.rooms[0].poly, rooms.living.poly);
  assert.deepEqual(ground.rooms[0].label, [10,10]);
  assert.equal(ground.rooms[1].label, undefined, "aucun label ajouté à une pièce autorisée");
  for (const key of ["panels", "temperature", "temperature_attribute", "humidity", "actions"])
    assert.equal(Object.hasOwn(ground.rooms[0], key), false);
  assert.equal(ground.rooms[1].temperature, undefined);
  assert.equal(ground.rooms[1].humidity, "sensor.kitchen");
  assert.equal(ground.rooms[1].actions.length, 1);
  assert.deepEqual(ground.furniture, [
    { type: "rect", pos: [4,4], size: [2,2], hidden: true },
    { type: "sofa", pos: [14,5] },
  ]);
  assert.deepEqual(copy(cfg.summary), [{ type: "lights" }]);
  assert.deepEqual(copy(cfg.alerts), []);
  assert.deepEqual(copy(cfg.panels.left), [
    { type: "entities", rows: [{ entity: "light.kitchen" }] },
    { type: "tile", entity: "light.kitchen" },
  ]);
  assert.deepEqual(upper.panels.right, []);
  assert(result.entities.has("group.downstairs"));
  assert(result.entities.has("sensor.unmapped"));
  assert(result.entities.has("sensor.new_sensor"));
  assert(!result.entities.has("light.moved"));
});

test("place le cadenas dans une pièce concave sans étiquette et garde les étiquettes personnalisées", () => {
  const concave = [[0,0],[20,0],[20,4],[4,4],[4,20],[0,20]];
  const source = { rooms: [{ area: "salon", poly: concave },
    { area: "salon", poly: concave, label: [2,14] }] };
  const { cfg } = ACL.filtered(source, deny);
  assert.deepEqual(copy(cfg.rooms[0].label), [10,2]);
  assert.deepEqual(copy(cfg.rooms[1].label), [2,14]);
});

test("identifie l'association absente ou obsolète sans se baser sur le nom de pièce", () => {
  assert.deepEqual(copy(ACL.unlinkedRooms(plan, registry.areas)), ["Étage / Pièce libre", "Étage / Ancienne pièce"]);
  const single = { rooms: [{ name: "Un autre nom", area_id: "salon" }] };
  assert.equal(ACL.filtered(single, deny).cfg.rooms[0].area, "salon");
  assert.equal(ACL.unlinkedRooms({rooms: [{ name: "Salon" }]}, registry.areas).length, 1);
});

test("bloque les cibles HA après changement d'affectation, conserve les entités autorisées", () => {
  const targets = ACL.registryFor(deny, fallback, registry);
  for (const target of [{ area_id: "salon" }, { device_id: "device_salon" },
    { device_id: "device_kitchen" }, { entity_id: ["sensor.heat", "light.moved"] },
    { entity_id: "all" }, { label_id: "custom" }])
    assert.equal(ACL.blockedTargets({}, target, deny, targets), true);
  assert.equal(ACL.blockedTargets({ entity_id: "light.moved" }, undefined, deny, targets), false);
  assert.equal(ACL.blockedTargets({}, { area_id: "kitchen" }, deny, targets), false);
  assert(ACL.registryFor(deny, fallback, {}).entities.has("light.moved"));
});

test("applique le filtrage au chargement et à la réautorisation, et isole les changements de compte", async () => {
  const Card = elements.get("kimia-maquette-acl-v17-card");
  const card = new Card();
  const config = { card: plan, hidden_users_by_area: policy, entities_by_area: fallback };
  const calls = [];
  const makeHass = (id, isAdmin) => ({ ...who(id, isAdmin), ...registry, states,
    callService: (...args) => calls.push(args) });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  card.setConfig(config);
  assert.equal(children.length, 0, "ne pas montrer le plan avant de connaître le compte");
  card.hass = makeHass("admin", true);
  await settle();
  let child = children.at(-1);
  assert.deepEqual(copy(child.configurations[0]), plan);
  assert.match(card._note.textContent, /Ancienne pièce/);
  assert(child.hass.states["switch.plug"]);
  card.hass = makeHass("u2");
  await settle();
  assert.notEqual(children.at(-1), child);
  child = children.at(-1);
  assert.equal(child.hass.states["switch.plug"], undefined);
  assert.equal(child.hass.states["group.downstairs"], undefined);
  assert.equal(states["switch.plug"].state, "on");
  await assert.rejects(child.hass.callService("switch", "toggle", { entity_id: "switch.plug" }), /verrouillée/);
  child.hass.callService("light", "toggle", {}, { entity_id: "light.kitchen" });
  assert.equal(calls.length, 1);
  let prevented = false;
  child._config = { pieces: [{ zone: "salon" }] };
  child.listeners.get("click")({
    type: "click", composedPath: () => [{ dataset: { p: "0" } }],
    preventDefault() { prevented = true; }, stopImmediatePropagation() {}, stopPropagation() {},
  });
  assert(prevented);
  card.hass = { ...makeHass("u2"), states: { ...states, "light.kitchen": { state: "off" } } };
  assert.equal(child.configurations.length, 1, "un changement de valeur ne redessine pas le plan");
  card.setConfig({ ...config, hidden_users_by_area: {} });
  assert.deepEqual(copy(child.configurations.at(-1)), plan);
  assert.equal(child.hass.states["switch.plug"].state, "on");
});
