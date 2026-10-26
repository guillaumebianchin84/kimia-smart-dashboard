/* Test de la bascule locale du bandeau KIMIA, sans DOM réel. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const users={};
const storage={
  getItem:k=>users[k]||null,
  setItem:(k,v)=>{users[k]=v;}
};
let navigated=null, reloaded=0;
const window={
  localStorage:storage,
  location:{assign:url=>{navigated=url;},reload:()=>{reloaded++;}},
  customCards:[]
};
const registered=new Map();
const customElements={
  get:tag=>registered.get(tag),
  define:(tag,cl)=>{registered.set(tag,cl);}
};
vm.runInNewContext(
  fs.readFileSync("www/kimia-header-toggle-v1-card.js","utf8"),
  {window,customElements,HTMLElement:class{}}
);
const Card=registered.get("kimia-header-toggle-v1-card");
assert(Card, "Carte présente");
const inst=Object.create(Card.prototype);
inst._hass={user:{is_admin:false,name:"client"}};
inst._button={disabled:false};
inst._status={textContent:""};
inst._toggle();
assert.equal(users.kimia_bandeau_ha_client,"visible");
assert.equal(navigated,null);
assert.equal(reloaded,1);
inst._button.disabled=false;
navigated=null;
inst._toggle();
assert.equal(users.kimia_bandeau_ha_client,"masque");
assert.equal(navigated,null);
assert.equal(reloaded,2);
inst._hass={user:{is_admin:false,name:"autre utilisateur"}};
inst._toggle();
assert.equal(users["kimia_bandeau_ha_autre utilisateur"],"visible");
assert.equal(users.kimia_bandeau_ha_client,"masque","Préférence individuelle conservée");
inst._hass={user:{is_admin:true,name:"admin"}};
navigated=null;
inst._toggle();
assert.equal(navigated,null,"Pas de redirection même pour admin");
assert.equal(reloaded,4,"Admin : bascule locale autorisée");
assert.equal(users.kimia_bandeau_ha_admin,"visible");
console.log("KIMIA bandeau: bascule, restauration, isolement utilisateurs et admin OK");
