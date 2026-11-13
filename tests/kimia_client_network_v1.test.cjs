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
assert.equal(card._zigbee(),"IP enregistrée : 10.77.0.50 · connexion non vérifiée");
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
  // L'inventaire provient directement du Cudy, et jamais d'une liste
  // bricolée à partir des noms de capteurs d'autres intégrations.
  card._routerClients=[
    {name:"ODROID",ip:"10.77.0.100",mac:"AA:BB:CC:DD:EE:FF",connection:"Ethernet",allocation:"Non déterminé"},
    {name:"Téléphone",ip:"10.77.0.120",mac:"AA:BB:CC:DD:EE:11",connection:"Wi-Fi",allocation:"Non déterminé"}
  ];
  assert.equal(card._cudyClients().length,2);
  assert.equal(card._cudyClients()[0].mac,"AA:BB:CC:DD:EE:FF");
  assert.equal(card._cudyClients()[1].connection,"Wi-Fi");
  card._supervisorIp="10.77.0.100";
  card._supervisorIpMode="DHCP (automatique)";
  assert.equal(card._haIp(),"10.77.0.100");
  assert.equal(card._haIpMode(),"DHCP (automatique)");
  assert.equal(card._cudyClients()[0].allocation,"Non déterminé");
  assert.equal(card._zigbee(),"IP enregistrée : 10.77.0.50 · connexion non vérifiée");
  card._routerClients=null;
  assert.equal(card._cudyClients().length,0,"Pas de faux clients tirés des capteurs HA");
  const callWs=[];
  card._lookupUser="test-user";
  card._hass.user.id="test-user";
  card._hass.callWS=async msg=>{
    callWs.push(msg.type);
    return {status:"ok",devices:[
      {name:"ODROID",ip:"10.77.0.100",mac:"AA:BB:CC:DD:EE:FF",connection:"Ethernet"}
    ],reported_count:1,last_update_success:true};
  };
  card._routerLast=0;
  await card._loadCudyClients();
  assert.deepEqual(callWs,["kimia_cudy_clients/list"]);
  assert.equal(card._cudyClients().length,1);
  assert.equal(card._routerReported,1);
  assert.equal(card._routerStatus,"ok");
  console.log("KIMIA Réseau OK : clients issus du Cudy, IP, MAC, DHCP HA et WISP.");

})().catch(err=>{console.error(err);process.exitCode=1;});
