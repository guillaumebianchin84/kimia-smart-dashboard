/* KIMIA Smart - synchronization des cartes Zone natives.
 * Prototype d'essai : ne cible que le dashboard UI explicitement configuré.
 * Ajout uniquement, jamais de suppression ni de réécriture des cartes existantes.
 */
(() => {
  "use strict";
  const TAG = "kimia-dashboard-sync-card";
  if (customElements.get(TAG)) return;

  class KimiaDashboardSyncCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = null;
      this._hass = null;
      this._busy = false;
      this._ready = false;
      const style = document.createElement("style");
      style.textContent = `
        ha-card { display:block; padding:16px; border-radius:16px; color:var(--primary-text-color); }
        h3 { margin:0 0 8px; font-size:18px; }
        p { font-size:13px; line-height:1.5; color:var(--secondary-text-color); }
        button { border:0; background:var(--primary-color); color:var(--text-primary-color,#fff);
          padding:11px 15px; border-radius:10px; cursor:pointer; font:inherit; }
        button:disabled { opacity:.45; cursor:default; }
        #status { margin-top:12px; white-space:pre-line; }
        .error { color:var(--error-color,#b33); }
      `;
      const card = document.createElement("ha-card");
      const heading = document.createElement("h3");
      heading.textContent = "Afficher les pièces dans KIMIA";
      const description = document.createElement("p");
      description.textContent = "Ajoute une carte Zone native par pièce manquante. Les cartes que vous avez déplacées ou personnalisées restent intactes.";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Ajouter les pièces manquantes";
      btn.disabled = true;
      btn.addEventListener("click", () => void this._synchronize());
      const status = document.createElement("p");
      status.id = "status";
      status.setAttribute("aria-live", "polite");
      card.append(heading, description, btn, status);
      this.shadowRoot.append(style, card);
      this._button = btn;
      this._status = status;
    }
    setConfig(config) {
      if (!config || typeof config.dashboard !== "string" ||
          !/^[a-z0-9_-]{3,60}$/.test(config.dashboard) ||
          typeof config.view !== "string" || !/^[a-z0-9_-]{2,60}$/.test(config.view)) {
        throw new Error("Paramètres KIMIA requis : dashboard et view");
      }
      // Protection du prototype : refus strict d'agir sur KIMIA production.
      if (config.dashboard !== "kimia-test" || config.view !== "pieces") {
        throw new Error("Prototype limité au dashboard kimia-test, vue pieces.");
      }
      this._config = { dashboard: config.dashboard, view: config.view };
      this._update();
    }
    set hass(value) {
      this._hass = value;
      this._update();
    }
    getCardSize() { return 4; }
    _show(message, error = false) {
      this._status.textContent = message;
      this._status.className = error ? "error" : "";
    }
    _update() {
      if (!this._button) return;
      const admin = this._hass?.user?.is_admin === true;
      this._button.disabled = !this._config || !admin || this._busy;
      if (!admin) this._show("Compte administrateur KIMIA requis.");
      else if (!this._ready && this._config) {
        this._ready = true;
        this._show("Aucun changement sans appuyer sur le bouton.");
      }
    }
    async _synchronize() {
      if (this._busy || !this._config || this._hass?.user?.is_admin !== true) return;
      this._busy = true;
      this._update();
      try {
        const hass = this._hass;
        const path = this._config.dashboard;
        const [areas, dashboards, config] = await Promise.all([
          hass.callWS({ type: "config/area_registry/list" }),
          hass.callWS({ type: "lovelace/dashboards/list" }),
          hass.callWS({ type: "lovelace/config", url_path: path })
        ]);
        const list = Array.isArray(dashboards) ? dashboards : dashboards?.dashboards;
        const dashboard = Array.isArray(list) && list.find(d => d.url_path === path);
        if (!dashboard || dashboard.mode !== "storage") {
          throw new Error("Dashboard cible absent ou non éditable. Vérifiez son URL et le mode Interface.");
        }
        if (!Array.isArray(areas) || !config || !Array.isArray(config.views) || config.strategy) {
          throw new Error("Réponse Home Assistant incomplète : aucune modification effectuée.");
        }
        const viewIndex = config.views.findIndex(v => v.path === this._config.view);
        if (viewIndex < 0) throw new Error("Vue Pièces introuvable : aucune modification effectuée.");
        const view = config.views[viewIndex];
        if (!Array.isArray(view.sections)) {
          throw new Error("La vue cible n'est pas de type Sections.");
        }
        const sectionIndex = view.sections.findIndex(s =>
          Array.isArray(s.cards) && s.cards.some(c =>
            c.type === "heading" && c.heading === "Pièces de la maison"));
        if (sectionIndex < 0) {
          throw new Error("Section KIMIA absente. Importez d'abord le dashboard test compatible.");
        }
        const current = new Set(
          view.sections.flatMap(s => Array.isArray(s.cards) ? s.cards : [])
            .filter(c => c.type === "area" && typeof c.area === "string")
            .map(c => c.area)
        );
        const missing = areas.filter(a => typeof a.area_id === "string" &&
          a.area_id.length > 0 && !current.has(a.area_id))
          .sort((a, b) => a.name.localeCompare(b.name, "fr"));
        if (!missing.length) {
          this._show("Toutes les pièces possèdent déjà leur carte native. Rien à modifier.");
          return;
        }
        const answer = window.confirm(
          "Ajouter " + missing.length + " carte(s) Zone native(s) au dashboard " +
          path + " ?\\n" + missing.map(a => "• " + a.name).join("\\n") +
          "\\nLes cartes existantes ne seront pas supprimées."
        );
        if (!answer) {
          this._show("Opération annulée, aucun changement.");
          return;
        }
        // Relire juste avant écriture : l'API remplace TOUT le dashboard.
        const latest = await hass.callWS({ type: "lovelace/config", url_path: path });
        if (JSON.stringify(latest) !== JSON.stringify(config)) {
          throw new Error("Le dashboard a changé entre-temps. Relancez pour éviter un écrasement.");
        }
        const next = JSON.parse(JSON.stringify(latest));
        const target = next.views[viewIndex].sections[sectionIndex];
        const existingNow = new Set(
          next.views[viewIndex].sections.flatMap(s => s.cards || [])
            .filter(c => c.type === "area").map(c => c.area)
        );
        const additions = missing.filter(a => !existingNow.has(a.area_id));
        for (const area of additions) {
          target.cards.push({
            type: "area",
            area: area.area_id,
            display_type: "compact",
            features: [{ type: "area-controls" }],
            grid_options: { columns: 6, rows: "auto" }
          });
        }
        await hass.callWS({ type: "lovelace/config/save", url_path: path, config: next });
        const saved = await hass.callWS({ type: "lovelace/config", url_path: path, force: true });
        const savedIds = new Set(
          (saved.views?.find(v => v.path === this._config.view)?.sections || [])
            .flatMap(s => s.cards || []).filter(c => c.type === "area").map(c => c.area)
        );
        if (additions.some(a => !savedIds.has(a.area_id))) {
          throw new Error("Enregistrement envoyé, mais vérification incomplète : contrôlez la page Pièces.");
        }
        this._show(additions.length + " carte(s) native(s) ajoutée(s) à Mes pièces.\\n"
          + "Vous pouvez maintenant les déplacer, redimensionner et personnaliser dans l'éditeur Home Assistant.");
      } catch (error) {
        this._show("Synchronisation non effectuée : " +
          (error?.message || String(error)), true);
      } finally {
        this._busy = false;
        this._update();
      }
    }
  }
  customElements.define(TAG, KimiaDashboardSyncCard);
})();
