// 作戦ボードの見本。架空の「自宅パン教室」の例で、実在の調査結果ではない。
(function(root,data){if(typeof module==='object'&&module.exports)module.exports=data;root.AssistantBoardSamples=data;})(typeof globalThis!=='undefined'?globalThis:this,(function(){
  const brief={business:'自宅で開く少人数のパン教室。月4回、1回3名まで',customer:'小さな子どもがいて、平日の午前しか動けない人',strength:'子連れOKで、家のオーブンで再現できる配合を教える',competitors:'駅前の大手教室、動画レッスン、レシピ本',direction:'「子連れで通える」を前面に出し、体験会で確かめる'};
  const base=(o)=>({findings:[],nextSteps:[],sources:[],brief,...o});
  return {
    position:base({title:'パン教室が選ばれる理由',question:'自分は何で選ばれそう？',answer:'平日午前しか動けない子育て中の人に、「子連れで通えて家で再現できる」ことで選ばれる可能性が高い。',
      diagram:{nodes:{customer:{points:['子どもを預けずに習いたい','家のオーブンでも同じように焼きたい','午前中に終わってほしい']},competitor:{points:['大手教室: 設備と種類は豊富。子連れ不可が多い','動画レッスン: 安いが質問できない','レシピ本: 手軽だが失敗の原因が分からない']},company:{points:['子連れOK・3名までの少人数','家庭用オーブン前提の配合','その場で失敗の原因を一緒に見る']}},center:'子連れで通えて、家で再現できるパン教室'},
      findings:[{text:'体験した人の感想に「子どもと一緒に行けた」が繰り返し出てくる',basis:'確認'},{text:'近隣の大手教室は未就学児の同伴を受け付けていない所が多そう',basis:'推測'},{text:'「家で再現できる」は、動画やレシピ本との違いとして伝わりやすい',basis:'推測'}],
      nextSteps:[{text:'LPの一番上の見出しを「子連れで通える」に変える',when:'今日'},{text:'過去の参加者3人に、申し込みの決め手を聞く',when:'今週'},{text:'平日午前の体験会を1回だけ告知して反応を見る',when:'今週'}],
      handoff:{role:'sns',task:'「子連れで通えて、家で再現できるパン教室」という切り口で、Instagram向けの投稿案を3つ作ってください。'}}),
    gap:base({title:'パン教室の競合マップ',question:'競合が拾えていない需要は？',answer:'「子連れで、少人数で習える」領域は近くに選択肢が少なく、狙う価値がありそう。',
      diagram:{axisX:{low:'大人数',high:'少人数'},axisY:{low:'大人だけ',high:'子連れOK'},cells:[{title:'子連れOK × 大人数',points:['親子イベント型の単発講座']},{title:'子連れOK × 少人数',points:['近隣に常設の教室は見当たらない'],highlight:true},{title:'大人だけ × 大人数',points:['駅前の大手教室','カルチャーセンター']},{title:'大人だけ × 少人数',points:['個人の自宅教室が複数']}]},
      findings:[{text:'個人の自宅教室は多いが、子連れ可と明記している所は少ない',basis:'推測'},{text:'空いているのは需要がないからかもしれない。体験会で確かめる',basis:'推測'}],
      nextSteps:[{text:'「子連れOK」を明記した体験会を1回だけ募集する',when:'今週'}],handoff:{role:'announcement',task:'子連れOKの体験会の告知文を作ってください。'}}),
    idea:base({title:'パン教室のアイデア強化',question:'今のアイデアを強くしたい',answer:'「家で一人で焼けるか不安」に応えていない。レッスン後のフォローを足すと強くなる。',
      diagram:{leftTitle:'お客さんの望み',rightTitle:'今の提供内容',rows:[{left:'子どもを預けずに習いたい',right:'子連れOK・少人数',fit:'強い'},{left:'家のオーブンで再現したい',right:'家庭用オーブン前提の配合',fit:'強い'},{left:'一人で焼いて失敗したとき聞きたい',right:'',fit:'空白'},{left:'続けて通う理由がほしい',right:'月替わりのメニュー',fit:'弱い'}]},
      nextSteps:[{text:'レッスン後1週間、写真で質問できる特典を試しに付ける',when:'次回'}],handoff:{role:'service',task:'レッスン後のフォロー特典を入れた新しい提供内容を整理してください。'}}),
    sell:base({title:'パン教室の売り方',question:'商品はある。どう売る？',answer:'変えるのは「知らせ方」。良さが、子育て中の人が見る場所に届いていないと見立てる。',
      diagram:{cells:[{title:'商品',points:['少人数・子連れOK','内容は今のままで十分']},{title:'価格',points:['近隣の個人教室と同じくらい','無理に下げない']},{title:'売る場所',points:['自分のLPとLINE','申し込みまでの流れは短い']},{title:'知らせ方',points:['Instagramは作品写真ばかり','「子連れOK」が伝わっていない'],highlight:true}]},
      nextSteps:[{text:'プロフィール文と固定投稿に「子連れOK」を入れる',when:'今日'}],handoff:{role:'calendar',task:'「子連れで通える」が伝わる1か月の発信テーマを組んでください。'}}),
    funnel:base({title:'申し込みまでの道筋',question:'申し込むまで、どこで止まる？',answer:'LPで止まりそう。子連れで行って大丈夫かが、申し込み前に分からない。',
      diagram:{steps:[{title:'知る',detail:'Instagramの作品写真で見かける',status:'ok'},{title:'気になる',detail:'プロフィールからLPへ進む',status:'unknown'},{title:'比べる',detail:'LPに子連れの様子・持ち物・時間が書かれていない',status:'stuck'},{title:'申し込む',detail:'LINEで日程を選ぶ',status:'ok'},{title:'また来る',detail:'次回の案内は口頭だけ',status:'unknown'}]},
      findings:[{text:'LPに子連れ参加の写真や説明がない',basis:'確認'},{text:'数字がないので、止まっている場所は見立て',basis:'推測'}],
      nextSteps:[{text:'LPに「子連れ参加のよくある質問」を3つ足す',when:'今週'}],handoff:{role:'faq',task:'子連れで参加する人が申し込み前に気になる質問と回答を作ってください。'}}),
    test:base({title:'7日間で確かめること',question:'作り込む前に、何を試す？',answer:'平日午前の子連れ体験会に、申し込みたい人がいるかを先に確かめる。',
      diagram:{steps:[{title:'1日目',detail:'体験会の告知文と申込フォームを用意する',status:'ok'},{title:'2〜3日目',detail:'InstagramとLINEで告知する',status:'ok'},{title:'4〜5日目',detail:'反応した人に、決め手と不安を聞く',status:'ok'},{title:'6日目',detail:'申込数と聞いた声をまとめる',status:'ok'},{title:'7日目',detail:'3名集まれば続ける。1名以下なら切り口を見直す',status:'ok'}]},
      nextSteps:[{text:'告知文を作り、今週中に1回だけ出す',when:'今日'}],handoff:{role:'announcement',task:'平日午前の子連れ体験会の告知文を作ってください。'}})
  };
})());
