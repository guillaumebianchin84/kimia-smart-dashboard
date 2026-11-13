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
 const online=entity=>entity&&!["unavailable","unknown"].includes(entity.state);
 class Network extends HTMLElement{
   constructor(){
     super();this.attachShadow({mode:"open"});
     this._config={};this._busy=false;this._built=false;
     this._supervisorIp="";this._clientMeta=null;this._lookupUser="";
     this._lookupStarted=false;this._zigbeeRegistryIp="";
   }
   setConfig(c){this._config=c||{};this._refresh();}
   set hass(h){
     const user=h?.user?.id||"";
     if(this._lookupUser!==user){
       this._lookupUser=user;this._lookupStarted=false;
       this._supervisorIp="";this._clientMeta=null;this._zigbeeRegistryIp="";
     }
     this._hass=h;this._refresh();this._loadNetworkInfo();
   }
   connectedCallback(){this._render();this._refresh();this._loadNetworkInfo();}
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
     if(answers[0].status==="fulfilled")
       this._supervisorIp=hostNetworkIp(answers[0].value);
     const entities=answers[1].status==="fulfilled"?answers[1].value:null;
     const devices=answers[2].status==="fulfilled"?answers[2].value:null;
     if(Array.isArray(entities)){
       const byId=new Map((Array.isArray(devices)?devices:[]).map(d=>[d.id,d]));
       const cudy=entities.filter(e=>e.platform==="cudy_router"&&
         /-device-[0-9a-f]{12}-ip$/i.test(String(e.unique_id||"")));
       this._clientMeta=cudy.map(e=>{
         const device=byId.get(e.device_id);
         return {
           id:e.entity_id,
           name:device?.name_by_user||device?.name||e.name||"",
           device_id:e.device_id
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
   _cudyClients(){
     const states=this._hass?.states||{};
     if(Array.isArray(this._clientMeta)){
       return this._clientMeta.map(item=>{
         const entity=states[item.id];
         const ip=online(entity)?localIp(entity.state):"";
         const friendly=String(entity?.attributes?.friendly_name||"");
         return {name:item.name||friendly.replace(/\s+IP address$/i,"")||item.id,ip};
       }).filter(x=>x.ip).sort((a,b)=>a.name.localeCompare(b.name));
     }
     // Sans permission de lire le registre, les capteurs d'IP sont visibles
     // dans les états HA mais leur provenance Cudy ne peut être certifiée.
     // On ne présente donc PAS les autres capteurs comme clients du routeur.
     return [];
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
   _zigbee(){
     const configured=ipv4(this._config.zigbee_ip);if(configured)return "IP : "+configured;
     const states=this._hass?.states||{},id=this._config.zigbee_ip_entity;
     const direct=ipv4(id?states[id]?.state:"");if(direct)return "IP : "+direct;
     for(const [name,st] of Object.entries(states)){
       if(!/slzb[_-]/i.test(name)||!/(?:ip|adresse)(?:_|$)/i.test(name))continue;
       const address=ipv4(st.state);if(address)return "IP : "+address;
     }
     const mode=Object.entries(states).find(([name])=>/slzb.*mode_de_connexion/i.test(name))?.[1]?.state;
     if(/usb/i.test(String(mode)))return "USB (pas d'adresse IP)";
     if(this._zigbeeRegistryIp)return "IP : "+this._zigbeeRegistryIp;
     const zigbeeClient=this._cudyClients().filter(c=>/slzb|smlight/i.test(c.name));
     if(zigbeeClient.length===1)return "IP : "+zigbeeClient[0].ip;
     if(mode&&mode!=="unavailable"&&mode!=="unknown")return "Mode "+String(mode).slice(0,40)+" · IP inconnue";
     return "Non détectée sur le réseau";
   }
   _render(){
     if(this._built||!this.isConnected)return;
     this._built=true;
     this.shadowRoot.innerHTML="<style>\n:host{display:block} ha-card{padding:16px;border-radius:16px}\nh3{margin:0 0 14px;font-size:18px}\n.line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-bottom:1px solid var(--divider-color)}\n.line span{color:var(--secondary-text-color);font-size:13px}\n.line strong{text-align:right;font-size:14px;overflow-wrap:anywhere}\n.panel{margin-top:18px} .client{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:10px 0;border-bottom:1px solid var(--divider-color)} .client strong{font-size:13px;overflow-wrap:anywhere} .client span{font-size:13px;text-align:right;white-space:nowrap} p{margin:8px 0;font-size:13px;line-height:1.5;color:var(--secondary-text-color)}\nlabel{display:block;font-size:13px;font-weight:600;margin:12px 0 6px}\nselect,input{font:inherit;width:100%;box-sizing:border-box;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);padding:11px;border-radius:9px}\n.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}\nbutton{font:inherit;cursor:pointer;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:10px;padding:11px 14px}\nbutton.primary{background:var(--primary-color);color:white;border-color:transparent}\nbutton:disabled{opacity:.5;cursor:default} .notice{white-space:pre-wrap;font-size:13px;min-height:1em}\n</style>\n<ha-card><h3>Réseau KIMIA</h3>\n<div class=\"line\"><span>IP Home Assistant</span><strong id=\"ha-ip\">—</strong></div>\n<div class=\"line\"><span>Clé Zigbee</span><strong id=\"zigbee-ip\">—</strong></div>\n<div class=\"line\"><span>Wi-Fi Internet actuel</span><strong id=\"wisp-ssid\">—</strong></div>\n<div class=\"panel\"><h3>Appareils connectés au Cudy</h3><p id=\"client-note\">Recherche des appareils…</p><div id=\"clients\"></div></div>\n<div class=\"panel\"><h3>Connexion Internet · Wi-Fi WISP</h3>\n<p>Changer le réseau Internet utilisé par le routeur Cudy sans modifier le Wi-Fi local KIMIA.</p>\n<div class=\"buttons\"><button id=\"scan\" type=\"button\">Rechercher les réseaux</button></div>\n<label for=\"net\">Réseau Internet</label><select id=\"net\"><option value=\"\">Lancer une recherche</option></select>\n<label for=\"password\">Mot de passe du réseau</label>\n<input id=\"password\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"Mot de passe Wi-Fi (si nécessaire)\"/>\n<div class=\"buttons\"><button id=\"connect\" class=\"primary\" type=\"button\">Se connecter</button></div>\n<p id=\"notice\" class=\"notice\" role=\"status\"></p></div></ha-card>";
     this._els=Object.fromEntries(["ha-ip","zigbee-ip","wisp-ssid","client-note","clients","scan","net","password","connect","notice"]
       .map(id=>[id,this.shadowRoot.getElementById(id)]));
     this._els.scan.addEventListener("click",()=>void this._scan());
     this._els.net.addEventListener("change",()=>void this._select());
     this._els.connect.addEventListener("click",()=>void this._connect());
   }
   _refresh(){
     if(!this._built||!this._hass)return;
     const e=this._els;
     e["ha-ip"].textContent=this._haIp()||"IP locale indisponible";
     e["zigbee-ip"].textContent=this._zigbee();
     e["wisp-ssid"].textContent=this._wispCurrent();
     const clients=this._cudyClients();
     e.clients.replaceChildren();
     for(const item of clients){
       const line=document.createElement("div");
       line.className="client";
       const name=document.createElement("strong");name.textContent=item.name;
       const ip=document.createElement("span");ip.textContent=item.ip;
       line.append(name,ip);e.clients.append(line);
     }
     e["client-note"].textContent=clients.length?
       clients.length+" appareil(s) connecté(s) avec adresse IP connue.":
       this._clientMeta===null?
       "Inventaire indisponible pour ce compte. Un accès serveur dédié serait nécessaire pour afficher une liste complète.":
       "Aucun client Cudy avec IP visible. Vérifier « Ajouter automatiquement les appareils connectés » dans les options de l'intégration Cudy Router.";
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