/* Renders icons/icon.svg into the PNG icons the manifest and iOS need (needs Playwright):  node tools/make-icons.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const dir = path.join(__dirname, '..', 'icons');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['apple-touch-icon.png', 180, 0], ['icon-maskable-512.png', 512, 0.1], ['favicon.png', 64, 0]];
  for (const [name, size, pad] of out) {
    await page.setViewportSize({ width: size, height: size });
    const inner = Math.round(size * (1 - 2 * pad));
    // the maskable icon keeps its drawing inside the safe circle, on a felt-coloured square
    await page.setContent(`<html><body style="margin:0;background:${pad ? '#0c5434' : 'transparent'};display:grid;place-items:center;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
    await page.screenshot({ path: path.join(dir, name), omitBackground: !pad });
  }
  await browser.close();
  console.log('icons written');
})();
