import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root));

// The precache list in sw.js; install fails if any entry 404s.
function shell() {
  const src = read('sw.js').toString();
  const list = src.match(/const SHELL = \[([\s\S]*?)\];/)[1];
  return [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

test('every precached file exists', () => {
  for (const p of shell()) {
    if (p === './') continue;
    assert.ok(existsSync(new URL(p, root)), `sw.js lists missing file ${p}`);
  }
});

test('every game module and icon is precached', () => {
  const list = new Set(shell());
  for (const f of readdirSync(new URL('js/', root))) assert.ok(list.has(`js/${f}`), `js/${f} is not in sw.js SHELL`);
  for (const f of readdirSync(new URL('icons/', root))) assert.ok(list.has(`icons/${f}`), `icons/${f} is not in sw.js SHELL`);
  for (const p of ['index.html', 'styles.css', 'manifest.json']) assert.ok(list.has(p), p);
});

test('manifest icons exist with the declared sizes', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((i) => i.sizes === '192x192'));
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const [w, h] = pngSize(read(icon.src));
    assert.equal(`${w}x${h}`, icon.sizes, icon.src);
  }
});

test('release notes are newest first and match package.json', async () => {
  const { CHANGELOG, VERSION } = await import('../js/changelog.js');
  assert.equal(JSON.parse(read('package.json')).version, VERSION);
  const nums = CHANGELOG.map((e) => e.version.split('.').map(Number));
  for (let i = 1; i < nums.length; i++) {
    const [a, b] = [nums[i - 1], nums[i]];
    assert.ok(a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))), `${CHANGELOG[i - 1].version} before ${CHANGELOG[i].version}`);
  }
  for (const e of CHANGELOG) assert.ok(e.notes.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.date), e.version);
});

test('index.html links the manifest and the apple touch icon', () => {
  const html = read('index.html').toString();
  assert.match(html, /<link rel="manifest" href="manifest.json">/);
  const apple = html.match(/<link rel="apple-touch-icon" href="([^"]+)">/)[1];
  assert.deepEqual(pngSize(read(apple)), [180, 180]);
});
