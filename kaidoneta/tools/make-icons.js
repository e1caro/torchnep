/* Rebuilds every icon:  node kaidoneta/tools/make-icons.js   (needs Playwright's Chromium)
 * The art is the crew's own badge, icons/badge.jpg ("Road to Bristol · Kaidoneta", a round emblem on black); without
 * it, the crest drawn by K.art.icon in js/art.js.
 * Web: icons/icon-192.png, icon-512.png, icon-maskable-512.png (the badge inside the round safe zone),
 * apple-touch-icon.png (180 px, no transparency: iOS rounds it itself) and favicon.png (32 px).
 * Android (android-kaidoneta/app/src/main/res): the launcher icons of every density, square and round, and the
 * adaptive icon (background, foreground and the one-colour layer Android 13+ tints). */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const out = path.join(ROOT, 'icons');
const res = path.join(ROOT, '..', 'android-kaidoneta', 'app', 'src', 'main', 'res');
const BADGE = path.join(out, 'badge.jpg');
const K = require(path.join(ROOT, 'js', 'art.js'));
let data = '';
const badgeData = () => data || (data = 'data:image/jpeg;base64,' + fs.readFileSync(BADGE).toString('base64'));

// One icon as HTML: the art in a size x size box. tile: 'round' (rounded square), 'circle', 'square' or 'none'
// (transparent around the art); scale shrinks the art around the centre; mono: a one-colour silhouette.
function art(size, tile, scale, mono) {
  const radius = tile === 'circle' ? '50%' : tile === 'round' ? '22%' : '0';
  const inner = Math.round(size * scale);
  const pic = fs.existsSync(BADGE)
    ? `<img src="${badgeData()}" style="width:${inner}px;height:${inner}px;border-radius:50%;display:block">`
    : K.art.icon(false, 1).replace('<svg ', `<svg width="${inner}" height="${inner}" `);
  const monoCss = mono ? 'filter:grayscale(1) brightness(1.6) contrast(3);mix-blend-mode:screen;' : '';
  const bg = tile === 'none' ? 'transparent' : '#000';
  return `<div style="width:${size}px;height:${size}px;background:${bg};border-radius:${radius};overflow:hidden;display:grid;place-items:center;${monoCss}">${pic}</div>`;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  async function png(file, size, html, transparent) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
    await p.waitForLoadState('load');
    await p.waitForTimeout(80);
    await p.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await png(path.join(out, 'icon-192.png'), 192, art(192, 'round', 1), true);
  await png(path.join(out, 'icon-512.png'), 512, art(512, 'round', 1), true);
  await png(path.join(out, 'icon-maskable-512.png'), 512, art(512, 'square', 0.84), false);
  await png(path.join(out, 'apple-touch-icon.png'), 180, art(180, 'square', 1), false);
  await png(path.join(out, 'favicon.png'), 32, art(32, 'circle', 1), true);
  fs.writeFileSync(path.join(out, 'icon.svg'), fs.existsSync(BADGE)
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><clipPath id="c"><rect width="512" height="512" rx="112"/></clipPath><image clip-path="url(#c)" width="512" height="512" href="badge.jpg"/></svg>\n`
    : K.art.icon(true, 0.92));
  console.log('web icons written to', path.relative(process.cwd(), out));

  if (fs.existsSync(path.dirname(res))) {
    const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    for (const [d, px] of Object.entries(densities)) {
      await png(path.join(res, 'mipmap-' + d, 'ic_launcher.png'), px, art(px, 'round', 1), true);
      await png(path.join(res, 'mipmap-' + d, 'ic_launcher_round.png'), px, art(px, 'circle', 1), true);
    }
    // adaptive icon: 108 dp layers of which only the middle 66 dp is always visible; the badge sits inside it
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_background.png'), 432, '<div style="width:432px;height:432px;background:#000"></div>', false);
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_foreground.png'), 432, art(432, 'none', 0.7), true);
    // the themed (one-colour) layer only uses transparency: the badge's light parts become the shape
    const mono = !fs.existsSync(BADGE) ? null : await p.evaluate(async (src) => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = 432;
      const g = c.getContext('2d'), sz = 432 * 0.7, o = (432 - sz) / 2;
      g.beginPath(); g.arc(216, 216, sz / 2, 0, Math.PI * 2); g.clip(); g.drawImage(img, o, o, sz, sz);
      const d = g.getImageData(0, 0, 432, 432), px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        const l = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
        px[i + 3] = Math.min(px[i + 3], Math.max(0, Math.min(255, (l - 60) * 2.2)));
        px[i] = px[i + 1] = px[i + 2] = 255;
      }
      g.putImageData(d, 0, 0);
      return c.toDataURL('image/png');
    }, badgeData());
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_monochrome.png'), 432, mono ? `<img src="${mono}" style="display:block">` : art(432, 'none', 0.7, true), true);
    const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
      '    <background android:drawable="@drawable/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n' +
      '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n</adaptive-icon>\n';
    fs.mkdirSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);
    console.log('Android launcher icons written to', path.relative(process.cwd(), res));
  }
  await b.close();
})();
