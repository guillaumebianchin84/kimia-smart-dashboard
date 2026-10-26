/* Moteur KIMIA refonte V1.3 — simulation HA, sans toucher à une installation.
 * Vérifie le dashboard client refondu, synchro, déplacement, suppression, personnalisation.
 */
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const source=fs.readFileSync("www/kimia-smart-core-v1.js","utf8");
const window={dispatchEvent:()=>{}};
class CustomEvent {constructor(type,args){this.type=type;this.detail=args?.detail;}}
vm.runInNewContext(source,{window,CustomEvent});

const clone=x=>JSON.parse(JSON.stringify(x));
const rooms=[{area_id:"salon",name:"Salon"},{area_id:"cuisine",name:"Cuisine"}];
const devices=[{id:"d1",area_id:"salon"},{id:"d2",area_id:"cuisine"}];
const entities=[
 {entity_id:"light.lampe",device_id:"d1"},
 {entity_id:"media_player.enceinte",device_id:"d1"},
 {entity_id:"switch.prise",device_id:"d2"},
 {entity_id:"cover.volet",device_id:"d2"},
 {entity_id:"climate.clim",device_id:"d2"},
 {entity_id:"sensor.batterie",device_id:"d1"},
 {entity_id:"light.desactivee",device_id:"d2",disabled_by:"user"}
];
const paths=[
 ["accueil","Accueil"],["pieces","Pièces"],["lumieres","Lumières"],
 ["volets","Volets"],["climatisation","Climatisation"],
 ["prises","Prises"],["musique","Musique"],["securite","Sécurité"],
 ["actualites","Actualités"],["parametres","Paramètres"]
];
const legacyBanner={
 type:"custom:button-card",
 custom_fields:{logo:"KIMIA Smart by PROMAINT",slogan:"Ma maison"},
 show_icon:false
};
const makeView=([path,title])=>({
 path,title,type:"sections",max_columns:path==="parametres"||path==="actualites"?2:3,
 sections:[
  {type:"grid",cards:[clone(legacyBanner)]},
  {type:"grid",cards:[{type:"markdown",content:"Carte client personnalisée importante : ne jamais modifier"}]}
 ]
});
const original={title:"KIMIA Smart",views:paths.map(makeView)};
original.views.find(v=>v.path==="accueil").sections[1].cards.push(
 {type:"custom:maquette-card",id:"maquette-reference"},
 {type:"custom:clock-weather-card",entity:"weather.libreville"},
 ...["Au lit","Départ","Retour","Réveil"].map(label=>({type:"shortcut",label}))
);
// Migration des sections réellement présentes dans le YAML utilisateur :
 // titre "Chambre" en double, carte Area pleine largeur, deux enceintes dessous.
const existingArea = {
 type:"area",area:"salon",display_type:"compact",
 features:[{type:"area-controls"}],features_position:"bottom",
 grid_options:{columns:12,rows:"auto"},
 tap_action:{action:"navigate",navigation_path:"/kimia-next/pieces"}
};
for (const path of ["pieces","musique"]) {
 original.views.find(v=>v.path===path).sections.push({
  type:"grid",
  cards:[
   {type:"heading",heading:"Salon",icon:"mdi:home-heart-outline",
    heading_style:"subtitle",grid_options:{columns:"full",rows:1}},
   clone(existingArea),
   {type:"tile",entity:"media_player.enceinte",grid_options:{columns:6,rows:1}}
  ]
 });
}
let config=clone(original),saveCount=0,lastPath=null;
const hass={
 user:{is_admin:true},
 states:{},
 callWS:async request=>{
  switch(request.type){
   case "lovelace/dashboards/list":return [{url_path:"kimia-next",mode:"storage"}];
   case "config/area_registry/list":return clone(rooms);
   case "config/device_registry/list":return clone(devices);
   case "config/entity_registry/list":return clone(entities);
   case "lovelace/config":return clone(config);
   case "lovelace/config/save":
    lastPath=request.url_path;saveCount++;config=clone(request.config);return {};
   default:throw Error("Commande inattendue: "+request.type);
  }
 }
};
const cards=v=>(v.sections||[]).flatMap(s=>s.cards||[]);
const view=path=>config.views.find(v=>v.path===path);
const roomSection=(path,area)=>view(path).sections.find(s=>s.cards?.some(c=>c.type==="area"&&c.area===area));
async function main(){
 const first=await window.KimiaSmartCore.sync(hass);
 assert(first.added>=9);
 assert.equal(lastPath,"kimia-next","Un autre dashboard ne doit jamais être modifié");
 assert.equal(cards(view("accueil")).filter(c=>c.type==="area").length,0,
  "Accueil interdit aux cartes pièces");
 assert.equal(cards(view("accueil")).filter(c=>c.type==="tile").length,0,
  "Accueil interdit aux tuiles automatiques");
 const home=cards(view("accueil"));
 assert(home.some(c=>c.type==="custom:maquette-card"));
 assert(home.some(c=>c.type==="custom:clock-weather-card"));
 assert.equal(home.filter(c=>c.type==="shortcut").length,4);
 for(const [path,title] of paths){
  const banners=cards(view(path)).filter(c=>c.type==="custom:button-card");
  assert.equal(banners.length,1,"Une seule bannière dans "+path);
  assert(banners[0].custom_fields.slogan.includes(
   path==="accueil"?"Ma maison":title),"Titre du bandeau pour "+path);
  assert(cards(view(path)).some(c=>c.type==="markdown"&&
   c.content.includes("personnalisée")),"Cartes client conservées dans "+path);
 }
 const music=roomSection("musique","salon");
 assert(music,"Enceinte dans Salon/Musique");
 assert.equal(music.column_span,3,"Pièce sur toute largeur");
 assert.equal(music.cards[0].type,"area");
 assert.equal(music.cards[0].grid_options.columns,12,"La carte Area occupe 12/12");
 assert.equal(music.cards.filter(c=>c.type==="heading").length,0,"Pas de titre redondant");
 assert.equal(music.cards.find(c=>c.entity==="media_player.enceinte").grid_options.columns,6);
 assert(roomSection("pieces","salon"));
 assert(roomSection("pieces","cuisine"));
 assert(!roomSection("musique","cuisine"),"Ne pas créer une rubrique vide");
 assert(!JSON.stringify(config).includes("light.desactivee"));

 const saves=saveCount;
 const again=await window.KimiaSmartCore.sync(hass);
 assert.equal(again.added,0);
 assert.equal(again.removed,0);
 assert.equal(saveCount,saves,"Synchronisation idempotente");

 // Ajouter un nouvel appareil : carte dans son onglet, sans toucher à Accueil.
 entities.push({entity_id:"light.liseuse",device_id:"d1"});
 const newer=await window.KimiaSmartCore.sync(hass);
 assert(newer.added>=2);
 assert.equal(cards(view("accueil")).some(c=>c.entity==="light.liseuse"),false);
 assert(roomSection("lumieres","salon").cards.some(c=>c.entity==="light.liseuse"));

 // Déplacement d'une prise de cuisine vers salon.
 devices.find(d=>d.id==="d2").area_id="salon";
 await window.KimiaSmartCore.sync(hass);
 assert(!roomSection("prises","cuisine"),"Section auto vide éliminée");
 assert(roomSection("prises","salon").cards.some(c=>c.entity==="switch.prise"));

 // Préserver les tuiles modifiées par l'utilisateur.
 const custom=roomSection("lumieres","salon").cards.find(c=>c.entity==="light.lampe");
 custom.name="Lampe personnalisée";
 devices.find(d=>d.id==="d1").area_id=null;
 await window.KimiaSmartCore.sync(hass);
 assert(cards(view("lumieres")).some(c=>
  c.entity==="light.lampe"&&c.name==="Lampe personnalisée"),
  "Une tuile personnalisée doit être préservée même si la section change");

 // Supprimer Cuisine, puis Salon : aucune pièce orpheline.
 rooms.splice(rooms.findIndex(x=>x.area_id==="cuisine"),1);
 await window.KimiaSmartCore.sync(hass);
 rooms.splice(rooms.findIndex(x=>x.area_id==="salon"),1);
 await window.KimiaSmartCore.sync(hass);
 assert(!cards(view("pieces")).some(c=>c.type==="area"),
  "Une pièce supprimée ne subsiste pas");
 assert(cards(view("lumieres")).some(c=>c.name==="Lampe personnalisée"),
  "La personnalisation reste intacte après suppression de pièce");
 await assert.rejects(window.KimiaSmartCore.sync({...hass,user:{is_admin:false}}),/administrateur/);
 console.log("KIMIA V1.3 OK : accueil réservé, titres de vues, salles 12/12, tuiles, déplacements, suppressions et préservation.");
}
main().catch(err=>{console.error(err);process.exitCode=1;});