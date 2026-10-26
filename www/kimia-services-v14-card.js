/* KIMIA V1.5 — administration Carte et Listes (sans YAML côté client).
 * Sélections par cases à cocher, 15 positions et 3 listes maximum.
 * Création de listes par le config-flow officiel Local To-do Home Assistant.
 * Modifications limitées au dashboard storage "kimia-next".
 */
(() => {
 "use strict";
 const TAG="kimia-services-v14-card";
 if(customElements.get(TAG))return;
 const make=(tag,text,cls)=>{
   const el=document.createElement(tag);
   if(text!==undefined)el.textContent=text;
   if(cls)el.className=cls;
   return el;
 };
 const clone=x=>JSON.parse(JSON.stringify(x));
 const cards=view=>(view?.sections||[]).flatMap(s=>s.cards||[]).concat(view?.cards||[]);
 const isManaged=card=>card?.type==="todo-list" && (
   (card.title==="Mes listes" &&
    JSON.stringify(Object.keys(card).sort())===JSON.stringify(["entity","grid_options","title","type"]) &&
    card.grid_options?.columns===12 && card.grid_options?.rows==="auto") ||
   (typeof card.title==="string"&&card.title.startsWith("KIMIA · ") &&
    JSON.stringify(Object.keys(card).sort())===JSON.stringify(["entity","grid_options","title","type"]) &&
    card.grid_options?.columns===12 && card.grid_options?.rows==="auto")
 );
 const placeholder="KIMIA V1.4 : aucune liste To-do détectée. Activez une intégration de listes dans Home Assistant puis cliquez sur Actualiser ma maison.";
 const css=[
  ":host{display:block;color:var(--primary-text-color)}",
  "ha-card{display:block;padding:19px;border-radius:18px;border:1px solid var(--divider-color)}",
  "h2{font-size:20px;margin:0 0 4px}",
  "h3{font-size:17px;margin:20px 0 8px}",
  "p{font-size:13px;line-height:1.5;color:var(--secondary-text-color)}",
  ".choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px;margin:10px 0 15px}",
  ".choice{display:flex;align-items:center;gap:10px;min-width:0;padding:11px;border:1px solid var(--divider-color);border-radius:11px;cursor:pointer}",
  ".choice input{height:19px;width:19px;accent-color:var(--primary-color);flex:none}",
  ".choice span{overflow-wrap:anywhere;font-size:14px}",
  "button{border:0;border-radius:10px;background:var(--primary-color);color:#fff;padding:12px 17px;font:inherit;cursor:pointer;margin:6px 8px 4px 0;font-weight:650}",
  "button:disabled{opacity:.5;cursor:default}",
  ".secondary{background:var(--secondary-background-color);border:1px solid var(--divider-color);color:var(--primary-text-color)}",
  "input[type=text]{width:100%;box-sizing:border-box;border:1px solid var(--divider-color);border-radius:10px;padding:11px;background:var(--card-background-color);color:var(--primary-text-color);font:inherit}",
  ".group{padding:8px 0 15px;border-bottom:1px solid var(--divider-color)}",
  ".muted{font-size:12px;color:var(--secondary-text-color)}",
  ".feedback{border-radius:10px;padding:10px;margin:10px 0;background:var(--secondary-background-color);font-size:13px}",
  ".error{color:var(--error-color,#cc5050)}"
 ].join("\n");
 class KConfig extends HTMLElement {
  constructor(){
   super();this.attachShadow({mode:"open"});
   this._hass=null;this._started=false;this._busy=false;this._zones=[];
   this._availableTodos=[];this._selectedPositions=new Set();
   this._selectedTodos=new Set();this._todoNames=new Map();
   this._notice="";this._error="";this._newName="";
   this._render();
  }
  setConfig(cfg){this._cfg=cfg||{};}
  getCardSize(){return 8;}
  set hass(hass){
   this._hass=hass;
   if(hass&&!this._started){this._started=true;void this._load();}
  }
  _status(msg,err=false){
   this._notice=err?"":msg;this._error=err?msg:"";this._render();
  }
  _names(id){
   return this._hass?.states?.[id]?.attributes?.friendly_name||id;
  }
  async _load(){
   if(!this._hass?.user?.is_admin)return;
   this._busy=true;this._render();
   try{
    const config=await this._hass.callWS({type:"lovelace/config",url_path:"kimia-next"});
    const views=new Map((config.views||[]).map(v=>[v.path,v]));
    const m=cards(views.get("carte")).find(c=>c.type==="map");
    const listView=views.get("listes");
    if(!m||!listView)throw Error("Les vues Carte et Listes sont absentes de KIMIA Next.");
    const ids=Object.keys(this._hass.states||{}).filter(id=>{
      if(id==="zone.home")return true;
      const s=this._hass.states[id];
      if(!["zone","person","device_tracker"].includes(id.split(".")[0]))return false;
      return s?.attributes?.latitude!=null&&s?.attributes?.longitude!=null &&
       Number.isFinite(Number(s.attributes.latitude))&&Number.isFinite(Number(s.attributes.longitude));
    }).sort();
    if(!ids.includes("zone.home"))ids.unshift("zone.home");
    this._zones=ids;
    this._selectedPositions=new Set((m.entities||[]).map(v=>typeof v==="string"?v:v.entity));
    this._availableTodos=Object.keys(this._hass.states||{}).filter(id=>id.startsWith("todo.")).sort();
    this._todoNames=new Map(this._availableTodos.map(id=>[id,this._names(id)]));
    this._selectedTodos=new Set(cards(listView).filter(c=>c.type==="todo-list")
      .map(c=>c.entity).filter(id=>this._availableTodos.includes(id)));
    this._error="";this._notice="Sélections chargées. Seuls les éléments cochés seront ajoutés à KIMIA.";
   }catch(e){this._error=e?.message||String(e);}
   finally{this._busy=false;this._render();}
  }
  _checkGrid(items,selected,group,limit){
   const wrap=make("div",undefined,"choices");
   for(const id of items){
    const label=make("label",undefined,"choice"),check=make("input");
    check.type="checkbox";check.checked=selected.has(id);check.disabled=this._busy;
    const prefix=group==="positions"?
      id.startsWith("zone.")?"Zone · ":id.startsWith("person.")?"Personne · ":"Appareil · ":"";
    check.addEventListener("change",()=>{
      if(check.checked){
        if(!selected.has(id)&&selected.size>=limit){
          check.checked=false;this._status("Maximum "+limit+" élément(s) dans cette sélection.",true);return;
        }
        selected.add(id);
      }else selected.delete(id);
      // Mettre à jour le compteur sans reconstruire les cases.
      const count=wrap.parentElement?.querySelector(".counter");
      if(count)count.textContent=selected.size+" / "+limit+" sélectionné(s)";
    });
    label.append(check,make("span",prefix+this._names(id)));
    wrap.append(label);
   }
   return wrap;
  }
  _render(){
   const root=this.shadowRoot,style=make("style",css),card=make("ha-card");
   card.append(make("h2","Carte et listes"),
     make("p","Sélectionnez les positions et listes que vous souhaitez afficher. Aucun téléphone ou utilisateur n'est suivi automatiquement."));
   if(!this._hass?.user?.is_admin){
     card.append(make("p","Réservé à l'administrateur."));
     root.replaceChildren(style,card);return;
   }
   if(this._busy&&!this._zones.length){
     card.append(make("p","Chargement…"));root.replaceChildren(style,card);return;
   }
   const mapGroup=make("section",undefined,"group");
   mapGroup.append(make("h3","Positions visibles sur la carte"),
     make("p","Cochez les zones, personnes ou appareils à afficher. Une position personnelle ne sera visible que si vous la choisissez."));
   const mapCounter=make("p",this._selectedPositions.size+" / 15 sélectionné(s)","counter muted");
   mapGroup.append(mapCounter,this._checkGrid(this._zones,this._selectedPositions,"positions",15));
   const todoGroup=make("section",undefined,"group");
   todoGroup.append(make("h3","Listes To-do affichées"),
    make("p","Vous pouvez afficher jusqu'à trois listes, les unes sous les autres. Les tâches existantes restent conservées."));
   const todoCounter=make("p",this._selectedTodos.size+" / 3 sélectionné(s)","counter muted");
   todoGroup.append(todoCounter,this._checkGrid(this._availableTodos,this._selectedTodos,"todos",3));
   if(!this._availableTodos.length)
     todoGroup.append(make("p","Aucune liste trouvée. Créez votre première liste ci-dessous."));
   todoGroup.append(make("h3","Créer une nouvelle liste"));
   const name=make("input");name.type="text";name.placeholder="Ex. Courses, Ménage, Vacances";
   name.value=this._newName;name.maxLength=70;name.disabled=this._busy;
   name.addEventListener("input",()=>{this._newName=name.value;});
   const add=make("button","+ Créer une liste");
   add.disabled=this._busy;add.addEventListener("click",()=>void this._createTodo());
   todoGroup.append(name,add,make("p",
    "Les listes sont créées avec l'intégration locale To-do de Home Assistant. Leur renommage ou suppression se fait depuis les intégrations HA, afin de ne pas supprimer des tâches accidentellement."));
   const save=make("button",this._busy?"Enregistrement…":"Enregistrer la carte et les listes");
   save.disabled=this._busy;save.addEventListener("click",()=>void this._save());
   card.append(mapGroup,todoGroup,save);
   if(this._error)card.append(make("p","Erreur : "+this._error,"feedback error"));
   if(this._notice)card.append(make("p",this._notice,"feedback"));
   root.replaceChildren(style,card);
  }
  async _createTodo(){
   if(this._busy||!this._hass?.user?.is_admin)return;
   const name=this._newName.trim();
   if(!name||name.length>70){this._status("Saisissez un nom de liste valide.",true);return;}
   this._busy=true;this._render();
   try{
    // Config flow officiel de l'intégration Local to-do : crée une liste persistante,
    // pas un fichier YAML ni une simple carte sans entité HA.
    const start=await this._hass.callApi("POST","config/config_entries/flow",{handler:"local_todo"});
    if(start?.type!=="form"||!start?.flow_id)
      throw Error("Home Assistant n'a pas ouvert la création de liste Local to-do.");
    const finish=await this._hass.callApi(
      "POST","config/config_entries/flow/"+encodeURIComponent(start.flow_id),
      {todo_list_name:name});
    if(finish?.type!=="create_entry")
      throw Error("La création n'est pas terminée ("+(finish?.type||"réponse inconnue")+").");
    this._newName="";
    this._notice="Liste créée dans Home Assistant. Quand elle apparaît dans les choix, cochez-la puis enregistrez (3 maximum).";
    this._error="";
   }catch(e){this._error=e?.message||String(e);this._notice="";}
   finally{this._busy=false;this._render();}
  }
  async _save(){
   if(this._busy||!this._hass?.user?.is_admin)return;
   const zones=[...this._selectedPositions],todos=[...this._selectedTodos];
   if(!zones.length||zones.length>15){this._status("Choisissez entre 1 et 15 positions.",true);return;}
   if(todos.length>3){this._status("Trois listes maximum.",true);return;}
   if(!todos.every(id=>this._hass.states?.[id]&&id.startsWith("todo."))){
     this._status("Une liste a disparu de Home Assistant. Rechargez les réglages.",true);return;
   }
   this._busy=true;this._render();
   try{
    const before=await this._hass.callWS({type:"lovelace/config",url_path:"kimia-next"});
    const after=clone(before);
    const views=new Map((after.views||[]).map(v=>[v.path,v]));
    const map=cards(views.get("carte")).find(c=>c.type==="map");
    const listView=views.get("listes");
    if(!map||!listView?.sections)throw Error("Vues KIMIA Carte et Listes introuvables.");
    map.entities=zones;map.show_all=false;
    const existing=cards(listView).filter(c=>c.type==="todo-list");
    const unmanaged=existing.filter(c=>!isManaged(c));
    // Les tuiles personnelles ne sont jamais supprimées ni modifiées.
    const manualUnselected=unmanaged.filter(c=>!todos.includes(c.entity));
    if(manualUnselected.length)
      throw Error("Une liste modifiée manuellement est présente : retirez-la depuis l'éditeur HA avant de changer son affichage. Aucune carte personnalisée n'a été effacée.");
    const firstSection=listView.sections.find(s=>s.cards?.some(c=>
      c.type==="todo-list"||c.type==="markdown"&&c.content===placeholder));
    if(!firstSection)throw Error("Section de listes introuvable. Modifications automatiques refusées.");
    // Retirer uniquement les cartes standard reconnues comme générées par KIMIA.
    for(const section of listView.sections||[]){
      if(!Array.isArray(section.cards))continue;
      section.cards=section.cards.filter(c=>!isManaged(c)&&!(
        c.type==="markdown"&&c.content===placeholder&&todos.length));
    }
    const already=new Set(unmanaged.map(c=>c.entity));
    for(const id of todos){
      if(already.has(id))continue;
      firstSection.cards.push({type:"todo-list",entity:id,
        title:"KIMIA · "+(this._todoNames.get(id)||id),
        grid_options:{columns:12,rows:"auto"}});
      already.add(id);
    }
    const check=await this._hass.callWS({type:"lovelace/config",url_path:"kimia-next"});
    if(JSON.stringify(check)!==JSON.stringify(before))
      throw Error("Le dashboard a changé pendant l'édition. Réessayez.");
    if(JSON.stringify(before)!==JSON.stringify(after)){
      await this._hass.callWS({type:"lovelace/config/save",url_path:"kimia-next",config:after});
    }
    this._notice="Carte et "+todos.length+" liste(s) enregistrées. Les cartes personnelles ont été préservées.";
    this._error="";
   }catch(e){this._error=e?.message||String(e);this._notice="";}
   finally{this._busy=false;this._render();}
  }
 }
 customElements.define(TAG,KConfig);
 window.customCards=window.customCards||[];
 if(!window.customCards.some(c=>c.type===TAG))
  window.customCards.push({type:TAG,name:"KIMIA · Carte et listes V1.5",
   description:"Sélection par cases, création locale et trois listes empilées."});
})();