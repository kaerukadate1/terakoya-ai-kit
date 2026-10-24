const test = require("node:test");
const assert = require("node:assert/strict");
const State = require("../state.js");

test("settings migrate safely and keep three editable designs", () => {
  const defaults = State.normalize(null);
  assert.equal(defaults.designs.length, 3);
  assert.deepEqual(defaults.designs.map(item => item.layout), [0, 1, 2]);
  assert.ok(defaults.designs.every(item => item.include));
  assert.deepEqual(defaults.outputs, { flyer: true, portrait: false, square: false, landscape: false });
  const forced = State.normalize({
    outputs: { flyer: false, portrait: false, square: false, landscape: false },
    designs: [{ include: false }, { include: false }, { include: false }]
  });
  assert.equal(forced.outputs.flyer, true);
  assert.equal(forced.outputs.portrait, false);
  assert.equal(forced.designs[0].include, true);
  assert.equal(forced.designs[1].include, false);
  const changed = State.normalize({ flyer: { benefits: false }, snsSupport: "date", designs: [{ layout: 2, palette: "blue" }] });
  assert.equal(changed.flyer.benefits, false);
  assert.equal(changed.flyer.description, true);
  assert.equal(changed.snsSupport, "date");
  assert.equal(changed.designs[0].layout, 2);
  assert.equal(changed.designs[0].palette, "blue");
  assert.equal(State.normalize({ designs: [{ layout: 999, palette: "invalid" }] }).designs[0].layout, 0);
});

test("medium composition only hides selected flyer content", () => {
  const raw = { description: "概要", benefit1: "効果", date: "10月", price: "1000円", url: "https://example.com", headline: "見出し" };
  const settings = State.normalize({ flyer: { benefits: false, details: false, url: false }, snsSupport: "date" });
  const flyer = State.displayData(raw, "flyer", settings);
  assert.equal(flyer.description, "概要");
  assert.equal(flyer.benefit1, "");
  assert.equal(flyer.date, "");
  assert.equal(flyer.url, "");
  assert.equal(State.displayData(raw, "sns", settings).date, "10月");
  assert.equal(State.snsSupport(raw, settings), "10月");
  assert.equal(raw.date, "10月", "original input is not changed");
});

test("nine layouts and independent custom colors survive normalization", () => {
  assert.equal(State.LAYOUTS.length, 9);
  assert.deepEqual(State.LAYOUTS, ["洗練", "ナチュラル", "インパクト", "親しみ", "信頼感", "華やか", "シンプル", "上品", "クール"]);
  const value = State.normalize({ designs: [{ layout: 8, palette: "gold", bg: "#123456", accent: "#Ff0088" }] });
  assert.equal(value.designs[0].layout, 8);
  assert.equal(value.designs[0].bg, "#123456");
  assert.equal(value.designs[0].accent, "#ff0088");
  assert.equal(State.palette(value.designs[0]).ink, "#ffffff");
  assert.equal(State.normalize({ designs: [{ bg: "red", accent: "javascript:1" }] }).designs[0].bg, State.PALETTES.coral.bg);
});

test("ten palette presets stay selectable while keeping one-medium defaults", () => {
  const keys = ["coral", "gold", "green", "blue", "lavender", "rose", "citrus", "sky", "charcoal", "terracotta"];
  assert.deepEqual(Object.keys(State.PALETTES), keys);
  const lavender = State.normalize({ designs: [{ palette: "lavender", include: true }] });
  assert.equal(lavender.designs[0].palette, "lavender");
  assert.equal(lavender.designs[0].bg, State.PALETTES.lavender.bg);
  assert.equal(lavender.designs[0].accent, State.PALETTES.lavender.accent);
  assert.equal(lavender.designs[0].include, true);
  assert.deepEqual(lavender.outputs, { flyer: true, portrait: false, square: false, landscape: false });
  assert.equal(State.palette({ palette: "charcoal" }).bg, "#25282c");
  assert.equal(State.palette({ palette: "charcoal" }).ink, "#ffffff");
});
