const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const assetDir=fs.existsSync(path.join(root,'dist'))?'dist':'app';
const asset=name=>path.join(root,assetDir,name);
const K=require(asset('kit.js'));
test('fresh participant package includes stock, settings and learning modules with one illustrated sample and without prior returns',()=>{
 const html=fs.readFileSync(asset('index.html'),'utf8');
 for(const name of ['history.js','extensions.js','workspace.css','completed-articles.json'])assert.ok(fs.existsSync(asset(name)),name);
 assert.match(html,/記事ストック/);assert.match(html,/学習・設定/);assert.match(html,/変更履歴/);
 const entries=JSON.parse(fs.readFileSync(asset('completed-articles.json'))).entries;
 assert.equal(entries.length,1);
 const [sample]=entries;
 assert.equal(sample.id,'workshop3-sample');
 const payload=JSON.parse(fs.readFileSync(asset(sample.url.slice(1))));
 const C=require(asset('core.js')),X=require(asset('extensions.js')),H=require(asset('history.js'));
 assert.equal(payload.requestId,sample.id);
 assert.equal(X.article(payload.data,C.normalize(payload.input)).title,sample.title);
 assert.match(sample.title,/【サンプル】/);
 const origin='https://participant.example.org';
 assert.equal(H.stockImageUrl(payload.images.cover,'cover',origin),origin+payload.images.cover);
 assert.equal(fs.readFileSync(asset(payload.images.cover.slice(1))).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.deepEqual(fs.readdirSync(asset('returns')),['README.txt']);
});
test('two participant sites use their own identity and never the instructor site',()=>{
 assert.equal(typeof K.projectId,'function');
 for(const id of ['appgprj_participant_a','appgprj_participant_b'])assert.equal(K.projectId({querySelector:()=>({content:id})}),id);
 assert.equal(K.projectId({querySelector:()=>null}),'');
 const app=fs.readFileSync(asset('app.js'),'utf8');assert.doesNotMatch(app,/appgprj_[a-zA-Z0-9]{20,}/);assert.doesNotMatch(app,/terakoya-note-workshop3-hayashi/);
});
test('starter and skills use one new immutable release with all referenced files',()=>{
 assert.equal(K.version,'1.2.2');assert.match(K.base,/note-article-v1-20261107-sample\/releases\/note-article-v1\/$/);
 const starter=fs.existsSync(path.join(root,'STARTER_PROMPT.txt'))?'STARTER_PROMPT.txt':'開始文.txt';
 assert.ok(fs.readFileSync(path.join(root,starter),'utf8').includes(K.base+'BUILD_PROMPT.md'));
 const html=fs.readFileSync(asset('index.html'),'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g))if(!match[1].startsWith('http'))assert.ok(fs.existsSync(asset(match[1])),match[1]);
 assert.ok(fs.existsSync(path.join(root,'skills/natural-japanese/SKILL.md')));
});

test('article jobs carry the same released writing, return and Japanese finishing skills',()=>{const C=require(asset('core.js')),B=require(asset('bridge.js'));const p=B.wrap('記事制作',B.request('article',C.uid(),'', 'https://participant.example.org','base'));for(const key of ['writing','returns','natural'])assert.ok(p.includes(K.skills[key]));});
