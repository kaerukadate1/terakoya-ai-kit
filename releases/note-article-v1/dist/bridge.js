(function (root, factory) {
  const api = factory(root.NoteCore || (typeof require === 'function' ? require('./core.js') : null), root.NoteKit || (typeof require === 'function' ? require('./kit.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NoteBridge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, K) {
  'use strict';
  const TYPES = ['topics', 'lp-outline', 'article', 'image'];
  const ID = /^[a-zA-Z0-9-]{10,100}$/;
  const WINDOW_MS = 15 * 60 * 1000;
  function site(value) { try { const u = new URL(value); return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.origin : ''; } catch { return ''; } }
  function request(type, draftId, slotId, href, baseline) {
    if (!TYPES.includes(type) || !ID.test(draftId) || (type === 'image' && !/^(cover|s[1-8])$/.test(slotId))) throw Error('依頼情報が不正です。');
    return { id: C.uid(), type, draftId, slotId: type === 'image' ? slotId : '', targetSite: site(href), baseline, createdAt: Date.now(), status: 'waiting', message: '' };
  }
  function resultPath(job) { if (!ID.test(job.id)) throw Error('依頼IDが不正です。'); return `/returns/${job.id}/result.json`; }
  function sameImage(value, job) {
    try { const u = new URL(value, job.targetSite), prefix = `/returns/${job.id}/`; return u.origin === job.targetSite && !u.username && !u.password && !u.search && !u.hash && u.pathname.startsWith(prefix) && /^image\.(png|jpe?g|webp)$/i.test(u.pathname.slice(prefix.length)) ? u.href : ''; } catch { return ''; }
  }
  function validate(raw, job) {
    if (!raw || raw.schemaVersion !== 1 || raw.requestId !== job.id || raw.type !== job.type || raw.draftId !== job.draftId || raw.slotId !== job.slotId || raw.targetSite !== job.targetSite) throw Error('依頼と返送結果が一致しません。反映せず保留しました。');
    if (raw.status === 'failed') return { ...raw, message: String(raw.message || 'Work側で返送できませんでした。').slice(0, 1500) };
    if (raw.status !== 'complete') throw Error('結果が完了状態ではありません。');
    if (job.type === 'image') { const imageUrl = sameImage(raw.imageUrl, job); if (!imageUrl) throw Error('画像の戻り先が不正です。同じ依頼フォルダ内の画像だけを受け取れます。'); return { ...raw, imageUrl }; }
    if (!raw.data || typeof raw.data !== 'object' || Array.isArray(raw.data)) throw Error('返送データがありません。');
    return raw;
  }
  async function read(job, fetcher = fetch) {
    if (!job.targetSite) return null;
    const response = await fetcher(job.targetSite + resultPath(job) + `?v=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (response.status === 404) return null;
    if (response.status === 401 || response.status === 403) throw Error('結果を取得する権限がありません。アクセス設定は変更せず、Workの保存結果を確認してください。');
    if (!response.ok) throw Error(`結果を取得できませんでした（${response.status}）。`);
    const mime = response.headers.get('content-type') || '';
    if (/text\/html/i.test(mime)) return null;
    if (!/application\/json/i.test(mime)) throw Error('返送先がJSONではありません。保存先を確認してください。');
    const body = await response.text(); if (body.length > 200000) throw Error('返送JSONが大きすぎます。');
    return validate(JSON.parse(body), job);
  }
  function wrap(prompt, job) {
    const skills = job.type === 'image' ? [K.skills.images, K.skills.returns] : [K.skills.writing, K.skills.returns];
    const envelope = { schemaVersion: 1, requestId: job.id, type: job.type, draftId: job.draftId, slotId: job.slotId, targetSite: job.targetSite, status: 'complete', ...(job.type === 'image' ? { imageUrl: `/returns/${job.id}/image.png` } : { data: 'ここに制作したJSONオブジェクトを入れる。文字列にはしない。' }) };
    return `ChatGPT Workで実行してください。最初に次の固定版スキルを取得・読了し、適用してください。取得できないファイルがあれば、そのURLを報告して止めてください。\n${skills.join('\n')}\n\n${prompt}\n\n【同じツールへ自動で返す】\n対象Site: ${job.targetSite || 'ローカル表示のため返送先なし。下記の自動保存は行わず、成果物を返してください。'}\n依頼ID: ${job.id}\nこの依頼のために同じSiteのsourceを取得し、静的配信フォルダ内の returns/${job.id}/ に新規保存してください。別Siteの新規作成、共有範囲変更、既存入力・記事・画像・他依頼の結果の削除や上書きは禁止です。画像依頼では生成したPNGを先にimage.pngへ保存し、最後にresult.jsonを保存してください。本文・構成・ネタ案では制作JSONをdataオブジェクトに入れてresult.jsonを保存します。\nresult.jsonの形式:\n${JSON.stringify(envelope, null, 2)}\n\n保存だけで終わらず、この依頼フォルダを含む同じSiteを更新して配信状態を確認してください。ユーザーはツールを開いていれば15秒ごとの結果確認、またはツールに戻った時の確認で受け取れます。自動返送した場合は、このJSONの手動貼付けや画像の手動ダウンロードを通常手順にしないでください。\nSiteを編集・配信できない、画像生成できない、権限が足りない場合は迂回・公開・認証変更せず「自動返送できなかった」と明示し、制作JSON/画像と理由を返してください。返送・自動挿入の成功を装わないでください。noteへの投稿はしません。\n完了後の戻り先: ${job.targetSite || '元のツール'}\n`;
  }
  return { request, resultPath, sameImage, validate, read, wrap, WINDOW_MS };
});
