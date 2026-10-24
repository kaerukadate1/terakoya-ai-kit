(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NoteKit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const base = 'https://raw.githubusercontent.com/kaerukadate1/terakoya-ai-kit/note-article-v1-20261023-r2/releases/note-article-v1/';
  return { version: '1.0.1', base, skills: { writing: base + 'skills/note-writing/SKILL.md', images: base + 'skills/note-images/SKILL.md', returns: base + 'skills/work-return/SKILL.md' } };
});
