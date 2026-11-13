/* KIMIA Smart — Réseau client V1. IP en lecture et WISP via Home Assistant.
 * Pas d'accès aux autres réglages Cudy ni de stockage de mots de passe.
 */
(() => {
 "use strict";
 const TAG="kimia-client-network-v1-card";
 if(customElements.get(TAG))return;
 const ipv4=value=>{
   const s=String(value||"").trim(),parts=s.split(".");
   return parts.length===4&&parts.every(p=>/^\d{1,3}$/.test(p)&&+p<=255)?s:"";
 };
 const urlIp=value=>{try{return ipv4(new URL(String(value)).hostname);}catch(_){return "";}};
 const localIp=value=>{
   const ip=ipv4(value);if(!ip)return "";
   const a=ip.split(".").map(Number);
   return a[0]===10||a[0]===192&&a[1]===168||
     a[0]===172&&a[1]>=16&&a[1]<=31?ip:"";
 };
 const hostNetworkIp=response=>{
   const data=response?.data||response;
   const interfaces=Array.isArray(data?.interfaces)?data.interfaces:Object.values(data?.interfaces||{});
   const active=interfaces.filter(x=>x&&x.enabled!==false&&x.connected!==false)
     .sort((a,b)=>Number(b.primary===true)-Number(a.primary===true));
   for(const iface of active)for(const address of iface?.ipv4?.address||[]){
     const ip=localIp(String(address).split("/")[0]);if(ip)return ip;
   }
   return "";
 };
 const hostIpMode=(response,ip)=>{
   const data=response?.data||response;
   const interfaces=Array.isArray(data?.interfaces)?data.interfaces:Object.values(data?.interfaces||{});
   const chosen=interfaces.find(iface=>
     (iface?.ipv4?.address||[]).some(addr=>String(addr).split("/")[0]===ip));
   if(!chosen)return "";
   const mode=chosen?.ipv4?.method;
   return mode==="static"?"Statique sur HA OS":
     mode==="auto"?"DHCP (automatique)":
     mode==="disabled"?"Interface désactivée":"";
 };
 const online=entity=>entity&&!["unavailable","unknown"].includes(entity.state);
 class Network extends HTMLElement{
   constructor(){
     super();this.attachShadow({mode:"open"});
     this._config={};this._busy=false;this._built=false;
     this._supervisorIp="";this._supervisorIpMode="";this._clientMeta=null;this._lookupUser="";
     this._lookupStarted=false;this._zigbeeRegistryIp="";
     this._routerClients=null;this._routerStatus="loading";
     this._routerReported=0;this._routerHealthy=true;
     this._routerTruncated=false;this._routerBusy=false;this._routerLast=0;
   }
   setConfig(c){this._config=c||{};this._refresh();}
   set hass(h){
     const user=h?.user?.id||"";
     if(this._lookupUser!==user){
       this._lookupUser=user;this._lookupStarted=false;
       this._supervisorIp="";this._supervisorIpMode="";this._clientMeta=null;this._zigbeeRegistryIp="";
       this._routerClients=null;this._routerStatus="loading";this._routerLast=0;
     }
     this._hass=h;this._refresh();this._loadNetworkInfo();this._loadCudyClients();
   }
   connectedCallback(){this._render();this._refresh();this._loadNetworkInfo();this._loadCudyClients();}
   async _loadNetworkInfo(){
     // En lecture seule. Les registres et Supervisor ne sont pas accessibles à
     // tous les utilisateurs HA. Les capteurs de clients restent le repli.
     const hass=this._hass,user=this._lookupUser;
     if(this._lookupStarted||!hass?.callWS||hass.user?.is_admin!==true)return;
     this._lookupStarted=true;
     const answers=await Promise.allSettled([
       hass.callWS({type:"supervisor/api",endpoint:"/network/info",method:"get"}),
       hass.callWS({type:"config/entity_registry/list"}),
       hass.callWS({type:"config/device_registry/list"})
     ]);
     if(this._lookupUser!==user||this._hass?.user?.id!==user)return;
     if(answers[0].status==="fulfilled"){
       this._supervisorIp=hostNetworkIp(answers[0].value);
       this._supervisorIpMode=hostIpMode(answers[0].value,this._supervisorIp);
     }
     const entities=answers[1].status==="fulfilled"?answers[1].value:null;
     const devices=answers[2].status==="fulfilled"?answers[2].value:null;
     if(Array.isArray(entities)){
       const byId=new Map((Array.isArray(devices)?devices:[]).map(d=>[d.id,d]));
       const cudy=entities.filter(e=>e.platform==="cudy_router"&&
         /-device-[0-9a-f]{12}-ip$/i.test(String(e.unique_id||"")));
       const byUnique=new Map(entities.filter(e=>e.platform==="cudy_router")
         .map(e=>[e.unique_id,e]));
       this._clientMeta=cudy.map(e=>{
         const device=byId.get(e.device_id);
         return {
           id:e.entity_id,
           name:device?.name_by_user||device?.name||e.name||"",
           device_id:e.device_id,
           connectionId:byUnique.get(String(e.unique_id).replace(/-ip$/,"-connection_type"))?.entity_id||""
         };
       });
       // Configuration URL provenant de l'intégration SMLIGHT, jamais devinée.
       const slzb=(Array.isArray(devices)?devices:[]).filter(d=>
         /smlight|slzb[\s_-]*0?6/i.test([d.name,d.name_by_user,d.model,
           d.manufacturer].filter(Boolean).join(" ")));
       const ips=[...new Set(slzb.map(d=>localIp(urlIp(d.configuration_url))).filter(Boolean))];
       if(ips.length===1)this._zigbeeRegistryIp=ips[0];
     }
     this._refresh();
   }
   async _loadCudyClients(force=false){
     const hass=this._hass,now=Date.now(),user=this._lookupUser;
     if(!hass?.callWS||!this._settingsAllowed()||this._routerBusy)return;
     if(!force&&now-this._routerLast<30000)return;
     this._routerLast=now;this._routerBusy=true;
     this._refresh();
     try{
       const result=await hass.callWS({type:"kimia_cudy_clients/list"});
       if(this._lookupUser!==user)return;
       this._routerClients=Array.isArray(result?.devices)?
         result.devices.slice(0,300).map(item=>({
           name:String(item.name||"Appareil sans nom").slice(0,100),
           ip:localIp(item.ip),
           mac:String(item.mac||"").slice(0,32),
           connection:String(item.connection||"Non précisé").slice(0,40),
           allocation:"Non déterminé"
         })):[];
       this._routerStatus=result?.status==="ok"?"ok":"missing";
       this._routerReported=Number(result?.reported_count)||0;
       this._routerHealthy=result?.last_update_success===true;
       this._routerTruncated=result?.truncated===true;
     }catch(error){
       if(this._lookupUser!==user)return;
       this._routerStatus="unavailable";this._routerClients=null;
     }finally{
       this._routerBusy=false;this._refresh();
     }
   }
   _cudyClients(){
     // Pas de reconstruction à partir de capteurs individuels : on affiche
     // exclusivement la liste de clients du coordinateur Cudy.
     return Array.isArray(this._routerClients)?this._routerClients:[];
   }
   _find(kind){
     const specified=this._config["wisp_"+kind+"_entity"];
     if(specified)return this._hass?.states?.[specified]?specified:null;
     const domain={scan:"button",network:"select",password:"text",connect:"button"}[kind];
     const matches=Object.entries(this._hass?.states||{}).filter(([id,state])=>{
       if(!id.startsWith(domain+"."))return false;
       const name=String(state.attributes?.friendly_name||"").toLowerCase();
       return new RegExp("(?:^|_)wisp_"+kind+"$").test(id)||name.includes("wisp "+kind);
     }).map(([id])=>id);
     const cudy=matches.filter(id=>id.includes("cudy"));
     return cudy.length===1?cudy[0]:matches.length===1?matches[0]:null;
   }
   _settingsAllowed(){
     // Reprend l'interrupteur déjà utilisé par l'onglet Paramètres KIMIA.
     // Filtrage d'interface uniquement : ne remplace PAS les permissions HA.
     return this._hass?.user?.is_admin===true||
       this._hass?.states?.["input_boolean.kimia_onglet_parametres"]?.state==="on";
   }
   _wispCurrent(){
     const states=this._hass?.states||{};
     const id=this._config.wisp_ssid_entity;
     if(id&&states[id]&&!["unknown","unavailable"].includes(states[id].state))
       return String(states[id].state).slice(0,90);
     const list=Object.entries(states).filter(([name,state])=>
       name.startsWith("sensor.") &&
       (/(?:^|_)wisp_ssid$/.test(name)||
       /wisp ssid/i.test(String(state.attributes?.friendly_name||""))) &&
       !["unknown","unavailable",""].includes(state.state));
     const matches=list.filter(([name])=>name.includes("cudy"));
     const chosen=matches.length===1?matches[0]:list.length===1?list[0]:null;
     return chosen?String(chosen[1].state).slice(0,90):"Information indisponible";
   }
   _haIp(){
     const configured=ipv4(this._config.ha_ip);if(configured)return configured;
     for(const id of ["sensor.kimia_ha_ip","sensor.local_ip","sensor.home_assistant_ip"]){
       const found=ipv4(this._hass?.states?.[id]?.state);if(found)return found;
     }
     if(this._supervisorIp)return this._supervisorIp;
     const internal=localIp(urlIp(this._hass?.config?.internal_url));
     return internal||localIp(window.location?.hostname);
   }
   _haIpMode(){return this._supervisorIpMode||"Non déterminé";}
   _zigbee(){
     const states=this._hass?.states||{};
     const mode=Object.entries(states).find(([name])=>/slzb.*mode_de_connexion/i.test(name))?.[1]?.state;
     if(/usb/i.test(String(mode)))return "USB (pas d'adresse IP)";
     // L'inventaire des clients Cudy, lorsqu'il est renseigné, est le seul
     // indice exploité ici pour présenter une connexion réseau en cours.
     const present=this._cudyClients().filter(c=>/slzb|smlight/i.test(c.name));
     if(present.length===1)return "Connectée · IP : "+present[0].ip;
     const candidates=[];
     const add=value=>{const ip=localIp(value);if(ip&&!candidates.includes(ip))candidates.push(ip);};
     add(this._config.zigbee_ip);
     const id=this._config.zigbee_ip_entity;
     if(id)add(states[id]?.state);
     for(const [name,st] of Object.entries(states)){
       if(!/slzb[_-]/i.test(name)||!/(?:ip|adresse)(?:_|$)/i.test(name))continue;
       add(st.state);
     }
     add(this._zigbeeRegistryIp);
     // Une URL de configuration enregistrée ne constitue pas une preuve
     // de présence physique, même avec une IP routable.
     if(candidates.length===1)
       return "IP enregistrée : "+candidates[0]+" · connexion non vérifiée";
     if(candidates.length>1)return "Plusieurs adresses enregistrées · connexion non vérifiée";
     if(mode&&mode!=="unavailable"&&mode!=="unknown")
       return "Mode "+String(mode).slice(0,40)+" · IP non détectée";
     return "Non détectée sur le réseau";
   }
   _render(){
     if(this._built||!this.isConnected)return;
     this._built=true;
     this.shadowRoot.innerHTML="<style>\n:host{display:block} ha-card{padding:16px;border-radius:16px}\nh3{margin:0 0 14px;font-size:18px}\n.line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-bottom:1px solid var(--divider-color)}\n.line span{color:var(--secondary-text-color);font-size:13px}\n.line strong{text-align:right;font-size:14px;overflow-wrap:anywhere}\n.panel{margin-top:18px} .client{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:10px 0;border-bottom:1px solid var(--divider-color)} .client strong{font-size:13px;overflow-wrap:anywhere} .client span{font-size:13px;text-align:right;white-space:nowrap} .client-info{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px} .client-sub{font-size:11px;color:var(--secondary-text-color);line-height:1.5} p{margin:8px 0;font-size:13px;line-height:1.5;color:var(--secondary-text-color)}\nlabel{display:block;font-size:13px;font-weight:600;margin:12px 0 6px}\nselect,input{font:inherit;width:100%;box-sizing:border-box;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);padding:11px;border-radius:9px}\n.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}\nbutton{font:inherit;cursor:pointer;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:10px;padding:11px 14px}\nbutton.primary{background:var(--primary-color);color:white;border-color:transparent}\nbutton:disabled{opacity:.5;cursor:default} .notice{white-space:pre-wrap;font-size:13px;min-height:1em}\n</style>\n<ha-card><h3>Réseau KIMIA</h3>\n<div class=\"line\"><span>IP Home Assistant</span><strong id=\"ha-ip\">—</strong></div><div class=\"line\"><span>Attribution IP Home Assistant</span><strong id=\"ha-ip-mode\">—</strong></div>\n<div class=\"line\"><span>Clé Zigbee</span><strong id=\"zigbee-ip\">—</strong></div>\n<div class=\"line\"><span>Wi-Fi Internet actuel</span><strong id=\"wisp-ssid\">—</strong></div>\n<div class=\"panel\"><h3>Appareils connectés au Cudy</h3><p>Liste fournie directement par le routeur via son intégration Home Assistant.</p><button id=\"refresh-clients\" type=\"button\">Actualiser les appareils</button><p id=\"client-note\">Lecture des appareils…</p><div id=\"clients\"></div></div>\n<div class=\"panel\"><h3>Connexion Internet · Wi-Fi WISP</h3>\n<p>Changer le réseau Internet utilisé par le routeur Cudy sans modifier le Wi-Fi local KIMIA.</p>\n<div class=\"buttons\"><button id=\"scan\" type=\"button\">Rechercher les réseaux</button></div>\n<label for=\"net\">Réseau Internet</label><select id=\"net\"><option value=\"\">Lancer une recherche</option></select>\n<label for=\"password\">Mot de passe du réseau</label>\n<input id=\"password\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"Mot de passe Wi-Fi (si nécessaire)\"/>\n<div class=\"buttons\"><button id=\"connect\" class=\"primary\" type=\"button\">Se connecter</button></div>\n<p id=\"notice\" class=\"notice\" role=\"status\"></p></div></ha-card>";
     this._els=Object.fromEntries(["ha-ip","ha-ip-mode","zigbee-ip","wisp-ssid","client-note","clients","refresh-clients","scan","net","password","connect","notice"]
       .map(id=>[id,this.shadowRoot.getElementById(id)]));
     this._els["refresh-clients"].addEventListener("click",()=>void this._loadCudyClients(true));
     this._els.scan.addEventListener("click",()=>void this._scan());
     this._els.net.addEventListener("change",()=>void this._select());
     this._els.connect.addEventListener("click",()=>void this._connect());
   }
   _refresh(){
     if(!this._built||!this._hass)return;
     const e=this._els;
     e["ha-ip"].textContent=this._haIp()||"IP locale indisponible";
     e["ha-ip-mode"].textContent=this._haIpMode();
     e["zigbee-ip"].textContent=this._zigbee();
     e["wisp-ssid"].textContent=this._wispCurrent();
     const clients=this._cudyClients(),haAddress=this._haIp();
     e.clients.replaceChildren();
     for(const item of clients){
       const line=document.createElement("div");line.className="client";
       const info=document.createElement("div");info.className="client-info";
       const isHa=item.ip&&haAddress&&item.ip===haAddress;
       const name=document.createElement("strong");
       name.textContent=isHa?"Home Assistant · "+item.name:item.name;
       const detail=document.createElement("div");detail.className="client-sub";
       const assignment=isHa?this._haIpMode():"Non déterminé";
       detail.textContent="MAC : "+(item.mac||"Non communiquée")+
         " · Connexion : "+item.connection+" · IP : "+assignment;
       info.append(name,detail);
       const ip=document.createElement("span");ip.textContent=item.ip||"IP inconnue";
       line.append(info,ip);e.clients.append(line);
     }
     e["refresh-clients"].disabled=this._routerBusy||!this._settingsAllowed();
     const status=this._routerStatus;
     if(status==="loading")e["client-note"].textContent="Lecture de la liste Cudy…";
     else if(status==="missing")e["client-note"].textContent=
       "L'intégration Cudy Router n'est pas chargée sur ce Home Assistant.";
     else if(status==="unavailable")e["client-note"].textContent=
       "Lecteur Cudy indisponible. Installer et activer kimia_cudy_clients, puis redémarrer Home Assistant.";
     else{
       e["client-note"].textContent=clients.length+
         " appareil(s) trouvé(s) dans la dernière liste du Cudy."+
         (this._routerReported!==clients.length?" Compteur du routeur : "+this._routerReported+".":"")+
         (!this._routerHealthy?" Attention : dernier rafraîchissement Cudy en erreur, liste possiblement ancienne.":"")+
         (this._routerTruncated?" Liste tronquée à 300 appareils.":"")+
         " Les réservations DHCP ne sont pas incluses dans cette liste.";
     }
     const ids={scan:this._find("scan"),network:this._find("network"),password:this._find("password"),connect:this._find("connect")};
     this._ids=ids;
     const net=ids.network?this._hass.states[ids.network]:null;
     const options=Array.isArray(net?.attributes?.options)?
       net.attributes.options.filter(x=>x&&String(x).toLowerCase()!=="scan first"):[];
     const prev=e.net.value,signature=JSON.stringify(options);
     if(this._options!==signature){
       this._options=signature;e.net.replaceChildren();
       const first=document.createElement("option");first.value="";
       first.textContent=options.length?"Choisir un réseau":"Lancer une recherche";e.net.append(first);
       for(const value of options){
         const option=document.createElement("option");option.value=String(value);
         option.textContent=String(value);e.net.append(option);
       }
     }
     if(this._pendingNetwork&&net?.state===this._pendingNetwork)this._pendingNetwork=null;
     const selected=options.includes(this._pendingNetwork)?this._pendingNetwork:
       options.includes(net?.state)?net.state:options.includes(prev)?prev:"";
     if(e.net.value!==selected)e.net.value=selected;
     const allowed=this._settingsAllowed();
     e.scan.disabled=this._busy||!allowed||!online(ids.scan?this._hass.states[ids.scan]:null);
     e.net.disabled=this._busy||!allowed||!online(net)||!options.length;
     e.password.disabled=this._busy||!allowed||!online(ids.password?this._hass.states[ids.password]:null);
     e.connect.disabled=this._busy||!allowed||!online(ids.connect?this._hass.states[ids.connect]:null)||
       !online(ids.password?this._hass.states[ids.password]:null)||!selected;
     if(!allowed)e.notice.textContent="La rubrique Paramètres est désactivée pour ce tableau de bord.";
     else if(!ids.scan||!ids.network||!ids.password||!ids.connect)
       e.notice.textContent="Commandes WISP indisponibles : vérifier les quatre entités de l'intégration Cudy Router.";
   }
   async _scan(){
     const id=this._ids?.scan;
     if(this._busy||!this._settingsAllowed()||!online(this._hass?.states?.[id]))return;
     this._busy=true;this._refresh();this._els.notice.textContent="Recherche demandée…";
     try{
       await this._hass.callService("button","press",{entity_id:id});
       this._els.notice.textContent="Scan demandé. Les réseaux apparaîtront dès l'actualisation Cudy.";
     }catch(_){this._els.notice.textContent="Recherche impossible. Vérifiez l'intégration Cudy.";}
     finally{this._busy=false;this._refresh();}
   }
   async _select(){
     const id=this._ids?.network,option=this._els.net.value;
     if(this._busy||!this._settingsAllowed()||!id||!option)return;
     this._pendingNetwork=option;this._busy=true;this._refresh();
     try{
       await this._hass.callService("select","select_option",{entity_id:id,option});
       this._els.notice.textContent="Réseau sélectionné : "+option+". Saisissez le mot de passe avant connexion.";
     }catch(_){this._pendingNetwork=null;this._els.notice.textContent="Impossible de sélectionner ce réseau.";}
     finally{this._busy=false;this._refresh();}
   }
   async _connect(){
     const ids=this._ids||{},ssid=this._els.net.value;
     if(this._busy||!this._settingsAllowed()||!ssid||!ids.connect||!ids.password||!ids.network)return;
     const net=this._hass?.states?.[ids.network];
     if(!Array.isArray(net?.attributes?.options)||!net.attributes.options.includes(ssid))return;
     if(!window.confirm("Connecter KIMIA au Wi-Fi Internet « "+ssid+" » ?\nLa connexion Internet peut être interrompue temporairement. Le réseau local KIMIA ne change pas."))return;
     const password=this._els.password.value;
     this._busy=true;this._refresh();this._els.notice.textContent="Connexion demandée…";
     try{
       await this._hass.callService("select","select_option",{entity_id:ids.network,option:ssid});
       await this._hass.callService("text","set_value",{entity_id:ids.password,value:password});
       this._els.password.value="";
       await this._hass.callService("button","press",{entity_id:ids.connect});
       this._els.notice.textContent="Commande envoyée. Vérifiez l'état Internet du Cudy.";
     }catch(_){this._els.notice.textContent="Échec WISP. Vérifiez le réseau et les journaux HA.";}
     finally{this._els.password.value="";this._busy=false;this._refresh();}
   }
   getCardSize(){return 6;}
 }
 customElements.define(TAG,Network);
 window.customCards=window.customCards||[];
 if(!window.customCards.some(card=>card.type===TAG))window.customCards.push({
   type:TAG,name:"KIMIA · Réseau client",description:"IP HA, clé Zigbee et changement du Wi-Fi Internet Cudy."
 });
})();