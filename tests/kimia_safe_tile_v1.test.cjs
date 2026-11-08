/* KIMIA — simulation navigateur des cartes natives protégées.
 * Aucun appareil ou service Home Assistant réel n'est contacté.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("www/kimia-smart-core-v1.js","utf8");

class El {
  constructor(tag){this.tag=tag;this.children=[];this.hidden=false;this.className="";
    this.textContent="";this.style={};this.attrs={};}
  append(...children){this.children.push(...children);}
  appendChild(child){this.children.push(child);}
  replaceChildren(...children){this.children=children;}
  setAttribute(name,value){this.attrs[name]=value;}
  addEventListener(name,listener){this["on"+name]=listener;}
}
class NativeTile extends El {
  constructor(config){super("hui-tile-card");this.setConfig(config);}
  setConfig(config){this.cfg=config;this.setCalls=(this.setCalls||0)+1;}
  set hass(hass){this._hass=hass;}
  getCardSize(){return 2;}
}
class Host {
  constructor(){this.isConnected=true;}
  attachShadow(){this.shadowRoot=new El("shadow-root");return this.shadowRoot;}
}
const registry=new Map();
const customElements={get:name=>registry.get(name),define:(name,cls)=>registry.set(name,cls)};
const document={createElement:tag=>new El(tag)};
const window={
  customCards:[],dispatchEvent:()=>{},
  loadCardHelpers:async()=>({createCardElement:cfg=>new NativeTile(cfg)})
};
class CustomEvent {constructor(){}}
vm.runInNewContext(source,{HTMLElement:Host,customElements,document,window,CustomEvent});
const Tile=registry.get("kimia-safe-tile-v1-card");
assert(Tile,"Tuile protégée non enregistrée");

const ID="switch.prise_test";
const online=()=>({[ID]:{state:"on",attributes:{friendly_name:"Prise salon"}}});
const makeHass=(states,service=async()=>{})=>({states,callService:service});
const makeTile=()=>{const tile=new Tile();tile.setConfig({
  entity:ID,card:{
    type:"tile",entity:ID,grid_options:{columns:12,rows:1},
    tap_action:{action:"toggle"},icon_tap_action:{action:"toggle"},
    hold_action:{action:"more-info"},features:[{type:"some-feature"}]
  }
 });return tile;};
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};

async function main(){
  const first=makeTile(),second=makeTile();
  let successful=0;
  const service=async()=>{successful++;};
  first.hass=makeHass(online(),service);
  second.hass=makeHass(online(),service);
  await flush();
  assert(first._child,"La tuile Home Assistant est bien créée");
  assert.equal(first._child.cfg.type,"tile","La carte intérieure est native");
  assert.equal(first._child.cfg.tap_action.action,"toggle");
  assert.equal(first.getGridOptions().columns,12);

  // Déconnexion connue : mêmes protections pour capteurs, lumières et prises.
  first.hass=makeHass({[ID]:{state:"unavailable",attributes:{}}},service);
  assert.equal(first._child.cfg.tap_action.action,"none","ON/OFF désactivé");
  assert.equal(first._child.cfg.icon_tap_action.action,"none","Icône protégée");
  assert.equal(first._child.cfg.hold_action.action,"none","Appui long désactivé");
  assert.equal(first._child.cfg.features,undefined,"Curseurs et réglages indisponibles");
  assert.equal(second._child.cfg.tap_action.action,"toggle","L'autre appareil reste fonctionnel");

  first.hass=makeHass({[ID]:{state:"unknown",attributes:{}}},service);
  assert.equal(first._child.cfg.tap_action.action,"none","État inconnu sécurisé");

  // Entité absente : carte de secours stable, sans appel réseau.
  first.hass=makeHass({},service);
  assert.equal(first._frame.children[0].tag,"ha-card","Placeholder HA isolé");
  assert(first._frame.children[0].children[0].children[1].textContent.includes("absent"));
  first.hass=makeHass(online(),service);
  assert.equal(first._frame.children[0].tag,"hui-tile-card","Carte native restaurée");
  assert.equal(first._child.cfg.tap_action.action,"toggle");

  // Entité non encore déclarée déconnectée : le service refuse.
  first.hass=makeHass(online(),async()=>{throw Error("ZHA timeout");});
  await first._child._hass.callService("switch","toggle",{entity_id:ID});
  assert.equal(first._child.cfg.tap_action.action,"none","Échec contenu dans la tuile");
  assert.equal(first._commandFailed,true);
  assert.equal(first._retry.hidden,false,"Une relance manuelle est proposée");
  assert.equal(second._child.cfg.tap_action.action,"toggle","Les autres tuiles ne changent pas");

  // Un nouvel état signale le retour de l'équipement.
  first.hass=makeHass({[ID]:{state:"off",attributes:{friendly_name:"Prise salon"}}},service);
  assert.equal(first._child.cfg.tap_action.action,"toggle","Retour automatique");
  assert.equal(first._commandFailed,false);
  await first._child._hass.callService("switch","toggle",{entity_id:ID});
  assert.equal(successful,1,"Commande transmise après rétablissement");

  // Test de plusieurs domaines utilisant le même composant.
  for(const entity of ["binary_sensor.presence","light.lampe","cover.volet",
    "climate.clim","fan.ventilateur","media_player.radio","sensor.temperature"]){
    const card=new Tile();
    card.setConfig({entity,card:{type:"tile",entity,grid_options:{columns:12,rows:1}}});
    card.hass=makeHass({[entity]:{state:"unavailable"}},service);
    await flush();
    assert.equal(card._child.cfg.tap_action.action,"none",
      "Dispositif indisponible non pilotable : "+entity);
    card.hass=makeHass({[entity]:{state:"off"}},service);
    assert.equal(card._child.cfg.tap_action,undefined,
      "Réglages natifs retrouvés : "+entity);
  }
  console.log("KIMIA indisponibilité : ON/OFF protégé, échec isolé, reconnexion OK, 7 domaines OK");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
