const test = require("node:test");
const assert = require("node:assert/strict");
const Consult = require("../consult.js");

test("consultation asks for verifiable business details and a JSON intake", () => {
  const prompt = Consult.buildPrompt({ name: "講座A", date: "" }, "https://sample.chatgpt.site/");
  assert.match(prompt, /現在入力済みの項目: \{"name":"講座A"\}/);
  assert.match(prompt, /参照できない情報を読めたように装わない/);
  assert.match(prompt, /未入力欄だけが埋まります/);
  assert.match(prompt, /#image-intake=/);
  assert.doesNotMatch(Consult.buildPrompt({}, "https://other.example/"), /other\.example/);
});

test("consultation passes a valid LP URL and requires an explicit read status", () => {
  const prompt = Consult.buildPrompt({ lpUrl: "https://example.com/lp" }, "https://sample.chatgpt.site/");
  assert.match(prompt, /LP URL: https:\/\/example\.com\/lp/);
  assert.match(prompt, /read\|unreadable\|not_provided/);
  assert.match(prompt, /If it cannot be read/);
  assert.doesNotMatch(Consult.buildPrompt({ lpUrl: "javascript:alert(1)" }), /LP URL:/);
});

test("LP source summary distinguishes readable, unreadable, and unknown facts", () => {
  assert.match(Consult.sourceSummary({ source: { status: "read", facts: ["heading"], unknowns: ["price"] } }), /LP read/);
  assert.match(Consult.sourceSummary({ source: { status: "unreadable" } }), /LP unreadable/);
  assert.match(Consult.sourceSummary({}), /not supplied/);
});

test("JSON responses are parsed, existing values remain, and only known strings are applied", () => {
  const answer = Consult.parseAnswer('```json\n{"fields":{"name":"新しい名前","audience":"初めての方","date":"","unknown":"ignored","url":"javascript:alert(1)"}}\n```\n未確認: 日時');
  const result = Consult.applyFields({ name: "元の名前", audience: "" }, answer);
  assert.equal(result.fields.name, "元の名前");
  assert.equal(result.fields.audience, "初めての方");
  assert.equal(result.fields.url, undefined);
  assert.equal(result.fields.unknown, undefined);
  assert.equal(result.applied, 1);
  assert.equal(Consult.applyFields(result.fields, answer, true).fields.name, "新しい名前");
});

test("invalid and oversized answers are rejected", () => {
  assert.throws(() => Consult.parseAnswer("not json"), /JSONを読み込めません/);
  assert.throws(() => Consult.parseAnswer("a".repeat(200_001)), /長すぎます/);
  assert.throws(() => Consult.applyFields({}, { fields: [] }), /形式が違います/);
  const result = Consult.applyFields({}, { fields: { headline: "a".repeat(150), url: "https://example.com/" } });
  assert.equal(result.fields.headline.length, 100);
  assert.equal(result.fields.url, "https://example.com/");
  assert.equal(Consult.applyFields({}, { fields: { url: `https://example.com/${"x".repeat(100)}` } }).applied, 0);
});
