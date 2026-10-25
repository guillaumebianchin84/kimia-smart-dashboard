/* KIMIA Smart — association des scénarios sans saisie d'identifiants. */
(() => {
 "use strict";
 const TAG="kimia-scenarios-v1-card";
 if(customElements.get(TAG))return;
 const FIELDS=[
  ["Au lit","input_text.kimia_cible_au_lit","mdi:weather-night"],
  ["Départ","input_text.kimia_cible_depart","mdi:door-open"],
  ["Retour","input_text.kimia_cible_retour","mdi:home-import-outline"],
  ["Réveil","input_text.kimia_cible_reveil","mdi:weather-sunny"],
  ["Détente","input_text.kimia_cible_ambiance_detente","mdi:sofa"],
  ["Soirée","input_text.kimia_cible_ambiance_soiree","mdi:lightbulb-group"],
  ["Cinéma","input_text.kimia_cible_ambiance_cinema","mdi:movie-open"]
 ];
 class KimiaScenes extends HTMLElement {
  constructor(){
   super();this.attachShadow({mode:"open"});this._hass=null;this._ready=false;
   const s=document.createElement("style");
   s.textContent=[
    "ha-card{display:block;padding:18px;border-radius:17px;color:var(--primary-text-color);background:var(--card-background-color)}",
    "h2{margin:0 0 6px;font-size:19px}.desc{font-size:12px;line-height:1.5;color:var(--secondary-text-color)}",
    ".row{display:flex;align-items:center;gap:12px;margin-top:12px;border-top:1px solid var(--divider-color);padding-top:12px}",
    ".label{flex:0 0 100px;font-size:13px;font-weight:700}select{flex:1;min-width:0;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:9px;padding:10px;font-size:13px}",
    ".status{font-size:12px;color:var(--secondary-text-color);margin-top:12px}.err{color:var(--error-color,#b33)}",
    "@media(max-width:480px){.row{align-items:stretch;flex-direction:column}.label{flex:auto}}"
   ].join("\n");
   const card=document.createElement("ha-card");
   const h=document.createElement("h2");h.textContent="Mes scénarios";
   const p=document.createElement("p");p.className="desc";
   p.textContent="Choisissez une routine existante pour chaque raccourci. Aucun identifiant à saisir. « Aucun » désactive le raccourci en toute sécurité.";
   card.append(h,p);
   this._selects=[];
   for(const [title,helper,icon] of FIELDS){
    const row=document.createElement("div");row.className="row";
    const label=document.createElement("label");label.className="label";label.textContent=title;
    const select=document.createElement("select");select.disabled=true;
    label.htmlFor="";select.setAttribute("aria-label","Scénario "+title);
    select.addEventListener("change",()=>void this._save(select,helper,title));
    row.append(label,select);card.appendChild(row);
    this._selects.push({helper,select,title});
   }
   const msg=document.createElement("p");msg.className="status";msg.setAttribute("aria-live","polite");card.appendChild(msg);this._msg=msg;
   this.shadowRoot.append(s,card);
  }
  setConfig(config){this._config=config||{};}
  set hass(hass){this._hass=hass;this._render();}
  getCardSize(){return 9;}
  _status(msg,error=false){this._msg.textContent=msg;this._msg.className=error?"status err":"status";}
  _render(){
   if(!this._hass || this._hass.user?.is_admin!==true){
     this._status("Réglages réservés à l'administrateur.",true);return;
   }
   const scripts=Object.keys(this._hass.states||{}).filter(s=>s.startsWith("script.") &&
     !s.startsWith("script.kimia_")).sort((a,b)=>
      (this._hass.states[a].attributes.friendly_name||a).localeCompare(
        this._hass.states[b].attributes.friendly_name||b,"fr"));
   const signature=scripts.join("|")+"|"+FIELDS.map(x=>this._hass.states[x[1]]?.state||"").join("|");
   if(this._ready&&signature===this._signature)return;
   this._signature=signature;this._ready=true;
   for(const {helper,select} of this._selects){
    const stored=this._hass.states[helper]?.state;
    const present=!!this._hass.states[helper];
    select.replaceChildren();
    const opt=document.createElement("option");opt.value="";opt.textContent="Aucun scénario";select.appendChild(opt);
    for(const key of scripts){
      const opt=document.createElement("option");opt.value=key;
      opt.textContent=this._hass.states[key].attributes.friendly_name||key;
      select.appendChild(opt);
    }
    select.disabled=!present;
    if(present&&scripts.includes(stored))select.value=stored;
    else select.value="";
   }
   this._status(this._selects.some(x=>!this._hass.states[x.helper])?
    "Configuration des scénarios incomplète : helpers KIMIA manquants.":"Les raccourcis sont prêts.");
  }
  async _save(select,helper,title){
   if(this._hass?.user?.is_admin!==true)return;
   select.disabled=true;
   try{
    await this._hass.callService("input_text","set_value",{entity_id:helper,value:select.value});
    this._status(title+" : scénario enregistré.");
   }catch(err){this._status("Enregistrement impossible : "+(err?.message||err),true);}
   finally{select.disabled=false;}
  }
 }
 customElements.define(TAG,KimiaScenes);
 window.customCards=window.customCards||[];
 window.customCards.push({type:TAG,name:"KIMIA · Association des scénarios",description:"Choisir les scénarios dans une liste, sans YAML"});
})();