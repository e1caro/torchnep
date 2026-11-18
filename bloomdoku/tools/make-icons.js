/* Rebuilds every icon from the one drawing below:  node tools/make-icons.js   (needs Playwright's Chromium)
 * icons/icon.svg (any size), icon-192.png, icon-512.png, icon-maskable-512.png (full-bleed, art in the safe zone),
 * apple-touch-icon.png (180 px, no transparency: iOS adds its own rounded mask) and favicon.png (32 px). */
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

(async () => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'icon.svg'), art(true, 1));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  async function png(name, size, svg, transparent) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    await page.screenshot({ path: path.join(out, name), omitBackground: transparent });
  }
  await png('icon-192.png', 192, art(true, 1), true);
  await png('icon-512.png', 512, art(true, 1), true);
  await png('icon-maskable-512.png', 512, art(false, 0.82), false);
  await png('apple-touch-icon.png', 180, art(false, 0.94), false);
  await png('favicon.png', 32, art(true, 1), true);
  await browser.close();
  console.log('icons written to', out);
})();
