/* KIMIA Smart by PROMAINT — Inventaire lisible V1, en lecture seule.
 * Registres natifs HA : appareils, entités et pièces. Aucun code HA exposé à l'usager.
 * Indépendant du moteur KIMIA, aucun changement d'équipement ou de dashboard.
 */
(() => {
  "use strict";
  const TAG = "kimia-inventory-v1-card";
  if (customElements.get(TAG)) return;

  const CONTROL = new Set(["light", "switch", "cover", "climate", "fan", "media_player"]);
  const MONITOR = new Set(["sensor", "binary_sensor", "device_tracker", "alarm_control_panel"]);
  const AUTOMATIC = new Set([...CONTROL, "binary_sensor", "alarm_control_panel"]);
  const SECURITY = new Set(["door", "window", "smoke", "moisture", "motion", "occupancy"]);
  const TYPE = {
    light: "Éclairage", switch: "Prise / interrupteur", cover: "Volet / store",
    climate: "Chauffage / climatisation", fan: "Ventilateur",
    media_player: "Musique / multimédia", sensor: "Mesure",
    binary_sensor: "Détecteur", alarm_control_panel: "Alarme",
    device_tracker: "Localisation", button: "Action", update: "Mise à jour",
    number: "Réglage", select: "Sélecteur"
  };
  const INTEGRATION = {
    zha: "Zigbee (ZHA)", hue: "Philips Hue", esphome: "ESPHome",
    matter: "Matter", mqtt: "MQTT", shelly: "Shelly",
    zwave_js: "Z-Wave", homekit_controller: "HomeKit",
    cast: "Google Cast", sonos: "Sonos", mobile_app: "Application mobile",
    sun: "Soleil", upc: "UPnP", netatmo: "Netatmo",
    bluetooth: "Bluetooth", generic: "Home Assistant",
    homeassistant: "Home Assistant", tplink: "TP-Link"
  };
  const natural = (a, b) => String(a).localeCompare(String(b), "fr", { sensitivity: "base" });
  const domain = id => String(id || "").split(".")[0];
  const areaOf = (e, devices) => {
    if (e.area_id) return e.area_id;
    let d = devices.get(e.device_id), steps = 0;
    while (d && steps++ < 8) {
      if (d.area_id) return d.area_id;
      d = devices.get(d.parent_device_id);
    }
    return null;
  };
  function sourceOf(d, entities) {
    const candidates = [
      ...(Array.isArray(d.identifiers) ? d.identifiers.map(i => Array.isArray(i) ? i[0] : null) : []),
      ...entities.map(e => e.platform)
    ].filter(Boolean);
    const zha = candidates.includes("zha") || (Array.isArray(d.connections) &&
      d.connections.some(c => Array.isArray(c) && c[0] === "zigbee"));
    if (zha) return { key: "zha", label: "Zigbee (ZHA)", zigbee: true };
    const key = candidates[0] || "unknown";
    return {
      key, label: INTEGRATION[key] || String(key).replace(/_/g, " "),
      zigbee: false
    };
  }
  function build(areas, devices, entities, states) {
    const areaNames = new Map(areas.map(a => [a.area_id, a.name]));
    const deviceMap = new Map(devices.map(d => [d.id, d]));
    const deviceEntities = new Map(devices.map(d => [d.id, []]));
    const independent = [];
    for (const e of entities) {
      if (!e || typeof e.entity_id !== "string") continue;
      if (e.device_id && deviceEntities.has(e.device_id)) deviceEntities.get(e.device_id).push(e);
      else independent.push(e);
    }
    const rows = devices.map(d => {
      const e = deviceEntities.get(d.id) || [];
      const active = e.filter(x => !x.disabled_by && !x.hidden_by);
      const controls = active.filter(x => CONTROL.has(domain(x.entity_id)));
      const areaSet = new Set(e.map(x => areaOf(x, deviceMap)).filter(Boolean));
      const inherited = (() => {
        let parent = d, hops = 0;
        while (parent && hops++ < 8) {
          if (parent.area_id) return parent.area_id;
          parent = deviceMap.get(parent.parent_device_id);
        }
        return null;
      })();
      const effectiveArea = inherited || (areaSet.size === 1 ? [...areaSet][0] : null);
      const src = sourceOf(d, e);
      const possible = active.filter(x => AUTOMATIC.has(domain(x.entity_id)) &&
        (domain(x.entity_id) !== "binary_sensor" ||
         SECURITY.has(states?.[x.entity_id]?.attributes?.device_class)));
      const visible = possible.filter(x => Boolean(areaOf(x, deviceMap)));
      let reason, status;
      if (d.disabled_by || (e.length && !active.length)) {
        reason = "Appareil ou entités désactivés"; status = "disabled";
      } else if (visible.length) {
        reason = "Équipements compatibles et affectés à une pièce"; status = "ready";
      } else if (possible.length) {
        reason = "À affecter à une pièce pour apparaître dans KIMIA"; status = "unassigned";
      } else if (active.some(x => MONITOR.has(domain(x.entity_id)))) {
        reason = "Capteurs et informations : pas de bouton de commande automatique"; status = "monitor";
      } else if (d.entry_type === "service") {
        reason = "Service technique, pas un appareil à commander"; status = "service";
      } else {
        reason = "Aucune commande KIMIA compatible actuellement"; status = "other";
      }
      return {
        id: d.id,
        name: d.name_by_user || d.name || d.model || "Appareil sans nom",
        manufacturer: d.manufacturer || "",
        model: d.model || "",
        area: areaNames.get(effectiveArea) || "Sans pièce",
        areaId: effectiveArea,
        source: src.label, zigbee: src.zigbee,
        entityCount: e.length, controlCount: controls.length,
        activeCount: active.length, status, reason,
        offline: visible.length > 0 && visible.every(x => states?.[x.entity_id]?.state === "unavailable"),
        entities: e.map(x => ({
          name: states?.[x.entity_id]?.attributes?.friendly_name ||
            x.name || x.original_name || "Fonction de l'appareil",
          type: TYPE[domain(x.entity_id)] || "Autre fonction",
          state: x.disabled_by || x.hidden_by ? "Désactivé" :
            states?.[x.entity_id]?.state === "unavailable" ? "Indisponible" :
            states?.[x.entity_id]?.state === "unknown" ? "État inconnu" :
            null,
          control: CONTROL.has(domain(x.entity_id)),
          enabled: !x.disabled_by && !x.hidden_by
        })).sort((a, b) => natural(a.name, b.name))
      };
    }).sort((a, b) => natural(a.area, b.area) || natural(a.name, b.name));

    const activeIndependent = independent.filter(x => !x.disabled_by && !x.hidden_by);
    const independentControls = activeIndependent.filter(x => CONTROL.has(domain(x.entity_id)));
    return {
      rows,
      total: devices.length,
      controls: entities.filter(x => !x.disabled_by && !x.hidden_by &&
        CONTROL.has(domain(x.entity_id))).length,
      controlsOnDevices: rows.reduce((n, r) => n + r.controlCount, 0),
      independentControls: independentControls.map(e => ({
        name: states?.[e.entity_id]?.attributes?.friendly_name ||
          e.name || e.original_name || "Commande sans appareil associé",
        type: TYPE[domain(e.entity_id)] || "Commande",
        area: areaNames.get(e.area_id) || "Sans pièce"
      })).sort((a,b)=>natural(a.name,b.name)),
      zigbee: rows.filter(r => r.zigbee).length,
      unassigned: rows.filter(r => r.status === "unassigned").length
    };
  }
  // Pure function to enable regression tests without changing the actual inventory.
  window.KimiaInventoryModelV1 = Object.freeze({ build });

  class KimiaInventoryCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._busy = false;
      this._started = false;
      this._filter = "all";
      this._search = "";
      this._data = null;
      this._hass = null;

      const style = document.createElement("style");
      style.textContent = [
        ":host{display:block;color:var(--primary-text-color)}",
        "ha-card{display:block;background:var(--card-background-color);border-radius:18px;padding:16px;border:1px solid var(--divider-color)}",
        "h2{font-size:21px;line-height:1.2;margin:0 0 5px}p{margin:6px 0}",
        ".muted{color:var(--secondary-text-color);font-size:13px;line-height:1.5}",
        ".top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}",
        ".stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0}",
        ".stat{background:var(--secondary-background-color);padding:12px 8px;border-radius:13px;text-align:center}",
        ".stat b{font-size:25px;display:block}.stat span{font-size:11px;color:var(--secondary-text-color)}",
        ".tools{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}",
        "input,select{background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit;border:1px solid var(--divider-color);border-radius:10px;padding:11px;box-sizing:border-box;min-width:0}",
        "input{flex:1 1 160px}select{flex:1 1 150px}",
        "button,.link{display:inline-flex;justify-content:center;align-items:center;min-height:38px;padding:8px 13px;border-radius:10px;font:inherit;font-weight:650;cursor:pointer;text-decoration:none}",
        "button{background:var(--primary-color);color:var(--text-primary-color,#fff);border:0}",
        "button:disabled{opacity:.5;cursor:default}",
        ".item{border:1px solid var(--divider-color);border-radius:13px;margin:9px 0;overflow:hidden}",
        "summary{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px;cursor:pointer;list-style:none}",
        "summary::-webkit-details-marker{display:none}",
        ".devname{font-size:15px;font-weight:700}.desc{font-size:12px;color:var(--secondary-text-color);line-height:1.5}",
        ".chip{font-size:11px;border:1px solid var(--divider-color);border-radius:100px;padding:4px 8px;white-space:nowrap}",
        ".chip.ready{color:var(--success-color,#3b9c70)}.chip.unassigned{color:var(--warning-color,#d39c26)}",
        ".body{padding:10px 12px 14px;border-top:1px solid var(--divider-color)}",
        ".func{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--divider-color);font-size:12px}",
        ".func:last-child{border:0}.count{font-size:12px;color:var(--secondary-text-color);margin:10px 0}",
        ".status{white-space:pre-wrap;font-size:12px;color:var(--secondary-text-color)}",
        ".link{border:1px solid var(--divider-color);color:var(--primary-text-color)}",
        "@media(max-width:500px){ha-card{padding:12px}.stats{gap:5px}.stat{padding:8px 4px}.stat b{font-size:22px}.devname{font-size:13px}}"
      ].join("\n");
      const card = document.createElement("ha-card");
      const top = document.createElement("div"); top.className = "top";
      const title = document.createElement("div");
      const h = document.createElement("h2"); h.textContent = "Mes équipements";
      const sub = document.createElement("p");sub.className = "muted";
      sub.textContent = "Tout ce que KIMIA a détecté, même les appareils non Zigbee.";
      title.append(h,sub);
      this._refresh = document.createElement("button");
      this._refresh.type = "button";this._refresh.textContent = "Actualiser";
      this._refresh.addEventListener("click",() => void this._load());
      top.append(title,this._refresh);
      this._stats = document.createElement("div");this._stats.className = "stats";
      this._info = document.createElement("p");this._info.className = "muted";
      this._info.textContent = "Les commandes sont des fonctions disponibles, pas nécessairement des appareils distincts.";
      const tools = document.createElement("div");tools.className = "tools";
      this._input = document.createElement("input");this._input.type = "search";
      this._input.placeholder = "Rechercher un appareil ou une pièce";
      this._input.setAttribute("aria-label","Rechercher dans mes équipements");
      this._input.addEventListener("input",()=>{this._search=this._input.value.toLocaleLowerCase("fr").trim();this._render()});
      this._select = document.createElement("select");
      this._select.setAttribute("aria-label","Filtrer mes équipements");
      const options = [
        ["all","Tous les appareils"],["ready","Prêts pour KIMIA"],
        ["unassigned","À affecter à une pièce"],["zigbee","Zigbee"],
        ["controls","Avec des commandes"],["monitor","Capteurs / informations"]
      ];
      for(const [value,label] of options){const opt=document.createElement("option");opt.value=value;opt.textContent=label;this._select.appendChild(opt)}
      this._select.addEventListener("change",()=>{this._filter=this._select.value;this._render()});
      tools.append(this._input,this._select);
      this._count = document.createElement("p");this._count.className = "count";
      this._list = document.createElement("div");
      this._independent = document.createElement("div");
      const footer = document.createElement("a");footer.className="link";
      footer.href="/kimia-admin-next/pieces";
      footer.textContent="Organiser mes appareils par pièce";
      this._status = document.createElement("p");this._status.className = "status";
      this._status.setAttribute("aria-live","polite");
      card.append(top,this._stats,this._info,tools,this._count,this._list,this._independent,footer,this._status);
      this.shadowRoot.append(style,card);
    }
    setConfig(c){this._config=c||{};}
    set hass(hass){
      this._hass=hass;
      if(this.isConnected&&!this._started){this._started=true;void this._load()}
    }
    connectedCallback(){
      if(this._hass&&!this._started){this._started=true;void this._load()}
    }
    getCardSize(){return 12;}
    _stat(n,name){const el=document.createElement("div");el.className="stat";const b=document.createElement("b");b.textContent=String(n);const label=document.createElement("span");label.textContent=name;el.append(b,label);return el}
    _line(name,value){const p=document.createElement("div");p.className="func";const n=document.createElement("span");n.textContent=name;const v=document.createElement("span");v.className="desc";v.textContent=value;p.append(n,v);return p}
    _render(){
      if(!this._data)return;
      const data=this._data;
      this._stats.replaceChildren(
        this._stat(data.total,"Appareils"),
        this._stat(data.controls,"Commandes"),
        this._stat(data.zigbee,"Zigbee")
      );
      this._info.textContent = data.controls+" commandes reconnues : "+
        data.controlsOnDevices+" associées à des appareils, "+
        data.independentControls.length+" sans appareil associé. "+
        "Un appareil peut proposer plusieurs commandes et plusieurs capteurs.";
      const matches = data.rows.filter(d=>{
        if(this._filter==="ready"&&d.status!=="ready")return false;
        if(this._filter==="unassigned"&&d.status!=="unassigned")return false;
        if(this._filter==="zigbee"&&!d.zigbee)return false;
        if(this._filter==="controls"&&!d.controlCount)return false;
        if(this._filter==="monitor"&&d.status!=="monitor")return false;
        const text=[d.name,d.area,d.source,d.manufacturer,d.model].join(" ").toLocaleLowerCase("fr");
        return !this._search||text.includes(this._search);
      });
      this._count.textContent=matches.length+" appareil(s) affiché(s) sur "+data.total;
      const frag=document.createDocumentFragment();
      for(const d of matches){
        const item=document.createElement("details");item.className="item";
        const summary=document.createElement("summary");
        const left=document.createElement("div");
        const name=document.createElement("div");name.className="devname";name.textContent=d.name;
        const subtitle=document.createElement("div");subtitle.className="desc";
        subtitle.textContent=d.area+" · "+d.source+
          (d.manufacturer?" · "+d.manufacturer:"");
        left.append(name,subtitle);
        const right=document.createElement("span");right.className="chip "+d.status;
        right.textContent=d.status==="ready"
          ? (d.offline?"Configuration prête · Hors ligne":"Configuration prête")
          : d.controlCount?d.controlCount+" commande(s)":"Détails";
        summary.append(left,right);
        const body=document.createElement("div");body.className="body";
        const reason=document.createElement("p");reason.className="muted";reason.textContent=d.reason;
        const num=document.createElement("p");num.className="muted";
        num.textContent=d.entityCount+" fonction(s) enregistrée(s)"+(d.model?" · "+d.model:"");
        body.append(reason,num);
        if(!d.entities.length){
          const p=document.createElement("p");p.className="muted";
          p.textContent="Cet appareil ne possède pas d'entité exposée.";body.append(p);
        } else for(const e of d.entities){
          body.append(this._line(e.name,e.type+(e.state?" · "+e.state:"")));
        }
        item.append(summary,body);frag.appendChild(item);
      }
      this._list.replaceChildren(frag);
      const other=document.createElement("div");
      if(data.independentControls.length){
        const section=document.createElement("details");section.className="item";
        const hd=document.createElement("summary");const h=document.createElement("b");
        h.textContent="Commandes sans appareil physique associé ("+data.independentControls.length+")";
        hd.appendChild(h);
        const b=document.createElement("div");b.className="body";
        const p=document.createElement("p");p.className="muted";
        p.textContent="Certains services ou commandes créés par Home Assistant ne correspondent pas à un appareil du registre.";
        b.append(p);
        for(const e of data.independentControls) b.append(this._line(e.name,e.type+" · "+e.area));
        section.append(hd,b);other.append(section);
      }
      this._independent.replaceChildren(other);
    }
    async _load(){
      if(this._busy||!this._hass)return;
      if(this._hass.user?.is_admin!==true){
        this._status.textContent="Cette liste complète est réservée au compte administrateur KIMIA.";
        this._refresh.disabled=true;return;
      }
      this._busy=true;this._refresh.disabled=true;this._status.textContent="Recherche des équipements…";
      try {
        const [areas,devices,entities]=await Promise.all([
          this._hass.callWS({type:"config/area_registry/list"}),
          this._hass.callWS({type:"config/device_registry/list"}),
          this._hass.callWS({type:"config/entity_registry/list"})
        ]);
        if(!Array.isArray(areas)||!Array.isArray(devices)||!Array.isArray(entities))
          throw new Error("Inventaire incomplet.");
        this._data=build(areas,devices,entities,this._hass.states||{});
        this._render();
        this._status.textContent="Inventaire actualisé. Les appareils listés ne sont pas tous du Zigbee.";
      } catch(err){
        this._status.textContent="Impossible de charger les équipements : "+(err?.message||String(err));
      } finally {this._busy=false;this._refresh.disabled=false;}
    }
  }
  customElements.define(TAG,KimiaInventoryCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some(c=>c.type===TAG)) {
    window.customCards.push({type:TAG,name:"KIMIA · Inventaire des équipements",
      description:"Lister tous les appareils, leur intégration et leurs fonctions, sans YAML."});
  }
})();