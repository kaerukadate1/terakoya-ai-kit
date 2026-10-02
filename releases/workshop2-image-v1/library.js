(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ImageLibrary = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  function open() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") { reject(new Error("このブラウザでは画像一覧を保存できません")); return; }
      const request = indexedDB.open("terakoya-workshop2-images", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("images", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("画像一覧を開けませんでした"));
      request.onblocked = () => reject(new Error("別のタブを閉じてから、もう一度お試しください"));
    });
  }
  async function request(mode, method, value) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let result;
      const transaction = db.transaction("images", mode);
      const operation = transaction.objectStore("images")[method](value);
      operation.onsuccess = () => { result = operation.result; };
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onerror = () => { db.close(); reject(transaction.error || new Error("画像一覧を保存できませんでした")); };
      transaction.onabort = () => { db.close(); reject(transaction.error || new Error("画像一覧を保存できませんでした")); };
    });
  }
  function save(entry) { return request("readwrite", "put", entry); }
  async function list() { return (await request("readonly", "getAll")).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  function get(id) { return request("readonly", "get", id); }
  return { save, list, get };
});
