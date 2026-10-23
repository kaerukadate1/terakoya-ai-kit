const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'MANIFEST.json'), 'utf8'));
const kit = require('../dist/kit.js');
assert.equal(manifest.baseUrl, kit.base);
assert.equal(manifest.version, kit.version);
assert.ok(!kit.base.includes('/main/') && !kit.base.includes('/feature/'));
for (const file of manifest.files) {
  const resolved = path.resolve(root, file.path);
  assert.ok(resolved.startsWith(root + path.sep));
  const bytes = fs.readFileSync(resolved);
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
for (const url of Object.values(kit.skills)) assert.ok(manifest.files.some(f => kit.base + f.path === url), url);
const starter = fs.readFileSync(path.join(root, 'STARTER_PROMPT.txt'), 'utf8');
assert.ok(starter.includes(kit.base + 'BUILD_PROMPT.md'));
const guideStarter = path.resolve(root, '../../note-article/開始文.txt');
if (fs.existsSync(guideStarter)) assert.equal(fs.readFileSync(guideStarter, 'utf8'), starter);
assert.equal(fs.existsSync(path.join(root, '.openai/hosting.json')), false, 'Do not put a Site identity in the distributed kit');
console.log(`PASS: ${manifest.files.length} file hashes, all frozen skill URLs, matching starter, no Site identity`);
