// Draws the app icons (web app and Android) from one SVG, with Playwright: node fitai-app/tools/make_icons.js
const { chromium } = require('playwright');
// FitQuest icon in the Minimal look: a blue dumbbell on a soft dark tile
// a quest scroll (parchment with rolled ends) carrying the dumbbell: training, but as a game
const glyph = (s) => `<g transform="translate(256 256) scale(${s}) translate(-256 -256)">
  <rect x="132" y="138" width="248" height="236" rx="10" fill="#e9dcc0"/>
  <rect x="132" y="138" width="248" height="236" rx="10" fill="url(#pp)"/>
  <rect x="104" y="112" width="304" height="44" rx="22" fill="#cdbb95"/><rect x="104" y="112" width="304" height="16" rx="8" fill="#e2d3b2"/>
  <circle cx="114" cy="134" r="14" fill="#a8946c"/><circle cx="398" cy="134" r="14" fill="#a8946c"/>
  <rect x="104" y="356" width="304" height="44" rx="22" fill="#cdbb95"/><rect x="104" y="356" width="304" height="16" rx="8" fill="#e2d3b2"/>
  <circle cx="114" cy="378" r="14" fill="#a8946c"/><circle cx="398" cy="378" r="14" fill="#a8946c"/>
  <g transform="translate(256 256) scale(.62) translate(-256 -256)" fill="#5a78f0">
    <rect x="96" y="176" width="44" height="160" rx="18"/><rect x="146" y="206" width="34" height="100" rx="14"/>
    <rect x="372" y="176" width="44" height="160" rx="18"/><rect x="332" y="206" width="34" height="100" rx="14"/>
    <rect x="176" y="240" width="160" height="32" rx="16"/></g></g>`;
const tile = (r, s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1f28"/><stop offset="1" stop-color="#0e1014"/></linearGradient><linearGradient id="pp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".15" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs>
  <rect width="512" height="512" rx="${r}" fill="url(#g)"/>${glyph(s)}</svg>`;
const fs = require('fs');
const out = require('path').join(__dirname, '../icons/');
const jobs = [['icon-192.png', 192, tile(112, 1)], ['icon-512.png', 512, tile(112, 1)], ['icon-maskable-512.png', 512, tile(0, .78)], ['apple-touch-icon.png', 180, tile(0, .9)], ['favicon.png', 64, tile(112, 1.1)]];
const and = require('path').join(__dirname, '../../android/app/src/main/res/');
[['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].forEach(([d, px]) => { jobs.push([and + `mipmap-${d}/ic_launcher.png`, px, tile(112, 1)]); jobs.push([and + `mipmap-${d}/ic_launcher_round.png`, px, tile(256, .9)]); });

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [f, px, svg] of jobs) {
    const path = f.startsWith('/') ? f : out + f;
    fs.mkdirSync(require('path').dirname(path), { recursive: true });
    await p.setViewportSize({ width: px, height: px });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body></html>`);
    await p.screenshot({ path, omitBackground: true });
  }
  await b.close();
})();
