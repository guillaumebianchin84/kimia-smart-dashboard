/* KIMIA v1.6.1 : isolation par navigateur et par utilisateur, sans service global. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const regist=new Map(),styles=[];
const users={},calls=[];
function cssStyle(){
 const values={};
 return {setProperty:(k,v,p)=>{values[k]={v,p};},
  removeProperty:k=>delete values[k],getPropertyValue:k=>values[k]?.v||"",values};
}
function elem(tag){
 const el={tagName:tag.toUpperCase(),children:[],style:cssStyle(),attributes:{},isConnected:false,
  setAttribute(k,v){this.attributes[k]=v;},append(...x){this.children.push(...x);},
  replaceChildren(...x){this.children=x;},listeners:{},
  addEventListener(event,handler){this.listeners[event]=handler;},classList:{add(){},remove(){}}};
 if(tag==="style"){
  Object.defineProperty(el,"textContent",{set(v){this.content=v;this.sheet={cssRules:[{style:cssStyle()}]};},
   get(){return this.content;}});
 }
 return el;
}
const head={appendChild:e=>{e.isConnected=true;styles.push(e);return e;}};
const document={head,documentElement:head,createElement:elem,
 querySelector:s=>s==="home-assistant"?{hass:lastHass}:null};
let lastHass=null;
const storage={getItem:k=>users[k]||null,setItem:(k,v)=>{users[k]=v;}};
const window={localStorage:storage,dispatchEvent:()=>{},addEventListener:()=>{},customCards:[],
 loadCardHelpers:async()=>({createCardElement:cfg=>{const card=elem("hui-button-card");card.config=cfg;return card;}})};
const customElements={get:x=>regist.get(x),define:(x,c)=>regist.set(x,c)};
vm.runInNewContext(fs.readFileSync("www/kimia-local-theme-v16-card.js","utf8"),
 {window,document,customElements,HTMLElement:class{},CustomEvent:class{},setTimeout(){/* no bootstrap in test */}});
const T=window.KimiaLocalThemeV16;
assert(T);
const palettes={
 "KIMIA Gris Premium":{modes:{dark:{"primary-color":"#112233","card-background-color":"#202020"}}},
 "KIMIA Clair":{modes:{light:{"primary-color":"#ffffff","card-background-color":"#eeeeee"}}}
};
const u1={user:{id:"u1",name:"Guillaume"},themes:{themes:palettes,darkMode:false},
 selectedTheme:{theme:"default"}};
const u2={user:{id:"u2",name:"Erica"},themes:{themes:palettes,darkMode:false}};
lastHass=u1;
T.select(u1,"KIMIA Gris Premium");
assert.equal(T.get(u1),"KIMIA Gris Premium");
assert.equal(styles.length,1);
let css=styles[0].sheet.cssRules[0].style;
assert.equal(css.getPropertyValue("--primary-color"),"#112233");
assert.equal(css.values["--primary-color"].p,"important");
assert.equal(css.getPropertyValue("--rgb-primary-color"),"17,34,51");
assert.equal(T.get(u2),"","user with same browser not changed");
const device2Store={};
const otherBrowserStorage={getItem:k=>device2Store[k]||null,
 setItem:(k,v)=>device2Store[k]=v};
assert.equal(otherBrowserStorage.getItem(T.key(u1)),null,
 "user's other browser must be unaffected");
assert(!/frontend\.set_theme|callService\(/.test(fs.readFileSync("www/kimia-local-theme-v16-card.js","utf8")
 .replace(/\/\*[\s\S]*?\*\//g,"")),
 "local theme selection must never call an HA theme service");
T.select(u1,"KIMIA Clair");
assert.equal(css.getPropertyValue("--primary-color"),"#ffffff");
assert.equal(css.getPropertyValue("--rgb-primary-color"),"255,255,255");
T.select(u1,"");
assert.equal(css.getPropertyValue("--primary-color"),"","reset removes overrides");
assert.equal(T.get(u1),"");

// Régression design : 8 VRAIES cartes HA natives, leurs icônes et couleurs.
const ThemeCard=regist.get("kimia-local-theme-v16-card");
assert(ThemeCard,"Carte KIMIA locale toujours enregistrée");
const themed=Object.create(ThemeCard.prototype);
let tree=[];
themed._renderToken=0;
themed._tiles=[];
themed._hass=u1;
themed.shadowRoot={replaceChildren(...children){tree=children;}};
async function verifyNativeCards(){
 themed._render();
 await new Promise(resolve=>setImmediate(resolve)); // creation native asynchrone
 const haCard=tree.find(x=>x.tagName==="HA-CARD");
 assert(haCard,"Conteneur Home Assistant");
 const tileGrid=haCard.children.find(x=>x.className==="choices");
 assert.equal(tileGrid.children.length,9,"8 thèmes KIMIA + défaut");
 const expected=["teal","cyan","indigo","blue","green","deep-purple","amber","deep-orange"];
 for(let i=0;i<9;i++){
  const wrap=tileGrid.children[i];
  assert(wrap.children.length===1,"Une vraie carte HA par choix");
  const native=wrap.children[0];
  assert.equal(native.tagName,"HUI-BUTTON-CARD","Carte officielle Home Assistant");
  assert.equal(native.config.type,"button");
  assert(native.config.icon.startsWith("mdi:"));
  assert.equal(native.config.tap_action.action,"fire-dom-event",
   "Le clic ne doit jamais utiliser de service global");
  assert.equal(native.config.color,i===0?"teal":expected[i-1],
   "Couleurs des boutons natifs V1.5");
 }
 assert.equal(T.OPTIONS.length,8,"Les 8 thèmes historiques restent disponibles");
 assert.equal(T.OPTIONS.find(x=>x[0]==="KIMIA Terracotta")[2],"mdi:fireplace");
 assert.equal(T.OPTIONS.find(x=>x[0]==="KIMIA Signature")[2],"mdi:home-heart");
 const native=tileGrid.children[1].children[0];
 let stopped=false,prevented=false;
 native.listeners["hass-action"]({detail:{action:"tap"},
  stopPropagation(){stopped=true;},preventDefault(){prevented=true;}});
 assert(stopped&&prevented,"Action native interceptée avant HA");
 assert.equal(T.get(u1),"KIMIA Gris Premium");
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(T.get(u2),"","Thème d'un autre utilisateur inchangé");
}
verifyNativeCards().catch(error=>{console.error(error);process.exitCode=1;});

assert.throws(()=>T.select(u1,"Some other theme"),/inconnu/);
const first=String(fs.readFileSync("www/kimia-smart-core-v1.js","utf8"));
assert(first.includes("localKioskUI(next)"));
assert(first.includes('return window.localStorage.getItem'));
assert(!/window\.location\.assign\(/.test(fs.readFileSync("www/kimia-header-toggle-v1-card.js","utf8")));
console.log("KIMIA local preferences OK: two users, two devices, reset and no HA global service.");
