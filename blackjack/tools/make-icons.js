/* Draws every icon from icons/icon.svg (needs Playwright):  node tools/make-icons.js
 * Web (icons/): the PNGs the manifest and iOS need.
 * Android (../android-blackjack/app/src/main/res): launcher icons of every density, square and round, and the
 * adaptive layers (felt background, the two cards in front, and the one-colour layer for themed icons). */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const dir = path.join(__dirname, '..', 'icons');
const res = path.join(__dirname, '..', '..', 'android-blackjack', 'app', 'src', 'main', 'res');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
const FELT = '<rect width="512" height="512" rx="112" fill="url(#felt)"/>';
const cardsOnly = svg.replace(FELT, ''); // the two cards without the felt square
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

  // web
  for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon.png', 64]]) {
    await png(path.join(dir, name), size, box(size, size, sized(svg, size)), true);
  }
  // maskable: the drawing inside the safe circle, on felt
  await png(path.join(dir, 'icon-maskable-512.png'), 512, box(512, 410, sized(svg, 410), 'background:#0c5434'), false);

  // Android
  const feltBg = 'background:radial-gradient(circle at 50% 38%,#1c8f55,#0c5434 60%,#063a23)';
  for (const [d, px] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
    await png(path.join(res, 'mipmap-' + d, 'ic_launcher.png'), px, box(px, px, sized(svg, px)), true);
    await png(path.join(res, 'mipmap-' + d, 'ic_launcher_round.png'), px, box(px, Math.round(px * 0.92), sized(cardsOnly, Math.round(px * 0.92)), feltBg + ';border-radius:50%'), true);
  }
  await png(path.join(res, 'drawable-nodpi', 'ic_launcher_background.png'), 432, `<div style="width:432px;height:432px;${feltBg}"></div>`, false);
  await png(path.join(res, 'drawable-nodpi', 'ic_launcher_foreground.png'), 432, box(432, 300, sized(cardsOnly, 300)), true);
  await png(path.join(res, 'drawable-nodpi', 'ic_launcher_monochrome.png'), 432, box(432, 300, sized(cardsOnly, 300), 'filter:brightness(0)'), true);
  const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    '    <background android:drawable="@drawable/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n' +
    '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n</adaptive-icon>\n';
  fs.mkdirSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);
  await browser.close();
  console.log('icons written');
})();
