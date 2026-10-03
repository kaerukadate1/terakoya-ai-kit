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
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /id="library-flyer"/);
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /id="library-sns"/);
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /システムに合わせる/);
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /<script src="state\.js"><\/script>\s*<script src="library\.js"><\/script>\s*<script src="work\.js"><\/script>/);
});
