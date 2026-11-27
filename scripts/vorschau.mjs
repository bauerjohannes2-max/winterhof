// Handy-Vorschau hochladen (Hannes 24.11.: WLAN-Link scheitert an der Firmen-Firewall).
// Baut das Spiel und legt den Stand von dist/ als einzigen Commit auf den Zweig gh-pages
// von winterhof-vorschau. Feste Adresse: https://bauerjohannes2-max.github.io/winterhof-vorschau/
// Live-Spiel (winterhof) bleibt eingefroren (Entscheidung 15).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = 'https://github.com/bauerjohannes2-max/winterhof-vorschau.git';
const URL = 'https://bauerjohannes2-max.github.io/winterhof-vorschau/';
const root = process.cwd();
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: false });
const out = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim();

run(process.execPath, ['./scripts/schatten_backen.mjs']);
run(process.execPath, ['./node_modules/@assetpack/core/bin/index.js']);
run(process.execPath, ['./node_modules/vite/bin/vite.js', 'build']);

const dist = path.join(root, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html fehlt');

const commit = out('git', ['rev-parse', '--short', 'HEAD']);
const authorName = out('git', ['log', '-1', '--format=%an']);
const authorEmail = out('git', ['log', '-1', '--format=%ae']);
const dirty = out('git', ['status', '--porcelain', '--', 'src', 'index.html']) ? '+lokal' : '';
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
fs.writeFileSync(path.join(dist, 'version.txt'), `${commit}${dirty} ${stamp}\n`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'winterhof-vorschau-'));
try {
  fs.cpSync(dist, tmp, { recursive: true });
  run('git', ['init', '-q', '-b', 'gh-pages'], tmp);
  run('git', ['config', 'core.autocrlf', 'false'], tmp);
  run('git', ['add', '-A'], tmp);
  run('git', ['-c', `user.name=${authorName}`, '-c', `user.email=${authorEmail}`, 'commit', '-q', '-m', `Vorschau ${commit}${dirty} ${stamp}`], tmp);
  run('git', ['push', '-q', '-f', REPO, 'gh-pages'], tmp);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`\nVorschau hochgeladen (${commit}${dirty}). In 1–2 Minuten unter ${URL}`);
