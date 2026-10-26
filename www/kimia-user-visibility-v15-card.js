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
.summary{margin-top:18px;padding:14px;border:1px solid var(--divider-color);border-radius:14px;background:var(--secondary-background-color)}
.summary h3{margin:0 0 8px;font-size:16px}
.chips{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0 12px}
.chip{padding:6px 9px;border-radius:9px;font-size:12px;background:var(--card-background-color);border:1px solid var(--divider-color)}
.summary .muted{color:var(--secondary-text-color)}
.create{border:1px solid var(--divider-color);border-radius:12px;padding:15px;margin:14px 0}
.create input{width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);border-radius:9px;font:inherit}
.create label{font-size:13px}

`;
  class UserVisibility extends HTMLElement {
    constructor(){
      super();
      this.attachShadow({mode:"open"});
      this._hass=null;this._started=false;this._busy=false;
      this._users=[];this._areas=[];this._profiles={};this._userId="";
      this._hidden=new Set();this._error="";this._notice="";this._creating=false;
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
    // Le récapitulatif lit la dernière sauvegarde, jamais les cases en cours d'édition.
    _renderSummary(card){
      const saved=new Set(this._profiles[this._userId]||[]);
      const visible=this._areas.filter(a=>!saved.has(a.area_id));
      const hidden=this._areas.filter(a=>saved.has(a.area_id));
      const name=this._users.find(u=>u.id===this._userId)?.name||"cet utilisateur";
      const box=make("section",undefined,"summary");
      box.append(make("h3","Configuration enregistrée — "+name));
      box.append(make("p","Pièces visibles : "+visible.length+" / "+this._areas.length));
      const list=make("div",undefined,"chips");
      for(const area of visible)list.append(make("span",area.name||area.area_id,"chip"));
      if(!visible.length)list.append(make("span","Aucune pièce visible","muted"));
      box.append(list,make("p","Pièces masquées : "+hidden.length));
      const off=make("div",undefined,"chips");
      for(const area of hidden)off.append(make("span",area.name||area.area_id,"chip"));
      if(!hidden.length)off.append(make("span","Aucune pièce masquée","muted"));
      box.append(off);
      box.append(make("small","Ces valeurs sont enregistrées dans KIMIA. Les cases au-dessus peuvent contenir des modifications non sauvegardées."));
      card.append(box);
    }
    _renderCreation(card){
      const form=make("form",undefined,"create");
      form.append(make("h3","Nouveau compte Home Assistant"));
      form.append(make("p","Compte standard (non administrateur). Vous pourrez choisir ses pièces après sa création."));
      const fields=[
        ["Nom affiché","name","text","Ex. Enfant"],
        ["Identifiant","username","text","Ex. enfant"],
        ["Mot de passe","password","password","Au moins 8 caractères"]
      ];
      const inputs={};
      for(const [label,id,type,hint] of fields){
        const l=make("label",label),field=make("input");
        field.name=id;field.type=type;field.placeholder=hint;field.required=true;
        if(id==="password"){field.minLength=8;field.autocomplete="new-password";}
        else{field.autocomplete="off";}
        inputs[id]=field;
        form.append(l,field);
      }
      const confirm=make("button","Créer le compte standard");
      confirm.type="submit";confirm.disabled=this._busy;
      form.append(confirm);
      form.addEventListener("submit",e=>{
        e.preventDefault();
        void this._createUser({
          name:inputs.name.value.trim(),
          username:inputs.username.value.trim().toLowerCase(),
          password:inputs.password.value
        });
      });
      card.append(form);
    }
    async _createUser({name,username,password}){
      if(this._busy||!this._hass?.user?.is_admin)return;
      if(!name||!username||password.length<8){
        this._error="Nom, identifiant et mot de passe (8 caractères minimum) requis.";
        this._render();return;
      }
      if(!/^[a-z0-9][a-z0-9_.-]{1,63}$/.test(username)){
        this._error="Identifiant : lettres minuscules, chiffres, points, tirets et tirets bas uniquement.";
        this._render();return;
      }
      if(this._users.some(u=>(u.username||"").toLowerCase()===username)){
        this._error="Cet identifiant est déjà utilisé.";this._render();return;
      }
      this._busy=true;this._error="";this._notice="";
      // La page ne conserve jamais le mot de passe. HA crée deux objets liés :
      // 1. le compte standard, 2. son identifiant de connexion.
      let createdUser;
      try{
        const result=await this._hass.callWS({
          type:"config/auth/create",name,group_ids:["system-users"]
        });
        createdUser=result?.user;
        if(!createdUser?.id)throw Error("Home Assistant n'a pas retourné de compte créé.");
        await this._hass.callWS({
          type:"config/auth_provider/homeassistant/create",
          user_id:createdUser.id,username,password
        });
        this._userId=createdUser.id;this._creating=false;
        this._notice="Compte créé. Choisissez les pièces visibles, puis enregistrez.";
      }catch(e){
        this._error=(createdUser?.id
          ?"Compte créé dans HA, mais identifiants incomplets. Terminez la configuration dans Paramètres → Personnes → Utilisateurs. "
          :"Création impossible. ")+(e?.message||String(e));
      }finally{
        password="";
        const error=this._error,notice=this._notice;
        this._busy=false;
        await this._load();
        this._error=error||this._error;
        this._notice=notice;
        this._render();
      }
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
      const createBtn=make("button",this._creating?"Fermer la création":"+ Créer un utilisateur");
      createBtn.disabled=this._busy;
      createBtn.addEventListener("click",()=>{
        this._creating=!this._creating;this._render();
      });
      card.append(createBtn);
      if(this._creating)this._renderCreation(card);
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
      this._renderSummary(card);
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
