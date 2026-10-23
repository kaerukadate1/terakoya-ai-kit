const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
function walk(dir) { return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => { const p = `${dir}/${e.name}`; if (e.isSymbolicLink()) throw Error('Do not package symlinks'); return e.isDirectory() ? walk(p) : [p]; }); }
const paths = ['BUILD_PROMPT.md', 'STARTER_PROMPT.txt', 'README.md', 'QA.md', ...walk('dist'), ...walk('skills')].sort();
const kit = require('../dist/kit.js');
const manifest = { version: kit.version, release: new URL(kit.base).pathname.split('/')[3], baseUrl: kit.base, files: paths.map(file => { const bytes = fs.readFileSync(path.join(root, file)); return { path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; }) };
fs.writeFileSync(path.join(root, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Manifest: ${manifest.files.length} files`);
