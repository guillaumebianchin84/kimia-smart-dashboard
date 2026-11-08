/* KIMIA Smart — Zigbee ZHA, v0.3.
 * Appairage via action officielle zha.permit (60 s), aperçu des appareils,
 * renommage et affectation à une vraie pièce du registre Home Assistant.
 * ZHA + coordinateur requis ; aucun appairage automatique au chargement.
 */
(() => {
  "use strict";
  const TAG="kimia-zigbee-manager-v1-card";
  // Noms strictement partagés avec le moteur KIMIA (labels natifs Home Assistant).
  const USE_LABELS={
    lampe:"KIMIA · usage · Lampe",
    surpresseur:"KIMIA · usage · Surpresseur",
    clim:"KIMIA · usage · Climatisation",
    ventilateur:"KIMIA · usage · Ventilateur"
  };
  if(customElements.get(TAG))return;

  class KimiaZigbeeManagerCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:"open"});
      this._started=false;
      this._busy=false;
      this._zhaAvailable=false;
      this._devices=[];
      this._areas=[];
      this._zigbee=[];
      this._entities=[];
      this._labels=[];
      this._selectedId="";
      this._beforeScan=new Set();
      this._newIds=new Set();
      this._endTime=0;
      this._clock=null;
      this._build();
    }
    setConfig(config) {
      if(!config||typeof config!=="object")throw new Error("Configuration Zigbee KIMIA invalide");
      this._config=config;
    }
    set hass(value) {
      this._hass=value;
      if(this.isConnected&&value&&!this._started) {
        this._started=true;
        void this._refresh();
      }
    }
    connectedCallback() {
      if(this._hass&&!this._started) {
        this._started=true;
        void this._refresh();
      }
    }
    disconnectedCallback() { this._stopClock(); }
    getCardSize() { return 8; }
    _el(id) { return this.shadowRoot.getElementById(id); }

    _build() {
      const style=document.createElement("style");
      style.textContent=[
        ":host{display:block;color:var(--primary-text-color)}",
        "ha-card{display:block;background:var(--card-background-color);color:var(--primary-text-color);padding:16px;border-radius:18px}",
        "h2{font-size:19px;margin:0 0 6px}h3{font-size:15px;margin:0 0 9px}",
        ".hint{font-size:12px;color:var(--secondary-text-color);line-height:1.5}",
        ".top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}",
        ".section{border-top:1px solid var(--divider-color);margin-top:15px;padding-top:15px}",
        ".fields{display:flex;align-items:end;flex-wrap:wrap;gap:9px}",
        "label{display:flex;flex-direction:column;gap:5px;flex:1 1 170px;font-size:12px}",
        "input,select{background:var(--secondary-background-color,transparent);border:1px solid var(--divider-color);border-radius:10px;padding:10px;box-sizing:border-box;width:100%;min-width:0;color:var(--primary-text-color);font:inherit}",
        "button{background:var(--primary-color);color:var(--text-primary-color,#fff);border:0;border-radius:10px;min-height:41px;padding:9px 14px;cursor:pointer;font:inherit;font-weight:650}",
        "button.secondary{background:var(--secondary-background-color);border:1px solid var(--divider-color);color:var(--primary-text-color)}",
        "button:disabled{opacity:.5;cursor:not-allowed}",
        ".status{font-size:13px;margin-top:12px;font-weight:650}",
        ".warning{color:var(--error-color,#c43)}",
        ".ok{color:var(--success-color,#27834b)}",
        ".device{border:1px solid var(--divider-color);border-radius:12px;padding:10px;margin-top:8px}",
        ".device button{width:100%;text-align:left}",
        "button.danger{background:var(--error-color,#b33);color:#fff}",
        "#message{font-size:12px;margin:10px 0;min-height:16px}",
        "[hidden]{display:none!important}",
        "@media(max-width:480px){ha-card{padding:12px}.fields>*{flex:1 1 100%}}"
      ].join("\n");
      const card=document.createElement("ha-card");
      card.innerHTML=[
        '<div class="top"><div><h2>Ajouter un appareil Zigbee</h2>',
        '<div class="hint">SONOFF · LEDVANCE SMART+ Zigbee · Autres appareils compatibles</div></div>',
        '<button id="refresh" class="secondary" type="button">Actualiser</button></div>',
        '<p id="zha-state" class="status">Vérification de ZHA…</p>',
        '<div id="message" aria-live="polite"></div>',
        '<section class="section"><h3>1. Rechercher un appareil</h3>',
        '<p class="hint">Branchez ou alimentez la prise ou l’ampoule, puis lancez',
        ' une recherche de 60 secondes et mettez l’appareil en mode appairage',
        ' selon sa notice (bouton Reset, séquence d’allumages…).</p>',
        '<button id="permit" type="button" disabled>Lancer la recherche (60 s)</button>',
        '<p id="scan-state" class="hint">Aucune recherche en cours.</p></section>',
        '<section class="section"><h3>2. Appareils Zigbee</h3>',
        '<p class="hint">Les appareils apparaissent après association par ZHA.',
        ' Si la liste ne se met pas à jour, touchez « Actualiser ».</p>',
        '<div id="devices"></div></section>',
        '<section id="setup" class="section" hidden>',
        '<h3>3. Nommer et attribuer une pièce</h3>',
        '<p class="hint" id="chosen"></p>',
        '<form id="setup-form" class="fields">',
        '<label>Nom de l’appareil<input id="device-name" maxlength="80" required placeholder="Prise TV, Lampe salon…"></label>',
        '<label>Pièce<select id="device-area"></select></label>',
        '<label id="usage-field" hidden>Utilisation de la prise',
        '<select id="device-usage">',
        '<option value="autre">Autre appareil (Prises uniquement)</option>',
        '<option value="lampe">Lampe / éclairage (+ Lumières)</option>',
        '<option value="surpresseur">Surpresseur (+ Eau)</option>',
        '<option value="clim">Climatisation (+ Climatisation)</option>',
        '<option value="ventilateur">Ventilateur (+ Climatisation)</option>',
        '</select></label>',
        '<p id="usage-info" class="hint" hidden></p>',
        '<button type="submit" id="save">Enregistrer</button></form>',
        '<p class="hint">Vous pouvez créer les pièces dans l’onglet précédent.</p>',
        '<button id="remove-start" type="button" class="danger" hidden>Supprimer cet appareil Zigbee</button>',
        '<section id="remove-panel" hidden>',
        '<p class="hint" id="remove-warning"></p>',
        '<label>Recopiez le nom de l’appareil<input id="remove-name" maxlength="80"></label>',
        '<button id="remove-confirm" type="button" class="danger">Confirmer la suppression</button>',
        '<button id="remove-cancel" type="button" class="secondary">Annuler</button>',
        '</section></section>',
        '<div id="footer" class="hint"></div>'
      ].join("");
      this.shadowRoot.append(style,card);
      this._el("refresh").addEventListener("click",()=>void this._refresh());
      this._el("permit").addEventListener("click",()=>void this._permit());
      this._el("setup-form").addEventListener("submit",e=>void this._saveDevice(e));
      this._el("device-usage").addEventListener("change",()=>this._usageHint());
      this._el("remove-start").addEventListener("click",()=>this._prepareRemove());
      this._el("remove-cancel").addEventListener("click",()=>this._cancelRemove());
      this._el("remove-confirm").addEventListener("click",()=>void this._removeDevice());
    }
    _message(text,error=false) {
      const el=this._el("message");
      el.textContent=text;
      el.className=error?"warning":"ok";
    }
    _option(select,value,text) {
      const el=document.createElement("option");
      el.value=value;el.textContent=text;select.appendChild(el);
    }
    _lock(locked) {
      this._busy=locked;
      this._el("refresh").disabled=locked;
      this._el("save").disabled=locked;
      this._el("remove-start").disabled=locked;
      this._el("remove-confirm").disabled=locked;
      this._updateScanUI();
    }
    _error(error) {
      this._message("Erreur : "+(error?.message||error?.code||String(error)),true);
    }
    _zhaDevicesFromRegistry() {
      // Le coordinateur pilote le réseau : il n'est ni à nommer ni à affecter.
      const coordinatorIeees=new Set(this._zigbee
        .filter(node=>node.active_coordinator===true)
        .map(node=>String(node.ieee||"").toLowerCase()));
      return this._devices.filter(d=>
        Array.isArray(d.identifiers) &&
        d.identifiers.some(pair=>Array.isArray(pair)&&pair[0]==="zha") &&
        !coordinatorIeees.has(this._ieee(d)));
    }
    _isControllablePlug(deviceId) {
      return this._entities.some(e=>
        e.device_id===deviceId && e.entity_id?.startsWith("switch.") &&
        !e.disabled_by && !e.hidden_by &&
        e.entity_category!=="config" && e.entity_category!=="diagnostic" &&
        !/(?:led|voyant)\\s*(?:de\\s*)?(?:réseau|network|status)/i.test(
          [e.name,e.original_name].filter(Boolean).join(" ")));
    }
    _deviceUsage(device) {
      const ids=new Set(Array.isArray(device?.labels)?device.labels:[]);
      for(const [usage,name] of Object.entries(USE_LABELS)) {
        if(this._labels.some(label=>label.name===name&&ids.has(label.label_id)))
          return usage;
      }
      return "autre";
    }
    _usageHint() {
      const type=this._el("device-usage").value;
      const hint=this._el("usage-info");
      hint.hidden=!["clim","surpresseur"].includes(type);
      hint.textContent=type==="clim"
        ?"Attention : une prise ne commande que l'alimentation électrique, jamais la température. Une coupure secteur peut endommager une climatisation. KIMIA désactive le basculement direct de cette prise."
        :type==="surpresseur"
          ?"Vérifiez que la prise, le câblage et la protection sont adaptés au courant de démarrage du moteur. Utilisez un contacteur adapté si nécessaire."
          :"";
    }
    _sortDevices(devices) {
      return [...devices].sort((a,b)=>
        String(a.name_by_user||a.name||a.model||a.id).localeCompare(
          String(b.name_by_user||b.name||b.model||b.id),"fr"));
    }
    async _refresh() {
      if(this._busy||!this._hass)return;
      this._lock(true);
      try {
        const [devices,areas,entities,labels]=await Promise.all([
          this._hass.callWS({type:"config/device_registry/list"}),
          this._hass.callWS({type:"config/area_registry/list"}),
          this._hass.callWS({type:"config/entity_registry/list"}),
          this._hass.callWS({type:"config/label_registry/list"})
        ]);
        this._devices=devices;
        this._areas=areas;
        this._entities=entities;
        this._labels=labels;
        try {
          this._zigbee=await this._hass.callWS({type:"zha/devices"});
          this._zhaAvailable=true;
          this._el("zha-state").textContent="ZHA disponible · "+this._zigbee.length+" nœud(s) Zigbee";
          this._el("zha-state").className="status ok";
          this._el("footer").textContent="Réseau Zigbee géré localement par Home Assistant (ZHA).";
        } catch (error) {
          this._zhaAvailable=false;
          this._zigbee=[];
          this._el("zha-state").textContent="ZHA indisponible sur cette installation";
          this._el("zha-state").className="status warning";
          this._el("footer").textContent="Installez/configurez ZHA avec le coordinateur SMLIGHT SLZB-06U, puis actualisez. Un compte administrateur est requis.";
        }
        const currentIds=new Set(this._zhaDevicesFromRegistry().map(d=>d.id));
        if(this._endTime&&Date.now()<this._endTime+15000) {
          for(const id of currentIds)if(!this._beforeScan.has(id))this._newIds.add(id);
        }
        this._renderDevices();
      } catch(error) {
        this._error(error);
        this._el("zha-state").textContent="Impossible de consulter les appareils. Compte administrateur requis.";
        this._el("zha-state").className="status warning";
      } finally {
        this._lock(false);
      }
    }
    _renderDevices() {
      const div=this._el("devices");
      div.replaceChildren();
      const list=this._sortDevices(this._zhaDevicesFromRegistry());
      const scanning=Date.now()<this._endTime;
      if(!list.length) {
        const p=document.createElement("p");
        p.className="hint";
        p.textContent="Aucun appareil à configurer. Le coordinateur Zigbee n'est pas affiché.";
        div.appendChild(p);
      }
      // Les appareils déjà associés sont visibles pour les réglages, mais ne
      // sont jamais présentés comme des résultats d'une nouvelle recherche.
      const groups=[
        ["Nouveaux appareils",list.filter(d=>this._newIds.has(d.id)),true],
        ["Déjà connectés",list.filter(d=>!this._newIds.has(d.id)),false]
      ];
      for(const [heading,devices,isNew] of groups) {
        if(!devices.length)continue;
        const title=document.createElement("h3");
        title.textContent=heading;
        div.appendChild(title);
        for(const d of devices) {
          const item=document.createElement("div");
          item.className="device";
          const button=document.createElement("button");
          button.type="button";
          button.className="secondary";
          button.disabled=scanning;
          const name=d.name_by_user||d.name||d.model||"Appareil Zigbee";
          const area=this._areas.find(a=>a.area_id===d.area_id);
          button.textContent=(isNew?"NOUVEAU":"Déjà connecté")+" · "+name+
            " · "+(area?.name||"Sans pièce");
          button.addEventListener("click",()=>{
            if(Date.now()<this._endTime)return;
            if(this._selectedId!==d.id)this._cancelRemove();
            this._selectedId=d.id;
            this._renderDevices();
          });
          item.appendChild(button);
          div.appendChild(item);
        }
      }
      const current=list.find(d=>d.id===this._selectedId);
      this._el("setup").hidden=scanning||!current;
      if(scanning||!current){this._cancelRemove();return;}
      const isPlug=this._isControllablePlug(current.id);
      this._el("usage-field").hidden=!isPlug;
      this._el("device-usage").value=isPlug?this._deviceUsage(current):"autre";
      this._usageHint();
      const ieee=this._ieee(current);
      const node=this._zigbee.find(n=>String(n.ieee).toLowerCase()===ieee);
      const allowed=Boolean(this._zhaAvailable&&node&&node.active_coordinator===false);
      this._el("remove-start").hidden=!allowed;
      if(!allowed)this._cancelRemove();
      const name=current.name_by_user||current.name||current.model||"Appareil Zigbee";
      this._el("chosen").textContent="Appareil sélectionné : "+name;
      this._el("device-name").value=name;
      const select=this._el("device-area");
      select.replaceChildren();
      this._option(select,"","Sans pièce");
      for(const area of [...this._areas].sort((a,b)=>a.name.localeCompare(b.name,"fr"))) {
        this._option(select,area.area_id,area.name);
      }
      select.value=current.area_id||"";
    }
    _ieee(d) {
      const x=(d?.identifiers||[]).filter(p=>Array.isArray(p)&&p[0]==="zha").map(p=>p[1]);
      return x.length===1 && typeof x[0]==="string" &&
        /^(?:[0-9a-f]{2}:){7}[0-9a-f]{2}$/i.test(x[0]) ? x[0].toLowerCase():"";
    }
    _cancelRemove() {
      this._el("remove-panel").hidden=true;
      this._el("remove-name").value="";
    }
    _prepareRemove() {
      if(this._busy || Date.now()<this._endTime)return;
      const d=this._devices.find(x=>x.id===this._selectedId);
      if(!d)return;
      const ieee=this._ieee(d);
      const node=this._zigbee.find(n=>String(n.ieee).toLowerCase()===ieee);
      if(!ieee||!node||node.active_coordinator!==false)return;
      const name=d.name_by_user||d.name||d.model||"Appareil Zigbee";
      this._el("remove-warning").textContent=
        "Supprimer « "+name+" » (IEEE "+ieee+") du réseau Zigbee ? "+
        "L'appareil devra être réappairé pour servir à nouveau. "+
        "Ses automatisations peuvent cesser de fonctionner.";
      this._el("remove-panel").hidden=false;
    }
    async _removeDevice() {
      if(this._busy || this._el("remove-panel").hidden || Date.now()<this._endTime)return;
      const d=this._devices.find(x=>x.id===this._selectedId);
      if(!d)return;
      const name=d.name_by_user||d.name||d.model||"Appareil Zigbee";
      if(this._el("remove-name").value.trim()!==name) {
        this._message("Recopiez exactement le nom « "+name+" ».",true);
        return;
      }
      this._lock(true);
      let ok=false;
      try {
        const [registered,nodes]=await Promise.all([
          this._hass.callWS({type:"config/device_registry/list"}),
          this._hass.callWS({type:"zha/devices"})
        ]);
        const fresh=registered.find(x=>x.id===d.id);
        const ieee=fresh&&this._ieee(fresh);
        const node=nodes.find(n=>String(n.ieee).toLowerCase()===ieee);
        if(!ieee||!node||node.active_coordinator!==false)
          throw new Error("Appareil introuvable ou coordinateur protégé.");
        await this._hass.callService("zha","remove",{ieee});
        ok=true;
        this._selectedId="";
        this._cancelRemove();
        this._message("Demande de suppression envoyée à ZHA. Actualisez pour vérifier.");
      } catch(e) { this._error(e); }
      finally { this._lock(false); }
      if(ok)await this._refresh();
    }
    _stopClock() {
      if(this._clock!==null){clearInterval(this._clock);this._clock=null;}
    }
    _updateScanUI() {
      const remain=Math.max(0,Math.ceil((this._endTime-Date.now())/1000));
      const scanning=remain>0;
      this._el("permit").disabled=this._busy||!this._zhaAvailable||scanning;
      // Ne jamais pouvoir renommer, déplacer ou retirer pendant l'association.
      this._el("device-name").disabled=this._busy||scanning;
      this._el("device-area").disabled=this._busy||scanning;
      this._el("device-usage").disabled=this._busy||scanning;
      this._el("save").disabled=this._busy||scanning;
      this._el("remove-start").disabled=this._busy||scanning;
      this._el("remove-confirm").disabled=this._busy||scanning;
      this._el("scan-state").textContent=scanning?
        "Association ouverte : "+remain+" s restantes. "+this._newIds.size+" nouvel appareil(s) détecté(s)."
        :this._endTime?"Recherche terminée. Actualisez si nécessaire.":"Aucune recherche en cours.";
    }
    async _permit() {
      if(!this._zhaAvailable||this._busy||Date.now()<this._endTime)return;
      this._beforeScan=new Set(this._zhaDevicesFromRegistry().map(d=>d.id));
      this._newIds.clear();
      this._selectedId="";
      this._cancelRemove();
      this._lock(true);
      try {
        // Action officielle Home Assistant, durée bornée à 60 secondes.
        await this._hass.callService("zha","permit",{duration:60});
        this._endTime=Date.now()+60000;
        this._renderDevices();
        this._message("Recherche Zigbee démarrée. Passez maintenant l'appareil en mode appairage.");
        this._stopClock();
        this._clock=setInterval(()=>{
          this._updateScanUI();
          if(!this.isConnected){this._stopClock();return;}
          if(!this._busy)void this._refresh();
          // Une dernière actualisation à 60 s, puis plus d'actualisation
          // automatique susceptible d'écraser le nom en cours de saisie.
          if(Date.now()>=this._endTime)this._stopClock();
        },5000);
      } catch(error) {
        this._error(error);
      } finally {
        this._lock(false);
      }
    }
    async _saveDevice(event) {
      event.preventDefault();
      if(this._busy||Date.now()<this._endTime||!this._selectedId)return;
      const d=this._devices.find(x=>x.id===this._selectedId);
      if(!d)return;
      const name=this._el("device-name").value.trim();
      const area=this._el("device-area").value||null;
      if(!name)return;
      const selectedUsage=this._isControllablePlug(d.id)
        ?this._el("device-usage").value:"autre";
      if(!["autre",...Object.keys(USE_LABELS)].includes(selectedUsage))
        return this._message("Utilisation inconnue : enregistrement interrompu.",true);
      const oldArea=d.area_id||null;
      if(oldArea&&oldArea!==area) {
        const oldName=this._areas.find(a=>a.area_id===oldArea)?.name||"sa pièce actuelle";
        const newName=this._areas.find(a=>a.area_id===area)?.name||"aucune pièce";
        if(!window.confirm("Déplacer « "+name+" » de "+oldName+" vers "+newName+" ?"))return;
      }
      this._lock(true);
      try {
        // Lire les labels les plus récents pour préserver TOUTES les
        // étiquettes tierces lorsque KIMIA modifie une seule utilisation.
        const registered=await this._hass.callWS({type:"config/device_registry/list"});
        const fresh=registered.find(device=>device.id===d.id);
        if(!fresh)throw new Error("L'appareil a disparu du registre.");
        let labels=await this._hass.callWS({type:"config/label_registry/list"});
        let wanted=null;
        if(selectedUsage!=="autre") {
          const usageName=USE_LABELS[selectedUsage];
          wanted=labels.find(label=>label.name===usageName)?.label_id;
          if(!wanted) {
            // Crée le label seulement lors du premier usage de cette catégorie.
            try {
              const created=await this._hass.callWS({
                type:"config/label_registry/create",
                name:usageName,
                description:"Classement KIMIA Smart des prises connectées"
              });
              wanted=created.label_id;
            } catch(error) {
              // Un autre administrateur peut avoir créé le label en même temps.
              labels=await this._hass.callWS({type:"config/label_registry/list"});
              wanted=labels.find(label=>label.name===usageName)?.label_id;
              if(!wanted)throw error;
            }
          }
        }
        labels=await this._hass.callWS({type:"config/label_registry/list"});
        const ours=new Set(labels.filter(label=>
          Object.values(USE_LABELS).includes(label.name)).map(label=>label.label_id));
        const keep=(Array.isArray(fresh.labels)?fresh.labels:[])
          .filter(id=>!ours.has(id));
        if(wanted)keep.push(wanted);
        await this._hass.callWS({
          type:"config/device_registry/update",
          device_id:d.id,
          name_by_user:name,
          area_id:area,
          labels:[...new Set(keep)]
        });
        this._newIds.delete(d.id);
        this._message("Appareil enregistré : "+name+".");
        if (window.KimiaSmartCore) {
          try { await window.KimiaSmartCore.sync(this._hass); }
          catch(error) { this._message("Appareil enregistré. Affichage : "+(error?.message||error),true); }
        }
      } catch(error) {
        this._error(error);
      } finally {
        this._lock(false);
      }
      await this._refresh();
    }
  }
  customElements.define(TAG,KimiaZigbeeManagerCard);
  window.customCards=window.customCards||[];
  if(!window.customCards.some(c=>c.type===TAG)){
    window.customCards.push({
      type:TAG,name:"KIMIA · Ajout Zigbee",
      description:"Appairage ZHA, liste des appareils SONOFF/LEDVANCE et affectation aux pièces."
    });
  }
})();