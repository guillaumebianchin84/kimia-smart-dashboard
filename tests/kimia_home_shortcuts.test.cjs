/* KIMIA : contrôle visuel de quatre raccourcis Accueil sans serveur Home Assistant. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const registry=new Map();
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.textContent="";this.className="";}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
}
class HTMLElement {
 attachShadow(){this.shadowRoot=new Element("shadow-root");return this.shadowRoot;}
}
const customElements={get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)};
const document={createElement:tag=>new Element(tag)};
const created=[],window={customCards:[],loadCardHelpers:async()=>({
 createCardElement:cfg=>{
  const card={config:cfg,hass:null};
  created.push(card);return card;
 }
})};
vm.runInNewContext(
 fs.readFileSync("www/kimia-smart-core-v1.js","utf8"),
 {document,window,customElements,HTMLElement}
);
const Card=registry.get("kimia-home-scenarios-v1-card");
assert(Card,"Carte Accueil 4 scénarios créée");

const states={
 "script.ks_dodo":{state:"off",attributes:{friendly_name:"Bonne nuit",icon:"mdi:moon-waning-crescent"}},
 "script.ks_depart":{state:"off",attributes:{friendly_name:"Départ"}},
 "script.ks_absent":{state:"unavailable",attributes:{friendly_name:"Absent"}},
 "script.ks_retour":{state:"off",attributes:{friendly_name:"Retour"}}
};
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
async function main(){
 const card=new Card();
 assert.throws(()=>card.setConfig({slots:["x","y","z","a","b"]}),/quatre/);
 card.setConfig({slots:[
  "script.ks_dodo","script.ks_depart",null,"script.ks_absent"
 ]});
 card.hass={states};
 await tick();
 assert.equal(card._cards.length,3,"Emplacement vide ignoré sans bouton factice");
 assert.equal(card._cards[0].config.type,"shortcut","Conserver les raccourcis natifs HA du projet");
 assert.equal(card._cards[0].config.label,"Bonne nuit","Nom du scénario réel");
 assert.equal(card._cards[0].config.icon,"mdi:moon-waning-crescent","Icône HA du scénario");
 assert.equal(card._cards[0].config.tap_action.perform_action,"script.turn_on");
 assert.equal(card._cards[0].config.tap_action.target.entity_id,"script.ks_dodo");
 assert.equal(card._cards[2].config.tap_action.action,"none","Scénario hors ligne neutralisé");
 assert.match(card._cards[2].config.description,/indisponible/);
 const count=created.length;
 card.hass={states};
 await tick();
 assert.equal(created.length,count,"Pas de reconstruction sur mise à jour d'état identique");
 states["script.ks_absent"]={state:"off",attributes:{friendly_name:"De retour"}};
 card.hass={states};
 await tick();
 assert.equal(card._cards[2].config.tap_action.perform_action,"script.turn_on");
 card.setConfig({slots:[null,null,null,null]});
 card.hass={states};
 assert.equal(card._cards.length,0,"Tous raccourcis supprimés sans suppression script");
 assert.match(card._root.children[0].textContent,/Aucun scénario/);
 console.log("KIMIA raccourcis Accueil : 4 maximum, natif, ordre, absence et reconnexion OK");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
