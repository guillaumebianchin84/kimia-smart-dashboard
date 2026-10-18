/* KIMIA Smart by PROMAINT — Pièces et équipements, v0.1.
 * Appels WebSocket natifs Home Assistant ; accès administrateur requis.
 * Aucune URL serveur ni jeton codé en dur.
 */
(() => {
  "use strict";
  const TAG = "kimia-room-manager-card";
  if (customElements.get(TAG)) return;
  const ROOM_ICONS = [
    ["mdi:sofa", "Salon"], ["mdi:chef-hat", "Cuisine"],
    ["mdi:bed-king-outline", "Chambre"], ["mdi:shower", "Salle de bain"],
    ["mdi:desk", "Bureau"], ["mdi:garage", "Garage"],
    ["mdi:balcony", "Terrasse"], ["mdi:home-outline", "Autre"]
  ];

  class KimiaRoomManagerCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._areas = [];
      this._floors = [];
      this._devices = [];
      this._selectedArea = null;
      this._started = false;
      this._busy = false;
      this._renderShell();
    }

    setConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Configuration KIMIA invalide");
      this._config = config;
    }

    set hass(hass) {
      this._hass = hass;
      if (this.isConnected && !this._started && hass) {
        this._started = true;
        this._load();
      }
    }

    connectedCallback() {
      if (!this._started && this._hass) {
        this._started = true;
        this._load();
      }
    }

    getCardSize() { return 8; }
    _el(id) { return this.shadowRoot.getElementById(id); }

    _renderShell() {
      const style = document.createElement("style");
      style.textContent = [
        ":host{display:block;color:var(--primary-text-color)}",
        "ha-card{display:block;padding:18px;border-radius:18px;background:var(--card-background-color);color:var(--primary-text-color)}",
        "h2{font-size:19px;margin:0 0 5px;font-weight:750}",
        "h3{font-size:15px;margin:0 0 11px;font-weight:700}",
        ".hint{font-size:12px;color:var(--secondary-text-color);line-height:1.5}",
        ".bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}",
        ".section{padding-top:15px;border-top:1px solid var(--divider-color);margin-top:15px}",
        ".fields{display:flex;flex-wrap:wrap;align-items:end;gap:9px}",
        "label{display:flex;flex-direction:column;gap:5px;font-size:12px;flex:1 1 150px}",
        "input,select{min-width:0;width:100%;box-sizing:border-box;background:var(--secondary-background-color,transparent);border:1px solid var(--divider-color);border-radius:10px;padding:10px;color:var(--primary-text-color);font:inherit}",
        "button{background:var(--primary-color);color:var(--text-primary-color,#fff);border:0;border-radius:10px;min-height:40px;padding:8px 14px;cursor:pointer;font:inherit;font-weight:650}",
        "button.secondary{background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}",
        "button:disabled{opacity:.5;cursor:wait}",
        ".rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:9px;margin-top:12px}",
        ".room{border:1px solid var(--divider-color);border-radius:13px;padding:12px;text-align:left}",
        ".room.selected{border:2px solid var(--primary-color)}",
        ".room-title{font-weight:700;margin-bottom:4px}",
        ".count{font-size:12px;color:var(--secondary-text-color)}",
        "#message{font-size:12px;margin-top:12px;min-height:16px}",
        "#message.error{color:var(--error-color,#d33)}",
        "#message.ok{color:var(--success-color,#27834b)}",
        "[hidden]{display:none!important}",
        "@media(max-width:480px){ha-card{padding:13px}.fields>*{flex:1 1 100%}}"
      ].join("\n");
      const card = document.createElement("ha-card");
      card.innerHTML = [
        '<div class="bar"><div><h2>Pièces de la maison</h2>',
        '<div class="hint">KIMIA · Zones et appareils Home Assistant</div></div>',
        '<button id="refresh" class="secondary" type="button">Actualiser</button></div>',
        '<div id="message" aria-live="polite"></div>',
        '<section class="section"><h3>1. Créer un étage (facultatif)</h3>',
        '<form id="floor-form" class="fields">',
        '<label>Nom de l’étage<input id="floor-name" maxlength="64" placeholder="RDC, Étage 1…" required></label>',
        '<button id="floor-create" type="submit">Créer l’étage</button></form></section>',
        '<section class="section"><h3>2. Ajouter une pièce</h3>',
        '<form id="area-form" class="fields">',
        '<label>Nom de la pièce<input id="area-name" maxlength="64" placeholder="Salon, Cuisine…" required></label>',
        '<label>Étage<select id="area-floor"></select></label>',
        '<label>Type<select id="area-icon"></select></label>',
        '<button id="area-create" type="submit">Ajouter la pièce</button></form>',
        '<div id="rooms" class="rooms"></div></section>',
        '<section class="section" id="manage-section" hidden>',
        '<h3>3. Modifier la pièce et ses appareils</h3>',
        '<div class="hint" id="selected-label"></div>',
        '<form id="rename-form" class="fields">',
        '<label>Nom de la pièce<input id="edit-area-name" maxlength="64" required></label>',
        '<label>Étage<select id="edit-area-floor"></select></label>',
        '<button id="area-save" type="submit">Enregistrer la pièce</button></form>',
        '<form id="device-form" class="fields" style="margin-top:13px">',
        '<label>Appareil déjà installé<select id="device-select"></select></label>',
        '<button id="device-assign" type="submit">Associer à la pièce</button></form>',
        '<p class="hint">Les prises et lampes Zigbee doivent d’abord être appairées via ZHA.',
        ' Une carte KIMIA de pièce dynamique viendra dans une version suivante.</p>',
        '</section><div class="hint" id="status"></div>'
      ].join("");
      this.shadowRoot.append(style, card);
      for (const [icon, name] of ROOM_ICONS) {
        this._addOption(this._el("area-icon"), icon, name);
      }
      this._el("refresh").addEventListener("click", () => this._load());
      this._el("floor-form").addEventListener("submit", e => this._createFloor(e));
      this._el("area-form").addEventListener("submit", e => this._createArea(e));
      this._el("rename-form").addEventListener("submit", e => this._updateArea(e));
      this._el("device-form").addEventListener("submit", e => this._assignDevice(e));
    }

    _addOption(select, value, label) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }

    _flash(message, error = false) {
      const element = this._el("message");
      element.textContent = message;
      element.className = error ? "error" : (message ? "ok" : "");
    }

    _setBusy(busy) {
      this._busy = busy;
      for (const id of ["refresh", "floor-create", "area-create", "area-save", "device-assign"]) {
        this._el(id).disabled = busy;
      }
    }

    _error(error) {
      this._flash("Échec : " + (error?.message || error?.code || String(error)), true);
    }

    async _load() {
      if (!this._hass || this._busy) return;
      this._setBusy(true);
      this._el("status").textContent = "Chargement des pièces et appareils…";
      try {
        const [areas, floors, devices] = await Promise.all([
          this._hass.callWS({ type: "config/area_registry/list" }),
          this._hass.callWS({ type: "config/floor_registry/list" }),
          this._hass.callWS({ type: "config/device_registry/list" })
        ]);
        this._areas = areas;
        this._floors = floors;
        this._devices = devices;
        if (this._selectedArea && !areas.some(a => a.area_id === this._selectedArea)) {
          this._selectedArea = null;
        }
        this._renderData();
        this._el("status").textContent = areas.length + " pièce(s) · " + devices.length + " appareil(s)";
      } catch (error) {
        this._error(error);
        this._el("status").textContent = "Vérifiez les droits et la connexion Home Assistant.";
      } finally {
        this._setBusy(false);
      }
    }

    _renderData() {
      const floorSelector = this._el("area-floor");
      const previous = floorSelector.value;
      floorSelector.replaceChildren();
      this._addOption(floorSelector, "", "Sans étage");
      for (const floor of [...this._floors].sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
        this._addOption(floorSelector, floor.floor_id, floor.name);
      }
      if (this._floors.some(f => f.floor_id === previous)) floorSelector.value = previous;

      const rooms = this._el("rooms");
      rooms.replaceChildren();
      if (!this._areas.length) {
        const text = document.createElement("p");
        text.className = "hint";
        text.textContent = "Aucune pièce enregistrée.";
        rooms.appendChild(text);
      }

      const byArea = new Map(this._areas.map(a => [a.area_id, a.name]));
      for (const area of [...this._areas].sort((a,b) => a.name.localeCompare(b.name,"fr"))) {
        const floor = this._floors.find(f => f.floor_id === area.floor_id);
        const count = this._devices.filter(d => d.area_id === area.area_id).length;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "room secondary" + (this._selectedArea === area.area_id ? " selected" : "");
        const title = document.createElement("div");
        title.className = "room-title";
        title.textContent = area.name;
        const details = document.createElement("div");
        details.className = "count";
        details.textContent = (floor ? floor.name + " · " : "") + count + " appareil(s) · Modifier";
        button.append(title, details);
        button.addEventListener("click", () => {
          this._selectedArea = area.area_id;
          this._renderData();
        });
        rooms.appendChild(button);
      }

      const current = this._areas.find(a => a.area_id === this._selectedArea);
      this._el("manage-section").hidden = !current;
      if (!current) return;
      this._el("selected-label").textContent = "Pièce sélectionnée : " + current.name;
      this._el("edit-area-name").value = current.name;
      const editFloor = this._el("edit-area-floor");
      editFloor.replaceChildren();
      this._addOption(editFloor, "", "Sans étage");
      for (const floor of [...this._floors].sort((a,b) => a.name.localeCompare(b.name,"fr"))) {
        this._addOption(editFloor, floor.floor_id, floor.name);
      }
      editFloor.value = current.floor_id || "";

      const selector = this._el("device-select");
      const selected = selector.value;
      selector.replaceChildren();
      this._addOption(selector, "", "Choisir un appareil");
      for (const device of [...this._devices].sort((a,b) =>
        (a.name_by_user || a.name || a.model || a.id).localeCompare(
          b.name_by_user || b.name || b.model || b.id, "fr"))) {
        const name = device.name_by_user || device.name || device.model || "Appareil sans nom";
        this._addOption(selector, device.id, name + " · " + (byArea.get(device.area_id) || "Sans pièce"));
      }
      if (this._devices.some(d => d.id === selected)) selector.value = selected;
    }

    async _save(message, successMessage) {
      if (this._busy) return false;
      this._setBusy(true);
      try {
        await this._hass.callWS(message);
        this._flash(successMessage);
        return true;
      } catch (error) {
        this._error(error);
        return false;
      } finally {
        this._setBusy(false);
      }
    }

    async _createFloor(event) {
      event.preventDefault();
      const name = this._el("floor-name").value.trim();
      if (!name || this._busy) return;
      if (this._floors.some(f => f.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"))) {
        this._flash("Cet étage existe déjà.", true);
        return;
      }
      const ok = await this._save({ type: "config/floor_registry/create", name }, "Étage créé : " + name);
      if (ok) {
        this._el("floor-name").value = "";
        await this._load();
      }
    }

    async _createArea(event) {
      event.preventDefault();
      const name = this._el("area-name").value.trim();
      if (!name || this._busy) return;
      if (this._areas.some(a => a.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"))) {
        this._flash("Cette pièce existe déjà.", true);
        return;
      }
      const message = {
        type: "config/area_registry/create",
        name,
        icon: this._el("area-icon").value
      };
      const floor = this._el("area-floor").value;
      if (floor) message.floor_id = floor;
      if (this._busy) return;
      this._setBusy(true);
      try {
        const result = await this._hass.callWS(message);
        this._selectedArea = result.area_id || null;
        this._el("area-name").value = "";
        this._flash("Pièce créée : " + name);
      } catch (error) {
        this._error(error);
      } finally {
        this._setBusy(false);
      }
      await this._load();
    }

    async _updateArea(event) {
      event.preventDefault();
      if (this._busy || !this._selectedArea) return;
      const name = this._el("edit-area-name").value.trim();
      if (!name) return;
      const ok = await this._save({
        type: "config/area_registry/update",
        area_id: this._selectedArea,
        name,
        floor_id: this._el("edit-area-floor").value || null
      }, "Pièce enregistrée : " + name);
      if (ok) await this._load();
    }

    async _assignDevice(event) {
      event.preventDefault();
      if (this._busy || !this._selectedArea) return;
      const deviceId = this._el("device-select").value;
      if (!this._devices.some(d => d.id === deviceId)) {
        this._flash("Sélectionnez un appareil.", true);
        return;
      }
      const device = this._devices.find(d => d.id === deviceId);
      const area = this._areas.find(a => a.area_id === this._selectedArea);
      if (!area) return;
      if (device.area_id && device.area_id !== this._selectedArea &&
          !window.confirm("Déplacer cet appareil vers « " + area.name + " » ?")) return;
      const ok = await this._save({
        type: "config/device_registry/update",
        device_id: deviceId,
        area_id: this._selectedArea
      }, "Appareil associé à « " + area.name + " ».");
      if (ok) await this._load();
    }
  }

  customElements.define(TAG, KimiaRoomManagerCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some(card => card.type === TAG)) {
    window.customCards.push({
      type: TAG,
      name: "KIMIA · Gestion des pièces",
      description: "Pièces, étages et affectation des appareils de Home Assistant"
    });
  }
})();
