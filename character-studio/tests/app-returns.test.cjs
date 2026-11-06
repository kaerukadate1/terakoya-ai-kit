const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../app/core.js'),B=require('../app/bridge.js');
const KEY='terakoya-character-studio-v1',JOB=KEY+'-portrait-job',SITE='https://example.chatgpt.site';
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const makeDraft=()=>({...C.blank(),name:'受け取り検証'});
const receipt=j=>({schemaVersion:1,requestId:j.id,assistantId:j.assistantId,visualKey:j.visualKey,targetSite:j.targetSite,status:'complete',imageUrl:`/returns/${j.id}/image.png`});
// Minimal DOM doubles exercise event ordering and storage, not visual rendering.
class Element{
  constructor(id=''){this.id=id;this.listeners={};this.dataset={};this.style={setProperty(){}};this.classList={toggle(){}};this.value='';this.files=[];this.hidden=false;}
  addEventListener(type,f){(this.listeners[type]??=[]).push(f);}
  async emit(type,event={target:this}){for(const f of this.listeners[type]||[])await f(event);}
  replaceChildren(){} append(){} setAttribute(){} removeAttribute(){} insertAdjacentHTML(){} focus(){} select(){} click(){} remove(){} showModal(){} close(){}
}
function boot({d=makeDraft(),j=null,fetcher,onOpen}={}){
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
  const panels=['role','personality','appearance','package','library'].map(get),buttons=panels.map(p=>{const b=new Element();b.dataset.step=p.id;return b;});
  const doc=new Element();doc.documentElement=new Element();doc.body=new Element();doc.getElementById=get;doc.querySelector=s=>get(s);doc.querySelectorAll=s=>s==='.panel'?panels:s==='[data-step]'?buttons:[];
  doc.createElement=tag=>tag==='canvas'?{getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/webp;base64,AAAA'}:new Element();
  const raw={schemaVersion:2,draft:d,assistants:[]},store=new Map([[KEY,JSON.stringify(raw)]]);if(j)store.set(JOB,JSON.stringify(j));
  const fetchImpl=fetcher||(async()=>new Response('',{status:404}));
  const win=new Element();win.CharacterCore=C;win.AssistantBridge={...B,receive:j=>B.receive(j,fetchImpl)};win.open=()=>{onOpen?.(store);return {};};
  const scheduled=new Map();let nextTimer=0;
  const env={window:win,document:doc,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},location:{origin:SITE,href:SITE+'/#package',hash:'#package'},history:{replaceState(){}},scrollTo(){},navigator:{clipboard:{writeText:async()=>{}}},setTimeout:f=>{const id=++nextTimer;scheduled.set(id,f);return id;},clearTimeout:id=>scheduled.delete(id),setInterval(){},fetch:fetchImpl,Image:class{constructor(){this.width=512;this.height=512;}async decode(){}},URL,Blob,Uint8Array,AbortSignal,Date,Intl,console};
  vm.runInNewContext(fs.readFileSync(require.resolve('../app/app.js'),'utf8'),env);
  return {get,doc,win,store,async flush(){for(const [id,f]of [...scheduled]){scheduled.delete(id);await f();}},saved:()=>JSON.parse(store.get(KEY))};
}
const imageFetcher=j=>async url=>url.includes('result.json')?new Response(JSON.stringify(receipt(j)),{headers:{'content-type':'application/json'}}):new Response(png,{headers:{'content-type':'image/png'}});
test('package renders the matching skill name and explanation for every role',()=>{for(const r of C.ROLES){const app=boot({d:{...makeDraft(),role:r.id}}),s=C.skillFor(r.id);assert.equal(app.get('package-skill-name').textContent,s.name);assert.equal(app.get('package-skill-description').textContent,s.description);}});
test('reload checks pending return immediately and persists image before clearing job',async()=>{const d=makeDraft(),j=B.request(d,SITE),app=boot({d,j,fetcher:imageFetcher(j)});await app.flush();assert.ok(app.saved().draft.avatar);assert.equal(app.store.has(JOB),false);assert.match(app.get('production-status').textContent,/受け取りました/);});
test('an untouched stale tab must not overwrite newer data on pagehide',async()=>{const app=boot(),newer={...app.saved(),draft:{...app.saved().draft,name:'新しい保存済み設定'}};app.store.set(KEY,JSON.stringify(newer));await app.win.emit('pagehide');assert.equal(app.saved().draft.name,'新しい保存済み設定');});
test('failed manual upload retains pending request and previous image',async()=>{const d=makeDraft(),j=B.request(d,SITE);d.avatar='data:image/png;base64,AAAA';const app=boot({d,j});app.get('avatar-input').files=[new Blob(['not an image'],{type:'image/png'})];await app.get('avatar-input').emit('change');assert.equal(app.saved().draft.avatar,d.avatar);assert.equal(app.store.has(JOB),true);});
test('successful manual upload cancels pending return only after image is saved',async()=>{const d=makeDraft(),j=B.request(d,SITE),app=boot({d,j});app.get('avatar-input').files=[new Blob([png],{type:''})];await app.get('avatar-input').emit('change');assert.ok(app.saved().draft.avatar);assert.equal(app.store.has(JOB),false);assert.match(app.get('production-status').textContent,/アップロードしました/);});
test('request and draft are saved before opening ChatGPT',async()=>{let checked=false;const app=boot({onOpen:store=>{const j=JSON.parse(store.get(JOB)),s=JSON.parse(store.get(KEY));assert.ok(B.matches(j,s.draft));checked=true;}});await app.get('produce-package').emit('click');assert.ok(checked);});
test('temporary network failure can be retried without regenerating the image',async()=>{const d=makeDraft(),j=B.request(d,SITE);let fail=true;const app=boot({d,j,fetcher:async url=>{if(fail)throw new TypeError('network');return imageFetcher(j)(url);}});await app.flush();assert.equal(app.store.has(JOB),true);assert.match(app.get('production-status').textContent,/通信/);fail=false;await app.get('check-return').emit('click');assert.ok(app.saved().draft.avatar);assert.equal(app.store.has(JOB),false);});
test('image arriving after visual selection changes is not applied',async()=>{const d=makeDraft(),j=B.request(d,SITE);let release,started;const announced=new Promise(r=>started=r),gate=new Promise(r=>release=r);const app=boot({d,j,fetcher:async url=>{if(url.includes('image.png')){started();await gate;}return imageFetcher(j)(url);}});const initial=app.flush();await announced;await app.doc.emit('input',{target:{name:'mainColor',type:'text',value:'#ff0000',closest:()=>({})}});release();await initial;await app.flush();assert.equal(app.saved().draft.avatar,'');assert.equal(app.store.has(JOB),true);});
