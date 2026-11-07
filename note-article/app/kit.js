(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NoteKit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const base = 'https://raw.githubusercontent.com/kaerukadate1/terakoya-ai-kit/note-article-v1-20261107-sample/releases/note-article-v1/';
  function projectId(documentRef) { return documentRef?.querySelector('meta[name="site-project-id"]')?.content || ''; }
  return { version: '1.2.2', base, projectId, skills: { writing: base + 'skills/note-writing/SKILL.md', images: base + 'skills/note-images/SKILL.md', returns: base + 'skills/work-return/SKILL.md', natural: base + 'skills/natural-japanese/SKILL.md' } };
});
