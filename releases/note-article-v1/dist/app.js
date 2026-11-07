(function () {
  'use strict';
  const C = NoteCore, A = NoteAssets, B = NoteBridge, $ = selector => document.querySelector(selector);
  const KEY = 'terakoya-note-workshop3-v1', LIB = `${KEY}:library`, THEME = `${KEY}:theme`;
  let state = C.fresh(), draftId = C.uid(), library = [], stage = 'brief', aiMode = '', pending = null, signature = '', imageSlot = '', editMode = false, renderId = 0;
  let jobs = [], assetVersions = {}, activeJobId = '', checkingReturns = false, libraryRenderGeneration = 0;
  const RULES = `${KEY}:writing-rules`;
  const PREFS = `${KEY}:preferences`, UNDO = `${KEY}:undo-clear`, MIGRATED = `${KEY}:history-migrated`;
  const H = NoteHistory;
  let preferences = H.preferences(), articleId = '', historyQueue = Promise.resolve(), historyTimer, lastFingerprint = '', lastHistoryId = '', visibleHistoryIds = [];
  let historyReady = Promise.resolve(), remoteStock = [], currentStock = null, stockUrls = [], lastStockLoad = 0, stockLoad;
  const stockHiddenKey = `${KEY}:hidden-stock`; let hiddenStock = new Set(); try { hiddenStock = new Set(JSON.parse(localStorage.getItem(stockHiddenKey) || '[]')); } catch { /* Keep stock usable if the display preference is damaged. */ }
  const X = NoteExtensions;
  const JOBS = `${KEY}:returns`;
  const imageUrls = new Map();
  const form = $('#brief-form'), settingsForm = $('#settings-form');
  const el = (tag, value, className) => { const node = document.createElement(tag); if (value !== undefined) node.textContent = value; if (className) node.className = className; return node; };
  function button(label, handler, className = 'quiet') { const n = el('button', label, className); n.type = 'button'; n.addEventListener('click', handler); return n; }
  function notice(message, error = false) { const n = $('#notice'); n.hidden = !message; n.textContent = message; n.classList.toggle('error', error); }
  const attempt = fn => async event => { try { await fn(event); } catch (e) { if ($('#ai-dialog').open) reviewError(e); else notice(e.message, true); } };
  function reviewError(error) { $('#ai-status').textContent = error.message; $('#repair-answer').hidden = !activeJobId || aiMode === 'image'; }
  const savedRules = () => localStorage.getItem(RULES) || '';
  const effectiveRules = () => H.effectiveRules(savedRules(), preferences);
  function historyInput(source = state, sourceId = draftId) { return { state: JSON.parse(JSON.stringify(source)), draftId: sourceId, articleId: source === state ? articleId : library.find(e => e.id === sourceId)?.id || '', rules: savedRules(), preferences: JSON.parse(JSON.stringify(preferences)), images: {} }; }
  function checkpoint(kind, scope = 'article', force = false, source = state, sourceId = draftId) {
    const input = historyInput(source, sourceId), fingerprint = H.fingerprint(input);
    const run = async () => {
      if (!force && fingerprint === lastFingerprint) return lastHistoryId;
      for (const slot of C.imageSlots(input.state.article)) { const blob = await A.get(`${sourceId}:${slot.id}`); if (blob) input.images[slot.id] = blob; }
      const record = H.create(input, kind, scope); await H.add(record); lastFingerprint = fingerprint; lastHistoryId = record.id; return record.id;
    };
    const result = historyQueue.then(run); historyQueue = result.catch(() => {}); return result;
  }
  function scheduleHistory(kind = '入力・本文を編集') { clearTimeout(historyTimer); historyTimer = setTimeout(() => checkpoint(kind).catch(e => notice(e.message, true)), 900); }
  async function initializeHistory() {
    if (!localStorage.getItem(MIGRATED)) {
      for (const entry of library) {
        const id = `legacy-${entry.id}`; if (await H.get(id)) continue;
        const input = historyInput(entry.state, entry.id); input.articleId = entry.id;
        for (const slot of C.imageSlots(entry.state.article)) { const blob = await A.get(`${entry.id}:${slot.id}`); if (blob) input.images[slot.id] = blob; }
        const record = H.create(input, '更新前から保存されていた記事'); record.id = id; record.createdAt = entry.savedAt || record.createdAt; await H.add(record);
      }
      await checkpoint('更新前の作業内容を引き継ぎ', 'article', true);
      if (savedRules()) await checkpoint('更新前の学習設定を引き継ぎ', 'settings', true);
      localStorage.setItem(MIGRATED, '1');
    } else await checkpoint('記事を開いた');
  }
  function rememberUndo(id) { localStorage.setItem(UNDO, id); $('#undo-clear').hidden = false; }
  async function clearDraft() {
    await historyReady; clearTimeout(historyTimer);
    const id = await checkpoint('入力をクリアする前', 'article', true);
    state = C.fresh(); state.settings = { ...preferences.defaults }; draftId = C.uid(); articleId = ''; assetVersions = {}; editMode = false;
    syncForm(); if (!store()) throw Error('入力のクリアを保存できませんでした。履歴から元の入力を復元できます。');
    rememberUndo(id); notice('入力をクリアしました。完成記事と学習設定は残っています。「クリアを元に戻す」で復元できます。'); navigate('brief');
  }
  async function restoreHistory(record) {
    await historyReady; clearTimeout(historyTimer);
    if (record.scope === 'settings') {
      await checkpoint('設定を復元する前', 'settings', true); preferences = H.preferences(record.preferences); localStorage.setItem(PREFS, JSON.stringify(preferences)); localStorage.setItem(RULES, record.rules || ''); renderPreferences(); renderLearningSummary();
      notice('学習・初期設定を復元しました。記事の内容は変えていません。'); navigate('preferences');
    } else {
      const next = C.normalize(record.state), nextId = C.uid();
      await checkpoint('過去の記事を復元する前', 'article', true);
      for (const [slotId, blob] of Object.entries(record.images || {})) await A.put(`${nextId}:${slotId}`, blob);
      state = next; draftId = nextId; articleId = record.articleId || ''; assetVersions = {}; syncForm(); store(); editMode = false;
      notice('履歴から復元しました。復元前の内容も履歴に残っています。学習設定は変更していません。'); navigate(state.article ? 'write' : selected() ? 'outline' : 'brief');
    }
    await checkpoint('履歴から復元', record.scope, true);
  }
  async function renderHistory() {
    await historyReady; await historyQueue;
    const query = $('#history-search').value.trim().toLowerCase(), filter = $('#history-filter').value;
    const all = await H.list(), records = all.filter(r => (filter === 'trash' ? !!r.trashedAt : !r.trashedAt) && (filter === 'all' || filter === 'trash' || r.scope === filter) && `${r.title} ${r.kind}`.toLowerCase().includes(query));
    visibleHistoryIds = records.map(r => r.id); $('#history-count').textContent = `${records.length}件。履歴は自動で間引きません。`;
    $('#trash-history').hidden = filter === 'trash' || !records.length; $('#untrash-history').hidden = filter !== 'trash' || !records.length;
    const wrap = $('#history-list'); wrap.replaceChildren();
    if (!records.length) { wrap.append(el('p', '表示する履歴はありません。', 'muted')); return; }
    for (const record of records) {
      const card = el('section', undefined, 'history-item');
      card.append(el('p', `${new Date(record.createdAt).toLocaleString('ja-JP')} · ${record.kind} · ${record.scope === 'settings' ? '学習・設定' : '記事・入力'}`, 'history-meta'), el('h2', record.scope === 'settings' ? '書き方の決まり・初期設定' : record.title));
      const details = el('details'), summary = el('summary', '内容を見る'); details.append(summary);
      details.append(el('div', record.scope === 'settings' ? `適用: ${record.preferences.enabled === false ? 'OFF' : 'ON'}\n${record.rules || '決まり未設定'}\n\n材料メモ: ${record.preferences.notes || 'なし'}\n初期設定: ${JSON.stringify(record.preferences.defaults || {}, null, 2)}` : record.state.article ? C.markdown(record.state.article, false) : JSON.stringify(record.state, null, 2), 'history-preview'));
      if (record.request) { const info = el('details'); info.append(el('summary', '依頼時の設定・依頼文'), el('p', `依頼ID: ${record.request.id}`), el('pre', `書き方の決まり: ${record.preferences.enabled === false ? '適用OFF' : '適用ON'}\n${record.rules || '未設定'}\n\n${record.request.prompt || '返送結果の記録です。依頼文は依頼時の履歴に残っています。'}`, 'prompt-preview')); details.append(info); }
      if (record.images?.cover) { const url = URL.createObjectURL(record.images.cover); const img = imageNode(url, '履歴に保存されたサムネイル'); img.onload = () => URL.revokeObjectURL(url); details.append(img); }
      const actions = el('div', undefined, 'inline'); actions.append(button(record.scope === 'settings' ? 'この設定を復元' : 'この内容を復元', attempt(() => restoreHistory(record)), 'primary'));
      actions.append(button(record.trashedAt ? '履歴へ戻す' : 'この履歴を片付ける', attempt(async () => { await H.trash([record.id], !!record.trashedAt); await renderHistory(); })));
      card.append(details, actions); wrap.append(card);
    }
  }
  function renderLearningSummary() { $('#learning-summary').textContent = `書き方の決まり: ${preferences.enabled ? '適用ON' : '適用OFF'} / ${savedRules() ? '保存あり' : '未設定'}。設定ページで内容・材料メモ・履歴を確認できます。`; }
  function renderPreferences() {
    $('#writing-rules').value = savedRules(); $('#learning-enabled').checked = preferences.enabled; $('#learning-notes').value = preferences.notes;
    for (const [key, value] of Object.entries(preferences.defaults)) $('#default-settings-form').elements.namedItem(key).value = value;
    $('#settings-updated').textContent = `最終保存: ${preferences.updatedAt ? new Date(preferences.updatedAt).toLocaleString('ja-JP') : (savedRules() ? '未保存（以前の決まりは引き継ぎ済み）' : '未保存（決まりは未設定）')} / 保存元: ${preferences.source}`;
    $('#effective-settings').textContent = `適用先: 相談・ニュース・ネタ案・構成・本文・推敲の依頼文の先頭。${preferences.enabled ? 'ON' : 'OFF（決まりは保存したまま）'}。初期設定は新しい記事を始めたときに反映します。`;
    $('#effective-prompt').textContent = X.prefix(effectiveRules()); renderLearningSummary();
  }
  async function savePreferences(fromWork = false, nextRules) {
    await historyReady; await checkpoint('学習設定を変更する前', 'settings', true);
    const rules = fromWork ? X.rules(nextRules) : $('#writing-rules').value;
    preferences = H.preferences({ ...preferences, enabled: fromWork ? preferences.enabled : $('#learning-enabled').checked, notes: fromWork ? preferences.notes : $('#learning-notes').value, updatedAt: new Date().toISOString(), source: fromWork ? 'ChatGPTとの相談・本人確認後' : '設定ページで手入力' });
    localStorage.setItem(PREFS, JSON.stringify(preferences)); localStorage.setItem(RULES, rules); renderPreferences(); await checkpoint('学習設定を保存', 'settings', true); $('#rules-status').textContent = '設定を保存しました。次の依頼から反映します。';
  }
  async function archiveReturn(job) {
    if (!job.result || job.archivedHistoryId) return;
    const source = JSON.parse(JSON.stringify(job.inputState || state)), result = job.result;
    const input = historyInput(source, job.draftId); input.articleId = job.inputArticleId || ''; input.preferences = job.inputPreferences || preferences; input.rules = job.inputRules || '';
    let validationError; try {
    if (job.type === 'learn') input.rules = X.rules(result.data.rules);
    else if (job.type === 'consult' || job.type === 'news') input.state = result.data.article ? X.bundle(result.data, source) : X.plan(result.data, source, job.type);
    else if (job.type === 'topics' || job.type === 'lp-outline') {
      input.state.topics = C.topicsOf(result.data.topics); input.state.selectedTopicId = input.state.topics[0].id; input.state.article = null; input.state.source = C.sourceOf(result.data.source, source.brief);
    } else if (job.type !== 'image') {
      input.state.article = X.article(result.data, source);
    }
    } catch (error) { validationError = error.message; input.state.article = null; }
    for (const slot of C.imageSlots(source.article)) { const blob = await A.get(`${job.draftId}:${slot.id}`); if (blob) input.images[slot.id] = blob; }
    if (job.type === 'image') {
      const response = await fetch(result.imageUrl, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error('返送画像を履歴へ保存できません。再確認してください。');
      const blob = await response.blob(); await validateImage(blob); input.images[job.slotId] = blob;
    }
    const record = H.create(input, `Workから返送: ${X.labels[job.type] || job.type}`, job.type === 'learn' ? 'settings' : 'article'); record.request = { id: job.id, type: job.type }; if (validationError) { record.validationError = validationError; record.rawResult = result.data; }
    await H.add(record); job.archivedHistoryId = record.id; saveJobs();
  }
  function appendBody(parent, value) {
    for (const block of value.split(/\n\s*\n/)) {
      const lines = block.split('\n');
      if (lines.every(line => /^\s*[-*] /.test(line))) { const list = el('ul'); for (const line of lines) list.append(el('li', line.replace(/^\s*[-*] /, ''))); parent.append(list); }
      else if (lines.every(line => /^\s*\d+[.)] /.test(line))) { const list = el('ol'); for (const line of lines) list.append(el('li', line.replace(/^\s*\d+[.)] /, ''))); parent.append(list); }
      else if (lines.every(line => /^\s*>/.test(line))) { const quote = el('blockquote'); appendBody(quote, lines.map(line => line.replace(/^\s*> ?/, '')).join('\n')); parent.append(quote); }
      else parent.append(el('p', block));
    }
  }
  function store() {
    try { localStorage.setItem(KEY, JSON.stringify({ state, draftId, assetVersions, articleId })); $('#save-status').textContent = 'この端末に保存済み'; scheduleHistory(); return true; }
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
    if (next === 'write' && selected() && !state.article && !state.outlineApproved) { notice('先に構成と文章・画像の設定を確認してください。'); next = 'outline'; }
    if (next === 'write' && !selected()) { notice(lp ? '先にLPからおすすめ構成を取り込んでください。' : '先に記事テーマを1つ選んでください。', true); next = lp ? 'outline' : 'topics'; }
    if (next === 'outline' && !selected() && !lp) { notice('先に記事テーマを1つ選んでください。', true); next = 'topics'; }
    stage = next;
    for (const panel of document.querySelectorAll('.panel')) { panel.hidden = panel.id !== next; panel.classList.toggle('active', panel.id === next); }
    for (const b of document.querySelectorAll('[data-step]')) { const active = b.dataset.step === next; b.classList.toggle('active', active); if (active) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }
    if (next === 'topics') renderTopics(); if (next === 'outline') renderOutline(); if (next === 'write') renderArticle().catch(e => notice(e.message, true)); if (next === 'library') renderLibrary().catch(e => notice(e.message, true));
    if (next === 'history') renderHistory().catch(e => notice(e.message, true)); if (next === 'preferences') renderPreferences();
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
      const choose = button(topic.id === state.selectedTopicId ? '選択中' : 'このネタを選ぶ', attempt(async () => {
        if (state.article && topic.id !== state.selectedTopicId) await checkpoint('テーマを切り替える前', 'article', true);
        if (topic.id !== state.selectedTopicId) { state.article = null; draftId = C.uid(); }
        state.selectedTopicId = topic.id; store(); renderTopics();
      }), topic.id === state.selectedTopicId ? 'primary' : 'quiet'); choose.setAttribute('aria-pressed', String(topic.id === state.selectedTopicId)); card.append(dl, choose); wrap.append(card);
    }
  }
  async function invalidateArticle() { state.outlineApproved = false; if (state.article) { await historyReady; await checkpoint('構成を変更する前', 'article', true); state.article = null; draftId = C.uid(); notice('構成を変更しました。変更前の本文は履歴に残し、記事を作り直せます。'); } }
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
      for (const [key, name] of [['heading', '見出し'], ['purpose', 'ここで伝えること']]) { const label = el('label', name), input = document.createElement(key === 'heading' ? 'input' : 'textarea'); input.value = section[key]; input.maxLength = key === 'heading' ? 200 : 1500; if (key === 'purpose') input.rows = 2; input.addEventListener('input', attempt(async () => { const value = input.value; await invalidateArticle(); section[key] = value; store(); })); label.append(input); fields.append(label); }
      for (const [label, delta, title] of [['↑', -1, '章を上へ移動'], ['↓', 1, '章を下へ移動'], ['×', 0, '章を外す']]) {
        const b = button(label, attempt(async () => { await invalidateArticle(); if (!delta) topic.outline.splice(i, 1); else { const j = i + delta; [topic.outline[i], topic.outline[j]] = [topic.outline[j], topic.outline[i]]; } reindex(); store(); renderOutline(); }), 'icon'); b.title = title; b.setAttribute('aria-label', title); b.disabled = delta === -1 ? i === 0 : delta === 1 ? i === topic.outline.length - 1 : topic.outline.length <= 2; controls.append(b);
      }
      row.append(fields, controls); wrap.append(row);
    });
    $('#add-section').disabled = topic.outline.length >= 8;
  }
  function currentSignature() { return JSON.stringify({ brief: state.brief, settings: state.settings, topic: selected(), article: state.article, rules: localStorage.getItem(RULES) || '', learningEnabled: preferences.enabled }); }
  function returnBaseline(slotId = '', type = '') { if (type === 'learn') return H.learningContext(historyInput()); return JSON.stringify({ context: currentSignature(), draftId, article: state.article, asset: slotId ? assetVersions[slotId] || '' : '' }); }
  function saveJobs() { localStorage.setItem(JOBS, JSON.stringify(jobs.slice(-20))); }
  function finishJob(job, status, message) { job.status = status; job.message = message; if (status === 'applied') { delete job.result; delete job.baseline; } saveJobs(); renderReturns(); }
  function renderReturns() {
    const list = $('#return-list'); list.replaceChildren(); $('#return-tray').hidden = !jobs.length;
    const labels = { topics: 'ネタ案', 'lp-outline': 'おすすめ構成', article: '本文', image: '画像', consult: '相談記事', news: 'ニュース記事', learn: '書き方の決まり', polish: '文章の仕上げ' };
    for (const job of jobs.slice(-8).reverse()) {
      const row = el('div', undefined, 'return-row'); row.append(el('strong', labels[job.type] || '制作結果'), el('p', job.message || (job.status === 'waiting' ? 'Workの保存結果を待っています。' : job.status)));
      if (job.status === 'review') row.append(button(job.type === 'image' ? '差し替えを確認' : '返ってきた内容を確認', attempt(() => useReturn(job, true))));
      if (job.status === 'conflict' && job.archivedHistoryId) row.append(button('履歴で結果を見る', () => { $('#history-search').value = ''; $('#history-filter').value = job.type === 'learn' ? 'settings' : 'article'; navigate('history'); }));
      if (job.result && job.status === 'error') row.append(button('内容を確認・修正', attempt(() => useReturn(job, true))));
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
    await historyReady;
    await archiveReturn(job);
    if ((job.type !== 'learn' && job.draftId !== draftId) || job.baseline !== returnBaseline(job.slotId, job.type)) { finishJob(job, 'conflict', '依頼後に関連する内容が変わったため反映を保留しました。返ってきた結果は履歴から確認・復元できます。'); return; }
    const result = job.result; if (!result) throw Error('返送結果がありません。');
    if (job.type === 'image') {
      const slot = C.imageSlots(state.article).find(s => s.id === job.slotId); if (!slot) throw Error('画像の挿入位置がなくなっています。');
      const old = await A.get(`${draftId}:${job.slotId}`);
      if (old && !allowReplace) { finishJob(job, 'review', '新しい画像が戻りました。既存画像への差し替えには確認が必要です。'); return; }
      if (old && !confirm('戻ってきた画像に差し替えますか？前の画像は保存し、戻せるようにします。')) return;
      const response = await fetch(result.imageUrl, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) }); if (!response.ok) throw Error('返送画像を読み込めませんでした。');
      const blob = await response.blob(); await validateImage(blob);
      if (job.baseline !== returnBaseline(job.slotId, job.type)) { finishJob(job, 'conflict', '画像取得中に記事が変更されたため保留しました。結果は履歴に保存しています。'); return; }
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
    $('#answer-area').hidden = false; $('#ai-answer').value = JSON.stringify(result.data); $('#ai-status').textContent = ''; if (!$('#ai-dialog').open) $('#ai-dialog').showModal(); try { reviewAnswer(); } catch (error) { reviewError(error); }
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
        } catch (e) { if (e.retryable) { job.message = `通信を再確認しています。${e.message}`; saveJobs(); } else finishJob(job, 'error', e.message); }
      }
    } finally { checkingReturns = false; renderReturns(); }
  }
  async function openAI(mode, slotId = '') {
    try {
      await historyReady; if (mode === 'article' && !state.outlineApproved && !state.article) throw Error('先に構成と設定を確認してください。'); await checkpoint('ChatGPTへ依頼する前');
      state.brief = C.briefOf(Object.fromEntries(new FormData(form)));
      aiMode = mode; imageSlot = slotId; pending = null; signature = currentSignature();
      const basePrompt = X.modes.includes(mode) ? X.prompt(mode, state, { notes: preferences.notes }) : mode === 'lp-outline' ? C.lpOutlinePrompt(state) : mode === 'topics' ? C.topicPrompt(state) : mode === 'article' ? C.articlePrompt(state) : C.imagePrompt(state, slotId);
      if (jobs.filter(j => j.status === 'waiting' || j.status === 'review').length >= 8) throw Error('進行中の依頼が8件あります。先に返ってきた内容を確認してください。');
      const job = B.request(mode, draftId, slotId, location.href, returnBaseline(slotId, mode)); job.projectId = NoteKit.projectId(document);
      job.inputState = JSON.parse(JSON.stringify(state)); job.inputRules = savedRules(); job.inputPreferences = JSON.parse(JSON.stringify(preferences)); job.inputArticleId = articleId;
      if (!job.targetSite) { job.status = 'manual'; job.message = 'ローカル表示のため自動返送は利用できません。'; }
      jobs.push(job); saveJobs(); activeJobId = job.id; renderReturns();
      const prompt = X.prefix(effectiveRules()) + B.wrap(basePrompt, job);
      const requestRecord = H.create(historyInput(), `ChatGPTへ依頼: ${X.labels[mode] || mode}`, mode === 'learn' ? 'settings' : 'article'); requestRecord.request = { id: job.id, type: mode, prompt }; await H.add(requestRecord);
      $('#ai-heading').textContent = X.labels[mode] || (mode === 'lp-outline' ? 'LPからおすすめ構成を制作' : mode === 'topics' ? '記事のネタを3案相談' : mode === 'article' ? '記事と画像計画を制作' : '画像を制作');
      $('#ai-help').textContent = mode === 'image' ? 'ChatGPTで依頼文を確認して送信します。Workで保存できた画像はここに戻ります。「結果を確認」で受信を確認し、戻らない場合は「画像を追加」から取り込めます。' : 'ChatGPTで依頼文を確認して送信します。Workで保存できた結果が戻ったら、内容を確認して取り込んでください。戻らない場合はJSONを手動で取り込めます。';
      $('#ai-prompt').value = prompt; $('#ai-answer').value = ''; $('#ai-status').textContent = ''; $('#repair-answer').hidden = true; $('#answer-area').hidden = mode === 'image'; $('#answer-review').hidden = true; $('#confirm-answer').checked = false; $('#manual-return').open = !job.targetSite;
      $('#open-chat').hidden = false; $('#copy-prompt').hidden = false; $('#ai-dialog').showModal();
      openPrefilledChat(prompt);
    } catch (e) { notice(e.message, true); }
  }
  async function repairAnswer() {
    const job=jobs.find(j=>j.id===activeJobId);if(!job)throw Error('修正する依頼が見つかりません。');
    const prompt=X.prefix(effectiveRules())+B.wrap(`前回のJSONを同じ依頼へ修正返送してください。エラー: ${$('#ai-status').textContent}\n元の情報を捏造せず、相談・ニュースなら本文を作らずbrief/source/topics/sources/article:null、本文制作ならarticleとsourcesを返す。サービス情報は任意。出典はsourcesへ構造化し日付不明を推定しない。今回の入力:\n${JSON.stringify(job.inputState || state)}\n修正対象JSON:\n${$('#ai-answer').value.slice(0,100000)}`,job);
    job.status='waiting';job.createdAt=Date.now();delete job.result;delete job.archivedHistoryId;saveJobs();renderReturns();
    $('#ai-prompt').value=prompt;$('#open-chat').hidden=false;$('#copy-prompt').hidden=false;$('#answer-review').hidden=true;$('#repair-answer').hidden=true;$('#ai-status').textContent='同じ依頼の修正結果を待っています。';openPrefilledChat(prompt);
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
    const raw = B.payload(C.parse($('#ai-answer').value), jobs.find(j => j.id === activeJobId));
    if (aiMode === 'learn') {
      pending = { rules: X.rules(raw.rules) };
      $('#review-content').textContent = pending.rules;
    } else if (aiMode === 'consult' || aiMode === 'news') {
      pending = { bundle: X.plan(raw, state, aiMode) };
      $('#review-content').textContent = pending.bundle.topics.map(t => `${t.title}\n読者: ${t.readerProblem}\n読む価値: ${t.promise}\n\n${t.outline.map(o => o.heading + '\n' + o.purpose).join('\n\n')}`).join('\n') + `\n\n出典: ${pending.bundle.sources.map(src => src.name + ' / ' + (src.publishedAt || '公開日未確認') + ' / ' + src.url).join('\n') || '未設定'}\n\n本文はまだ作りません。取り込み後、構成画面で文章・画像の設定を確認します。`;
    } else if (aiMode === 'topics' || aiMode === 'lp-outline') {
      pending = { topics: C.topicsOf(raw.topics), source: C.sourceOf(raw.source, state.brief) };
      if (aiMode === 'lp-outline' && pending.topics.length !== 1) throw Error('LPからの構成は1案だけ取り込めます。1案で再回答を依頼してください。');
      $('#review-content').textContent = sourceText(pending.source) + '\n\n' + pending.topics.map(t => `${t.title}\n読む価値: ${t.promise}\nLPへのつながり: ${t.lpBridge}`).join('\n\n');
    } else {
      pending = { article: X.article(raw, state) };
      X.checkArticle(pending.article);
      if (aiMode === 'polish') X.checkPolish(pending.article, state.article);
      const slots = C.imageSlots(pending.article).filter(s => s.id !== 'cover');
      if (slots.length > Number(state.settings.imageCount)) throw Error('挿入画像が指定枚数を超えています。指定枚数以下で再回答を依頼してください。');
      $('#review-content').textContent = C.markdown(pending.article, false) + `\n\n未確認事項: ${pending.article.unknowns.join(' / ') || 'なし'}\n誘導先: ${pending.article.cta.url || '未設定'}`;
    }
    $('#confirm-answer').checked = false; $('#answer-review').hidden = false; $('#ai-status').textContent = ''; $('#repair-answer').hidden = true;
  }
  async function applyAnswer() {
    if (!pending || !$('#confirm-answer').checked) throw Error('内容を確認し、確認欄にチェックしてください。');
    if (signature !== currentSignature()) throw Error('入力が変わりました。最新の内容で依頼してください。');
    await historyReady; await checkpoint('制作結果を取り込む前', aiMode === 'learn' ? 'settings' : 'article', true);
    const receivedJob = jobs.find(j => j.id === activeJobId);
    if (aiMode === 'learn') { await savePreferences(true, pending.rules); }
    else if (aiMode === 'consult' || aiMode === 'news') { state = pending.bundle; draftId = C.uid(); articleId = ''; syncForm(); }
    else if (aiMode === 'polish') { state.article = pending.article; }
    else if (aiMode === 'topics' || aiMode === 'lp-outline') { state.topics = pending.topics; state.source = pending.source; state.selectedTopicId = aiMode === 'lp-outline' ? pending.topics[0].id : ''; state.article = null; draftId = C.uid(); }
    else { state.article = pending.article; draftId = C.uid(); }
    if (receivedJob) finishJob(receivedJob, 'applied', '確認した制作結果を取り込みました。');
    store(); await checkpoint('確認した制作結果を取り込み', aiMode === 'learn' ? 'settings' : 'article', true); $('#ai-dialog').close(); notice('確認した回答を取り込みました。変更前と変更後の内容を履歴に残しています。'); navigate(aiMode === 'learn' ? 'preferences' : ['consult','news','lp-outline'].includes(aiMode) ? 'outline' : aiMode === 'topics' ? 'topics' : 'write');
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
    await historyReady; await checkpoint('画像を追加・差し替える前', 'article', true);
    await A.put(key, file); assetVersions[slot.id] = C.uid(); store(); forgetImage(key); await checkpoint('画像を追加・差し替えた', 'article', true); await renderArticle();
    notice(size.width === slot.width && size.height === slot.height ? '画像を保存しました。' : `画像を保存しました（${size.width}×${size.height}px）。推奨${slot.width}×${slot.height}pxとは異なります。自動で切り抜きはしていません。`);
  }
  async function detach(slotId) { await checkpoint('画像を外す前', 'article', true); await A.remove(`${draftId}:${slotId}`); assetVersions[slotId] = C.uid(); store(); forgetImage(`${draftId}:${slotId}`); await checkpoint('画像を外した', 'article', true); await renderArticle(); }
  async function renderArticle() {
    const run = ++renderId, article = state.article;
    $('#view-preview').setAttribute('aria-pressed', String(!editMode)); $('#view-edit').setAttribute('aria-pressed', String(editMode));
    $('#editor-toolbar').hidden = !article; $('#article-empty').hidden = !!article; $('#article-layout').hidden = !article;
    $('#polish-article').disabled = !article;
    $('#copy-article').disabled = !article; $('#save-article').disabled = !article;
    $('#word-count').textContent = article ? `${C.markdown(article, false).length.toLocaleString()}字` : '';
    if (!article) return;
    const preview = $('#preview'), plan = $('#image-plan'), edit = $('#article-edit'); preview.replaceChildren(); plan.replaceChildren(el('h2', '画像と挿入位置')); edit.replaceChildren(); edit.className = 'article-edit';
    const slots = C.imageSlots(article); const sources = new Map();
    for (const slot of slots) sources.set(slot.id, await imageFor(`${draftId}:${slot.id}`));
    if (run !== renderId) return;
    const cover = sources.get('cover'); preview.append(cover ? imageNode(cover, article.thumbnail.alt) : el('div', 'サムネイル / 1280 × 670', 'image-placeholder cover'));
    preview.append(el('h1', article.title), el('p', article.lead, 'lead'));
    for (const section of article.sections) { preview.append(el('h2', section.heading)); appendBody(preview, section.body); if (section.image) preview.append(sources.get(section.id) ? imageNode(sources.get(section.id), section.image.alt) : el('div', `画像挿入: ${section.image.alt || section.image.purpose}`, 'image-placeholder')); }
    if (article.sources?.length) { preview.append(el('h2', '出典')); for (const src of article.sources) { const line = el('p', `${src.name}${src.title ? '「' + src.title + '」' : ''} / 公開日: ${src.publishedAt || '未確認'} `), link = el('a', src.url); link.href = src.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; line.append(link); preview.append(line); } }
    if (article.cta.text) preview.append(el('p', article.cta.text));
    if (article.cta.url) { const a = el('a', state.brief.ctaText || article.cta.url); a.href = article.cta.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; preview.append(a); }
    if (article.unknowns.length) { const warning = el('p', `未確認: ${article.unknowns.join(' / ')}`, 'editor-note'); preview.append(warning); }
    for (const slot of slots) {
      const item = el('section', undefined, 'image-slot'); item.append(el('h3', slot.label));
      if (sources.get(slot.id)) item.append(imageNode(sources.get(slot.id), slot.alt));
      item.append(el('p', slot.brief || '本文に合う具体的なビジュアルを指定してください。'));
      const actions = el('div', undefined, 'inline'), label = el('label', '画像を追加', 'file-button quiet'), input = el('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.hidden = true; input.addEventListener('change', attempt(async () => { if (input.files[0]) await attach(slot, input.files[0]); })); label.append(input);
      actions.append(button('ChatGPTで画像を作る', () => openAI('image', slot.id)), label);
      if (sources.get(slot.id)) { actions.append(button('画像を保存', attempt(async () => { const blob = await A.get(`${draftId}:${slot.id}`); const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[blob.type] || 'png'; download(blob, `${slot.id}.${ext}`); }))); const remove = button('×', attempt(() => detach(slot.id)), 'icon'); remove.title = 'この記事から画像を外す'; remove.setAttribute('aria-label', remove.title); actions.append(remove); }
      item.append(actions, el('small', `${slot.width} × ${slot.height}px / ${slot.id === 'cover' ? 'note見出し画像' : '本文用の制作サイズ'}`)); plan.append(item);
    }
    const editors = [['記事タイトル', article, 'title', 200], ['導入', article, 'lead', 8000], ...article.sections.flatMap(s => [['見出し', s, 'heading', 200], ['本文', s, 'body', 20000]]), ['締めと案内', article.cta, 'text', 2000]];
    for (const [labelText, target, key, max] of editors) { const label = el('label', labelText), input = el(key === 'title' || key === 'heading' ? 'input' : 'textarea'); input.value = target[key]; input.maxLength = max; input.addEventListener('input', () => { target[key] = input.value; store(); $('#word-count').textContent = `${C.markdown(article, false).length.toLocaleString()}字`; }); label.append(input); edit.append(label); }
    preview.hidden = editMode; edit.hidden = !editMode;
  }
  async function saveArticle() {
    if (!state.article) throw Error('先に記事本文を取り込んでください。');
    await historyReady; await checkpoint('完成記事として保存する前', 'article', true);
    const clean = C.normalize(state), id = articleId || C.uid();
    await A.clone(draftId, id, C.imageSlots(clean.article));
    for (const slot of C.imageSlots(clean.article)) forgetImage(`${id}:${slot.id}`);
    const entry = { id, savedAt: new Date().toISOString(), state: clean };
    const old = library; library = H.saveEntry(library, entry);
    try { saveLibrary(); } catch { library = old; throw Error('完成記事を保存できませんでした。空き容量を確認してください。'); }
    articleId = id; store(); await checkpoint(`完成記事を保存（第${library[0].version}版）`, 'article', true);
    notice('このブラウザーの記事ストックに保存しました。以前の本文も記事ストックから開けます。'); navigate('library');
  }
  async function loadRemoteStock(force = false) {
    if (stockLoad) return stockLoad; if (!force && Date.now() - lastStockLoad < 60000) return;
    stockLoad = (async () => {
      const response = await fetch(`completed-articles.json?v=${Date.now()}`, {cache:'no-store',credentials:'same-origin',redirect:'error'});
      if (response.status === 404 || /text\/html/.test(response.headers.get('content-type') || '')) { lastStockLoad=Date.now(); return; }
      if (!response.ok) throw Error('サイトに保存した記事を読み込めません。端末の記事は引き続き開けます。');
      const index=await response.json(); if (!Array.isArray(index.entries)) throw Error('記事一覧の形式を確認してください。');
      const collected=[];
      for (const entry of index.entries) {
        try { const url=new URL(entry.url,location.href);if(url.origin!==location.origin || !/^\/completed-articles\/[a-zA-Z0-9-]{10,100}\/article\.json$/.test(url.pathname) || url.search || url.hash) continue;
        const res=await fetch(url,{cache:'no-store',credentials:'same-origin',redirect:'error'});if(!res.ok)continue;const body=await res.text();if(body.length>300000)continue;const value=JSON.parse(body);if(value.requestId!==entry.id || !['article','polish'].includes(value.type))continue;
          const next=C.normalize(value.input);next.article=X.article(value.data,next);
          collected.push({id:entry.id,state:next,createdAt:entry.createdAt,kind:'Siteに保存された記事',origin:'site',images:{},remoteImages:value.images || {},sourceDraftId:''});
        } catch { /* One invalid article must not hide the other stock. */ }
      }
      remoteStock=collected;lastStockLoad=Date.now();
    })().finally(()=>{stockLoad=null;}); return stockLoad;
  }
  async function stockImage(item,slotId) {
    const local=item.images?.[slotId] || (item.sourceDraftId ? await A.get(`${item.sourceDraftId}:${slotId}`) : null);if(local)return local;
    if(item.imageCache?.[slotId])return item.imageCache[slotId];
    const url=H.stockImageUrl(item.remoteImages?.[slotId],slotId,location.origin);if(!url)return null;
    try{const res=await fetch(url,{cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(15000)});if(!res.ok || !/^image\/(png|jpeg|webp)(?:;|$)/i.test(res.headers.get('content-type')||'') || Number(res.headers.get('content-length'))>10*1024*1024)return null;
      const blob=await res.blob();if(blob.size>10*1024*1024)return null;(item.imageCache ||= {})[slotId]=blob;return blob;
    }catch{return null;}
  }
  async function openStock(item) {
    currentStock=item;for(const url of stockUrls)URL.revokeObjectURL(url);stockUrls=[];
    $('#stock-title').textContent=item.state.article.title;$('#stock-meta').textContent=`${item.createdAt ? new Date(item.createdAt).toLocaleString('ja-JP') : ''} / ${item.kind || '記事'} / ${C.markdown(item.state.article,false).length.toLocaleString()}字`;
    const reader=$('#stock-reader');reader.replaceChildren();const article=item.state.article;
    const cover=await stockImage(item,'cover');if(cover){const url=URL.createObjectURL(cover);stockUrls.push(url);reader.append(imageNode(url,article.thumbnail.alt),button('サムネイルを保存',()=>download(cover,`${safeName(article.title)}_サムネイル.png`)));}
    reader.append(el('h1',article.title),el('p',article.lead,'lead'));
    for(const section of article.sections){reader.append(el('h2',section.heading));appendBody(reader,section.body);const image=await stockImage(item,section.id);if(image){const url=URL.createObjectURL(image);stockUrls.push(url);reader.append(imageNode(url,section.image?.alt || section.heading));}}
    if(article.sources?.length){reader.append(el('h2','出典'));for(const src of article.sources){const line=el('p',`${src.name} / 公開日: ${src.publishedAt || '未確認'} `),link=el('a',src.url);link.href=src.url;link.target='_blank';link.rel='noopener noreferrer';line.append(link);reader.append(line);}}
    if(article.cta.text)reader.append(el('p',article.cta.text));if(article.cta.url){const link=el('a',article.cta.url);link.href=article.cta.url;link.target='_blank';link.rel='noopener noreferrer';reader.append(link);}
    if(article.unknowns.length)reader.append(el('p',`未確認: ${article.unknowns.join(' / ')}`,'editor-note'));
    $('#stock-reader-status').textContent='記事を開いても、制作中の記事や学習設定は変わりません。';$('#stock-dialog').showModal();
  }
  async function exportStock(item) { const images={};for(const slot of C.imageSlots(item.state.article)){const blob=await stockImage(item,slot.id);if(blob)images[slot.id]=await dataURL(blob);}download(new Blob([JSON.stringify({schemaVersion:1,state:item.state,images},null,2)],{type:'application/json'}),`${safeName(item.state.article.title)}.json`); }
  async function editStock(item) {
    await historyReady;await checkpoint('ストックの記事を編集する前','article',true);const id=C.uid();
    for(const slot of C.imageSlots(item.state.article)){const blob=await stockImage(item,slot.id);if(blob)await A.put(`${id}:${slot.id}`,blob);}
    state=C.normalize(item.state);draftId=id;articleId=item.articleId || (item.origin==='library' ? item.id : '');assetVersions={};editMode=false;syncForm();store();$('#stock-dialog').close();notice('この記事の続きを編集できます。切り替え前の作業も変更履歴に残っています。');navigate('write');
  }
  async function renderLibrary() {
    const generation=++libraryRenderGeneration;await historyReady;await historyQueue;let loadError='';try{await loadRemoteStock();}catch(error){loadError=error.message;}
    const localHistory=await H.list();if(generation!==libraryRenderGeneration)return;
    const wrap=$('#library-list');wrap.replaceChildren();const query=$('#stock-search').value.trim().toLowerCase();
    const storage=$('#stock-storage').value; const items=H.stockItems(storage==='site' ? [] : localHistory,storage==='site' ? [] : library,storage==='local' ? [] : remoteStock).filter(item=>!hiddenStock.has(item.id) && !hiddenStock.has('title:' + item.state.article.title) && (!query || C.markdown(item.state.article,false).toLowerCase().includes(query)));
    const groups=new Map();for(const item of items){const key=item.state.article.title;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    $('#unhide-stock').hidden=!hiddenStock.size; $('#stock-status').textContent=`${groups.size}記事 / 本文${items.length}件。${loadError || '同じ内容の記録はまとめ、異なる本文は以前の版として残しています。'}`;
    if(!items.length){wrap.append(el('p','本文を制作するとここに残ります。記事を読んだり、続きを編集したりできます。'));return;}
    for(const versions of groups.values()){
      const item=versions[0],article=item.state.article,card=el('section',undefined,'library-item'),body=el('div',undefined,'library-body');
      const cover=await stockImage(item,'cover');if(generation!==libraryRenderGeneration)return;if(cover){const url=URL.createObjectURL(cover),img=imageNode(url,article.thumbnail.alt);img.onload=()=>URL.revokeObjectURL(url);card.append(img);}else card.append(el('div','記事ストック','image-placeholder cover'));
      body.append(el('h2',article.title),el('p',`${article.sections.length}章 / ${C.markdown(article,false).length.toLocaleString()}字 / 本文${versions.length}件`));
      function actionsFor(value){const actions=el('div',undefined,'inline');actions.append(button('記事を読む',attempt(()=>openStock(value)),'primary'),button('本文をコピー',()=>copy(C.markdown(value.state.article,false))),button('本文.txt',()=>download(new Blob([C.markdown(value.state.article,false)],{type:'text/plain;charset=utf-8'}),`${safeName(article.title)}.txt`)),button('続きを編集',attempt(()=>editStock(value))));return actions;}
      body.append(actionsFor(item));if(versions.length>1){const details=el('details');details.append(el('summary',`以前の本文を見る（${versions.length-1}件）`));for(const version of versions.slice(1)){const row=el('div',undefined,'stock-version');row.append(el('p',`${new Date(version.createdAt).toLocaleString('ja-JP')} / ${version.kind || '記事'}`),actionsFor(version));details.append(row);}body.append(details);}
      body.append(button('バックアップ',attempt(()=>exportStock(item))));
      const hide=button('一覧から外す',attempt(async()=>{hiddenStock.add('title:' + article.title);localStorage.setItem(stockHiddenKey,JSON.stringify([...hiddenStock]));await renderLibrary();}));body.append(hide);card.append(body);wrap.append(card);
    }
  }
  const safeName = value => value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 70) || 'note-article';
  function download(blob, name) { const u = URL.createObjectURL(blob), a = el('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 30000); }
  function dataURL(blob) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob); }); }
  async function exportEntry(entry) { const images = {}; for (const slot of C.imageSlots(entry.state.article)) { const b = await A.get(`${entry.id}:${slot.id}`); if (b) images[slot.id] = await dataURL(b); } download(new Blob([JSON.stringify({ schemaVersion: 1, state: entry.state, images }, null, 2)], { type: 'application/json' }), `${safeName(entry.state.article.title)}.json`); }
  async function importEntry(file) {
    if (file.size > 60 * 1024 * 1024) throw Error('バックアップは60MB以下にしてください。');
    const raw = JSON.parse(await file.text()), next = C.normalize(raw.state); if (!next.article) throw Error('記事が含まれていません。');
    const id = C.uid(), slots = C.imageSlots(next.article);
    for (const slot of slots) { const value = raw.images?.[slot.id]; if (!value) continue; if (typeof value !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) throw Error('画像データの形式が不正です。'); const response = await fetch(value), blob = await response.blob(); await validateImage(blob); await A.put(`${id}:${slot.id}`, blob); }
    library.unshift({ id, savedAt: new Date().toISOString(), state: next }); try { saveLibrary(); } catch { library.shift(); throw Error('バックアップを保存できませんでした。'); } notice('バックアップを新しい記事として取り込みました。'); navigate('library');
  }
  async function exportWorkspace() {
    await checkpoint('バックアップを書き出す前', 'article', true);
    const records = await H.list(), output = [];
    for (const record of records) { const images = {}; for (const [slot, blob] of Object.entries(record.images || {})) images[slot] = await dataURL(blob); output.push({ ...record, images }); }
    const blob = new Blob([JSON.stringify({ workspaceHistoryVersion: 1, exportedAt: new Date().toISOString(), records: output })], { type: 'application/json' });
    if (blob.size > 60 * 1024 * 1024) throw Error('履歴バックアップが60MBを超えています。画像付き記事は完成記事のバックアップもご利用ください。');
    download(blob, `terakoya-history-${new Date().toISOString().slice(0, 10)}.json`); notice('履歴と設定のバックアップを書き出しました。ダウンロードしたファイルを確認してください。');
  }
  async function importWorkspace(file) {
    if (file.size > 60 * 1024 * 1024) throw Error('バックアップは60MB以下にしてください。');
    const raw = JSON.parse(await file.text()); if (raw.workspaceHistoryVersion !== 1 || !Array.isArray(raw.records) || raw.records.length > 5000) throw Error('対応する履歴バックアップを選んでください。');
    const prepared = [];
    for (const old of raw.records) {
      const input = { state: C.normalize(old.state), rules: typeof old.rules === 'string' ? old.rules.slice(0, 10000) : '', preferences: H.preferences(old.preferences), images: {} };
      for (const [slot, value] of Object.entries(old.images || {})) { if (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) throw Error('画像データの形式が不正です。'); const blob = await (await fetch(value)).blob(); await validateImage(blob); input.images[slot] = blob; }
      const record = H.create(input, `バックアップから: ${String(old.kind || '記事').slice(0, 100)}`, old.scope === 'settings' ? 'settings' : 'article'); record.createdAt = Number.isNaN(Date.parse(old.createdAt)) ? record.createdAt : new Date(old.createdAt).toISOString(); if (old.request && typeof old.request.id === 'string') record.request = { id: old.request.id.slice(0, 200), type: String(old.request.type || '').slice(0, 100), prompt: typeof old.request.prompt === 'string' ? old.request.prompt.slice(0, 100000) : '' }; if (old.trashedAt) record.trashedAt = record.createdAt; prepared.push(record);
    }
    for (const record of prepared) await H.add(record);
    $('#history-search').value = ''; $('#history-filter').value = 'all'; notice(`${prepared.length}件を履歴へ追加しました。作業中の記事と現在の設定はそのままです。必要な内容を選んで復元してください。`); navigate('history');
  }
  function init() {
    try { preferences = H.preferences(JSON.parse(localStorage.getItem(PREFS) || '{}')); } catch { notice('設定の読み込みに失敗しました。元データは消していません。', true); }
    try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) { state = C.normalize(saved.state); articleId = typeof saved.articleId === 'string' ? saved.articleId : ''; draftId = typeof saved.draftId === 'string' ? saved.draftId : C.uid(); assetVersions = saved.assetVersions && typeof saved.assetVersions === 'object' ? saved.assetVersions : {}; } else state.settings = { ...preferences.defaults }; const list = JSON.parse(localStorage.getItem(LIB) || '[]'); if (Array.isArray(list)) library = list.filter(e => e?.state?.article).map(e => ({ ...e, id: String(e.id), savedAt: e.savedAt, state: C.normalize(e.state) })); if (!articleId && state.article) articleId = library.find(e => JSON.stringify(e.state) === JSON.stringify(state))?.id || ''; }
    catch { notice('保存データの一部を読み込めませんでした。元データは消していません。', true); }
    syncForm();
    try { $('#writing-rules').value = localStorage.getItem(RULES) || ''; } catch { notice('書き方の決まりを読み込めませんでした。', true); }
    historyReady = initializeHistory(); historyReady.catch(e => notice(e.message, true)); renderPreferences();
    $('#save-rules').onclick = attempt(() => savePreferences());
    $('#save-defaults').onclick = attempt(async () => { await historyReady; await checkpoint('初期設定を変更する前', 'settings', true); preferences.defaults = C.settingsOf(Object.fromEntries(new FormData($('#default-settings-form')))); preferences.updatedAt = new Date().toISOString(); localStorage.setItem(PREFS, JSON.stringify(preferences)); await checkpoint('新しい記事の初期設定を保存', 'settings', true); renderPreferences(); notice('新しい記事の初期設定を保存しました。次に新しく始める記事から使います。'); });
    $('#clear-rules').onclick = attempt(async () => { await historyReady; const id = await checkpoint('学習ルールをクリアする前', 'settings', true); localStorage.setItem(RULES, ''); preferences.notes = ''; preferences.updatedAt = new Date().toISOString(); localStorage.setItem(PREFS, JSON.stringify(preferences)); rememberUndo(id); renderPreferences(); await checkpoint('学習ルールをクリア', 'settings', true); notice('学習ルールと材料メモをクリアしました。元の内容は履歴から戻せます。'); });
    $('#reset-settings').onclick = attempt(async () => { await historyReady; const id = await checkpoint('設定を初期値に戻す前', 'settings', true); preferences = H.preferences(); localStorage.setItem(PREFS, JSON.stringify(preferences)); localStorage.setItem(RULES, ''); rememberUndo(id); renderPreferences(); await checkpoint('設定を初期値に戻した', 'settings', true); notice('設定を初期値に戻しました。元の設定は履歴から復元できます。'); });
    $('#clear-draft').onclick = $('#clear-draft-settings').onclick = $('#new-project').onclick = attempt(clearDraft);
    $('#undo-clear').hidden = !localStorage.getItem(UNDO); $('#undo-clear').onclick = attempt(async () => { const record = await H.get(localStorage.getItem(UNDO)); if (!record) throw Error('復元する履歴が見つかりません。過去の履歴を開いてください。'); await restoreHistory(record); localStorage.removeItem(UNDO); $('#undo-clear').hidden = true; });
    $('#refresh-history').onclick = attempt(renderHistory); $('#history-search').oninput = attempt(renderHistory); $('#history-filter').onchange = attempt(renderHistory);
    $('#settings-history').onclick = () => { $('#history-search').value = ''; $('#history-filter').value = 'settings'; navigate('history'); };
    $('#trash-history').onclick = attempt(async () => { await H.trash(visibleHistoryIds); notice('表示中の履歴を片付けました。「片付けた履歴」から戻せます。'); await renderHistory(); });
    $('#untrash-history').onclick = attempt(async () => { await H.trash(visibleHistoryIds, true); notice('履歴へ戻しました。'); await renderHistory(); });
    $('#export-workspace').onclick = attempt(exportWorkspace); $('#import-workspace').onchange = attempt(async () => { if ($('#import-workspace').files[0]) await importWorkspace($('#import-workspace').files[0]); $('#import-workspace').value = ''; });
    try { const savedJobs = JSON.parse(localStorage.getItem(JOBS) || '[]'); jobs = Array.isArray(savedJobs) ? savedJobs.filter(j => j && typeof j.id === 'string' && typeof j.type === 'string').slice(-20) : []; } catch { notice('制作結果の依頼履歴を読み込めませんでした。', true); }
    renderReturns(); $('#check-returns').onclick = attempt(() => checkReturns(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReturns().catch(e => notice(e.message, true)); });
    window.addEventListener('focus', () => checkReturns().catch(e => notice(e.message, true)));
    setInterval(() => checkReturns().catch(e => notice(e.message, true)), 15000);
    checkReturns().catch(e => notice(e.message, true));
    try { $('#theme').value = localStorage.getItem(THEME) || 'system'; } catch { /* Browsing without storage remains usable. */ }
    document.documentElement.dataset.theme = $('#theme').value;
    form.addEventListener('input', attempt(async () => { await historyReady; if (state.topics.length) await checkpoint('題材・案内を変更する前', 'article', true); state.brief = C.briefOf(Object.fromEntries(new FormData(form))); if (state.topics.length) { state.topics = []; state.selectedTopicId = ''; state.article = null; state.source = null; state.sources = []; state.entryRoute = ''; state.outlineApproved = false; draftId = C.uid(); notice('入力を変更しました。変更前の記事は履歴から復元できます。'); } modeUI(); store(); }));
    settingsForm.addEventListener('input', () => { state.outlineApproved = false; state.settings = C.settingsOf(Object.fromEntries(new FormData(settingsForm))); store(); });
    for (const b of document.querySelectorAll('[data-step]')) b.onclick = () => navigate(b.dataset.step);
    for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => navigate(b.dataset.go);
    for (const b of document.querySelectorAll('[data-ai]')) b.onclick = () => openAI(b.dataset.ai);
    $('#to-topics').onclick = attempt(() => { state.brief = C.briefOf(Object.fromEntries(new FormData(form))); C.ready(state.brief); store(); notice(''); navigate(state.brief.mode === 'lp' ? 'outline' : 'topics'); });
    $('#to-outline').onclick = () => navigate('outline');
    $('#to-write').onclick = attempt(() => { const topic = selected(); if (!topic || !topic.title.trim() || topic.outline.some(s => !s.heading.trim())) throw Error('記事タイトルと各章の見出しを入力してください。'); state.outlineApproved = true; store(); notice(''); navigate('write'); });
    $('#outline-title').oninput = attempt(async () => { const value = $('#outline-title').value; await invalidateArticle(); selected().title = value; store(); });
    $('#add-section').onclick = attempt(async () => { const t = selected(); if (t.outline.length >= 8) return; await invalidateArticle(); t.outline.push({ id: '', heading: '', purpose: '' }); reindex(); store(); renderOutline(); });
    $('#close-ai').onclick = () => $('#ai-dialog').close();
    $('#copy-prompt').onclick = () => copy($('#ai-prompt').value, $('#ai-status'));
    $('#open-chat').onclick = () => openPrefilledChat($('#ai-prompt').value);
    $('#repair-answer').onclick = attempt(repairAnswer); $('#review-answer').onclick = attempt(reviewAnswer); $('#apply-answer').onclick = attempt(applyAnswer);
    $('#ai-answer').oninput = () => { pending = null; $('#answer-review').hidden = true; };
    $('#copy-article').onclick = attempt(() => copy(C.markdown(state.article, false)));
    $('#view-preview').onclick = () => { editMode = false; $('#view-preview').setAttribute('aria-pressed', 'true'); $('#view-edit').setAttribute('aria-pressed', 'false'); renderArticle().catch(e => notice(e.message, true)); };
    $('#view-edit').onclick = () => { editMode = true; $('#view-preview').setAttribute('aria-pressed', 'false'); $('#view-edit').setAttribute('aria-pressed', 'true'); renderArticle().catch(e => notice(e.message, true)); };
    $('#save-article').onclick = attempt(saveArticle);
    $('#refresh-stock').onclick=attempt(async()=>{await loadRemoteStock(true);await renderLibrary();}); $('#stock-storage').onchange=attempt(renderLibrary); $('#unhide-stock').onclick=attempt(async()=>{hiddenStock.clear();localStorage.setItem(stockHiddenKey,'[]');await renderLibrary();}); $('#stock-search').oninput = attempt(renderLibrary); $('#close-stock').onclick = () => $('#stock-dialog').close(); $('#stock-copy').onclick = attempt(() => copy(C.markdown(currentStock.state.article,false),$('#stock-reader-status'))); $('#stock-text').onclick = () => download(new Blob([C.markdown(currentStock.state.article,false)],{type:'text/plain;charset=utf-8'}),`${safeName(currentStock.state.article.title)}.txt`); $('#stock-markdown').onclick = () => download(new Blob([C.markdown(currentStock.state.article)],{type:'text/markdown;charset=utf-8'}),`${safeName(currentStock.state.article.title)}.md`); $('#stock-edit').onclick = attempt(() => editStock(currentStock));
    $('#import-project').onchange = attempt(async () => { if ($('#import-project').files[0]) await importEntry($('#import-project').files[0]); $('#import-project').value = ''; });
    $('#theme-toggle').onclick = () => { $('#theme-panel').hidden = !$('#theme-panel').hidden; $('#theme-toggle').setAttribute('aria-expanded', String(!$('#theme-panel').hidden)); };
    $('#theme').onchange = () => { document.documentElement.dataset.theme = $('#theme').value; try { localStorage.setItem(THEME, $('#theme').value); } catch { notice('画面設定を保存できませんでした。', true); } };
    $('#sample').onclick = attempt(async () => { await historyReady; await checkpoint('記入例へ切り替える前', 'article', true); state = C.fresh(); state.settings = { ...preferences.defaults }; draftId = C.uid(); articleId = ''; Object.assign(state.brief, { idea: '忙しくても運動を続けたい人へ、自宅で始めるための小さな習慣を紹介したい', name: '自宅トレーニング相談', audience: '運動を始めたいが、仕事や家事で時間が取れない人', offer: '生活に合わせて続け方を相談するサービス', facts: '実績・価格・体験談はまだ入力していません。', ctaText: '自分に合う続け方を相談する' }); syncForm(); store(); notice('記入例を反映しました。実際のサービス情報に合わせて書き換えてください。'); });
    navigate('brief');
  }
  init();
})();
