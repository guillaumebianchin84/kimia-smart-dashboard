/* KIMIA V1.5 — visibilité des pièces par compte Home Assistant.
 * Administrateur seulement. Masquage visuel, jamais contrôle d'accès.
 * Source persistante : carte de configuration dans kimia-admin-next.
 */
(() => {
  "use strict";
  const TAG="kimia-user-visibility-v15-card";
  if(customElements.get(TAG))return;
  const ADMIN="kimia-admin-next";
  const make=(tag,text,cls)=>{
    const n=document.createElement(tag);
    if(text!==undefined)n.textContent=text;
    if(cls)n.className=cls;
    return n;
  };
  const clone=x=>JSON.parse(JSON.stringify(x));
  const allCards=view=>(view?.sections||[]).flatMap(s=>s.cards||[]).concat(view?.cards||[]);
  const findCard=cfg=>allCards(cfg?.views?.find(v=>v.path==="utilisateurs"))
    .find(c=>c.type==="custom:kimia-user-visibility-v15-card");
  const stylesheet=String.raw
`
:host{display:block;color:var(--primary-text-color)}
ha-card{display:block;padding:19px;border-radius:18px}
h2{margin:0 0 6px;font-size:20px}
p{margin:5px 0 14px;font-size:13px;line-height:1.5;color:var(--secondary-text-color)}
label{display:block;font-weight:700;margin:12px 0 8px}
select{width:100%;padding:12px;color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);font:inherit}
.rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:9px;margin:12px 0 16px}
.room{display:flex;align-items:center;gap:9px;border:1px solid var(--divider-color);border-radius:12px;padding:12px;cursor:pointer;min-height:22px}
.room input{height:20px;width:20px;accent-color:var(--primary-color);flex-shrink:0}
.room span{overflow-wrap:anywhere}
.actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
button{border:0;border-radius:11px;padding:12px 17px;background:var(--primary-color);color:var(--text-primary-color,#fff);font:inherit;font-weight:700;cursor:pointer}
button:disabled{opacity:.48;cursor:default}
small{color:var(--secondary-text-color);line-height:1.5;display:block;margin-top:12px}
.feedback{padding:11px;border-radius:10px;background:var(--secondary-background-color);margin-top:12px;overflow-wrap:anywhere}
`;
  class UserVisibility extends HTMLElement {
    constructor(){
      super();
      this.attachShadow({mode:"open"});
      this._hass=null;this._started=false;this._busy=false;
      this._users=[];this._areas=[];this._profiles={};this._userId="";
      this._hidden=new Set();this._error="";this._notice="";
      this._render();
    }
    setConfig(config){this._cfg=config||{};}
    set hass(hass){
      this._hass=hass;
      if(hass&&!this._started){this._started=true;this._load();}
    }
    getCardSize(){return 5;}
    async _load(){
      if(!this._hass?.user?.is_admin){
        this._error="Cette configuration est réservée à l'administrateur.";
        this._render();return;
      }
      this._busy=true;this._render();
      try{
        const [users,areas,config]=await Promise.all([
          this._hass.callWS({type:"config/auth/list"}),
          this._hass.callWS({type:"config/area_registry/list"}),
          this._hass.callWS({type:"lovelace/config",url_path:ADMIN})
        ]);
        this._users=(Array.isArray(users)?users:[])
          .filter(u=>u.id&&!u.system_generated&&u.is_active!==false)
          .sort((a,b)=>(a.name||a.username||"").localeCompare(b.name||b.username||"","fr"));
        this._areas=(Array.isArray(areas)?areas:[])
          .filter(a=>typeof a.area_id==="string")
          .sort((a,b)=>(a.name||"").localeCompare(b.name||"","fr"));
        this._profiles=clone(findCard(config)?.hidden_areas_by_user||{});
        if(!this._users.some(u=>u.id===this._userId))
          this._userId=this._users[0]?.id||"";
        this._setSelection(this._userId);
      }catch(e){this._error=e?.message||String(e);}
      finally{this._busy=false;this._render();}
    }
    _setSelection(id){
      this._userId=id;
      this._hidden=new Set(this._profiles[id]||[]);
      this._notice="";this._error="";
    }
    _render(){
      const root=this.shadowRoot;
      const style=make("style",stylesheet);
      const card=make("ha-card");
      card.append(make("h2","Pièces visibles par utilisateur"));
      card.append(make("p","Chaque compte voit ses propres pièces dans KIMIA. Les autres pages Home Assistant et les appareils ne sont pas bloqués."));
      if(!this._hass?.user?.is_admin){
        card.append(make("p","Réservé à l'administrateur."));
        root.replaceChildren(style,card);return;
      }
      if(this._busy && !this._users.length){
        card.append(make("p","Chargement des comptes et des pièces…"));
        root.replaceChildren(style,card);return;
      }
      if(!this._users.length||!this._areas.length){
        card.append(make("p",!this._users.length?"Aucun compte disponible.":"Créez d'abord vos pièces."));
        if(this._error)card.append(make("div",this._error,"feedback"));
        root.replaceChildren(style,card);return;
      }
      const userLabel=make("label","Compte Home Assistant");
      const sel=make("select");
      for(const user of this._users){
        const opt=make("option",user.name||user.username||"Compte");
        opt.value=user.id;opt.selected=user.id===this._userId;
        sel.append(opt);
      }
      sel.disabled=this._busy;
      sel.addEventListener("change",()=>{this._setSelection(sel.value);this._render();});
      card.append(userLabel,sel);
      card.append(make("p","Cochez les pièces à afficher. Décochez celles à masquer pour ce compte."));
      const grid=make("div",undefined,"rooms");
      for(const area of this._areas){
        const label=make("label",undefined,"room");
        const check=make("input");check.type="checkbox";
        check.checked=!this._hidden.has(area.area_id);
        check.disabled=this._busy;
        check.addEventListener("change",()=>{
          if(check.checked)this._hidden.delete(area.area_id);
          else this._hidden.add(area.area_id);
        });
        label.append(check,make("span",area.name||area.area_id));
        grid.append(label);
      }
      card.append(grid);
      const actions=make("div",undefined,"actions");
      const save=make("button",this._busy?"Enregistrement…":"Enregistrer pour cet utilisateur");
      save.disabled=this._busy;save.addEventListener("click",()=>this._save());
      actions.append(save);
      card.append(actions);
      card.append(make("small","Les comptes non configurés voient toutes les pièces. L'administrateur peut rétablir leur affichage à tout moment. Ce réglage n'est pas une restriction de sécurité."));
      if(this._error)card.append(make("div","Erreur : "+this._error,"feedback"));
      if(this._notice)card.append(make("div",this._notice,"feedback"));
      root.replaceChildren(style,card);
    }
    async _save(){
      if(this._busy||!this._hass?.user?.is_admin)return;
      const userId=this._userId;
      if(!this._users.some(u=>u.id===userId))return;
      const hidden=[...this._hidden].filter(id=>this._areas.some(a=>a.area_id===id)).sort();
      this._busy=true;this._error="";this._notice="";this._render();
      let saved=false;
      try{
        const current=await this._hass.callWS({type:"lovelace/config",url_path:ADMIN});
        if(!Array.isArray(current?.views)||current.strategy)
          throw Error("Administration KIMIA indisponible en mode Interface.");
        const next=clone(current);
        const card=findCard(next);
        if(!card)throw Error("Carte de gestion des utilisateurs introuvable.");
        const profiles=clone(card.hidden_areas_by_user||{});
        if(hidden.length)profiles[userId]=hidden;
        else delete profiles[userId];
        card.hidden_areas_by_user=profiles;
        if(JSON.stringify(next)!==JSON.stringify(current)){
          const latest=await this._hass.callWS({type:"lovelace/config",url_path:ADMIN});
          if(JSON.stringify(latest)!==JSON.stringify(current))
            throw Error("La configuration a changé entre-temps. Rechargez la page.");
          await this._hass.callWS({type:"lovelace/config/save",url_path:ADMIN,config:next});
          saved=true;
        }
        this._profiles=profiles;
        if(!window.KimiaSmartCore?.sync)
          throw Error("Le moteur KIMIA V1.5 doit être chargé avant la synchronisation.");
        await window.KimiaSmartCore.sync(this._hass);
        this._notice="Pièces mises à jour dans KIMIA Next pour ce compte.";
      }catch(e){
        this._error=(saved?"Préférences enregistrées, mais affichage non synchronisé. ":"")+
          (e?.message||String(e));
      }finally{this._busy=false;this._render();}
    }
  }
  customElements.define(TAG,UserVisibility);
})();
