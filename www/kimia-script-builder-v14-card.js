/* KIMIA V1.4 — créateur visuel de scripts Home Assistant.
 * Administrateur uniquement. Aucun script existant n'est modifié ni supprimé.
 * Écrit via l'API officielle de configuration des scripts (hass.callApi).
 */
(() => {
 "use strict";
 const TAG="kimia-script-builder-v14-card";
 if(customElements.get(TAG))return;
 const TYPES={
  light:{on:"light.turn_on",off:"light.turn_off"},
  switch:{on:"switch.turn_on",off:"switch.turn_off"},
  cover:{ouvrir:"cover.open_cover",fermer:"cover.close_cover"},
  media_player:{lecture:"media_player.media_play",pause:"media_player.media_pause"},
  climate:{temperature:"climate.set_temperature"}
 };
 const names={on:"Allumer",off:"Éteindre",ouvrir:"Ouvrir",fermer:"Fermer",
  lecture:"Lire",pause:"Pause",temperature:"Régler la température"};
 const slug=s=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,46);
 const node=(tag,text,cls)=>{
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=text;
  if(cls)e.className=cls;
  return e;
 };
 class Builder extends HTMLElement{
  constructor(){
   super();this.attachShadow({mode:"open"});this._hass=null;this._steps=[];this._busy=false;
   const style=node("style");
   style.textContent="ha-card{display:block;padding:18px;border-radius:17px}h2{font-size:20px;margin:0 0 6px}p{font-size:13px;color:var(--secondary-text-color)}.row{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;align-items:center}.step{border:1px solid var(--divider-color);padding:10px;border-radius:10px;margin:9px 0}.grow{flex:1;min-width:165px}input,select{background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:8px;padding:10px;font-size:14px;max-width:100%}button{background:var(--primary-color);border:0;border-radius:9px;color:white;padding:10px 13px;font-weight:600;cursor:pointer}button.sub{background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color)}button:disabled{opacity:.5;cursor:not-allowed}.error{color:var(--error-color,#b33)}";
   this._card=node("ha-card");this._card.append(node("h2","Créer un scénario"),node("p","Composez les actions de vos appareils. Le script sera enregistré dans Home Assistant, puis disponible dans la liste des raccourcis KIMIA."));
   this._name=node("input");this._name.placeholder="Nom du scénario (ex. Bonne nuit)";this._name.className="grow";this._name.maxLength=60;
   this._stepsBox=node("div");
   this._feedback=node("p");this._feedback.setAttribute("aria-live","polite");
   this._add=node("button","+ Ajouter une action","sub");
   this._delay=node("button","+ Ajouter une attente","sub");
   this._save=node("button","Créer le scénario");
   this._add.onclick=()=>{if(this._steps.length>=12)return;this._steps.push({kind:"action",entity:"",operation:""});this._draw();};
   this._delay.onclick=()=>{if(this._steps.length>=12)return;this._steps.push({kind:"delay",seconds:10});this._draw();};
   this._save.onclick=()=>void this._create();
   const bar=node("div");bar.className="row";bar.append(this._add,this._delay,this._save);
   const top=node("div");top.className="row";top.append(this._name);
   this._card.append(top,this._stepsBox,bar,this._feedback);
   this.shadowRoot.append(style,this._card);
  }
  setConfig(config){this._config=config||{};}
  set hass(hass){this._hass=hass;if(!this._drawn){this._drawn=true;this._draw();}}
  getCardSize(){return 8;}
  _error(msg,fail=false){this._feedback.textContent=msg;this._feedback.className=fail?"error":"";}
  _entities(){
   return Object.keys(this._hass?.states||{}).filter(id=>TYPES[id.split(".")[0]] &&
    this._hass.states[id].state!=="unavailable").sort();
  }
  _draw(){
   const admin=this._hass?.user?.is_admin===true;
   this._name.disabled=!admin||this._busy;this._add.disabled=!admin||this._busy||this._steps.length>=12;
   this._delay.disabled=this._add.disabled;this._save.disabled=!admin||this._busy;
   this._stepsBox.replaceChildren();
   if(!admin){this._error("Réservé à l'administrateur KIMIA.",true);return;}
   const entities=this._entities();
   this._steps.forEach((step,i)=>{
    const box=node("div");box.className="step";const top=node("div");top.className="row";
    top.append(node("strong",String(i+1)+". "+(step.kind==="delay"?"Attente":"Action")));
    const remove=node("button","Supprimer","sub");remove.disabled=this._busy;
    remove.onclick=()=>{this._steps.splice(i,1);this._draw();};top.append(remove);box.append(top);
    const row=node("div");row.className="row";
    if(step.kind==="delay"){
     const field=node("input");field.type="number";field.min="1";field.max="3600";field.step="1";field.value=String(step.seconds);field.disabled=this._busy;
     field.onchange=()=>{step.seconds=Number(field.value);};row.append(node("span","Durée (secondes)"),field);
    } else {
     const select=node("select");select.className="grow";select.disabled=this._busy;
     const none=node("option","Choisir un appareil");none.value="";select.append(none);
     for(const id of entities){const option=node("option",this._hass.states[id].attributes.friendly_name||id);option.value=id;select.append(option);}
     select.value=step.entity||"";
     select.onchange=()=>{step.entity=select.value;step.operation="";this._draw();};
     const op=node("select");op.disabled=this._busy;
     const domain=(step.entity||"").split(".")[0];
     const choices=TYPES[domain]||{};
     for(const key of Object.keys(choices)){const opt=node("option",names[key]);opt.value=key;op.append(opt);}
     step.operation=(step.operation&&choices[step.operation])?step.operation:Object.keys(choices)[0]||"";
     op.value=step.operation;op.onchange=()=>{step.operation=op.value;this._draw();};
     row.append(select,op);
     if(step.operation==="temperature"){
      const temp=node("input");temp.type="number";temp.min="10";temp.max="35";temp.step=".5";
      temp.value=String(step.temperature??22);temp.disabled=this._busy;
      temp.onchange=()=>{step.temperature=Number(temp.value);};row.append(temp,node("span","°C"));
     }
    }
    box.append(row);this._stepsBox.append(box);
   });
  }
  _sequence(){
   return this._steps.map((s,i)=>{
    if(s.kind==="delay"){
     if(!Number.isInteger(s.seconds)||s.seconds<1||s.seconds>3600)throw Error("Attente n°"+(i+1)+" invalide (1–3600 s).");
     return {delay:{seconds:s.seconds}};
    }
    const [domain]=s.entity.split(".");
    const action=TYPES[domain]?.[s.operation];
    if(!action||!this._hass.states[s.entity])throw Error("Appareil/action n°"+(i+1)+" invalide.");
    const item={action,target:{entity_id:s.entity}};
    if(s.operation==="temperature"){
     const temp=s.temperature??22;
     if(!Number.isFinite(temp)||temp<10||temp>35)throw Error("Température n°"+(i+1)+" invalide.");
     item.data={temperature:temp};
    }
    return item;
   });
  }
  async _create(){
   if(this._hass?.user?.is_admin!==true||this._busy)return;
   const alias=this._name.value.trim();
   const id="ks_"+slug(alias);
   if(alias.length<3||id==="ks_"){this._error("Donnez un nom d'au moins 3 caractères.",true);return;}
   if(this._hass.states["script."+id]){this._error("Un scénario de ce nom existe déjà. Aucun écrasement.",true);return;}
   if(!this._steps.length){this._error("Ajoutez au moins une action.",true);return;}
   let sequence;try{sequence=this._sequence();}catch(e){this._error(e.message,true);return;}
   if(typeof this._hass.callApi!=="function"){this._error("API HA indisponible. Création impossible.",true);return;}
   this._busy=true;this._draw();this._error("Enregistrement dans Home Assistant…");
   try{
    await this._hass.callApi("POST","config/script/config/"+encodeURIComponent(id),{
     alias,icon:"mdi:play-box-multiple-outline",mode:"single",sequence
    });
    this._steps=[];this._name.value="";this._error("Scénario créé : "+alias+". Il apparaîtra dans « Mes scénarios » dès sa disponibilité dans HA.");
   }catch(e){this._error("Création refusée : "+(e?.message||String(e)),true);}
   finally{this._busy=false;this._draw();}
  }
 }
 customElements.define(TAG,Builder);
 window.customCards=window.customCards||[];
 window.customCards.push({type:TAG,name:"KIMIA · Créer un scénario V1.4",description:"Composer un script Home Assistant sans YAML"});
})();