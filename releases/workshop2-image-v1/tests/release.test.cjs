const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const release = path.resolve(__dirname, "..");
const files = ["index.html", "styles.css", "app.js", "design/SKILL.md", "BUILD_PROMPT.md", "STARTER_PROMPT.txt"];

test("starter points to this release and every fixed file exists", () => {
  for (const file of files) assert.ok(fs.existsSync(path.join(release, file)), file);
  const starter = fs.readFileSync(path.join(release, "STARTER_PROMPT.txt"), "utf8");
  const build = fs.readFileSync(path.join(release, "BUILD_PROMPT.md"), "utf8");
  const name = "寺子屋AI チラシ・SNS告知画像制作ツール";
  assert.match(starter, /releases\/workshop2-image-v1\/BUILD_PROMPT\.md/);
  assert.ok(starter.includes(name));
  assert.ok(build.includes(name));
  for (const file of files.slice(0, 4)) assert.ok(build.includes(file), file);
});
