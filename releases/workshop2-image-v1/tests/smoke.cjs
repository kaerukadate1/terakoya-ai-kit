const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const productName = "寺子屋AI チラシ・SNS告知画像制作ツール";
for (const file of ["index.html", "STARTER_PROMPT.txt", "BUILD_PROMPT.md", "README.md", "design/SKILL.md"]) {
  assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes(productName), `${file} must use the product name`);
}
assert.match(fs.readFileSync(path.join(root, "STARTER_PROMPT.txt"), "utf8"), /releases\/workshop2-image-v1\/BUILD_PROMPT\.md/);
const fields = Object.fromEntries(
  ["name", "audience", "headline", "description", "benefit1", "benefit2", "benefit3", "date", "place", "price", "cta", "url"]
    .map(key => [key, { value: "" }])
);
const listeners = {};
const form = {
  elements: fields,
  addEventListener(type, fn) { listeners[`form:${type}`] = fn; },
  reportValidity() { return ["name", "headline", "cta"].every(key => fields[key].value.trim()); },
  reset() { for (const field of Object.values(fields)) field.value = ""; }
};
const drawCalls = [];
const downloads = [];
function canvas(width, height, dataset = {}) {
  const item = {
    width, height, dataset,
    getContext() {
      return {
        canvas: item,
        font: "",
        save() {}, restore() {}, setTransform() {}, clearRect() {}, beginPath() {}, rect() {}, clip() {},
        fillRect(x, y, w, h) { assert.ok([x, y, w, h].every(Number.isFinite)); },
        fillText(text) { drawCalls.push(String(text)); },
        measureText(text) { return { width: String(text).length * (Number(this.font.match(/(\d+)px/)?.[1]) || 30) * 0.62 }; }
      };
    },
    toBlob(callback) { downloads.push([item.width, item.height]); callback({ size: 1 }); }
  };
  return item;
}
const previews = Array.from({ length: 3 }, (_, concept) => [
  canvas(420, 594, { concept: String(concept), medium: "flyer" }),
  canvas(420, 525, { concept: String(concept), medium: "sns" })
]).flat();
const designs = {
  innerHTML: "",
  querySelectorAll() { return previews; },
  addEventListener(type, fn) { listeners[`designs:${type}`] = fn; }
};
const nodes = {
  "#brief-form": form,
  "#designs": designs,
  "#photo": { files: [], value: "", addEventListener(type, fn) { listeners[`photo:${type}`] = fn; } },
  "#photo-name": { textContent: "" },
  "#clear-photo": { hidden: true, addEventListener(type, fn) { listeners[`clear:${type}`] = fn; } },
  "#export-status": { textContent: "" },
  "#save-status": { textContent: "" },
  "#load-sample": { addEventListener(type, fn) { listeners[`sample:${type}`] = fn; } },
  "#reset": { addEventListener(type, fn) { listeners[`reset:${type}`] = fn; } }
};
const document = {
  querySelector(selector) { assert.ok(nodes[selector], selector); return nodes[selector]; },
  createElement(tag) {
    if (tag === "canvas") return canvas(0, 0);
    if (tag === "a") return { click() {}, href: "", download: "" };
    throw new Error(tag);
  }
};
const storage = new Map();
const sandbox = {
  document,
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  FormData: class { constructor() {} entries() { return Object.entries(fields).map(([key, node]) => [key, node.value]); } },
  URL: { createObjectURL: () => "blob:smoke", revokeObjectURL() {} },
  setTimeout: fn => { fn(); return 1; },
  clearTimeout() {},
  confirm: () => true,
  Image: class {}
};
vm.runInNewContext(fs.readFileSync(path.join(root, "app.js"), "utf8"), sandbox);
assert.equal(previews.length, 6);
assert.ok(drawCalls.length > 0);
assert.match(designs.innerHTML, /チラシ A4/);
assert.match(designs.innerHTML, /SNS投稿 4:5/);
const click = (concept, medium) => listeners["designs:click"]({ target: { closest: () => ({ dataset: { concept: String(concept), medium } }) } });
click(0, "flyer");
assert.equal(downloads.length, 0, "incomplete form must not export");

fields.name.value = "講座";
fields.headline.value = "自分のサービスを伝える";
fields.cta.value = "詳細を見る";
listeners["form:input"]();
for (let concept = 0; concept < 3; concept++) {
  click(concept, "flyer");
  click(concept, "sns");
}
assert.equal(downloads.length, 6);
assert.deepEqual(downloads.filter(([w, h]) => w === 2480 && h === 3508).length, 3);
assert.deepEqual(downloads.filter(([w, h]) => w === 1080 && h === 1350).length, 3);
console.log("Smoke test passed: 3 designs, 6 previews, 6 PNG exports.");
