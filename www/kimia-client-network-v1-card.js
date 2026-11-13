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
 const online=entity=>entity&&entity.state!=="unavailable";
 class Network extends HTMLElement{
   constructor(){super();this.attachShadow({mode:"open"});this._config={};this._busy=false;this._built=false;}
   setConfig(c){this._config=c||{};this._refresh();}
   set hass(h){this._hass=h;this._refresh();}
   connectedCallback(){this._render();this._refresh();}
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
   _haIp(){
     const configured=ipv4(this._config.ha_ip);if(configured)return configured;
     for(const id of ["sensor.kimia_ha_ip","sensor.local_ip","sensor.home_assistant_ip"]){
       const found=ipv4(this._hass?.states?.[id]?.state);if(found)return found;
     }
     const internal=urlIp(this._hass?.config?.internal_url);
     return internal||ipv4(window.location?.hostname);
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
     if(mode&&mode!=="unavailable"&&mode!=="unknown")return "Mode "+String(mode).slice(0,40)+" · IP inconnue";
     return "IP ou liaison indisponible";
   }
   _render(){
     if(this._built||!this.isConnected)return;
     this._built=true;
     this.shadowRoot.innerHTML="<style>\n:host{display:block} ha-card{padding:16px;border-radius:16px}\nh3{margin:0 0 14px;font-size:18px}\n.line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-bottom:1px solid var(--divider-color)}\n.line span{color:var(--secondary-text-color);font-size:13px}\n.line strong{text-align:right;font-size:14px;overflow-wrap:anywhere}\n.panel{margin-top:18px} p{margin:8px 0;font-size:13px;line-height:1.5;color:var(--secondary-text-color)}\nlabel{display:block;font-size:13px;font-weight:600;margin:12px 0 6px}\nselect,input{font:inherit;width:100%;box-sizing:border-box;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);padding:11px;border-radius:9px}\n.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}\nbutton{font:inherit;cursor:pointer;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:10px;padding:11px 14px}\nbutton.primary{background:var(--primary-color);color:white;border-color:transparent}\nbutton:disabled{opacity:.5;cursor:default} .notice{white-space:pre-wrap;font-size:13px;min-height:1em}\n</style>\n<ha-card><h3>Réseau KIMIA</h3>\n<div class=\"line\"><span>IP Home Assistant</span><strong id=\"ha-ip\">—</strong></div>\n<div class=\"line\"><span>Clé Zigbee</span><strong id=\"zigbee-ip\">—</strong></div>\n<div class=\"panel\"><h3>Connexion Internet · Wi-Fi WISP</h3>\n<p>Changer le réseau Internet utilisé par le routeur Cudy sans modifier le Wi-Fi local KIMIA.</p>\n<div class=\"buttons\"><button id=\"scan\" type=\"button\">Rechercher les réseaux</button></div>\n<label for=\"net\">Réseau Internet</label><select id=\"net\"><option value=\"\">Lancer une recherche</option></select>\n<label for=\"password\">Mot de passe du réseau</label>\n<input id=\"password\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"Mot de passe Wi-Fi (si nécessaire)\"/>\n<div class=\"buttons\"><button id=\"connect\" class=\"primary\" type=\"button\">Se connecter</button></div>\n<p id=\"notice\" class=\"notice\" role=\"status\"></p></div></ha-card>";
     this._els=Object.fromEntries(["ha-ip","zigbee-ip","scan","net","password","connect","notice"]
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
     e.scan.disabled=this._busy||!online(ids.scan?this._hass.states[ids.scan]:null);
     e.net.disabled=this._busy||!online(net)||!options.length;
     e.password.disabled=this._busy||!online(ids.password?this._hass.states[ids.password]:null);
     e.connect.disabled=this._busy||!online(ids.connect?this._hass.states[ids.connect]:null)||
       !online(ids.password?this._hass.states[ids.password]:null)||!selected;
     if(!ids.scan||!ids.network||!ids.password||!ids.connect)
       e.notice.textContent="Commandes WISP indisponibles : vérifier les quatre entités de l'intégration Cudy Router.";
   }
   async _scan(){
     const id=this._ids?.scan;
     if(this._busy||!online(this._hass?.states?.[id]))return;
     this._busy=true;this._refresh();this._els.notice.textContent="Recherche demandée…";
     try{
       await this._hass.callService("button","press",{entity_id:id});
       this._els.notice.textContent="Scan demandé. Les réseaux apparaîtront dès l'actualisation Cudy.";
     }catch(_){this._els.notice.textContent="Recherche impossible. Vérifiez l'intégration Cudy.";}
     finally{this._busy=false;this._refresh();}
   }
   async _select(){
     const id=this._ids?.network,option=this._els.net.value;
     if(this._busy||!id||!option)return;
     this._pendingNetwork=option;this._busy=true;this._refresh();
     try{
       await this._hass.callService("select","select_option",{entity_id:id,option});
       this._els.notice.textContent="Réseau sélectionné : "+option+". Saisissez le mot de passe avant connexion.";
     }catch(_){this._pendingNetwork=null;this._els.notice.textContent="Impossible de sélectionner ce réseau.";}
     finally{this._busy=false;this._refresh();}
   }
   async _connect(){
     const ids=this._ids||{},ssid=this._els.net.value;
     if(this._busy||!ssid||!ids.connect||!ids.password||!ids.network)return;
     const net=this._hass?.states?.[ids.network];
     if(!Array.isArray(net?.attributes?.options)||!net.attributes.options.includes(ssid))return;
     if(!window.confirm("Connecter KIMIA au Wi-Fi Internet « "+ssid+" » ?\nLa connexion Internet peut être interrompue temporairement. Le réseau local KIMIA ne change pas."))return;
     const password=this._els.password.value;
     this._busy=true;this._refresh();this._els.notice.textContent="Connexion demandée…";
     try{
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