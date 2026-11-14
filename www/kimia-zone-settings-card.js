/* KIMIA : création d’une zone à partir du sélecteur de carte Home Assistant. */
(() => {
  const tag = "kimia-zone-settings-card";
  if (customElements.get(tag)) return;

  class KimiaZoneSettingsCard extends HTMLElement {
    setConfig() {
      if (this.shadowRoot) return;
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML = `<style>
        :host{display:block} ha-card{padding:16px} h3{margin:0 0 10px;font-size:1.1rem}
        ul{margin:0 0 14px;padding-left:20px} li{padding:3px 0}
        form,.actions{margin-top:14px} .actions{display:flex;gap:8px;flex-wrap:wrap}
        ha-selector,label{display:block} label{margin-bottom:8px}
        input{display:block;box-sizing:border-box;width:100%;margin:6px 0 12px;padding:10px;
          font:inherit;color:inherit;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px}
        [hidden]{display:none!important}
        [role=status]{color:var(--secondary-text-color);margin:10px 0 0}
        [role=status]:empty{display:none}
      </style>
      <ha-card>
        <h3>Zones existantes</h3>
        <ul aria-label="Zones existantes"></ul>
        <ha-button id="add">Créer une zone</ha-button>
        <form hidden>
          <label>Nom de la zone<input type="text" required maxlength="70"></label>
          <div id="fields"></div>
          <div class="actions">
            <ha-button id="save">Enregistrer la zone</ha-button>
            <ha-button id="cancel">Annuler</ha-button>
          </div>
        </form>
        <p role="status"></p>
      </ha-card>`;
      const find = selector => this.shadowRoot.querySelector(selector);
      this.list = find("ul");
      this.form = find("form");
      this.nameInput = find("input");
      this.fields = find("#fields");
      this.add = find("#add");
      this.save = find("#save");
      this.cancel = find("#cancel");
      this.status = find("[role=status]");
      this.add.addEventListener("click", () => void this.openForm());
      this.cancel.addEventListener("click", () => this.closeForm());
      this.save.addEventListener("click", () => void this.createZone());
      this.form.addEventListener("submit", event => {
        event.preventDefault();
        void this.createZone();
      });
    }

    set hass(hass) {
      this._hass = hass;
      if (this.editor) this.editor.hass = hass;
      const names = Object.entries(hass.states || {}).filter(([id]) => id.startsWith("zone."))
        .map(([id, state]) => state.attributes.friendly_name || id).sort((a, b) => a.localeCompare(b, "fr"));
      const key = JSON.stringify(names);
      if (key === this.zoneNames || !this.list) return;
      this.zoneNames = key;
      this.list.replaceChildren(...(names.length ? names : ["Aucune zone configurée."]).map(name => {
        const item = document.createElement("li");
        item.textContent = name;
        return item;
      }));
    }

    async openForm() {
      if (this.loading || !this.form.hidden) return;
      this.loading = true;
      this.add.disabled = true;
      this.status.textContent = "Chargement de la carte…";
      try {
        if (!customElements.get("ha-selector")) {
          const helpers = await window.loadCardHelpers();
          helpers.createCardElement({type: "entities", entities: []});
          const card = await customElements.whenDefined("hui-entities-card");
          await card.getConfigElement();
        }
        if (!this.isConnected) return;
        const editor = document.createElement("ha-selector");
        editor.hass = this._hass;
        const {latitude, longitude} = this._hass.config;
        this.location = {latitude, longitude, radius: 100};
        editor.selector = {location: {radius: true}};
        editor.label = "Position et rayon";
        editor.value = this.location;
        editor.addEventListener("value-changed", event => {
          this.location = event.detail.value;
          editor.value = this.location;
        });
        this.editor = editor;
        this.fields.replaceChildren(editor);
        this.status.textContent = "";
        this.form.hidden = false;
        this.add.hidden = true;
        this.nameInput.focus();
      } catch (_) {
        this.status.textContent = "Le sélecteur de carte est indisponible. Réessaie après avoir actualisé la page.";
      } finally {
        this.loading = false;
        this.add.disabled = false;
      }
    }

    closeForm() {
      this.form.hidden = true;
      this.add.hidden = false;
      this.nameInput.value = "";
      this.editor = undefined;
      this.fields.replaceChildren();
      this.status.textContent = "";
    }

    async createZone() {
      if (this.saving || this.form.hidden || !this.editor) return;
      const token = window.KimiaSettingsLock?.token(this._hass);
      if (!token) return;
      const name = this.nameInput.value.trim();
      const {latitude, longitude, radius} = this.location || {};
      if (!name?.trim() || ![latitude, longitude, radius].every(Number.isFinite)) {
        this.status.textContent = "Indique un nom, une position et un rayon.";
        return;
      }
      this.saving = true;
      this.save.disabled = this.cancel.disabled = true;
      try {
        await this._hass.callWS({type: "kimia_settings/zone/create", token,
          name, latitude, longitude, radius});
        this.closeForm();
        this.status.textContent = "Zone créée.";
      } catch (error) {
        this.status.textContent = error?.message || "La zone n’a pas été créée.";
      } finally {
        this.saving = false;
        this.save.disabled = this.cancel.disabled = false;
      }
    }
  }

  customElements.define(tag, KimiaZoneSettingsCard);
})();
