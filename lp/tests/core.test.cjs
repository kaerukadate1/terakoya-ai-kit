const { test } = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../core.js");

test("blank state has three different starting designs and no invented proof", () => {
  const project = Core.blankProject();
  assert.equal(new Set(project.designs).size, 3);
  assert.equal(Object.keys(Core.PRESETS).length, 9);
  assert.equal(project.sections.proof, "exclude");
  assert.equal(project.sections.testimonials, "exclude");
  const html = Core.buildHtml(project, "trust");
  assert.doesNotMatch(html, /<h2>実績<\/h2>/);
  assert.doesNotMatch(html, /<h2>お客様の声<\/h2>/);
});

test("unconfirmed proof or testimonials never appear even when selected", () => {
  const project = Core.blankProject();
  project.fields.title = "講座";
  project.sections.proof = "include";
  project.sections.testimonials = "include";
  const html = Core.buildHtml(project, "friendly");
  assert.doesNotMatch(html, /<h2>実績<\/h2>/);
  assert.doesNotMatch(html, /<h2>お客様の声<\/h2>/);
  assert.ok(Core.issues(project).some((item) => item.includes("実績")));
  project.fields.proof = "確認済みの実績";
  assert.match(Core.buildHtml(project, "friendly"), /確認済みの実績/);
});

test("missing or unsafe application URL never becomes an active button", () => {
  const project = Core.blankProject();
  project.fields.applicationUrl = "javascript:alert(1)";
  let html = Core.buildHtml(project, "future");
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /aria-disabled="true"/);
  project.fields.applicationUrl = "https://example.com/apply";
  html = Core.buildHtml(project, "future");
  assert.match(html, /href="https:\/\/example.com\/apply"/);
});

test("HTML escapes user fields and local edits affect only their section", () => {
  const project = Core.blankProject();
  project.fields.title = '<script>alert("x")</script>';
  project.fields.problem = "元の悩み";
  project.fields.offer = "提供内容";
  project.edits.problem = "修正した悩み";
  const html = Core.buildHtml(project, "trust");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /修正した悩み/);
  assert.doesNotMatch(html, /元の悩み/);
  assert.match(html, /提供内容/);
});

test("Work prompt demands immediate deliverables, no fabrication, selected designs and notes", () => {
  const project = Core.blankProject();
  project.fields.title = "試作LP";
  project.sectionNotes.cta = "ボタンを目立たせる";
  project.designs = ["trust", "premium", "creative"];
  project.workDesigns = [0, 1, 2];
  const prompt = Core.buildWorkPrompt(project);
  assert.match(prompt, /最初の返答で/);
  assert.match(prompt, /制作前の確認質問.*不要/);
  assert.doesNotMatch(prompt, /回答を待つ間/);
  assert.match(prompt, /創作しない/);
  assert.match(prompt, /ボタンを目立たせる/);
  assert.match(prompt, /プレミアム/);
  assert.match(prompt, /クリエイティブ/);
});

test("Work request includes only selected designs and keeps original slot filenames", () => {
  const project = Core.blankProject();
  project.designs = ["trust", "premium", "creative"];
  project.imageDirections = ["信頼の画像", "上質な画像", "大胆な画像"];
  project.referenceUrls = ["https://example.com/one", "https://example.com/two", "https://example.com/three"];
  project.workDesigns = [2];
  let prompt = Core.buildWorkPrompt(project);
  let payload = JSON.parse(prompt.split("入力JSON:\n")[1]);
  assert.deepEqual(payload.designs.map((design) => design.filename), ["lp-03.html"]);
  assert.equal(payload.designs[0].imageDirection, "大胆な画像");
  assert.equal(payload.projectSettings.designs.length, 3);
  assert.equal(payload.designs.length, 1);
  assert.doesNotMatch(payload.designs[0].referenceUrl, /example.com\/one|example.com\/two/);
  project.workDesigns = [0, 2];
  prompt = Core.buildWorkPrompt(project);
  payload = JSON.parse(prompt.split("入力JSON:\n")[1]);
  assert.deepEqual(payload.designs.map((design) => design.filename), ["lp-01.html", "lp-03.html"]);
  project.workDesigns = [0, 1, 2];
  payload = JSON.parse(Core.buildWorkPrompt(project).split("入力JSON:\n")[1]);
  assert.equal(payload.designs.length, 3);
});

test("older saved projects default to one Work design and invalid selections cannot empty it", () => {
  assert.deepEqual(Core.normalizeProject({ designs: ["trust", "friendly", "future"] }).workDesigns, [0]);
  assert.deepEqual(Core.normalizeProject({ workDesigns: [2, 2, 8, "1", -1] }).workDesigns, [2]);
  assert.deepEqual(Core.normalizeProject({ workDesigns: [] }).workDesigns, [0]);
});

test("import normalization rejects unknown design IDs and unsafe shapes", () => {
  const project = Core.normalizeProject({ fields: { title: "A" }, designs: ["oops", "trust", "future"], extraSections: "oops" });
  assert.equal(project.designs[0], "trust");
  assert.deepEqual(project.extraSections, []);
  assert.equal(project.fields.title, "A");
});

test("bonus ideas are not published, only confirmed existing bonuses are", () => {
  const project = Core.blankProject();
  project.fields.bonus = "確定済みの資料";
  project.bonusMode = "ideas";
  assert.doesNotMatch(Core.buildHtml(project, "trust"), /確定済みの資料/);
  project.bonusMode = "existing";
  assert.match(Core.buildHtml(project, "trust"), /確定済みの資料/);
});

test("the three starter directions change section sequence, not only colors", () => {
  const project = Core.blankProject();
  project.fields.problem = "課題";
  project.fields.outcome = "成果";
  project.fields.offer = "サービス";
  const trust = Core.buildHtml(project, "trust");
  const friendly = Core.buildHtml(project, "friendly");
  const future = Core.buildHtml(project, "future");
  assert.ok(trust.indexOf('id="problem"') < trust.indexOf('id="offer"'));
  assert.ok(friendly.indexOf('id="future"') < friendly.indexOf('id="problem"'));
  assert.ok(future.indexOf('id="offer"') < future.indexOf('id="problem"'));
});

test("three selected designs remain visibly distinct in generated output", () => {
  const project = Core.blankProject();
  project.fields.title = "比較用LP";
  project.fields.problem = "比較する課題";
  project.fields.offer = "内容";
  const html = project.designs.map((id) => Core.buildHtml(project, id));
  assert.equal(new Set(html).size, 3);
  assert.match(html[0], /信頼感/);
  assert.match(html[1], /親しみ/);
  assert.match(html[2], /未来感/);
});

test("optional local hero image survives JSON normalization and unsafe image is dropped", () => {
  const project = Core.blankProject();
  project.heroImage = "data:image/webp;base64,QUJD";
  const restored = Core.normalizeProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.heroImage, project.heroImage);
  assert.match(Core.buildHtml(restored, "trust"), /class="lp-cover"/);
  assert.match(Core.buildHtml(restored, "trust"), /提供画像/);
  restored.heroImage = "javascript:alert(1)";
  assert.equal(Core.normalizeProject(restored).heroImage, "");
});

test("all nine directions select their own layout rules", () => {
  const project = Core.blankProject();
  project.fields.title = "比較用LP";
  project.fields.problem = "比較する課題";
  for (const id of Object.keys(Core.PRESETS)) {
    const html = Core.buildHtml(project, id);
    assert.match(html, new RegExp(`<body data-design="${id}">`));
    assert.match(html, new RegExp(`body\\[data-design="${id}"\\] \\.hero`));
    assert.match(html, /class="section-inner"/);
  }
});

test("per-design photos survive normalization and each output uses its assigned image", () => {
  const project = Core.blankProject();
  project.designImages = ["data:image/webp;base64,QUJD", "data:image/webp;base64,REVG", "javascript:bad"];
  const restored = Core.normalizeProject(project);
  assert.equal(restored.designImages[2], "");
  assert.match(Core.buildHtml(restored, "trust", restored.designImages[0]), /QUJD/);
  assert.match(Core.buildHtml(restored, "friendly", restored.designImages[1]), /REVG/);
  assert.doesNotMatch(Core.buildHtml(restored, "friendly", restored.designImages[1]), /QUJD/);
});

test("missing photo uses only an image placeholder, including sample projects", () => {
  const project = Core.blankProject();
  project.sample = true;
  project.fields.title = "別の講座";
  const html = Core.buildHtml(project, "trust");
  assert.match(html, /class="lp-cover placeholder"><span>画像<\/span>/);
  assert.doesNotMatch(html, /data:image\/webp;base64/);
  assert.doesNotMatch(html, /テスト用・架空情報/);
});

test("consultation fills only known fields and preserves existing input", () => {
  const project = Core.blankProject();
  project.fields.title = "既存タイトル";
  project.edits.problem = "古い修正";
  const result = Core.applyConsultFields(project, { fields: { title: "新タイトル", audience: "小規模事業者", problem: "時間が足りない", applicationUrl: "javascript:bad", unknown: "無視" } });
  assert.equal(result.applied, 2);
  assert.equal(result.project.fields.title, "既存タイトル");
  assert.equal(result.project.fields.audience, "小規模事業者");
  assert.equal(result.project.fields.applicationUrl, "");
  assert.equal(result.project.edits.problem, undefined);
  assert.equal(Core.applyConsultFields(result.project, { fields: { title: "変更後" } }, true).project.fields.title, "変更後");
});

test("saved settings retain copy and design choices but omit image bytes", () => {
  const project = Core.blankProject();
  project.fields.title = "編集用";
  project.designs[1] = "premium";
  project.heroImage = "data:image/webp;base64,QUJD";
  const settings = Core.snapshotForLibrary(project);
  assert.equal(settings.fields.title, "編集用");
  assert.equal(settings.designs[1], "premium");
  assert.equal(settings.heroImage, "");
  assert.deepEqual(settings.designImages, ["", "", ""]);
  assert.match(Core.buildWorkPrompt(project, "https://example.chatgpt.site/"), /projectSettings.*そのまま保存/);
});

test("three design-specific image directions survive saving and enter one Work request", () => {
  const project = Core.blankProject();
  project.fields.title = "絵本づくり講座";
  project.fields.offer = "親子で絵本を作る";
  project.imageDirections[1] = "親子の手元を中心に";
  project.workDesigns = [0, 1, 2];
  const restored = Core.normalizeProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.imageDirections[1], "親子の手元を中心に");
  const prompt = Core.buildWorkPrompt(restored);
  assert.match(prompt, /親子の手元を中心に/);
  assert.match(prompt, /絵本づくり講座/);
  assert.match(prompt, /選択済み3案だけを完成/);
  assert.match(prompt, /選択した案それぞれに生成/);
  assert.equal((prompt.match(/"imageDirection":/g) || []).length, 3);
});


test("consultation excludes a restored sample while preserving personal edits", () => {
  const project = Core.blankProject();
  project.sample = true;
  Object.assign(project.fields, Core.SAMPLE_FIELDS);
  project.fields.host = "本人の屋号";
  project.extraSections = [{ title: "持ち物", content: "サンプルの持ち物" }];
  const prompt = Core.buildConsultPrompt(project);
  assert.doesNotMatch(prompt, /スマホで撮る|商品写真1枚|撮影手順/);
  assert.match(prompt, /本人の屋号/);
  assert.match(prompt, /過去チャット/);
  const clean = Core.prepareConsultProject(project);
  assert.equal(clean.fields.title, "");
  assert.equal(clean.fields.host, "本人の屋号");
  assert.deepEqual(clean.extraSections, []);
  const result = Core.applyConsultFields(project, { fields: { title: "本人の講座" } });
  assert.equal(result.project.fields.title, "本人の講座");
  assert.equal(result.project.fields.audience, "");
  assert.equal(project.sample, true);
});
