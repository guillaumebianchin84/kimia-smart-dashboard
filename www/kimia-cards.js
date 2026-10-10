/* KIMIA Smart — prototype 0.3 : configuration et classement automatiques.
 * Dépend uniquement des API WebSocket officielles de Home Assistant.
 * Les modifications des registres sont restreintes aux administrateurs HA.
 */
const KIMIA_TYPES = {
  lights:["Lumières","light","💡"],
  covers:["Volets","cover","🪟"],
  plugs:["Prises","switch","🔌"],
  climate:["Climatisation","climate","❄️"],
  media:["Enceintes","media_player","🔊"],
  cameras:["Caméras","camera","📷"],
  security:["Sécurité","binary_sensor","🛡️"]
};
const KIMIA_CSS = ':host{display:block}ha-card{display:block;padding:16px;border-radius:16px;color:var(--primary-text-color)}h3{margin:0 0 8px;color:var(--primary-color)}p{line-height:1.45;font-size:13px}label{font-size:12px;font-weight:700;display:block;margin:12px 0 5px}select,input{box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--divider-color,#ddd);border-radius:10px;background:var(--card-background-color,#fff);color:var(--primary-text-color);font:inherit}button{border:0;border-radius:10px;background:var(--primary-color,#0b5687);color:white;padding:10px 12px;margin:4px 4px 4px 0;cursor:pointer}button.alt{background:var(--secondary-background-color,#e6f2f4);color:var(--primary-text-color)}.row{padding:10px 0;border-top:1px solid var(--divider-color,#eee);display:flex;align-items:center;gap:8px}.main{flex:1;min-width:0;cursor:pointer}.name{font-size:14px;font-weight:700;overflow-wrap:anywhere}.sub{font-size:12px;opacity:.7}.group{font-size:14px;font-weight:700;margin:16px 0 4px;color:var(--primary-color)}.note{background:var(--secondary-background-color,#e6f2f4);padding:10px;border-radius:10px;font-size:12px;margin:10px 0}.buttons{display:flex;flex-wrap:wrap}.msg{white-space:pre-wrap;font-size:12px;font-weight:600;margin:10px 0}';
function make(tag,value,cls) {
  const n=document.createElement(tag);
  if(value!==null&&value!==undefined)n.textContent=String(value);
  if(cls)n.className=cls;
  return n;
}
function button(text,fn,alt) {
  const n=make('button',text,alt?'alt':'');
  n.type='button';n.addEventListener('click',fn);return n;
}
function dropdown(options,value) {
  const select=make('select');
  for(const [id,name] of options){const opt=make('option',name);opt.value=id;select.append(opt);}
  if(value!==undefined)select.value=value;
  return select;
}
function field(root,title,control) {
  const l=make('label',title);root.append(l,control);
}
function areaFor(entity,devices) {
  if(entity.area_id)return entity.area_id;
  const device=devices.find(d=>d.id===entity.device_id);
  return device?.area_id||null;
}
function typeFor(entity,states,labels) {
  const manually=(entity.labels||[]).map(id=>labels.find(l=>l.label_id===id)?.name||'')
    .find(name=>name.startsWith('KIMIA · '));
  if(manually){
    return Object.keys(KIMIA_TYPES).find(k=>'KIMIA · '+KIMIA_TYPES[k][0]===manually)||'';
  }
  const domain=entity.entity_id?.split('.')[0];
  if(domain==='binary_sensor'){
    const valid=['door','window','opening','motion','occupancy','moisture','smoke','gas','problem','safety','tamper','presence'];
    return valid.includes(states[entity.entity_id]?.attributes?.device_class)?'security':'';
  }
  return Object.keys(KIMIA_TYPES).find(k=>KIMIA_TYPES[k][1]===domain)||'';
}
class KimiaCardBase extends HTMLElement {
  constructor(){
    super();this.attachShadow({mode:'open'});this.box=make('ha-card');
    this.shadowRoot.append(make('style',KIMIA_CSS),this.box);
  }
  setConfig(config){this.cfg=config;this.draw();}
  set hass(value){
    this.ha=value;
    const count=Object.keys(value.states||{}).length;
    if(this.previousCount!==count){this.previousCount=count;this.refresh();}
    else if(this.tagName!=='KIMIA-SETUP-CARD')this.draw();
  }
  connectedCallback(){
    this.listener=()=>this.refresh(true);
    window.addEventListener('kimia-refresh',this.listener);
    this.timer=setInterval(()=>this.refresh(),45000);
    if(this.ha)this.refresh();
  }
  disconnectedCallback(){window.removeEventListener('kimia-refresh',this.listener);clearInterval(this.timer);}
  async refresh(force){
    if(!this.ha||this.loading)return;
    if(!force&&this.last&&Date.now()-this.last<4000)return;
    this.loading=true;
    try{
      const names=['area_registry','device_registry','entity_registry','label_registry'];
      const results=await Promise.all(names.map(n=>this.ha.callWS({type:'config/'+n+'/list'})));
      [this.areas,this.devices,this.entities,this.labels]=results;
      this.last=Date.now();this.error=null;
    }catch(err){this.error=String(err?.message||err);}
    finally{this.loading=false;this.draw();}
  }
  head(title){
    this.box.replaceChildren(make('h3',title));
    if(this.error)this.box.append(make('div','Erreur de lecture : '+this.error,'note'));
  }
  getCardSize(){return 3;}
}
class KimiaAutoCard extends KimiaCardBase {
  setConfig(config){
    if(!KIMIA_TYPES[config.category])throw Error('Catégorie KIMIA inconnue');
    super.setConfig(config);
  }
  draw(){
    if(!this.cfg||!this.box)return;
    const category=this.cfg.category;
    this.head(KIMIA_TYPES[category][2]+' '+KIMIA_TYPES[category][0]);
    if(!this.ha||!this.entities)return;
    const areas=new Map(this.areas.map(a=>[a.area_id,a.name]));
    const rows=this.entities.filter(e=>e.entity_id&&this.ha.states[e.entity_id]
      &&!e.disabled_by&&!e.hidden_by&&!e.entity_category
      &&typeFor(e,this.ha.states,this.labels)===category)
      .map(e=>({e,state:this.ha.states[e.entity_id],room:areas.get(areaFor(e,this.devices))||'Sans pièce'}))
      .sort((a,b)=>a.room.localeCompare(b.room,'fr')||
        (a.state.attributes.friendly_name||a.e.entity_id).localeCompare(b.state.attributes.friendly_name||b.e.entity_id,'fr'));
    if(!rows.length){this.box.append(make('p','Aucun appareil dans cette rubrique. Ajoutez-en un depuis Configuration KIMIA.'));return;}
    let last='';
    for(const r of rows){
      if(r.room!==last){last=r.room;this.box.append(make('div',last,'group'));}
      const row=make('div',null,'row');
      const main=make('div',null,'main');
      main.append(make('div',r.state.attributes.friendly_name||r.e.entity_id,'name'),
        make('div',r.state.state,'sub'));
      main.addEventListener('click',()=>this.dispatchEvent(new CustomEvent('hass-more-info',{bubbles:true,composed:true,detail:{entityId:r.e.entity_id}})));
      row.append(main);
      const domain=r.e.entity_id.split('.')[0];
      if(['light','switch'].includes(domain)){
        const on=r.state.state==='on';
        row.append(button(on?'Éteindre':'Allumer',()=>this.ha.callService(domain,on?'turn_off':'turn_on',{entity_id:r.e.entity_id}),true));
      } else if(domain==='cover'){
        row.append(button('Ouvrir',()=>this.ha.callService('cover','open_cover',{entity_id:r.e.entity_id}),true));
        row.append(button('Fermer',()=>this.ha.callService('cover','close_cover',{entity_id:r.e.entity_id}),true));
      }
      this.box.append(row);
    }
  }
}
customElements.define('kimia-auto-card',KimiaAutoCard);

class KimiaSetupCard extends KimiaCardBase {
  draw(){
    if(!this.box||!this.ha)return;
    this.head('⚙️ Ajouter et organiser mes équipements');
    if(!this.ha.user?.is_admin){
      this.box.append(make('p','Configuration réservée aux administrateurs KIMIA Smart.'));return;
    }
    this.box.append(make('p','1. Associer  2. Choisir la pièce  3. Classer : les équipements apparaissent ensuite dans les pages correspondantes.'));
    const actions=make('div',null,'buttons');
    actions.append(
      button('Associer un Zigbee (120 s)',async()=>{
        try{await this.ha.callService('zha','permit',{duration:120});
          this.message('Zigbee ouvert 120 secondes. Mettez l’appareil en mode association, puis actualisez la liste.');
        }catch(err){this.message('ZHA doit être installé : '+(err.message||err));}
      }),
      button('Ajouter Wi-Fi / caméra',()=>window.location.assign('/config/integrations'),true),
      button('Actualiser',()=>this.refresh(true),true)
    );
    this.box.append(actions,make('div','Pour Google Cast et les caméras, l’association initiale utilise encore les intégrations officielles Home Assistant.','note'));
    if(!this.devices||!this.areas||!this.entities)return;
    const roomName=make('input');roomName.placeholder='Exemple : Chambre enfants';
    field(this.box,'Nouvelle pièce',roomName);
    this.box.append(button('Créer la pièce',async()=>{
      const name=roomName.value.trim();
      if(!name)return this.message('Saisissez un nom de pièce.');
      if(this.areas.some(a=>a.name.toLowerCase()===name.toLowerCase()))return this.message('Cette pièce existe déjà.');
      try{await this.ha.callWS({type:'config/area_registry/create',name});
        this.message('Pièce créée : '+name);await this.refresh(true);
      }catch(err){this.message('Erreur : '+(err.message||err));}
    },true));
    const devices=this.devices.filter(d=>!d.disabled_by).sort((a,b)=>(a.name_by_user||a.name||'').localeCompare(b.name_by_user||b.name||'','fr'));
    if(!devices.length){this.box.append(make('p','Aucun équipement détecté.'));return;}
    const device=dropdown(devices.map(d=>[d.id,(d.name_by_user||d.name||'Appareil')+' · '+(d.model||'')]),this.selectedDevice||devices[0].id);
    if(!devices.some(d=>d.id===device.value))device.value=devices[0].id;
    const name=make('input');
    const area=dropdown([['','Sélectionner une pièce'],...this.areas.map(a=>[a.area_id,a.name])],this.selectedArea||'');
    const entity=dropdown([]);
    const category=dropdown(Object.entries(KIMIA_TYPES).map(([id,t])=>[id,t[0]]),this.selectedCategory||'lights');
    field(this.box,'Appareil détecté',device);
    field(this.box,'Nom personnalisé (facultatif)',name);
    field(this.box,'Pièce',area);
    field(this.box,'Fonction à classer',entity);
    field(this.box,'Afficher dans',category);
    const resetEntity=()=>{
      entity.replaceChildren();
      const entries=this.entities.filter(e=>e.device_id===device.value&&
        !e.disabled_by&&!e.hidden_by&&!e.entity_category&&this.ha.states[e.entity_id]);
      for(const e of entries){const o=make('option',(this.ha.states[e.entity_id].attributes.friendly_name||e.entity_id)+' · '+e.entity_id);o.value=e.entity_id;entity.append(o);}
      const found=this.devices.find(d=>d.id===device.value);
      name.value=found?.name_by_user||'';
      area.value=found?.area_id||'';
      if(this.selectedEntity&&entries.some(e=>e.entity_id===this.selectedEntity))entity.value=this.selectedEntity;
      if(entries.length)category.value=typeFor(entries.find(e=>e.entity_id===entity.value),this.ha.states,this.labels)||'plugs';
    };
    device.addEventListener('change',()=>{this.selectedDevice=device.value;this.selectedEntity=null;resetEntity();});
    entity.addEventListener('change',()=>{this.selectedEntity=entity.value;const entry=this.entities.find(e=>e.entity_id===entity.value);category.value=typeFor(entry,this.ha.states,this.labels)||'plugs';});
    category.addEventListener('change',()=>{this.selectedCategory=category.value;});
    resetEntity();
    this.box.append(button('Enregistrer cet équipement',async()=>{
      if(!area.value)return this.message('Choisissez d’abord une pièce.');
      if(!entity.value)return this.message('Aucune fonction disponible sur cet appareil.');
      try{
        const data={type:'config/device_registry/update',device_id:device.value,area_id:area.value};
        if(name.value.trim())data.name_by_user=name.value.trim();
        await this.ha.callWS(data);
        const labelName='KIMIA · '+KIMIA_TYPES[category.value][0];
        let label=this.labels.find(l=>l.name===labelName);
        if(!label){
          await this.ha.callWS({type:'config/label_registry/create',name:labelName});
          this.labels=await this.ha.callWS({type:'config/label_registry/list'});
          label=this.labels.find(l=>l.name===labelName);
        }
        if(!label)throw Error('Impossible de créer la rubrique.');
        const current=this.entities.find(e=>e.entity_id===entity.value);
        const autoIds=new Set(this.labels.filter(l=>l.name.startsWith('KIMIA · ')).map(l=>l.label_id));
        const retained=(current.labels||[]).filter(id=>!autoIds.has(id));
        await this.ha.callWS({type:'config/entity_registry/update',entity_id:entity.value,labels:[...retained,label.label_id]});
        this.message('Enregistré : '+KIMIA_TYPES[category.value][0]+'.');
        window.dispatchEvent(new Event('kimia-refresh'));
      }catch(err){this.message('Enregistrement impossible : '+(err.message||err));}
    }));
    this.status=make('div',this.statusText||'','msg');this.box.append(this.status);
  }
  message(text){this.statusText=text;if(this.status)this.status.textContent=text;}
}
customElements.define('kimia-setup-card',KimiaSetupCard);
