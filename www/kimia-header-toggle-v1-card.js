/* KIMIA Smart — affichage temporaire du bandeau Home Assistant. */
(() => {
  "use strict";
  const TAG = "kimia-header-toggle-v1-card";
  if (customElements.get(TAG)) return;
  const duration = 10 * 60 * 1000;
  const keyFor = userName => "kimia_bandeau_ha_" + (userName || "");
  const onClientDashboard = () => /^\/kimia-next(?:\/|$)/.test(window.location.pathname);
  let userName, displayed, timer, reloading = false;

  function readUntil(name) {
    try {
      const until = Number(window.localStorage.getItem(keyFor(name)));
      return Number.isFinite(until) ? until : 0;
    } catch (_) { return 0; }
  }

  function reloadDashboard() {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  }

  function checkDeadline() {
    window.clearTimeout(timer);
    if (userName === undefined || !onClientDashboard() || reloading) return;
    const remaining = readUntil(userName) - Date.now();
    const visible = remaining > 0;
    if (displayed !== visible) reloadDashboard();
    else if (visible) timer = window.setTimeout(checkDeadline, Math.min(remaining, duration));
  }

  function isHidden(name) {
    userName = name;
    displayed = readUntil(name) > Date.now();
    checkDeadline();
    return !displayed;
  }

  // Kiosk Mode evaluates the template when it loads the dashboard. Keep the
  // timer here so it continues when the Affichage card is no longer mounted.
  window.KimiaHeaderTimer = Object.freeze({isHidden});
  window.addEventListener("location-changed", checkDeadline);
  window.addEventListener("popstate", checkDeadline);
  window.addEventListener("pageshow", checkDeadline);
  window.addEventListener("focus", checkDeadline);
  window.addEventListener("storage", event => {
    if (event.key === null || event.key === keyFor(userName)) checkDeadline();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDeadline();
  });
  const loadedUser = document.querySelector("home-assistant")?.hass?.user;
  if (onClientDashboard() && loadedUser) isHidden(loadedUser.name);

  class KimiaHeaderToggleCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:"open"});
      const style=document.createElement("style");
      style.textContent=[
        ":host{display:block;color:var(--primary-text-color)}",
        "ha-card{display:block;padding:20px;border-radius:18px;border:1px solid var(--divider-color);background:var(--card-background-color)}",
        "h3{font-size:18px;margin:0 0 10px;font-weight:750}",
        "p{margin:5px 0 14px;color:var(--secondary-text-color);font-size:13px;line-height:1.6}",
        "button{width:100%;border:0;border-radius:13px;min-height:52px;cursor:pointer;font:inherit;font-weight:700;background:var(--primary-color);color:var(--text-primary-color,#fff)}",
        "button:disabled{opacity:.6;cursor:wait}",
        ".status{font-size:12px;margin-top:10px;color:var(--secondary-text-color)}"
      ].join("\n");
      const card=document.createElement("ha-card");
      const title=document.createElement("h3");title.textContent="Bandeau Home Assistant";
      this._description=document.createElement("p");
      this._button=document.createElement("button");
      this._button.type="button";
      this._button.addEventListener("click",()=>this._toggle());
      this._status=document.createElement("p");this._status.className="status";
      this._status.setAttribute("aria-live","polite");
      card.append(title,this._description,this._button,this._status);
      this.shadowRoot.append(style,card);
    }
    setConfig(config){this._config=config||{};}
    set hass(hass){this._hass=hass;this._render();}
    getCardSize(){return 3;}
    _render(){
      if(!this._hass)return;
      const visible=readUntil(this._hass.user?.name)>Date.now();
      this._description.textContent=visible?
        "Le bandeau Home Assistant se masquera automatiquement au bout des 10 minutes.":
        "Le bandeau Home Assistant est masqué. Vous pouvez l’afficher temporairement sur cet appareil.";
      this._button.textContent=visible?
        "Masquer maintenant":"Afficher le bandeau HA pendant 10 min";
      this._status.textContent="Ce choix est personnel à ce téléphone et à ce compte.";
    }
    _toggle(){
      if(!this._hass||!onClientDashboard())return;
      const name=this._hass.user?.name;
      try{
        if(readUntil(name)>Date.now())window.localStorage.removeItem(keyFor(name));
        else window.localStorage.setItem(keyFor(name),String(Date.now()+duration));
      }catch(error){
        this._status.textContent="Impossible d'enregistrer le choix sur ce téléphone : "+
          (error?.message||"stockage indisponible");
        return;
      }
      this._button.disabled=true;
      this._status.textContent="Application du réglage…";
      reloadDashboard();
    }
  }
  customElements.define(TAG,KimiaHeaderToggleCard);
  window.customCards=window.customCards||[];
  if(!window.customCards.some(c=>c.type===TAG)){
    window.customCards.push({
      type:TAG,
      name:"KIMIA · Afficher ou masquer le bandeau HA",
      description:"Affichage du bandeau pendant 10 minutes sur cet appareil."
    });
  }
})();
