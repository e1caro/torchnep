/* Rebuilds every icon from the one drawing below:  node tools/make-icons.js   (needs Playwright's Chromium)
 * Web: icons/icon.svg (any size), icon-192.png, icon-512.png, icon-maskable-512.png (full-bleed, art in the safe
 * zone), apple-touch-icon.png (180 px, no transparency: iOS adds its own rounded mask) and favicon.png (32 px).
 * Android (android-bloomdoku/app/src/main/res): the launcher icons of every density, square and round, and the
 * adaptive icon (background, foreground and the one-colour layer Android 13+ tints). */
'use strict';
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'icons');

// A 3×3 garden bed with one flower in bloom. `scale` shrinks the art into the maskable safe zone.
function art(rounded, scale) {
  const petal = (a) => `<ellipse cx="256" cy="204" rx="38" ry="46" fill="#F78FB0" transform="rotate(${a} 256 256)"/>`;
  const cells = [];
  const tint = ['#CDEBD8', '#FFFFFF', '#CDEBD8', '#FFFFFF', '#FFF3C4', '#FFFFFF', '#CDEBD8', '#FFFFFF', '#CDEBD8'];
  for (let i = 0; i < 9; i++) {
    const x = 96 + (i % 3) * 110, y = 96 + Math.floor(i / 3) * 110;
    cells.push(`<rect x="${x}" y="${y}" width="100" height="100" rx="24" fill="${tint[i]}"/>`);
  }
  const dot = (i, c) => `<circle cx="${146 + (i % 3) * 110}" cy="${146 + Math.floor(i / 3) * 110}" r="17" fill="${c}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="#F2668B"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="76" y="76" width="360" height="360" rx="44" fill="#3B2A4A"/>
    ${cells.join('')}
    ${dot(0, '#4D9DE8')}${dot(2, '#F28A2E')}${dot(6, '#8C6FE0')}${dot(8, '#4FB06D')}
    ${[0, 72, 144, 216, 288].map(petal).join('')}
    <circle cx="256" cy="256" r="26" fill="#FFE08A"/><circle cx="256" cy="256" r="10" fill="#F2668B"/>
  </g>
</svg>
`;
}

// The same drawing in one colour, for the themed icon of Android 13+ (only its shape counts).
function mono(scale) {
  const petal = (a) => `<ellipse cx="256" cy="204" rx="38" ry="46" transform="rotate(${a} 256 256)"/>`;
  const cells = [];
  for (let i = 0; i < 9; i++) if (i !== 4) cells.push(`<rect x="${96 + (i % 3) * 110}" y="${96 + Math.floor(i / 3) * 110}" width="100" height="100" rx="24" opacity=".45"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g fill="#000" transform="translate(256 256) scale(${scale}) translate(-256 -256)">${cells.join('')}${[0, 72, 144, 216, 288].map(petal).join('')}<circle cx="256" cy="256" r="26"/></g></svg>`;
}
// Only the drawing, no pink square behind it: the foreground layer of the adaptive icon.
function foreground(scale) { return art(false, scale).replace(/<rect width="512" height="512"[^>]*\/>/, ''); }

(async () => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'icon.svg'), art(true, 1));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  async function png(file, size, svg, transparent, round) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px;${round ? 'border-radius:50%' : ''}}</style>${svg}`);
    await page.screenshot({ path: file, omitBackground: transparent });
  }
  await png(path.join(out, 'icon-192.png'), 192, art(true, 1), true);
  await png(path.join(out, 'icon-512.png'), 512, art(true, 1), true);
  await png(path.join(out, 'icon-maskable-512.png'), 512, art(false, 0.82), false);
  await png(path.join(out, 'apple-touch-icon.png'), 180, art(false, 0.94), false);
  await png(path.join(out, 'favicon.png'), 32, art(true, 1), true);
  console.log('web icons written to', out);

  const res = path.join(__dirname, '..', '..', 'android-bloomdoku', 'app', 'src', 'main', 'res');
  if (fs.existsSync(res)) {
    const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    for (const [d, px] of Object.entries(densities)) {
      await png(path.join(res, 'mipmap-' + d, 'ic_launcher.png'), px, art(true, 1), true);
      await png(path.join(res, 'mipmap-' + d, 'ic_launcher_round.png'), px, art(false, 0.8), true, true);
    }
    // adaptive icon: 108 dp layers of which only the middle 66 dp is always visible
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_background.png'), 432, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#F2668B"/></svg>', false);
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_foreground.png'), 432, foreground(0.6), true);
    await png(path.join(res, 'drawable-nodpi', 'ic_launcher_monochrome.png'), 432, mono(0.6), true);
    const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
      '    <background android:drawable="@drawable/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n' +
      '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n</adaptive-icon>\n';
    fs.mkdirSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);
    console.log('Android launcher icons written to', res);
  }
  await browser.close();
})();
