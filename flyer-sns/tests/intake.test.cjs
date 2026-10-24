const assert=require('node:assert/strict');const I=require('../intake.js'),S=require('../state.js'),C=require('../consult.js');
assert.deepEqual(S.normalize(null).outputs,{flyer:true,portrait:false,square:false,landscape:false});assert.equal(S.normalize({outputs:{square:true,flyer:false}}).outputs.square,true);
assert.equal(I.url('javascript:alert(1)'), '');assert.equal(I.url('https://user:pass@example.com'), '');
const j=I.job({name:'保存済'},'https://example.com/lp','','https://test.chatgpt.site');const r={schemaVersion:1,requestId:j.id,targetSite:j.origin,status:'complete',data:{source:{url:j.sourceUrl,status:'read',unknowns:[]},fields:{name:'案',audience:'対象'}}};
assert.equal(I.validate(r,j).fields.name,'案');assert.throws(()=>I.validate({...r,requestId:'wrong'},j));assert.throws(()=>I.validate({...r,data:{...r.data,source:{status:'read',url:'https://wrong.example'}}},j));
assert.deepEqual(I.validate({...r,data:{...r.data,source:{url:j.sourceUrl,status:'unreadable'}}},j).fields,{});
assert.equal(C.applyFields({name:'保存済'},r.data).fields.name,'保存済');assert.match(I.prompt(j,''),/参照LP URLと申込先URLは別/);console.log('intake/defaults/protection tests passed');

assert.equal(I.validate({...r,data:{...r.data,source:{...r.data.source,unknowns:{bad:true}}}},j).source.unknowns.length,0);
assert.equal(C.applyFields({}, {fields:{url:'javascript:alert(1)',headline:'<script>alert(1)</script>',unknown:'x'}}).fields.url,undefined);
assert.equal(C.applyFields({}, {fields:{url:'javascript:alert(1)',unknown:'x'}}).applied,0);
assert.match(I.prompt(j,''),/共有範囲は変更しない/);
assert.doesNotMatch(I.prompt(j,''),/このSiteは公開設定/);
