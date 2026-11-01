'use strict';
// Read-only compatibility check. Run from any working directory.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const entries = [
  ['lp', 'releases/lp-maker-pilot-20260925/START_HERE.txt'],
  ['flyer-sns', 'releases/workshop2-image-v1/STARTER_PROMPT.txt'],
  ['my-site', 'releases/mytools-v5/STARTER_PROMPT.txt'],
  ['note-article', 'releases/note-article-v1/STARTER_PROMPT.txt'],
  ['character-studio', 'releases/character-studio-v1/STARTER_PROMPT.txt'],
];
const required = [
  'README.md', '運用ルール.md',
  'releases/lp-maker-pilot-20260925/WORKSHOP_PROMPT.md',
  'releases/lp-maker-pilot-20260925/index.html',
  'releases/workshop2-image-v1/BUILD_PROMPT.md',
  'releases/workshop2-image-v1/index.html',
  'releases/workshop2-image-v1/styles.css',
  'releases/workshop2-image-v1/app.js',
  'releases/workshop2-image-v1/consult.js',
  'releases/workshop2-image-v1/intake.js',
  'releases/workshop2-image-v1/state.js',
  'releases/workshop2-image-v1/library.js',
  'releases/workshop2-image-v1/work.js',
  'releases/workshop2-image-v1/design/SKILL.md',
  'releases/workshop2-image-v1/design/FLYER_SKILL.md',
  'releases/workshop2-image-v1/design/SNS_SKILL.md',
  'releases/mytools-v5/index.html',
  'releases/note-article-v1/BUILD_PROMPT.md',
  'releases/note-article-v1/MANIFEST.json',
  'plugins/terakoya-ai-creative/skills/terakoya-web-design/SKILL.md',
  'plugins/terakoya-ai-creative/skills/terakoya-web-design/references/work-sites-guidance.md',
  'releases/kokuchi-v3/terakoya-kokuchi-v3.1-work-pack.txt',
];
const errors = [];
let checks = 0;
function read(file) {
  try {
    const resolved = path.join(root, file);
    if (!fs.statSync(resolved).isFile()) throw new Error('not a file');
    checks++;
    return fs.readFileSync(resolved);
  } catch (error) {
    errors.push(file + ': ' + error.message);
    return null;
  }
}
for (const file of required) read(file);
for (const [entry, releaseStarter] of entries) {
  for (const name of ['README.md', '手順.md', '進行.md', 'スキル.md']) read(entry + '/' + name);
  const participant = read(entry + '/開始文.txt');
  const release = read(releaseStarter);
  if (participant && release && !participant.equals(release)) {
    errors.push(entry + '/開始文.txt differs from ' + releaseStarter);
  }
}
if (errors.length) {
  console.error('FAIL: entrypoint compatibility\n' + errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: ' + checks + ' files exist; all '+entries.length+' starter pairs are byte-identical.');
  console.log('Local path checks only. No URL, browser, release-hash or generation tests were run.');
}
