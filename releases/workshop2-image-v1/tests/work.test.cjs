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
  assert.equal(entries[0].format, "flyer");
  const sns = Work.parseManifest({ entries: [
    { id: "s", url: "completed-images/s/sns.png", medium: "sns" },
    { id: "q", url: "completed-images/q/square.png", medium: "sns", format: "square" }
  ] }, base);
  assert.equal(sns[0].format, "portrait");
  assert.equal(sns[1].format, "square");
  assert.equal(sns[1].medium, "sns");
});

test("generation brief separates flyer and SNS production", () => {
  const text = Work.prompt({ name: "講座", headline: "学ぶ", description: "詳しい説明", benefit1: "受け取れるもの", date: "10月3日", cta: "詳細を見る" }, { flyer: { description: true, benefits: true, details: true }, snsSupport: "none", designs: [{ layout: 8, bg: "#123456", accent: "#ff0088" }] }, "https://tool.example/");
  assert.match(text, /固定的な構成下見・Canvas画像を参照したり.*しない/);
  assert.match(text, /SNS投稿画像: スクロール中/);
  assert.match(text, /チラシ: 手元で読み進められる/);
  assert.match(text, /同じ構図のリサイズ・トリミング・文字削減だけで媒体違いにしない/);
  assert.match(text, /計4枚/);
  assert.match(text, /completed-images.json/);
  assert.match(text, /design\/SKILL.md/);
  assert.match(text, /design\/FLYER_SKILL.md/);
  assert.match(text, /design\/SNS_SKILL.md/);
  assert.match(text, /実際に取得して読み/);
  assert.match(text, /完成サイズと縮小表示/);
  assert.match(text, /汎用的な全幅ボタン/);
  assert.match(text, /#ff0088/);
  assert.match(text, /"direction": "クール"/);
  const payload = JSON.parse(text.slice(text.indexOf("制作データ:\n") + "制作データ:\n".length));
  assert.equal(payload.mediaBriefs.flyer.description, "詳しい説明");
  assert.equal(payload.mediaBriefs.flyer.details.date, "10月3日");
  assert.equal(payload.mediaBriefs.portrait.optionalSupport, "");
  assert.equal(payload.mediaBriefs.square.optionalSupport, "");
  assert.equal(payload.mediaBriefs.landscape.optionalSupport, "");
  assert.deepEqual(payload.outputs.map(item => item.id), ["flyer", "portrait", "square", "landscape"]);
  assert.equal(payload.outputs.find(item => item.id === "landscape").width, 1200);
  assert.equal(payload.outputs.find(item => item.id === "landscape").height, 630);
  assert.ok(!JSON.stringify(payload.mediaBriefs.portrait).includes("詳しい説明"));
  assert.ok(!JSON.stringify(payload.mediaBriefs.square).includes("詳しい説明"));
  assert.ok(!JSON.stringify(payload.mediaBriefs.landscape).includes("詳しい説明"));
  assert.match(text, /自動反映できなかった/);
  assert.match(text, /一体の完成画像として設計・生成/);
  assert.match(text, /一体の画像デザインとして制作し、固定Canvasや汎用フォントの後乗せを必須にしない/);
  assert.match(text, /日本語の見出し、URL、料金、日時、CTAを原文と照合/);
  assert.doesNotMatch(text, /テキスト描画で重ねて/);
  assert.doesNotMatch(text, /描かせっぱなしにしない/);
  assert.doesNotMatch(text, /まずビジュアル素材を生成し、次に日本語文字を正確に組む/);
});

test("unchecked formats and designs stay out of the generation brief", () => {
  const text = Work.prompt({ name: "講座", headline: "学ぶ", description: "詳しい説明", cta: "詳細を見る" }, {
    outputs: { flyer: true, portrait: true, square: false, landscape: false },
    designs: [{ include: true, layout: 0 }, { include: false, layout: 1 }, { include: false, layout: 2 }],
    flyer: { description: true },
    snsSupport: "none"
  }, "https://tool.example/");
  const payload = JSON.parse(text.slice(text.indexOf("制作データ:\n") + "制作データ:\n".length));
  assert.match(text, /計2枚/);
  assert.doesNotMatch(text, /1200x630/);
  assert.doesNotMatch(text, /1080x1080/);
  assert.deepEqual(payload.outputs.map(item => item.id), ["flyer", "portrait"]);
  assert.equal(payload.mediaBriefs.square, undefined);
  assert.equal(payload.mediaBriefs.landscape, undefined);
  assert.equal(payload.designDirections.length, 1);
});

test("revision brief targets one image and keeps the original", () => {
  const text = Work.prompt({ name: "講座" }, { designs: [] }, "https://tool.example/", { id: "old", url: "https://tool.example/old.png", medium: "sns", slot: 1 });
  assert.match(text, /1枚だけ/);
  assert.match(text, /1080x1350/);
  assert.match(text, /他の画像は作り直さない/);
  assert.match(text, /元画像を残し/);
});
