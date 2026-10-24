const { test } = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../core.js");
const Sheet = require("../sheet.js");

const fixture = `寺子屋AI 告知一式AI入力用シート v1.0
テスト記入例：以下はすべて架空の企画です。

1 何を告知したいですか【必須】
回答：
【テスト用・架空情報】「スマホで撮る 商品写真ミニ講座」というオンライン講座を告知したいです。講座中に商品写真を1枚撮影します。

2 詳しい情報【任意】
回答：
開催日時：2026年10月18日 13:00〜14:30（日本時間）
開催方法：オンライン。使用する会議サービスと参加リンクは未定。
参加費：3,000円（税込）
定員：6名
参加の目安：スマホ撮影に慣れていない方。専用カメラは不要です。
内容：光と背景を学ぶ。
申込URL：未定。
録画配布・キャンセル条件：未定。
主催者名・講師名・講師実績：このテストでは未設定。

3 文体・必ず伝えたいこと【任意】
回答：
「残りわずか」と書かないでください。
すべての生成結果で「テスト用・架空情報」であることが分かるようにしてください。

--- 記入はここまで ---`;

test("legacy sheet maps facts and keeps fictional status and unknowns", () => {
  const { project, summary } = Sheet.parseLegacySheet(fixture);
  assert.equal(project.fields.title, "スマホで撮る 商品写真ミニ講座");
  assert.equal(project.fields.date, "2026年10月18日 13:00〜14:30（日本時間）");
  assert.equal(project.fields.price, "3,000円（税込）");
  assert.equal(project.fields.applicationUrl, "");
  assert.equal(project.fields.host, "");
  assert.equal(project.sample, true);
  assert.equal(summary.sample, true);
  assert.ok(project.pending.some((item) => item.includes("申込URL")));
  assert.ok(project.pending.some((item) => item.includes("講師")));
  assert.ok(!project.pending.some((item) => item.includes("架空")));
  assert.deepEqual(project.extraSections.find((item) => item.title === "定員"), { title: "定員", content: "6名" });
});

test("legacy sample data no longer adds a visible label or invented application link", () => {
  const { project } = Sheet.parseLegacySheet(fixture);
  for (const id of project.designs) {
    const html = Core.buildHtml(project, id);
    assert.doesNotMatch(html, /テスト用・架空情報/);
    assert.match(html, /3,000円/);
    assert.match(html, /aria-disabled="true"/);
    assert.match(html, /［申込URL：未定］/);
    assert.doesNotMatch(html, /残りわずか|<h2>実績<\/h2>|<h2>お客様の声<\/h2>/);
  }
});

test("provided image is embedded while missing image stays a placeholder", () => {
  const { project } = Sheet.parseLegacySheet(fixture);
  const html = Core.buildHtml(project, "trust", "data:image/webp;base64,QUJD");
  assert.match(html, /class="lp-cover"/);
  assert.match(html, /提供画像/);
  assert.match(html, /data:image\/webp;base64,QUJD/);
  assert.match(Core.buildHtml(project, "trust", "javascript:bad"), /class="lp-cover placeholder"/);
});

test("Work request proceeds without confirmation questions for fictional sample", () => {
  const { project } = Sheet.parseLegacySheet(fixture);
  const prompt = Core.buildWorkPrompt(project);
  assert.match(prompt, /制作前の確認質問や構成案だけの返答は不要/);
  assert.doesNotMatch(prompt, /テスト用・架空情報/);
  assert.match(prompt, /講師欄・録画配布・キャンセル条件.*掲載しません/);
  assert.match(prompt, /最初の返答で/);
  assert.match(prompt, /lp-01\.html/);
});

test("invalid or overlong sheets fail without changing a project", () => {
  assert.throws(() => Sheet.parseLegacySheet("質問だけ"), /1番の回答/);
  assert.throws(() => Sheet.parseLegacySheet("a".repeat(100_001)), /10万文字/);
});
