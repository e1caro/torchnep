/* Rebuilds every icon:  node kaidoneta/tools/make-icons.js   (needs Playwright's Chromium)
 * The art is K.art.icon(rounded, scale) from js/art.js, or from js/art-badge.js when it exists (the crew's
 * "Road to Bristol" badge, which then wins).
 * Web: icons/icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png (full-bleed, art inside the safe zone),
 * apple-touch-icon.png (180 px, no transparency: iOS rounds it itself) and favicon.png (32 px).
 * Android (android-kaidoneta/app/src/main/res): the launcher icons of every density, square and round, and the
 * adaptive icon (background, foreground and the one-colour layer Android 13+ tints). */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const JS = path.join(__dirname, '..', 'js');
const K = require(path.join(JS, 'art.js'));
if (!process.env.NO_BADGE && fs.existsSync(path.join(JS, 'art-badge.js'))) require(path.join(JS, 'art-badge.js'));
const out = path.join(__dirname, '..', 'icons');
const res = path.join(__dirname, '..', '..', 'android-kaidoneta', 'app', 'src', 'main', 'res');
fs.mkdirSync(out, { recursive: true });

const icon = (rounded, scale) => K.art.icon(rounded, scale);
// the art alone, without the square tile behind it: the foreground layer of Android's adaptive icon
const fg = (scale) => icon(false, scale).replace(/<rect width="512" height="512"[^>]*\/>/, '');

(async () => {
  fs.writeFileSync(path.join(out, 'icon.svg'), icon(true, 0.92));
  const b = await chromium.launch();
  const p = await b.newPage();
  async function png(file, size, svg, transparent, extraCss) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px;${extraCss || ''}}</style>${svg}`);
    await p.waitForTimeout(50);
    await p.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await png(path.join(out, 'icon-192.png'), 192, icon(true, 0.92), true);
  await png(path.join(out, 'icon-512.png'), 512, icon(true, 0.92), true);
  await png(path.join(out, 'icon-maskable-512.png'), 512, icon(false, 0.74), false);
  await png(path.join(out, 'apple-touch-icon.png'), 180, icon(false, 0.86), false);
  await png(path.join(out, 'favicon.png'), 32, icon(true, 1), true);
  console.log('web icons written to', path.relative(process.cwd(), out));

  if (fs.existsSync(path.dirname(res))) {
    const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    for (const [d, px] of Object.entries(densities)) {
      await png(path.join(res, 'mipmap-' + d, 'ic_launcher.png'), px, icon(true, 0.92), true);
      await png(path.join(res, 'mipmap-' + d, 'ic_launcher_round.png'), px, icon(false, 0.8), true, 'border-radius:50%');
    }
    // adaptive icon: 108 dp layers of which only the middle 66 dp is always visible
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_background.png'), 432, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#3b1676"/><stop offset="1" stop-color="#12081f"/></radialGradient></defs><rect width="512" height="512" fill="url(#g)"/></svg>', false);
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_foreground.png'), 432, fg(0.62), true);
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_monochrome.png'), 432, fg(0.62), true, 'filter:brightness(0)');
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
