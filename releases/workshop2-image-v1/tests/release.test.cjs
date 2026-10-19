const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const release = path.resolve(__dirname, "..");
const files = ["index.html", "styles.css", "consult.js", "state.js", "library.js", "work.js", "app.js", "design/SKILL.md", "design/FLYER_SKILL.md", "design/SNS_SKILL.md", "BUILD_PROMPT.md", "STARTER_PROMPT.txt", "UPDATE_EXISTING_SITE_PROMPT.md"];

test("starter points to this release and every fixed file exists", () => {
  for (const file of files) assert.ok(fs.existsSync(path.join(release, file)), file);
  const starter = fs.readFileSync(path.join(release, "STARTER_PROMPT.txt"), "utf8");
  const build = fs.readFileSync(path.join(release, "BUILD_PROMPT.md"), "utf8");
  const name = "寺子屋AI チラシ・SNS告知画像制作ツール";
  assert.match(starter, /releases\/workshop2-image-v1\/BUILD_PROMPT\.md/);
  assert.match(fs.readFileSync(path.join(release, "UPDATE_EXISTING_SITE_PROMPT.md"), "utf8"), /現在のWorkサイトURL/);
  assert.ok(starter.includes(name));
  assert.ok(build.includes(name));
  assert.match(build, /04の依頼文/);
  assert.match(build, /design\/FLYER_SKILL\.md/);
  assert.match(build, /design\/SNS_SKILL\.md/);
  const skill = fs.readFileSync(path.join(release, "design/SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: terakoya-flyer-sns-design/m);
  assert.match(skill, /納品前の画像チェック/);
  for (const file of files.slice(0, 7)) assert.ok(build.includes(file), file);
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /<script src="consult\.js"><\/script>/);
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /画面の見た目/);
  assert.doesNotMatch(fs.readFileSync(path.join(release, "index.html"), "utf8"), /画像を比べる|id="preview"/);
  const html = fs.readFileSync(path.join(release, "index.html"), "utf8");
  assert.match(html, /id="library-flyer"/);
  assert.match(html, /id="library-sns-portrait"/);
  assert.match(html, /id="library-sns-square"/);
  assert.match(html, /id="library-sns-landscape"/);
  assert.match(html, /1200×630/);
  assert.match(html, /自分の事業にも、お客様の仕事にも使えます/);
  const driveCopy = fs.readFileSync(path.resolve(release, "../../flyer-sns/開始文.txt"), "utf8");
  assert.equal(driveCopy, starter);
  assert.match(starter, /事前の宿題は出さない/);
  assert.match(starter, /質問して集めて/);
  assert.match(starter, /ツールの画面を作ってください/);
  assert.doesNotMatch(starter, /要確認|私だけ|本人限定|一般公開|Workサイトとして/);
  assert.match(build, /宿題は出さない/);
  assert.doesNotMatch(build, /私だけ|本人限定|一般公開/);
  for (const file of ["修正を依頼する.txt", "文字を直す.txt", "別のサイズを足す.txt", "2枚だけ作る.txt", "やり直す.txt"]) {
    const text = fs.readFileSync(path.resolve(release, "../../flyer-sns", file), "utf8");
    assert.match(text, /design\/SKILL\.md/, file);
    assert.match(text, /design\/FLYER_SKILL\.md/, file);
    assert.match(text, /design\/SNS_SKILL\.md/, file);
    assert.match(text, /読めないものがあれば、そのURLを伝えて止めてください/, file);
    assert.doesNotMatch(text, /要確認|私だけ|本人限定|一般公開|新しいサイト/, file);
  }
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /システムに合わせる/);
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /<script src="state\.js"><\/script>\s*<script src="library\.js"><\/script>\s*<script src="work\.js"><\/script>/);
});
