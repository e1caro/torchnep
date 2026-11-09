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

  // Android launcher icons (android-analyst/): legacy square + round PNGs for every density, and the adaptive layers.
  const res = path.join(__dirname, '..', '..', 'android-analyst', 'app', 'src', 'main', 'res');
  if (fs.existsSync(res)) {
    const gradient = svg.match(/<defs>[\s\S]*?<\/defs>/)[0];
    const art = svg.match(/(<rect x="112"[\s\S]*?)<\/svg>/)[1];
    const layer = (inner) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' + inner + '</svg>';
    const background = layer(gradient + '<rect width="512" height="512" fill="url(#g)"/>');
    const foreground = layer('<g transform="translate(256 256) scale(.6) translate(-256 -256)">' + art + '</g>');
    async function renderTo(file, html, size, transparent) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
      await page.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:' + size + 'px;height:' + size + 'px}.r{width:' + size + 'px;height:' + size + 'px;border-radius:50%;overflow:hidden}</style>' + html);
      await page.screenshot({ path: file, omitBackground: transparent });
      await page.close();
    }
    const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    for (const [d, px] of Object.entries(densities)) {
      await renderTo(path.join(res, 'mipmap-' + d, 'ic_launcher.png'), svg, px, true);
      await renderTo(path.join(res, 'mipmap-' + d, 'ic_launcher_round.png'), '<div class="r">' + maskable + '</div>', px, true);
    }
    await renderTo(path.join(res, 'drawable-nodpi', 'ic_launcher_background.png'), background, 432, false);
    await renderTo(path.join(res, 'drawable-nodpi', 'ic_launcher_foreground.png'), foreground, 432, true);
    const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@drawable/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n</adaptive-icon>\n';
    fs.mkdirSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);
    console.log('Android launcher icons written to', res);
  }
  await browser.close();
  console.log('icons written to', dir);
})();
