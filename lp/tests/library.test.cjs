const { test } = require("node:test");
const assert = require("node:assert/strict");
const Library = require("../library.js");
const Core = require("../core.js");

const base = "https://example.chatgpt.site/";

test("completed LP entries resolve private site paths and reject unsafe links", () => {
  const entry = Library.normalizeEntry({ title: "講座LP", design: "信頼感", url: "completed/a/index.html", thumbnail: "completed/a/thumbnail.webp", createdAt: "2026-09-25T01:00:00Z" }, base);
  assert.equal(entry.url, `${base}completed/a/index.html`);
  assert.equal(entry.thumbnail, `${base}completed/a/thumbnail.webp`);
  assert.equal(Library.normalizeEntry({ url: "javascript:alert(1)" }, base), null);
  assert.equal(Library.normalizeEntry({ url: "http://example.com/" }, base), null);
});

test("completed LP list merges without duplicate links", () => {
  const settings = Core.snapshotForLibrary({ fields: { title: "保存した設定" } });
  const local = [{ title: "旧", url: "completed/a/index.html", projectSettings: settings }];
  const remote = { entries: [{ title: "更新", url: "completed/a/index.html" }, { title: "追加", url: "completed/b/index.html" }] };
  const merged = Library.mergeLists(local, remote, base);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((entry) => entry.url.endsWith("/a/index.html")).title, "更新");
  assert.equal(merged.find((entry) => entry.url.endsWith("/a/index.html")).projectSettings.fields.title, "保存した設定");
});

test("Work request includes private library only for a private Sites URL", () => {
  const project = Core.blankProject();
  const privatePrompt = Core.buildWorkPrompt(project, base);
  assert.match(privatePrompt, /completed-lps\.json/);
  assert.match(privatePrompt, /本人限定/);
  const localPrompt = Core.buildWorkPrompt(project, "http://127.0.0.1:8811/");
  assert.match(localPrompt, /自動書き込みはできません/);
  assert.doesNotMatch(localPrompt, /"toolUrl":/);
});
