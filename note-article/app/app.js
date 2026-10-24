(function () {
  'use strict';
  const C = NoteCore, A = NoteAssets, B = NoteBridge, $ = selector => document.querySelector(selector);
  const KEY = 'terakoya-note-workshop3-v1', LIB = `${KEY}:library`, THEME = `${KEY}:theme`;
  let state = C.fresh(), draftId = C.uid(), library = [], stage = 'brief', aiMode = '', pending = null, signature = '', imageSlot = '', editMode = false, renderId = 0;
  let jobs = [], assetVersions = {}, activeJobId = '', checkingReturns = false;
  const JOBS = `${KEY}:returns`;
  const imageUrls = new Map();
  const form = $('#brief-form'), settingsForm = $('#settings-form');
  const el = (tag, value, className) => { const node = document.createElement(tag); if (value !== undefined) node.textContent = value; if (className) node.className = className; return node; };
  function button(label, handler, className = 'quiet') { const n = el('button', label, className); n.type = 'button'; n.addEventListener('click', handler); return n; }
  function notice(message, error = false) { const n = $('#notice'); n.hidden = !message; n.textContent = message; n.classList.toggle('error', error); }
  const attempt = fn => async event => { try { await fn(event); } catch (e) { if ($('#ai-dialog').open) $('#ai-status').textContent = e.message; else notice(e.message, true); } };
  function store() {
    try { localStorage.setItem(KEY, JSON.stringify({ state, draftId, assetVersions })); $('#save-status').textContent = 'この端末に保存済み'; return true; }
    catch { $('#save-status').textContent = '未保存'; notice('保存できませんでした。ブラウザの空き容量・設定を確認し、記事をバックアップしてください。', true); return false; }
  }
  function saveLibrary() { localStorage.setItem(LIB, JSON.stringify(library)); }
  function syncForm() { for (const [key, value] of Object.entries(state.brief)) { const control = form.elements.namedItem(key); if (control) control.value = value; } for (const [key, value] of Object.entries(state.settings)) { const c = settingsForm.elements.namedItem(key); if (c) c.value = value; } modeUI(); }
  function modeUI() {
    const lp = form.elements.mode.value === 'lp';
    $('#lp-fields').hidden = !lp; $('#idea-fields').hidden = lp;
    $('#to-topics').textContent = lp ? 'おすすめ構成へ進む →' : '記事のネタを考える →';
    const routes = lp ? ['brief', 'outline', 'write', 'library'] : ['brief', 'topics', 'outline', 'write', 'library'];
    for (const b of document.querySelectorAll('[data-step]')) { b.hidden = lp && b.dataset.step === 'topics'; const i = routes.indexOf(b.dataset.step); if (i >= 0) b.querySelector('span').textContent = `0${i + 1}`; }
    $('#outline-eyebrow').textContent = `${lp ? '02' : '03'} / OUTLINE`;
    $('#write-eyebrow').textContent = `${lp ? '03' : '04'} / EDITOR`;
    $('#library-eyebrow').textContent = `${lp ? '04' : '05'} / LIBRARY`;
    $('#outline-back').textContent = lp ? '内容に戻る' : 'ネタに戻る'; $('#outline-back').dataset.go = lp ? 'brief' : 'topics';
  }
  function selected() { return state.topics.find(t => t.id === state.selectedTopicId); }
  function navigate(next) {
    const lp = state.brief.mode === 'lp';
    if (lp && next === 'topics') next = 'outline';
    if (lp && next === 'outline') { try { C.ready(state.brief); } catch (e) { notice(e.message, true); next = 'brief'; } }
    if (next === 'write' && !selected()) { notice(lp ? '先にLPからおすすめ構成を取り込んでください。' : '先に記事テーマを1つ選んでください。', true); next = lp ? 'outline' : 'topics'; }
    if (next === 'outline' && !selected() && !lp) { notice('先に記事テーマを1つ選んでください。', true); next = 'topics'; }
    stage = next;
    for (const panel of document.querySelectorAll('.panel')) { panel.hidden = panel.id !== next; panel.classList.toggle('active', panel.id === next); }
    for (const b of document.querySelectorAll('[data-step]')) { const active = b.dataset.step === next; b.classList.toggle('active', active); if (active) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }
    if (next === 'topics') renderTopics(); if (next === 'outline') renderOutline(); if (next === 'write') renderArticle().catch(e => notice(e.message, true)); if (next === 'library') renderLibrary().catch(e => notice(e.message, true));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function sourceText(source) {
    if (!source) return '';
    const label = { read: 'LP取得済み', unreadable: 'LP取得不可 / 本文・手入力の確認が必要', not_provided: 'LP参照なし', unknown: '取得状況は未確認' }[source.status];
    return `${label}${source.url ? '\n参照: ' + source.url : ''}\n確認済み事実: ${source.facts.join(' / ') || 'なし'}\n未確認: ${source.unknowns.join(' / ') || 'なし'}`;
  }
  function renderTopics() {
    const wrap = $('#topic-list'); wrap.replaceChildren();
    $('#source-summary').textContent = sourceText(state.source); $('#source-summary').hidden = !state.source;
    if (!state.topics.length) {
      const empty = el('div', undefined, 'empty'); empty.append(el('span', '03', 'empty-number'), el('h2', '読者の悩みから、記事の切り口を。'), button('ChatGPTに3案を相談', () => openAI('topics'), 'primary')); wrap.append(empty); return;
    }
    for (const [i, topic] of state.topics.entries()) {
      const card = el('section', undefined, `topic-card${topic.id === state.selectedTopicId ? ' selected' : ''}`); card.append(el('span', `IDEA 0${i + 1}`), el('h2', topic.title));
      const dl = el('dl'); for (const [label, value] of [['読者の悩み', topic.readerProblem], ['この記事で得られること', topic.promise], ['LPへのつながり', topic.lpBridge]]) dl.append(el('dt', label), el('dd', value));
      const choose = button(topic.id === state.selectedTopicId ? '選択中' : 'このネタを選ぶ', () => {
        if (state.article && topic.id !== state.selectedTopicId && !confirm('テーマを変えると作業中の記事はリセットされます。保存済みの記事は残ります。変更しますか？')) return;
        if (topic.id !== state.selectedTopicId) { state.article = null; draftId = C.uid(); }
        state.selectedTopicId = topic.id; store(); renderTopics();
      }, topic.id === state.selectedTopicId ? 'primary' : 'quiet'); choose.setAttribute('aria-pressed', String(topic.id === state.selectedTopicId)); card.append(dl, choose); wrap.append(card);
    }
  }
  function invalidateArticle() { if (state.article) { state.article = null; draftId = C.uid(); notice('構成を変更しました。記事制作をやり直してください。保存済みの記事は残っています。'); } }
  function reindex() { selected().outline.forEach((s, i) => { s.id = `s${i + 1}`; }); }
  function renderOutline() {
    const topic = selected(), lp = state.brief.mode === 'lp';
    $('#lp-outline-empty').hidden = !lp || !!topic; $('#outline-content').hidden = !topic;
    $('#lp-alternative').hidden = !lp || !topic; $('#to-write').disabled = !topic;
    $('#outline-source').textContent = sourceText(state.source); $('#outline-source').hidden = !lp || !state.source;
    if (!topic) return;
    $('#outline-title').value = topic.title; $('#bridge').textContent = `LPへのつながり: ${topic.lpBridge}`;
    const wrap = $('#outline-list'); wrap.replaceChildren();
    topic.outline.forEach((section, i) => {
      const row = el('div', undefined, 'outline-row'), fields = el('div'), controls = el('div', undefined, 'outline-tools'); row.append(el('span', `0${i + 1}`, 'outline-number'));
      for (const [key, name] of [['heading', '見出し'], ['purpose', 'ここで伝えること']]) { const label = el('label', name), input = document.createElement(key === 'heading' ? 'input' : 'textarea'); input.value = section[key]; input.maxLength = key === 'heading' ? 200 : 1500; if (key === 'purpose') input.rows = 2; input.addEventListener('input', () => { invalidateArticle(); section[key] = input.value; store(); }); label.append(input); fields.append(label); }
      for (const [label, delta, title] of [['↑', -1, '章を上へ移動'], ['↓', 1, '章を下へ移動'], ['×', 0, '章を外す']]) {
        const b = button(label, () => { invalidateArticle(); if (!delta) topic.outline.splice(i, 1); else { const j = i + delta; [topic.outline[i], topic.outline[j]] = [topic.outline[j], topic.outline[i]]; } reindex(); store(); renderOutline(); }, 'icon'); b.title = title; b.setAttribute('aria-label', title); b.disabled = delta === -1 ? i === 0 : delta === 1 ? i === topic.outline.length - 1 : topic.outline.length <= 2; controls.append(b);
      }
      row.append(fields, controls); wrap.append(row);
    });
    $('#add-section').disabled = topic.outline.length >= 8;
  }
  function currentSignature() { return JSON.stringify({ brief: state.brief, settings: state.settings, topic: selected() }); }
  function returnBaseline(slotId = '') { return JSON.stringify({ context: currentSignature(), draftId, article: state.article, asset: slotId ? assetVersions[slotId] || '' : '' }); }
  function saveJobs() { localStorage.setItem(JOBS, JSON.stringify(jobs.slice(-20))); }
  function finishJob(job, status, message) { job.status = status; job.message = message; if (status === 'applied') { delete job.result; delete job.baseline; } saveJobs(); renderReturns(); }
  function renderReturns() {
    const list = $('#return-list'); list.replaceChildren(); $('#return-tray').hidden = !jobs.length;
    const labels = { topics: 'ネタ案', 'lp-outline': 'おすすめ構成', article: '本文', image: '画像' };
    for (const job of jobs.slice(-8).reverse()) {
      const row = el('div', undefined, 'return-row'); row.append(el('strong', labels[job.type] || '制作結果'), el('p', job.message || (job.status === 'waiting' ? 'Workの保存結果を待っています。' : job.status)));
      if (job.status === 'review') row.append(button(job.type === 'image' ? '差し替えを確認' : '返ってきた内容を確認', attempt(() => useReturn(job, true))));
      if (job.status === 'timeout' || job.status === 'error') row.append(button('再確認', attempt(async () => { job.status = 'waiting'; job.createdAt = Date.now(); job.message = ''; saveJobs(); await checkReturns(true); })));
      if (job.backupKey && job.draftId === draftId) row.append(button('前の画像へ戻す', attempt(async () => {
        if (assetVersions[job.slotId] !== job.appliedAssetToken) throw Error('画像がさらに変更されています。古い結果で上書きしないため、復元を止めました。');
        const blob = await A.get(job.backupKey); const slot = C.imageSlots(state.article).find(s => s.id === job.slotId); if (!blob || !slot) throw Error('元画像を取得できませんでした。');
        if (!confirm('差し替え前の画像に戻しますか？')) return;
        await attach(slot, blob); delete job.backupKey; finishJob(job, 'applied', '前の画像へ戻しました。');
      })));
      list.append(row);
    }
  }
  async function useReturn(job, allowReplace = false) {
    if (job.draftId !== draftId || job.baseline !== returnBaseline(job.slotId)) { finishJob(job, 'conflict', '依頼後に内容や記事が変わったため、自動反映を保留しました。元のWork会話から結果を確認できます。'); return; }
    const result = job.result; if (!result) throw Error('返送結果がありません。');
    if (job.type === 'image') {
      const slot = C.imageSlots(state.article).find(s => s.id === job.slotId); if (!slot) throw Error('画像の挿入位置がなくなっています。');
      const old = await A.get(`${draftId}:${job.slotId}`);
      if (old && !allowReplace) { finishJob(job, 'review', '新しい画像が戻りました。既存画像への差し替えには確認が必要です。'); return; }
      if (old && !confirm('戻ってきた画像に差し替えますか？前の画像は保存し、戻せるようにします。')) return;
      const response = await fetch(result.imageUrl, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) }); if (!response.ok) throw Error('返送画像を読み込めませんでした。');
      const blob = await response.blob(); await validateImage(blob);
      if (job.baseline !== returnBaseline(job.slotId)) { finishJob(job, 'conflict', '画像取得中に記事が変更されたため保留しました。'); return; }
      if (old) { job.backupKey = `${draftId}:${job.slotId}:before-${job.id}`; await A.put(job.backupKey, old); }
      await attach(slot, blob); job.appliedAssetToken = assetVersions[job.slotId];
      finishJob(job, 'applied', `${slot.label}に画像が自動で戻りました。`);
      if ($('#ai-dialog').open && activeJobId === job.id) $('#ai-dialog').close();
      return;
    }
    if ($('#ai-dialog').open && activeJobId !== job.id && !allowReplace) return;
    if ($('#ai-dialog').open && $('#ai-answer').value.trim() && !allowReplace) return;
    aiMode = job.type; imageSlot = ''; signature = currentSignature(); activeJobId = job.id; pending = null;
    $('#ai-heading').textContent = 'Workから制作結果が戻りました'; $('#ai-help').textContent = 'JSONの貼り付けは不要です。返ってきた内容を確認して取り込んでください。';
    $('#ai-prompt').value = 'この依頼の結果はすでに戻っています。'; $('#open-chat').hidden = true; $('#copy-prompt').hidden = true;
    $('#answer-area').hidden = false; $('#ai-answer').value = JSON.stringify(result.data); $('#ai-status').textContent = ''; reviewAnswer();
    if (!$('#ai-dialog').open) $('#ai-dialog').showModal();
  }
  async function checkReturns(force = false) {
    if (checkingReturns || (!force && document.hidden)) return;
    checkingReturns = true;
    try {
      for (const job of jobs.filter(j => j.status === 'waiting')) {
        if (!job.targetSite) continue;
        if (job.targetSite !== location.origin) { finishJob(job, 'error', '別サイトの結果は取得しません。'); continue; }
        if (Date.now() - job.createdAt > B.WINDOW_MS) { finishJob(job, 'timeout', 'まだ返送を確認できません。Workの保存結果を確認するか「再確認」を押してください。'); continue; }
        try {
          const result = await B.read(job); if (!result) continue;
          if (result.status === 'failed') { finishJob(job, 'error', result.message); continue; }
          job.result = result; finishJob(job, 'review', '制作結果が戻りました。'); await useReturn(job);
        } catch (e) { finishJob(job, 'error', e.message); }
      }
    } finally { checkingReturns = false; renderReturns(); }
  }
  function openAI(mode, slotId = '') {
    try {
      state.brief = C.briefOf(Object.fromEntries(new FormData(form)));
      aiMode = mode; imageSlot = slotId; pending = null; signature = currentSignature();
      const basePrompt = mode === 'lp-outline' ? C.lpOutlinePrompt(state) : mode === 'topics' ? C.topicPrompt(state) : mode === 'article' ? C.articlePrompt(state) : C.imagePrompt(state, slotId);
      if (jobs.filter(j => j.status === 'waiting' || j.status === 'review').length >= 8) throw Error('進行中の依頼が8件あります。先に返ってきた内容を確認してください。');
      const job = B.request(mode, draftId, slotId, location.href, returnBaseline(slotId));
      if (!job.targetSite) { job.status = 'manual'; job.message = 'ローカル表示のため自動返送は利用できません。'; }
      jobs.push(job); saveJobs(); activeJobId = job.id; renderReturns();
      const prompt = B.wrap(basePrompt, job);
      $('#ai-heading').textContent = mode === 'lp-outline' ? 'LPからおすすめ構成を制作' : mode === 'topics' ? '記事のネタを3案相談' : mode === 'article' ? '記事と画像計画を制作' : '画像を制作';
      $('#ai-help').textContent = mode === 'image' ? 'Workが同じサイトへ保存できた画像は、元の挿入位置へ自動で戻ります。保存できなかった時だけ手動追加をご利用ください。' : 'Workが同じサイトへ保存できた結果は、貼り付け不要で確認画面へ戻ります。返送できなかった場合はJSONを手動で取り込めます。';
      $('#ai-prompt').value = prompt; $('#ai-answer').value = ''; $('#ai-status').textContent = ''; $('#answer-area').hidden = mode === 'image'; $('#answer-review').hidden = true; $('#confirm-answer').checked = false; $('#manual-return').open = !job.targetSite;
      $('#open-chat').hidden = false; $('#copy-prompt').hidden = false; $('#ai-dialog').showModal();
      openPrefilledChat(prompt);
    } catch (e) { notice(e.message, true); }
  }
  function openPrefilledChat(prompt) {
    const url = C.chatUrl(prompt);
    if (url.length > 60000) { $('#ai-status').textContent = '依頼文が非常に長いため、リンクで全文を渡せません。「依頼文をコピー」でChatGPTへ貼り付けてください。内容は省略していません。'; return; }
    const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer';
    document.body.append(link); link.click(); link.remove();
    $('#ai-status').textContent = '依頼文付きリンクを開きました。新しい画面が開かない・入力が反映されない場合は、開き直すかコピーをご利用ください。';
  }
  async function copy(value, resultTarget) {
    try { await navigator.clipboard.writeText(value); if (resultTarget) resultTarget.textContent = 'コピーしました。'; else notice('コピーしました。'); }
    catch { if (resultTarget) resultTarget.textContent = '自動コピーできませんでした。依頼文を選択してコピーしてください。'; else throw Error('自動コピーできませんでした。ファイルを書き出してご利用ください。'); }
  }
  function reviewAnswer() {
    if (signature !== currentSignature()) throw Error('依頼後に入力が変わっています。最新の入力で依頼し直してください。');
    const raw = C.parse($('#ai-answer').value);
    if (aiMode === 'topics' || aiMode === 'lp-outline') {
      pending = { topics: C.topicsOf(raw.topics), source: C.sourceOf(raw.source, state.brief) };
      if (aiMode === 'lp-outline' && pending.topics.length !== 1) throw Error('LPからの構成は1案だけ取り込めます。1案で再回答を依頼してください。');
      $('#review-content').textContent = sourceText(pending.source) + '\n\n' + pending.topics.map(t => `${t.title}\n読む価値: ${t.promise}\nLPへのつながり: ${t.lpBridge}`).join('\n\n');
    } else {
      pending = { article: C.articleOf(raw.article, selected(), state.brief) };
      const slots = C.imageSlots(pending.article).filter(s => s.id !== 'cover');
      if (slots.length > Number(state.settings.imageCount)) throw Error('挿入画像が指定枚数を超えています。指定枚数以下で再回答を依頼してください。');
      $('#review-content').textContent = `${pending.article.title}\n\n${pending.article.lead}\n\n${pending.article.sections.map(s => s.heading).join('\n')}\n\n未確認事項: ${pending.article.unknowns.join(' / ') || 'なし'}\n誘導先: ${pending.article.cta.url || '未設定'}`;
    }
    $('#confirm-answer').checked = false; $('#answer-review').hidden = false; $('#ai-status').textContent = '';
  }
  async function applyAnswer() {
    if (!pending || !$('#confirm-answer').checked) throw Error('内容を確認し、確認欄にチェックしてください。');
    if (signature !== currentSignature()) throw Error('入力が変わりました。最新の内容で依頼してください。');
    if (state.article && !confirm('作業中の記事を置き換えます。保存済みの記事は残ります。続けますか？')) return;
    const receivedJob = jobs.find(j => j.id === activeJobId);
    if (aiMode === 'topics' || aiMode === 'lp-outline') { state.topics = pending.topics; state.source = pending.source; state.selectedTopicId = aiMode === 'lp-outline' ? pending.topics[0].id : ''; state.article = null; draftId = C.uid(); }
    else { state.article = pending.article; draftId = C.uid(); }
    if (receivedJob) finishJob(receivedJob, 'applied', '確認した制作結果を取り込みました。');
    store(); $('#ai-dialog').close(); notice('確認した回答を取り込みました。内容は引き続き編集できます。'); navigate(aiMode === 'lp-outline' ? 'outline' : aiMode === 'topics' ? 'topics' : 'write');
  }
  async function imageFor(key) {
    if (imageUrls.has(key)) return imageUrls.get(key);
    const blob = await A.get(key); if (!blob) return '';
    const value = URL.createObjectURL(blob); imageUrls.set(key, value); return value;
  }
  function forgetImage(key) { if (imageUrls.has(key)) { URL.revokeObjectURL(imageUrls.get(key)); imageUrls.delete(key); } }
  function imageNode(src, alt) { const img = el('img'); img.src = src; img.alt = alt; return img; }
  async function validateImage(file) {
    if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('PNG・JPEG・WebPの画像を選んでください。');
    if (file.size > 10 * 1024 * 1024) throw Error('画像は10MB以下にしてください。');
    const bitmap = await createImageBitmap(file); const size = { width: bitmap.width, height: bitmap.height }; bitmap.close(); return size;
  }
  async function attach(slot, file) {
    const size = await validateImage(file), key = `${draftId}:${slot.id}`;
    await A.put(key, file); assetVersions[slot.id] = C.uid(); store(); forgetImage(key); await renderArticle();
    notice(size.width === slot.width && size.height === slot.height ? '画像を保存しました。' : `画像を保存しました（${size.width}×${size.height}px）。推奨${slot.width}×${slot.height}pxとは異なります。自動で切り抜きはしていません。`);
  }
  async function detach(slotId) { await A.remove(`${draftId}:${slotId}`); assetVersions[slotId] = C.uid(); store(); forgetImage(`${draftId}:${slotId}`); await renderArticle(); }
  async function renderArticle() {
    const run = ++renderId, article = state.article;
    $('#article-empty').hidden = !!article; $('#article-layout').hidden = !article;
    $('#copy-article').disabled = !article; $('#save-article').disabled = !article;
    $('#word-count').textContent = article ? `${C.markdown(article, false).length.toLocaleString()}字` : '';
    if (!article) return;
    const preview = $('#preview'), plan = $('#image-plan'), edit = $('#article-edit'); preview.replaceChildren(); plan.replaceChildren(el('h2', '画像と挿入位置')); edit.replaceChildren(); edit.className = 'article-edit';
    const slots = C.imageSlots(article); const sources = new Map();
    for (const slot of slots) sources.set(slot.id, await imageFor(`${draftId}:${slot.id}`));
    if (run !== renderId) return;
    const cover = sources.get('cover'); preview.append(cover ? imageNode(cover, article.thumbnail.alt) : el('div', 'サムネイル / 1280 × 670', 'image-placeholder cover'));
    preview.append(el('h1', article.title), el('p', article.lead, 'lead'));
    for (const section of article.sections) { preview.append(el('h2', section.heading), el('p', section.body)); if (section.image) preview.append(sources.get(section.id) ? imageNode(sources.get(section.id), section.image.alt) : el('div', `画像挿入: ${section.image.alt || section.image.purpose}`, 'image-placeholder')); }
    if (article.cta.text) preview.append(el('p', article.cta.text));
    if (article.cta.url) { const a = el('a', state.brief.ctaText || article.cta.url); a.href = article.cta.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; preview.append(a); }
    if (article.unknowns.length) { const warning = el('p', `未確認: ${article.unknowns.join(' / ')}`, 'editor-note'); preview.append(warning); }
    for (const slot of slots) {
      const item = el('section', undefined, 'image-slot'); item.append(el('h3', slot.label));
      if (sources.get(slot.id)) item.append(imageNode(sources.get(slot.id), slot.alt));
      item.append(el('p', slot.brief || '本文に合う具体的なビジュアルを指定してください。'));
      const actions = el('div', undefined, 'inline'), label = el('label', '画像を追加', 'file-button quiet'), input = el('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.hidden = true; input.addEventListener('change', attempt(async () => { if (input.files[0]) await attach(slot, input.files[0]); })); label.append(input);
      actions.append(button('ChatGPTで画像制作', () => openAI('image', slot.id)), label);
      if (sources.get(slot.id)) { actions.append(button('画像を保存', attempt(async () => { const blob = await A.get(`${draftId}:${slot.id}`); const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[blob.type] || 'png'; download(blob, `${slot.id}.${ext}`); }))); const remove = button('×', attempt(() => detach(slot.id)), 'icon'); remove.title = 'この記事から画像を外す'; remove.setAttribute('aria-label', remove.title); actions.append(remove); }
      item.append(actions, el('small', `${slot.width} × ${slot.height}px / ${slot.id === 'cover' ? 'note見出し画像' : '本文用の制作サイズ'}`)); plan.append(item);
    }
    const editors = [['記事タイトル', article, 'title', 200], ['導入', article, 'lead', 8000], ...article.sections.flatMap(s => [['見出し', s, 'heading', 200], ['本文', s, 'body', 20000]]), ['締めと案内', article.cta, 'text', 2000]];
    for (const [labelText, target, key, max] of editors) { const label = el('label', labelText), input = el(key === 'title' || key === 'heading' ? 'input' : 'textarea'); input.value = target[key]; input.maxLength = max; input.addEventListener('input', () => { target[key] = input.value; store(); $('#word-count').textContent = `${C.markdown(article, false).length.toLocaleString()}字`; }); label.append(input); edit.append(label); }
    preview.hidden = editMode; edit.hidden = !editMode;
  }
  async function saveArticle() {
    if (!state.article) throw Error('先に記事本文を取り込んでください。');
    const clean = C.normalize(state), id = C.uid();
    await A.clone(draftId, id, C.imageSlots(clean.article));
    const entry = { id, savedAt: new Date().toISOString(), state: clean };
    library.unshift(entry);
    try { saveLibrary(); } catch { library.shift(); throw Error('完成記事を保存できませんでした。空き容量を確認してください。'); }
    notice('完成記事へ保存しました。noteへの投稿・公開はまだ行っていません。'); navigate('library');
  }
  async function renderLibrary() {
    const wrap = $('#library-list'); wrap.replaceChildren();
    if (!library.length) { const empty = el('div', undefined, 'empty'); empty.append(el('span', 'n', 'empty-number'), el('h2', '保存した記事がここに並びます。')); wrap.append(empty); return; }
    for (const entry of library) {
      const card = el('section', undefined, 'library-item'), body = el('div', undefined, 'library-body'), article = entry.state.article;
      const cover = await imageFor(`${entry.id}:cover`); card.append(cover ? imageNode(cover, article.thumbnail.alt) : el('div', 'サムネイル未設定', 'image-placeholder cover'));
      body.append(el('h2', article.title), el('p', `${new Date(entry.savedAt).toLocaleDateString('ja-JP')} / ${article.sections.length}章 / ${C.markdown(article, false).length.toLocaleString()}字`));
      const actions = el('div', undefined, 'inline');
      actions.append(button('開く・編集', attempt(async () => { if (state.article && !confirm('作業中の記事を切り替えます。保存済みの記事は残ります。続けますか？')) return; state = C.normalize(entry.state); draftId = C.uid(); await A.clone(entry.id, draftId, C.imageSlots(state.article)); syncForm(); store(); editMode = false; navigate('write'); })), button('本文.txt', () => download(new Blob([C.markdown(article, false)], { type: 'text/plain;charset=utf-8' }), `${safeName(article.title)}.txt`)), button('挿入位置.md', () => download(new Blob([C.markdown(article)], { type: 'text/markdown;charset=utf-8' }), `${safeName(article.title)}.md`)), button('バックアップ', attempt(() => exportEntry(entry))));
      const remove = button('×', () => { if (!confirm('この端末の完成記事一覧から外します。noteの記事・公開サイト・書き出したファイルは削除しません。よろしいですか？')) return; const old = library; library = library.filter(x => x.id !== entry.id); try { saveLibrary(); } catch { library = old; notice('一覧の変更を保存できませんでした。', true); return; } renderLibrary().catch(e => notice(e.message, true)); }, 'icon remove'); remove.title = '一覧から外す'; remove.setAttribute('aria-label', remove.title); actions.append(remove); body.append(actions); card.append(body); wrap.append(card);
    }
  }
  const safeName = value => value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 70) || 'note-article';
  function download(blob, name) { const u = URL.createObjectURL(blob), a = el('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 3000); }
  function dataURL(blob) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob); }); }
  async function exportEntry(entry) { const images = {}; for (const slot of C.imageSlots(entry.state.article)) { const b = await A.get(`${entry.id}:${slot.id}`); if (b) images[slot.id] = await dataURL(b); } download(new Blob([JSON.stringify({ schemaVersion: 1, state: entry.state, images }, null, 2)], { type: 'application/json' }), `${safeName(entry.state.article.title)}.json`); }
  async function importEntry(file) {
    if (file.size > 60 * 1024 * 1024) throw Error('バックアップは60MB以下にしてください。');
    const raw = JSON.parse(await file.text()), next = C.normalize(raw.state); if (!next.article) throw Error('記事が含まれていません。');
    const id = C.uid(), slots = C.imageSlots(next.article);
    for (const slot of slots) { const value = raw.images?.[slot.id]; if (!value) continue; if (typeof value !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) throw Error('画像データの形式が不正です。'); const response = await fetch(value), blob = await response.blob(); await validateImage(blob); await A.put(`${id}:${slot.id}`, blob); }
    library.unshift({ id, savedAt: new Date().toISOString(), state: next }); try { saveLibrary(); } catch { library.shift(); throw Error('バックアップを保存できませんでした。'); } notice('バックアップを新しい記事として取り込みました。'); navigate('library');
  }
  function init() {
    try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) { state = C.normalize(saved.state); draftId = typeof saved.draftId === 'string' ? saved.draftId : C.uid(); assetVersions = saved.assetVersions && typeof saved.assetVersions === 'object' ? saved.assetVersions : {}; } const list = JSON.parse(localStorage.getItem(LIB) || '[]'); if (Array.isArray(list)) library = list.filter(e => e?.state?.article).map(e => ({ id: String(e.id), savedAt: e.savedAt, state: C.normalize(e.state) })); }
    catch { notice('保存データの一部を読み込めませんでした。元データは消していません。', true); }
    syncForm();
    try { const savedJobs = JSON.parse(localStorage.getItem(JOBS) || '[]'); jobs = Array.isArray(savedJobs) ? savedJobs.filter(j => j && typeof j.id === 'string' && typeof j.type === 'string').slice(-20) : []; } catch { notice('制作結果の依頼履歴を読み込めませんでした。', true); }
    renderReturns(); $('#check-returns').onclick = attempt(() => checkReturns(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReturns().catch(e => notice(e.message, true)); });
    window.addEventListener('focus', () => checkReturns().catch(e => notice(e.message, true)));
    setInterval(() => checkReturns().catch(e => notice(e.message, true)), 15000);
    checkReturns().catch(e => notice(e.message, true));
    try { $('#theme').value = localStorage.getItem(THEME) || 'system'; } catch { /* Browsing without storage remains usable. */ }
    document.documentElement.dataset.theme = $('#theme').value;
    form.addEventListener('input', () => { try { state.brief = C.briefOf(Object.fromEntries(new FormData(form))); if (state.topics.length) { state.topics = []; state.selectedTopicId = ''; state.article = null; state.source = null; draftId = C.uid(); notice('入力を変更しました。最新の内容で記事のネタを相談してください。保存済みの記事は残っています。'); } modeUI(); store(); } catch (e) { notice(e.message, true); } });
    settingsForm.addEventListener('input', () => { state.settings = C.settingsOf(Object.fromEntries(new FormData(settingsForm))); store(); });
    for (const b of document.querySelectorAll('[data-step]')) b.onclick = () => navigate(b.dataset.step);
    for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => navigate(b.dataset.go);
    for (const b of document.querySelectorAll('[data-ai]')) b.onclick = () => openAI(b.dataset.ai);
    $('#to-topics').onclick = attempt(() => { state.brief = C.briefOf(Object.fromEntries(new FormData(form))); C.ready(state.brief); store(); notice(''); navigate(state.brief.mode === 'lp' ? 'outline' : 'topics'); });
    $('#to-outline').onclick = () => navigate('outline');
    $('#to-write').onclick = attempt(() => { const topic = selected(); if (!topic || !topic.title.trim() || topic.outline.some(s => !s.heading.trim())) throw Error('記事タイトルと各章の見出しを入力してください。'); notice(''); navigate('write'); });
    $('#outline-title').oninput = () => { invalidateArticle(); selected().title = $('#outline-title').value; store(); };
    $('#add-section').onclick = () => { const t = selected(); if (t.outline.length >= 8) return; invalidateArticle(); t.outline.push({ id: '', heading: '', purpose: '' }); reindex(); store(); renderOutline(); };
    $('#close-ai').onclick = () => $('#ai-dialog').close();
    $('#copy-prompt').onclick = () => copy($('#ai-prompt').value, $('#ai-status'));
    $('#open-chat').onclick = () => openPrefilledChat($('#ai-prompt').value);
    $('#review-answer').onclick = attempt(reviewAnswer); $('#apply-answer').onclick = attempt(applyAnswer);
    $('#ai-answer').oninput = () => { pending = null; $('#answer-review').hidden = true; };
    $('#copy-article').onclick = attempt(() => copy(C.markdown(state.article, false)));
    $('#view-preview').onclick = () => { editMode = false; $('#view-preview').setAttribute('aria-pressed', 'true'); $('#view-edit').setAttribute('aria-pressed', 'false'); renderArticle().catch(e => notice(e.message, true)); };
    $('#view-edit').onclick = () => { editMode = true; $('#view-preview').setAttribute('aria-pressed', 'false'); $('#view-edit').setAttribute('aria-pressed', 'true'); renderArticle().catch(e => notice(e.message, true)); };
    $('#save-article').onclick = attempt(saveArticle);
    $('#import-project').onchange = attempt(async () => { if ($('#import-project').files[0]) await importEntry($('#import-project').files[0]); $('#import-project').value = ''; });
    $('#theme-toggle').onclick = () => { $('#theme-panel').hidden = !$('#theme-panel').hidden; $('#theme-toggle').setAttribute('aria-expanded', String(!$('#theme-panel').hidden)); };
    $('#theme').onchange = () => { document.documentElement.dataset.theme = $('#theme').value; try { localStorage.setItem(THEME, $('#theme').value); } catch { notice('画面設定を保存できませんでした。', true); } };
    $('#new-project').onclick = () => { if (!confirm('作業中の内容を新しい記事に切り替えます。完成記事に保存したものは残ります。続けますか？')) return; state = C.fresh(); draftId = C.uid(); syncForm(); store(); notice('新しい記事を始めます。'); navigate('brief'); };
    $('#sample').onclick = () => { if ((state.topics.length || state.brief.idea) && !confirm('入力を記入例に置き換えます。保存済みの記事は残ります。続けますか？')) return; state = C.fresh(); draftId = C.uid(); Object.assign(state.brief, { idea: '忙しくても運動を続けたい人へ、自宅で始めるための小さな習慣を紹介したい', name: '自宅トレーニング相談', audience: '運動を始めたいが、仕事や家事で時間が取れない人', offer: '生活に合わせて続け方を相談するサービス', facts: '実績・価格・体験談はまだ入力していません。', ctaText: '自分に合う続け方を相談する' }); syncForm(); store(); notice('記入例を反映しました。実際のサービス情報に合わせて書き換えてください。'); };
    navigate('brief');
  }
  init();
})();
