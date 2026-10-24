const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { mappings, run } = require('../scripts/generate-flyer-release.cjs');

test('current release matches canonical sources byte for byte', () => {
  assert.deepEqual(run().changed, []);
  assert.equal(run().files, 22);
});

test('check is read-only, write is reproducible, and unrelated files survive', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flyer-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [source] of mappings) {
    const file = path.join(root, 'flyer-sns', source);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source + '\n');
  }
  assert.equal(run({root}).changed.length, 22);
  assert.equal(fs.existsSync(path.join(root, 'releases')), false);
  assert.equal(run({root, write:true}).changed.length, 22);
  assert.deepEqual(run({root}).changed, []);
  assert.deepEqual(run({root, write:true}).changed, []);
  const output = path.join(root, 'releases/workshop2-image-v1');
  fs.writeFileSync(path.join(output, 'unrelated.txt'), 'preserve');
  fs.writeFileSync(path.join(output, 'app.js'), 'drift');
  assert.deepEqual(run({root}).changed, ['app.js']);
  assert.equal(fs.readFileSync(path.join(output, 'app.js'), 'utf8'), 'drift');
  run({root, write:true});
  assert.equal(fs.readFileSync(path.join(output, 'unrelated.txt'), 'utf8'), 'preserve');
  fs.unlinkSync(path.join(root, 'flyer-sns/app/index.html'));
  assert.throws(() => run({root, write:true}), /ENOENT/);
  assert.equal(fs.readFileSync(path.join(output, 'unrelated.txt'), 'utf8'), 'preserve');
});
