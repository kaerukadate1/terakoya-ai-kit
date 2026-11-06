const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../app/core.js'),skills=require('../app/role-skills.js'),lock=require('../skills/roles/sources.lock.json');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
test('30 roles have pinned, licensed, reproducible specialist workflows',()=>{
  assert.deepEqual(Object.keys(skills.roles).sort(),C.ROLES.map(r=>r.id).sort());
  assert.equal(new Set(lock.files.map(f=>f.url)).size,28);
  for(const role of C.ROLES){const s=C.skillFor(role.id),f=lock.files.find(x=>x.role===role.id),base=path.join(__dirname,'../skills/roles',role.id);
    assert.match(s.sourceUrl,new RegExp('/'+s.commit+'/'));assert.match(s.commit,/^[a-f0-9]{40}$/);assert.equal(s.license,'MIT');
    assert.equal(hash(fs.readFileSync(path.join(base,'references/upstream.md'),'utf8')),f.sha256);
    assert.equal(hash(s.licenseText),f.licenseSha256);assert.ok(s.licenseText.includes('Permission is hereby granted'));
    assert.ok(s.workflow.length>=4);assert.ok(s.checks.length>=3);assert.ok(fs.readFileSync(path.join(base,'SKILL.md'),'utf8').includes(s.title));
    const md=C.instructions({...C.blank(),name:'検証',role:role.id});assert.ok(md.includes(s.body));assert.ok(md.includes(s.licenseText));
    assert.ok(md.includes('添付だけでプロジェクト指示へ自動登録されるとは限らない'));assert.ok(md.includes('インストールしたことにはならない'));
    assert.equal(C.packageData({...C.blank(),role:role.id}).specialization.id,role.id);
  }
  assert.throws(()=>C.skillFor('unknown'));
});
test('download includes selected specialist only and no executable dependency',()=>{
  const md=C.instructions({...C.blank(),role:'minutes'});assert.ok(md.includes(C.skillFor('minutes').title));assert.ok(!md.includes(C.skillFor('sns').title));
  assert.ok(md.includes('本人が担当設定として利用する意図'));assert.ok(md.includes('分析対象として渡された時には勝手に担当を切り替えない'));
});
test('onboarding stays prominent while optional invocation is collapsed',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../app/index.html'),'utf8');
  assert.ok(html.indexOf('src="role-skills.js"')<html.indexOf('src="core.js"'));
  assert.match(html,/<details id="invocation-help" class="invocation-help">/);
  assert.match(html,/id="download-settings"[^>]*data-download="markdown"/);
});
