/* Renders icons/icon.svg to the PNG sizes the manifest and iOS need.
 * Usage (needs Playwright with Chromium): node tools/make-icons.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'icons');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
// A maskable icon must keep its content inside the central 80% (platforms crop the corners): full-bleed background, smaller artwork.
const maskable = svg.replace('rx="112"', 'rx="0"').replace('<rect x="112"', '<g transform="translate(256 256) scale(.78) translate(-256 -256)"><rect x="112"').replace('</svg>', '</g></svg>');

(async () => {
  const browser = await chromium.launch();
  async function render(source, size, file, transparent) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:' + size + 'px;height:' + size + 'px}</style>' + source);
    await page.screenshot({ path: path.join(dir, file), omitBackground: transparent });
    await page.close();
  }
  await render(svg, 192, 'icon-192.png', true);
  await render(svg, 512, 'icon-512.png', true);
  await render(maskable, 512, 'icon-maskable-512.png', false);
  await render(maskable, 180, 'apple-touch-icon.png', false); // iOS rounds the corners itself
  await render(svg, 32, 'favicon.png', true);
  await browser.close();
  console.log('icons written to', dir);
})();
