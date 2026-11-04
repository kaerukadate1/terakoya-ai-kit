(function(root,factory){const api=factory(root.CharacterCore||(typeof require==='function'?require('./core.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;root.AssistantBridge=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const WINDOW_MS=60*60*1000,ID=/^[a-zA-Z0-9-]{8,100}$/;
  function origin(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.origin:'';}catch{return '';}}
  function validJob(j){return !!j&&ID.test(j.id)&&ID.test(j.assistantId)&&!!origin(j.targetSite)&&origin(j.targetSite)===j.targetSite&&typeof j.visualKey==='string'&&j.visualKey.length<1000&&Number.isFinite(j.createdAt);}
  function request(d,href){const targetSite=origin(href);if(!targetSite)throw Error('ツールのURLを確認してください。');return {id:C.uid(),assistantId:d.id,visualKey:C.visualKey(d),targetSite,createdAt:Date.now()};}
  function matches(j,d){return validJob(j)&&j.assistantId===d.id&&j.visualKey===C.visualKey(d);}
  function resultPath(j){if(!validJob(j))throw Error('依頼情報が不正です。');return `/returns/${j.id}/result.json`;}
  function validate(raw,j){
    if(!validJob(j)||raw?.schemaVersion!==1||raw.requestId!==j.id||raw.assistantId!==j.assistantId||raw.visualKey!==j.visualKey||raw.targetSite!==j.targetSite)throw Error('別の依頼の結果です。画像は変更しません。');
    if(raw.status==='failed')throw Error(String(raw.message||'Work側で自動返送できませんでした。').slice(0,500));
    if(raw.status!=='complete')throw Error('返送結果が完了していません。');
    const path=`/returns/${j.id}/image.png`,url=new URL(raw.imageUrl,j.targetSite);
    if(url.origin!==j.targetSite||url.pathname!==path||url.search||url.hash||url.username||url.password)throw Error('画像の返送先が一致しません。');
    return {...raw,imageUrl:url.href};
  }
  async function read(j,fetcher=fetch){
    const response=await fetcher(j.targetSite+resultPath(j)+`?v=${Date.now()}`,{cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(15000)});
    if(response.status===404)return null;
    if(!response.ok)throw Error(`返送を確認できません（${response.status}）。アクセス設定は変更せず、Workの結果を確認してください。`);
    const mime=response.headers.get('content-type')||'';if(/text\/html/i.test(mime))return null;if(!/application\/json/i.test(mime))throw Error('返送先がJSON形式ではありません。');
    const body=await response.text();if(body.length>20000)throw Error('返送結果が大きすぎます。');return validate(JSON.parse(body),j);
  }
  function wrap(d,j){
    const envelope={schemaVersion:1,requestId:j.id,assistantId:j.assistantId,visualKey:j.visualKey,targetSite:j.targetSite,status:'complete',imageUrl:`/returns/${j.id}/image.png`};
    return `ChatGPT Workで、次の設定のアシスタントパッケージ用画像を制作してください。\n\n${C.imagePrompt(d)}\n\n【元のツールへ画像を返す】\n対象Site: ${j.targetSite}\n依頼ID: ${j.id}\n同じSiteのsourceを取得し、静的配信フォルダの returns/${j.id}/ に新規保存してください。画像生成したPNGを先にimage.pngとして保存し、その後result.jsonを下記の内容で保存します。\n${JSON.stringify(envelope,null,2)}\n\nこの新規依頼フォルダを含む同じSiteを更新・配信し、画像とJSONを取得できることを確認してください。別Siteの作成・共有範囲や認証の変更・既存の画像や設定や他依頼フォルダの上書きや削除は禁止。元のツールは15秒ごと、および戻った時に結果を確認します。ツールを開いたまま実行してください。\nSiteの特定や編集・配信、画像生成ができない場合は迂回せず、自動返送できなかった理由と画像ファイルを返してください。成功していない返送・挿入を成功と報告しないでください。設定ファイルは元のツールが同じ選択内容から生成するため、別仕様へ書き換えないでください。\n完了後に戻るURL: ${j.targetSite}/#package`;
  }
  return {WINDOW_MS,validJob,request,matches,resultPath,validate,read,wrap};
});
