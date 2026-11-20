/* Rebuilds every icon from the crest in js/art.js:  node kaidoneta/tools/make-icons.js   (needs Playwright's Chromium)
 * icons/icon.svg (any size), icon-192.png, icon-512.png, icon-maskable-512.png (full-bleed, art inside the safe zone),
 * apple-touch-icon.png (180 px, no transparency: iOS rounds it itself) and favicon.png (32 px). */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const K = require(path.join(__dirname, '..', 'js', 'art.js'));
const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });

const jobs = [
  ['icon-192.png', 192, true, 0.92],
  ['icon-512.png', 512, true, 0.92],
  ['icon-maskable-512.png', 512, false, 0.74],
  ['apple-touch-icon.png', 180, false, 0.86],
  ['favicon.png', 32, true, 1],
];
fs.writeFileSync(path.join(out, 'icon.svg'), K.art.icon(true, 0.92));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [name, size, rounded, scale] of jobs) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${K.art.icon(rounded, scale).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await p.screenshot({ path: path.join(out, name), omitBackground: rounded, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('icons/' + name);
  }
  await b.close();
})();
