/* KIMIA Studio fusion : catalogue, 4 raccourcis de Home, suppression sûre.
 * Simulation locale, ne touche pas à Home Assistant.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const repository=new Map(),links=[],registered=new Map();
const window={customCards:[],confirm:()=>true,location:{assign:p=>links.push(p)}};
const customElements={get:n=>registered.get(n),define:(n,c)=>registered.set(n,c)};
const sandbox={window,customElements,HTMLElement:class{}};
const src=fs.readFileSync("www/kimia-studio-v2-admin-card.js","utf8");
vm.runInNewContext(src,sandbox);
const Card=registered.get("kimia-studio-v2-admin-card");
assert(Card);
const copy=x=>JSON.parse(JSON.stringify(x));
const states={
 "script.ks_bonne_nuit":{state:"off",attributes:{friendly_name:"Bonne nuit"}},
 "script.ks_depart":{state:"off",attributes:{friendly_name:"Départ"}},
 "script.ks_retour":{state:"off",attributes:{friendly_name:"Retour"}},
 "script.ks_reveil":{state:"off",attributes:{friendly_name:"Réveil"}},
 "script.kimia_recherche_internet":{state:"off",attributes:{friendly_name:"KIMIA - Recherche Internet"}},
 "script.script_hors_kimia":{state:"off",attributes:{friendly_name:"Script externe"}},
 "automation.kimia_lumiere":{state:"on",attributes:{friendly_name:"Automatisation lumière",id:"kimia_lumiere"}}
};
const ids=Object.keys(states);
const oldCards=[
 {type:"heading",heading:"Mes scénarios",icon:"mdi:gesture-tap-button"},
 ...["Au lit","Départ","Retour","Réveil"].map((label,i)=>({
  type:"shortcut",label,icon:"mdi:weather-night",
  tap_action:{action:"perform-action",perform_action:"script.turn_on",
   target:{entity_id:Object.keys(states)[i]}}
 })),
 {type:"shortcut",label:"Parler à Gemini",icon:"mdi:robot",
  tap_action:{action:"navigate",navigation_path:"/kimia-next/assistant"}},
 {type:"custom:navbar-card",routes:[]}
];
const dashboard={views:[{path:"accueil",type:"sections",
 sections:[{type:"grid",cards:[{type:"markdown",content:"Titre"}]},
  {type:"grid",cards:oldCards}]},{path:"prises",sections:[]}]};
let config=copy(dashboard);let writes=0;let deleteCalls=0;let getCalls=0;
const routines=new Map();
for(const id of ids){const kind=id.startsWith("script.")?"script":"automation";
 const identifier=kind==="automation"?(states[id].attributes.id||id.slice(11)):id.slice(7);
 routines.set("config/"+kind+"/config/"+identifier,{alias:id,mode:"single",sequence:[]});}
const hass={user:{is_admin:true,id:"admin"},states,
 callWS:async req=>{
  if(req.type==="lovelace/config")return copy(config);
  if(req.type==="lovelace/config/save"){writes++;config=copy(req.config);return {};}
  throw Error("WS inconnu : "+req.type);
 },
 callApi:async(method,url)=>{
  if(method==="GET"){getCalls++;if(!routines.has(url))throw Error("404");return copy(routines.get(url));}
  if(method==="DELETE"){deleteCalls++;routines.delete(url);return {};}
  throw Error(method);
 }};
const makeCard=()=>Object.assign(Object.create(Card.prototype),{
 _hass:hass,_busy:false,_notice:"",_error:false,_page:"habits",
 _tab:"all",_q:"",_filter:"all",_deletedIds:new Set(),
 _homeSlots:[null,null,null,null],_homeBaseline:null,_homeLoading:false,
 _draw(){},_msg(message,isError){this._notice=message;this._error=isError;}
});
async function main(){
 const card=makeCard();
 assert.deepEqual(copy(card._homeSlotsFromConfig(config)),
  ids.slice(0,4),"Récupération des 4 anciens raccourcis");
 assert.match(card._library(),/Créer une routine/);
 assert.match(card._library(),/Organiser l’accueil/);
 assert.match(card._library(),/Mode expert/);
 assert.doesNotMatch(card._library(),/Atelier avancé/);
 assert.match(card._library(),/Sur l’accueil/);
 await card._loadHomeSlots();
 assert.equal(card._homeLoading,false);
 assert.deepEqual(copy(card._homeSlots),ids.slice(0,4));
 // Réordonner, vider une place : jamais plus de quatre.
 card._homeSlots=["script.ks_depart",null,"script.ks_bonne_nuit","script.ks_retour"];
 await card._saveHomeSlots();
 assert.equal(writes,1,"Une seule écriture dashboard à l'enregistrement");
 const start=card._homeSection(config);
 assert.equal(start.custom,true);
 assert.deepEqual(copy(start.cards[start.index].slots),copy(card._homeSlots));
 assert.equal(start.cards.filter(c=>c?.type==="shortcut"&&
  ["Au lit","Départ","Retour","Réveil"].includes(c.label)).length,0);
 assert.equal(start.cards.filter(c=>c?.label==="Parler à Gemini").length,1,
  "Raccourci assistant conservé");
 assert.equal(config.views[1].path,"prises","Les autres vues sont intactes");
 await card._loadHomeSlots();
 assert.deepEqual(copy(card._homeSlots),[
  "script.ks_depart",null,"script.ks_bonne_nuit","script.ks_retour"]);
 card._homeSlots=["script.ks_depart","script.ks_depart",null,null];
 await card._saveHomeSlots();
 assert.equal(writes,1,"Deux fois le même scénario refusées");
 assert.match(card._notice,/différents/);
 card._homeSlots=[null,"script.ks_bonne_nuit",null,null];
 // Écriture concurrente sur une carte autre que KIMIA.
 config.views[0].sections[0].cards[0].content="Modifié par un autre";
 await card._saveHomeSlots();
 assert.equal(writes,1,"Conflit de dashboard bloque la sauvegarde");
 assert.match(card._notice,/dashboard a changé/);
 await card._loadHomeSlots();
 await card._saveHomeSlots();
 assert.equal(writes,2,"Nouvelle lecture permet d'enregistrer");
 assert.equal(card._homeSection(config).cards.filter(c=>
  c.type==="custom:kimia-home-scenarios-v1-card").length,1,
  "Pas de doublon des 4 boutons après plusieurs sauvegardes");
 // Supprimer un scénario affiché doit être bloqué.
 const scriptUrl="config/script/config/ks_bonne_nuit";
 assert(routines.has(scriptUrl));
 await card._deleteRoutine("script.ks_bonne_nuit");
 assert.equal(deleteCalls,0,"Scénario d'accueil protégé");
 assert.match(card._notice,/raccourcis Accueil/);
 // Annulation explicite.
 window.confirm=()=>false;
 await card._deleteRoutine("script.ks_reveil");
 assert.equal(deleteCalls,0,"Annuler ne supprime rien");
 window.confirm=()=>true;
 await card._deleteRoutine("script.ks_reveil");
 assert.equal(deleteCalls,1);
 assert(!routines.has("config/script/config/ks_reveil"));
 // Les scripts externes et de maintenance sont protégés.
 await card._deleteRoutine("script.script_hors_kimia");
 assert.equal(deleteCalls,1);
 await card._deleteRoutine("script.kimia_recherche_internet");
 assert.equal(deleteCalls,1);
 // Rôle HA respecté.
 const noAdmin=makeCard();noAdmin._hass={...hass,user:{is_admin:false}};
 await noAdmin._deleteRoutine("script.ks_depart");
 assert.equal(deleteCalls,1);
 // Fusion sûre des deux VUES d'administration déjà installées.
 const adminOriginal={views:[
  {path:"scenarios",title:"Scénarios",type:"sections",max_columns:2,
   sections:[{type:"grid",cards:[
    {type:"heading",heading:"Mes habitudes"},
    {type:"custom:kimia-routine-editor-v16-card"},
    {type:"custom:kimia-scenarios-v1-card"}
   ]}]},
  {path:"studio-v2",title:"Studio V2",type:"sections",
   sections:[{type:"grid",cards:[{type:"custom:kimia-studio-v2-admin-card"}]}]},
  {path:"appareils",title:"Appareils",sections:[{cards:[{type:"tile",entity:"switch.prise"}]}]}
 ]};
 let adminCurrent=copy(adminOriginal),adminWrites=0;
 const adminHass={...hass,callWS:async req=>{
  assert.equal(req.url_path,"kimia-admin-next");
  if(req.type==="lovelace/config")return copy(adminCurrent);
  if(req.type==="lovelace/config/save"){adminWrites++;adminCurrent=copy(req.config);return {};}
  throw Error("WS admin inattendu");
 }};
 const merging=makeCard();merging._hass=adminHass;merging._needsMerge=true;
 const plan=merging._adminMergePlan(adminCurrent);
 assert.equal(plan.views.filter(x=>x.path==="studio-v2").length,0);
 assert.equal(plan.views.find(x=>x.path==="scenarios").sections[0].cards[0].type,
  "custom:kimia-studio-v2-admin-card");
 assert.deepEqual(copy(plan.views.find(x=>x.path==="appareils")),
  copy(adminOriginal.views.find(x=>x.path==="appareils")));
 const backupConfirm=window.confirm;
 window.confirm=()=>false;
 await merging._mergeAdminPages();
 assert.equal(adminWrites,0,"Fusion annulée : aucun changement");
 window.confirm=()=>true;
 await merging._mergeAdminPages();
 assert.equal(adminWrites,1,"Une écriture admin seulement");
 assert.equal(adminCurrent.views.filter(x=>x.path==="studio-v2").length,0,
  "L'entrée Studio dupliquée disparaît");
 assert.equal(adminCurrent.views.find(x=>x.path==="scenarios").title,"Mes routines");
 assert.equal(merging._needsMerge,false);
 assert.equal(merging._adminMergePlan(adminCurrent),null,"Fusion idempotente");
 assert.equal(links.at(-1),"/kimia-admin-next/scenarios");
 const unknown=copy(adminOriginal);
 unknown.views[1].sections[0].cards.push({type:"custom:carte-que-je-veux-garder"});
 assert.throws(()=>merging._adminMergePlan(unknown),/personnalisées/,
  "Pas de suppression des ajouts personnels");
 window.confirm=backupConfirm;
 // Le moteur n'a pas déclenché de script automatiquement.
 console.log("KIMIA Studio fusion : catalogue, 4 raccourcis, suppression protégée, concurrence, ordre et fusion admin sûre OK");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
