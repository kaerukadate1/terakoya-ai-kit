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
const opened = [];
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
const checkboxNodes = Object.fromEntries(["description", "benefits", "details", "url"].map(key => [key, { checked: true }]));
const libraryCards = { flyer: [], sns: [] };
const saved = [];
const nodes = {
  "#brief-form": form,
  "#design-settings": { innerHTML: "", addEventListener(type, fn) { listeners[`design-settings:${type}`] = fn; } },
  ".structure-list": { querySelector(selector) { return checkboxNodes[selector.match(/name="(\w+)"/)[1]]; }, addEventListener(type, fn) { listeners[`structure:${type}`] = fn; } },
  "#sns-support": { value: "none", addEventListener(type, fn) { listeners[`sns-support:${type}`] = fn; } },
  "#library-flyer": { replaceChildren() { libraryCards.flyer.length = 0; }, append(card) { libraryCards.flyer.push(card); } },
  "#library-sns": { replaceChildren() { libraryCards.sns.length = 0; }, append(card) { libraryCards.sns.push(card); } },
  "#library-status": { textContent: "" },
  "#refresh-library": { addEventListener(type, fn) { listeners[`refresh-library:${type}`] = fn; } },
  "#restore-hidden": { addEventListener(type, fn) { listeners[`restore-hidden:${type}`] = fn; } },
  "#photo": { files: [], value: "", addEventListener(type, fn) { listeners[`photo:${type}`] = fn; } },
  "#photo-name": { textContent: "" },
  "#clear-photo": { hidden: true, addEventListener(type, fn) { listeners[`clear:${type}`] = fn; } },
  "#save-status": { textContent: "" },
  "#consult": { addEventListener(type, fn) { listeners[`consult:${type}`] = fn; }, setAttribute() {} },
  "#consult-panel": { hidden: true },
  "#consult-answer": { value: "" },
  "#consult-overwrite": { checked: false },
  "#consult-status": { textContent: "" },
  "#open-work": { addEventListener(type, fn) { listeners[`open-work:${type}`] = fn; } },
  "#copy-work": { addEventListener(type, fn) { listeners[`copy-work:${type}`] = fn; } },
  "#work-status": { textContent: "" },
  "#theme-toggle": { addEventListener(type, fn) { listeners[`theme-toggle:${type}`] = fn; }, setAttribute() {} },
  "#theme-panel": { hidden: true },
  "#theme-mode": { value: "system", addEventListener(type, fn) { listeners[`theme-mode:${type}`] = fn; } },
  "#theme-main": { value: "#086c7e", addEventListener(type, fn) { listeners[`theme-main:${type}`] = fn; } },
  "#theme-sub": { value: "#b78b3c", addEventListener(type, fn) { listeners[`theme-sub:${type}`] = fn; } },
  "#apply-consult": { addEventListener(type, fn) { listeners[`apply-consult:${type}`] = fn; } },
  "#close-consult": { addEventListener(type, fn) { listeners[`close-consult:${type}`] = fn; } },
  "#load-sample": { addEventListener(type, fn) { listeners[`sample:${type}`] = fn; } },
  "#reset": { addEventListener(type, fn) { listeners[`reset:${type}`] = fn; } }
};
const document = {
  body: { append() {} },
  documentElement: { dataset: {}, style: { setProperty() {} } },
  querySelector(selector) { assert.ok(nodes[selector], selector); return nodes[selector]; },
  querySelectorAll(selector) {
    if (selector === ".panel") return ["info", "structure", "design", "generate", "library"].map(id => ({ id, classList: { toggle() {} } }));
    if (selector === ".step" || selector === ".next-step") return ["info", "structure", "design", "generate", "library"].map(step => ({ dataset: { step, next: step }, classList: { toggle() {} }, setAttribute() {}, removeAttribute() {}, addEventListener(type, fn) { listeners[`${selector}:${step}:${type}`] = fn; } }));
    throw new Error(selector);
  },
  createElement(tag) {
    if (tag === "canvas") return canvas(0, 0);
    if (tag === "a") return { click() { opened.push(this.href); }, remove() {}, href: "", download: "" };
    return { className: "", textContent: "", append() {}, addEventListener() {}, src: "", alt: "" };
  }
};
const storage = new Map();
const sandbox = {
  document,
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  FormData: class { constructor() {} entries() { return Object.entries(fields).map(([key, node]) => [key, node.value]); } },
  URL: class extends URL { static createObjectURL() { return "blob:smoke"; } static revokeObjectURL() {} },
  location: { protocol: "https:", href: "https://example.test/", origin: "https://example.test", hash: "", pathname: "/test", search: "" },
  fetch: async () => ({ ok: true, json: async () => ({ entries: [
    { id: "one", url: "completed-images/one/flyer.png", name: "講座 チラシ", medium: "flyer", slot: 0, createdAt: "2026-10-03T00:00:00Z", fields: { name: "講座" }, settings: { designs: [{ layout: 0 }] } },
    { id: "two", url: "completed-images/two/sns.png", name: "講座 SNS", medium: "sns", slot: 0, createdAt: "2026-10-03T00:01:00Z", fields: { name: "講座" }, settings: { designs: [{ layout: 0 }] } }
  ] }) }),
  history: { replaceState() {} },
  Uint8Array, atob, TextDecoder,
  setTimeout: fn => { fn(); return 1; },
  clearTimeout() {},
  confirm: () => true,
  Image: class {}
};
vm.runInNewContext(fs.readFileSync(path.join(root, "consult.js"), "utf8"), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(root, "state.js"), "utf8"), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(root, "work.js"), "utf8"), sandbox);
sandbox.ImageLibrary = { async save(entry) { saved.push(entry); }, async list() { return saved; } };
sandbox.window = { scrollTo() {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "app.js"), "utf8"), sandbox);
assert.equal(drawCalls.length, 0, "no fixed preview layout is drawn");
assert.match(nodes["#design-settings"].innerHTML, /デザインの雰囲気/);
assert.match(nodes["#design-settings"].innerHTML, /クール/);
assert.match(nodes["#design-settings"].innerHTML, /背景色/);
assert.ok(listeners["theme-toggle:click"]);
listeners["theme-toggle:click"]();
assert.equal(nodes["#theme-panel"].hidden, false);
nodes["#theme-mode"].value = "dark";
listeners["theme-mode:change"]();
assert.equal(document.documentElement.dataset.theme, "dark");
assert.equal(JSON.parse(storage.get("terakoya-workshop2-image-theme-v1")).mode, "dark");
async function run() {
  assert.equal(downloads.length, 0, "incomplete form must not export");
  listeners["sample:click"]();
  assert.equal(fields.name.value, "はじめてのAI画像講座");
  fields.date.value = "本人の開催日";
  listeners["consult:click"]();
  const sampleConsult = decodeURIComponent(opened.pop());
  assert.doesNotMatch(sampleConsult, /はじめてのAI画像講座|自分のお店を紹介したい方/);
  assert.equal(fields.name.value, "");
  assert.equal(fields.headline.value, "");
  assert.equal(fields.date.value, "本人の開催日");
  fields.name.value = "講座";
  fields.headline.value = "自分のサービスを伝える";
  fields.cta.value = "詳細を見る";
  listeners["form:input"]();
  listeners["consult:click"]();
  assert.equal(nodes["#consult-panel"].hidden, false);
  assert.match(opened[0], /^https:\/\/chatgpt\.com\/\?prompt=/);
  assert.match(decodeURIComponent(opened[0]), /講座/);
  nodes["#consult-answer"].value = '```json\n{"fields":{"name":"別名","audience":"初心者","benefit1":"持ち帰り資料"}}\n```';
  listeners["apply-consult:click"]();
  assert.equal(fields.name.value, "講座", "existing inputs remain unless overwrite is checked");
  assert.equal(fields.audience.value, "初心者");
  assert.equal(fields.benefit1.value, "持ち帰り資料");
  assert.equal(nodes["#consult-panel"].hidden, true);
  assert.equal(JSON.parse(storage.get("terakoya-workshop2-image-v1")).audience, "初心者");
  listeners["structure:change"]({ target: { name: "benefits", checked: false } });
  assert.equal(JSON.parse(storage.get("terakoya-workshop2-image-settings-v1")).flyer.benefits, false);
  listeners["design-settings:change"]({ target: { dataset: { slot: "0" }, value: "8", matches: selector => selector === "select[data-layout]" } });
  assert.equal(JSON.parse(storage.get("terakoya-workshop2-image-settings-v1")).designs[0].layout, 8);
  for (let layout = 0; layout < 9; layout++) listeners["design-settings:change"]({ target: { dataset: { slot: "0" }, value: String(layout), matches: selector => selector === "select[data-layout]" } });
  assert.equal(JSON.parse(storage.get("terakoya-workshop2-image-settings-v1")).designs[0].layout, 8);
  assert.equal(downloads.length, 0, "preview image creation has been removed");
  assert.equal(saved.length, 0, "no preview is marked as completed");
  listeners["open-work:click"]();
  assert.match(decodeURIComponent(opened.at(-1)), /completed-images.json/);
  listeners[".step:library:click"]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(libraryCards.flyer.length, 1);
  assert.equal(libraryCards.sns.length, 1, "SNS images appear in a separate group");
  sandbox.ImageLibrary.list = async () => { throw new Error("storage unavailable"); };
  listeners["refresh-library:click"]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(libraryCards.flyer.length, 1, "remote Work images remain visible when local storage fails");
  console.log("Smoke test passed: 5 steps, 9 design directions, no layout preview, medium groups, and Work handoff.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
