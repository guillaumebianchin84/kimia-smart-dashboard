/* Tests du gestionnaire Zigbee KIMIA — DOM et API Home Assistant simulés.
 * Ne contacte aucun coordinateur, réseau Zigbee ni installation réelle.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

class FakeElement {
  constructor(tag) {
    this.tag=tag;
    this.children=[];
    this.disabled=false;
    this.hidden=false;
    this.value="";
    this.textContent="";
    this.className="";
  }
  addEventListener(){}
  appendChild(node){this.children.push(node);}
  replaceChildren(){this.children=[];}
  append(...nodes){this.children.push(...nodes);}
}
class FakeRoot {
  constructor(){this.nodes=new Map();}
  getElementById(id){
    if(!this.nodes.has(id))this.nodes.set(id,new FakeElement(id));
    return this.nodes.get(id);
  }
  append(){}
}
class FakeHTMLElement {
  constructor(){this.isConnected=true;}
  attachShadow(){this.shadowRoot=new FakeRoot();return this.shadowRoot;}
}
const registry=new Map();
const customElements={
  get:name=>registry.get(name),
  define:(name,cls)=>registry.set(name,cls)
};
const document={createElement:tag=>new FakeElement(tag)};
const window={customCards:[],confirm:()=>true};
vm.runInNewContext(
  fs.readFileSync("www/kimia-zigbee-manager-v1-card.js","utf8"),
  {HTMLElement:FakeHTMLElement,customElements,document,window}
);
const Card=registry.get("kimia-zigbee-manager-v1-card");
assert(Card,"Carte Zigbee absente");

async function main(){
  const card=new Card();
  const coordinator="aa:bb:cc:dd:ee:ff:00:01";
  const presence="aa:bb:cc:dd:ee:ff:00:02";
  const plug="aa:bb:cc:dd:ee:ff:00:03";
  card._devices=[
    {id:"coord",name:"Texas Instruments CC2652",identifiers:[["zha",coordinator]]},
    {id:"presence",name_by_user:"Présence salon",area_id:"salon",
      identifiers:[["zha",presence]]},
    {id:"prise",name:"Prise Zigbee",identifiers:[["zha",plug]]}
  ];
  card._zigbee=[
    {ieee:coordinator,active_coordinator:true},
    {ieee:presence,active_coordinator:false},
    {ieee:plug,active_coordinator:false}
  ];
  card._zhaAvailable=true;
  card._areas=[{area_id:"salon",name:"Salon"}];
  card._newIds.add("prise");

  card._renderDevices();
  const text=card._el("devices").children.map(node=>
    node.tag==="h3"?node.textContent:node.children[0].textContent).join(" | ");
  assert(!text.includes("CC2652"),"Ne jamais présenter le coordinateur");
  assert(text.includes("Déjà connecté · Présence salon"),"Appareil déjà appairé");
  assert(text.includes("NOUVEAU · Prise Zigbee"),"Nouvelle prise à configurer");

  card._selectedId="presence";
  card._endTime=Date.now()+60000;
  card._renderDevices();
  card._updateScanUI();
  assert.equal(card._el("setup").hidden,true,"Le formulaire est masqué pendant 60 s");
  assert.equal(card._el("save").disabled,true,"Enregistrement bloqué");
  assert.equal(card._el("device-name").disabled,true,"Nom non éditable pendant le scan");
  const connected=card._el("devices").children.find(n=>n.tag==="div");
  assert.equal(connected.children[0].disabled,true,"Sélection bloquée");

  card._endTime=Date.now()-100;
  card._renderDevices();
  card._updateScanUI();
  assert.equal(card._el("setup").hidden,false,"Formulaire réouvert après scan");
  assert.equal(card._el("save").disabled,false,"Enregistrement déverrouillé");

  let update=null;
  card._hass={callWS:async message=>{update=message;}};
  card._refresh=async()=>{};
  card._selectedId="prise";
  card._el("device-name").value="Prise salon";
  card._el("device-area").value="salon";
  await card._saveDevice({preventDefault(){}});
  assert.equal(update.type,"config/device_registry/update");
  assert.equal(update.name_by_user,"Prise salon");
  assert.equal(update.area_id,"salon");
  assert.equal(card._newIds.has("prise"),false,"Appareil enregistré déplacé dans Déjà connectés");
  console.log("KIMIA Zigbee : coordinateur exclu, groupes, verrouillage et enregistrement OK");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
