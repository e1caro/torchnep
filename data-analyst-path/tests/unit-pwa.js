'use strict';
/* Static checks on the installable-app files: the service worker's file list and version must match
 * the files on disk (run `python3 tools/update-sw.py` if this fails), and everything referenced must exist. */
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { root, test } = require('./harness');

function shellFiles() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.isDirectory()) { if (!['tests', 'tools', '.git', 'node_modules'].includes(e.name)) walk(path.join(dir, e.name)); }
      else if (!['sw.js', 'README.md', '.DS_Store'].includes(e.name)) out.push(path.relative(root, path.join(dir, e.name)).split(path.sep).join('/'));
    }
  })(root);
  return out.sort();
}

test('service worker lists every site file and its version matches the content', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const listed = [...sw.match(/\/\* BEGIN SHELL \*\/([\s\S]*?)\/\* END SHELL \*\//)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const files = shellFiles();
  assert.deepStrictEqual(listed, ['./'].concat(files), 'sw.js is out of date: run python3 tools/update-sw.py');
  const h = crypto.createHash('sha256');
  files.forEach((f) => { h.update(f); h.update(fs.readFileSync(path.join(root, f))); });
  assert.strictEqual(sw.match(/const VERSION = '([^']+)'/)[1], 'dap-' + h.digest('hex').slice(0, 10), 'sw.js version is stale: run python3 tools/update-sw.py');
});

test('manifest is complete and its files exist', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.ok(m.name && m.short_name && m.start_url && m.scope && m.display === 'standalone');
  assert.ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512') && m.icons.some((i) => i.purpose === 'maskable'));
  m.icons.forEach((i) => assert.ok(fs.existsSync(path.join(root, i.src)), 'missing icon ' + i.src));
  assert.ok(fs.existsSync(path.join(root, m.start_url)));
  (m.shortcuts || []).forEach((s) => assert.ok(fs.existsSync(path.join(root, s.url.split('#')[0].replace(/^\.\//, '')))));
});

function png(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('latin1', 1, 4), 'PNG', file + ' is a PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

test('icons: one concept everywhere, opaque iOS icon, Android themed (monochrome) and notification icons', () => {
  const I = require(path.join(root, 'tools', 'icon-concept.js'));
  assert.strictEqual(fs.readFileSync(path.join(root, 'icons', 'icon.svg'), 'utf8').trim(), I.any(), 'icons/icon.svg comes from tools/icon-concept.js');
  assert.strictEqual(fs.readFileSync(path.join(root, 'icons', 'favicon.svg'), 'utf8').trim(), I.favicon());
  [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180], ['favicon.png', 32]].forEach(([f, n]) => {
    const p = png(path.join(root, 'icons', f));
    assert.ok(p.w === n && p.h === n, f + ' is ' + n + 'px');
  });
  assert.strictEqual(png(path.join(root, 'icons', 'apple-touch-icon.png')).colorType, 2, 'apple-touch-icon.png has no alpha channel');
  assert.strictEqual(png(path.join(root, 'icons', 'icon-maskable-512.png')).colorType, 2, 'the maskable icon is full-bleed');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('href="icons/favicon.svg"') && html.includes('href="icons/apple-touch-icon.png"'));
  assert.strictEqual((html.match(/name="theme-color"/g) || []).length, 2, 'theme colours for light and dark');
  const res = path.join(root, '..', 'android-analyst', 'app', 'src', 'main', 'res');
  if (!fs.existsSync(res)) return;
  ['ic_launcher.xml', 'ic_launcher_round.xml'].forEach((f) => {
    const x = fs.readFileSync(path.join(res, 'mipmap-anydpi-v26', f), 'utf8');
    ['background', 'foreground', 'monochrome'].forEach((layer) => assert.ok(x.includes('<' + layer + ' android:drawable="@drawable/ic_launcher_' + layer + '"'), f + ' has a ' + layer + ' layer'));
  });
  ['background', 'foreground', 'monochrome'].forEach((layer) => assert.strictEqual(png(path.join(res, 'drawable-nodpi', 'ic_launcher_' + layer + '.png')).w, 432));
  Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }).forEach(([d, n]) => ['ic_launcher.png', 'ic_launcher_round.png'].forEach((f) => assert.strictEqual(png(path.join(res, 'mipmap-' + d, f)).w, n, d + ' ' + f)));
  const note = fs.readFileSync(path.join(res, 'drawable', 'ic_stat_analyst.xml'), 'utf8');
  assert.strictEqual(note, I.notification(), 'the notification icon comes from the concept');
  assert.ok(/android:pathData="[MHVAZ0-9., ]+"/.test(note) && note.includes('evenOdd'), 'notification icon: one white path with the eyes cut out');
  ['values', 'values-night'].forEach((v) => assert.ok(/<color name="brand">#[0-9a-f]{6}<\/color>/.test(fs.readFileSync(path.join(res, v, 'colors.xml'), 'utf8')), v + ' brand colour'));
});

test('index.html loads only files that exist, and loads every script', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css|png|svg|webmanifest))"/g)].map((m) => m[1]);
  assert.ok(refs.length > 15);
  refs.forEach((r) => assert.ok(fs.existsSync(path.join(root, r)), 'index.html references a missing file: ' + r));
  const jsFiles = [];
  (function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { if (e.isDirectory()) walk(path.join(d, e.name)); else if (e.name.endsWith('.js')) jsFiles.push(path.relative(root, path.join(d, e.name)).split(path.sep).join('/')); }); })(path.join(root, 'js'));
  jsFiles.forEach((f) => assert.ok(refs.includes(f), f + ' is not loaded by index.html'));
});

test('every user-facing page has a route and a view', () => {
  const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  const routes = [...app.match(/var routes = \{([^}]*)\}/)[1].matchAll(/(\w+|'')\s*:\s*'(\w+)'/g)].map((m) => m[2]);
  const views = fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('');
  routes.forEach((r) => assert.ok(new RegExp('V\\.' + r + '\\s*=|views\\.' + r + '\\s*=').test(views), 'no view defined for route ' + r));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  [...html.matchAll(/href="#\/(\w*)/g)].forEach((m) => assert.ok(routes.includes(m[1] || 'home') || m[1] === '', 'nav links to unknown route ' + m[1]));
});

test('swiping down at the top cannot stretch or reload the page', () => {
  const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
  assert.ok(/html,\s*body\s*\{\s*overscroll-behavior-y:\s*none/.test(css), 'html and body must set overscroll-behavior-y: none');
  const java = fs.readFileSync(path.join(root, '..', 'android-analyst/app/src/main/java/io/github/e1caro/analystpath/MainActivity.java'), 'utf8');
  assert.ok(java.includes('OVER_SCROLL_NEVER'), 'the Android WebView must disable over-scroll');
});
