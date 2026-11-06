const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/core.js');
let H; try { H = require('../dist/history.js'); } catch { H = {}; }

test('history freezes draft, rules and image data independently of later edits', () => {
  const state = C.fresh(); state.brief.idea = '最初の題材';
  const preferences = { enabled: true, notes: '本人が渡した文章' };
  const image = new Blob(['original-image'], { type: 'image/png' });
  const record = H.create({ state, rules: '結論から書く', preferences, draftId: 'draft-1', images: { cover: image } }, '編集');
  state.brief.idea = '変更後'; preferences.notes = '変更後';
  assert.equal(record.state.brief.idea, '最初の題材');
  assert.equal(record.preferences.notes, '本人が渡した文章');
  assert.equal(record.images.cover.size, image.size);
  assert.equal(record.rules, '結論から書く');
});

test('learning result remains usable when an unrelated article changes, but not when rules change', () => {
  const input = { state: C.fresh(), draftId: 'a', rules: '短い段落', preferences: { enabled: true, notes: '自分の文章' } };
  const before = H.learningContext(input);
  input.draftId = 'b'; input.state.brief.idea = '別の記事';
  assert.equal(H.learningContext(input), before);
  input.rules = '別の決まり';
  assert.notEqual(H.learningContext(input), before);
});

test('saving the same article updates its entry and version without dropping old unrelated articles', () => {
  const old = { id: 'a', version: 1, savedAt: 'first', state: C.fresh() };
  const other = { id: 'b', state: C.fresh() };
  const next = { id: 'a', savedAt: 'second', state: C.fresh() }; next.state.brief.idea = '修正後';
  const result = H.saveEntry([old, other], next);
  assert.equal(result.length, 2);
  assert.equal(result[0].version, 2);
  assert.equal(result[0].savedAt, 'first');
  assert.equal(result[0].updatedAt, 'second');
  assert.equal(old.state.brief.idea, '');
  assert.equal(result[1].id, 'b');
});

test('disabled learning keeps saved rules while excluding them from the effective prompt', () => {
  assert.equal(H.effectiveRules('結論から書く', { enabled: false }), '');
  assert.equal(H.effectiveRules('結論から書く', { enabled: true }), '結論から書く');
  const p = H.preferences({ enabled: false, defaults: { length: 'invalid' } });
  assert.equal(p.enabled, false); assert.equal(p.defaults.length, '2000');
});
