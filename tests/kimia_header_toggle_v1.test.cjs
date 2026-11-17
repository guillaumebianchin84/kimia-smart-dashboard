const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const resource = fs.readFileSync("www/kimia-header-toggle-v1-card.js", "utf8");
const yaml = fs.readFileSync("dashboard-kimia-next-ui-import.yaml", "utf8");
const kiosk = yaml.split("\nviews:", 1)[0];
const templates = Array.from(kiosk.matchAll(/\[\[\[([\s\S]*?)\]\]\]/g), match => match[1]);
assert.equal(templates.length, 2);

const tenMinutes = 10 * 60 * 1000;
const store = new Map();
let now = 1_000_000;

function openPage(storage = store) {
  let Card;
  let timer;
  let reloads = 0;
  const window = Object.assign(new EventTarget(), {
    location: { pathname: "/kimia-next/reglages-affichage", reload: () => reloads++ },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    clearTimeout: () => { timer = undefined; },
    setTimeout: (callback, delay) => { timer = { callback, at: now + delay }; },
  });
  const document = Object.assign(new EventTarget(), { querySelector: () => null, hidden: false });
  const context = vm.createContext({
    window, document, Date: { now: () => now }, HTMLElement: class {},
    customElements: { get() {}, define(_, value) { Card = value; } },
  });
  const isHidden = templates.map(template => vm.runInContext(`(user_name) => {${template}}`, context));
  vm.runInContext(resource, context);
  const card = Object.assign(Object.create(Card.prototype), {
    _hass: { user: { name: "Alice" } }, _button: {}, _status: {},
  });
  return {
    window, document, card, isHidden, reloads: () => reloads,
    tick() { if (timer && now >= timer.at) timer.callback(); },
  };
}

let page = openPage();
assert(page.isHidden.every(hidden => hidden("Alice")), "Masqué dès l’import pour les deux rôles");
page.card._toggle();
assert.equal(store.get("kimia_bandeau_ha_Alice"), String(now + tenMinutes));
assert.equal(page.reloads(), 1);

page = openPage();
assert(page.isHidden.every(hidden => !hidden("Alice")), "Affichage après rechargement, sans synchronisation");
assert(page.isHidden.every(hidden => hidden("Bob")), "Compte distinct");
assert(openPage(new Map()).isHidden.every(hidden => hidden("Alice")), "Navigateur distinct");
assert(page.isHidden.every(hidden => !hidden("Alice")));
page.window.location.pathname = "/kimia-next/accueil";
page.window.dispatchEvent(new Event("location-changed"));
now += tenMinutes - 1;
page.tick();
assert.equal(page.reloads(), 0);
now++;
page.tick();
page.document.dispatchEvent(new Event("visibilitychange"));
page.window.dispatchEvent(new Event("focus"));
assert.equal(page.reloads(), 1, "Un seul rechargement automatique à l’échéance");
assert(openPage().isHidden.every(hidden => hidden("Alice")));

store.set("kimia_bandeau_ha_Alice", String(now + tenMinutes));
page = openPage();
assert(page.isHidden.every(hidden => !hidden("Alice")));
page.window.KimiaHeaderTimer = undefined;
assert(page.isHidden.every(hidden => !hidden("Alice")), "Le modèle lit l’échéance avant le chargement de la ressource");
page.card._toggle();
assert.equal(page.reloads(), 1, "Masquer maintenant recharge une fois");
assert(openPage().isHidden.every(hidden => hidden("Alice")));
page = openPage();
page.window.location.pathname = "/kimia-admin-next/demarrer";
page.card._toggle();
assert.equal(page.reloads(), 0, "Le bouton client ne modifie pas le dashboard admin");
console.log("Bandeau KIMIA : import neuf, durée, masquage, isolation et événement de navigation OK.");
