/* End-to-end test in a real browser (Playwright + Chromium).
 *
 *   python3 -m http.server 8765        (in the site folder, in another terminal)
 *   BASE=http://localhost:8765 SHOTS=/tmp/shots node tests/e2e.js
 *
 * Needs Playwright (`npm i -g playwright`). Prints PASS / FAIL lines and exits non-zero on any failure.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:8765';
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'dap-shots-'));
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const txt = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim();

// Click through celebration modals (goal reached, level up, badges...) until none are left.
async function dismissModals(page, wait = 1400) {
  let n = 0;
  await page.waitForSelector('.modal', { timeout: wait }).catch(() => {});
  while (await page.locator('.modal').count()) {
    n++;
    await page.click('.modal button');
    await page.waitForTimeout(450);
    await page.waitForSelector('.modal', { timeout: 600 }).catch(() => {});
  }
  return n;
}

// Plays a practice round by reading the right answer from the question bank. wrongAt = first-try positions to miss.
async function playRound(page, wrongAt = []) {
  let first = 0, answered = 0;
  for (let guard = 0; guard < 12; guard++) {
    await page.waitForSelector('.qcard .qopts .quiz-opt');
    const info = await page.evaluate(() => {
      const q = DA.drill.bank().find((x) => x.q === document.querySelector('.qtext').textContent);
      return { right: q.options[q.answer], retry: !!document.querySelector('.qmeta .level2') };
    });
    const opts = page.locator('.qopts .quiz-opt');
    const n = await opts.count();
    let target = -1;
    for (let i = 0; i < n; i++) if ((await opts.nth(i).locator('.opt-text').innerText()) === info.right) target = i;
    if (!info.retry && wrongAt.includes(first)) target = (target + 1) % n;
    if (!info.retry) first++;
    await opts.nth(target).click();
    answered++;
    await page.waitForSelector('.quiz-fb .callout');
    await page.click('.quiz-fb .btn');
    if (await page.locator('.results').count()) break;
  }
  await page.waitForSelector('.results');
  return answered;
}

(async () => {
  const browser = await chromium.launch();
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await desktop.newPage();
  const problems = [];
  const watch = (p, tag) => {
    p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(tag + ' ' + m.type() + ': ' + m.text()); });
    p.on('pageerror', (e) => problems.push(tag + ' pageerror: ' + e.message));
    p.on('requestfailed', (r) => problems.push(tag + ' requestfailed: ' + r.url()));
  };
  watch(page, 'desktop');

  /* ---------- first visit and onboarding ---------- */
  await page.goto(BASE + '/index.html');
  ok((await txt(page, 'h1')).startsWith('Become a data analyst'), 'first visit shows the welcome hero');
  await page.click('text=Start: tell me your background');
  await page.click('label.bg-card:has-text("Sports, fitness")');
  await page.selectOption('#lang', 'Spanish');
  await page.fill('#goal', 'Sports analyst');
  await page.click('button:has-text("Save and start")');
  await page.waitForSelector('.today');
  ok((await txt(page, '.today-ring')).includes('0/40'), 'today card: daily goal ring starts at 0/40');
  ok((await page.locator('.quests li').count()) === 3, 'three daily quests');
  ok((await txt(page, '#hudSide')).includes('Curious Beginner'), 'level title in the side HUD');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-home.png'), fullPage: true });

  /* ---------- practice round ---------- */
  await page.click('.sidebar a[data-nav="practice"]');
  await page.waitForSelector('.start-card');
  ok((await page.locator('.topic').count()) >= 8, 'practice lobby lists topics');
  await page.click('text=Start a round');
  await page.waitForSelector('.qcard');
  // keyboard: key "1" must answer
  await page.keyboard.press('1');
  await page.waitForSelector('.quiz-fb .callout');
  ok(await page.locator('.qopts .quiz-opt.right').count() === 1, 'pressing 1 answers the question and shows the right option');
  await page.click('.quiz-fb .btn');
  // finish the rest: miss one on purpose (first-try position 2)
  const total = await playRound(page, [2]);
  ok(total >= 4, 'round completed (answered ' + total + ' more, including the second chance)');
  ok((await txt(page, '.results')).includes('right on the first try'), 'results screen shows first-try score');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-results.png') });
  const modals = await dismissModals(page);
  ok(modals >= 1, 'celebration modal(s) after the round (' + modals + ')');
  const st1 = await page.evaluate(() => ({ xp: DA.game.totalXp(), q: DA.game.quests(), streak: DA.game.streak().count, drills: DA.ui.state.stats.drills, srs: Object.keys(DA.ui.state.srs).length }));
  ok(st1.q.drill && st1.drills === 1 && st1.srs >= 5, 'drill quest done, stats and review schedule saved');
  ok(st1.xp >= 8 && st1.xp <= 120, 'round XP in the expected range (' + st1.xp + ')');
  ok((await txt(page, '#hudSide .streak b')) === String(st1.streak), 'HUD streak matches the engine (' + st1.streak + ')');

  /* ---------- lesson: complete, XP once only, quiz order, notes ---------- */
  await page.goto(BASE + '/index.html#/lesson/l0-1');
  await page.waitForSelector('.lesson');
  const xpBefore = await page.evaluate(() => DA.game.totalXp());
  await page.click('.quiz-opt >> nth=0');
  await page.waitForTimeout(100);
  const letters = await page.evaluate(() => [...document.querySelectorAll('.lesson .quiz-opt span:last-child')].map((e) => e.textContent));
  const rightText = await page.evaluate(() => DA.lessonById['l0-1'].quiz.options[DA.lessonById['l0-1'].quiz.answer]);
  ok(letters.length === 4 && letters.indexOf(rightText) >= 0, 'lesson quiz renders 4 options (correct one is shown at position ' + (letters.indexOf(rightText) + 1) + ')');
  // across all lessons the right answer must not always sit in the same slot
  const slots = await page.evaluate(() => new Set(DA.lessons.map((l) => { const o = DA.ui.seededShuffle([0, 1, 2, 3], l.id); return o.indexOf(l.quiz.answer); })).size);
  ok(slots >= 3, 'right answers are spread over ' + slots + ' different positions across lessons');
  await page.click('.lesson .quiz-opt:has-text("' + rightText.slice(0, 20) + '")');
  await page.waitForSelector('.lesson .quiz-opt.right');
  await dismissModals(page, 1200); // XP can trigger a celebration (goal reached, badge...) that covers the page
  await page.fill('.notes', 'This is a note that is long enough to count');
  await page.waitForTimeout(1000);
  await dismissModals(page, 1200);
  await page.click('button:has-text("Mark lesson as complete")');
  await page.waitForSelector('button:has-text("Completed")');
  await dismissModals(page, 1500);
  const afterLesson = await page.evaluate(() => DA.game.totalXp());
  ok(afterLesson - xpBefore >= 10 + 5 + 30, 'lesson + quiz + note XP awarded (' + (afterLesson - xpBefore) + ')');
  await page.click('button:has-text("Completed")'); // undo
  await dismissModals(page, 900);
  await page.click('button:has-text("Mark lesson as complete")'); // redo
  await dismissModals(page, 900);
  await page.waitForSelector('button:has-text("Completed")');
  ok((await page.evaluate(() => DA.game.totalXp())) === afterLesson, 'undo and redo do not pay XP twice');
  ok((await page.evaluate(() => DA.game.quests().lesson)), 'learn quest done');
  await dismissModals(page, 1800);

  /* ---------- SQL lab: XP, third quest, chest ---------- */
  await page.goto(BASE + '/index.html#/lab/lab/s1');
  await page.waitForSelector('.callout.ok', { timeout: 20000 });
  ok(await page.locator('.sql-keys .key').count() > 15, 'SQL shortcut keys are shown');
  await page.fill('.sql-editor', '');
  await page.click('.sql-keys .key:has-text("SELECT")');
  await page.click('.sql-keys .key >> text="*"');
  await page.click('.sql-keys .key:has-text("FROM")');
  await page.click('.sql-keys .table-key:has-text("participants")');
  ok((await page.inputValue('.sql-editor')).trim() === 'SELECT * FROM participants', 'shortcut keys type SQL: "' + (await page.inputValue('.sql-editor')).trim() + '"');
  await page.fill('.sql-editor', "SELECT participant_id, age, site FROM participants WHERE group_name='intervention' AND age>40 ORDER BY age, participant_id");
  await page.click('button:has-text("Check my answer")');
  await page.waitForSelector('.feedback .callout.ok');
  const q3 = await page.evaluate(() => DA.game.quests());
  ok(q3.sql && q3.all && q3.chest >= 15 && q3.chest <= 40, 'all quests done, chest XP ' + q3.chest);
  const m2 = await dismissModals(page, 2500);
  ok(m2 >= 2, 'chest and badge celebrations shown (' + m2 + ')');
  const badges = await page.evaluate(() => Object.keys(DA.ui.state.badges));
  ok(['first-lesson', 'sql-1', 'drill-1'].every((b) => badges.includes(b)), 'badges earned: ' + badges.join(', '));

  /* ---------- You page ---------- */
  // fake a history so the calendar and streak have something to show
  await page.evaluate(() => {
    const ui = DA.ui, t = ui.today();
    for (let i = 1; i <= 5; i++) { const d = ui.addDays(t, -i); ui.state.met[d] = true; ui.state.xp['hist:' + i] = { d, n: 20 + i * 15 }; }
    ui.save();
  });
  await page.goto(BASE + '/index.html#/me');
  await page.reload();
  await page.waitForSelector('.heat');
  ok((await page.locator('.heat .cell[role="img"]').count()) >= 71, 'heat map has a cell per past day');
  ok((await page.locator('.heat .cell.l3, .heat .cell.l4').count()) >= 3, 'active days are shaded');
  ok((await txt(page, '.streak-big b')) === '6', 'streak is 6 (5 past days + today)');
  ok((await page.locator('.bars .bar-col').count()) === 7, 'week chart has 7 bars');
  ok((await page.locator('.badge-card.got').count()) >= 3, 'earned badges are highlighted');
  await page.click('.heat .cell.l3 >> nth=0');
  ok((await txt(page, '.heat-caption')).includes('XP'), 'tapping a day shows its XP');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-me.png'), fullPage: true });

  /* ---------- settings: goal, theme, reminder ---------- */
  await page.goto(BASE + '/index.html#/settings');
  await page.waitForSelector('.settings');
  await page.click('.choice-card:has-text("Serious")');
  ok((await page.evaluate(() => DA.ui.state.profile.dailyGoal)) === 80, 'daily goal can be changed');
  await dismissModals(page, 1200); // changing the goal re-checks badges (the injected history earns some)
  await page.click('.choice-card:has-text("Dark")');
  ok((await page.getAttribute('html', 'data-theme')) === 'dark', 'manual dark theme applies');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-settings-dark.png'), fullPage: true });
  const [ics] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Add to my calendar")')]);
  const icsText = fs.readFileSync(await ics.path(), 'utf8');
  ok(icsText.includes('RRULE:FREQ=DAILY') && icsText.includes('BEGIN:VALARM'), 'calendar reminder file downloads');
  await page.click('.choice-card:has-text("Auto")');

  /* ---------- move progress to a phone with a transfer code ---------- */
  await page.click('button:has-text("Create code")');
  await page.waitForFunction(() => document.querySelector('textarea[readonly]').value.startsWith('DAP'));
  const code = await page.inputValue('textarea[readonly]');
  ok(/^DAP2\.[\w-]+$/.test(code), 'transfer code created (' + code.length + ' characters)');
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const phone = await phoneCtx.newPage();
  watch(phone, 'phone');
  await phone.goto(BASE + '/index.html#/settings');
  await phone.waitForSelector('.settings');
  const before = await phone.evaluate(() => ({ xp: DA.game.totalXp(), done: Object.keys(DA.ui.state.done).length }));
  ok(before.xp === 0 && before.done === 0, 'phone starts empty');
  await phone.fill('textarea[aria-label^="Paste a transfer code"]', 'garbage');
  await phone.click('button:has-text("Merge into this device")');
  ok((await txt(phone, '.status-line[role="status"]')).includes('transfer code'), 'phone rejects a bad code with a clear message');
  await phone.fill('textarea[aria-label^="Paste a transfer code"]', code);
  await phone.click('button:has-text("Merge into this device")');
  await phone.waitForFunction(() => document.querySelector('.status-line[role="status"]').textContent.startsWith('Merged'));
  const after = await phone.evaluate(() => ({ xp: DA.game.totalXp(), done: Object.keys(DA.ui.state.done).length, bg: DA.ui.state.profile.bg, srs: Object.keys(DA.ui.state.srs).length, streak: DA.game.streak().count }));
  const desk = await page.evaluate(() => ({ xp: DA.game.totalXp(), done: Object.keys(DA.ui.state.done).length, streak: DA.game.streak().count }));
  ok(after.xp === desk.xp && after.done === desk.done && after.streak === desk.streak, 'phone now has the same XP (' + after.xp + '), lessons and streak as the desktop');
  ok(after.bg === 'sport' && after.srs >= 5, 'profile and review schedule came across');

  /* ---------- phone layout ---------- */
  const sizes = {};
  for (const [name, hash] of [['home', '#/'], ['practice', '#/practice'], ['lesson', '#/lesson/l2-2'], ['lab', '#/lab/lab/s2'], ['me', '#/me'], ['settings', '#/settings'], ['roadmap', '#/roadmap'], ['prompts', '#/prompts']]) {
    await phone.goto(BASE + '/index.html' + hash);
    await phone.waitForSelector('main .view');
    if (name === 'lab') await phone.waitForSelector('.callout.ok', { timeout: 20000 });
    await dismissModals(phone, 300);
    await sleep(200);
    sizes[name] = await phone.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, tab: !!document.querySelector('.tabbar') && getComputedStyle(document.querySelector('.tabbar')).display !== 'none' }));
    await phone.screenshot({ path: path.join(SHOTS, 'phone-' + name + '.png'), fullPage: name === 'home' });
  }
  ok(Object.values(sizes).every((s) => s.over <= 1), 'no horizontal scrolling on phone: ' + JSON.stringify(Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, v.over]))));
  ok(Object.values(sizes).every((s) => s.tab), 'bottom tab bar on every phone page');
  await phone.goto(BASE + '/index.html#/');
  await phone.waitForSelector('.today');
  const small = await phone.evaluate(() => [...document.querySelectorAll('.tabbar a, .tabbar button, .today .btn, .quests .btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.height < 40 || r.width < 40; }).length);
  ok(small === 0, 'main touch targets are at least 40px');
  ok((await txt(phone, '#hudTop')).includes('Lv'), 'top bar shows streak, level and goal on the phone');
  // lab on phone: editor should be above the fold, side panel collapsed
  await phone.goto(BASE + '/index.html#/lab/lab/s2');
  await phone.waitForSelector('.callout.ok', { timeout: 20000 });
  const lab = await phone.evaluate(() => ({ editorTop: document.querySelector('.sql-editor').getBoundingClientRect().top, vh: window.innerHeight, sideOpen: document.querySelector('.side-collapse').open }));
  ok(!lab.sideOpen && lab.editorTop < lab.vh, 'phone lab: side panel collapsed, editor visible without scrolling (top ' + Math.round(lab.editorTop) + ' of ' + lab.vh + ')');
  // round on phone
  await phone.goto(BASE + '/index.html#/practice/play/SQL');
  await phone.waitForSelector('.qcard');
  ok(!(await phone.locator('.tabbar').isVisible()), 'tab bar is hidden during a practice round (focus mode)');
  await phone.screenshot({ path: path.join(SHOTS, 'phone-round.png') });
  await phone.tap('.qopts .quiz-opt >> nth=0');
  await phone.waitForSelector('.quiz-fb .callout');
  await phone.screenshot({ path: path.join(SHOTS, 'phone-round-answered.png') });

  /* ---------- PWA: manifest, service worker, offline ---------- */
  const manifest = await page.evaluate(async () => { const r = await fetch('manifest.webmanifest'); return r.json(); });
  ok(manifest.display === 'standalone' && manifest.icons.some((i) => i.purpose === 'maskable') && manifest.start_url, 'manifest is valid and has a maskable icon');
  const iconsOk = await page.evaluate(async (icons) => (await Promise.all(icons.map((i) => fetch(i.src).then((r) => r.ok)))).every(Boolean), manifest.icons);
  ok(iconsOk, 'every icon in the manifest exists');
  await page.goto(BASE + '/index.html#/');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
  await page.reload();
  const swState = await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); return reg && reg.active ? reg.active.state : 'none'; });
  ok(swState === 'activated', 'service worker is active');
  const cached = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); return (await c.keys()).length; });
  const listed = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8').match(/^\s+'[^']+',?$/gm).length;
  ok(cached === listed, 'service worker cached all ' + listed + ' files');
  await desktop.setOffline(true);
  await page.reload();
  await page.waitForSelector('.today');
  ok(true, 'offline: the app loads from the cache');
  await page.goto(BASE + '/index.html#/lab/retail/r2');
  await page.waitForSelector('.callout.ok', { timeout: 20000 });
  await page.fill('.sql-editor', "SELECT COUNT(*) FROM orders WHERE channel = 'delivery'");
  await page.click('button:has-text("Check my answer")');
  await page.waitForSelector('.feedback .callout.ok');
  ok(true, 'offline: the SQL engine (WebAssembly) runs and checks an answer');
  await page.goto(BASE + '/index.html#/practice/play');
  await page.waitForSelector('.qcard');
  ok(true, 'offline: practice rounds work');
  await desktop.setOffline(false);

  console.log('\nconsole / network problems: ' + (problems.length ? '\n' + problems.join('\n') : 'none'));
  if (problems.length) failures++;
  console.log('screenshots in ' + SHOTS);
  await browser.close();
  console.log(failures ? '\n' + failures + ' FAILED' : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
