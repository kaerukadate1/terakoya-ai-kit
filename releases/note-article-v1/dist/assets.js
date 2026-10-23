(function (root) {
  'use strict';
  let connection;
  async function db() {
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('terakoya-note-assets-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { connection = null; reject(Error('画像の保存領域を開けませんでした。')); };
    });
    return connection;
  }
  async function get(key) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const r = database.transaction('images').objectStore('images').get(key);
      r.onsuccess = () => resolve(r.result || null); r.onerror = () => reject(r.error);
    });
  }
  async function put(key, blob) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const t = database.transaction('images', 'readwrite');
      t.objectStore('images').put(blob, key); t.oncomplete = resolve;
      t.onerror = t.onabort = () => reject(Error('画像を保存できませんでした。空き容量・ブラウザ設定を確認してください。'));
    });
  }
  async function remove(key) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const t = database.transaction('images', 'readwrite'); t.objectStore('images').delete(key);
      t.oncomplete = resolve; t.onerror = t.onabort = () => reject(t.error);
    });
  }
  async function clone(from, to, slots) {
    for (const slot of slots) { const blob = await get(`${from}:${slot.id}`); if (blob) await put(`${to}:${slot.id}`, blob); }
  }
  root.NoteAssets = { get, put, remove, clone };
})(globalThis);
