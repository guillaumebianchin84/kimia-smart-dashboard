/* KIMIA Smart by PROMAINT — Bandeau Home Assistant, préférence locale par utilisateur.
 * Fonctionne avec Kiosk Mode. Le réglage est stocké sur CE téléphone/navigateur
 * et n'impacte aucun autre utilisateur ni la VM Home Assistant personnelle.
 */
(() => {
  "use strict";
  const TAG = "kimia-header-toggle-v1-card";
  if (customElements.get(TAG)) return;
  const keyFor = userName => "kimia_bandeau_ha_" + (userName || "");
  function readVisible(userName) {
    try { return window.localStorage.getItem(keyFor(userName)) === "visible"; }
    catch (_) { return false; }
  }
  function writeVisible(userName, visible) {
    window.localStorage.setItem(keyFor(userName), visible ? "visible" : "masque");
  }
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
        ".status{font-size:12px;margin-top:10px;color:var(--secondary-text-color)}",
        ".hidden{display:none}"
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
      // L'administrateur garde en permanence le bandeau et les onglets HA.
      // Le réglage Kiosk appartient uniquement aux comptes non-admin.
      if(this._hass.user?.is_admin){
        this._description.textContent="Compte administrateur : le bandeau et le menu Home Assistant restent visibles.";
        this._button.classList.add("hidden");
        this._status.textContent="Le mode KIMIA plein écran concerne uniquement les comptes utilisateurs.";
        return;
      }
      this._button.classList.remove("hidden");
      const visible=readVisible(this._hass.user?.name);
      this._description.textContent=visible?
        "Le menu Home Assistant est visible sur cet appareil. Vous pouvez retrouver la navigation KIMIA en masquant ce bandeau.":
        "Vous utilisez uniquement le menu KIMIA. Affichez temporairement les commandes Home Assistant pour changer de serveur ou accéder à votre profil.";
      this._button.textContent=visible?
        "Masquer le bandeau Home Assistant":"Afficher le bandeau Home Assistant";
      this._status.textContent="Ce choix est personnel à ce téléphone et à ce compte.";
    }
    _toggle(){
      if(!this._hass||this._hass.user?.is_admin)return;
      const userName=this._hass.user?.name;
      const next=!readVisible(userName);
      try{
        writeVisible(userName,next);
      }catch(error){
        this._status.textContent="Impossible d'enregistrer le choix sur ce téléphone : "+
          (error?.message||"stockage indisponible");
        return;
      }
      this._button.disabled=true;
      this._status.textContent="Application du réglage…";
      // Kiosk Mode réévalue le stockage local au prochain chargement.
      // RECHARGER la page actuelle, sans aucun changement de chemin, serveur ou
      // origine : ne jamais naviguer vers "/" ni rediriger vers Internet.
      window.location.reload();
    }
  }
  customElements.define(TAG,KimiaHeaderToggleCard);
  window.customCards=window.customCards||[];
  if(!window.customCards.some(c=>c.type===TAG)){
    window.customCards.push({
      type:TAG,
      name:"KIMIA · Afficher ou masquer le bandeau HA",
      description:"Bascule par utilisateur et appareil depuis Paramètres KIMIA."
    });
  }
})();