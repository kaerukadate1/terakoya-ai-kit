const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {run,TOOLS}=require('../scripts/generate-tool-release.cjs');
for(const tool of TOOLS)if(fs.existsSync(path.join(__dirname,'..',tool,'release-map.json')))test(tool+' source matches all compatibility outputs',()=>assert.deepEqual(run({tool}).changed,[]));
test('check never writes; generation is idempotent and rejects unsafe mappings',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tool-release-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'lp'));fs.writeFileSync(path.join(root,'lp/source.txt'),'test');
 const config={allowedTargets:['releases/test'],files:[{source:'source.txt',target:'releases/test/output.txt'}]};
 const save=()=>fs.writeFileSync(path.join(root,'lp/release-map.json'),JSON.stringify(config));save();
 assert.equal(run({tool:'lp',root}).changed.length,1);assert.equal(fs.existsSync(path.join(root,'releases')),false);
 run({tool:'lp',root,write:true});assert.deepEqual(run({tool:'lp',root,write:true}).changed,[]);
 config.files[0].target='../escape';save();assert.throws(()=>run({tool:'lp',root,write:true}),/Unsafe/);
 config.files[0].target='docs/not-allowed';save();assert.throws(()=>run({tool:'lp',root,write:true}),/allowlist/);
});
