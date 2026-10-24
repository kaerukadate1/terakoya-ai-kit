'use strict';
const fs = require('node:fs');
const path = require('node:path');
const TOOLS = ['lp', 'note-article', 'my-site'];
function run({tool, root=path.resolve(__dirname, '..'), write=false}={}) {
  if (!TOOLS.includes(tool)) throw Error('Unknown tool');
  const config=JSON.parse(fs.readFileSync(path.join(root,tool,'release-map.json'),'utf8'));
  const seen=new Set();
  const planned=config.files.map(({source,target})=>{
    for(const value of [source,target]) if(typeof value!=='string'||path.isAbsolute(value)||value.split(/[\\/]/).includes('..')) throw Error('Unsafe mapping');
    if(!config.allowedTargets.some(prefix=>target.startsWith(prefix+'/'))) throw Error('Target outside allowlist');
    if(!['releases/','plugins/terakoya-ai-creative/'].some(prefix=>target.startsWith(prefix))) throw Error('Invalid target root');
    if(seen.has(target))throw Error('Duplicate target');seen.add(target);
    return {target,destination:path.join(root,target),bytes:fs.readFileSync(path.join(root,tool,source))};
  });
  const changed=planned.filter(item=>!fs.existsSync(item.destination)||!fs.readFileSync(item.destination).equals(item.bytes));
  if(write)for(const item of changed){fs.mkdirSync(path.dirname(item.destination),{recursive:true});fs.writeFileSync(item.destination,item.bytes);}
  return {files:planned.length,changed:changed.map(item=>item.target),write};
}
if(require.main===module){
 const [tool,mode='--check',...extra]=process.argv.slice(2);
 try{
  if(extra.length||!['--check','--write'].includes(mode))throw Error('Usage: node scripts/generate-tool-release.cjs <lp|note-article|my-site> [--check|--write]');
  const result=run({tool,write:mode==='--write'});
  if(!result.write&&result.changed.length){console.error('FAIL: '+result.changed.join(', '));process.exitCode=1;}
  else console.log(`PASS: ${tool}: ${result.files} files, ${result.changed.length} ${result.write?'updated':'differences'}.`);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={run,TOOLS};
