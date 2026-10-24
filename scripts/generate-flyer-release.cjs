'use strict';
// Canonical sources live under flyer-sns/. Legacy URLs remain unchanged.
const fs = require('node:fs');
const path = require('node:path');
const app = ['index.html', 'styles.css', 'app.js', 'consult.js', 'intake.js', 'state.js', 'library.js', 'work.js'];
const skills = ['SKILL.md', 'FLYER_SKILL.md', 'SNS_SKILL.md'];
const tests = ['consult.test.cjs', 'intake.test.cjs', 'library.test.cjs', 'release.test.cjs', 'smoke.cjs', 'state.test.cjs', 'work.test.cjs'];
const mappings = [
  ...app.map(name => [`app/${name}`, name]),
  ...skills.map(name => [`skills/${name}`, `design/${name}`]),
  ...tests.map(name => [`tests/${name}`, `tests/${name}`]),
  ['prompts/BUILD_PROMPT.md', 'BUILD_PROMPT.md'],
  ['prompts/RELEASE_README.md', 'README.md'],
  ['prompts/UPDATE_EXISTING_SITE_PROMPT.md', 'UPDATE_EXISTING_SITE_PROMPT.md'],
  ['開始文.txt', 'STARTER_PROMPT.txt'],
];
function run({ root = path.resolve(__dirname, '..'), write = false } = {}) {
  // Load every source before any write, so missing sources cannot produce a partial release.
  const planned = mappings.map(([source, target]) => ({
    source, target,
    bytes: fs.readFileSync(path.join(root, 'flyer-sns', source)),
    destination: path.join(root, 'releases/workshop2-image-v1', target),
  }));
  const changed = planned.filter(item => !fs.existsSync(item.destination) || !fs.readFileSync(item.destination).equals(item.bytes));
  if (write) for (const item of changed) {
    fs.mkdirSync(path.dirname(item.destination), { recursive: true });
    fs.writeFileSync(item.destination, item.bytes);
  }
  return { files: planned.length, changed: changed.map(item => item.target), write };
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => !['--check', '--write'].includes(arg))) {
    console.error('Usage: node scripts/generate-flyer-release.cjs [--check|--write]');
    process.exitCode = 2;
  } else {
    try {
      const result = run({ write: args[0] === '--write' });
      if (!result.write && result.changed.length) {
        console.error('FAIL: generated files differ: ' + result.changed.join(', '));
        process.exitCode = 1;
      } else console.log(`PASS: ${result.files} release files; ${result.changed.length} ${result.write ? 'updated' : 'differences'}.`);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
module.exports = { mappings, run };
