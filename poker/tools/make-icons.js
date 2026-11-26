/* Draws every icon from icons/icon.svg (needs Playwright):  node tools/make-icons.js
 * Web (icons/): the PNGs the manifest and iOS need.
 * Android (../android-poker/app/src/main/res): launcher icons of every density, square and round, and the adaptive
 * layers (the petrol background, the chip in front, and the one-colour layer for themed icons).
 * Windows (../desktop-poker/winres/icon.png): the program's icon. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const dir = path.join(__dirname, '..', 'icons');
const res = path.join(__dirname, '..', '..', 'android-poker', 'app', 'src', 'main', 'res');
const winres = path.join(__dirname, '..', '..', 'desktop-poker', 'winres');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
const TILE = '<rect id="tile" width="512" height="512" rx="112" fill="url(#bg)"/>';
if (!svg.includes(TILE)) throw new Error('icon.svg: the background tile is not where it was');
const chipOnly = svg.replace(TILE, '');
const sized = (s, px) => s.replace('<svg ', `<svg width="${px}" height="${px}" `);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  async function png(file, size, body, transparent) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${body}</body></html>`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  }
  const box = (size, inner, html, extra) => `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;overflow:hidden;${extra || ''}"><div style="width:${inner}px;height:${inner}px">${html}</div></div>`;
  const bg = 'background:radial-gradient(circle at 50% 36%,#1d5a66,#12404d 55%,#0b2a34)';

  for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon.png', 64]]) {
    await png(path.join(dir, name), size, box(size, size, sized(svg, size)), true);
  }
  await png(path.join(dir, 'icon-maskable-512.png'), 512, box(512, 400, sized(chipOnly, 400), bg), false);

  for (const [d, px] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
    await png(path.join(res, 'mipmap-' + d, 'ic_launcher.png'), px, box(px, px, sized(svg, px)), true);
    await png(path.join(res, 'mipmap-' + d, 'ic_launcher_round.png'), px, box(px, Math.round(px * 0.94), sized(chipOnly, Math.round(px * 0.94)), bg + ';border-radius:50%'), true);
  }
  await png(path.join(res, 'drawable-nodpi', 'ic_launcher_background.png'), 432, `<div style="width:432px;height:432px;${bg}"></div>`, false);
  await png(path.join(res, 'drawable-nodpi', 'ic_launcher_foreground.png'), 432, box(432, 290, sized(chipOnly, 290)), true);
  await png(path.join(res, 'drawable-nodpi', 'ic_launcher_monochrome.png'), 432, box(432, 290, sized(chipOnly, 290), 'filter:brightness(0)'), true);
  const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    '    <background android:drawable="@drawable/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n' +
    '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n</adaptive-icon>\n';
  fs.mkdirSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);

  await png(path.join(winres, 'icon.png'), 256, box(256, 256, sized(svg, 256)), true);
  await browser.close();
  console.log('icons written');
})();
