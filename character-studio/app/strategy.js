// 「事業の作戦」6担当の、作戦ボードに関する設定。専門手順は role-catalog.json の公開スキル翻案(app/role-skills.js)を使う。
(function(root,data){if(typeof module==='object'&&module.exports)module.exports=data;root.AssistantStrategy=data;})(typeof globalThis!=='undefined'?globalThis:this,(function(){
  'use strict';
  const HANDOFF=['sns','announcement','product','calendar','repurpose','proposal','service','ideas','competitor','faq'];
  const rows=[
    {id:'position',name:'選ばれる理由担当',detail:'「自分は何で選ばれそう？」を3つの視点で探す',output:'三角図と「誰に何で選ばれるか」の一文',kind:'triangle',
      example:'私のサービスが、他ではなく私から選ばれる理由を探してください。',
      diagram:'{"nodes":{"customer":{"points":["顧客が求めること ×3"]},"competitor":{"points":["競合・代わりの手段が与えていること ×3"]},"company":{"points":["自社だけが出せること ×3"]}},"center":"誰に何で選ばれるかの一文"}'},
    {id:'gap',name:'競合の空白担当',detail:'競合がまだ拾えていない需要を探す',output:'競合マップと、空白の仮説・確かめ方',kind:'quad',
      example:'同じようなサービスを調べて、まだ誰も応えていないお客さんの望みを探してください。',
      diagram:'{"axisX":{"low":"横軸の左","high":"横軸の右"},"axisY":{"low":"縦軸の下","high":"縦軸の上"},"cells":[{"title":"左上の領域","points":["ここにいる競合や特徴"],"highlight":false},{"title":"右上"},{"title":"左下"},{"title":"右下"}]}（cellsは左上・右上・左下・右下の順に4つ。狙う空白の領域だけ highlight を true）'},
    {id:'idea',name:'アイデア強化担当',detail:'今のアイデアを、お客さんの望みと照らして強くする',output:'お客さんの望みと提供内容の対応図・改善案',kind:'pairs',
      example:'今考えているサービスを、お客さんの望みと照らして、もっと強くしてください。',
      diagram:'{"leftTitle":"お客さんの望み","rightTitle":"今の提供内容","rows":[{"left":"用事・困りごと・ほしい結果","right":"それに応えている内容（なければ空）","fit":"強い｜弱い｜空白"}]}（rowsは3〜6行）'},
    {id:'sell',name:'売り方設計担当',detail:'商品はある。いくらで、どう売るかを決める',output:'売り方の設計図と、変えるべき一箇所',kind:'quad',
      example:'今の商品の価格と売り方を見直して、まず変えるべき一箇所を教えてください。',
      diagram:'{"cells":[{"title":"何を売るか","points":["今の状態と気づき"],"highlight":false},{"title":"いくらか"},{"title":"何に払ってもらうか"},{"title":"どう見せるか"}]}（cellsはこの順に4つ。変えるべき一箇所だけ highlight を true。axisX・axisYは入れない）'},
    {id:'funnel',name:'集客導線担当',detail:'申し込むまで、どこで止まるかを見つける',output:'集客導線図と、足りない情報',kind:'flow',
      example:'お客さんが私を知ってから申し込むまでの流れを見て、どこで止まりそうか教えてください。',
      diagram:'{"steps":[{"title":"段階の名前","detail":"お客さんが見るもの・迷うこと","status":"ok｜stuck｜unknown"}]}（stepsは3〜7個。止まりそうな段階は stuck、確かめられない段階は unknown）'},
    {id:'test',name:'小さく試す担当',detail:'作り込む前に、何を試すかを決める',output:'7日間の検証案と、見直しの条件',kind:'flow',
      example:'このアイデアを作り込む前に、1週間で確かめられることを決めてください。',
      diagram:'{"steps":[{"title":"1日目 など","detail":"その日にやること","status":"ok"}]}（stepsは3〜7個。最後のstepは「続ける・見直す・やめる」の目安。statusはすべて ok）'}
  ];
  const roles={};for(const r of rows){
    const end=r.diagram.lastIndexOf('}');
    r.diagramExample=JSON.parse(r.diagram.slice(0,end+1));
    r.diagramRules=r.diagram.slice(end+1).replace(/^（|）$/g,'');
    if(r.id==='idea')r.diagramExample.rows=[{left:'お客さんの望み',right:'応える提供内容（なければ空）',fit:'弱い'},{left:'別の望み',right:'',fit:'空白'},{left:'もう一つの望み',right:'提供内容',fit:'強い'}];
    if(r.kind==='flow')r.diagramExample.steps=[{title:'知る',detail:'最初の接点',status:'unknown'},{title:'比べる',detail:'判断材料',status:'unknown'},{title:'申し込む',detail:'申込先',status:'unknown'}].map(x=>r.id==='test'?{...x,status:'ok'}:x);
    roles[r.id]=r;
  }
  return {category:'strategy',order:rows.map(r=>r.id),handoff:HANDOFF,roles};
})());
