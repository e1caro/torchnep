/* Runs tests/selftest.js in Chromium against the assembled frontend/ (needs Playwright):
 *   python3 build.py --frontend && (cd frontend && python3 -m http.server 8765) &
 *   node tests/browser.js http://localhost:8765/ [screenshot directory]
 * The same script runs inside the real program: BJHILO_SELFTEST=<log file> BlackjackHiLo.exe */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:8765/', shots = process.argv[3];
const src = fs.readFileSync(path.join(__dirname, 'selftest.js'), 'utf8');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  let failed = 0;
  async function run(mode) {
    const page = await ctx.newPage();                 // a new tab: fresh sessionStorage, the same saved games
    const done = new Promise((res) => page.exposeFunction('__done', res));
    await page.exposeFunction('__report', (line) => {
      console.log(line);
      if (shots && /^ {2}ok/.test(line)) return page.screenshot({ path: path.join(shots, mode + '-' + line.slice(6, 30).replace(/\W+/g, '-') + '.png') }).catch(() => {});
    });
    page.on('pageerror', (e) => { failed++; console.log('FAIL  page error: ' + e.message); });
    page.on('console', (m) => { if (m.type() === 'error') { failed++; console.log('FAIL  console: ' + m.text()); } });
    await page.addInitScript((m) => {
      window.__selftestMode = m;
      window.go = { main: { SelfTest: { Report: (l) => window.__report(l), Done: (n) => window.__done(n) } } };
    }, mode);
    page.on('load', () => page.evaluate(src).catch(() => {}));      // as the program does on every page
    await page.goto(url);
    failed += await Promise.race([done, new Promise((res) => setTimeout(() => res(99), 300000))]);
    await page.close();
  }
  await run('full');
  await run('restart');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
