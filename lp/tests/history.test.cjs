const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../core.js");

function projectWith(title) {
  const project = Core.blankProject();
  project.fields.title = title;
  project.fields.audience = "参加者";
  return project;
}

test("pushHistory appends a named entry with the newest first", () => {
  const list = Core.pushHistory([], projectWith("商品写真講座"));
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "商品写真講座");
  assert.ok(list[0].id.startsWith("h-"));
  assert.equal(list[0].project.fields.title, "商品写真講座");
});

test("pushHistory dedupes identical project content", () => {
  let list = Core.pushHistory([], projectWith("A"));
  list = Core.pushHistory(list, projectWith("B"));
  assert.equal(list.length, 2);
  list = Core.pushHistory(list, projectWith("A"));
  assert.equal(list.length, 2);
  assert.equal(list[0].name, "A");
});

test("pushHistory uses fallback name and caps the list", () => {
  let list = [];
  for (let i = 0; i < Core.HISTORY_LIMIT + 5; i++) {
    const project = Core.blankProject();
    project.fields.title = `案件${i}`;
    list = Core.pushHistory(list, project);
  }
  assert.equal(list.length, Core.HISTORY_LIMIT);
  assert.equal(list[0].name, `案件${Core.HISTORY_LIMIT + 4}`);
  const untitled = Core.pushHistory([], Core.blankProject());
  assert.equal(untitled[0].name, "無題の制作");
});

test("normalizeHistory drops invalid entries and keeps projects", () => {
  const raw = [
    { id: "h-1", name: "講座", updatedAt: "2026-09-25T00:00:00Z", project: projectWith("講座") },
    { id: "", name: "idなし", project: {} },
    { id: "h-2", name: "projectなし" },
    "garbage"
  ];
  const list = Core.normalizeHistory(raw);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "講座");
  assert.equal(list[0].project.fields.title, "講座");
  assert.equal(list[0].updatedAt, "2026-09-25T00:00:00.000Z");
});

test("history snapshots strip image data", () => {
  const project = projectWith("画像付き");
  project.heroImage = "data:image/webp;base64,xxxx";
  const list = Core.pushHistory([], project);
  assert.equal(list[0].project.heroImage, "");
});

test("historyIdFor is deterministic for identical content", () => {
  assert.equal(Core.historyIdFor(projectWith("同じ講座")), Core.historyIdFor(projectWith("同じ講座")));
  assert.notEqual(Core.historyIdFor(projectWith("同じ講座")), Core.historyIdFor(projectWith("別の講座")));
});

test("mergeHistory dedupes by id and keeps newest first", () => {
  const local = Core.normalizeHistory([
    { id: "h-1", name: "古い", updatedAt: "2026-09-20T00:00:00Z", project: projectWith("古い") },
    { id: "h-2", name: "ローカルだけ", updatedAt: "2026-09-25T00:00:00Z", project: projectWith("ローカル") }
  ]);
  const remote = Core.normalizeHistory([
    { id: "h-1", name: "古い", updatedAt: "2026-09-24T00:00:00Z", project: projectWith("古い") },
    { id: "h-9", name: "サイト側だけ", updatedAt: "2026-09-23T00:00:00Z", project: projectWith("サイト") }
  ]);
  const merged = Core.mergeHistory(local, remote);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, "h-2");
  assert.equal(merged[1].updatedAt, "2026-09-24T00:00:00.000Z");
  assert.equal(merged[2].id, "h-9");
});
