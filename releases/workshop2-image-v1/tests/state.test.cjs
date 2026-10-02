const test = require("node:test");
const assert = require("node:assert/strict");
const State = require("../state.js");

test("settings migrate safely and keep three editable designs", () => {
  const defaults = State.normalize(null);
  assert.equal(defaults.designs.length, 3);
  assert.deepEqual(defaults.designs.map(item => item.layout), [0, 1, 2]);
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
