/* KIMIA — réglages Zigbee locaux, formulaire et cartes Home Assistant natifs. */
(() => {
  "use strict";
  const tag = "kimia-bulb-settings-card";
  if (customElements.get(tag)) return;
  const fullWidth = {columns:12,rows:"auto"};
  const unchanged = "__unchanged__";
  const escapeMarkdown = value => String(value).replace(/[\\`*_{}\[\]<>|#]/g,"\\$&").replace(/[\r\n]/g," ");
  const statusText = {unknown:"À vérifier après reconnexion",unsupported:"Non pris en charge",
    unreadable:"Lecture non confirmée",cached:"Dernière valeur connue"};
  const percent = value => Math.max(1,Math.round(value * 100 / 254));
  const valueText = field => {
    const value = field.value;
    if (value === null || value === undefined) return "Valeur inconnue";
    if (field.kind === "select") return field.options.find(item=>Number(item.value)===value)?.label || `Valeur ${value}`;
    if (field.kind === "level") return value === 255 ? "Dernière luminosité" : value === 0 ? "Luminosité minimale" : `${percent(value)} %`;
    if (field.kind === "white") return value === 65535 ? "Dernier blanc" : `${Math.round(1000000/value)} K`;
    return value === 65535 ? "Transition commune" : `${value/10} s`;
  };

  const makeForm = bulbs => {
    if (!bulbs.length || bulbs.some(bulb=>!bulb.available || !bulb.fresh)) return {schema:[],data:{}};
    const schema = [], data = {};
    for (const field of bulbs[0].fields) {
      const matches = bulbs.map(bulb=>bulb.fields.find(item=>item.key===field.key));
      if (matches.some(item=>!item?.editable)) continue;
      const options = [{value:unchanged,label:"Conserver le réglage enregistré"}];
      if (field.kind === "select") {
        options.push(...field.options);
        schema.push({name:field.key,label:field.label,selector:{select:{options}}});
        data[field.key] = unchanged;
        continue;
      }
      options.push({value:"custom",label:"Valeur personnalisée"});
      if (field.kind === "level") {
        options.push({value:"255",label:"Dernière luminosité"});
        if (field.key === "start_level") options.push({value:"0",label:"Luminosité minimale"});
      }
      if (field.kind === "white") options.push({value:"65535",label:"Dernier blanc"});
      if (field.kind === "seconds" && field.key !== "on_off_transition") options.push({value:"65535",label:"Utiliser la transition commune"});
      schema.push({name:field.key+"_mode",label:field.label,selector:{select:{options}}});
      data[field.key+"_mode"] = unchanged;
      let min = 1, max = 100, step = 1, unit = "%";
      let value = field.value >= 1 && field.value <= 254 ? percent(field.value) : 100;
      if (field.kind === "white") {
        const minMired = Math.max(...matches.map(item=>item.min_mired));
        const maxMired = Math.min(...matches.map(item=>item.max_mired));
        if (!(minMired > 0 && minMired <= maxMired)) { schema.pop(); continue; }
        min = Math.ceil(1000000/maxMired); max = Math.floor(1000000/minMired); unit = "K";
        value = Math.max(min,Math.min(max,Math.round(1000000/field.value)||min));
      }
      if (field.kind === "seconds") {
        min=0; max=6553.4; step=0.1; unit="s";
        value=field.value===65535?0:field.value/10;
      }
      schema.push({name:field.key,label:field.label+" — valeur",selector:{number:{min,max,step,unit_of_measurement:unit,mode:"box"}}});
      data[field.key] = value;
    }
    return {schema,data};
  };

  const requestedSettings = (bulbs, data) => {
    const settings = {};
    for (const field of bulbs[0]?.fields || []) {
      const mode = data[field.kind === "select" ? field.key : field.key+"_mode"];
      if (!mode || mode === unchanged) continue;
      let value = Number(mode);
      if (mode === "custom") {
        value = Number(data[field.key]);
        if (!Number.isFinite(value)) throw Error("Saisissez une valeur valide.");
        if (field.kind === "level") value = Math.round(value * 254 / 100);
        else if (field.kind === "white") value = Math.round(1000000 / value);
        else value = Math.round(value*10);
      }
      settings[field.key] = value;
    }
    return settings;
  };

  class KimiaBulbSettingsCard extends HTMLElement {
    setConfig() {
      if (this.shadowRoot) return;
      this.attachShadow({mode:"open"});
      this.shadowRoot.innerHTML = `<style>:host{display:block} ha-card{padding:16px}
        ha-form{display:block} .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        [hidden]{display:none!important} [role=status]{white-space:pre-line}
        dialog{background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:12px;max-width:calc(100vw - 48px)}
        </style><div id="summary"></div><ha-card id="controls" hidden>
        <ha-form id="selection"></ha-form><div class="actions">
        <ha-button id="refresh">Lire les réglages</ha-button>
        <ha-button id="identify">Identifier l’ampoule</ha-button></div>
        <div id="values"></div><ha-form id="settings"></ha-form>
        <ha-button id="apply" hidden>Appliquer les réglages</ha-button>
        <p role="status" aria-live="polite"></p></ha-card>`;
      this.bulbs = [];
      this.selected = [];
      this.find("#selection").addEventListener("value-changed",event=>{
        this.selected = event.detail.value.entities || [];
        this.formData = undefined;
        void this.render();
      });
      this.find("#settings").addEventListener("value-changed",event=>{
        this.formData = event.detail.value;
        this.updateButtons();
      });
      this.find("#refresh").addEventListener("click",()=>void this.refresh());
      this.find("#identify").addEventListener("click",()=>void this.identify());
      this.find("#apply").addEventListener("click",()=>void this.confirmApply());
    }
    find(selector) { return this.shadowRoot.querySelector(selector); }
    getGridOptions() { return fullWidth; }
    getCardSize() { return 6; }
    set hass(hass) {
      const changedUser = this._hass?.user?.id !== hass.user?.id;
      this._hass = hass;
      if (changedUser) {
        this.requestVersion=(this.requestVersion||0)+1;
        this.renderVersion=(this.renderVersion||0)+1;
        this.bulbs=[]; this.selected=[]; this.loaded=false; this.formData=undefined; this.busy=false;
        this.find("#values").replaceChildren();
        this.find("#settings").schema=[];
        this.find("#controls").hidden=true;
      }
      const disconnected=this.bulbs.filter(bulb=>this._hass.states?.[bulb.entity_id]?.state==="unavailable");
      for(const bulb of disconnected){bulb.available=false;bulb.fresh=false;bulb.identify=false;}
      if(disconnected.length&&this.selected.some(id=>disconnected.some(bulb=>bulb.entity_id===id)))void this.render();
      this.find("#selection").hass = hass;
      this.find("#settings").hass = hass;
      if (this.summaryCard) this.summaryCard.hass = hass;
      if (this.valuesCard) this.valuesCard.hass = hass;
      this.checkLock();
    }
    connectedCallback() {
      this.onLock ??= ()=>this.checkLock();
      window.addEventListener("kimia-settings-lock-changed",this.onLock);
      this.checkLock();
    }
    disconnectedCallback() {
      window.removeEventListener("kimia-settings-lock-changed",this.onLock);
      this.requestVersion = (this.requestVersion || 0)+1;
      this.busy = false;
    }
    checkLock() {
      if (!this.shadowRoot || !this._hass) return;
      if (!window.KimiaSettingsLock?.isOpen(this._hass)) {
        this.requestVersion = (this.requestVersion || 0)+1;
        this.renderVersion = (this.renderVersion || 0)+1;
        this.bulbs=[]; this.selected=[]; this.loaded=false; this.formData=undefined;
        this.find("#controls").hidden=true;
        this.find("#values").replaceChildren();
        this.find("#settings").schema=[];
        this.find("#summary").replaceChildren();
        this.shadowRoot.querySelector("dialog")?.close();
        return;
      }
      if (!this.loaded && !this.busy && this.isConnected) void this.load();
      this.updateButtons();
    }
    async command(action, values={}) {
      const token = window.KimiaSettingsLock?.token(this._hass);
      if (!token) throw Error("Paramètres verrouillés.");
      return this._hass.callWS({type:"kimia_settings/bulbs",action,token,...values});
    }
    async nativeCard(container, config, version) {
      const helpers = await window.loadCardHelpers();
      if (version!==this.renderVersion || !window.KimiaSettingsLock?.isOpen(this._hass)) return;
      const card = helpers.createCardElement({...config,grid_options:fullWidth});
      card.hass=this._hass;
      this.find(container).replaceChildren(card);
      return card;
    }
    async perform(action) {
      if (this.busy) return;
      const version = this.requestVersion = (this.requestVersion || 0)+1;
      const user = this._hass?.user?.id;
      this.busy=true; this.updateButtons();
      this.find("[role=status]").textContent="Communication avec Home Assistant…";
      try {
        const result = await action();
        if (version !== this.requestVersion || user !== this._hass?.user?.id || !window.KimiaSettingsLock?.isOpen(this._hass)) return;
        return result;
      } catch (error) {
        if (version === this.requestVersion) this.find("[role=status]").textContent =
          error?.code === "unknown_command" ? "Le module serveur des ampoules doit être chargé. Contactez votre installateur KIMIA." :
            error?.message || "La communication a échoué. Aucun résultat confirmé.";
      } finally {
        if(version===this.requestVersion){this.busy=false;this.updateButtons();}
      }
    }
    async load() {
      this.find("#controls").hidden=false;
      const result = await this.perform(()=>this.command("list"));
      if (!result) return;
      this.loaded=true; this.bulbs=result.bulbs;
      this.find("[role=status]").textContent="";
      await this.render();
    }
    async render() {
      if (!window.KimiaSettingsLock?.isOpen(this._hass)) return;
      const version=this.renderVersion=(this.renderVersion||0)+1;
      this.summaryCard = await this.nativeCard("#summary",{type:"markdown",title:"Réglages des ampoules",content:
        "Ces réglages sont enregistrés dans l’ampoule. Après confirmation, le comportement au retour du courant fonctionne aussi sans Home Assistant ni Internet.\n\n"+
        "Rebranchez les ampoules puis utilisez **Lire les réglages**. Les valeurs en mémoire peuvent être anciennes."},version);
      if(version!==this.renderVersion)return;
      if(!customElements.get("ha-form")){
        const helpers=await window.loadCardHelpers();
        helpers.createCardElement({type:"tile",entity:"sun.sun"});
        const Tile=await customElements.whenDefined("hui-tile-card");
        await Tile.getConfigElement();
      }
      if(version!==this.renderVersion)return;
      const selection=this.find("#selection");
      selection.computeLabel=schema=>schema.label;
      selection.schema=[{name:"entities",label:"Ampoules à régler",selector:{select:{multiple:true,options:this.bulbs.map(bulb=>({
        value:bulb.entity_id,label:`${bulb.name} · ${bulb.area} · ${bulb.model}${bulb.available?"":" · Déconnectée"}`
      }))}}}];
      selection.data={entities:this.selected};
      selection.disabled=this.busy;
      const chosen=this.bulbs.filter(bulb=>this.selected.includes(bulb.entity_id));
      let content=this.bulbs.length ? "Sélectionnez une ou plusieurs ampoules." : "Aucune ampoule ZHA accessible n’est enregistrée.";
      if (chosen.length) content=chosen.map(bulb=>{
        const signal=[Number.isFinite(bulb.lqi)?`LQI ${bulb.lqi}/255`:null,Number.isFinite(bulb.rssi)?`RSSI ${bulb.rssi} dBm`:null].filter(Boolean).join(" · ");
        const lines=bulb.fields.map(field=>`- ${field.label} — ${valueText(field)}${field.status==="confirmed"?" · Relue sur l’ampoule":" · "+statusText[field.status]}`);
        return `**${escapeMarkdown(bulb.name)}** · ${escapeMarkdown(bulb.area)} · ${escapeMarkdown(bulb.model)}\n\n`+
          (bulb.available?"Connectée":"**Déconnectée — rebranchez-la pour lire et modifier ses réglages.**")+
          (signal?` · ${signal} (dernière mesure)` : "")+"\n\n"+lines.join("\n");
      }).join("\n\n---\n\n");
      content+="\n\nLa couleur par défaut à l’allumage et la mémorisation RGB ne disposent pas d’un réglage Zigbee standard commun à ces ampoules. Les commandes de couleur restent gérées par Home Assistant. Les transitions enregistrées peuvent être remplacées par celles indiquées dans une commande ou une scène.";
      this.valuesCard=await this.nativeCard("#values",{type:"markdown",content},version);
      if(version!==this.renderVersion)return;
      const form=makeForm(chosen);
      const editor=this.find("#settings");
      editor.computeLabel=schema=>schema.label;
      editor.schema=form.schema;
      this.formData ??= form.data;
      editor.data=this.formData;
      editor.hass=this._hass;
      editor.disabled=this.busy;
      this.find("#apply").hidden=!form.schema.length;
      this.updateButtons();
    }
    updateButtons() {
      if (!this.shadowRoot) return;
      const chosen=this.bulbs?.filter(bulb=>this.selected.includes(bulb.entity_id)) || [];
      const open=window.KimiaSettingsLock?.isOpen(this._hass);
      this.find("#selection").disabled=this.busy || !open;
      this.find("#settings").disabled=this.busy || !open;
      this.find("#refresh").disabled=this.busy || !open || !chosen.length;
      this.find("#identify").disabled=this.busy || !open || chosen.length!==1 || !chosen[0].available || !chosen[0].identify;
      let changes={};
      try{changes=requestedSettings(chosen,this.formData||{});}catch(_){ /* Incomplete input stays disabled. */ }
      this.find("#apply").disabled=this.busy || !open || !Object.keys(changes).length || chosen.some(bulb=>!bulb.available || !bulb.fresh);
    }
    async refresh() {
      if (!this.selected.length) return;
      const entities=[...this.selected];
      const result=await this.perform(async()=>{
        const inventory=await this.command("list");
        const allowed=new Set(inventory.bulbs.map(bulb=>bulb.entity_id));
        const valid=entities.filter(id=>allowed.has(id));
        const fresh=valid.length ? await this.command("read",{entities:valid}) : {bulbs:[]};
        return {inventory,fresh,valid};
      });
      if (!result) return;
      this.selected=result.valid;
      this.bulbs=result.inventory.bulbs.map(bulb=>result.fresh.bulbs.find(item=>item.entity_id===bulb.entity_id)||bulb);
      this.formData=undefined;
      this.find("[role=status]").textContent=this.bulbs.some(bulb=>this.selected.includes(bulb.entity_id)&&!bulb.available) ?
        "Une ampoule est déconnectée. Aucun réglage n’a été modifié." : "Lecture terminée. Seules les valeurs confirmées peuvent être modifiées.";
      await this.render();
    }
    async identify() {
      const result=await this.perform(()=>this.command("identify",{entities:[...this.selected]}));
      if (result) this.find("[role=status]").textContent=result.message;
    }
    async confirmApply() {
      if (this.find("#apply").disabled || this.shadowRoot.querySelector("dialog")) return;
      const dialog=document.createElement("dialog");
      const message=document.createElement("p");
      message.textContent=`Enregistrer les réglages choisis dans ${this.selected.length} ampoule(s) ?`;
      const confirm=document.createElement("ha-button"), cancel=document.createElement("ha-button");
      confirm.textContent="Appliquer"; cancel.textContent="Annuler";
      confirm.addEventListener("click",()=>{dialog.close();void this.apply();});
      cancel.addEventListener("click",()=>dialog.close());
      dialog.addEventListener("close",()=>dialog.remove());
      dialog.append(message,confirm,cancel);this.shadowRoot.append(dialog);dialog.showModal();
    }
    async apply() {
      const settings=requestedSettings(this.bulbs.filter(bulb=>this.selected.includes(bulb.entity_id)),this.formData||{});
      const result=await this.perform(()=>this.command("apply",{entities:[...this.selected],settings}));
      if (!result) return;
      this.formData=undefined;
      // Never call a completed write a success until the device has read it back.
      this.find("[role=status]").textContent=result.results.map(item=>{
        const name=this.bulbs.find(bulb=>bulb.entity_id===item.entity_id)?.name||item.entity_id;
        return `${name} — ${item.status==="confirmed"?"Réglages enregistrés et relus sur l’ampoule.":"Résultat partiel ou non confirmé. Relisez les réglages avant de réessayer."}`;
      }).join("\n");
      this.bulbs=this.bulbs.map(bulb=>this.selected.includes(bulb.entity_id)?{...bulb,fresh:false}:bulb);
      await this.render();
    }
  }
  customElements.define(tag,KimiaBulbSettingsCard);
})();
