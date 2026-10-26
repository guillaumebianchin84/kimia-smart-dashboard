/* KIMIA V1.5 — tests ciblés des quatre remarques de la revue utilisateur. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const registry=new Map();
const customElements={get:k=>registry.get(k),define:(k,c)=>registry.set(k,c)};
const document={createElement:tag=>({
 tag,textContent:"",className:"",children:[],
 append(...nodes){this.children.push(...nodes);},
 replaceChildren(...nodes){this.children=nodes;}
})};
const window={customCards:[]};
for(const path of ["www/kimia-services-v14-card.js","www/kimia-user-visibility-v15-card.js"])
 vm.runInNewContext(fs.readFileSync(path,"utf8"),{window,customElements,document});
const todo=registry.get("kimia-services-v14-card");
const users=registry.get("kimia-user-visibility-v15-card");
assert(todo&&users);
const clone=v=>JSON.parse(JSON.stringify(v));
const config={views:[
 {path:"carte",sections:[{type:"grid",cards:[{
  type:"map",entities:["zone.home"],show_all:false,grid_options:{columns:12,rows:6}
 }]}]},
 {path:"listes",sections:[{type:"grid",cards:[
  {type:"todo-list",entity:"todo.shopping_list",title:"Mes listes",
    grid_options:{columns:12,rows:"auto"}}]}]}
]};
let current=clone(config),writes=0;
const state={
 "todo.shopping_list":{attributes:{friendly_name:"Courses"}},
 "todo.menage":{attributes:{friendly_name:"Ménage"}},
 "todo.vacances":{attributes:{friendly_name:"Vacances"}}
};
const ws=async r=>{
 if(r.type==="lovelace/config")return clone(current);
 if(r.type==="lovelace/config/save"){current=clone(r.config);writes++;return {};}
 throw Error("Unexpected "+r.type);
};
const cards=v=>current.views.find(x=>x.path===v).sections.flatMap(s=>s.cards);
const service=Object.create(todo.prototype);
Object.assign(service,{_hass:{user:{is_admin:true},states:state,callWS:ws},_busy:false,
 _render(){},_status(m,e){this._error=e?m:"";this._notice=e?"":m;},
 _selectedPositions:new Set(["zone.home","person.parent"]),
 _selectedTodos:new Set(["todo.shopping_list","todo.menage","todo.vacances"]),
 _todoNames:new Map(Object.keys(state).map(k=>[k,state[k].attributes.friendly_name])),
 _notice:"",_error:"",_newName:""});
async function test(){
 await service._save();
 assert.equal(writes,1,"Carte/Listes saved to kimia-next");
 assert.deepEqual(cards("carte")[0].entities,["zone.home","person.parent"]);
 assert.equal(cards("carte")[0].show_all,false);
 assert.deepEqual(cards("listes").filter(c=>c.type==="todo-list").map(c=>c.entity),
  ["todo.shopping_list","todo.menage","todo.vacances"]);
 await service._save();
 assert.equal(writes,1,"second save idempotent");
 service._selectedTodos.add("todo.fourth");
 await service._save();
 assert.match(service._error,/Trois listes/);
 assert.equal(writes,1,"fourth list refused");
 service._selectedTodos.delete("todo.fourth");
 current.views[1].sections[0].cards.push({type:"todo-list",entity:"todo.custom",
  title:"Titre personnel",grid_options:{columns:12,rows:"auto"}});
 await service._save();
 assert.match(service._error,/modifiée manuellement/);
 assert.equal(cards("listes").find(c=>c.entity==="todo.custom").title,"Titre personnel");
 assert.equal(writes,1,"custom list never overwritten");

 // Local To-do creation: two-stage config-flow. No YAML/list-card side effects.
 const calls=[];
 service._hass.callApi=async(method,path,data)=>{
  calls.push({method,path,data});
  return calls.length===1?{type:"form",flow_id:"flow-1"}:
   {type:"create_entry",result:{entry_id:"entry-1"}};
 };
 service._newName="Courses 2026";
 await service._createTodo();
 assert.equal(calls.length,2);
 assert.deepEqual(calls[0].data,{handler:"local_todo"});
 assert.deepEqual(calls[1].data,{todo_list_name:"Courses 2026"});
 assert.equal(service._newName,"");

 // HA user creation: non-admin standard group; password never sent to UI config.
 const wscalls=[];
 const u=Object.create(users.prototype);
 Object.assign(u,{_busy:false,_error:"",_notice:"",_creating:true,_userId:"parent",
  _users:[{id:"parent",name:"Parent",username:"parent"}],
  _hass:{user:{is_admin:true},callWS:async command=>{
   wscalls.push(command);
   if(command.type==="config/auth/create")
    return {user:{id:"child-1",name:"Enfant"}};
   if(command.type==="config/auth_provider/homeassistant/create")return {};
   throw Error(command.type);
  }},_render(){},async _load(){}});
 await u._createUser({name:"Enfant",username:"enfant",password:"motdepasse-test"});
 assert.equal(wscalls.length,2);
 assert.deepEqual(wscalls[0].group_ids,["system-users"]);
 assert.equal(wscalls[1].user_id,"child-1");
 assert.equal(u._userId,"child-1");
 assert(!JSON.stringify(current).includes("motdepasse-test"));
 await u._createUser({name:"Utilisateur",username:"Nom non valide",password:"abcdefgh"});
 assert.equal(wscalls.length,2,"invalid username rejected");

 // Saved recap not affected by unsaved checkbox changes.
 const review=Object.create(users.prototype);
 Object.assign(review,{
  _profiles:{parent:["terrasse"]},_userId:"parent",
  _users:[{id:"parent",name:"Parent"}],
  _areas:[{area_id:"salon",name:"Salon"},{area_id:"terrasse",name:"Terrasse"}],
  _hidden:new Set(["salon"])
 });
 const view={children:[],append(...nodes){this.children.push(...nodes);}};
 review._renderSummary(view);
 const allText=JSON.stringify(view);
 assert(allText.includes("Salon")&&allText.includes("Terrasse"));
 assert(allText.includes("Pièces visibles : 1 / 2"));
 console.log("KIMIA review V1.5 OK : checkbox map, 3 To-do, creation flow, HA account, saved recap.");
}
test().catch(e=>{console.error(e);process.exitCode=1;});
