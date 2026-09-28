(() => {
  'use strict';
  const KEY = 'terakoya-mytools-v4';
  const defaults = { siteName: '', theme: 'light', primaryColor: '#0c3452', secondaryColor: '#b38a43', logo: '', profile: {}, tools: [] };
  const profileFields = { businessName: '事業名', businessDescription: '事業・サービス内容', displayName: '名前・呼び名', strengths: '強み', pricing: '料金・提供形式', serviceArea: '活動範囲', links: 'リンク', tone: '希望する文体', avoid: '避けたい表現' };
  const $ = (selector) => document.querySelector(selector);
  const setStatus = (message) => { $('#save-state').textContent = message; };
  const isHttpUrl = (value) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
  const isHttpsUrl = (value) => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
  const text = (value) => String(value ?? '').trim();
  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { ...defaults, ...saved, profile: saved.profile && typeof saved.profile === 'object' ? saved.profile : {}, tools: Array.isArray(saved.tools) ? saved.tools : [] };
    } catch { return structuredClone(defaults); }
  }
  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); setStatus('保存しました'); return true; }
    catch { setStatus('保存できませんでした。容量またはブラウザ設定を確認してください'); return false; }
  }
  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function applyTheme() {
    const dark = state.theme === 'dark' || (state.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.setProperty('--primary', state.primaryColor);
    document.documentElement.style.setProperty('--secondary', state.secondaryColor);
    const brandImage = $('.brand img');
    brandImage.src = state.logo || 'assets/terakoya-logo.jpg';
  }
  function renderHeader() {
    $('#site-heading').textContent = state.siteName || (state.profile.businessName ? `${state.profile.businessName} マイツール` : 'マイツール');
    $('#business-intro').textContent = state.profile.businessDescription || '事業プロフィールを登録すると、ここに紹介文が表示されます。';
  }
  function showView(name) {
    document.querySelectorAll('.view').forEach(node => { node.hidden = node.id !== `view-${name}`; });
    document.querySelectorAll('.nav-button').forEach(node => { node.classList.toggle('active', node.dataset.view === name); });
    $('#page-crumb').textContent = ({ tools: 'マイツール', profile: '事業プロフィール', settings: '設定' })[name];
    setStatus('');
  }
  function renderProfile() {
    const form = $('#profile-form');
    for (const name of Object.keys(profileFields)) form.elements[name].value = state.profile[name] || '';
  }
  function profileText() {
    return Object.entries(profileFields).filter(([name]) => text(state.profile[name])).map(([name, label]) => `${label}: ${text(state.profile[name])}`).join('\n');
  }
  async function copyProfile() {
    const content = profileText();
    if (!content) { showView('profile'); setStatus('先に事業プロフィールを入力してください'); return; }
    try { await navigator.clipboard.writeText(content); setStatus('コピーしました'); }
    catch { $('#copy-text').value = content; $('#copy-dialog').showModal(); }
  }
  function renderSettings() {
    const form = $('#settings-form');
    form.elements.siteName.value = state.siteName;
    form.elements.theme.value = state.theme;
    form.elements.primaryColor.value = state.primaryColor;
    form.elements.secondaryColor.value = state.secondaryColor;
  }
  function toolButton(label, title, action) {
    const node = el('button', '', label);
    node.type = 'button'; node.title = title; node.addEventListener('click', action);
    return node;
  }
  function renderTools() {
    const root = $('#tool-list'); root.replaceChildren();
    $('#tool-empty').hidden = state.tools.length > 0;
    state.tools.forEach((tool, index) => {
      const card = el('article', 'tool-card');
      const top = el('div', 'tool-card-top');
      if (tool.icon) { const icon = el('img', 'tool-icon'); icon.src = tool.icon; icon.alt = ''; top.append(icon); }
      else top.append(el('span', 'tool-icon', Array.from(tool.name || '道')[0]));
      top.append(el('h3', '', tool.name)); card.append(top);
      card.append(el('p', '', tool.description || '説明はまだありません。'));
      const actions = el('div', 'card-actions');
      const open = el('a', '', '開く'); open.href = tool.url; open.target = '_blank'; open.rel = 'noopener noreferrer'; actions.append(open);
      actions.append(toolButton('編集', '登録情報を編集', () => openTool(index)));
      actions.append(toolButton('↑', '前へ移動', () => moveTool(index, -1)));
      actions.append(toolButton('↓', '後ろへ移動', () => moveTool(index, 1)));
      actions.append(toolButton('×', '一覧から外す', () => removeTool(index)));
      if (tool.guideUrl) { const guide = el('a', '', '使い方'); guide.href = tool.guideUrl; guide.target = '_blank'; guide.rel = 'noopener noreferrer'; actions.append(guide); }
      card.append(actions); root.append(card);
    });
  }
  function moveTool(index, delta) {
    const next = index + delta; if (next < 0 || next >= state.tools.length) return;
    [state.tools[index], state.tools[next]] = [state.tools[next], state.tools[index]];
    if (saveState()) renderTools();
  }
  function removeTool(index) {
    if (!confirm('一覧から外すだけで、元のAIツール自体は削除されません。外しますか？')) return;
    state.tools.splice(index, 1); if (saveState()) renderTools();
  }
  function openTool(index = -1) {
    const form = $('#tool-form'); form.reset(); $('#tool-error').textContent = '';
    const tool = state.tools[index];
    $('#tool-dialog-title').textContent = tool ? 'ツールを編集' : 'ツールを追加';
    for (const name of ['id', 'url', 'name', 'description', 'memo', 'guideUrl']) form.elements[name].value = tool?.[name] || '';
    $('#tool-dialog').showModal();
  }
  async function readImage(file) {
    if (!file) return '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('PNG・JPEG・WebPを選んでください');
    if (file.size > 700000) throw Error('画像は700KB以下にしてください');
    return await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(Error('画像を読み込めませんでした')); reader.readAsDataURL(file);
    });
  }
  function validTool(values, originalId) {
    if (!isHttpUrl(values.url)) return 'ツールURLは http または https で入力してください';
    if (values.guideUrl && !isHttpUrl(values.guideUrl)) return '説明ページURLは http または https で入力してください';
    if (state.tools.some(tool => tool.url === values.url && tool.id !== originalId)) return '同じURLのツールが既にあります';
    return '';
  }
  async function saveTool(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const id = form.elements.id.value;
    const values = Object.fromEntries(['url', 'name', 'description', 'memo', 'guideUrl'].map(name => [name, text(form.elements[name].value)]));
    const error = validTool(values, id);
    if (error) { $('#tool-error').textContent = error; return; }
    try {
      const old = state.tools.find(tool => tool.id === id);
      const icon = form.elements.icon.files[0] ? await readImage(form.elements.icon.files[0]) : (old?.icon || '');
      const tool = { id: id || crypto.randomUUID(), ...values, icon };
      const index = state.tools.findIndex(item => item.id === id);
      if (index < 0) state.tools.push(tool); else state.tools[index] = tool;
      if (!saveState()) { if (index < 0) state.tools.pop(); else state.tools[index] = old; return; }
      $('#tool-dialog').close(); renderTools();
    } catch (cause) { $('#tool-error').textContent = cause.message; }
  }
  function buildNotice(item) {
    const wrap = el('article', 'notice');
    wrap.append(el('strong', '', item.title), el('p', '', item.body));
    const link = el('a', '', '詳しく見る'); link.href = item.detailUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; wrap.append(link);
    if (item.snsUrl) { wrap.append(document.createTextNode('  ')); const sns = el('a', '', 'SNSを見る'); sns.href = item.snsUrl; sns.target = '_blank'; sns.rel = 'noopener noreferrer'; wrap.append(sns); }
    return wrap;
  }
  function selectNotices(payload, now = Date.now()) {
    if (payload?.schemaVersion !== 1 || !Array.isArray(payload.announcements)) return [];
    return payload.announcements.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.body === 'string' && item.isDemo === false && Number.isFinite(item.priority) && isHttpsUrl(item.detailUrl) && (!item.snsUrl || isHttpsUrl(item.snsUrl)) && Number.isFinite(Date.parse(item.startsAt)) && Number.isFinite(Date.parse(item.endsAt)) && Date.parse(item.startsAt) <= now && now < Date.parse(item.endsAt)).sort((a, b) => b.priority - a.priority || Date.parse(b.startsAt) - Date.parse(a.startsAt)).slice(0, 3);
  }
  function renderNotices(items, stale = false) {
    const side = $('#announcements'); const mobile = $('#announcements-mobile');
    side.replaceChildren(); mobile.replaceChildren(); side.hidden = items.length === 0;
    if (!items.length) return;
    side.append(el('h2', '', '寺子屋AIからのお知らせ'));
    mobile.append(el('h2', '', '寺子屋AIからのお知らせ'));
    items.forEach(item => { side.append(buildNotice(item)); mobile.append(buildNotice(item)); });
    if (stale) { side.append(el('p', 'notice-status', '更新を確認できませんでした')); mobile.append(el('p', 'notice-status', '更新を確認できませんでした')); }
  }
  let lastNotices = [];
  async function refreshNotices() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/kaerukadate1/terakoya-ai-kit/main/announcements.json', { cache: 'no-store' });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const payload = await response.json();
      lastNotices = selectNotices(payload); renderNotices(lastNotices);
    } catch { lastNotices = selectNotices({ schemaVersion: 1, announcements: lastNotices }); renderNotices(lastNotices, true); }
  }

  document.querySelectorAll('[data-view]').forEach(node => node.addEventListener('click', () => showView(node.dataset.view)));
  document.querySelectorAll('[data-jump]').forEach(node => node.addEventListener('click', () => showView(node.dataset.jump)));
  $('#profile-form').addEventListener('submit', event => {
    event.preventDefault();
    const old = state.profile; state.profile = Object.fromEntries(Object.keys(profileFields).map(name => [name, text(event.currentTarget.elements[name].value)]));
    if (!saveState()) state.profile = old; else renderHeader();
  });
  $('#settings-form').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget; const old = { ...state };
    state.siteName = text(form.elements.siteName.value); state.theme = form.elements.theme.value;
    state.primaryColor = form.elements.primaryColor.value; state.secondaryColor = form.elements.secondaryColor.value;
    if (!saveState()) state = old; else { applyTheme(); renderHeader(); }
  });
  $('#reset-design').addEventListener('click', () => { state.theme = 'light'; state.primaryColor = defaults.primaryColor; state.secondaryColor = defaults.secondaryColor; if (saveState()) { applyTheme(); renderSettings(); } });
  $('#logo-file').addEventListener('change', async event => { try { const logo = await readImage(event.target.files[0]); if (!logo) return; const old = state.logo; state.logo = logo; if (!saveState()) state.logo = old; applyTheme(); } catch (cause) { setStatus(cause.message); } });
  $('#remove-logo').addEventListener('click', () => { state.logo = ''; if (saveState()) applyTheme(); });
  for (const selector of ['#copy-profile', '#profile-copy-again']) $(selector).addEventListener('click', copyProfile);
  for (const selector of ['#add-tool', '#empty-add-tool']) $(selector).addEventListener('click', () => openTool());
  $('#tool-form').addEventListener('submit', saveTool);
  for (const selector of ['#close-tool', '#cancel-tool']) $(selector).addEventListener('click', () => $('#tool-dialog').close());
  $('#close-copy').addEventListener('click', () => $('#copy-dialog').close());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  window.addEventListener('focus', refreshNotices);
  setInterval(refreshNotices, 60000);
  applyTheme(); renderHeader(); renderProfile(); renderSettings(); renderTools(); refreshNotices();
  window.TerakoyaMytools = { selectNotices, validTool };
})();
