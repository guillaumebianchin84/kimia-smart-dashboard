/* V1.7 — filtres Maquette sur zones HA, sans relation aux noms ou coordonnées du plan. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const customElements={get(){return undefined;},define(){}};
const window={customCards:[]};
vm.runInNewContext(fs.readFileSync("www/kimia-maquette-acl-v17-card.js","utf8"),
 {window,customElements,HTMLElement:class{}});
const ACL=window.KimiaMaquetteACL;
assert(ACL);
const plan={type:"custom:maquette-card",id:"libre",floor:"default",
 floors:[
 {id:"rdc",rooms:[
  {name:"Salon",area:"salon",poly:[[0,0],[20,0],[20,20],[0,20]]},
  {name:"Chambre",area:"zone_b",poly:[[21,0],[41,0],[41,20],[21,20]],
   actions:[{name:"Allumer",action:"light.turn_on"}],auto_actions:true}],
  badges:[{name:"Lampe salon",pos:[5,5],tap:"more-info"},
   {name:"Lampe chambre",pos:[30,10],tap:"more-info"}],
  openings:[{name:"Porte chambre",seg:[25,5,25,15],tap:"more-info"}]},
 {id:"etage",rooms:[{name:"Coin lecture",area:"zone_b",
  poly:[[100,100],[200,100],[200,200],[100,200]]}],
  furniture:[{name:"Lampe",pos:[150,150],tap:"more-info"}]}
]};
const original=JSON.stringify(plan);
const hidden={zone_b:["u2"],salon:["u3"]};
const who=(id,is_admin=false)=>({user:{id,is_admin}});
let deny=ACL.denyAreas(who("u2"),hidden);
assert.deepEqual(Array.from(deny),["zone_b"]);
assert.equal(ACL.denyAreas(who("admin",true),hidden).size,0);
const {cfg,count}=ACL.filtered(plan,deny);
assert.equal(count,2,"Une pièce verrouillée sur chaque étage");
assert.equal(JSON.stringify(plan),original,"Aucun changement du plan original");
assert.equal(cfg.floors[0].rooms[0].name,"Salon","Salon autorisé inchangé");
assert.equal(cfg.floors[0].rooms[1].name,"🔒 Chambre");
assert.equal(cfg.floors[0].rooms[1].zoom,false);
assert.equal(cfg.floors[0].rooms[1].auto_actions,false);
assert.equal(cfg.floors[0].rooms[1].actions.length,0);
assert.equal(cfg.floors[0].badges[0].tap,"more-info");
assert.equal(cfg.floors[0].badges[1].tap,"none");
assert.equal(cfg.floors[0].openings[0].tap,"none");
assert.equal(cfg.floors[1].furniture[0].tap,"none");
assert.equal(cfg.floors[1].rooms[0].name,"🔒 Coin lecture");
assert.equal(ACL.filtered(cfg,deny).cfg.floors[0].rooms[1].name,"🔒 Chambre",
 "Pas de deuxième cadenas à l'actualisation");
const others=ACL.filtered(plan,ACL.denyAreas(who("u99"),hidden));
assert.equal(others.count,0,"Nouveau compte voit toutes les pièces par défaut");
assert.equal(JSON.stringify(others.cfg),original,"Nouveau compte : plan strictement identique");
const reg={zone_b:{entities:["light.chambre","switch.chambre"],devices:["device_c"]}};
assert.equal(ACL.blockedTargets({}, {area_id:"zone_b"},deny,reg),true);
assert.equal(ACL.blockedTargets({entity_id:"light.chambre"},null,deny,reg),true);
assert.equal(ACL.blockedTargets(null,{device_id:"device_c"},deny,reg),true);
assert.equal(ACL.blockedTargets(null,{entity_id:"light.salon"},deny,reg),false);
assert.equal(ACL.blockedTargets({entity_id:"light.chambre"},null,new Set(),reg),false);
const layout={type:"custom:maquette-card",rooms:[
 {name:"Une salle libre",area:"zone_b",poly:[[0,0],[2,0],[2,2],[0,2]]}
]};
assert.equal(ACL.filtered(layout,deny).count,1,"Ancien format sans étage compatible");
assert(!/frontend\.set_theme|input_select\.kimia_theme_global/.test(
 fs.readFileSync("www/kimia-maquette-acl-v17-card.js","utf8")),
 "Aucune intervention sur les thèmes ou autres préférences KIMIA");
console.log("KIMIA Maquette V1.7 OK : zones HA, étages arbitraires, plans originaux, actions bloquées et permissions locales.");
