/* KIMIA Smart by PROMAINT — Atelier IA pour automations/scripts et diagnostic HA.
 * Premier périmètre sûr : éclairages / scènes, déclencheurs présence / heure.
 * L'IA n'écrit jamais directement la configuration : compilation whitelist et confirmation admin.
 */
(() => {
 "use strict";
 const CARD="kimia-ai-automation-studio-v1-card";
 if(customElements.get(CARD))return;
 const CSS=String.raw`
 :host{display:block;color:var(--primary-text-color)}
 ha-card{padding:18px;border-radius:16px;margin-bottom:12px}
 h3{margin:0 0 10px;font-size:18px}h4{margin:12px 0 6px}
 p{font-size:13px;line-height:1.55;margin:8px 0}
 .hint{color:var(--secondary-text-color)}
 label{display:block;font-size:13px;font-weight:600;margin:12px 0 5px}
 textarea,select{width:100%;box-sizing:border-box;background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:10px;padding:10px;font:inherit}
 textarea{min-height:98px;resize:vertical}
 .buttons{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
 button{cursor:pointer;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:10px;padding:11px 14px;font:inherit}
 button.primary{background:var(--primary-color);color:white;border:0}
 button:disabled{opacity:.45;cursor:wait}
 pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--secondary-background-color);padding:13px;border-radius:10px;font-size:12px;max-height:380px;overflow:auto}
 .status{font-size:13px;white-space:pre-wrap;margin-top:12px}
 .error{color:var(--error-color,#c33)}
 .data{border-left:3px solid var(--divider-color);padding-left:10px;margin-top:10px;font-size:13px;white-space:pre-wrap}
 .warning{font-size:12px;color:var(--secondary-text-color)}
 `;
 const DOMAIN_ACTIONS={
   light:new Set(["turn_on","turn_off"]),
   scene:new Set(["turn_on"])
 };
 const FORMATS={
   time:/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
   id:/^(?:light|scene|binary_sensor)\.[a-z0-9_]+$/
 };
 const err=e=>{
   const v=e?.message||e?.body?.message||e;
   if(typeof v==="string")return v;
   try{return JSON.stringify(v).slice(0,500);}catch(_){return "Erreur non lisible";}
 };
 const short=s=>String(s||"").trim().slice(0,75);
 const normalizeTime=s=>{
   if(!FORMATS.time.test(String(s||"")))throw Error("Horaire invalide : "+s);
   return s.length===5?s+":00":s;
 };
 const parseJson=v=>{
   if(v&&typeof v==="object"){
     if(v.data!==undefined)return parseJson(v.data);
     return v;
   }
   const input=String(v||"").trim(),a=input.indexOf("{"),b=input.lastIndexOf("}");
   if(a<0||b<=a)throw Error("Gemini n'a pas renvoyé de JSON.");
   return JSON.parse(input.slice(a,b+1));
 };
 function compile(raw,kind,entities){
   const input=parseJson(raw);
   const name=short(input.name);
   if(!name||name.length<3)throw Error("Nom d'automatisation trop court.");
   if(!Array.isArray(input.actions)||input.actions.length<1||input.actions.length>6)
     throw Error("Il faut de 1 à 6 actions.");
   const allowed=new Set(entities.map(e=>e.entity_id));
   const actions=input.actions.map((act,i)=>{
     if(act&&act.type==="delay"){
       const seconds=Number(act.seconds);
       if(!Number.isInteger(seconds)||seconds<1||seconds>300)
         throw Error("Pause hors limites (1 à 300 s), action "+(i+1));
       return {delay:{seconds}};
     }
     const entity=String(act?.entity_id||"");
     const domain=entity.split(".")[0],service=String(act?.service||"");
     if(!FORMATS.id.test(entity)||!allowed.has(entity))
       throw Error("Appareil absent de la liste autorisée : "+entity);
     if(!DOMAIN_ACTIONS[domain]?.has(service))
       throw Error("Action non autorisée : "+domain+"."+service);
     const output={action:domain+"."+service,target:{entity_id:entity}};
     if(domain==="light"&&service==="turn_on"&&act.brightness_pct!=null){
       const pct=Number(act.brightness_pct);
       if(!Number.isInteger(pct)||pct<1||pct>100)
         throw Error("Intensité lumineuse invalide (1 à 100).");
       output.data={brightness_pct:pct};
     }
     return output;
   });
   const base={alias:"KIMIA · "+name,
     description:"Créé avec l'atelier IA KIMIA. Vérifié par l'utilisateur avant sauvegarde.",
     mode:"single"};
   if(kind==="script")return {type:"script",config:{...base,sequence:actions},
     explanation:"Script manuel : ne s'exécute que sur demande."};
   if(kind!=="automation")throw Error("Type de création inconnu.");
   const tr=input.trigger;
   if(!tr||typeof tr!=="object")throw Error("Déclencheur manquant.");
   let trigger;
   if(tr.type==="time"){
     trigger={trigger:"time",at:normalizeTime(tr.at)};
   }else if(tr.type==="state"){
     const entity=String(tr.entity_id||"");
     if(!entity.startsWith("binary_sensor.")||!allowed.has(entity))
       throw Error("Déclencheur non autorisé : capteur de présence uniquement.");
     const state=entities.find(e=>e.entity_id===entity);
     const kind=state?.attributes?.device_class||"";
     if(!["motion","occupancy","presence"].includes(kind))
       throw Error("Le capteur doit être de type présence ou mouvement.");
     if(!["on","off"].includes(tr.to))throw Error("État de déclenchement invalide.");
     trigger={trigger:"state",entity_id:entity,to:tr.to};
     if(tr.for_minutes!=null){
       const mins=Number(tr.for_minutes);
       if(!Number.isInteger(mins)||mins<1||mins>120)
         throw Error("La durée de présence doit être comprise entre 1 et 120 minutes.");
       trigger.for={minutes:mins};
     }
   }else throw Error("Déclencheur non pris en charge.");
   const conditions=[];
   if(input.time_window!=null){
     const w=input.time_window;
     if(!w||typeof w!=="object")throw Error("Plage horaire invalide.");
     conditions.push({condition:"time",after:normalizeTime(w.after),before:normalizeTime(w.before)});
   }
   return {type:"automation",config:{...base,initial_state:false,
     triggers:[trigger],conditions,actions},
     explanation:"Automatisation enregistrée DÉSACTIVÉE. Relire et activer manuellement dans Home Assistant."};
 }
 function aiEntityList(states){
   return Object.values(states||{}).filter(s=>{
     if(!s?.entity_id||["unavailable","unknown"].includes(s.state))return false;
     const domain=s.entity_id.split(".")[0];
     return domain==="light"||domain==="scene"||
       (domain==="binary_sensor"&&["motion","occupancy","presence"].includes(s.attributes?.device_class));
   }).sort((a,b)=>a.entity_id.localeCompare(b.entity_id));
 }
 function compilePrompt(kind,request,entities){
   return [
     "Tu es KIMIA Smart, assistant de configuration Home Assistant.",
     "Propose exactement UN "+(kind==="script"?"script":"automatisation")+" de CONFORT.",
     "Demande utilisateur : "+request,
     "Tu dois répondre UNIQUEMENT avec un JSON, sans bloc Markdown.",
     "Structure JSON : {\"name\":\"Nom court\",\"trigger\":{\"type\":\"state\",\"entity_id\":\"binary_sensor.xxx\",\"to\":\"on\",\"for_minutes\":5},\"time_window\":{\"after\":\"19:00\",\"before\":\"23:00\"},\"actions\":[{\"entity_id\":\"light.xxx\",\"service\":\"turn_on\",\"brightness_pct\":40}]}",
     "Pour déclencheur horaire, utiliser {\"type\":\"time\",\"at\":\"19:00\"}. Pour un script, ne pas fournir trigger.",
     "Les conditions time_window sont facultatives ; pas d'autres conditions.",
     "Actions autorisées : light.turn_on (brightness_pct facultatif), light.turn_off, scene.turn_on, et pause {\"type\":\"delay\",\"seconds\":30} (1 à 300 s).",
     "Maximum six actions. N'invente jamais un entity_id. Voici la seule liste autorisée :",
     JSON.stringify(entities.map(s=>({entity_id:s.entity_id,
       name:s.attributes?.friendly_name||s.entity_id,
       device_class:s.attributes?.device_class||null}))),
     "Pas de YAML brut, pas de template Jinja, pas de commandes système, pas de chauffage, prises électriques, volets, alarmes ni serrures.",
     "Si la demande sort du périmètre autorisé, réponds au format {\"error\":\"Explication en français\"}."
   ].join("\n");
 }
 function getPlan(resp,kind,entities){
   const input=parseJson(resp);
   if(input.error)throw Error("Gemini : "+short(input.error));
   return compile(input,kind,entities);
 }
 function safeNode(tag,text,cls){
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(text!==undefined)el.textContent=text;
   return el;
 }
 class Studio extends HTMLElement{
   constructor(){
     super();this.attachShadow({mode:"open"});
     this.busy=false;this.draft=null;this.draftId=0;
   }
   setConfig(c){this.config=c||{};this.render();}
   set hass(h){this._hass=h;if(!this.built)this.render();}
   connectedCallback(){this.render();}
   render(){
     if(this.built||!this._hass)return;
     this.built=true;
     const root=this.shadowRoot;
     root.innerHTML="<style>"+CSS+"</style>"+
     "<ha-card><h3>✨ Atelier IA — scripts et automatisations</h3>"+
     "<p class='hint'>Explique ce que tu souhaites. Gemini prépare une proposition ; KIMIA vérifie les appareils et les commandes autorisées. Rien n'est enregistré sans ton accord.</p>"+
     "<label>Type de création</label><select class='kind'><option value='automation'>Automatisation</option><option value='script'>Script</option></select>"+
     "<label>Modèle IA</label><select class='model'></select>"+
     "<label>Explique ton besoin</label><textarea class='request' placeholder='Exemple : après 19 h, quand le salon détecte une présence, allumer la lampe à 40 %.'></textarea>"+
     "<p class='warning'>Première version : éclairages, scènes et capteurs de présence. Pas de chauffage, prises électriques ou équipements de sécurité.</p>"+
     "<div class='buttons'><button class='primary propose'>Proposer avec Gemini</button><button class='save' disabled>Enregistrer après validation</button><button class='manual'>Création manuelle</button></div>"+
     "<h4>Proposition vérifiée</h4><p class='explanation hint'>Aucune proposition pour le moment.</p><pre class='preview' hidden></pre><p class='status' role='status'></p></ha-card>";
     this.kind=root.querySelector(".kind");
     this.model=root.querySelector(".model");
     this.request=root.querySelector(".request");
     this.propose=root.querySelector(".propose");
     this.save=root.querySelector(".save");
     this.preview=root.querySelector(".preview");
     this.note=root.querySelector(".explanation");
     this.status=root.querySelector(".status");
     const tasks=Object.values(this._hass.states||{}).filter(s=>s.entity_id?.startsWith("ai_task.")&&s.state!=="unavailable");
     for(const task of tasks){
       const opt=document.createElement("option");opt.value=task.entity_id;
       opt.textContent=task.attributes?.friendly_name||task.entity_id;
       this.model.append(opt);
     }
     const google=tasks.find(t=>/gemini|google/i.test((t.attributes?.friendly_name||"")+" "+t.entity_id));
     if(google)this.model.value=google.entity_id;
     this.propose.disabled=this._hass.user?.is_admin!==true||!tasks.length;
     this.save.disabled=true;
     this.propose.addEventListener("click",()=>this.generate());
     this.save.addEventListener("click",()=>this.persist());
     this.request.addEventListener("input",()=>this.clear());
     this.kind.addEventListener("change",()=>this.clear());
     this.model.addEventListener("change",()=>this.clear());
     root.querySelector(".manual").addEventListener("click",()=>{
       window.location.href="/kimia-admin-next/scenarios";
     });
   }
   say(msg,bad=false){
     this.status.textContent=msg;
     this.status.className="status"+(bad?" error":"");
   }
   clear(){
     this.draft=null;this.draftId++;
     this.save.disabled=true;this.preview.hidden=true;
     this.note.textContent="Aucune proposition validée.";
   }
   async generate(){
     if(this.busy||this._hass?.user?.is_admin!==true)return;
     const request=this.request.value.trim();
     if(request.length<12)return this.say("Décris ton besoin plus précisément.",true);
     const kind=this.kind.value,entities=aiEntityList(this._hass.states);
     if(!entities.length)return this.say("Aucun éclairage ou capteur utilisable détecté.",true);
     this.busy=true;this.propose.disabled=true;this.save.disabled=true;
     const generation=++this.draftId;this.draft=null;
     try{
       this.say("Gemini prépare une proposition…");
       const data={task_name:"KIMIA création de routines",instructions:compilePrompt(kind,request,entities),entity_id:this.model.value};
       const response=await this._hass.callApi("POST","services/ai_task/generate_data?return_response",data);
       if(generation!==this.draftId)return;
       const plan=getPlan(response?.service_response?.data,kind,entities);
       this.draft=plan;
       this.preview.textContent=JSON.stringify(plan.config,null,2);
       this.preview.hidden=false;
       this.note.textContent=plan.explanation;
       this.save.disabled=false;
       this.say("Proposition validée sur les règles de sécurité KIMIA. Lis-la avant de sauvegarder.");
     }catch(error){this.clear();this.say("Proposition refusée : "+err(error),true);}
     finally{this.busy=false;this.propose.disabled=this._hass?.user?.is_admin!==true||!this.model.value;}
   }
   async persist(){
     if(this.busy||!this.draft||this._hass?.user?.is_admin!==true)return;
     const plan=this.draft;
     const verb=plan.type==="automation"?"AUTOMATISATION désactivée":"SCRIPT manuel";
     if(!window.confirm("Enregistrer le "+verb+" « "+plan.config.alias+" » ?\nLes actions ne seront pas exécutées lors de cet enregistrement."))return;
     this.busy=true;this.propose.disabled=true;this.save.disabled=true;
     try{
       const id="kimia_ai_"+String(Date.now())+"_"+Math.floor(Math.random()*100000);
       const domain=plan.type;
       // Ne pas écraser un objet existant par accident.
       try{
         const old=await this._hass.callApi("GET","config/"+domain+"/config/"+id);
         if(old!==undefined)throw Error("Cet identifiant existe déjà. Aucun enregistrement effectué.");
       }catch(error){
         if(!/404|not found/i.test(err(error))&&error?.status!==404)throw error;
       }
       const payload={...plan.config,id};
       await this._hass.callApi("POST","config/"+domain+"/config/"+id,payload);
       await this._hass.callService(domain,"reload",{});
       this.clear();
       this.say(verb+" enregistré dans Home Assistant. Vérifie-le dans l'éditeur manuel avant de l'utiliser.");
     }catch(error){this.say("Enregistrement impossible : "+err(error),true);this.save.disabled=false;}
     finally{this.busy=false;this.propose.disabled=this._hass.user?.is_admin!==true||!this.model.value;}
   }
 }
 function summarizeHealth(data){
   const report=[];
   if(data.config)report.push("Home Assistant "+(data.config.version||"version inconnue")+
     " — "+(data.core?.state||data.config.state||"état non précisé"));
   if(data.core?.recorder_state?.migration_in_progress)
     report.push("⚠ Enregistrement : migration de base de données en cours.");
   else if(data.core)report.push("✓ Aucun indicateur de migration Recorder en cours.");
   if(data.validation){
     report.push(data.validation.result==="valid"?"✓ configuration.yaml valide":
       "⚠ Configuration YAML : "+(data.validation.result||"résultat inconnu"));
     if(data.validation.errors)report.push("Erreurs YAML : "+String(data.validation.errors).slice(0,700));
     if(data.validation.warnings)report.push("Avertissements YAML : "+String(data.validation.warnings).slice(0,700));
   }
   if(data.states){
     const all=data.states;
     const unavailable=all.filter(s=>s.state==="unavailable");
     const unknown=all.filter(s=>s.state==="unknown");
     report.push(all.length+" entités connues ; "+unavailable.length+" indisponibles ; "+unknown.length+" inconnues.");
     for(const s of unavailable.slice(0,15))
       report.push("⚠ Indisponible : "+s.entity_id);
     if(unavailable.length>15)report.push("… "+(unavailable.length-15)+" autres indisponibles.");
     const automations=all.filter(s=>s.entity_id.startsWith("automation."));
     const scripts=all.filter(s=>s.entity_id.startsWith("script."));
     report.push(automations.length+" automatisations ("+automations.filter(s=>s.state==="off").length+
       " désactivées), "+scripts.length+" scripts.");
   }
   if(data.devices)report.push(data.devices.length+" appareils référencés par Home Assistant.");
   if(data.registry){
     const disabled=data.registry.filter(e=>e.disabled_by);
     report.push(data.registry.length+" entités enregistrées ; "+disabled.length+
       " désactivées volontairement ou par une intégration.");
   }
   if(data.integrations)report.push(data.integrations.length+" composants chargés (ne garantit pas leur bon fonctionnement).");
   if(typeof data.log==="string"){
     const lines=data.log.split(/\r?\n/).slice(-3000);
     const errors=lines.filter(line=>/\bERROR\b|\bCRITICAL\b/.test(line)).length;
     const warnings=lines.filter(line=>/\bWARNING\b/.test(line)).length;
     report.push("Journal de session (maximum 3 000 dernières lignes) : "+
       errors+" lignes d'erreur, "+warnings+" avertissements. Voir les journaux HA pour le détail.");
   }
   if(data.errors)report.push(data.errors);
   report.push("Ce diagnostic ne teste ni les piles physiques, ni chaque connexion Zigbee/Wi‑Fi, ni toutes les dépendances des routines.");
   return report.join("\n");
 }
 class Health extends HTMLElement{
   constructor(){super();this.attachShadow({mode:"open"});this.busy=false;}
   setConfig(c){this.config=c||{};this.render();}
   set hass(h){this._hass=h;if(!this.built)this.render();}
   connectedCallback(){this.render();}
   render(){
     if(this.built||!this._hass)return;
     this.built=true;
     this.shadowRoot.innerHTML="<style>"+CSS+"</style>"+
       "<ha-card><h3>🩺 Diagnostic Home Assistant</h3>"+
       "<p>Vérifie la configuration YAML, l'état du cœur HA, les entités indisponibles, les appareils, les intégrations et les routines. Lecture seule, sans réparation ni redémarrage.</p>"+
       "<button class='primary run'>Vérifier mon Home Assistant</button>"+
       "<p class='status' role='status'></p><pre class='report' hidden></pre>"+
       "<p class='hint'>Ce rapport est un contrôle de santé général, pas une certification complète de tous les équipements.</p></ha-card>";
     this.button=this.shadowRoot.querySelector(".run");
     this.status=this.shadowRoot.querySelector(".status");
     this.report=this.shadowRoot.querySelector(".report");
     this.button.disabled=this._hass.user?.is_admin!==true;
     this.button.addEventListener("click",()=>this.run());
   }
   async run(){
     if(this.busy||this._hass?.user?.is_admin!==true)return;
     this.busy=true;this.button.disabled=true;this.report.hidden=true;
     this.status.textContent="Contrôles Home Assistant en cours…";
     try{
       const data={},missing=[];
       const attempts=[
         ["config",()=>this._hass.callApi("GET","config")],
         ["core",()=>this._hass.callApi("GET","core/state")],
         ["validation",()=>this._hass.callApi("POST","config/core/check_config",{})],
         ["states",()=>this._hass.callWS({type:"get_states"})],
         ["devices",()=>this._hass.callWS({type:"config/device_registry/list"})],
         ["registry",()=>this._hass.callWS({type:"config/entity_registry/list"})],
         ["integrations",()=>this._hass.callApi("GET","components")],
         ["log",()=>this._hass.callApi("GET","error_log")]
       ];
       const res=await Promise.allSettled(attempts.map(async([name,fn])=>[name,await fn()]));
       res.forEach((item,i)=>{
         const name=attempts[i][0];
         if(item.status==="fulfilled")data[name]=item.value[1];
         else missing.push(name+" ("+err(item.reason)+")");
       });
       if(missing.length)data.errors="Contrôles indisponibles : "+missing.join("; ");
       this.report.textContent=summarizeHealth(data);
       this.report.hidden=false;
       this.status.textContent=missing.length
         ?"Diagnostic partiel : certains contrôles sont indisponibles.":"Diagnostic terminé : consulte le rapport.";
     }catch(error){this.status.textContent="Diagnostic impossible : "+err(error);}
     finally{this.busy=false;this.button.disabled=this._hass?.user?.is_admin!==true;}
   }
 }
 customElements.define(CARD,Studio);
 customElements.define("kimia-ha-diagnostic-v1-card",Health);
 window.customCards=window.customCards||[];
 for(const entry of [
   {type:CARD,name:"KIMIA · Atelier Automatisations IA",description:"Gemini propose ; KIMIA vérifie ; l'administrateur valide."},
   {type:"kimia-ha-diagnostic-v1-card",name:"KIMIA · Diagnostic HA",description:"État HA, configuration YAML et disponibilité sans modification."}
 ])if(!window.customCards.some(c=>c.type===entry.type))window.customCards.push(entry);
})();