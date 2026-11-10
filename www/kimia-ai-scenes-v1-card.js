/* KIMIA Smart - Scenes IA fixes / carte administration et raccourcis Lumières */
(() => {
"use strict";
const PREFIX="kimia_ambiance_", COUNT=10;
const htmlStyle="<style>:host{display:block;color:var(--primary-text-color)}ha-card{padding:17px;border-radius:17px}h3{margin:0 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px}.bulbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:8px}.bulb{padding:10px;border:1px solid var(--divider-color);border-radius:10px}select{display:block;box-sizing:border-box;width:100%;padding:10px;margin:8px 0;border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);color:var(--primary-text-color)}textarea{display:block;box-sizing:border-box;width:100%;min-height:85px;margin:8px 0 12px;border:1px solid var(--divider-color);border-radius:8px;padding:10px;color:var(--primary-text-color);background:var(--card-background-color);font:inherit}button{cursor:pointer;border:1px solid var(--divider-color);border-radius:10px;padding:12px;color:var(--primary-text-color);background:var(--secondary-background-color);font:inherit}button:disabled{opacity:.5;cursor:wait}button.primary{background:var(--primary-color);color:white}.hint{color:var(--secondary-text-color);font-size:12px;line-height:1.5}.status{white-space:pre-wrap;margin:10px 0 0;font-size:13px}.error{color:var(--error-color,#c33)}</style>";
const idAt=i=>PREFIX+String(i+1).padStart(2,"0");
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||a));
const err=e=>e&&e.message?e.message:String(e);
const eligible=s=>s&&/^light\.[a-z0-9_]+$/.test(s.entity_id)&&!["unavailable","unknown"].includes(s.state);
function hexRgb(v) {
  const m=/^#?([0-9a-f]{6})$/i.exec(String(v||""));
  if(!m)return null;
  return [0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16));
}
function rgbHs(rgb) {
  const [r,g,b]=rgb.map(x=>x/255), hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;
  let h=0;
  if(d){if(hi===r)h=(g-b)/d;else if(hi===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*60+360)%360;}
  return [Math.round(h),Math.round(hi===0?0:d/hi*100)];
}
function rgbXy(rgb){
  const v=rgb.map(n=>{let x=n/255;return x>.04045?Math.pow((x+.055)/1.055,2.4):x/12.92;});
  const x=.664511*v[0]+.154324*v[1]+.162028*v[2];
  const y=.283881*v[0]+.668433*v[1]+.047685*v[2];
  const z=.000088*v[0]+.07231*v[1]+.986039*v[2],sum=x+y+z;
  return sum?[+((x/sum).toFixed(4)),+((y/sum).toFixed(4))]:[.3127,.329];
}
function stateFor(s,choice){
  if(choice.off===true)return "off";
  const a=s.attributes||{},modes=a.supported_color_modes||[];
  const o={state:"on"};
  if(!modes.includes("onoff")||modes.length>1)o.brightness=Math.round(clamp(choice.brightness_pct,1,100)*255/100);
  if(choice.mode==="white"&&modes.includes("color_temp")){
    o.color_mode="color_temp";
    o.color_temp_kelvin=Math.round(clamp(choice.kelvin||3000,a.min_color_temp_kelvin||2000,a.max_color_temp_kelvin||6500));
  } else if(choice.mode==="color"){
    const rgb=hexRgb(choice.color);
    if(!rgb)throw Error("Couleur invalide pour "+s.entity_id);
    if(modes.includes("hs")){o.color_mode="hs";o.hs_color=rgbHs(rgb);}
    else if(modes.includes("xy")){o.color_mode="xy";o.xy_color=rgbXy(rgb);}
    else if(modes.includes("rgb")){o.color_mode="rgb";o.rgb_color=rgb;}
    else if(modes.includes("color_temp")){o.color_mode="color_temp";o.color_temp_kelvin=3000;}
  }
  if(!o.color_mode&&modes.includes("brightness"))o.color_mode="brightness";
  return o;
}
function validate(raw,selected){
  let obj=raw;
  if(typeof obj==="string"){
    const a=obj.indexOf("{"),b=obj.lastIndexOf("}");
    if(a<0||b<a)throw Error("Réponse Gemini sans JSON.");
    obj=JSON.parse(obj.slice(a,b+1));
  }
  const scenes=Array.isArray(obj)?obj:obj?.scenes;
  if(!Array.isArray(scenes)||scenes.length!==COUNT)throw Error("Gemini n'a pas renvoyé exactement 10 scènes.");
  const byId=new Map(selected.map(s=>[s.entity_id,s])),titles=new Set();
  return scenes.map((entry,i)=>{
    const name=String(entry?.name||"").trim().slice(0,36);
    if(!name||titles.has(name.toLowerCase()))throw Error("Noms manquants ou doublons dans les scènes.");
    titles.add(name.toLowerCase());
    const lights=Array.isArray(entry.lights)?entry.lights:[], values=new Map(lights.map(c=>[c.entity_id,c]));
    if(lights.length!==byId.size||values.size!==byId.size||[...byId.keys()].some(k=>!values.has(k)))
      throw Error("La scène "+name+" ne renseigne pas toutes les ampoules.");
    const entities={};
    for(const [id,s] of byId)entities[id]=stateFor(s,values.get(id));
    return {id:idAt(i),name:"KIMIA · "+name,icon:"mdi:palette-outline",entities};
  });
}
class Generator extends HTMLElement {
  constructor(){super();this.attachShadow({mode:"open"});this.sel=new Set();this.busy=false;this.prompt="Ambiances harmonieuses et variées : détente, cinéma, lecture, romance, concentration, soirée, nuit, réveil, tropicale et douceur.";}
  setConfig(c){this.config=c||{};this.draw();}
  set hass(h){this._hass=h;if(!this.built)this.draw();}
  connectedCallback(){this.draw();}
  draw(){
    if(this.built||!this._hass)return;
    this.built=true;
    const root=this.shadowRoot;
    root.innerHTML=htmlStyle+"<ha-card><h3>✨ Mes 10 scènes lumineuses IA</h3><p class='hint'>Choisis les ampoules concernées. Gemini créera 10 ambiances fixes, enregistrées dans Home Assistant.</p><div class='bulbs'></div><p>Modèle IA :</p><select aria-label='Modèle Gemini'></select><p>Ambiances souhaitées :</p><textarea></textarea><button class='primary'>Générer et enregistrer 10 scènes</button><p class='hint'>Régénérer remplace les 10 scènes IA KIMIA. La génération nécessite Internet ; les scènes fonctionnent ensuite hors ligne.</p><p class='status' role='status'></p></ha-card>";
    const list=root.querySelector(".bulbs");
    const lights=Object.values(this._hass.states||{}).filter(eligible).sort((a,b)=>String(a.attributes?.friendly_name||a.entity_id).localeCompare(String(b.attributes?.friendly_name||b.entity_id),"fr"));
    for(const s of lights){
      const label=document.createElement("label");label.className="bulb";
      const checkbox=document.createElement("input");checkbox.type="checkbox";
      checkbox.addEventListener("change",()=>checkbox.checked?this.sel.add(s.entity_id):this.sel.delete(s.entity_id));
      const t=document.createTextNode(" "+(s.attributes?.friendly_name||s.entity_id));
      label.append(checkbox,t);list.append(label);
    }
    if(!lights.length)list.textContent="Aucune ampoule disponible.";
    this.aiSelect=root.querySelector("select");
    const tasks=Object.values(this._hass.states||{}).filter(state=>
      state.entity_id?.startsWith("ai_task.")&&state.state!=="unavailable");
    for(const t of tasks){
      const option=document.createElement("option");
      option.value=t.entity_id;option.textContent=t.attributes?.friendly_name||t.entity_id;
      this.aiSelect.append(option);
    }
    const gemini=tasks.find(t=>/gemini|google/i.test((t.attributes?.friendly_name||"")+" "+t.entity_id));
    if(gemini)this.aiSelect.value=gemini.entity_id;
    this.aiSelect.disabled=!tasks.length;
    this.field=root.querySelector("textarea");this.field.value=this.prompt;
    this.field.addEventListener("input",()=>this.prompt=this.field.value);
    this.button=root.querySelector("button");
    this.status=root.querySelector(".status");
    this.button.disabled=this._hass.user?.is_admin!==true||!tasks.length;
    if(!tasks.length)this.say("Aucune entité AI Task détectée. Active l'entité AI Task de Google Gemini dans Home Assistant avant la génération.",true);
    this.button.addEventListener("click",()=>this.generate());
  }
  say(msg,bad=false){this.status.textContent=msg;this.status.className="status"+(bad?" error":"");}
  async generate(){
    if(this.busy||this._hass.user?.is_admin!==true)return;
    const selected=[...this.sel].map(id=>this._hass.states[id]).filter(eligible);
    if(!selected.length)return this.say("Sélectionne au moins une ampoule.",true);
    if(typeof this._hass.callApi!=="function")return this.say("API Home Assistant non disponible.",true);
    this.busy=true;this.button.disabled=true;let saved=0;
    try{
      this.say("Gemini prépare les 10 ambiances…");
      const lights=selected.map(s=>({entity_id:s.entity_id,name:s.attributes?.friendly_name||s.entity_id,supported_color_modes:s.attributes?.supported_color_modes||[],min_kelvin:s.attributes?.min_color_temp_kelvin||2000,max_kelvin:s.attributes?.max_color_temp_kelvin||6500}));
      const instructions=[
        "Tu es le createur d'ambiances lumineuses FIXES de KIMIA Smart.",
        "Génère EXACTEMENT dix scènes lumineuses variées en français selon les préférences : "+this.prompt,
        "Liste des ampoules et leurs capacités: "+JSON.stringify(lights),
        "Réponds uniquement par du JSON valide, sans markdown, sous cette forme :",
        '{"scenes":[{"name":"Détente","lights":[{"entity_id":"light.exemple","off":false,"brightness_pct":40,"mode":"color","color":"#FFAA66","kelvin":3000}]}]}',
        "Chaque scène doit contenir chacune des ampoules sélectionnées, exactement une fois, avec les bons entity_id.",
        "Choisis off booléen, brightness_pct entier entre 1 et 100, mode color ou white, couleur #RRGGBB et kelvin 2000 à 6500.",
        "Pour les ampoules sans couleur, privilégie white. Ne crée aucune animation ou programmation. Noms simples, uniques, prononçables."
      ].join("\n");
      const result=await this._hass.callApi("POST","services/ai_task/generate_data?return_response",{task_name:"KIMIA ambiances lumineuses",instructions,entity_id:this.aiSelect.value});
      const response=result?.service_response?.data;
      if(response==null)throw Error("Aucune réponse AI Task. Vérifie que Gemini fournit une entité AI Task et qu'elle est sélectionnée par défaut.");
      const scenes=validate(response,selected);
      // Collision preflight: on ne remplace jamais une scène non-KIMIA.
      for(const scene of scenes){
        let existing;
        try{existing=await this._hass.callApi("GET","config/scene/config/"+scene.id);}
        catch(error){if(error?.status!==404&&!String(error).includes("404"))throw error;}
        if(existing&&!String(existing.name||"").startsWith("KIMIA · "))
          throw Error("Identifiant déjà utilisé par une scène non-KIMIA : "+scene.id);
      }
      this.say("Validation OK. Enregistrement des 10 scènes…");
      for(const scene of scenes){
        await this._hass.callApi("POST","config/scene/config/"+scene.id,scene);
        saved++;
      }
      await this._hass.callService("scene","reload",{});
      this.say("10 scènes enregistrées ! Ouvre Lumières et expose les nouvelles scènes à Assist pour Gemini.");
    }catch(error){this.say("Échec"+(saved?" après "+saved+" scènes enregistrées":"")+" : "+err(error),true);}
    finally{this.busy=false;this.button.disabled=false;}
  }
}
class Launchpad extends HTMLElement{
  constructor(){super();this.attachShadow({mode:"open"});this.signature="";}
  setConfig(c){this.config=c||{};this.draw();}
  set hass(h){this._hass=h;const sig=this.find().map(s=>s.entity_id+"|"+s.attributes?.friendly_name).join(";");if(sig!==this.signature){this.signature=sig;this.draw();}}
  connectedCallback(){this.draw();}
  find(){return Object.values(this._hass?.states||{}).filter(s=>s.entity_id?.startsWith("scene.")&&
    typeof s.attributes?.id==="string"&&s.attributes.id.startsWith(PREFIX)).sort((a,b)=>a.attributes.id.localeCompare(b.attributes.id)).slice(0,COUNT);}
  draw(){
    if(!this._hass)return;
    this.shadowRoot.innerHTML=htmlStyle+"<ha-card><h3>Mes ambiances</h3><div class='grid'></div><p class='status'></p></ha-card>";
    const box=this.shadowRoot.querySelector(".grid"),list=this.find();
    if(!list.length){box.textContent="Pas encore de scènes IA. Crée-les dans KIMIA Configuration → Scènes.";return;}
    for(const scene of list){
      const btn=document.createElement("button");
      btn.textContent=String(scene.attributes?.friendly_name||scene.entity_id).replace(/^KIMIA\s*[·-]\s*/,"");
      btn.addEventListener("click",async()=>{
        btn.disabled=true;
        try{await this._hass.callService("scene","turn_on",{entity_id:scene.entity_id});}
        catch(error){const p=this.shadowRoot.querySelector(".status");p.textContent=err(error);p.className="status error";}
        finally{btn.disabled=false;}
      });
      box.append(btn);
    }
  }
}
if(!customElements.get("kimia-ai-scenes-settings-card"))customElements.define("kimia-ai-scenes-settings-card",Generator);
if(!customElements.get("kimia-ai-scenes-shortcuts-card"))customElements.define("kimia-ai-scenes-shortcuts-card",Launchpad);
window.customCards=window.customCards||[];
for(const item of [{type:"kimia-ai-scenes-settings-card",name:"KIMIA — Générateur IA",description:"Génère dix scènes Gemini permanentes."},{type:"kimia-ai-scenes-shortcuts-card",name:"KIMIA — Mes 10 ambiances",description:"Raccourcis pour scènes lumineuses IA."}])
  if(!window.customCards.some(c=>c.type===item.type))window.customCards.push(item);
})();
