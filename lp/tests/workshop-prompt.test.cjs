const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const release = path.resolve(__dirname, '..');

test('the shared short prompt leads to a fresh private site each run', () => {
  const shortPrompt = fs.readFileSync(path.join(release, 'START_HERE.txt'), 'utf8');
  const instructions = fs.readFileSync(path.join(release, 'WORKSHOP_PROMPT.md'), 'utf8');

  assert.match(shortPrompt, /WORKSHOP_PROMPT\.md/);
  assert.match(instructions, /この実行専用の新しい本人限定サイトを作成する/);
  assert.match(instructions, /既にあっても再利用・編集・複製しない/);
  assert.match(instructions, /既存サイトや完成LP、過去の入力・保存データを新サイトへ持ち込まず/);
  assert.match(instructions, /新サイトを作れない場合は既存サイトへ切り替えず/);
});
