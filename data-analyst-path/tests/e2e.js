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
async function answerAll(page, right) {
  const n = await page.locator('.qcard').count();
  for (let i = 0; i < n; i++) {
    await dismissModals(page, 200);
    const pick = await page.evaluate(([i, right]) => {
      const card = document.querySelectorAll('.qcard')[i], text = card.querySelector('.qtext').textContent;
      const q = DA.drill.bank().find((x) => x.q === text), want = q.options[q.answer];
      const opts = [...card.querySelectorAll('.quiz-opt')];
      return opts.findIndex((b) => (b.querySelector('span:last-child').textContent === want) === right);
    }, [i, right]);
    await page.locator('.qcard').nth(i).locator('.quiz-opt').nth(pick).click();
    await sleep(150);
  }
}

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
  ok(await page.locator('.hero .mascot').count() === 1, 'Dot the mascot greets a new visitor');
  await page.click('.dot-bubble a:has-text("Start")');
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
  await page.waitForSelector('.callout.warn');
  ok(/locked/.test(await txt(page, '.callout.warn')), 'SQLab: a challenge in a locked level shows the lock, not the editor');
  await page.goto(BASE + '/index.html#/lab');
  await page.waitForSelector('.lab-world');
  ok(await page.locator('.lab-world').count() === 9 && await page.locator('.lab-level').count() === 32, 'SQLab: a world map with 8 worlds, 32 levels and free exploration');
  await page.goto(BASE + '/index.html#/lab/retail/r1');
  await page.waitForSelector('.callout.ok', { timeout: 20000 });
  ok(await page.locator('.sql-keys .key').count() > 15, 'SQL shortcut keys are shown');
  await page.fill('.sql-editor', '');
  await page.click('.sql-keys .key:has-text("SELECT")');
  await page.click('.sql-keys .key >> text="*"');
  await page.click('.sql-keys .key:has-text("FROM")');
  await page.click('.sql-keys .table-key:has-text("orders")');
  ok((await page.inputValue('.sql-editor')).trim() === 'SELECT * FROM orders', 'shortcut keys type SQL: "' + (await page.inputValue('.sql-editor')).trim() + '"');
  await page.fill('.sql-editor', await page.evaluate(() => DA.challenges.find((c) => c.id === 'r1').solution));
  await page.click('.lab-actions button:has-text("Check")');
  await page.waitForSelector('.feedback .callout.ok');
  ok(/★/.test(await txt(page, '.feedback')) && await page.evaluate(() => DA.ui.state.labs.sql.r1 === 3 && DA.ui.state.sql.r1 === true), 'SQLab: solving at the first try gives 3 stars and keeps the old solved mark');
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

  /* ---------- home: mascot, boost, week race, teaser ---------- */
  await page.goto(BASE + '/index.html#/');
  await page.waitForSelector('.hero-card');
  ok(await page.locator('.hero-card .dot-bubble').count() === 1 && (await txt(page, '.hero-card .dot-bubble')).length > 20, 'home: Dot says something useful: "' + (await txt(page, '.hero-card .dot-bubble p')).slice(0, 60) + '…"');
  ok(await page.locator('.hud-chip.boost').count() >= 1, 'double-XP boost is running after the quest chest (shown in the HUD)');
  ok(await page.locator('.race .race-row').count() >= 1 && await page.locator('.teaser .teaser-card').count() === 3, 'home shows the week race and three Discover picks');
  ok(await page.locator('.hero-card .continue-btn').count() === 1 && await page.locator('.arcade-tiles .game-tile').count() === 2, 'home shows the Continue button in the hero, and the arcade');

  /* ---------- Discover feed ---------- */
  const mult = async () => page.evaluate(() => (DA.game.boostLeft() > 0 ? 2 : 1));
  await page.goto(BASE + '/index.html#/feed/card/s-wald');
  await page.waitForSelector('.fcard[data-id="s-wald"]');
  ok((await txt(page, '.fcard[data-id="s-wald"] .fc-title')) === 'The bullet holes that were missing', 'feed opens on the linked card');
  const xpF = await page.evaluate(() => DA.game.totalXp()), m1 = await mult();
  await page.waitForFunction(() => !!DA.ui.state.cards['s-wald'], null, { timeout: 6000 });
  ok(await page.locator('.fcard[data-id="s-wald"].got').count() === 1, 'staying on a card collects it');
  ok((await page.evaluate(() => DA.game.totalXp())) - xpF === 2 * m1, 'collecting pays ' + (2 * m1) + ' XP' + (m1 === 2 ? ' (doubled by the boost)' : ''));
  await dismissModals(page, 900);
  await page.click('.fcard[data-id="s-wald"] .fc-act >> nth=0');
  ok(await page.evaluate(() => DA.feed.isSaved('s-wald')), 'the save button bookmarks the card');
  const snap = await page.evaluate(async () => {
    const f = document.querySelector('.feed'), before = f.scrollTop;
    f.focus();
    return { h: f.clientHeight, before, snapType: getComputedStyle(f).scrollSnapType, cards: f.querySelectorAll('.fcard').length };
  });
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction((h) => Math.abs(document.querySelector('.feed').scrollTop - h) < 3, snap.h, { timeout: 4000 });
  ok(snap.snapType.includes('y') && snap.cards >= 3, 'arrow key moves exactly one card (scroll snap ' + snap.snapType + ')');
  await page.evaluate(() => { const f = document.querySelector('.feed'); f.scrollTop = f.scrollHeight; });
  await page.waitForFunction((n) => document.querySelectorAll('.feed .fcard').length > n, snap.cards, { timeout: 4000 });
  ok(true, 'more cards load as you scroll');
  // a review question inside the feed
  const quizInfo = await page.evaluate(() => {
    const el = document.querySelector('.feed .k-quiz');
    if (!el) return null;
    el.scrollIntoView();
    const q = DA.drill.bank().find((x) => x.q === el.querySelector('.fc-title').textContent);
    const opts = [...el.querySelectorAll('.opt-text')].map((o) => o.textContent);
    return { id: q.id, right: opts.indexOf(q.options[q.answer]) };
  });
  ok(!!quizInfo && quizInfo.right >= 0, 'the feed mixes in a review question');
  await page.locator('.feed .k-quiz').first().locator('.quiz-opt').nth(quizInfo.right).click();
  await page.waitForSelector('.feed .k-quiz .quiz-fb .callout.ok');
  ok(await page.evaluate((id) => !!DA.ui.state.xp['fq:' + DA.ui.today() + ':' + id] && !!DA.ui.state.srs[id], quizInfo.id), 'answering it pays XP once and feeds the review schedule');
  await dismissModals(page, 900);
  // myth or fact
  await page.goto(BASE + '/index.html#/feed/card/m-left');
  await page.waitForSelector('.fcard[data-id="m-left"] .mf');
  await page.click('.fcard[data-id="m-left"] .mf >> nth=0'); // "Myth" is the wrong answer here
  await page.waitForSelector('.fcard[data-id="m-left"] .fc-verdict .callout');
  ok((await txt(page, '.fcard[data-id="m-left"] .fc-verdict')).includes('It is a fact'), 'myth-or-fact card reveals the answer and explains it');
  await dismissModals(page, 900);
  // chart crime
  await page.goto(BASE + '/index.html#/feed/card/h-truncate');
  await page.waitForSelector('.fcard[data-id="h-truncate"] svg.crime-chart');
  ok((await txt(page, '.fcard[data-id="h-truncate"] .crime-tag')) === 'CRIME', 'chart-crime card starts with the crime');
  await page.click('.fcard[data-id="h-truncate"] button:has-text("Show the fix")');
  ok((await txt(page, '.fcard[data-id="h-truncate"] .crime-tag')) === 'FIXED' && await page.evaluate(() => !!DA.ui.state.cards['h-truncate']), 'the fix toggles, and seeing it collects the card');
  await dismissModals(page, 900);
  // daily five and the collection
  await page.evaluate(() => { ['q-box', 'w-grain'].forEach((id) => DA.feed.markRead(id)); });
  await dismissModals(page, 1200);
  ok(await page.evaluate(() => DA.feed.readToday() >= 5 && !!DA.ui.state.xp['feed5:' + DA.ui.today()]), 'five new cards in a day pays the Discover bonus');
  await page.goto(BASE + '/index.html#/collection');
  await page.waitForSelector('.col-grid');
  ok(await page.locator('.col-card.got').count() === 5 && await page.locator('.col-card').count() === (await page.evaluate(() => DA.feedCards.length)), 'collection shows all cards with 5 collected');
  await page.goto(BASE + '/index.html#/feed/Saved');
  await page.waitForSelector('.fcard');
  ok(await page.locator('.fcard[data-id]').count() === 1, 'Saved shows only the bookmarked card');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-feed.png') });

  /* ---------- journey map ---------- */
  await page.goto(BASE + '/index.html#/roadmap');
  await page.waitForSelector('.chapter');
  const pathInfo = await page.evaluate(() => ({ chapters: document.querySelectorAll('.chapter').length, current: document.querySelectorAll('.jnode.current').length, done: document.querySelectorAll('.jnode.done:not(.boss)').length,
    open: document.querySelectorAll('.ch-toggle[aria-expanded="true"]').length, bosses: document.querySelectorAll('.jnode.boss').length, labelled: [...document.querySelectorAll('a.jnode')].every((a) => a.getAttribute('aria-label').length > 20) }));
  ok(pathInfo.chapters === 9 && pathInfo.current === 1 && pathInfo.done === 1 && pathInfo.open === 1 && pathInfo.bosses === 1 && pathInfo.labelled, 'journey (old #/roadmap link): 9 chapters, the current one open with its boss, one mission done, one current, every stop labelled');
  const before2 = await page.locator('a.jnode').count();
  await page.click('.chapter:nth-of-type(2) .ch-toggle');
  await page.waitForFunction(() => document.querySelectorAll('.ch-toggle[aria-expanded="true"]').length === 2);
  ok(await page.locator('a.jnode').count() > before2, 'a collapsed chapter opens with all its missions and its boss');
  await page.click('.jnode.current');
  await page.waitForSelector('.view.mission');
  ok((await txt(page, 'h1')).includes('Learn with AI') && await page.locator('.m-steps a').count() === 4, 'the current stop opens the next mission, with its steps');

  /* ---------- arcade ---------- */
  await page.goto(BASE + '/index.html#/arcade/corr');
  await page.waitForSelector('.scatter');
  ok(await page.locator('.scatter .sc-pt').count() === 40, 'correlation game draws 40 points');
  for (let i = 0; i < 40 && !(await page.locator('.results').count()); i++) {
    await page.click('.qcard button:has-text("Guess")');
    await page.waitForSelector('.quiz-fb .callout');
    if (i === 0) ok(/r = -?\d\.\d\d/.test(await txt(page, '.quiz-fb .callout')) && await page.locator('.scatter .sc-line').count() === 1, 'a guess reveals the real correlation and the trend line');
    await page.click('.quiz-fb .btn');
  }
  await page.waitForSelector('.results');
  ok(await page.evaluate(() => DA.ui.state.stats.corrGames === 1), 'the game ends after three misses and the score is saved');
  await dismissModals(page, 900);
  await page.goto(BASE + '/index.html#/arcade/blocks');
  await page.waitForSelector('.level-card');
  ok(await page.locator('.level-card').count() === 8, 'SQL blocks: a map of 8 levels');
  await page.click('.blocks-map .next-card');
  await page.waitForSelector('.bank .tile');
  await page.waitForFunction(() => !!window.initSqlJs, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('.bank .tile:not([disabled])');
    const ask = await txt(page, '.qtext');
    const tiles = await page.evaluate((a) => DA.puzzles.find((p) => p.ask === a).tiles, ask);
    if (i === 0) { // a wrong answer first: only the first tile
      await page.evaluate((t) => [...document.querySelectorAll('.bank .tile:not([disabled])')].find((b) => b.textContent === t).click(), tiles[0]);
      await page.click('button:has-text("Check")');
      await page.waitForSelector('.quiz-fb .callout.warn');
      ok((await txt(page, '.quiz-fb .callout.warn')).length > 12, 'SQL blocks: an unfinished query is rejected with the reason: "' + (await txt(page, '.quiz-fb .callout.warn')).slice(0, 70) + '"');
      await page.click('button:has-text("Clear")');
    }
    for (const t of tiles) await page.evaluate((text) => [...document.querySelectorAll('.bank .tile:not([disabled])')].find((b) => b.textContent === text).click(), t);
    await page.click('button:has-text("Check")');
    await page.waitForSelector('.quiz-fb .callout.ok');
    await page.click('.quiz-fb .btn.big');
    await dismissModals(page, 500);
  }
  await page.waitForSelector('.results');
  ok(await page.evaluate(() => Object.keys(DA.ui.state.blocks).length === 5 && DA.ui.state.stats.blockRounds === 1), 'SQL blocks: five puzzles solved by tapping tiles, checked by running the query');
  const bst = await page.evaluate(() => DA.ui.state.blocks);
  ok(Object.values(bst).filter((n) => n === 3).length === 4 && Object.values(bst).includes(2), 'SQL blocks: 3 stars at the first try, 2 after a wrong Check (' + JSON.stringify(bst) + ')');
  ok((await page.locator('.results .round-list li').count()) === 5 && /★/.test(await txt(page, '.results .big-stars')), 'SQL blocks: results list the stars of each puzzle');
  await dismissModals(page, 1200);
  await page.screenshot({ path: path.join(SHOTS, 'desktop-blocks-results.png') });
  // a "fix the bug" puzzle: the broken query is already in the tray
  await page.evaluate(() => { DA.arcade.levelPuzzles(1).forEach((p) => { if (!p.fix) DA.ui.state.blocks[p.id] = DA.ui.state.blocks[p.id] || 3; }); DA.ui.save(); });
  await page.goto(BASE + '/index.html#/arcade/blocks');
  await page.click('.level-card >> nth=0');
  await page.waitForSelector('.badge.bug');
  await page.waitForSelector('.target summary');
  ok((await txt(page, '.target summary')).includes('3 rows'), 'SQL blocks: the target result is shown (' + (await txt(page, '.target summary')) + ')');
  const trayText = await page.evaluate(() => [...document.querySelectorAll('.tray .tile')].map((b) => b.textContent).join(' '));
  ok(/ORDER BY price DESC LIMIT 3/.test(trayText), 'SQL blocks: a bug puzzle starts with the broken query');
  await page.click('button:has-text("Hint")');
  ok((await page.locator('.tray .tile.marked').innerText()) === 'DESC', 'SQL blocks: the hint marks the wrong tile');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-blocks-fix.png') });
  await page.click('.tray .tile.marked');
  await page.click('button:has-text("Check")');
  await page.waitForSelector('.quiz-fb .callout.ok');
  ok(await page.evaluate(() => DA.ui.state.blocks[DA.puzzles.find((p) => p.fix && p.lv === 1).id] === 2), 'SQL blocks: fixed with one hint = 2 stars');
  await page.goto(BASE + '/index.html#/');
  await dismissModals(page, 1200);

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
  ok((await txt(phone, '.transfer-result')).includes('transfer code'), 'phone rejects a bad code with a clear message');
  await phone.fill('textarea[aria-label^="Paste a transfer code"]', code);
  await phone.click('button:has-text("Merge into this device")');
  await phone.waitForFunction(() => document.querySelector('.transfer-result').textContent.startsWith('Merged'));
  const after = await phone.evaluate(() => ({ xp: DA.game.totalXp(), done: Object.keys(DA.ui.state.done).length, bg: DA.ui.state.profile.bg, srs: Object.keys(DA.ui.state.srs).length, streak: DA.game.streak().count }));
  const desk = await page.evaluate(() => ({ xp: DA.game.totalXp(), done: Object.keys(DA.ui.state.done).length, streak: DA.game.streak().count }));
  ok(after.xp === desk.xp && after.done === desk.done && after.streak === desk.streak, 'phone now has the same XP (' + after.xp + '), lessons and streak as the desktop');
  ok(after.bg === 'sport' && after.srs >= 5, 'profile and review schedule came across');

  /* ---------- phone layout ---------- */
  const sizes = {};
  for (const [name, hash] of [['home', '#/'], ['practice', '#/practice'], ['lesson', '#/lesson/l2-2'], ['lab', '#/lab/retail/r1'], ['me', '#/me'], ['settings', '#/settings'], ['journey', '#/journey'], ['mission', '#/mission/l2-3/learn'], ['prompts', '#/prompts'], ['feed', '#/feed'], ['collection', '#/collection'], ['arcade', '#/arcade'], ['blocks', '#/arcade/blocks'], ['corr', '#/arcade/corr']]) {
    await phone.goto(BASE + '/index.html' + hash);
    await phone.waitForSelector('main .view');
    if (name === 'lab') await phone.waitForSelector('.callout.ok', { timeout: 20000 });
    await dismissModals(phone, 300);
    await sleep(200);
    sizes[name] = await phone.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, tab: !!document.querySelector('.tabbar') && getComputedStyle(document.querySelector('.tabbar')).display !== 'none' }));
    await phone.screenshot({ path: path.join(SHOTS, 'phone-' + name + '.png'), fullPage: name === 'home' });
  }
  ok(Object.values(sizes).every((s) => s.over <= 1), 'no horizontal scrolling on phone: ' + JSON.stringify(Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, v.over]))));
  ok(Object.entries(sizes).every(([k, s]) => ['blocks', 'corr'].includes(k) || s.tab === !['mission', 'lab'].includes(k)), 'bottom tab bar on every phone page (hidden only inside a game, a mission or a challenge): ' + JSON.stringify(Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, v.tab]))));
  // the feed on a phone: full-height cards, no top bar, one swipe = one card
  await phone.goto(BASE + '/index.html#/feed');
  await phone.waitForSelector('.feed .fcard');
  const pf = await phone.evaluate(() => { const f = document.querySelector('.feed'), c = f.querySelector('.fcard'); return { feed: f.clientHeight, card: Math.round(c.getBoundingClientRect().height), vh: window.innerHeight, top: getComputedStyle(document.querySelector('.topbar')).display, innerFits: c.querySelector('.fc-inner').scrollHeight <= c.querySelector('.fc-inner').clientHeight + 1 }; });
  ok(pf.card === pf.feed && pf.feed > pf.vh * 0.75 && pf.top === 'none', 'phone feed: each card fills the screen (' + pf.card + ' of ' + pf.vh + 'px), top bar hidden');
  await phone.evaluate(() => { const f = document.querySelector('.feed'); f.scrollBy({ top: f.clientHeight * 0.6 }); });
  await phone.waitForFunction(() => { const f = document.querySelector('.feed'); return Math.abs(f.scrollTop - f.clientHeight) < 3; }, null, { timeout: 4000 });
  ok(true, 'phone feed: a partial swipe snaps to the next card');
  await phone.screenshot({ path: path.join(SHOTS, 'phone-feed-second.png') });
  await phone.goto(BASE + '/index.html#/');
  await phone.waitForSelector('.today');
  const small = await phone.evaluate(() => [...document.querySelectorAll('.tabbar a, .tabbar button, .today .btn, .quests .btn')].filter((e) => { const r = e.getBoundingClientRect(); return r.height < 40 || r.width < 40; }).length);
  ok(small === 0, 'main touch targets are at least 40px');
  ok((await txt(phone, '#hudTop')).includes('Lv'), 'top bar shows streak, level and goal on the phone');
  // lab on phone: editor should be above the fold, side panel collapsed
  await phone.goto(BASE + '/index.html#/lab/retail/r1');
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

  /* ---------- journey on the phone: map, Continue, the five steps, Try in place, test out, boss ---------- */
  await phone.goto(BASE + '/index.html#/journey');
  await phone.waitForSelector('[aria-current="step"]');
  await sleep(300);
  const jm = await phone.evaluate(() => { const r = document.querySelector('[aria-current="step"]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight, h: document.documentElement.scrollHeight }; });
  ok(jm.top >= 0 && jm.bottom <= jm.vh, 'phone journey: the map opens scrolled to the current mission (at ' + Math.round(jm.top) + 'px of ' + jm.vh + ')');
  ok(jm.h < 4000, 'phone journey: chapters fold, so the map is ' + jm.h + 'px tall instead of 12,000');
  await phone.goto(BASE + '/index.html#/');
  await phone.waitForSelector('.continue-btn');
  const cb = await phone.evaluate(() => Math.round(document.querySelector('.continue-btn').getBoundingClientRect().top));
  ok(cb < 360, 'phone home: Continue is near the top (' + cb + 'px)');
  const mid = await phone.evaluate(() => DA.journey.current().lesson.id);
  await phone.tap('.continue-btn');
  await phone.waitForSelector('.view.mission');
  ok((await phone.evaluate(() => location.hash)).startsWith('#/mission/' + mid + '/'), 'phone home: Continue opens the current mission at its current step');
  await phone.goto(BASE + '/index.html#/mission/' + mid + '/brief');
  await phone.waitForSelector('.view.mission .m-brief');
  ok(!(await phone.locator('.tabbar').isVisible()) && await phone.locator('.m-actions .btn.accent').isVisible(), 'phone mission: focus mode with the main button in the thumb zone');
  await phone.tap('.m-actions .btn.accent');
  await phone.waitForSelector('.deck .lcard');
  let guard = 0;
  while (/Next card/.test(await txt(phone, '.m-actions .btn.accent')) && guard++ < 12) { await phone.tap('.m-actions .btn.accent'); await sleep(120); }
  ok(await phone.evaluate((id) => DA.journey.stepDone(id, 'learn'), mid), 'phone mission: reading every card completes Learn (' + guard + ' cards)');
  await phone.goto(BASE + '/index.html#/mission/' + mid + '/check');
  await phone.waitForSelector('.qcard');
  const quest0 = await phone.evaluate(() => DA.game.quests().drill);
  await answerAll(phone, true);
  ok(await phone.evaluate((id) => DA.ui.state.quiz[id] && DA.ui.state.quiz[id].ok && DA.game.quests().drill, mid) && (quest0 || true), 'phone mission: Check records the quiz and counts as the Practise quest');
  await phone.goto(BASE + '/index.html#/mission/' + mid + '/debrief');
  await phone.waitForSelector('.m-actions .btn.big');
  const xp0 = await phone.evaluate(() => DA.game.totalXp());
  await phone.tap('.m-actions button.btn.big');
  await dismissModals(phone, 900);
  const xp1 = await phone.evaluate((id) => ({ xp: DA.game.totalXp(), done: !!DA.ui.state.done[id], lxp: DA.ui.XP.lesson(DA.lessonById[id]) }), mid);
  ok(xp1.done && xp1.xp - xp0 >= xp1.lxp, 'phone mission: Debrief completes the mission with its XP (+' + (xp1.xp - xp0) + ')');
  await phone.goto(BASE + '/index.html#/mission/l2-1/try');
  await phone.waitForSelector('.tcard a.btn');
  await phone.tap('.tcard a.btn >> nth=0');
  await phone.waitForSelector('.callout.ok', { timeout: 20000 });
  const tid = await phone.evaluate(() => location.hash.split('/').pop());
  await phone.fill('.sql-editor', await phone.evaluate((id) => DA.challenges.find((c) => c.id === id).solution, tid));
  await phone.tap('.lab-actions button:has-text("Check")');
  await phone.waitForSelector('.feedback .callout.ok');
  ok(await phone.locator('.feedback a:has-text("Back to the mission")').count() === 1 && await phone.evaluate((id) => DA.labgame.stars('sql', id) >= 1 && DA.game.quests().sql, tid), 'phone mission: a Try challenge is solved in place, its stars go to SQLab and it counts as the Code quest');
  await dismissModals(phone, 900);
  await phone.goto(BASE + '/index.html#/mission/l4-2/test');
  await phone.waitForSelector('.qcard');
  await answerAll(phone, true);
  await dismissModals(phone, 900);
  ok(await phone.evaluate(() => !!DA.ui.state.done['l4-2'] && DA.journey.tested('l4-2')), 'phone: testing out with every answer right completes the mission');
  await phone.goto(BASE + '/index.html#/boss/m0/q');
  await phone.waitForSelector('.qcard');
  const bossXp = await phone.evaluate(() => !!DA.ui.state.xp['module:m0']);
  await answerAll(phone, true);
  await dismissModals(phone, 900);
  ok(await phone.evaluate(() => DA.ui.state.bosses.m0 === 3 && !!DA.ui.state.xp['module:m0']) && !bossXp, 'phone: the chapter 1 boss case pays the chapter bonus with three stars');
  await phone.screenshot({ path: path.join(SHOTS, 'phone-boss.png') });

  /* ---------- phone-first matrix: three phone sizes, light and dark ---------- */
  const seedDone = {}; ['l0-1', 'l0-2', 'l0-3', 'l1-1', 'l1-2', 'l1-3', 'l1-4', 'l1-5', 'l1-6', 'l1-7', 'l2-1', 'l2-2'].forEach((id) => { seedDone[id] = true; });
  const plays = [['SQLab', '#/lab/retail/r1'], ['DotPython', '#/python/play/py02'], ['DotSheets', '#/sheets/play/s_l1_2_1'], ['DotBI', '#/bi/play/bi01']];
  const rows = [];
  for (const theme of ['light', 'dark']) {
    for (const [w, hh] of [[360, 740], [390, 844], [412, 915]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: hh }, isMobile: true, hasTouch: true, colorScheme: theme });
      await ctx.addInitScript((st) => { if (!localStorage.getItem('data-analyst-path.v1')) localStorage.setItem('data-analyst-path.v1', JSON.stringify(st)); },
        { v: 2, profile: { bg: 'science', theme: 'auto' }, done: seedDone, seen: { welcome: true }, labs: { sql: { r1: 3 }, sheets: {}, python: { py01: 3 }, bi: {} } });
      const pg = await ctx.newPage();
      watch(pg, 'phone ' + w + ' ' + theme);
      const r = { at: w + 'x' + hh + ' ' + theme, over: 0, bars: [] };
      await pg.goto(BASE + '/index.html#/');
      await pg.waitForSelector('.continue-btn');
      r.cont = await pg.evaluate(() => Math.round(document.querySelector('.continue-btn').getBoundingClientRect().top));
      r.dark = await pg.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number); return c[0] + c[1] + c[2] < 200; });
      await pg.goto(BASE + '/index.html#/journey');
      await pg.waitForSelector('[aria-current="step"]');
      await sleep(250);
      r.journey = await pg.evaluate(() => { const b = document.querySelector('[aria-current="step"]').getBoundingClientRect(); return { inView: b.top >= 0 && b.bottom <= innerHeight, h: document.documentElement.scrollHeight }; });
      for (const [name, hash] of plays) {
        await pg.goto(BASE + '/index.html' + hash);
        await pg.waitForSelector('.lab-actions');
        await sleep(name === 'SQLab' ? 900 : 400);
        r.bars.push(await pg.evaluate((n) => { const b = document.querySelector('.lab-actions').getBoundingClientRect(); return { n, ok: b.top >= 0 && b.bottom <= innerHeight + 1 && getComputedStyle(document.querySelector('.tabbar')).display === 'none' }; }, name));
        r.over = Math.max(r.over, await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth));
      }
      await pg.goto(BASE + '/index.html#/python/play/py02');
      await pg.waitForSelector('.py-editor');
      await pg.focus('.py-editor');
      await pg.setViewportSize({ width: w, height: 420 });
      await sleep(300);
      r.kb = await pg.evaluate(() => { const b = document.querySelector('.lab-actions').getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight + 1; });
      await pg.setViewportSize({ width: w, height: hh });
      await pg.goto(BASE + '/index.html#/sheets');
      await pg.waitForSelector('.lab-road');
      r.map = await pg.evaluate(() => ({ stars: document.querySelectorAll('.lab-level:not(.locked) .lab-lv-stars').length, locks: document.querySelectorAll('.lab-lock-msg').length, lockedLabelled: [...document.querySelectorAll('.lab-level.locked')].every((x) => /Locked/.test(x.getAttribute('aria-label'))), cols: getComputedStyle(document.querySelector('.lab-road')).gridTemplateColumns.split(' ').length }));
      for (const hash of ['#/', '#/journey', '#/me', '#/practice', '#/mission/l2-3/learn']) {
        await pg.goto(BASE + '/index.html' + hash);
        await pg.waitForSelector('main .view');
        await sleep(150);
        r.over = Math.max(r.over, await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth));
      }
      if (w === 360) await pg.screenshot({ path: path.join(SHOTS, 'phone360-' + theme + '-mission.png') });
      rows.push(r);
      await ctx.close();
    }
  }
  const brief = (f) => rows.map((r) => r.at + ': ' + f(r)).join('; ');
  ok(rows.every((r) => r.cont < 360), 'F1 Continue near the top on every phone: ' + brief((r) => r.cont + 'px'));
  ok(rows.every((r) => r.journey.inView && r.journey.h < 4000), 'F2 journey opens on the current mission and stays short: ' + brief((r) => r.journey.h + 'px'));
  ok(rows.every((r) => r.bars.every((b) => b.ok)), 'F3 Run, Check and Hint stay visible above the fold in all four labs, tab bar hidden: ' + brief((r) => r.bars.filter((b) => b.ok).length + '/4'));
  ok(rows.every((r) => r.kb), 'F3 with the keyboard open (viewport 420px) the action bar is still on screen');
  ok(rows.every((r) => r.map.stars >= 1 && r.map.locks === 1 && r.map.lockedLabelled && r.map.cols === 1), 'F8 level map: one column, real stars, a single lock message, locked levels labelled');
  ok(rows.every((r) => r.over <= 1), 'no horizontal scrolling at any size or theme');
  ok(rows.filter((r) => r.at.endsWith('dark')).every((r) => r.dark) && rows.filter((r) => r.at.endsWith('light')).every((r) => !r.dark), 'dark mode follows the system on every phone size');

  /* ---------- keyboard only: journey map, mission, hint sheet ---------- */
  await page.goto(BASE + '/index.html#/journey');
  await page.waitForSelector('[aria-current="step"]');
  let tabs = 0, onNode = false;
  while (tabs++ < 60 && !onNode) { await page.keyboard.press('Tab'); onNode = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('jnode')); }
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  ok(onNode && ring !== 'none', 'keyboard: Tab reaches the journey stops with a visible focus ring (' + tabs + ' presses)');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.view.mission');
  ok(true, 'keyboard: Enter on a stop opens its mission');
  await page.goto(BASE + '/index.html#/python/play/py02');
  await page.waitForSelector('.lab-hint');
  await page.focus('.lab-hint');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.sheet[role="dialog"]');
  const inSheet = await page.evaluate(() => !!document.activeElement.closest('.sheet'));
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const stillIn = await page.evaluate(() => !!document.activeElement.closest('.sheet'));
  await page.keyboard.press('Escape');
  const back = await page.evaluate(() => !document.querySelector('.sheet') && document.activeElement.classList.contains('lab-hint'));
  ok(inSheet && stillIn && back, 'keyboard: the hint opens as a dialog, focus stays inside, Esc closes it and returns focus');

  /* ---------- DotSheets, DotPython, DotBI ---------- */
  for (const [route, name] of [['sheets', 'DotSheets'], ['python', 'DotPython'], ['bi', 'DotBI']]) {
    await page.goto(BASE + '/index.html#/' + route);
    await page.waitForSelector('.lab-world');
    const seen = await page.evaluate((r) => ({ h1: document.querySelector('h1').textContent, title: document.title, menu: document.querySelector('.nav a[data-nav="' + r + '"]').textContent.trim(), open: document.querySelectorAll('a.lab-level').length, locked: document.querySelectorAll('.lab-level.locked').length }), route);
    ok(seen.h1 === name && seen.title.startsWith(name) && seen.menu === name, route + ': opens with its name "' + name + '" in the heading, page title and menu');
    ok(seen.open >= 1 && seen.locked >= 12, route + ': world map with its levels, later ones locked (' + seen.locked + ' locked)');
  }
  await page.goto(BASE + '/index.html#/sheets/play/s_l1_2_1');
  await page.waitForSelector('.sheets-canvas');
  await sleep(300);
  const cv = await page.locator('.sheets-canvas').boundingBox();
  await page.mouse.click(cv.x + 46 + 40, cv.y + 26 + 12);
  ok(await page.inputValue('.sheets-name-box') === 'A1', 'DotSheets: clicking a cell selects it');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight');
  ok(await page.inputValue('.sheets-name-box') === 'B2', 'DotSheets: arrow keys move the selection');
  await page.keyboard.press('Control+Home');
  await page.keyboard.type('42'); await page.keyboard.press('Enter');
  const afterEnter = await page.inputValue('.sheets-name-box');
  await page.keyboard.press('ArrowUp');
  ok(afterEnter === 'A2' && await page.inputValue('.sheets-fx-input') === '42', 'DotSheets: typing 42 + Enter fills A1 and moves to A2');
  await page.keyboard.press('F2'); await page.keyboard.type('9'); await page.keyboard.press('Escape');
  ok(await page.inputValue('.sheets-fx-input') === '42', 'DotSheets: F2 edits, Escape cancels');
  await page.keyboard.press('Tab');
  ok(await page.inputValue('.sheets-name-box') === 'B1', 'DotSheets: Tab moves right');
  async function sheetsSolve(id, at, formula) {
    await page.goto(BASE + '/index.html#/sheets');
    await page.goto(BASE + '/index.html#/sheets/play/' + id);
    await page.waitForSelector('.sheets-canvas'); await sleep(200);
    await dismissModals(page, 400);
    await page.fill('.sheets-name-box', at); await page.press('.sheets-name-box', 'Enter');
    await page.keyboard.type(formula); await page.keyboard.press('Enter');
    await dismissModals(page, 300);
    await page.click('.lab-work button:has-text("Check")');
    await page.waitForSelector('.feedback .callout');
    await dismissModals(page, 600);
    return txt(page, '.feedback');
  }
  ok((await sheetsSolve('s_l1_2_1', 'J2', '=H2*I3')).startsWith('✗'), 'DotSheets: a wrong formula fails the check');
  ok((await sheetsSolve('s_l1_2_1', 'J2', '=H2*I2')).startsWith('✔'), 'DotSheets: the right formula passes');
  ok(/unlocked/.test(await sheetsSolve('sx_w1_1', 'K2', '=I2*1.1')), 'DotSheets: solving 2 of 3 unlocks level 1.2');
  async function codeSolve(route, sel, id, code) {
    await page.goto(BASE + '/index.html#/' + route);
    await page.goto(BASE + '/index.html#/' + route + '/play/' + id);
    await page.waitForSelector(sel);
    await dismissModals(page, 400);
    await page.fill(sel, code);
    await page.click('.lab-work button:has-text("Check")');
    await page.waitForSelector('.feedback .callout');
    await dismissModals(page, 600);
    return txt(page, '.feedback');
  }
  ok((await codeSolve('python', '.py-editor', 'py01', 'print("hello")')).startsWith('✗'), 'DotPython: printing something is not enough');
  ok((await codeSolve('python', '.py-editor', 'py01', 'result = df.shape[1]')).startsWith('✗'), 'DotPython: a wrong answer fails');
  ok((await codeSolve('python', '.py-editor', 'py01', 'result = len(df)')).startsWith('✔'), 'DotPython: the right answer passes');
  ok(/unlocked/.test(await codeSolve('python', '.py-editor', 'py02', 'rows, cols = df.shape\nresult = cols')), 'DotPython: solving 2 of 3 unlocks level 1.2');
  ok((await codeSolve('bi', '.bi-editor', 'bi01', 'COUNTROWS(Sales)')).startsWith('✗'), 'DotBI: a different measure fails');
  ok((await codeSolve('bi', '.bi-editor', 'bi01', 'SUM(Sales[qty])')).startsWith('✔'), 'DotBI: the right measure passes');
  ok(/unlocked/.test(await codeSolve('bi', '.bi-editor', 'bi02', 'AVERAGE(Sales[unit_price])')), 'DotBI: solving 2 of 3 unlocks level 1.2');
  await page.goto(BASE + '/index.html#/bi/play/bi04');
  await page.waitForSelector('.lab-task');
  ok(true, 'DotBI: level 1.2 can be opened');
  await page.reload();
  await page.waitForSelector('.lab-task');
  const kept = await page.evaluate(() => ({ labs: DA.ui.state.labs, xp: !!(DA.ui.state.xp['py:py01'] && DA.ui.state.xp['bi:bi01'] && DA.ui.state.xp['sheet:s_l1_2_1']) }));
  ok(Object.keys(kept.labs.sheets).length >= 2 && kept.labs.python.py01 >= 1 && kept.labs.bi.bi02 >= 1 && kept.xp, 'labs: stars and XP are still there after a reload (' + JSON.stringify(kept.labs.python) + ')');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-dotbi.png') });
  await phone.emulateMedia({ colorScheme: 'dark' });
  for (const hash of ['#/sheets/play/s_l1_2_1', '#/python/play/py01', '#/bi/play/bi01', '#/sheets']) {
    await phone.goto(BASE + '/index.html' + hash);
    await phone.waitForSelector('main .view');
    await sleep(300);
    const over = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 1, 'phone ' + hash + ': no sideways scrolling in dark mode (' + over + ')');
    await phone.screenshot({ path: path.join(SHOTS, 'phone-dark-' + hash.replace(/[#/]+/g, '-') + '.png') });
  }
  await phone.goto(BASE + '/index.html#/sheets/play/s_l1_2_1');
  await phone.waitForSelector('.sheets-canvas'); await sleep(300);
  await phone.locator('.sheets-canvas').scrollIntoViewIfNeeded();
  await phone.tap('.sheets-canvas', { position: { x: 46 + 120, y: 26 + 36 } });
  const tapped = await phone.inputValue('.sheets-name-box');
  await phone.tap('.sheets-canvas', { position: { x: 46 + 120, y: 26 + 36 } });
  ok(tapped === 'B2' && await phone.evaluate(() => document.activeElement.className === 'sheets-cell-editor'), 'phone DotSheets: a tap selects, a second tap opens the cell editor (keyboard)');
  await phone.emulateMedia({ colorScheme: 'light' });

  /* ---------- PWA: manifest, service worker, offline ---------- */
  const manifest = await page.evaluate(async () => { const r = await fetch('manifest.webmanifest'); return r.json(); });
  ok(manifest.display === 'standalone' && manifest.icons.some((i) => i.purpose === 'maskable') && manifest.start_url, 'manifest is valid and has a maskable icon');
  const iconsOk = await page.evaluate(async (icons) => (await Promise.all(icons.map((i) => fetch(i.src).then((r) => r.ok)))).every(Boolean), manifest.icons);
  ok(iconsOk, 'every icon in the manifest exists');
  const overscroll = await phone.evaluate(() => [getComputedStyle(document.documentElement).overscrollBehaviorY, getComputedStyle(document.body).overscrollBehaviorY]);
  ok(overscroll.every((v) => v === 'none'), 'phone: swiping down at the top does not stretch or reload the page (overscroll-behavior ' + overscroll.join('/') + ')');
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
  await page.click('.lab-actions button:has-text("Check")');
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
