/* KIMIA Smart - Scenes IA fixes / carte administration et raccourcis Lumières */
(() => {
"use strict";
const PREFIX="kimia_ambiance_", COUNT=20, LIMIT=10;
const SCRIPT="kimia_ambiances_lumineuses", SCRIPT_PATH="config/script/config/"+SCRIPT;
const CATALOG_VERSION="kimia_lighting_catalog_v1";
const THEMES="détente, cinéma, lecture, romance, concentration, soirée, nuit, réveil, tropicale, douceur, horreur, gaming néon, océan, nature, apéro, élégante, galaxie, coucher de soleil, fête et aurore boréale";
const ownedId=id=>/^kimia_ambiance_(0[1-9]|1[0-9]|20)$/.test(id||"");
const ownedName=name=>typeof name==="string"&&name.startsWith("KIMIA · ");
const ownsState=s=>s.entity_id?.startsWith("scene.")&&ownedId(s.attributes?.id)&&ownedName(s.attributes?.friendly_name);
const bare=name=>name.replace(/^KIMIA\s*·\s*/,"");
const nameKey=name=>bare(name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const sortedScenes=states=>Object.values(states||{}).filter(ownsState).sort((a,b)=>a.attributes.id.localeCompare(b.attributes.id));
const defaultSelection=scenes=>scenes.slice(0,LIMIT).map(s=>s.attributes.id);
const notFound=error=>error?.status===404||error?.code===404||error?.code==="not_found"||/404|resource not found/i.test(err(error));
const readConfig=async(hass,path)=>{
  try{return await hass.callApi("GET",path);}
  catch(error){if(!notFound(error))throw error;return null;}
};
const scenePath=id=>"config/scene/config/"+id;
const plainText=(v,limit)=>typeof v==="string"&&!/[{}\[\]\u0000-\u001f]/.test(v)&&v.trim().length<=limit?v.trim():"";
const htmlStyle="<style>:host{display:block;color:var(--primary-text-color)}ha-card{padding:17px;border-radius:17px}h3{margin:0 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px}.bulbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:8px}.bulb{padding:10px;border:1px solid var(--divider-color);border-radius:10px}select{display:block;box-sizing:border-box;width:100%;padding:10px;margin:8px 0;border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);color:var(--primary-text-color)}textarea{display:block;box-sizing:border-box;width:100%;min-height:85px;margin:8px 0 12px;border:1px solid var(--divider-color);border-radius:8px;padding:10px;color:var(--primary-text-color);background:var(--card-background-color);font:inherit}button{cursor:pointer;border:1px solid var(--divider-color);border-radius:10px;padding:12px;color:var(--primary-text-color);background:var(--secondary-background-color);font:inherit}button:disabled{opacity:.5;cursor:wait}button.primary{background:var(--primary-color);color:white}.hint{color:var(--secondary-text-color);font-size:12px;line-height:1.5}.status{white-space:pre-wrap;margin:10px 0 0;font-size:13px}.error{color:var(--error-color,#c33)}.scene-manage{margin-top:16px;padding-top:12px;border-top:1px solid var(--divider-color)}.scene-manage h4{margin:0 0 10px}.scene-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid var(--divider-color)}.scene-row span{font-size:13px}.scene-row button{padding:7px 10px;font-size:12px}.danger{color:var(--error-color,#c33);background:transparent}.remove-all{margin-top:12px;font-size:12px}.quiet{font-size:12px;color:var(--secondary-text-color)}</style>";
const idAt=i=>PREFIX+String(i+1).padStart(2,"0");
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||a));
// Les erreurs HA peuvent avoir un message objet. Ne jamais afficher [object Object].
const err=e=>{
  if(typeof e==="string")return e;
  if(!e)return "Erreur inconnue";
  const detail=e.message||e.body?.message||e.response?.message||e;
  if(typeof detail==="string")return detail;
  try{return JSON.stringify(detail).slice(0,1500);}
  catch(_){return String(e?.code||e?.status||"Erreur non sérialisable");}
};
const eligible=s=>s&&/^light\.[a-z0-9_]+$/.test(s.entity_id)&&["on","off"].includes(s.state);
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
  if(typeof choice?.off!=="boolean")throw Error("État invalide pour "+s.entity_id);
  if(choice.off===true)return "off";
  const a=s.attributes||{},modes=a.supported_color_modes||[];
  if(!["white","color"].includes(choice.mode)||!Number.isInteger(choice.brightness_pct)||
     choice.brightness_pct<1||choice.brightness_pct>100)throw Error("Réglage invalide pour "+s.entity_id);
  if(choice.mode==="white"&&modes.includes("color_temp")&&
     (!Number.isInteger(choice.kelvin)||choice.kelvin<1000||choice.kelvin>12000))
    throw Error("Température de blanc invalide pour "+s.entity_id);
  const o={state:"on"};
  if(modes.some(m=>["brightness","white","color_temp","hs","xy","rgb","rgbw","rgbww"].includes(m)))
    o.brightness=Math.round(choice.brightness_pct*255/100);
  if(choice.mode==="white"&&modes.includes("color_temp")){
    o.color_mode="color_temp";
    o.color_temp_kelvin=Math.round(clamp(choice.kelvin||3000,a.min_color_temp_kelvin||2000,a.max_color_temp_kelvin||6500));
  } else if(choice.mode==="white"&&modes.includes("white")){
    o.color_mode="white";
  } else {
    const rgb=choice.mode==="white"?[255,255,255]:hexRgb(choice.color);
    if(!rgb)throw Error("Couleur invalide pour "+s.entity_id);
    if(modes.includes("hs")){o.color_mode="hs";o.hs_color=rgbHs(rgb);}
    else if(modes.includes("xy")){o.color_mode="xy";o.xy_color=rgbXy(rgb);}
    else if(modes.includes("rgb")){o.color_mode="rgb";o.rgb_color=rgb;}
    else if(modes.includes("rgbw")){o.color_mode="rgbw";o.rgbw_color=[...rgb,0];}
    else if(modes.includes("rgbww")){o.color_mode="rgbww";o.rgbww_color=[...rgb,0,0];}
    else if(choice.mode==="color")throw Error("Couleur non prise en charge par "+s.entity_id);
  }
  if(!o.color_mode&&modes.includes("brightness"))o.color_mode="brightness";
  return o;
}
function validate(raw,selected){
  const obj=typeof raw==="string"?JSON.parse(raw.trim().replace(/^\x60\x60\x60(?:json)?\s*([\s\S]+?)\s*\x60\x60\x60$/i,"$1")):raw;
  const scenes=Array.isArray(obj)?obj:obj?.scenes;
  if(!Array.isArray(scenes)||scenes.length!==COUNT)throw Error("Gemini n’a pas renvoyé exactement 20 scènes.");
  const byId=new Map(selected.map(s=>[s.entity_id,s])),titles=new Set(),effects=new Set();
  return scenes.map((entry,i)=>{
    const name=plainText(entry?.name,48),description=plainText(entry?.description,140);
    if(!nameKey(name)||!description||titles.has(nameKey(name)))throw Error("Noms ou descriptions manquants, invalides ou en doublon.");
    titles.add(nameKey(name));
    const lights=Array.isArray(entry.lights)?entry.lights:[], values=new Map(lights.map(c=>[c?.entity_id,c]));
    if(lights.length!==byId.size||values.size!==byId.size||[...byId.keys()].some(k=>!values.has(k)))
      throw Error("La scène "+name+" ne renseigne pas toutes les ampoules.");
    const entities={};
    for(const [id,s] of byId)entities[id]=stateFor(s,values.get(id));
    const signature=JSON.stringify(entities);
    if(effects.has(signature)||Object.values(entities).every(state=>state==="off"))
      throw Error("Ambiance sans lumière ou effet déjà utilisé : "+name+".");
    effects.add(signature);
    return {id:idAt(i),name:"KIMIA · "+name,icon:"mdi:palette-outline",entities,description};
  });
}

function assignStableIds(draft,previous,selection){
  const names=new Map(previous.map(s=>[nameKey(s.name),s.id]));
  const matched=new Set(draft.map(s=>names.get(nameKey(s.name))).filter(Boolean));
  const free=Array.from({length:COUNT},(_,i)=>idAt(i)).filter(id=>!matched.has(id));
  const scenes=draft.map(s=>({...s,id:names.get(nameKey(s.name))||free.shift()}));
  const retained=selection.filter(id=>matched.has(id));
  const replacements=scenes.filter(s=>!matched.has(s.id)).map(s=>s.id);
  const target=previous.length?selection.length:LIMIT;
  return {scenes,selection:[...retained,...replacements].slice(0,target)};
}

function describeLegacy(config){
  return Object.values(config.entities).map(state=>{
    if(state==="off"||state.state==="off")return "éteinte";
    const level=Number.isFinite(state.brightness)?Math.round(state.brightness/255*100)+" %":"allumée";
    if(state.color_temp_kelvin)return level+", blanc "+state.color_temp_kelvin+" K";
    const rgb=state.rgb_color||state.rgbw_color||state.rgbww_color;
    if(rgb)return level+", RVB "+rgb.slice(0,3).join("/");
    if(state.xy_color){
      const [x,y]=state.xy_color;
      const X=x/y,Z=(1-x-y)/y;
      const linear=[1.656492*X-.354851-.255038*Z,-.707196*X+1.655397+.036152*Z,.051713*X-.121364+1.01153*Z];
      return level+", "+colorName(rgbHs(linear.map(v=>Math.max(0,v)*255/Math.max(1,...linear))));
    }
    return state.hs_color?level+", "+colorName(state.hs_color):level;
  }).join(" ; ").slice(0,140);
}

function colorName([h,s]){
  if(s<15)return "blanc";
  const colors=["rouge","orange","jaune","vert","cyan","bleu","violet","rose","rouge"];
  return colors[[25,45,72,160,200,258,296,340,361].findIndex(end=>h<end)]||"couleur";
}

const VOICE_LIGHT=String.raw`\b(lumi[eè]res?|[eé]clairages?|lumineu(?:x|se|ses)|visuel(?:le|les|s)?|couleurs?|violet(?:te)?|mauve|magenta|turquoise|bleu(?:e)?|rouge|vert(?:e)?|blanc(?:he)?|orange|jaune|rose)\b`;
const VOICE_AUDIO=String.raw`\b(musiques?|joue|[eé]coute|albums?|playlists?|radios?|morceaux?|chansons?|artistes?|audio|reggae|jazz|spotify|musicales?|sonores?)\b`;
const VOICE_AMBIENCE=String.raw`(?:^|\bet\b|[,;])\s*(?:(?:peux[- ]tu|s['’]il te pla[iî]t)\s+)?(?:mets?|fais|cr[eé]e|active|lance|je veux|je voudrais)\s+(?:(?:moi|une|la|un|cette|l['’])\s*){0,3}(?:ambiance|atmosph[eè]re)\b(?!\s+(?:musicale|sonore|audio))`;
const VOICE_EXPLICIT=String.raw`(?:^|\bet\b|[,;])\s*(?:(?:peux[- ]tu|s['’]il te pla[iî]t)\s+)?(?:mets?|fais|cr[eé]e|active|allume|r[eé]gle|change|je veux|je voudrais)\s+(?:(?:moi|une|la|le|les|des|du|un|cette|cet|l['’])\s*){0,3}`+VOICE_LIGHT;
const VOICE_NEGATED=String.raw`\b(?:sans|pas de|aucune?)\s+(?:(?:les?|la|d['’])\s*)?(?:lumi[eè]res?|[eé]clairage|ambiance\s+lumineuse)\b`;
const quoted=JSON.stringify;

function voiceScript(catalog){
  const summary=Object.values(catalog).map(scene=>scene.entity_id+" = "+scene.name+" — "+scene.description).join("\n");
  const reject=(condition,message)=>({if:[{condition:"template",value_template:condition}],then:[{stop:message,error:true}]});
  const action={action:"scene.turn_on",target:{entity_id:"{{ ambiance }}"}};
  return {
    alias:"KIMIA - Ambiances lumineuses",icon:"mdi:palette-outline",mode:"single",
    description:"Choisis l’ambiance visuelle la plus spécifique dans le catalogue du champ ambiance. Utilise uniquement les valeurs proposées. Traitement réservé à une demande d’éclairage ou d’ambiance visuelle. Une demande uniquement musicale, radio, artiste, album, playlist ou média n’appelle jamais ce script. « Joue du reggae » ou « Mets une musique romantique » relève de la musique. Pour « Joue du reggae et mets une ambiance tropicale », fais les deux traitements séparément. Pour « Mets une ambiance lumineuse pour écouter du jazz », utilise ce script. Recopie la demande originale, sans y ajouter de termes d’éclairage. Si aucun choix adapté ou appareil disponible, explique-le sans appel. Respecte la pièce demandée. « Film d’horreur » avec demande d’éclairage privilégie Horreur puis une ambiance immersive. « Mets du violet » privilégie un effet réellement violet. Ne choisis pas Détente par défaut.",
    fields:{
      ambiance:{name:"Ambiance",description:"Identifiant réel de l’ambiance choisie selon l’effet visuel. Catalogue :\n"+summary,
        required:true,selector:summary?{select:{options:Object.values(catalog).map(s=>({value:s.entity_id,label:s.name}))}}:{text:{}}},
      demande:{name:"Demande d’origine",description:"Reproduis mot pour mot la demande de l’utilisateur, sans reformulation ni ajout.",required:true,selector:{text:{}}},
      zone_demandee:{name:"Pièce demandée",description:"Si une pièce est explicitement demandée, passe son nom Home Assistant exact. Sinon omets ce champ.",selector:{text:{}}}
    },
    sequence:[
      {variables:{kimia_lighting_catalog_version:CATALOG_VERSION,kimia_lighting_catalog:catalog}},
      {variables:{
        demande_recue:"{{ demande | default('') | string | lower }}",
        scene_choisie:"{{ kimia_lighting_catalog.get(ambiance | default('')) }}",
      }},
      reject("{{ demande_recue | regex_search("+quoted(VOICE_NEGATED)+") or not ("+
        "(demande_recue | regex_search("+quoted(VOICE_AUDIO)+") and (demande_recue | regex_search("+quoted(VOICE_EXPLICIT)+") or demande_recue | regex_search("+quoted(VOICE_AMBIENCE)+"))) or "+
        "(not (demande_recue | regex_search("+quoted(VOICE_AUDIO)+")) and (demande_recue | regex_search("+quoted(VOICE_LIGHT)+") or demande_recue | regex_search("+quoted(VOICE_AMBIENCE)+")))) }}",
        "Cette demande ne contient pas de commande d’éclairage explicite."),
      reject("{{ not scene_choisie or states(ambiance) in ['unknown', 'unavailable'] or state_attr(ambiance, 'id') != scene_choisie.id or (state_attr(ambiance, 'entity_id') | default([], true) | sort) != (scene_choisie.lights | sort) }}",
        "Cette ambiance KIMIA n’est plus disponible. Choisis une ambiance du catalogue actuel."),
      reject(String.raw`{% set ns = namespace(ok=true) %}
        {% set requested = zone_demandee | default('') | string | trim | lower %}
        {% set phrase = ' ' ~ (demande_recue | regex_replace('[^\\w’\']+', ' ')) ~ ' ' %}
        {% for lamp in scene_choisie.lights %}
          {% set lamp_area = area_name(lamp) | default('', true) | lower %}
          {% if states(lamp) not in ['on','off'] or (requested and lamp_area != requested) %}
            {% set ns.ok = false %}
          {% endif %}
          {% for area_id in areas() %}
            {% set area = area_name(area_id) | default('', true) | lower %}
            {% if area and area != lamp_area %}
              {% for prefix in ['dans ', 'dans le ', 'dans la ', 'dans les ', "dans l'", 'dans l’', 'au ', 'à la ', 'côté '] %}
                {% if (' ' ~ prefix ~ area ~ ' ') in phrase %}{% set ns.ok = false %}{% endif %}
              {% endfor %}
            {% endif %}
          {% endfor %}
        {% endfor %}
        {{ not ns.ok }}`,
        "Les ampoules de cette ambiance sont indisponibles ou hors de la pièce demandée."),
      action,
      {variables:{resultat:{message:"Ambiance KIMIA activée.",ambiance:"{{ scene_choisie.name }}"}}},
      {stop:"Ambiance appliquée",response_variable:"resultat"}
    ]
  };
}

const catalogOf=script=>script?.sequence?.[0]?.variables?.kimia_lighting_catalog_version===CATALOG_VERSION
  ?script.sequence[0].variables.kimia_lighting_catalog:null;

const visibleSelection=(config,scenes)=>{
  const allowed=new Set(scenes.map(s=>s.attributes.id));
  const saved=config?.kimia_ai_scenes?.selection;
  return Array.isArray(saved)?[...new Set(saved)].filter(id=>allowed.has(id)).slice(0,LIMIT):defaultSelection(scenes);
};

const DASHBOARD_QUERY={type:"lovelace/config",url_path:"kimia-next"};
const asStates=states=>Object.fromEntries(states.map(state=>[state.entity_id,state]));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readLive(hass,check=()=>true){
  for(let attempt=0;attempt<12;attempt++){
    const states=await hass.callWS({type:"get_states"});
    if(Array.isArray(states)&&check(sortedScenes(asStates(states))))return asStates(states);
    await delay(350);
  }
  throw Error("Home Assistant n’a pas confirmé le rechargement des scènes.");
}

async function readManaged(hass,ids){
  const saved=new Map();
  for(const id of ids){
    const config=await readConfig(hass,scenePath(id));
    if(config&&!ownedName(config.name))throw Error("Identifiant réservé par une scène personnelle : "+id);
    saved.set(id,config);
  }
  return saved;
}

const sceneConfig=({id,name,icon,entities})=>({id,name,icon,entities});
const readVoice=async hass=>{
  const saved=await readConfig(hass,SCRIPT_PATH);
  if(saved&&!catalogOf(saved))throw Error("L’identifiant du script vocal KIMIA est déjà utilisé par un autre script.");
  return saved;
};

function backup(scenes,script,dashboard){
  const settings=dashboard?.kimia_ai_scenes??null;
  window.localStorage.setItem("kimia-ai-scenes-backup-v1",JSON.stringify({
    date:new Date().toISOString(),scenes:[...scenes.entries()],script,settings
  }));
}

async function changeScenes(hass,changes,previous,confirmStates){
  const touched=[];
  try{
    for(const [id,value] of changes){
      const current=await readConfig(hass,scenePath(id));
      if(JSON.stringify(current)!==JSON.stringify(previous.get(id)))throw Error("La scène "+id+" a changé depuis sa lecture.");
      touched.push(id);
      await hass.callApi(value?"POST":"DELETE",scenePath(id),value||undefined);
    }
    await hass.callService("scene","reload",{});
    return await readLive(hass,confirmStates);
  }catch(error){
    const failed=[];
    for(const id of touched.reverse())try{
      const current=await readConfig(hass,scenePath(id));
      const before=previous.get(id),attempted=changes.get(id);
      if(JSON.stringify(current)===JSON.stringify(before))continue;
      if(current&&(current.name!==attempted?.name||JSON.stringify(current.entities)!==JSON.stringify(attempted.entities)))
        throw Error("La scène a changé en parallèle.");
      if(before)await hass.callApi("POST",scenePath(id),before);
      else if(current)await hass.callApi("DELETE",scenePath(id));
    }catch(_){failed.push(id);}
    if(touched.length)try{await hass.callService("scene","reload",{});}catch(_){failed.push("rechargement");}
    const status=failed.length?"Restauration incomplète ("+failed.join(", ")+"). Le point de retour est conservé.":
      "Les scènes précédentes sont conservées.";
    throw Error(err(error)+" "+status);
  }
}

function buildCatalog(scenes,configs,drafts){
  const catalog={};
  for(const scene of scenes){
    const id=scene.attributes.id, config=configs.get(id),lights=Object.keys(config?.entities||{});
    if(!config||!ownedName(config.name)||!lights.length||lights.some(id=>!/^light\.[a-z0-9_]+$/.test(id)))
      throw Error("La scène "+id+" ne contient pas uniquement des ampoules KIMIA vérifiables.");
    const draft=drafts.get(id);
    catalog[scene.entity_id]={id,entity_id:scene.entity_id,name:bare(config.name),
      description:draft?.name===bare(config.name)?draft.description:describeLegacy(config),lights};
  }
  return catalog;
}

const setExposure=(hass,entity_ids,should_expose)=>hass.callWS({type:"homeassistant/expose_entity",
  assistants:["conversation"],entity_ids,should_expose});

async function syncVoice(hass,catalog,previous){
  const script=voiceScript(catalog);
  if(JSON.stringify(script)!==JSON.stringify(previous))await hass.callApi("POST",SCRIPT_PATH,script);
  await hass.callService("script","reload",{});
  const states=await readLive(hass);
  const registry=await hass.callWS({type:"config/entity_registry/list"});
  const entity=registry.find(x=>x.platform==="script"&&x.unique_id===SCRIPT&&x.entity_id.startsWith("script."));
  if(!entity||!states[entity.entity_id]||states[entity.entity_id].state==="unavailable")
    throw Error("Le script est enregistré mais Home Assistant ne l’a pas chargé. Vérifie scripts.yaml puis recharge les scripts.");
  const services=await hass.callWS({type:"get_services"});
  const loaded=services.script?.[SCRIPT];
  if(loaded?.fields?.ambiance?.description!==script.fields.ambiance.description)
    throw Error("Le catalogue vocal chargé est différent du catalogue enregistré. Relance son actualisation.");
  const uniqueScenes=Object.keys(catalog).filter(id=>states[id]&&ownsState(states[id]));
  if(uniqueScenes.length)await setExposure(hass,uniqueScenes,false);
  const hasScenes=Object.keys(catalog).length>0;
  await setExposure(hass,[entity.entity_id],hasScenes);
  const {exposed_entities:exposed}=await hass.callWS({type:"homeassistant/expose_entity/list"});
  if(!exposed||Boolean(exposed[entity.entity_id]?.conversation)!==hasScenes||uniqueScenes.some(id=>exposed[id]?.conversation))
    throw Error("Vérification de l’exposition Assist non confirmée.");
  return hasScenes?" Script vocal et exposition Assist actualisés.":" Catalogue vocal vide.";
}
class Generator extends HTMLElement {
  constructor(){super();this.attachShadow({mode:"open"});this.sel=new Set();this.busy=false;this.prompt="Ambiances harmonieuses et variées : "+THEMES+".";}
  setConfig(c){this.config=c||{};this.draw();}
  set hass(h){
    this._hass=h;
    if(!this.busy)this._statesOverride=null;
    if(!this.built)this.draw();
    else {this.refreshBulbs();this.renderScenes();}
  }
  connectedCallback(){this.draw();}
  draw(){
    if(this.built||!this._hass)return;
    this.built=true;
    const root=this.shadowRoot;
    root.innerHTML=htmlStyle+"<ha-card><h3>✨ Mes 20 scènes lumineuses IA</h3><p class='hint'>Choisis les ampoules concernées. Gemini créera 20 ambiances fixes, enregistrées dans Home Assistant.</p><div class='bulbs'></div><p>Modèle IA :</p><select aria-label='Modèle Gemini'></select><label>Ambiances souhaitées<textarea></textarea></label><button class='primary'>Générer et enregistrer 20 scènes</button><p class='hint'>Internet est nécessaire pour la génération. Les scènes enregistrées restent utilisables en local.</p><div class='scene-manage'><h4>Gérer mes scènes KIMIA</h4><p class='quiet scene-count' aria-live='polite'></p><div class='existing-scenes'></div><button type='button' class='voice-sync'>Actualiser le script vocal</button> <button type='button' class='danger remove-all' hidden>Supprimer toutes les scènes KIMIA</button></div><p class='status' role='status'></p></ha-card>";
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
    this.refreshBulbs();
    if(!tasks.length)this.say("Aucune entité AI Task détectée. Active l'entité AI Task de Google Gemini dans Home Assistant avant la génération.",true);
    this.button.addEventListener("click",()=>this.generate());
    this.sceneBox=root.querySelector(".existing-scenes");
    this.counter=root.querySelector(".scene-count");
    this.voiceButton=root.querySelector(".voice-sync");
    this.voiceButton.addEventListener("click",()=>this.refreshVoice());
    this.removeAllButton=root.querySelector(".remove-all");
    this.removeAllButton.addEventListener("click",()=>this.deleteScenes(this.listScenes()));
    this.renderScenes();
    void this.loadSelection();
  }
  refreshBulbs(){
    const signature=JSON.stringify(Object.values(this._hass.states||{}).filter(s=>s.entity_id?.startsWith("light.")).map(s=>[s.entity_id,eligible(s),s.attributes?.friendly_name]));
    if(signature!==this.bulbSignature){this.bulbSignature=signature;this.renderBulbs();}
    this.button.disabled=this.busy||this._hass.user?.is_admin!==true||!this.aiSelect.value||!Object.values(this._hass.states||{}).some(eligible);
  }
  renderBulbs(){
    const root=this.shadowRoot;
    const list=root.querySelector(".bulbs");
    const configured=Object.values(this._hass.states||{}).filter(s=>/^light\.[a-z0-9_]+$/.test(s.entity_id));
    const lights=configured.filter(eligible).sort((a,b)=>String(a.attributes?.friendly_name||a.entity_id).localeCompare(String(b.attributes?.friendly_name||b.entity_id),"fr"));
    list.replaceChildren();
    if(!configured.length){list.textContent="Aucune ampoule configurée.";return;}
    if(!lights.length){
      list.textContent=configured.length+" ampoule(s) configurée(s), 0 joignable. Les scènes enregistrées sont conservées. Réessaie lorsque les ampoules répondent.";
      return;
    }
    if(lights.length!==configured.length){
      const summary=document.createElement("p");summary.className="hint";
      summary.textContent=configured.length+" ampoule(s) configurée(s), "+lights.length+" joignable(s).";
      list.append(summary);
    }
    for(const s of lights){
      const label=document.createElement("label");label.className="bulb";
      const checkbox=document.createElement("input");checkbox.type="checkbox";
      checkbox.checked=this.sel.has(s.entity_id);
      checkbox.addEventListener("change",()=>checkbox.checked?this.sel.add(s.entity_id):this.sel.delete(s.entity_id));
      const t=document.createTextNode(" "+(s.attributes?.friendly_name||s.entity_id));
      label.append(checkbox,t);list.append(label);
    }
  }
  listScenes(){
    return sortedScenes(this._statesOverride||this._hass?.states);
  }
  async loadSelection(){
    try{this.selection=visibleSelection(await this._hass.callWS(DASHBOARD_QUERY),this.listScenes());}
    catch(error){this.say("Lecture de la sélection impossible : "+err(error),true);}
    this.renderScenes();
  }
  renderScenes(){
    if(!this.sceneBox)return;
    const scenes=this.listScenes();
    const selected=new Set(this.selection||defaultSelection(scenes));
    const disabled=this.busy||this._hass?.user?.is_admin!==true;
    const signature=JSON.stringify([scenes.map(s=>[s.entity_id,s.attributes.friendly_name]),
      this.selection,disabled]);
    if(signature===this.scenesSignature)return;
    this.scenesSignature=signature;
    this.sceneBox.replaceChildren();
    this.counter.textContent=selected.size+" / 10 affichées";
    if(!scenes.length){
      const p=document.createElement("p");p.className="quiet";
      p.textContent="Aucune scène lumineuse KIMIA enregistrée.";
      this.sceneBox.append(p);
    }
    for(const scene of scenes){
      const line=document.createElement("div");line.className="scene-row";
      const name=document.createElement("span");
      name.textContent=scene.attributes.friendly_name||scene.entity_id;
      const label=document.createElement("label");label.className="quiet";
      const check=document.createElement("input");check.type="checkbox";
      check.setAttribute("aria-label","Afficher dans le dashboard client : "+bare(name.textContent));
      const id=scene.attributes.id;
      check.checked=selected.has(id);
      check.disabled=disabled||!this.selection||(!check.checked&&selected.size>=LIMIT);
      check.addEventListener("change",()=>this.setShown(id,check.checked));
      label.append(check,document.createTextNode(" Afficher dans le dashboard client"));
      const button=document.createElement("button");
      button.type="button";button.className="danger";button.textContent="Supprimer";
      button.disabled=disabled;
      button.addEventListener("click",()=>this.deleteScenes([scene]));
      line.append(name,label,button);this.sceneBox.append(line);
    }
    this.removeAllButton.hidden=!scenes.length;
    this.removeAllButton.disabled=disabled;
    this.voiceButton.disabled=disabled;
  }
  say(msg,bad=false){this.status.textContent=msg;this.status.className="status"+(bad?" error":"");}
  async mutate(action){
    if(this.busy||this._hass?.user?.is_admin!==true)return;
    this.busy=true;this.refreshBulbs();this.renderScenes();
    try{
      const locks=globalThis.navigator?.locks;
      const message=locks?await locks.request("kimia-ai-scenes",action):await action();
      this.say(message);
    }catch(error){
      this.say(err(error),true);
      try{await this.loadSelection();}catch(_){}
    }finally{
      this.busy=false;this.refreshBulbs();this.renderScenes();
    }
  }
  async saveSelection(ids,states,previous=[]){
    const save=window.KimiaSmartCore?.saveSceneSelection;
    if(typeof save!=="function")throw Error("Recharge la ressource KIMIA Smart Core avant de modifier la sélection.");
    await save({...this._hass,states},ids,previous);
    this.selection=ids;
  }
  async setShown(id,on){
    return this.mutate(async()=>{
      const states=await readLive(this._hass);
      const choices=visibleSelection(await this._hass.callWS(DASHBOARD_QUERY),sortedScenes(states));
      const selected=new Set(choices);
      if(on)selected.add(id);else selected.delete(id);
      if(selected.size>LIMIT)throw Error("Dix scènes maximum. Décoche d’abord une ambiance.");
      await this.saveSelection([...selected],states);
      return selected.size+" / 10 affichées.";
    });
  }
  async finishChange(states,ids,previousEntities,configs,drafts,oldVoice){
    const catalog=buildCatalog(sortedScenes(states),configs,drafts);
    this._statesOverride=states;
    const outcomes=await Promise.allSettled([
      this.saveSelection(ids,states,previousEntities),
      syncVoice(this._hass,catalog,oldVoice)
    ]);
    const failures=outcomes.map((result,index)=>result.status==="rejected"?
      (index===0?"Lumières : ":"Assist : ")+err(result.reason):null).filter(Boolean);
    if(failures.length)throw Error("Scènes enregistrées. "+failures.join(" ")+" Utilise « Actualiser le script vocal » pour reprendre la synchronisation.");
    return outcomes[1].value;
  }
  async refreshVoice(){
    return this.mutate(async()=>{
      const hass=this._hass,states=await readLive(hass),scenes=sortedScenes(states);
      const config=await hass.callWS(DASHBOARD_QUERY);
      const saved=await readManaged(hass,scenes.map(s=>s.attributes.id));
      const oldVoice=await readVoice(hass);
      backup(saved,oldVoice,config);
      const drafts=new Map(Object.values(catalogOf(oldVoice)||{}).map(s=>[s.id,s]));
      await this.finishChange(states,visibleSelection(config,scenes),[],saved,drafts,oldVoice);
      return scenes.length+" ambiance(s) dans le script vocal. Exposition Assist vérifiée.";
    });
  }
  async deleteScenes(scenes){
    if(this.busy||this._hass?.user?.is_admin!==true)return;
    const selected=(scenes||[]).filter(ownsState);
    if(!selected.length)return;
    const label=selected.length===1?selected[0].attributes.friendly_name:selected.length+" scènes KIMIA";
    if(!window.confirm("Supprimer définitivement "+label+" ?"))return;
    return this.mutate(async()=>{
      const hass=this._hass,states=await readLive(hass),current=sortedScenes(states);
      const changes=new Map(selected.map(s=>[s.attributes.id,null]));
      if(selected.some(s=>!current.some(c=>c.entity_id===s.entity_id&&c.attributes.id===s.attributes.id)))
        throw Error("Le catalogue a changé. Réessaie après actualisation.");
      const saved=await readManaged(hass,current.map(s=>s.attributes.id));
      if([...changes.keys()].some(id=>!saved.get(id)))throw Error("Une scène n’est plus modifiable.");
      const [config,oldVoice]=await Promise.all([hass.callWS(DASHBOARD_QUERY),readVoice(hass)]);
      backup(saved,oldVoice,config);
      const live=await changeScenes(hass,changes,saved,found=>found.every(s=>!changes.has(s.attributes.id)));
      const ids=visibleSelection(config,current).filter(id=>!changes.has(id));
      const drafts=new Map(Object.values(catalogOf(oldVoice)||{}).map(s=>[s.id,s]));
      const note=await this.finishChange(live,ids,current.map(s=>s.entity_id),saved,drafts,oldVoice);
      return changes.size+" scène(s) KIMIA supprimée(s)."+note;
    });
  }
  async generate(){
    return this.mutate(async()=>{
      const hass=this._hass,selected=[...this.sel].map(id=>hass.states[id]).filter(eligible);
      if(!selected.length)throw Error(this.sel.size?
        "Aucune ampoule sélectionnée ne répond. Les scènes existantes sont conservées.":
        "Sélectionne au moins une ampoule joignable.");
      if(selected.length!==this.sel.size)
        throw Error("Certaines ampoules sélectionnées ne répondent plus. Réessaie ou modifie la sélection.");
      if(!this.aiSelect.value)throw Error("Sélectionne une entité AI Task pour la génération.");
      this.say("Gemini prépare les 20 ambiances…");
      const lights=selected.map(s=>({entity_id:s.entity_id,name:s.attributes?.friendly_name||s.entity_id,
        supported_color_modes:s.attributes?.supported_color_modes||[],
        min_kelvin:s.attributes?.min_color_temp_kelvin,max_kelvin:s.attributes?.max_color_temp_kelvin}));
      const instructions=[
        "Crée EXACTEMENT 20 scènes lumineuses fixes, vraiment différentes, sans animation ni horaire.",
        "Ambiances souhaitées : "+this.prompt,
        "Suggestions si elles conviennent : "+THEMES,
        "Noms uniques (48 caractères maximum), descriptions visuelles courtes (140 caractères maximum : couleurs, intensité, effet).",
        "Ampoules autorisées et capacités : "+JSON.stringify(lights),
        "Réponds uniquement avec un JSON valide suivant cet exemple :",
        '{"scenes":[{"name":"Détente","description":"Orange chaud à faible intensité","lights":[{"entity_id":"light.exemple","off":false,"brightness_pct":40,"mode":"color","color":"#FFAA66","kelvin":3000}]}]}',
        "Dans chaque scène, décris chaque ampoule autorisée exactement une fois. Aucune autre entité.",
        "off est un booléen. brightness_pct est un entier de 1 à 100. Au moins une ampoule doit rester allumée.",
        "mode vaut color ou white. color est #RRGGBB. Utilise color uniquement pour hs, xy, rgb, rgbw ou rgbww.",
        "Pour le blanc variable, utilise white et une valeur kelvin entière dans les limites de l’ampoule.",
        "Pour les ampoules uniquement dimmables ou marche/arrêt, utilise white. Varie la luminosité ou l’état selon leurs capacités."
      ].join("\n");
      const result=await hass.callApi("POST","services/ai_task/generate_data?return_response",{
        task_name:"KIMIA ambiances lumineuses",instructions,entity_id:this.aiSelect.value});
      const response=result?.service_response?.data;
      if(response==null)throw Error("Google AI Task n’a renvoyé aucune ambiance. Les scènes précédentes sont conservées.");
      const draft=validate(response,selected);
      const states=await readLive(hass),current=sortedScenes(states);
      if(selected.some(light=>!eligible(states[light.entity_id])))
        throw Error("Une ampoule sélectionnée ne répond plus. Les scènes précédentes sont conservées.");
      const saved=await readManaged(hass,Array.from({length:COUNT},(_,i)=>idAt(i)));
      const [config,oldVoice]=await Promise.all([hass.callWS(DASHBOARD_QUERY),readVoice(hass)]);
      const identified=assignStableIds(draft,[...saved.values()].filter(Boolean),visibleSelection(config,current));
      const changes=new Map(identified.scenes.map(s=>[s.id,sceneConfig(s)]));
      backup(saved,oldVoice,config);
      this.say("Enregistrement des 20 scènes lumineuses…");
      const live=await changeScenes(hass,changes,saved,found=>found.length===COUNT&&found.every(s=>{
        const expected=changes.get(s.attributes.id);
        return expected?.name===s.attributes.friendly_name&&JSON.stringify(Object.keys(expected.entities).sort())===
          JSON.stringify((s.attributes.entity_id||[]).slice().sort());
      }));
      const drafts=new Map(identified.scenes.map(s=>[s.id,{name:bare(s.name),description:s.description}]));
      const note=await this.finishChange(live,identified.selection,current.map(s=>s.entity_id),changes,drafts,oldVoice);
      return "20 scènes enregistrées. "+identified.selection.length+" / 10 affichées."+note;
    });
  }

}
class Launchpad extends HTMLElement{
  constructor(){super();this.attachShadow({mode:"open"});this.signature="";}
  setConfig(c){this.config=c||{};this.draw();}
  set hass(h){
    this._hass=h;
    if(!this.selectionPromise)this.selectionPromise=h.callWS(DASHBOARD_QUERY).then(config=>{
      this.dashboard=config;this.draw();
    }).catch(()=>{});
    const sig=this.find().map(s=>s.entity_id+"|"+s.attributes?.friendly_name).join(";");
    if(sig!==this.signature){this.signature=sig;this.draw();}
  }
  connectedCallback(){this.draw();}
  find(){
    const scenes=sortedScenes(this._hass?.states);
    const ids=new Set(visibleSelection(this.dashboard,scenes));
    return scenes.filter(s=>ids.has(s.attributes.id));
  }
  draw(){
    if(!this._hass)return;
    this.shadowRoot.innerHTML=htmlStyle+"<ha-card><h3>Mes ambiances</h3><div class='grid'></div><p class='status'></p></ha-card>";
    const box=this.shadowRoot.querySelector(".grid"),list=this.find();
    if(!list.length){box.textContent="Aucune ambiance sélectionnée pour Lumières.";return;}
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
for(const item of [{type:"kimia-ai-scenes-settings-card",name:"KIMIA — Générateur IA",description:"Génère vingt scènes Gemini permanentes."},{type:"kimia-ai-scenes-shortcuts-card",name:"KIMIA — Mes ambiances",description:"Raccourcis pour scènes lumineuses IA."}])
  if(!window.customCards.some(c=>c.type===item.type))window.customCards.push(item);
})();
