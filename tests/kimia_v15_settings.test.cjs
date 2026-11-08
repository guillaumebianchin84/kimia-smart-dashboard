/* V1.5 : portail Paramètres non destructif, même design, même contrôles KIMIA */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
class CustomEvent{constructor(type,p){this.type=type;this.detail=p?.detail;}}
const window={dispatchEvent(){}};
vm.runInNewContext(fs.readFileSync("www/kimia-smart-core-v1.js","utf8"),{window,CustomEvent});
const clone=x=>JSON.parse(JSON.stringify(x));
const paths=["accueil","pieces","lumieres","volets","climatisation","prises","musique","securite","actualites","parametres"];
const oldBrand={type:"custom:button-card",show_icon:false,custom_fields:{
  logo:"KIMIA Smart by PROMAINT",slogan:"Ma maison",localisation:"Libreville"}};
const oldNav={type:"custom:navbar-card",routes:[{url:"/kimia-next/accueil",label:"Accueil"},
 {url:"/kimia-next/parametres",label:"Réglages"}],desktop:{mode:"floating",position:"left"}};
const oldHeaderSection={type:"grid",column_span:2,cards:[
 {type:"heading",heading:"Affichage de l'application",icon:"mdi:monitor-eye"},
 {type:"custom:kimia-header-toggle-v1-card",grid_options:{columns:"full",rows:"auto"}}]};
const oldThemes={type:"grid",cards:[
 {type:"heading",heading:"Mes thèmes",icon:"mdi:palette-outline"},
 {type:"button",name:"Gris Premium",tap_action:{action:"perform-action",perform_action:"input_select.select_option",
 target:{entity_id:"input_select.kimia_theme_global"},data:{option:"KIMIA Gris Premium"}}},
 {type:"button",name:"Terracotta",tap_action:{action:"perform-action",perform_action:"input_select.select_option",
 target:{entity_id:"input_select.kimia_theme_global"},data:{option:"KIMIA Terracotta"}}},
 {type:"entities",title:"Mon ambiance actuelle",entities:[{entity:"input_select.kimia_theme_global"}]}]};
const custom={type:"markdown",content:"Carte PERSONNALISÉE — à ne pas déplacer"};
let cfg={views:paths.map(path=>({path,title:path,max_columns:2,type:"sections",
 sections:[{type:"grid",column_span:2,cards:[clone(oldBrand)]},
 {type:"grid",cards:[{type:"custom:navbar-card",routes:clone(oldNav.routes),desktop:clone(oldNav.desktop)}]}]}))};
// Le dashboard vivant a été migré par erreur en V1.6.1 : Kiosk global.
cfg.kiosk_mode={kiosk:'[[[ return window.localStorage.getItem("kimia_bandeau_ha_" + user_name) !== "visible"; ]]]'};
const params=cfg.views.find(v=>v.path==="parametres");
params.sections.splice(1,0,clone(oldHeaderSection),clone(oldThemes),{type:"grid",cards:[clone(custom)]});
let writes=0;
const hass={user:{is_admin:true},states:{},callWS:async request=>{
 switch(request.type){
  case "lovelace/dashboards/list":return [{url_path:"kimia-next",mode:"storage"}];
  case "config/area_registry/list":
  case "config/device_registry/list":
  case "config/entity_registry/list":return [];
  case "config/label_registry/list":return [];
  case "lovelace/config":return clone(cfg);
  case "lovelace/config/save":
   assert.equal(request.url_path,"kimia-next");cfg=clone(request.config);writes++;return {};
  default:throw Error("Unexpected "+request.type);
 }
}};
const get=path=>cfg.views.find(v=>v.path===path);
const cards=path=>get(path).sections.flatMap(s=>s.cards||[]);
(async()=>{
 await window.KimiaSmartCore.sync(hass);
 assert.equal(cfg.kiosk_mode.kiosk,undefined,"Kiosk global V1.6.1 supprimé : admin voit HA");
 assert.equal(typeof cfg.kiosk_mode.non_admin_settings?.kiosk,"string",
  "Kiosk propre aux comptes non-admin");
 assert(cfg.kiosk_mode.non_admin_settings.kiosk.includes("return window.localStorage.getItem"),
  "Expression localStorage conservée avec retour booléen");
 const pages=["reglages-utilisateurs","reglages-affichage","reglages-localisation",
  "reglages-listes","reglages-apparence"];
 assert.equal(cfg.views.length,17);
 for(const path of pages){
  assert(get(path)?.subview,path+" should be a subview");
  assert.equal(get(path).back_path,"/kimia-next/parametres");
  assert(cards(path).some(c=>c.type==="custom:button-card"&&
    c.custom_fields?.logo===oldBrand.custom_fields.logo));
  assert(cards(path).some(c=>c.type==="custom:navbar-card"),
   "conserver la navbar dans "+path);
  assert(cards(path).some(c=>c.type==="shortcut"&&
    c.tap_action?.navigation_path==="/kimia-next/parametres"));
 }
 const menu=cards("parametres").filter(c=>c.type==="shortcut");
 assert.equal(menu.filter(c=>pages.includes(c.tap_action?.navigation_path?.split("/").pop())).length,5);
 assert(cards("parametres").some(c=>c.content===custom.content));
 assert(!cards("parametres").some(c=>c.type==="custom:kimia-header-toggle-v1-card"));
 const header=cards("reglages-affichage").find(c=>c.type==="custom:kimia-header-toggle-v1-card");
 assert.deepEqual(header,oldHeaderSection.cards[1]);
 assert.equal(cards("reglages-apparence").filter(c=>c.type==="custom:kimia-local-theme-v16-card").length,1,
  "local KIMIA theme selector installed once");
 assert(!cards("reglages-apparence").some(c=>c.tap_action?.perform_action==="input_select.select_option"),
  "legacy global theme buttons removed");
 assert(!cards("reglages-apparence").some(c=>c.type==="entities"&&
  c.title==="Mon ambiance actuelle"),"global theme helper no longer exposed");
 assert(!cards("parametres").some(c=>c.name==="Terracotta"));
 assert(cards("reglages-localisation").some(c=>c.type==="shortcut"&&
   c.tap_action?.navigation_path==="/config/zone"),"Lien natif de création des zones");
 assert(cards("reglages-localisation").some(c=>c.type==="shortcut"&&
   c.tap_action?.navigation_path==="/kimia-next/carte"),
   "L'accès à la carte actuelle reste fonctionnel");
 const was=writes;
 await window.KimiaSmartCore.sync(hass);
 assert.equal(writes,was,"no duplicate views, cards or writes on second pass");
 // Une page personnalisée ne doit jamais être supprimée ou reconstruite.
 const edited=cards("reglages-apparence").find(c=>c.type==="heading"&&c.heading==="Mes thèmes");
 edited.icon="mdi:palette-swatch";
 await window.KimiaSmartCore.sync(hass);
 assert.equal(writes,was);
 assert.equal(cards("reglages-apparence").find(c=>c.heading==="Mes thèmes").icon,"mdi:palette-swatch");
 console.log("KIMIA Settings OK : 5 sous-vues, thèmes locaux sans action globale, bandeau et personnalisations préservés.");
})().catch(e=>{console.error(e);process.exitCode=1;});
