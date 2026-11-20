/* End-to-end run of Kaidoneta in Chromium at phone sizes:  node kaidoneta/tests/e2e.js [outDir]
 * Serves the folder, goes through onboarding, adds friends, logs rounds (a win, a loss, friendly fire), opens the
 * Bounty Board, the Meta, a pirate's sheet, the tools and the crew page, takes screenshots, and fails on any
 * console error or sideways scrolling. The online crew is not contacted (requests to it are answered offline). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'kaidoneta-e2e');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html'));
      if (!p.startsWith(ROOT) || !fs.existsSync(p)) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

const problems = [];
async function run(browser, base, size, name) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${name}: console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${name}: pageerror: ${e.message}`));
  const shot = async (n) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    if (w > size.width + 1) problems.push(`${name}/${n}: sideways scroll (${w} > ${size.width})`);
    await page.screenshot({ path: path.join(OUT, `${name}-${n}.png`) });
  };
  const tap = (sel) => page.locator(sel).first().click();

  await page.goto(base + 'index.html');
  await page.waitForTimeout(500);
  await shot('01-onboarding');

  // my pirate
  await tap('[data-act="start"]');
  await page.fill('#mb-name', 'Javi');
  await shot('02-my-pirate');
  await tap('.sheet [data-ok]');
  await page.waitForTimeout(400);

  // two friends
  await tap('[data-tab="crew"]');
  for (const f of ['Ana', 'Leo']) {
    await tap('[data-act="addMember"]');
    await page.fill('#mb-name', f);
    await tap('.sheet [data-ok]');
    await page.waitForTimeout(350);
  }
  await tap('[data-tab="home"]');
  await page.waitForTimeout(300);
  await shot('03-home');

  // R1: Javi beats Enel (yellow) going second
  await tap('.hero-me [data-act="log"]');
  await page.waitForTimeout(300);
  await tap('.sheet [data-g="color"][data-v="yellow"]');
  await page.fill('#lg-name', 'Enel');
  await tap('.sheet [data-g="res"][data-v="W"]');
  await tap('.sheet [data-g="first"][data-v="0"]');
  await shot('04-log-sheet');
  await tap('.sheet [data-save]');
  await page.waitForTimeout(700);
  await shot('05-win-moment');
  await page.waitForTimeout(2800);

  // R1 for Ana: loss to Luffy (red); via the purple button
  await tap('.tab-log');
  await tap('.sheet [data-g="mem"][data-v]:not(.on)');
  await tap('.sheet [data-g="color"][data-v="red"]');
  await page.fill('#lg-name', 'Monkey.D.Luffy');
  await tap('.sheet [data-g="res"][data-v="L"]');
  await tap('.sheet [data-save]');
  await page.waitForTimeout(2600);

  // R2: Javi vs Ana, friendly fire, Javi wins
  await tap('.hero-me [data-act="log"]');
  await tap('.sheet [data-g="kind"][data-v="crew"]');
  await tap('#lg-crew [data-g="oppMem"]');
  await tap('.sheet [data-g="res"][data-v="W"]');
  await tap('.sheet [data-save]');
  await page.waitForTimeout(2900);

  // a reaction
  await tap('[data-act="react"][data-emoji="🔥"]');
  await page.waitForTimeout(200);
  await shot('06-feed');
  await page.evaluate(() => window.scrollTo(0, 0));

  await tap('[data-tab="board"]');
  await page.waitForTimeout(500);
  await shot('07-bounty-board');
  await tap('.poster.top');
  await page.waitForTimeout(500);
  await shot('08-player');
  await page.evaluate(() => { const s = document.querySelector('.sheet'); s.scrollTop = s.scrollHeight; });
  await shot('09-player-bottom');
  await page.goBack(); // the phone's back button closes the sheet
  await page.waitForTimeout(300);
  if (await page.locator('.sheet').count()) problems.push(`${name}: back button did not close the sheet`);

  await tap('[data-tab="meta"]');
  await page.waitForTimeout(400);
  await shot('10-meta');

  await tap('[data-tab="home"]');
  await tap('[data-act="timer"]');
  await tap('#tm-go');
  await page.waitForTimeout(1200);
  await shot('11-timer');
  await tap('.sheet [data-act="close"]');
  await page.waitForTimeout(300);
  await tap('.tools [data-act="dice"]');
  await tap('.sheet [data-roll]');
  await page.waitForTimeout(1300);
  await shot('12-dice');
  await tap('.sheet [data-act="close"]');
  await page.waitForTimeout(300);
  await tap('[data-act="kit"]');
  await tap('.sheet [data-k="deck"]');
  await tap('.sheet [data-k="don"]');
  await shot('13-kit');
  await tap('.sheet [data-act="close"]');
  await page.waitForTimeout(300);

  await tap('[data-tab="crew"]');
  await page.waitForTimeout(300);
  await shot('14-crew');

  // data checks
  const st = await page.evaluate(() => {
    const C = K.core, b = K.ui.book, ev = K.ui.ev().id;
    return { board: C.board(b, ev).map((r) => [r.mem.name, r.rec.w, r.rec.l, r.rec.pts]), saved: !!localStorage.getItem('kaidoneta.book') };
  });
  const want = JSON.stringify([['Javi', 2, 0, 6], ['Leo', 0, 0, 0], ['Ana', 0, 2, 0]]);
  if (JSON.stringify(st.board) !== want) problems.push(`${name}: board ${JSON.stringify(st.board)} != ${want}`);
  if (!st.saved) problems.push(`${name}: nothing saved`);

  // survives a reload
  await page.reload();
  await page.waitForTimeout(500);
  const n = await page.evaluate(() => K.core.live(K.ui.book, 'matches').length);
  if (n !== 3) problems.push(`${name}: ${n} rounds after reload, expected 3`);
  await ctx.close();
}

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    await run(browser, base, { width: 375, height: 667 }, 'se');
    await run(browser, base, { width: 430, height: 932 }, 'max');
  } catch (e) {
    problems.push('crashed: ' + (e.stack || e.message));
  }
  await browser.close();
  srv.close();
  console.log('screenshots in ' + OUT);
  if (problems.length) { console.log(problems.join('\n')); process.exitCode = 1; } else console.log('e2e ok');
})();
