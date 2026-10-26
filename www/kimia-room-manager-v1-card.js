/* KIMIA Smart — Gestion simple des pièces, v0.3.
 * Une pièce = un nom. Zones HA réelles, sans étage ni icône obligatoires.
 * Les appareils déjà installés peuvent être affectés à une pièce.
 */
(() => {
  "use strict";
  const TAG = "kimia-room-manager-v1-card";
  if (customElements.get(TAG)) return;

  class KimiaRoomManagerCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._areas = [];
      this._devices = [];
      this._entities = [];
      this._selectedArea = null;
      this._started = false;
      this._busy = false;
      this._build();
    }
    setConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Configuration KIMIA invalide");
      this._config = config;
    }
    set hass(value) {
      this._hass = value;
      if (this.isConnected && value && !this._started) {
        this._started = true;
        void this._load();
      }
    }
    connectedCallback() {
      if (!this._started && this._hass) {
        this._started = true;
        void this._load();
      }
    }
    getCardSize() { return 6; }
    _el(id) { return this.shadowRoot.getElementById(id); }

    _build() {
      const style = document.createElement("style");
      style.textContent = [
        ":host{display:block;color:var(--primary-text-color)}",
        "ha-card{display:block;padding:16px;border-radius:18px;background:var(--card-background-color);color:var(--primary-text-color)}",
        "h2{font-size:19px;margin:0 0 6px}h3{font-size:15px;margin:0 0 10px}",
        ".info{font-size:12px;color:var(--secondary-text-color);line-height:1.45}",
        ".top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}",
        ".section{padding-top:15px;border-top:1px solid var(--divider-color);margin-top:15px}",
        ".fields{display:flex;flex-wrap:wrap;align-items:end;gap:9px}",
        "label{display:flex;flex-direction:column;gap:5px;font-size:12px;flex:1 1 170px}",
        "input,select{min-width:0;width:100%;box-sizing:border-box;background:var(--secondary-background-color,transparent);border:1px solid var(--divider-color);border-radius:10px;padding:10px;color:var(--primary-text-color);font:inherit}",
        "button{background:var(--primary-color);color:var(--text-primary-color,#fff);border:0;border-radius:10px;min-height:40px;padding:8px 14px;cursor:pointer;font:inherit;font-weight:650}",
        "button.secondary{background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}",
        "button.danger{background:var(--error-color,#bd3b36);color:white}",
        ".confirm-delete{margin-top:12px;padding:12px;border:1px solid var(--error-color,#bd3b36);border-radius:12px}",
        ".confirm-delete .fields{margin-top:10px}",
        "button:disabled{opacity:.5;cursor:wait}",
        ".rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:9px;margin-top:12px}",
        ".room{border:1px solid var(--divider-color);border-radius:13px;padding:12px;text-align:left}",
        ".room.selected{outline:2px solid var(--primary-color)}",
        ".title{font-weight:700;margin-bottom:4px}",
        ".count{font-size:12px;color:var(--secondary-text-color)}",
        ".attached{margin-top:10px;display:grid;gap:8px}",
        ".attached-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border:1px solid var(--divider-color);border-radius:12px}",
        ".attached-name{font-weight:650;font-size:13px}",
        ".attached-row .secondary{flex-shrink:0;font-size:12px}",
        "@media(max-width:440px){.attached-row{align-items:flex-start;flex-direction:column}.attached-row .secondary{width:100%}}",
        "#message{font-size:12px;margin-top:10px;min-height:16px}",
        "#message.error{color:var(--error-color,#d33)}",
        "[hidden]{display:none!important}",
        "@media(max-width:480px){ha-card{padding:13px}.fields>*{flex:1 1 100%}}"
      ].join("\n");
      const card = document.createElement("ha-card");
      card.innerHTML = [
        '<div class="top"><div><h2>Mes pièces</h2><div class="info">',
        'Créez une pièce avec son nom, puis associez ses appareils.</div></div>',
        '<button id="refresh" type="button" class="secondary">Actualiser</button></div>',
        '<div id="message" aria-live="polite"></div>',
        '<form id="create" class="section fields">',
        '<label>Nom de la pièce<input id="name" placeholder="Salon, Cuisine, Chambre…" maxlength="64" required></label>',
        '<button id="create-button" type="submit">Ajouter la pièce</button></form>',
        '<section class="section"><h3>Pièces existantes</h3><div id="rooms" class="rooms"></div></section>',
        '<section class="section" id="manage" hidden>',
        '<h3>Modifier une pièce</h3><form id="rename" class="fields">',
        '<label>Nouveau nom<input id="edit-name" maxlength="64" required></label>',
        '<button id="rename-button" type="submit">Enregistrer</button></form>',
        '<h3 style="margin-top:15px">Appareils de cette pièce</h3>',
        '<p class="info">Retirer un appareil de la pièce ne le désinstalle pas. Vous pourrez ensuite le placer dans une autre pièce.</p>',
        '<div id="linked-devices" class="attached"></div>',
        '<h3 style="margin-top:20px">Ajouter ou déplacer un appareil</h3>',
        '<form id="assign" class="fields">',
        '<label>Appareil installé<select id="device"></select></label>',
        '<button id="assign-button" type="submit">Associer à cette pièce</button></form>',
        '<p class="info">Pour une nouvelle prise ou ampoule Zigbee,',
        ' ouvrez l’onglet Zigbee afin de l’appairer avec ZHA.</p>',
        '<div style="margin-top:16px"><button type="button" class="danger" id="open-delete">Supprimer cette pièce</button></div>',
        '<div id="delete-panel" class="confirm-delete" hidden>',
        '<strong>Suppression définitive de la pièce</strong>',
        '<p class="info" id="delete-explanation"></p>',
        '<label>Pour confirmer, recopiez exactement le nom de la pièce',
        '<input id="delete-typed" autocomplete="off" maxlength="64"></label>',
        '<div class="fields"><button type="button" id="delete-confirm" class="danger">Confirmer la suppression</button>',
        '<button type="button" id="delete-cancel" class="secondary">Annuler</button></div>',
        '</div></section>',
        '<p id="status" class="info"></p>'
      ].join("");
      this.shadowRoot.append(style, card);
      this._el("refresh").addEventListener("click", () => void this._load());
      this._el("create").addEventListener("submit", e => void this._create(e));
      this._el("rename").addEventListener("submit", e => void this._rename(e));
      this._el("assign").addEventListener("submit", e => void this._assign(e));
      this._el("open-delete").addEventListener("click", () => this._openDelete());
      this._el("delete-cancel").addEventListener("click", () => this._closeDelete());
      this._el("delete-confirm").addEventListener("click", () => void this._deleteArea());
    }
    _option(select, value, label) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }
    _message(text, error=false) {
      const el=this._el("message");
      el.textContent=text;
      el.className=error?"error":"";
    }
    _lock(busy) {
      this._busy=busy;
      for(const id of ["refresh","create-button","rename-button","assign-button","open-delete","delete-confirm","delete-cancel"]) {
        this._el(id).disabled=busy;
      }
      for (const button of this.shadowRoot.querySelectorAll(".attached-remove")) {
        button.disabled = busy;
      }
      if(!busy && this._selectedArea) {
        const count=this._occupancy(this._selectedArea);
        this._el("open-delete").disabled=count.devices>0||count.entities>0;
      }
    }
    _error(error) {
      this._message("Erreur : "+(error?.message||error?.code||String(error)),true);
    }
    async _load() {
      if (!this._hass || this._busy) return;
      this._lock(true);
      this._el("status").textContent="Chargement…";
      try {
        const [areas,devices,entities]=await Promise.all([
          this._hass.callWS({type:"config/area_registry/list"}),
          this._hass.callWS({type:"config/device_registry/list"}),
          this._hass.callWS({type:"config/entity_registry/list"})
        ]);
        this._areas=areas;
        this._devices=devices;
        this._entities=entities;
        if(this._selectedArea&&!areas.some(a=>a.area_id===this._selectedArea)) this._selectedArea=null;
        this._render();
        this._el("status").textContent=areas.length+" pièce(s) enregistrée(s)";
      } catch(error) {
        this._error(error);
        this._el("status").textContent="L'accès à la configuration nécessite un compte Home Assistant administrateur.";
      } finally {
        this._lock(false);
      }
    }
    _render() {
      const rooms=this._el("rooms");
      rooms.replaceChildren();
      if(!this._areas.length) {
        const p=document.createElement("p");
        p.className="info";
        p.textContent="Aucune pièce. Ajoutez la première ci-dessus.";
        rooms.appendChild(p);
      }
      const names=new Map(this._areas.map(a=>[a.area_id,a.name]));
      for(const area of [...this._areas].sort((a,b)=>a.name.localeCompare(b.name,"fr"))) {
        const count=this._devices.filter(d=>d.area_id===area.area_id).length;
        const btn=document.createElement("button");
        btn.type="button";
        btn.className="room secondary"+(this._selectedArea===area.area_id?" selected":"");
        const title=document.createElement("div");
        title.className="title";
        title.textContent=area.name;
        const summary=document.createElement("div");
        summary.className="count";
        summary.textContent=count+" appareil(s) · Modifier";
        btn.append(title,summary);
        btn.addEventListener("click",()=>{
          if(this._selectedArea!==area.area_id)this._closeDelete();
          this._selectedArea=area.area_id;
          this._render();
        });
        rooms.appendChild(btn);
      }
      const current=this._areas.find(a=>a.area_id===this._selectedArea);
      this._el("manage").hidden=!current;
      if(!current){this._closeDelete();return;}
      this._el("edit-name").value=current.name;
      const occupied=this._occupancy(current.area_id);
      this._el("open-delete").disabled=this._busy||occupied.devices>0||occupied.entities>0;
      this._el("open-delete").textContent=occupied.devices+occupied.entities>0
        ?"Suppression impossible · pièce non vide":"Supprimer cette pièce";
      const linked=this._el("linked-devices");
      linked.replaceChildren();
      const assigned=[...this._devices]
        .filter(device=>device.area_id===current.area_id)
        .sort((a,b)=>String(a.name_by_user||a.name||a.model||a.id)
          .localeCompare(String(b.name_by_user||b.name||b.model||b.id),"fr"));
      if(!assigned.length) {
        const empty=document.createElement("p");
        empty.className="info";
        empty.textContent="Aucun appareil associé directement à cette pièce.";
        linked.append(empty);
      }
      for(const device of assigned) {
        const line=document.createElement("div");line.className="attached-row";
        const name=document.createElement("span");name.className="attached-name";
        name.textContent=device.name_by_user||device.name||device.model||"Appareil sans nom";
        const remove=document.createElement("button");
        remove.type="button";
        remove.className="secondary attached-remove";
        remove.textContent="Retirer de la pièce";
        remove.disabled=this._busy;
        remove.addEventListener("click",()=>void this._unassign(device.id,current.area_id));
        line.append(name,remove);linked.appendChild(line);
      }
      const select=this._el("device");
      const selected=select.value;
      select.replaceChildren();
      this._option(select,"","Choisir un appareil");
      for(const device of [...this._devices].sort((a,b)=>
        String(a.name_by_user||a.name||a.model||a.id).localeCompare(
          String(b.name_by_user||b.name||b.model||b.id),"fr"))) {
        const name=device.name_by_user||device.name||device.model||"Sans nom";
        this._option(select,device.id,name+" · "+(names.get(device.area_id)||"Sans pièce"));
      }
      if(this._devices.some(d=>d.id===selected))select.value=selected;
    }
    async _save(data,success) {
      if(this._busy)return false;
      this._lock(true);
      try {
        await this._hass.callWS(data);
        this._message(success);
        return true;
      } catch(error) {
        this._error(error);
        return false;
      } finally {
        this._lock(false);
      }
    }
    async _create(event) {
      event.preventDefault();
      const name=this._el("name").value.trim();
      if(!name||this._busy)return;
      if(this._areas.some(a=>a.name.toLocaleLowerCase("fr")===name.toLocaleLowerCase("fr"))) {
        this._message("Cette pièce existe déjà.",true);
        return;
      }
      this._lock(true);
      try {
        const area=await this._hass.callWS({type:"config/area_registry/create",name});
        this._selectedArea=area.area_id;
        this._el("name").value="";
        this._message("Pièce créée : "+name);
      } catch(error) {
        this._error(error);
      } finally {
        this._lock(false);
      }
      await this._load();
      if (this._selectedArea && window.KimiaSmartCore) {
        try { await window.KimiaSmartCore.sync(this._hass); }
        catch(error) { this._message("Pièce enregistrée. Affichage : "+(error?.message||error),true); }
      }
    }
    async _rename(event) {
      event.preventDefault();
      if(!this._selectedArea||this._busy)return;
      const name=this._el("edit-name").value.trim();
      if(!name)return;
      const current=this._areas.find(a=>a.area_id===this._selectedArea);
      if(current?.name===name)return;
      const ok=await this._save({type:"config/area_registry/update",area_id:this._selectedArea,name},
        "Pièce renommée : "+name);
      if(ok)await this._load();
    }
    _occupancy(areaId,devices=this._devices,entities=this._entities) {
      return {
        devices:devices.filter(d=>d.area_id===areaId).length,
        entities:entities.filter(e=>e.area_id===areaId).length
      };
    }
    _closeDelete() {
      this._el("delete-panel").hidden=true;
      this._el("delete-typed").value="";
    }
    _openDelete() {
      if(this._busy)return;
      const area=this._areas.find(a=>a.area_id===this._selectedArea);
      if(!area)return;
      const n=this._occupancy(area.area_id);
      if(n.devices||n.entities) {
        this._message("Déplacez d’abord les appareils et entités de cette pièce avant de la supprimer.",true);
        return;
      }
      this._el("delete-typed").value="";
      this._el("delete-explanation").textContent=
        "Vous allez supprimer la pièce « "+area.name+" » dans Home Assistant. "+
        "Cela peut affecter les automatisations utilisant cette pièce. "+
        "Les appareils et entités doivent être déplacés avant suppression.";
      this._el("delete-panel").hidden=false;
    }
    async _deleteArea() {
      if(this._busy||this._el("delete-panel").hidden)return;
      const area=this._areas.find(a=>a.area_id===this._selectedArea);
      if(!area)return;
      if(this._el("delete-typed").value.trim()!==area.name) {
        this._message("Recopiez exactement « "+area.name+" » pour confirmer.",true);
        return;
      }
      this._lock(true);
      try {
        // Nouvelle vérification juste avant la suppression : éviter les états périmés.
        const [devices,entities]=await Promise.all([
          this._hass.callWS({type:"config/device_registry/list"}),
          this._hass.callWS({type:"config/entity_registry/list"})
        ]);
        const count=this._occupancy(area.area_id,devices,entities);
        if(count.devices||count.entities) {
          throw new Error("Cette pièce possède encore "+count.devices+
            " appareil(s) et "+count.entities+" entité(s). Déplacez-les avant suppression.");
        }
        await this._hass.callWS({type:"config/area_registry/delete",area_id:area.area_id});
        this._selectedArea=null;
        this._closeDelete();
        this._message("Pièce supprimée : "+area.name);
      } catch(error) {
        this._error(error);
      } finally {
        this._lock(false);
      }
      await this._load();
    }
    async _unassign(deviceId,areaId) {
      if(this._busy)return;
      const area=this._areas.find(a=>a.area_id===areaId);
      const device=this._devices.find(d=>d.id===deviceId);
      if(!area||!device||device.area_id!==areaId) {
        this._message("L'appareil n'est plus associé à cette pièce. Actualisez la liste.",true);
        return;
      }
      const name=device.name_by_user||device.name||device.model||"Cet appareil";
      if(!window.confirm(
        "Retirer « "+name+" » de « "+area.name+" » ?\n"+
        "L'appareil restera installé et pourra être affecté à une autre pièce."
      ))return;
      this._lock(true);
      let success=false;
      try {
        // Revérifier le registre avant l'écriture : ne jamais déplacer un appareil entretemps modifié.
        const fresh=await this._hass.callWS({type:"config/device_registry/list"});
        const current=fresh.find(d=>d.id===deviceId);
        if(!current||current.area_id!==areaId) {
          throw new Error("L'affectation a changé. Actualisez la liste.");
        }
        await this._hass.callWS({
          type:"config/device_registry/update",device_id:deviceId,area_id:null
        });
        success=true;
      } catch(error) {
        this._error(error);
      } finally {
        this._lock(false);
      }
      if(!success)return;
      await this._load();
      this._message("« "+name+" » a été retiré de « "+area.name+" ». L'appareil est toujours installé.");
      if(window.KimiaSmartCore){
        try {
          await window.KimiaSmartCore.sync(this._hass);
        } catch(error){
          this._message("Affectation retirée. Mise à jour de l'affichage : "+
            (error?.message||error),true);
        }
      }
    }
    async _assign(event) {
      event.preventDefault();
      if(!this._selectedArea||this._busy)return;
      const deviceId=this._el("device").value;
      const device=this._devices.find(d=>d.id===deviceId);
      const area=this._areas.find(a=>a.area_id===this._selectedArea);
      if(!device||!area) {
        this._message("Sélectionnez un appareil.",true);
        return;
      }
      if(device.area_id&&device.area_id!==area.area_id &&
        !window.confirm("Déplacer cet appareil vers « "+area.name+" » ?"))return;
      const ok=await this._save({
        type:"config/device_registry/update",
        device_id:deviceId,area_id:area.area_id
      },"Appareil affecté à "+area.name+".");
      if (ok) {
        await this._load();
        if (window.KimiaSmartCore) {
          try { await window.KimiaSmartCore.sync(this._hass); }
          catch(error) { this._message("Affectation enregistrée. Affichage : "+(error?.message||error),true); }
        }
      }
    }
  }
  customElements.define(TAG,KimiaRoomManagerCard);
  window.customCards=window.customCards||[];
  if(!window.customCards.some(c=>c.type===TAG)) {
    window.customCards.push({
      type:TAG,name:"KIMIA · Mes pièces",
      description:"Créer des pièces et associer les appareils de Home Assistant."
    });
  }
})();