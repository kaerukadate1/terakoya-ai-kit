const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../library.js"), "utf8");

test("completed images can be saved and read back from browser storage", async () => {
  const records = new Map();
  const db = {
    createObjectStore() {}, close() {},
    transaction() {
      const transaction = { error: null };
      transaction.objectStore = () => ({
        put(entry) { return operation(() => { records.set(entry.id, entry); return entry.id; }); },
        getAll() { return operation(() => [...records.values()]); },
        get(id) { return operation(() => records.get(id)); }
      });
      function operation(run) {
        const request = {};
        queueMicrotask(() => { request.result = run(); request.onsuccess(); transaction.oncomplete(); });
        return request;
      }
      return transaction;
    }
  };
  const sandbox = { indexedDB: { open() {
    const request = { result: db };
    queueMicrotask(() => { request.onupgradeneeded(); request.onsuccess(); });
    return request;
  } } };
  vm.runInNewContext(source, sandbox);
  const library = sandbox.ImageLibrary;
  const image = { id: "one", name: "講座", createdAt: "2026-10-01T00:00:00Z", imageBlob: { size: 10 } };
  await library.save(image);
  assert.equal((await library.get("one")).name, "講座");
  assert.equal((await library.list()).length, 1);
  await library.save({ ...image, id: "two", createdAt: "2026-10-02T00:00:00Z" });
  assert.equal((await library.list())[0].id, "two");
});

test("unavailable browser storage reports a clear error", async () => {
  const sandbox = {};
  vm.runInNewContext(source, sandbox);
  await assert.rejects(sandbox.ImageLibrary.list(), /保存できません/);
});
