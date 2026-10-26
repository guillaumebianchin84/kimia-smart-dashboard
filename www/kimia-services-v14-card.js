/* KIMIA V1.4 — options Carte & Listes.
 * Modification exclusivement de cartes natives des vues KIMIA Next.
 * Aucun effet sur un autre dashboard; pas de show_all implicite.
 */
(() => {
 "use strict";
 const TAG="kimia-services-v14-card";
 if(customElements.get(TAG))return;
 const node=(tag,text)=>{
  const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;
 };
 const clone=x=>JSON.parse(JSON.stringify(x));
 const cards=view=>(view?.sections||[]).flatMap(s=>s.cards||[]).concat(view?.cards||[]);
 class Config extends HTMLElement {
  constructor(){
   super();this.attachShadow({mode:"open"});
   const style=node("style");style.textContent="ha-card{padding:18px;border-radius:17px;display:block}h2{margin:0 0 6px;font-size:19px}p{font-size:13px;color:var(--secondary-text-color)}label{display:block;font-weight:700;margin:16px 0 7px}select{display:block;width:100%;box-sizing:border-box;border-radius:9px;padding:10px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}button{margin-top:12px;padding:11px 14px;background:var(--primary-color);color:white;border:none;border-radius:9px;cursor:pointer}button:disabled{opacity:.5}.error{color:var(--error-color,#b33)}";
   const root=node("ha-card");
   root.append(node("h2","Carte et listes"),node("p","Choisissez les positions autorisées sur la carte et la liste To-do du foyer. Aucune localisation personnelle n'est affichée par défaut."));
   const mlabel=node("label","Éléments visibles sur la carte (sélection multiple)");
   this._map=node("select");this._map.multiple=true;this._map.size=6;
   const tlabel=node("label","Liste To-do utilisée");
   this._todo=node("select");
   this._save=node("button","Enregistrer");
   this._msg=node("p");this._msg.setAttribute("aria-live","polite");
   this._save.onclick=()=>void this._update();
   root.append(mlabel,this._map,tlabel,this._todo,this._save,this._msg);
   this.shadowRoot.append(style,root);this._loaded=false;this._busy=false;
  }
  setConfig(cfg){this._cfg=cfg||{};}
  getCardSize(){return 7;}
  set hass(hass){this._hass=hass;if(!this._loaded){this._loaded=true;void this._load();}}
  _status(message,error=false){this._msg.textContent=message;this._msg.className=error?"error":"";}
  async _load(){
   if(this._hass?.user?.is_admin!==true){this._save.disabled=true;this._status("Réservé aux administrateurs.",true);return;}
   try{
    const cfg=await this._hass.callWS({type:"lovelace/config",url_path:"kimia-next"});
    const views=new Map((cfg.views||[]).map(v=>[v.path,v]));
    const map=cards(views.get("carte")).find(c=>c.type==="map");
    const todo=cards(views.get("listes")).find(c=>c.type==="todo-list");
    if(!views.has("carte")||!views.has("listes")||!map)
     throw Error("Synchronisez d'abord KIMIA Next en V1.4.");
    const keys=Object.keys(this._hass.states||{}).filter(id=>{
      const s=this._hass.states[id],domain=id.split(".")[0];
      return ["zone","person","device_tracker"].includes(domain) &&
       (id==="zone.home" || (Number.isFinite(Number(s.attributes.latitude)) &&
        Number.isFinite(Number(s.attributes.longitude)) &&
        s.attributes.latitude!=null && s.attributes.longitude!=null));
    }).sort();
    if(!keys.includes("zone.home"))keys.unshift("zone.home");
    this._map.replaceChildren();
    const selected=new Set((map.entities||[]).map(x=>typeof x==="string"?x:x.entity));
    for(const id of keys){
      const opt=node("option",this._hass.states[id]?.attributes?.friendly_name||id);
      opt.value=id;opt.selected=selected.has(id);this._map.append(opt);
    }
    this._todo.replaceChildren();const empty=node("option","Aucune liste");empty.value="";this._todo.append(empty);
    for(const id of Object.keys(this._hass.states).filter(id=>id.startsWith("todo.")).sort()){
      const opt=node("option",this._hass.states[id].attributes.friendly_name||id);
      opt.value=id;this._todo.append(opt);
    }
    this._todo.value=todo?.entity||"";
    this._status("Réglages chargés. Sélectionnez au moins une zone ou un appareil pour la carte.");
   }catch(err){this._save.disabled=true;this._status("Impossible de charger : "+(err?.message||err),true);}
  }
  async _update(){
   if(this._busy||this._hass?.user?.is_admin!==true)return;
   const entities=Array.from(this._map.selectedOptions).map(x=>x.value);
   const chosen=this._todo.value;
   if(!entities.length){this._status("Sélectionnez au moins un élément de la carte.",true);return;}
   if(entities.length>15){this._status("Maximum 15 éléments pour préserver la lisibilité.",true);return;}
   this._busy=true;this._save.disabled=true;
   try {
    const base=await this._hass.callWS({type:"lovelace/config",url_path:"kimia-next"});
    const cfg=clone(base);
    const views=new Map((cfg.views||[]).map(v=>[v.path,v]));
    const m=cards(views.get("carte")).find(c=>c.type==="map");
    const l=views.get("listes");
    if(!m||!l)throw Error("Vues natives KIMIA introuvables.");
    m.entities=entities;m.show_all=false;
    const existing=cards(l).find(c=>c.type==="todo-list");
    if(chosen) {
      if(!this._hass.states[chosen]||!chosen.startsWith("todo."))throw Error("Liste absente de Home Assistant.");
      if(existing)existing.entity=chosen;
      else{
       const placeholder="KIMIA V1.4 : aucune liste To-do détectée. Activez une intégration de listes dans Home Assistant puis cliquez sur Actualiser ma maison.";
       let replaced=false;
       for(const section of l.sections||[])for(let i=0;i<(section.cards||[]).length;i++)
        if(section.cards[i]?.type==="markdown"&&section.cards[i]?.content===placeholder){
         section.cards[i]={type:"todo-list",entity:chosen,title:"Mes listes",grid_options:{columns:12,rows:"auto"}};replaced=true;
        }
       if(!replaced)throw Error("Carte Liste personnalisée : modification automatique refusée.");
      }
    }
    const check=await this._hass.callWS({type:"lovelace/config",url_path:"kimia-next"});
    if(JSON.stringify(check)!==JSON.stringify(base))throw Error("Dashboard changé entre-temps. Réessayez.");
    await this._hass.callWS({type:"lovelace/config/save",url_path:"kimia-next",config:cfg});
    this._status("Carte et liste enregistrées dans KIMIA Next.");
   }catch(e){this._status("Enregistrement refusé : "+(e?.message||String(e)),true);}
   finally{this._busy=false;this._save.disabled=false;}
  }
 }
 customElements.define(TAG,Config);
 window.customCards=window.customCards||[];
 window.customCards.push({type:TAG,name:"KIMIA · Carte & Listes V1.4",description:"Sélection des positions et de la liste To-do"});
})();