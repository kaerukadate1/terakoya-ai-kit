(function(root,factory){const api=factory(root.CharacterCore||(typeof require==='function'?require('./core.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;root.AssistantBridge=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const WINDOW_MS=60*60*1000,MAX_IMAGE_BYTES=20*1024*1024,ID=/^[a-zA-Z0-9-]{8,100}$/;
  function origin(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.origin:'';}catch{return '';}}
  function validJob(j){return !!j&&ID.test(j.id)&&ID.test(j.assistantId)&&!!origin(j.targetSite)&&origin(j.targetSite)===j.targetSite&&typeof j.visualKey==='string'&&j.visualKey.length<1000&&Number.isFinite(j.createdAt);}
  function request(d,href){const targetSite=origin(href);if(!targetSite)throw Error('ツールのURLを確認してください。');return {id:C.uid(),assistantId:d.id,visualKey:C.visualKey(d),targetSite,createdAt:Date.now(),snapshot:{...C.normalize(d),avatar:'',avatarSpec:'',legacy:null}};}
  function matches(j,d){return validJob(j)&&j.assistantId===d.id&&j.visualKey===C.visualKey(d);}
  function resultPath(j){if(!validJob(j))throw Error('依頼情報が不正です。');return `/returns/${j.id}/result.json`;}
  function validate(raw,j){
    if(!validJob(j)||raw?.schemaVersion!==1||raw.requestId!==j.id||raw.assistantId!==j.assistantId||raw.visualKey!==j.visualKey||raw.targetSite!==j.targetSite)throw Error('別の依頼の結果です。画像は変更しません。');
    if(raw.status==='failed')throw Error(String(raw.message||'Work側で自動返送できませんでした。').slice(0,500));
    if(raw.status!=='complete')throw Error('返送結果が完了していません。');
    const prefix=`/returns/${j.id}/`,url=new URL(raw.imageUrl,j.targetSite);
    if(url.origin!==j.targetSite||!url.pathname.startsWith(prefix)||!/^image\.(png|jpe?g|webp)$/.test(url.pathname.slice(prefix.length))||url.search||url.hash||url.username||url.password)throw Error('画像の返送先が一致しません。');
    return {...raw,imageUrl:url.href};
  }
  async function read(j,fetcher=fetch){
    const response=await fetcher(j.targetSite+resultPath(j)+`?v=${Date.now()}`,{cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(15000)});
    if(response.status===404)return null;
    if(!response.ok)throw Error(`返送を確認できません（${response.status}）。アクセス設定は変更せず、Workの結果を確認してください。`);
    const mime=response.headers.get('content-type')||'';if(/text\/html/i.test(mime))return null;if(!/application\/json/i.test(mime))throw Error('返送先がJSON形式ではありません。');
    const body=await response.text();if(body.length>20000)throw Error('返送結果が大きすぎます。');return validate(JSON.parse(body),j);
  }
  function imageMime(bytes){
    const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    if([137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))return 'image/png';
    if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
    if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')return 'image/webp';
    return '';
  }
  async function checkedImage(blob){
    if(blob.size>MAX_IMAGE_BYTES)throw Error('画像は20MB以下にしてください。');
    const mime=imageMime(new Uint8Array(await blob.slice(0,12).arrayBuffer()));
    if(!mime)throw Error('PNG・JPEG・WebPの画像ファイルを選んでください。');
    return blob.type===mime?blob:new Blob([blob],{type:mime});
  }
  async function fetchImage(url,fetcher,optional){
    const response=await fetcher(url+'?v='+Date.now(),{cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(15000)});
    if(response.status===404&&optional)return null;
    if(!response.ok)throw Error(`返送画像を取得できません（${response.status}）。「画像を手動でアップロード」も利用できます。`);
    if(/text\/html/i.test(response.headers.get('content-type')||'')&&optional)return null;
    if(Number(response.headers.get('content-length'))>MAX_IMAGE_BYTES)throw Error('返送画像が20MBを超えています。');
    // Bound downloads even when the server omits Content-Length.
    const reader=response.body?.getReader();if(!reader)return checkedImage(await response.blob());
    let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_IMAGE_BYTES)throw Error('返送画像が20MBを超えています。');chunks.push(value);}}catch(err){await reader.cancel().catch(()=>{});throw err;}finally{reader.releaseLock();}
    return checkedImage(new Blob(chunks,{type:response.headers.get('content-type')||''}));
  }
  async function receive(j,fetcher=fetch){
    const receipt=await read(j,fetcher);
    // A PNG saved to this unique request path can recover a missing receipt.
    const imageUrl=receipt?.imageUrl||j.targetSite+`/returns/${j.id}/image.png`;
    const blob=await fetchImage(imageUrl,fetcher,!receipt);return blob?{blob,mode:receipt?'receipt':'direct-image'}:null;
  }
  function wrap(d,j){
    const envelope={schemaVersion:1,requestId:j.id,assistantId:j.assistantId,visualKey:j.visualKey,targetSite:j.targetSite,status:'complete',imageUrl:`/returns/${j.id}/image.png`};
    return `ChatGPT Workで、次の設定のアシスタントパッケージ用画像を制作してください。\n\n${C.imagePrompt(d)}\n\n【元のツールへ画像を返す】\n対象Site: ${j.targetSite}\n依頼ID: ${j.id}\n同じSiteのsourceを取得し、静的配信フォルダの returns/${j.id}/ に新規保存してください。画像生成したPNGを先にimage.pngとして保存し、その後result.jsonを下記の内容で保存します。\n${JSON.stringify(envelope,null,2)}\n\nこの新規依頼フォルダを含む同じSiteを更新・配信し、画像とJSONを取得できることを確認してください。別Siteの作成・共有範囲や認証の変更・既存の画像や設定や他依頼フォルダの上書きや削除は禁止。元のツールは15秒ごと、および戻った時に結果を確認します。ツールを開いたまま実行してください。\n\n【並行更新を保護する】\n画像制作後、保存直前に同じSiteの最新sourceを取得してください。この依頼の新規フォルダだけを追加し、画面コードは変更しません。push拒否や履歴の分岐が起きたら、最新履歴を取得し、他の返送フォルダ・新しい画面コードを保持して非破壊で統合してから再試行します。force push・reset・既存ファイルの巻き戻しは禁止。安全に統合できなければ止め、完成画像をダウンロードできるファイルとして返し、ツールの「画像を手動でアップロード」を案内してください。別Siteの作成で代替しません。\n\nSiteの特定や編集・配信、画像生成ができない場合は迂回せず、自動返送できなかった理由と画像ファイルを返してください。成功していない返送・挿入を成功と報告しないでください。設定ファイルは元のツールが同じ選択内容から生成するため、別仕様へ書き換えないでください。\n完了後に戻るURL: ${j.targetSite}/#package`;
  }
  return {WINDOW_MS,MAX_IMAGE_BYTES,validJob,request,matches,resultPath,validate,read,receive,checkedImage,imageMime,wrap};
});
