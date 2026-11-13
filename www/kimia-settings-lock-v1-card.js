/* KIMIA Smart — PIN des paramètres et session locale au navigateur. */
(() => {
  "use strict";
  if (window.KimiaSettingsLock) return;
  const idleMs = 300000;
  const storageKey = "kimia-settings-session-v1";
  const changed = "kimia-settings-lock-changed";
  let currentUser, session, expiry, refreshAt = 0;
  let checkVersion = 0;

  const remember = () => {
    try {
      if (session) {
        const {user,token,until} = session;
        sessionStorage.setItem(storageKey, JSON.stringify({user,token,until}));
      }
      else sessionStorage.removeItem(storageKey);
    } catch (_) { /* The in-memory session still works. */ }
    clearTimeout(expiry);
    if (session?.verified) expiry = setTimeout(() => {
      const hass = session.hass;
      void lock(hass);
    }, Math.max(0, session.until - Date.now()));
    window.dispatchEvent(new Event(changed));
  };
  const forget = () => { session = undefined; checkVersion++; remember(); };
  const command = (hass, action, values = {}) =>
    hass.callWS({type:"kimia_settings/session",action,...values});
  const lock = async hass => {
    const token = session?.token;
    forget();
    if (token && hass?.user?.id === currentUser) {
      try { await command(hass,"lock",{token}); } catch (_) { /* Expires on the server. */ }
    }
  };
  const verify = async (hass, action, entry) => {
    const version = checkVersion;
    try {
      const result = await command(hass,action,{token:entry.token});
      if (version !== checkVersion || session !== entry) return;
      if (!result.unlocked || entry.until <= Date.now()) { forget(); return; }
      entry.verified = true;
      if (action === "touch") entry.until = Date.now() + idleMs;
      remember();
    } catch (_) {
      if (version === checkVersion && session === entry) forget();
    }
  };
  const bind = hass => {
    const user = hass?.user?.id;
    if (!user) return;
    if (currentUser === user) {
      if (session) session.hass = hass;
      return;
    }
    currentUser = user;
    checkVersion++;
    session = undefined;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch (_) {}
    if (saved?.user !== user || typeof saved?.token !== "string" || saved.until <= Date.now()) {
      forget();
      return;
    }
    session = {user,token:saved.token,until:saved.until,verified:false,hass};
    void verify(hass,"status",session);
  };
  const isOpen = hass => Boolean(session?.verified && session.user === hass?.user?.id && session.until > Date.now());
  const token = hass => isOpen(hass) ? session.token : undefined;
  const activity = () => {
    if (!session?.verified || !isOpen(session.hass) || Date.now() < refreshAt) return;
    if (!/^\/kimia-next\/(parametres|reglages-)/.test(window.location.pathname)) return;
    refreshAt = Date.now() + 10000;
    void verify(session.hass,"touch",session);
  };
  window.addEventListener("pointerdown", activity, {passive:true});
  window.addEventListener("keydown", activity);
  window.KimiaSettingsLock = Object.freeze({isOpen,token,changed});

  class KimiaSettingsLockCard extends HTMLElement {
    get connectedWhileHidden() { return true; }
    set layout(value) {
      this._layout = value;
      if (this.child) this.child.layout = value;
      this.updateGridHeight();
    }
    setConfig(config) {
      this.config = config;
      this.open = undefined;
      if (!this.shadowRoot) this.attachShadow({mode:"open"});
      this.updateGridHeight();
      this.render();
    }
    set hass(hass) {
      this._hass = hass;
      bind(hass);
      if (this.child) this.child.hass = hass;
      this.render();
    }
    connectedCallback() {
      this.update ??= () => this.render();
      window.addEventListener(changed,this.update);
      this.render();
    }
    disconnectedCallback() { window.removeEventListener(changed,this.update); }
    getGridOptions() { return this.config?.grid_options || {columns:6,rows:2}; }
    updateGridHeight() {
      this.toggleAttribute("fixed-height", this._layout === "grid" &&
        typeof this.getGridOptions().rows === "number");
    }
    setVisible(visible) {
      if (this.hidden === !visible) return;
      this.hidden = !visible;
      this.dispatchEvent(new CustomEvent("card-visibility-changed", {
        detail:{value:visible}, bubbles:true, composed:true
      }));
    }
    render() {
      if (!this.shadowRoot || !this.config || !this._hass) return;
      const open = isOpen(this._hass);
      if (this.open === open && this.renderMode === this.config.mode) return;
      this.open = open;
      this.renderMode = this.config.mode;
      this.child = undefined;
      this.shadowRoot.innerHTML = `<style>
        :host{display:block} :host([hidden]){display:none}
        :host([fixed-height]){height:100%} :host([fixed-height]) #content{height:100%}
        ha-card{padding:12px} :host([fixed-height]) > ha-card{height:100%;display:flex;align-items:center;box-sizing:border-box}
        ha-button{max-width:100%} dialog{background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:12px;padding:20px;max-width:calc(100vw - 56px)}
        dialog::backdrop{background:#0008} form{display:grid;gap:12px} label,input{font:inherit} input{padding:10px;max-width:100%;box-sizing:border-box} p{margin:0} .actions{display:flex;flex-wrap:wrap;gap:8px}
      </style>`;
      if (this.config.mode === "content") {
        this.setVisible(open);
        if (open) void this.renderCard();
        return;
      }
      this.setVisible(this.config.mode !== "notice" || !open);
      const card = document.createElement("ha-card");
      const button = document.createElement("ha-button");
      button.textContent = open ? "Verrouiller les paramètres" : "Déverrouiller les paramètres";
      button.addEventListener("click", () => open ? void lock(this._hass) : this.dialog());
      card.append(button);
      this.shadowRoot.append(card);
    }
    async renderCard() {
      const current = this._hass;
      try {
        const helpers = await window.loadCardHelpers();
        if (!this.isConnected || this.child || !isOpen(this._hass) || current.user.id !== this._hass.user.id) return;
        const card = helpers.createCardElement(this.config.card);
        this.child = card;
        card.id = "content";
        card.layout = this._layout;
        card.hass = this._hass;
        this.shadowRoot.append(card);
      } catch (_) {
        if (!isOpen(this._hass)) return;
        const notice = document.createElement("ha-card");
        notice.textContent = "Réglage indisponible. Actualise la page.";
        this.shadowRoot.append(notice);
      }
    }
    dialog() {
      if (this.shadowRoot.querySelector("dialog")) return;
      const dialog = document.createElement("dialog");
      dialog.innerHTML = `<form><label for="pin">Code des paramètres</label>
        <input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" required>
        <p role="status"></p><div class="actions"><button type="submit">Déverrouiller</button><button type="button">Annuler</button></div></form>`;
      const input = dialog.querySelector("input");
      const submit = dialog.querySelector('button[type="submit"]');
      const status = dialog.querySelector("p");
      dialog.querySelector('button[type="button"]').onclick = () => dialog.close();
      dialog.addEventListener("close", () => { input.value = ""; dialog.remove(); });
      dialog.querySelector("form").addEventListener("submit", async event => {
        event.preventDefault();
        if (submit.disabled) return;
        submit.disabled = true;
        const hass = this._hass, pin = input.value;
        input.value = "";
        try {
          const result = await command(hass,"unlock",{pin});
          if (!dialog.open || hass.user.id !== currentUser || typeof result.token !== "string") return;
          checkVersion++;
          session = {user:currentUser,token:result.token,until:Date.now()+idleMs,verified:true,hass};
          dialog.close();
          remember();
        } catch (error) {
          status.textContent = error?.code === "pin_invalid" ? "Code incorrect." :
            error?.code === "pin_rate_limited" ? "Trop d’essais. Réessaie dans une minute." :
              "Déverrouillage indisponible.";
        } finally { submit.disabled = false; }
      });
      this.shadowRoot.append(dialog);
      dialog.showModal();
      input.focus();
    }
  }
  customElements.define("kimia-settings-lock-v1-card",KimiaSettingsLockCard);
})();
