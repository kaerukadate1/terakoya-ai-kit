// 作戦ボード: Workが返したJSONを検証し、ツール側で図解を描く。Workに画像やHTMLを作らせない。
(function(root,factory){const api=factory(root.CharacterCore||(typeof require==='function'?require('./core.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;root.AssistantBoard=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const WINDOW_MS=60*60*1000,ID=/^[a-zA-Z0-9-]{8,100}$/,FIT=['強い','弱い','空白'],STATUS=['ok','stuck','unknown'];
  const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const t=(v,max)=>typeof v==='string'?v.replace(/[\u0000-\u001f]+/g,' ').trim().slice(0,max):'';
  const list=(v,max,fn)=>Array.isArray(v)?v.slice(0,max).map(fn).filter(Boolean):[];
  const points=(v,max=4)=>list(v,max,x=>t(x,70));
  const pair=v=>({low:t(v?.low,24),high:t(v?.high,24)});
  function origin(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.origin:'';}catch{return '';}}
  function diagram(kind,raw){
    raw=raw&&typeof raw==='object'?raw:{};
    if(kind==='triangle'){const n=k=>({points:points(raw.nodes?.[k]?.points,3)}),d={nodes:{customer:n('customer'),competitor:n('competitor'),company:n('company')},center:t(raw.center,140)};if(Object.values(d.nodes).some(x=>!x.points.length))throw Error('3つの視点がそろっていません。');return d;}
    if(kind==='quad'){const cells=list(raw.cells,4,c=>{const title=t(c?.title,30);return title&&{title,points:points(c.points),highlight:c.highlight===true};});if(cells.length!==4)throw Error('4つの領域がそろっていません。');const d={cells};if(raw.axisX&&raw.axisY){d.axisX=pair(raw.axisX);d.axisY=pair(raw.axisY);}return d;}
    if(kind==='pairs'){const rows=list(raw.rows,6,r=>{const left=t(r?.left,70);return left&&{left,right:t(r.right,70),fit:FIT.includes(r.fit)?r.fit:'弱い'};});if(rows.length<2)throw Error('対応の行が足りません。');return {leftTitle:t(raw.leftTitle,24)||'お客さんの望み',rightTitle:t(raw.rightTitle,24)||'今の提供内容',rows};}
    if(kind==='flow'){const steps=list(raw.steps,7,s=>{const title=t(s?.title,30);return title&&{title,detail:t(s.detail,90),status:STATUS.includes(s.status)?s.status:'unknown'};});if(steps.length<3)throw Error('段階が足りません。');return {steps};}
    throw Error('対応していない図の種類です。');
  }
  function normalize(raw,roleId){
    const role=C.strategyFor(roleId);if(!role)throw Error('この担当は作戦ボードを作りません。');
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('作戦ボードの形式を確認してください。');
    const b={schemaVersion:1,role:roleId,kind:role.kind,title:t(raw.title,60)||C.skillFor(roleId).title,question:t(raw.question,90)||role.detail,answer:t(raw.answer,160),diagram:diagram(role.kind,raw.diagram),
      findings:list(raw.findings,6,f=>{const text=t(typeof f==='string'?f:f?.text,130);return text&&{text,basis:f?.basis==='確認'?'確認':'推測'};}),
      nextSteps:list(raw.nextSteps,3,s=>{const text=t(typeof s==='string'?s:s?.text,130);return text&&{text,when:t(s?.when,20),done:s?.done===true};}),
      handoff:null,brief:{},sources:list(raw.sources,8,s=>{const url=origin(s?.url)?String(s.url).slice(0,500):'';return url&&{title:t(s.title,80)||url,url,date:t(s.date,20)};})};
    if(!b.answer)throw Error('結論の一文がありません。');
    if(raw.handoff&&C.ROLES.some(r=>r.id===raw.handoff.role)&&!C.strategyFor(raw.handoff.role)){const task=t(raw.handoff.task,300);if(task)b.handoff={role:raw.handoff.role,task};}
    for(const k of ['business','customer','strength','competitors','direction'])b.brief[k]=t(raw.brief?.[k],240);
    return b;
  }
  const BRIEF=[['business','事業'],['customer','お客さん'],['strength','選ばれる理由'],['competitors','競合・代わりの手段'],['direction','いまの作戦']];
  function briefText(brief){return BRIEF.filter(([k])=>brief?.[k]).map(([k,label])=>`${label}: ${brief[k]}`).join('\n');}
  const ul=rows=>rows.length?`<ul>${rows.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  function draw(b){const d=b.diagram;
    if(b.kind==='triangle'){const node=(k,label)=>`<div class="tb-node tb-${k}"><b>${label}</b>${ul(d.nodes[k].points)}</div>`;return `<div class="tb-triangle"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 14 L17 84 L83 84 Z"/></svg>${node('customer','お客さんが求めること')}<div class="tb-center"><span>選ばれる理由</span>${esc(d.center||b.answer)}</div>${node('competitor','競合・代わりの手段')}${node('company','自分だけが出せること')}</div>`;}
    if(b.kind==='quad'){const axes=d.axisX?`<span class="tb-ax tb-ax-top">${esc(d.axisY.high)}</span><span class="tb-ax tb-ax-bottom">${esc(d.axisY.low)}</span><span class="tb-ax tb-ax-left">${esc(d.axisX.low)}</span><span class="tb-ax tb-ax-right">${esc(d.axisX.high)}</span>`:'';return `<div class="tb-quad${d.axisX?' tb-axes':''}">${axes}<div class="tb-cells">${d.cells.map(c=>`<div class="tb-cell${c.highlight?' tb-hot':''}">${c.highlight?'<i>ここを狙う</i>':''}<b>${esc(c.title)}</b>${ul(c.points)}</div>`).join('')}</div></div>${d.axisX?'<p class="tb-caution">位置は調べた情報からの見立てで、実測ではありません。</p>':''}`;}
    if(b.kind==='pairs')return `<div class="tb-pairs"><div class="tb-pairs-head"><b>${esc(d.leftTitle)}</b><span></span><b>${esc(d.rightTitle)}</b></div>${d.rows.map(r=>`<div class="tb-pair tb-fit-${FIT.indexOf(r.fit)}"><p>${esc(r.left)}</p><span>${esc(r.fit)}</span><p>${esc(r.right||'まだ応えていない')}</p></div>`).join('')}</div>`;
    return `<ol class="tb-flow">${d.steps.map(s=>`<li class="tb-${s.status}"><b>${esc(s.title)}</b><p>${esc(s.detail)}</p>${s.status==='stuck'?'<i>止まりそう</i>':s.status==='unknown'?'<i>未確認</i>':''}</li>`).join('')}</ol>`;
  }
  function render(b,meta={}){
    const who=meta.name?`<p class="tb-who">${esc(meta.name)}（${esc(meta.role||'')}）${meta.date?' ・ '+esc(meta.date):''}</p>`:'';
    return `<article class="tb"><header><p class="tb-q">${esc(b.question)}</p><h3>${esc(b.title)}</h3><p class="tb-answer">${esc(b.answer)}</p>${who}</header>${draw(b)}`+
      (b.findings.length?`<section><h4>分かったこと</h4><ul class="tb-findings">${b.findings.map(f=>`<li><span class="tb-basis tb-basis-${f.basis==='確認'?'ok':'guess'}">${f.basis}</span>${esc(f.text)}</li>`).join('')}</ul></section>`:'')+
      (b.nextSteps.length?`<section><h4>次の一手${meta.workId?'　<small>終わったらチェック</small>':''}</h4><ol class="tb-next">${b.nextSteps.map((s,i)=>`<li class="${s.done?'tb-done':''}">${meta.workId?`<label><input type="checkbox" data-step-work="${esc(meta.workId)}" data-step-index="${i}" ${s.done?'checked':''}>`:''}${s.when?`<span>${esc(s.when)}</span>`:''}${esc(s.text)}${meta.workId?'</label>':s.done?' ✓':''}</li>`).join('')}</ol></section>`:'')+
      (b.sources.length?`<section class="tb-sources"><h4>調べた情報</h4><ul>${b.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>${s.date?`（${esc(s.date)}）`:''}</li>`).join('')}</ul></section>`:'')+`</article>`;
  }
  const CSS=`.tb{--tb-main:#086c7e;--tb-gold:#b78b3c;--tb-ink:#1f2f33;--tb-muted:#5d6d70;--tb-line:#d5e0e2;--tb-tint:#eef5f6;background:#fff;color:var(--tb-ink);border:1px solid var(--tb-line);border-top:5px solid var(--tb-main);border-radius:8px;padding:26px 28px;font-size:13px;line-height:1.7;overflow-wrap:anywhere}
.tb header{margin-bottom:22px}.tb-q{font-size:12px;color:var(--tb-main);font-weight:700;margin:0 0 4px}.tb h3{font-size:15px;margin:0 0 12px;color:var(--tb-muted);font-weight:600}.tb-answer{font-size:21px;line-height:1.55;font-weight:700;margin:0;padding-left:14px;border-left:4px solid var(--tb-gold)}.tb-who{font-size:11px;color:var(--tb-muted);margin:10px 0 0}
.tb ul,.tb ol{margin:0;padding:0;list-style:none}.tb h4{font-size:12px;color:var(--tb-main);margin:24px 0 10px;letter-spacing:.04em}
.tb-triangle{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:16px 22px;padding:4px 0}.tb-triangle svg{position:absolute;inset:0;width:100%;height:100%}.tb-triangle path{fill:none;stroke:var(--tb-line);stroke-width:1.2;vector-effect:non-scaling-stroke;stroke-dasharray:5 5}
.tb-node{position:relative;background:#fff;border:1px solid var(--tb-line);border-radius:7px;padding:13px 15px}.tb-node b{display:block;font-size:12px;color:var(--tb-main);margin-bottom:6px}.tb-node li{padding-left:13px;position:relative}.tb-node li::before{content:"";position:absolute;left:0;top:.72em;width:5px;height:5px;border-radius:50%;background:var(--tb-gold)}
.tb-customer{grid-column:1/-1;justify-self:center;width:min(100%,360px)}.tb-center{grid-column:1/-1;justify-self:center;position:relative;width:min(100%,400px);background:var(--tb-main);color:#fff;border-radius:7px;padding:13px 17px;font-weight:700;font-size:14px;text-align:center}.tb-center span{display:block;font-size:10px;font-weight:600;opacity:.8;margin-bottom:3px}
.tb-quad{position:relative}.tb-axes{padding:26px 30px}.tb-cells{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tb-cell{position:relative;border:1px solid var(--tb-line);border-radius:7px;padding:13px 15px;min-height:104px;background:#fff}.tb-cell b{display:block;font-size:13px;margin-bottom:5px}.tb-cell li{color:var(--tb-muted);font-size:12px}.tb-hot{border:2px solid var(--tb-gold);background:#fbf6ec}.tb-hot i{position:absolute;top:-10px;right:12px;font-style:normal;font-size:10px;font-weight:700;background:var(--tb-gold);color:#fff;border-radius:10px;padding:1px 9px}
.tb-ax{position:absolute;font-size:10px;font-weight:700;color:var(--tb-main);white-space:nowrap}.tb-ax-top{top:4px;left:50%;transform:translateX(-50%)}.tb-ax-bottom{bottom:4px;left:50%;transform:translateX(-50%)}.tb-ax-left{left:13px;top:50%;transform:translate(-50%,-50%) rotate(-90deg)}.tb-ax-right{right:13px;top:50%;transform:translate(50%,-50%) rotate(90deg)}.tb-caution{font-size:10px;color:var(--tb-muted);margin:6px 0 0}
.tb-pairs-head,.tb-pair{display:grid;grid-template-columns:1fr 62px 1fr;gap:10px;align-items:center}.tb-pairs-head b{font-size:12px;color:var(--tb-main)}.tb-pair{margin-top:8px}.tb-pair p{margin:0;border:1px solid var(--tb-line);border-radius:7px;padding:10px 13px;background:#fff;align-self:stretch}.tb-pair span{font-size:10px;font-weight:700;text-align:center;border-radius:10px;padding:2px 0;background:var(--tb-main);color:#fff}.tb-fit-1 span{background:#fff;color:var(--tb-main);border:1px solid var(--tb-main)}.tb-fit-2 span{background:var(--tb-gold)}.tb-fit-2 p:last-child{border:2px dashed var(--tb-gold);color:var(--tb-muted);background:#fbf6ec}
.tb-flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px;counter-reset:tb}.tb-flow li{counter-increment:tb;position:relative;border:1px solid var(--tb-line);border-radius:7px;padding:13px 13px 13px;background:#fff}.tb-flow li::before{content:counter(tb);display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--tb-main);color:#fff;font-size:10px;font-weight:700;margin-bottom:6px}.tb-flow b{display:block;font-size:13px}.tb-flow p{margin:3px 0 0;font-size:12px;color:var(--tb-muted)}.tb-flow i{position:absolute;top:-10px;right:10px;font-style:normal;font-size:10px;font-weight:700;border-radius:10px;padding:1px 9px;background:var(--tb-gold);color:#fff}.tb-flow .tb-stuck{border:2px solid var(--tb-gold);background:#fbf6ec}.tb-flow .tb-unknown{border-style:dashed}.tb-flow .tb-unknown i{background:#fff;color:var(--tb-muted);border:1px solid var(--tb-line)}
.tb-findings li{display:grid;grid-template-columns:44px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid var(--tb-line)}.tb-basis{font-size:10px;font-weight:700;text-align:center;border-radius:3px;height:20px;line-height:20px;margin-top:1px}.tb-basis-ok{background:var(--tb-main);color:#fff}.tb-basis-guess{border:1px solid var(--tb-line);color:var(--tb-muted)}
.tb-next{counter-reset:tn}.tb-next li{counter-increment:tn;display:block;position:relative;background:var(--tb-tint);border-radius:7px;padding:11px 14px 11px 44px;margin-bottom:7px;font-weight:600}.tb-next li::before{content:counter(tn);position:absolute;left:13px;top:11px;width:21px;height:21px;border-radius:50%;background:var(--tb-gold);color:#fff;font-size:11px;display:grid;place-items:center}.tb-next span{display:inline-block;font-size:10px;color:var(--tb-main);border:1px solid var(--tb-main);border-radius:3px;padding:0 6px;margin-right:8px;font-weight:700}
.tb h4 small{font-weight:400;color:var(--tb-muted);letter-spacing:0}.tb-next label{display:block;cursor:pointer;font-weight:600}.tb-next input{position:absolute;right:14px;top:12px;width:19px;height:19px;accent-color:var(--tb-main)}.tb-next li:has(input){padding-right:46px}.tb-next .tb-done{opacity:.55;text-decoration:line-through}
.tb-sources li{font-size:11px;color:var(--tb-muted);padding:2px 0}.tb-sources a{color:var(--tb-main)}
@media(max-width:650px){.tb{padding:20px 16px}.tb-answer{font-size:17px}.tb-triangle{grid-template-columns:1fr}.tb-triangle svg{display:none}.tb-axes{padding:22px 0}.tb-ax-left,.tb-ax-right{display:none}.tb-cells{grid-template-columns:1fr}.tb-pairs-head,.tb-pair{grid-template-columns:1fr}.tb-pairs-head span{display:none}.tb-pair span{justify-self:start;padding:2px 12px}}
@media print{.tb{border:0;padding:0}}`;
  function page(b,meta={}){return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.title)} | 作戦ボード</title><style>body{margin:0;padding:28px 16px;background:#f3f6f6;font-family:"Yu Gothic UI","Yu Gothic","Hiragino Sans",Meiryo,sans-serif}main{max-width:820px;margin:auto}footer{font-size:10px;color:#5d6d70;text-align:center;margin-top:14px}${CSS}</style></head><body><main>${render(b,meta)}<footer>寺子屋AI 第4回 AIアシスタント設計ツールで作成</footer></main></body></html>`;}
  function validJob(j){return !!j&&ID.test(j.id)&&ID.test(j.assistantId)&&!!C.strategyFor(j.role)&&!!origin(j.targetSite)&&origin(j.targetSite)===j.targetSite&&Number.isFinite(j.createdAt);}
  function request(d,href){const targetSite=origin(href);if(!targetSite)throw Error('ツールのURLを確認してください。');if(!C.strategyFor(d.role))throw Error('この担当は作戦ボードを作りません。');return {id:C.uid(),assistantId:d.id,role:d.role,targetSite,createdAt:Date.now()};}
  function validate(raw,j){
    if(!validJob(j)||raw?.schemaVersion!==1||raw.requestId!==j.id||raw.assistantId!==j.assistantId||raw.targetSite!==j.targetSite)throw Error('別の依頼の結果です。取り込みません。');
    if(raw.status==='failed')throw Error(String(raw.message||'Work側で返送できませんでした。').slice(0,500));
    if(raw.status!=='complete')throw Error('返送結果が完了していません。');
    return normalize(raw.board,j.role);
  }
  async function read(j,fetcher=fetch){
    const response=await fetcher(`${j.targetSite}/returns/${j.id}/result.json?v=${Date.now()}`,{cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(15000)});
    if(response.status===404)return null;
    if(!response.ok)throw Error(`返送を確認できません（${response.status}）。`);
    const mime=response.headers.get('content-type')||'';if(/text\/html/i.test(mime))return null;if(!/application\/json/i.test(mime))throw Error('返送先がJSON形式ではありません。');
    const body=await response.text();if(body.length>60000)throw Error('返送結果が大きすぎます。');return validate(JSON.parse(body),j);
  }
  // 手動の貼り付け: 封筒ごとでも、boardだけでも受け取る。
  function paste(text,roleId){const raw=C.parseJSON(text);return normalize(raw?.board&&typeof raw.board==='object'?raw.board:raw,roleId);}
  function delivery(d,j){
    const s=C.strategyFor(d.role),envelope=`{"schemaVersion":1,"requestId":"${j.id}","assistantId":"${j.assistantId}","targetSite":"${j.targetSite}","status":"complete","board":{"title":"ボードの題","question":"今回の問い","answer":"結論の一文","diagram":${s.diagram.split('（')[0]},"findings":[{"text":"分かったこと","basis":"確認｜推測"}],"nextSteps":[{"text":"今週できる具体的な一手","when":"今日 など"}],"handoff":{"role":"次に頼むとよい担当のID","task":"その担当への依頼文"},"brief":{"business":"何を誰に提供しているか","customer":"お客さんと困りごと","strength":"選ばれる理由","competitors":"競合・代わりの手段","direction":"いまの作戦"},"sources":[{"title":"ページ名","url":"https://…","date":"参照日"}]}}`;
    const note=s.diagram.includes('（')?'\n図の決まり: '+s.diagram.slice(s.diagram.indexOf('（')+1).replace(/）$/,''):'';
    return `【作戦ボードを元のツールへ返す】\n成果は文章だけで終わらせず、下の形のJSONにまとめてください。図はツール側が描くので、画像やHTMLの図は作りません。\n${envelope}${note}\n書き方: 各項目は短い言葉（1項目60字まで）。answerは根拠の強さにそろえ、裏づけが「推測」だけなら「〜の可能性がある」のように仮説として書く。本人のメモにあるだけの情報は「確認」にしない。findingsは最大6、basisは裏づけを確認できたものだけ「確認」。nextStepsは最大3。handoff.roleは ${C.handoffRoles().map(r=>`${r.id}(${r.name})`).join(' / ')} から1つ。briefは今後ほかの担当も読む事業メモなので、前の事業メモの内容を残して更新する。sourcesは実際に開いたページだけ。\n\n返送はファイル操作だけで行います。対象Site ${j.targetSite} のsourceを取得し、静的配信フォルダの returns/${j.id}/result.json として新規保存して、同じSiteを更新・配信し、取得できることを確認してください。画面コードや他の returns フォルダは変更・削除しない。保存直前に最新sourceを取得し、分岐したら非破壊で統合する。force push・reset・別Siteの作成・共有範囲の変更は禁止。Computer Useやブラウザ操作で元ツールを操作しない。\n返送できないときは迂回せず、同じJSONをコードブロックで出し、「ツールの『結果が戻らないとき』に貼り付けてください」と案内してください。成功していない返送を成功と報告しないこと。\n完了後に戻るURL: ${j.targetSite}/#work`;
  }
  return {WINDOW_MS,CSS,normalize,render,page,briefText,validJob,request,validate,read,paste,delivery};
});
