/* Studio simplifié : choix SI manuel, bouton Accueil et sauvegarde sans perte.
 * Les appels HA et la configuration sont simulés ; aucun appareil réel n'est piloté.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const custom=new Map();
const window={customCards:[],confirm:()=>true};
const customElements={get:id=>custom.get(id),define:(id,cls)=>custom.set(id,cls)};
const sandbox={window,customElements,HTMLElement:class{},Date,Math};
for(const path of ["www/kimia-routine-engine-v16.js","www/kimia-studio-v2-admin-card.js"])
 vm.runInNewContext(fs.readFileSync(path,"utf8"),sandbox);
const Card=custom.get("kimia-studio-v2-admin-card");
assert(Card);
const copy=x=>JSON.parse(JSON.stringify(x));
const makeConfig=slots=>({views:[{path:"accueil",sections:[{cards:[
 {type:"heading",heading:"Mes scénarios"},
 {type:"custom:kimia-home-scenarios-v1-card",slots},
 {type:"shortcut",label:"Assistant vocal",tap_action:{action:"navigate",navigation_path:"/kimia-next/assistant"}}
]}]},{path:"energie",sections:[{cards:[{type:"markdown",content:"À conserver"}]}]}]});
function mock(initial){
 let config=makeConfig(initial),homeWrites=0,saves=[],reads=0,conflict=false;
 const hass={
  user:{id:"admin",is_admin:true},states:{},
  callApi:async(method,url,payload)=>{
   if(method==="GET")throw Error("404");
   if(method==="POST"){saves.push({url,payload});return {};}
   throw Error("API inattendue "+method);
  },
  callWS:async req=>{
   assert.equal(req.url_path,"kimia-next");
   if(req.type==="lovelace/config"){
    reads++;
    if(conflict&&reads%2===0)config.views[1].sections[0].cards[0].content="Modifié ailleurs";
    return copy(config);
   }
   if(req.type==="lovelace/config/save"){homeWrites++;config=copy(req.config);return {};}
   throw Error("WS inattendu "+req.type);
  }
 };
 const card=Object.assign(Object.create(Card.prototype),{
  _hass:hass,_busy:false,_notice:"",_error:false,_page:"library",_tab:"all",
  _deletedIds:new Set(),_addHomeOnSave:false,_editing:null,
  _I:()=>"",_B:()=>"",_devices:()=>[],_notification:()=>"",
  _draw(){},_msg(msg,err){this._notice=msg;this._error=err;}
 });
 return {card,reads:()=>reads,writes:()=>homeWrites,saves:()=>saves,config:()=>config,
  setConflict:v=>{conflict=v;}};
}
(async()=>{
 const s=mock([null,null,null,null]);
 assert.match(s.card._choose(),/J’appuie sur un bouton/);
 assert.match(s.card._choose(),/La maison réagit toute seule/);
 s.card._presetStart("blank-script");
 assert.equal(s.card._draft.kind,"script");
 assert.equal(s.card._addHomeOnSave,true);
 assert.match(s.card._conditionsStep(),/Appui sur un bouton KIMIA/);
 assert.match(s.card._wizard(),/Afficher sur l’accueil/);
 assert.match(s.card._wizard(),/ALORS · Que fait la maison/);
 assert.doesNotMatch(s.card._wizard(),/ÉTAPE 1 \/ 5/);
 s.card._change({target:{id:"add-home-on-save",checked:false,dataset:{}}});
 assert.equal(s.card._addHomeOnSave,false);
 s.card._change({target:{id:"add-home-on-save",checked:true,dataset:{}}});
 s.card._draft.alias="Bonne nuit";
 s.card._draft.actions=[window.KimiaRoutineEngineV16.action("call")];
 s.card._draft.actions[0].entity="light.salon";
 s.card._draft.actions[0].operation="turn_off";
 await s.card._save();
 assert.equal(s.saves().length,1,"Routine réellement enregistrée");
 assert.equal(s.writes(),1,"Un seul ajout sur l’accueil");
 const id=s.saves()[0].url.split("/").at(-1);
 const target=s.card._homeSection(s.config());
 assert.equal(target.cards[target.index].slots[0],"script."+id);
 assert.equal(s.config().views[1].sections[0].cards[0].content,"À conserver");
 assert.match(s.card._notice,/Bouton ajouté à l’accueil/);
 const name=s.card._draft.alias;
 assert.equal(name,"Bonne nuit");
 // Réenregistrement du même bouton : idempotent et aucun doublon.
 const same=await s.card._addHomeShortcutForScript(id);
 assert.match(same,/Déjà présent/);
 assert.equal(s.writes(),1);
 // Pas de place disponible : aucun bouton existant écrasé.
 const full=mock(["script.a","script.b","script.c","script.d"]);
 const result=await full.card._addHomeShortcutForScript("ks_autre");
 assert.match(result,/4 places/);
 assert.equal(full.writes(),0);
 // Changement concurrent du dashboard : refus d'écrire.
 const race=mock([null,null,null,null]);
 race.setConflict(true);
 await assert.rejects(race.card._addHomeShortcutForScript("ks_test"),/changé/);
 assert.equal(race.writes(),0);
 // Le scénario est sauvegardé même si le dashboard Accueil ne peut pas être modifié.
 const blocked=mock(["script.a","script.b","script.c","script.d"]);
 blocked.card._presetStart("blank-script");
 blocked.card._draft.alias="Retour maison";
 blocked.card._draft.actions=[{type:"call",entity:"light.salon",operation:"turn_on",value:""}];
 await blocked.card._save();
 assert.equal(blocked.saves().length,1);
 assert.equal(blocked.writes(),0);
 assert.match(blocked.card._notice,/Les 4 places/);
 // Routine automatique : déclencheur horaire, aucun ajout à l’accueil.
 const automatic=mock([null,null,null,null]);
 automatic.card._presetStart("blank-automation");
 assert.equal(automatic.card._draft.kind,"automation");
 assert.equal(automatic.card._addHomeOnSave,false);
 assert.match(automatic.card._conditionsStep(),/quand cet événement/);
 assert.doesNotMatch(automatic.card._conditionsStep(),/Ajouter un bouton sur l’accueil/);
 console.log("Studio KIMIA : SI manuel, actions, sauvegarde, limite 4, conflit et automatisations OK");
})().catch(e=>{console.error(e);process.exitCode=1;});
