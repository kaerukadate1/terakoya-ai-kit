(function (root, factory) {
  const api = factory(root.NoteCore || (typeof require === 'function' ? require('./core.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NoteHistory = api;
})(globalThis, function (C) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  function preferences(raw = {}) {
    return { enabled: raw.enabled !== false, notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 6000) : '', defaults: C.settingsOf(raw.defaults), updatedAt: raw.updatedAt || '', source: raw.source || '手入力' };
  }
  function effectiveRules(rules, prefs) { return prefs.enabled === false ? '' : rules || ''; }
  function learningContext(input) { return JSON.stringify({ rules: input.rules || '', notes: input.preferences?.notes || '', enabled: input.preferences?.enabled !== false }); }
  function fingerprint(input) { return JSON.stringify({ state: input.state, rules: input.rules || '', preferences: input.preferences, articleId: input.articleId || '' }); }
  function create(input, kind, scope = 'article') {
    return { id: C.uid(), createdAt: new Date().toISOString(), kind, scope, title: input.state.article?.title || input.state.brief.idea || input.state.brief.name || '題材未入力の記事', state: copy(input.state), preferences: copy(input.preferences || {}), rules: input.rules || '', articleId: input.articleId || '', sourceDraftId: input.draftId || '', images: { ...input.images }, trashedAt: null };
  }
  function saveEntry(entries, next) {
    const old = entries.find(e => e.id === next.id);
    return [{ ...next, savedAt: old?.savedAt || next.savedAt, updatedAt: next.savedAt, version: (old?.version || 0) + 1 }, ...entries.filter(e => e.id !== next.id)];
  }
  function stockItems(records, library, remote = []) {
    const values = [...library.map(e => ({...e, createdAt:e.updatedAt || e.savedAt, sourceDraftId:e.id, kind:'保存した記事', origin:'library'})), ...remote, ...records.filter(r => r.scope === 'article' && !r.trashedAt).map(r=>({...r, origin:'history'}))];
    values.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    const seen = new Set(); return values.map(item => { try { return {...item,state:C.normalize(item.state)}; } catch { return item; } }).filter(item => {
      if (!item.state?.article) return false;
      const key=JSON.stringify({article:item.state.article,settings:item.state.settings});if(seen.has(key))return false;seen.add(key);return true;
    });
  }
  function stockImageUrl(value, slotId, origin) {
    if (typeof value !== 'string' || !/^(cover|s[1-8])$/.test(slotId)) return '';
    try { const u = new URL(value, origin);
      return u.origin === new URL(origin).origin && !u.username && !u.password && !u.search && !u.hash && /^\/(?:completed-articles\/[a-zA-Z0-9-]{10,100}\/(?:cover|s[1-8])\.png|returns\/[a-zA-Z0-9-]{10,100}\/image\.png)$/.test(u.pathname) ? u.href : '';
    } catch { return ''; }
  }
  let connection;
  function db() {
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('terakoya-note-history-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('records', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { connection = null; reject(Error('履歴の保存領域を開けません。ブラウザーの保存設定を確認してください。')); };
    });
    return connection;
  }
  async function transact(mode, run) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('records', mode), store = tx.objectStore('records');
      let result; run(store, value => { result = value; });
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(Error('履歴を保存できませんでした。容量・ブラウザー設定を確認してください。元の履歴は残っています。'));
    });
  }
  const add = record => transact('readwrite', store => store.add(record));
  const get = id => transact('readonly', (store, done) => { const r = store.get(id); r.onsuccess = () => done(r.result || null); });
  const list = () => transact('readonly', (store, done) => { const r = store.getAll(); r.onsuccess = () => done(r.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); });
  async function trash(ids, restore = false) {
    await transact('readwrite', store => {
      for (const id of ids) { const request = store.get(id); request.onsuccess = () => { if (request.result) store.put({ ...request.result, trashedAt: restore ? null : new Date().toISOString() }); }; }
    });
  }
  return { preferences, effectiveRules, learningContext, fingerprint, create, saveEntry, stockItems, stockImageUrl, add, get, list, trash };
});
