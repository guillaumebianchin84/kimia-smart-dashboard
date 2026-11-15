/* KIMIA Smart — PIN des paramètres et session locale au navigateur. */
(() => {
  "use strict";
  if (window.KimiaSettingsLock) return;
  const idleMs = 600000;
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
  const maintenanceCommand = (hass, action, values = {}) =>
    hass.callWS({type:"kimia_settings/maintenance",action,...values});
  const coreWarning = "Home Assistant sera temporairement indisponible. Cette page se reconnectera automatiquement.";
  const corePending = "Redémarrage demandé. Home Assistant va être temporairement indisponible.";
  const maintenancePanel = (status, busy, message, admin) => {
    const ready = Boolean(status && !busy && !status.retry_after);
    const fullWidth = {columns:12,rows:"auto"};
    const button = (name, icon, action, enabled, warning, mode) => ({
      type:"button", name, icon, icon_height:"26px", grid_options:{columns:12,rows:2},
      tap_action:enabled ? {action:"fire-dom-event", kimia_maintenance:action, zigbee_mode:mode,
        confirmation:{text:warning,confirm_text:"Confirmer",dismiss_text:"Annuler"}} : {action:"none"},
      hold_action:{action:"none"}, double_tap_action:{action:"none"}
    });
    const cards = [
      {type:"heading",heading:"Maintenance du système",icon:"mdi:wrench-outline",grid_options:fullWidth},
      button("Redémarrer Home Assistant","mdi:restart","restart_core",ready && status.core,coreWarning)
    ];
    if (admin) {
      const zha = status?.zigbee === "zha";
      cards.push(button(zha ? "Recharger Zigbee (ZHA)" : "Redémarrer Zigbee","mdi:zigbee","restart_zigbee",
        ready && status.zigbee, zha ? "Recharger ZHA ? Les appareils Zigbee seront brièvement indisponibles. La puce Zigbee ne redémarre pas." :
          "Redémarrer la puce Zigbee de la SLZB-06U ? Les appareils Zigbee seront brièvement indisponibles.",status?.zigbee));
    }
    const details = [message];
    if (status && !busy) {
      if (!status.core) details.push("L’action de redémarrage Home Assistant est indisponible.");
      if (admin && status.zigbee_note) details.push(status.zigbee_note);
      if (status.retry_after) details.push(`Une commande a déjà été lancée. Réessaie dans ${status.retry_after} s.`);
    }
    const content = details.filter(Boolean).join("\n\n");
    if (content) cards.push({type:"markdown",content,grid_options:fullWidth});
    return {type:"vertical-stack",cards,grid_options:fullWidth};
  };

  const monitorRestart = (hass, previous, finished) => {
    let stopped = false, checking = false;
    const stop = () => {
      stopped = true;
      clearInterval(interval);
      clearTimeout(deadline);
    };
    const check = async () => {
      if (stopped || checking || !hass.connection?.connected) return;
      checking = true;
      try {
        const result = await maintenanceCommand(hass,"instance");
        if (!stopped && result.running && result.instance && result.instance !== previous) {
          stop();
          finished(true);
        }
      } catch (_) { /* The HA connection reconnects as the server starts. */ }
      finally { checking = false; }
    };
    const interval = setInterval(check,3000);
    const deadline = setTimeout(() => { stop(); finished(false); },180000);
    return stop;
  };
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
      if (this.config?.mode === "maintenance") this.open = undefined;
      this.maintenanceConfirmed ??= event => {
        const action = event.detail;
        if (this.config?.mode !== "maintenance" || !action?.kimia_maintenance) return;
        void this.runMaintenance(action.kimia_maintenance, action.zigbee_mode);
      };
      this.addEventListener("ll-custom",this.maintenanceConfirmed);
      this.render();
    }
    disconnectedCallback() {
      window.removeEventListener(changed,this.update);
      if (this.maintenanceConfirmed) this.removeEventListener("ll-custom",this.maintenanceConfirmed);
      clearInterval(this.maintenancePoll);
    }
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
      const admin = this._hass.user?.is_admin === true;
      if (this.open === open && this.admin === admin && this.renderMode === this.config.mode) return;
      this.open = open;
      this.admin = admin;
      this.renderMode = this.config.mode;
      this.child = undefined;
      this.shadowRoot.innerHTML = `<style>
        :host{display:block} :host([hidden]){display:none}
        :host([fixed-height]){height:100%} :host([fixed-height]) #content{height:100%}
        ha-card{padding:12px} :host([fixed-height]) > ha-card{height:100%;display:flex;align-items:center;box-sizing:border-box}
        ha-button{max-width:100%} dialog{background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:12px;padding:20px;max-width:calc(100vw - 56px)}
        dialog::backdrop{background:#0008} form{display:grid;gap:12px} label,input{font:inherit} input{padding:10px;max-width:100%;box-sizing:border-box} p{margin:0} .actions{display:flex;flex-wrap:wrap;gap:8px}
      </style>`;
      if (this.config.mode === "maintenance") {
        clearInterval(this.maintenancePoll);
        this.setVisible(open);
        this.maintenanceStatus = undefined;
        if (open && this.isConnected) {
          void this.renderMaintenance();
          void this.refreshMaintenance();
          this.maintenancePoll = setInterval(() => void this.refreshMaintenance(),5000);
        }
        return;
      }
      if (this.config.mode === "content") {
        const visible = open && (!this.config.admin_only || admin) && (!this.config.non_admin_only || !admin);
        this.setVisible(visible);
        if (visible) void this.renderCard();
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
    async renderMaintenance() {
      let helpers;
      try { helpers = await window.loadCardHelpers(); }
      catch (_) { return; }
      if (!this.isConnected || this.config.mode !== "maintenance" || !isOpen(this._hass)) return;
      const config = maintenancePanel(this.maintenanceStatus, this.maintenanceRequest,
        this.maintenanceMessage, this._hass.user.is_admin === true);
      const key = JSON.stringify(config);
      if (this.child) {
        if (key !== this.maintenanceKey) this.child.setConfig(config);
      } else {
        this.child = helpers.createCardElement(config);
        this.child.addEventListener("hass-action", event => {
          const detail = event.detail;
          if (detail?.action !== "tap" || !detail.config?.tap_action?.kimia_maintenance) return;
          // HA dispatches ll-custom from the action's source after confirmation.
          // Keep that source connected when the native stack rebuilds its cards.
          event.stopPropagation();
          this.dispatchEvent(new CustomEvent("hass-action",{detail,bubbles:true,composed:true}));
        });
        this.child.layout = this._layout;
        this.child.hass = this._hass;
        this.shadowRoot.append(this.child);
      }
      this.maintenanceKey = key;
    }
    async refreshMaintenance() {
      const hass = this._hass, codeToken = token(hass);
      if (!codeToken || this.maintenanceRequest || this.maintenanceRefreshing) return;
      this.maintenanceRefreshing = true;
      try {
        const status = await maintenanceCommand(hass,"status",{token:codeToken});
        if (codeToken !== token(this._hass) || this.maintenanceRequest) return;
        this.maintenanceStatus = status;
        if (this.maintenanceStatusError) {
          this.maintenanceStatusError = false;
          this.maintenanceMessage = "";
        }
      } catch (error) {
        if (codeToken !== token(this._hass) || this.maintenanceRequest) return;
        if (error?.code === "pin_required") { forget(); return; }
        this.maintenanceStatus = undefined;
        this.maintenanceStatusError = true;
        this.maintenanceMessage = error?.code === "unauthorized" ? error.message : "Maintenance indisponible. Actualise la page.";
      } finally { this.maintenanceRefreshing = false; }
      await this.renderMaintenance();
    }
    async runMaintenance(action, mode) {
      const hass = this._hass, codeToken = token(hass), status = this.maintenanceStatus;
      if (!codeToken || !status || status.retry_after || this.maintenanceRequest) return;
      const core = action === "restart_core";
      if (core && !status.core) return;
      if (!core && (hass.user.is_admin !== true || action !== "restart_zigbee" || !mode || mode !== status.zigbee)) return;
      const request = {};
      this.maintenanceRequest = request;
      this.maintenanceMessage = core ? corePending : "Commande Zigbee en cours…";
      void this.renderMaintenance();
      const stop = core && monitorRestart(hass,status.instance,returned => {
        this.maintenanceRequest = undefined;
        this.maintenanceStatus = undefined;
        this.maintenanceMessage = returned ? "Home Assistant est de nouveau disponible." :
          "Le retour de Home Assistant n’a pas pu être confirmé. Vérifie sa connexion avant de relancer.";
        if (returned && codeToken === token(this._hass)) forget();
        else void this.refreshMaintenance();
      });
      try {
        await maintenanceCommand(hass, action, core ? {token:codeToken} : {token:codeToken,zigbee_mode:mode});
        if (core) return;
        this.maintenanceMessage = mode === "zha" ? "ZHA a été rechargé." : "Commande envoyée à la puce Zigbee de la SLZB-06U.";
      } catch (error) {
        if (this.maintenanceRequest !== request) return;
        const rejected = typeof error?.code === "string";
        if (core && !rejected) return;
        if (stop) stop();
        this.maintenanceMessage = rejected ? error.message : "La commande Zigbee n’a pas pu être confirmée.";
        if (error?.code === "pin_required" && codeToken === token(this._hass)) forget();
      }
      this.maintenanceRequest = undefined;
      this.maintenanceStatus = undefined;
      void this.renderMaintenance();
      await this.refreshMaintenance();
    }
    async renderCard() {
      const current = this._hass;
      try {
        const helpers = await window.loadCardHelpers();
        if (!this.isConnected || this.hidden || this.child || !isOpen(this._hass) || current.user.id !== this._hass.user.id) return;
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
