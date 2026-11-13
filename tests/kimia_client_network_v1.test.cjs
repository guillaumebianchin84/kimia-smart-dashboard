/* Tests isolés pour Réseau client KIMIA, sans connexion à un routeur réel. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const definitions=new Map();
class CardHost{
  attachShadow(){this.shadowRoot={};return this.shadowRoot;}
}
const win={
  customCards:[],
  location:{hostname:"kimia.example.org"},
  confirm:()=>true
};
vm.runInNewContext(fs.readFileSync("www/kimia-client-network-v1-card.js","utf8"),{
  window:win,HTMLElement:CardHost,URL,
  customElements:{
    get:name=>definitions.get(name),
    define:(name,klass)=>definitions.set(name,klass)
  }
});
const Network=definitions.get("kimia-client-network-v1-card");
assert(Network,"La carte réseau doit être déclarée.");
const card=new Network();
card._config={};
const states={
  "input_boolean.kimia_onglet_parametres":{state:"on"},
  "button.cudy_wisp_scan":{state:"unknown",attributes:{friendly_name:"Cudy WISP scan"}},
  "select.cudy_wisp_network":{state:"BoxTest",attributes:{friendly_name:"Cudy WISP network",options:["BoxTest"]}},
  "text.cudy_wisp_password":{state:"",attributes:{friendly_name:"Cudy WISP password"}},
  "button.cudy_wisp_connect":{state:"unknown",attributes:{friendly_name:"Cudy WISP connect"}},
  "sensor.cudy_wisp_ssid":{state:"BoxActuelle",attributes:{friendly_name:"Cudy WISP SSID"}},
  "sensor.slzb_06u_ip_address":{state:"10.77.0.50"}
};
const calls=[];
card._hass={
  user:{is_admin:false},
  config:{internal_url:"http://10.77.0.76:8123"},
  states,
  callService:async(domain,service,data)=>{calls.push({domain,service,data});}
};
assert.equal(card._haIp(),"10.77.0.76");
assert.equal(card._zigbee(),"IP : 10.77.0.50");
assert.equal(card._wispCurrent(),"BoxActuelle");
assert.equal(card._find("scan"),"button.cudy_wisp_scan");
assert.equal(card._find("network"),"select.cudy_wisp_network");
assert.equal(card._find("password"),"text.cudy_wisp_password");
assert.equal(card._find("connect"),"button.cudy_wisp_connect");
assert.equal(card._settingsAllowed(),true);
card._ids={scan:"button.cudy_wisp_scan",network:"select.cudy_wisp_network",
  password:"text.cudy_wisp_password",connect:"button.cudy_wisp_connect"};
card._els={net:{value:"BoxTest"},password:{value:"SecretTest123"},notice:{textContent:""}};
(async()=>{
  await card._connect();
  assert.deepEqual(calls.map(c=>c.domain+"."+c.service),
    ["select.select_option","text.set_value","button.press"]);
  assert.equal(calls[1].data.value,"SecretTest123");
  assert.equal(card._els.password.value,"","Le mot de passe doit être effacé du formulaire.");
  states["input_boolean.kimia_onglet_parametres"].state="off";
  assert.equal(card._settingsAllowed(),false);
  calls.length=0;
  await card._connect();
  assert.equal(calls.length,0,"Le client ne doit pas agir lorsque Paramètres est masqué.");
  card._hass.user.is_admin=true;
  assert.equal(card._settingsAllowed(),true,"L'administrateur garde l'accès.");
  // Les capteurs Cudy des appareils connectés sont reconnus grâce au registre.
  states["sensor.telephone_ip_address"]={
    state:"10.77.0.120",attributes:{friendly_name:"Téléphone IP address"}
  };
  states["sensor.intrus_ip_address"]={
    state:"10.77.0.121",attributes:{friendly_name:"Autre intégration IP address"}
  };
  card._clientMeta=[{id:"sensor.telephone_ip_address",name:"Téléphone"}];
  assert.equal(card._cudyClients().length,1);
  assert.equal(card._cudyClients()[0].name,"Téléphone");
  assert.equal(card._cudyClients()[0].ip,"10.77.0.120");
  card._supervisorIp="10.77.0.100";
  assert.equal(card._haIp(),"10.77.0.100","IP HA obtenue de Supervisor");
  assert.equal(card._zigbee(),"IP : 10.77.0.50","Clé Zigbee détectée via capteur");
  delete states["sensor.slzb_06u_ip_address"];
  card._zigbeeRegistryIp="";
  assert.equal(card._zigbee(),"Non détectée sur le réseau");
  card._clientMeta=null;
  assert.equal(card._cudyClients().length,2,"Capteurs IP indicatifs sans accès au registre");
  assert.equal(card._clientListMethod,"capteurs visibles (indicatif)");
  console.log("KIMIA Réseau OK : IP HA, clients Cudy, clé Zigbee débranchée et WISP.");

})().catch(err=>{console.error(err);process.exitCode=1;});
