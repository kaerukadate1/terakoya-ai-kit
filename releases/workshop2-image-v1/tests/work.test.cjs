const test = require("node:test");
const assert = require("node:assert/strict");
const Work = require("../work.js");

test("same-site manifest accepts only hosted image paths", () => {
  const base = "https://tool.example/";
  const entries = Work.parseManifest({ entries: [
    { id: "a", name: "講座", url: "completed-images/a/flyer.png", medium: "flyer", slot: 1 },
    { id: "b", url: "https://evil.example/a.png" },
    { id: "c", url: "javascript:alert(1)" },
    { id: "d", url: "completed-images/d/not-image.html" }
  ] }, base);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].url, "https://tool.example/completed-images/a/flyer.png");
  assert.equal(entries[0].medium, "flyer");
});

test("generation brief distinguishes previews and finished images", () => {
  const text = Work.prompt({ name: "講座", headline: "学ぶ", cta: "詳細を見る" }, { designs: [{ layout: 8, bg: "#123456", accent: "#ff0088" }] }, "https://tool.example/");
  assert.match(text, /構成下見/);
  assert.match(text, /実際の画像を生成/);
  assert.match(text, /completed-images.json/);
  assert.match(text, /design\/SKILL.md/);
  assert.match(text, /実際に取得して読み/);
  assert.match(text, /完成サイズと縮小表示/);
  assert.match(text, /汎用的な全幅ボタン/);
  assert.match(text, /#ff0088/);
  assert.match(text, /"direction": "クール"/);
  assert.match(text, /自動反映できなかった/);
});

test("revision brief targets one image and keeps the original", () => {
  const text = Work.prompt({ name: "講座" }, { designs: [] }, "https://tool.example/", { id: "old", url: "https://tool.example/old.png", medium: "sns", slot: 1 });
  assert.match(text, /1枚だけ/);
  assert.match(text, /他の5枚は作り直さない/);
  assert.match(text, /元画像を残し/);
});
