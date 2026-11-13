/* Builds every icon from tools/icon-concept.js: the web icons, the opaque iOS icon, and the Android launcher,
 * monochrome (themed) and notification icons. Usage (needs Playwright with Chromium): node tools/make-icons.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const I = require('./icon-concept');
const dir = path.join(__dirname, '..', 'icons');

(async () => {
  const browser = await chromium.launch();
  async function render(source, size, file, opts) {
    opts = opts || {};
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent('<style>html,body{margin:0;background:' + (opts.bg || 'transparent') + '}svg{display:block;width:' + size + 'px;height:' + size + 'px}.r{width:' + size + 'px;height:' + size + 'px;border-radius:50%;overflow:hidden}</style>' + (opts.round ? '<div class="r">' + source + '</div>' : source));
    await page.screenshot({ path: file, omitBackground: !opts.bg });
    await page.close();
  }
  fs.writeFileSync(path.join(dir, 'icon.svg'), I.any() + '\n');
  fs.writeFileSync(path.join(dir, 'favicon.svg'), I.favicon() + '\n');
  await render(I.any(), 192, path.join(dir, 'icon-192.png'));
  await render(I.any(), 512, path.join(dir, 'icon-512.png'));
  await render(I.maskable(), 512, path.join(dir, 'icon-maskable-512.png'), { bg: '#1e3a8a' });
  await render(I.maskable(), 180, path.join(dir, 'apple-touch-icon.png'), { bg: '#1e3a8a' }); // opaque: iOS rounds the corners itself
  await render(I.favicon(), 32, path.join(dir, 'favicon.png'));

  const res = path.join(__dirname, '..', '..', 'android-analyst', 'app', 'src', 'main', 'res');
  if (fs.existsSync(res)) {
    const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    for (const [d, px] of Object.entries(densities)) {
      await render(I.any(), px, path.join(res, 'mipmap-' + d, 'ic_launcher.png'));
      await render(I.maskable(), px, path.join(res, 'mipmap-' + d, 'ic_launcher_round.png'), { round: true });
    }
    await render(I.background(), 432, path.join(res, 'drawable-nodpi', 'ic_launcher_background.png'), { bg: '#1e3a8a' });
    await render(I.foreground(), 432, path.join(res, 'drawable-nodpi', 'ic_launcher_foreground.png'));
    await render(I.monochrome(), 432, path.join(res, 'drawable-nodpi', 'ic_launcher_monochrome.png'));
    const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
      '    <background android:drawable="@drawable/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n' +
      '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n</adaptive-icon>\n';
    fs.mkdirSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true });
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
    fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);
    fs.writeFileSync(path.join(res, 'drawable', 'ic_stat_analyst.xml'), I.notification());
    console.log('Android launcher, monochrome and notification icons written to', res);
  }
  await browser.close();
  console.log('icons written to', dir);
})();
