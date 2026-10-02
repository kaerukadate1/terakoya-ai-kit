const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const release = path.resolve(__dirname, "..");
const files = ["index.html", "styles.css", "consult.js", "state.js", "library.js", "work.js", "app.js", "design/SKILL.md", "BUILD_PROMPT.md", "STARTER_PROMPT.txt", "UPDATE_EXISTING_SITE_PROMPT.md"];

test("starter points to this release and every fixed file exists", () => {
  for (const file of files) assert.ok(fs.existsSync(path.join(release, file)), file);
  const starter = fs.readFileSync(path.join(release, "STARTER_PROMPT.txt"), "utf8");
  const build = fs.readFileSync(path.join(release, "BUILD_PROMPT.md"), "utf8");
  const name = "寺子屋AI チラシ・SNS告知画像制作ツール";
  assert.match(starter, /releases\/workshop2-image-v1\/BUILD_PROMPT\.md/);
  assert.match(fs.readFileSync(path.join(release, "UPDATE_EXISTING_SITE_PROMPT.md"), "utf8"), /現在のWorkサイトURL/);
  assert.ok(starter.includes(name));
  assert.ok(build.includes(name));
  for (const file of files.slice(0, 7)) assert.ok(build.includes(file), file);
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /<script src="consult\.js"><\/script>/);
  assert.match(fs.readFileSync(path.join(release, "index.html"), "utf8"), /<script src="state\.js"><\/script>\s*<script src="library\.js"><\/script>\s*<script src="work\.js"><\/script>/);
});
