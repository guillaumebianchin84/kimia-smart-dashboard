/* KIMIA Smart by PROMAINT — assistant installation v1.
 * Carte réservée aux administrateurs, aucun identifiant HA affiché.
 */
(() => {
  "use strict";
  const TAG = "kimia-setup-v1-card";
  if (customElements.get(TAG)) return;
  class KimiaSetupCard extends HTMLElement {
    constructor() {
      super(); this.attachShadow({mode:"open"});
      this._hass = null; this._busy = false; this._started = false;
      const style = document.createElement("style");
      style.textContent = [
        ":host{display:block;color:var(--primary-text-color)}",
        "ha-card{display:block;padding:22px;border-radius:20px;background:linear-gradient(115deg,rgba(13,153,151,.16),var(--card-background-color) 75%);border:1px solid rgba(13,153,151,.24)}",
        "h2{font-size:23px;margin:0 0 5px;font-weight:800;letter-spacing:-.5px}",
        ".eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:800;color:var(--primary-color)}",
        ".lead{font-size:14px;line-height:1.5;color:var(--secondary-text-color);margin:6px 0 18px}",
        ".stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0 18px}",
        ".stat{background:var(--ha-card-background,var(--secondary-background-color));border-radius:13px;padding:12px;text-align:center}",
        ".num{font-size:27px;font-weight:850}.lab{font-size:11px;color:var(--secondary-text-color)}",
        ".steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:16px}",
        ".step{border:1px solid var(--divider-color);border-radius:12px;padding:10px;font-size:12px;line-height:1.45}",
        ".step b{display:block;font-size:13px;margin-bottom:4px}",
        "button{font:inherit;font-size:14px;font-weight:750;min-height:43px;background:var(--primary-color);color:var(--text-primary-color,#fff);border:0;border-radius:11px;padding:10px 16px;cursor:pointer;width:100%}",
        "button:disabled{opacity:.5;cursor:default}",
        ".status{font-size:12px;line-height:1.5;margin:12px 0 0;color:var(--secondary-text-color)}",
        ".error{color:var(--error-color,#b33)}",
        "@media(max-width:600px){ha-card{padding:15px}.steps{grid-template-columns:1fr}}"
      ].join("\n");
      const card = document.createElement("ha-card");
      card.innerHTML = '<div class="eyebrow">KIMIA Smart · by PROMAINT</div>'+
        '<h2>Bienvenue dans votre maison</h2>'+
        '<p class="lead">Créez vos pièces et ajoutez vos appareils. KIMIA organise ensuite votre maison automatiquement.</p>'+
        '<div class="stats"><div class="stat"><div class="num" id="rooms">–</div><div class="lab">Pièces</div></div>'+
        '<div class="stat"><div class="num" id="devices">–</div><div class="lab">Appareils</div></div>'+
        '<div class="stat"><div class="num" id="ready">–</div><div class="lab">Équipements pilotables</div></div></div>'+
        '<div class="steps"><div class="step"><b>1 · Mes pièces</b>Salon, chambres, cuisine…</div>'+
        '<div class="step"><b>2 · Mes appareils</b>Appairage Zigbee et choix de la pièce.</div>'+
        '<div class="step"><b>3 · Ma maison</b>Retrouvez les commandes automatiquement.</div></div>'+
        '<button type="button" id="sync">Actualiser ma maison</button>'+
        '<p class="status" id="status" aria-live="polite">KIMIA est prêt.</p>';
      this.shadowRoot.append(style,card);
      this._btn=this.shadowRoot.getElementById("sync");
      this._btn.addEventListener("click",()=>void this._sync());
      this._listener=(e)=>{this._setStatus(e.detail?.message||"",e.detail?.state==="error")};
    }
    setConfig(config) { this._config=config||{}; }
    set hass(value) {
      if (!value) return; this._hass=value;
      this._btn.disabled=value.user?.is_admin!==true || this._busy;
      if (!this._started){this._started=true;void this._loadStats();}
    }
    connectedCallback(){window.addEventListener("kimia-sync-status",this._listener);}
    disconnectedCallback(){window.removeEventListener("kimia-sync-status",this._listener);}
    getCardSize(){return 7;}
    _el(k){return this.shadowRoot.getElementById(k);}
    _setStatus(s,error=false){this._el("status").textContent=s;this._el("status").className=error?"status error":"status";}
    async _loadStats(){
      if(!this._hass || this._hass.user?.is_admin!==true){
        this._setStatus("Configuration réservée à l'administrateur.",true);return;
      }
      try {
        const [a,d,e]=await Promise.all([
          this._hass.callWS({type:"config/area_registry/list"}),
          this._hass.callWS({type:"config/device_registry/list"}),
          this._hass.callWS({type:"config/entity_registry/list"})
        ]);
        this._el("rooms").textContent=a.length;
        this._el("devices").textContent=d.length;
        this._el("ready").textContent=e.filter(x=>!x.disabled_by&&!x.hidden_by&&
          /^(light|switch|cover|climate|fan|media_player)\./.test(x.entity_id)).length;
      }catch(err){this._setStatus("Lecture des équipements impossible : "+(err?.message||err),true);}
    }
    async _sync(){
      if(this._busy||this._hass?.user?.is_admin!==true)return;
      if(!window.KimiaSmartCore){
        this._setStatus("Moteur KIMIA manquant : installez kimia-smart-core-v1.js.",true);return;
      }
      this._busy=true;this._btn.disabled=true;this._btn.textContent="Organisation en cours…";
      try{const result=await window.KimiaSmartCore.sync(this._hass);
        this._setStatus(result.message); await this._loadStats();}
      catch(err){this._setStatus("KIMIA : "+(err?.message||String(err)),true);}
      finally{this._busy=false;this._btn.textContent="Actualiser ma maison";this._btn.disabled=false;}
    }
  }
  customElements.define(TAG,KimiaSetupCard);
  window.customCards=window.customCards||[];
  window.customCards.push({type:TAG,name:"KIMIA · Assistant de maison",description:"Installation et synchronisation automatique des pièces et appareils"});
})();