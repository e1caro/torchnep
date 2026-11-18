/* Bloomdoku in a real browser at iPhone sizes (needs Playwright):
 *   python3 -m http.server 8000 &        (in bloomdoku/)
 *   BASE=http://localhost:8000 node tests/e2e.js
 */
'use strict';
const { chromium } = require('playwright');
const fake = require('./fake-supabase.js')(); // the account service: no test ever reaches the real one
const BASE = (process.env.BASE || 'http://localhost:8000').replace(/\/$/, '') + '/index.html';
const SIZES = [[375, 667, 'iPhone SE'], [390, 844, 'iPhone 14'], [430, 932, 'iPhone Pro Max']];

let passed = 0, failed = 0, current = '';
// ONLY=Friends node tests/e2e.js runs the sections whose name matches (each section has its own phones).
const only = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
function section(name) { current = name; if (!only || only.test(name)) console.log(name); }
async function test(name, fn) {
  if (only && !only.test(current)) return;
  try { await fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e && e.message).split('\n')[0]); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'not equal') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); }

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function phone(w, h, extra) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, locale: 'en-GB', serviceWorkers: 'block' }, extra || {}));
    await ctx.route('**/fghbrevlqmrugbnqshoj.supabase.co/**', (route) => {
      const req = route.request(), cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      const r = fake.handle(req.method(), req.url(), req.headers(), req.postData());
      return route.fulfill({ status: r.status, headers: cors, contentType: 'application/json', body: r.body == null ? '' : JSON.stringify(r.body) });
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await p.goto(BASE);
    await p.waitForSelector('.world');
    return p;
  }
  // Taps a slot: a cell, or in a twin garden the left half (first figure) or right half (second figure) of one.
  const tap = async (p, slot) => {
    const h = await p.evaluate(() => BD.game.current.h), cell = p.locator('.cell').nth(slot % h), box = await cell.boundingBox();
    await cell.dispatchEvent('pointerdown', { clientX: box.x + box.width * (slot >= h ? 0.75 : 0.25), clientY: box.y + box.height / 2 });
  };
  const key = (p, v) => p.locator('.key').nth(v - 1).click();
  const game = (p) => p.evaluate(() => { const g = BD.game.current; return { sol: g.pz.solution, giv: g.pz.givens, vals: g.vals.slice(), notes: g.notes.slice(), n: g.pz.n, slips: g.slips, garden: g.pz.garden, key: g.key, sel: g.sel }; });
  async function open(p, hash) { await p.goto(BASE + hash); await p.waitForSelector('.board'); await p.waitForTimeout(80); }
  // Plants the right flower in every empty cell (or in the first `upto`), cell first then flower.
  async function solve(p, upto) {
    const g = await game(p);
    let k = 0;
    for (let c = 0; c < g.sol.length; c++) {
      if (g.vals[c] === g.sol[c]) continue;
      if (upto != null && k++ >= upto) break;
      const sel = (await game(p)).sel;
      if (sel !== c) await tap(p, c);
      await key(p, g.sol[c]);
    }
  }
  const unlock = (p, keys) => p.evaluate((ks) => { ks.forEach((k) => { BD.state.levels[k] = { stars: 1, g: '1', extra: 0, at: 1 }; }); BD.save(); }, keys);
  const noSideScroll = async (p, where) => { const d = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok(d[0] <= d[1], where + ': page is ' + d[0] + ' px wide on a ' + d[1] + ' px screen'); };

  section('Layout at iPhone sizes');
  for (const [w, h, name] of SIZES) {
    await test(name + ' (' + w + '×' + h + '): no sideways scrolling on any page, tab bar reachable', async () => {
      const p = await phone(w, h);
      for (const hash of ['#/', '#/daily', '#/friends', '#/garden', '#/shop', '#/settings']) {
        await p.goto(BASE + hash); await p.waitForTimeout(60);
        await noSideScroll(p, hash);
        const tabs = await p.locator('.tabs a').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height, r.bottom]; }));
        eq(tabs.length, 5);
        tabs.forEach((t) => ok(t[0] >= 44 && t[1] >= 44 && t[2] <= h + 1, hash + ': tab ' + t));
      }
      await p.context().close();
    });
    await test(name + ': the whole play screen fits, the board is square, keys are 44 px or more', async () => {
      const p = await phone(w, h);
      await unlock(p, ['2-1', '2-2', '4-1', '4-2', '4-3', '8-1', '8-2', '8-3', '9-1', '9-2']);
      // 4×4 (tutorial), 5×5, 6×6, 7×7, 9×9, 9×9 with three rules, twin 4×4 (tutorial) and 9×9
      for (const lv of ['tutorial', 'play/4-1', 'play/3-1', 'play/4-3', 'play/2-3', 'play/8-4', 'tutorial/twin', 'play/9-3']) {
        await open(p, '#/' + lv);
        await noSideScroll(p, lv);
        const m = await p.evaluate(() => {
          const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
          const all = (s) => Array.prototype.map.call(document.querySelectorAll(s), (e) => { const b = e.getBoundingClientRect(); return { w: b.width, h: b.height, b: b.bottom, r: b.right, l: b.left }; });
          return { board: r('.board'), keys: all('.key'), tools: all('.tool'), top: all('.round'), cells: all('.cell'), scroll: document.documentElement.scrollHeight, vh: window.innerHeight };
        });
        ok(Math.abs(m.board.w - m.board.h) < 1.5, lv + ': board ' + m.board.w + '×' + m.board.h);
        ok(m.board.w >= Math.min(w - 30, h * 0.44), lv + ': board only ' + m.board.w + ' px wide');
        ok(m.board.l >= 0 && m.board.r <= w, lv + ': board off screen');
        m.keys.forEach((k) => ok(k.w >= 44 && k.h >= 44 && k.b <= h + 0.5 && k.l >= 0 && k.r <= w + 0.5, lv + ': key ' + JSON.stringify(k)));
        m.tools.forEach((k) => ok(k.w >= 44 && k.h >= 44, lv + ': tool ' + JSON.stringify(k)));
        m.top.forEach((k) => ok(k.w >= 44 && k.h >= 44, lv + ': top button'));
        ok(m.keys[0].h + 0 > 0 && m.board.b <= m.tools[0].b - m.tools[0].h + 1, lv + ': the board overlaps the tools');
        ok(m.scroll <= m.vh + 1, lv + ': play screen scrolls (' + m.scroll + ' > ' + m.vh + ')');
        const sizes = new Set(m.cells.map((c) => Math.round(c.w)));
        ok(sizes.size <= 2, lv + ': cells of different widths');
      }
      await p.context().close();
    });
  }

  section('Playing');
  const p = await phone(390, 844);
  await test('first visit: Pua greets, level 1-1 is open, 1-2 is locked, every world starts open', async () => {
    ok(/Pua/.test(await p.locator('.hero p').innerText()));
    eq(await p.locator('.stone.locked').count(), 33);
    eq(await p.locator('.stone:not(.locked)').count(), 11);
    ok(/Level 1/.test(await p.locator('.levelchip').innerText()) && /🌰 0/.test(await p.locator('.nutchip').innerText()));
    ok(/New to sudoku/.test(await p.locator('.tutorial-card').innerText()), 'a newcomer is offered the tutorial');
    await p.locator('[data-level="1-2"]').click();
    ok(/First seeds/.test(await p.locator('#toast').innerText()));
  });
  await test('the tutorial: three tiny 4×4 gardens with Pua showing the way, then the first real garden', async () => {
    await p.locator('.tutorial-card').click();
    await p.waitForSelector('.board');
    eq(await p.locator('.cell').count(), 16);
    ok(/Tutorial · 1\/3/.test(await p.locator('.play-title b').innerText()));
    ok(/one rule/.test(await p.locator('.bubble').innerText()), 'the first lesson explains the rule');
    eq(await p.locator('.cell.hint').count(), 1, 'the coach shows where to look');
    await solve(p);
    await p.waitForSelector('.sheet .lesson', { timeout: 4000 });
    await p.locator('.sheet .btn.primary').click();
    await p.waitForSelector('.board'); await p.waitForTimeout(150);
    ok(/Tutorial · 2\/3/.test(await p.locator('.play-title b').innerText()));
    await open(p, '#/tutorial/classic/3');
    eq(await p.locator('.cell.hint').count(), 0, 'the last lesson is all yours');
    await solve(p);
    await p.waitForSelector('.sheet .lesson', { timeout: 4000 });
    eq(await p.evaluate(() => [Object.keys(BD.state.levels).length, Object.keys(BD.state.games).length, BD.state.seen['tut-classic']]), [0, 0, 1], 'lessons are not saved as gardens');
    ok(/Plant the first garden/.test(await p.locator('.sheet .btn.primary').innerText()));
    await p.locator('.sheet .btn.primary').click();
    await p.waitForSelector('.board'); await p.waitForTimeout(100);
    eq([(await game(p)).n, await p.evaluate(() => BD.game.current.key)], [9, '1-1'], 'the map starts with a real 9×9 garden');
    await p.goto(BASE + '#/'); await p.waitForSelector('.world');
    eq(await p.locator('.tutorial-card').count(), 0, 'done: the card goes away');
  });
  await test('a level sheet shows what it teaches, the world intro and 100 numbered gardens', async () => {
    await p.locator('[data-level="1-1"]').click();
    await p.waitForSelector('.sheet .tiles');
    eq(await p.locator('.sheet .tile').count(), 100);
    ok(/most of its flowers already planted/.test(await p.locator('.sheet .intro').innerText()));
    await p.locator('.sheet .btn.primary').click();
    await p.waitForSelector('.board');
    eq((await game(p)).garden, 0);
  });
  await test('cell first, then flower: a right flower stays, the pad counts what is left', async () => {
    const g = await game(p), c = g.vals.indexOf(0);
    await tap(p, c); await key(p, g.sol[c]);
    eq((await game(p)).vals[c], g.sol[c]);
    ok(!(await p.locator('.cell').nth(c).getAttribute('class')).includes('wilt'));
    const left = await p.locator('.key').nth(g.sol[c] - 1).locator('.left').innerText();
    eq(left, String(g.n - (await game(p)).vals.filter((v) => v === g.sol[c]).length).replace(/^0$/, '✓'));
  });
  await test('a wrong flower wilts, counts as a slip, and undo and redo take it away and back', async () => {
    const g = await game(p), c = g.vals.indexOf(0), wrong = g.sol[c] % g.n + 1;
    await tap(p, c); await key(p, wrong);
    ok((await p.locator('.cell').nth(c).getAttribute('class')).includes('wilt'));
    eq((await game(p)).slips, 1);
    await p.locator('.tool.undo').click();
    eq((await game(p)).vals[c], 0);
    await p.locator('.tool.redo').click();
    eq((await game(p)).vals[c], wrong);
    await p.locator('.key.erase').click();
    eq((await game(p)).vals[c], 0);
  });
  await test('notes: pencil marks toggle, and planting a flower tidies the notes it sees', async () => {
    const g = await game(p), empty = g.vals.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const pair = await p.evaluate((empty) => { // two empty cells that see each other
      const S = BD.game.current.S;
      for (const a of empty) for (const b of empty) if (a !== b && S.sees[a][b]) return [a, b];
      return null;
    }, empty);
    ok(pair, 'two empty cells that see each other');
    const a = pair[0], b = pair[1];
    if ((await game(p)).sel !== b) await tap(p, b);
    await p.locator('.tool.notes').click();
    await key(p, g.sol[a]); await key(p, g.sol[b]);
    eq((await game(p)).notes[b], (1 << (g.sol[a] - 1)) | (1 << (g.sol[b] - 1)));
    eq(await p.locator('.cell').nth(b).locator('.notes i').count(), g.n);
    await p.locator('.tool.notes').click();
    await tap(p, a); await key(p, g.sol[a]);
    eq((await game(p)).notes[b], 1 << (g.sol[b] - 1), 'the planted flower left the note');
  });
  await test('butterfly: fly back restores the board as it was', async () => {
    const before = await game(p);
    await p.locator('.tool.fly').click();
    ok((await p.locator('.tool.fly').getAttribute('class')).includes('on'));
    await solve(p, 2);
    ok((await game(p)).vals.join() !== before.vals.join());
    await p.locator('.tool.fly').click();
    await p.locator('.sheet .btn.primary').click();
    await p.waitForTimeout(260);
    const after = await game(p);
    eq(after.vals, before.vals); eq(after.notes, before.notes);
  });
  await test('the game survives a reload exactly as left', async () => {
    const before = await game(p);
    await p.reload(); await p.waitForSelector('.board');
    const after = await game(p);
    eq([after.vals, after.notes, after.slips, after.garden], [before.vals, before.notes, before.slips, before.garden]);
    ok(/Welcome back/.test(await p.locator('.bubble').innerText()));
  });
  await test('finishing the garden: it blooms, stars are saved, the next level opens on the map', async () => {
    await solve(p);
    await p.waitForSelector('.sheet .win', { timeout: 4000 });
    eq(await p.locator('.win-stars .on').count(), 2, 'one slip earlier: two stars');
    eq(await p.locator('.win-gain .nuts').innerText(), '+3 🌰');
    ok(/^\+\d+ XP$/.test(await p.locator('.win-gain .xp').innerText()));
    eq(await p.evaluate(() => BD.state.levels['1-1']), { stars: 2, g: '2', extra: 0, at: 1 });
    eq(await p.evaluate(() => Object.keys(BD.state.games).length), 0, 'no game left in progress');
    await p.locator('.sheet a.btn.ghost').click();
    await p.waitForSelector('.world');
    ok(!(await p.locator('[data-level="1-2"]').getAttribute('class')).includes('locked'));
    ok(/★★☆/.test(await p.locator('[data-level="1-1"] .stone-stars').innerText()));
    ok(/1\/100/.test(await p.locator('[data-level="1-1"] .stone-count').innerText()));
  });
  await test('the same level continues with garden 2; any garden can be picked by number', async () => {
    await open(p, '#/play/1-1');
    eq((await game(p)).garden, 1);
    await open(p, '#/play/1-1/37');
    eq((await game(p)).garden, 36);
    ok(/Garden 37/.test(await p.locator('.play-title b').innerText()));
  });
  await test('flower first: hold a flower and tap every cell where it goes', async () => {
    await open(p, '#/play/1-2');
    const g = await game(p), v = g.sol[g.vals.indexOf(0)];
    await key(p, v);
    ok((await p.locator('.key').nth(v - 1).getAttribute('class')).includes('armed'));
    const cells = g.sol.map((s, c) => (s === v && !g.vals[c] ? c : -1)).filter((c) => c >= 0);
    for (const c of cells) await tap(p, c);
    const after = await game(p);
    cells.forEach((c) => eq(after.vals[c], v));
    ok((await p.locator('.key').nth(v - 1).getAttribute('class')).includes('full'));
  });

  section('Hints and helpers');
  await test('the hint shows a solvable cell and why; asked again it names the flower (and that costs the second star)', async () => {
    await unlock(p, ['2-1', '2-2']);
    await open(p, '#/play/2-2');
    await p.locator('.tool.hintb').click();
    const hinted = await p.locator('.cell.hint').count();
    eq(hinted, 1);
    const said = await p.locator('.bubble').innerText();
    ok(/last free cell|no other place|Only one flower/.test(said), said);
    ok(!/\d/.test(said.replace(/9×9/, '')), 'the first hint does not name the flower: ' + said);
    const cell = await p.evaluate(() => BD.game.current.hint.cell), g = await game(p);
    eq(g.vals[cell], 0); eq(g.sel, cell);
    await p.locator('.tool.hintb').click();
    const told = await p.locator('.bubble').innerText();
    ok(told.includes('It is ' + g.sol[cell]), told);
    eq(await p.evaluate(() => BD.game.current.told), true);
    await key(p, g.sol[cell]);
    eq((await game(p)).vals[cell], g.sol[cell]);
    eq(await p.locator('.cell.hint').count(), 0);
  });
  await test('hints alone finish a whole garden (60 in a row, each one right)', async () => {
    await open(p, '#/play/2-1/3');
    for (let i = 0; i < 81; i++) {
      const g = await game(p);
      if (!g.vals.includes(0)) break;
      await p.locator('.tool.hintb').click();
      const cell = await p.evaluate(() => BD.game.current.hint && BD.game.current.hint.cell);
      ok(cell != null && g.vals[cell] === 0, 'hint ' + i + ' points at an empty cell');
      await key(p, g.sol[cell]);
    }
    await p.waitForSelector('.sheet .win', { timeout: 4000 });
    eq(await p.locator('.win-stars .on').count(), 3, 'hints that only point keep all three stars');
    await p.locator('.sheet a.btn.ghost').click();
  });
  await test('caterpillar writes the notes; owl marks a wrong flower; frog plants one', async () => {
    await p.evaluate(() => { BD.state.set.wilt = false; BD.save(); });
    await open(p, '#/play/2-2/2');
    await p.locator('.tool.friends').click();
    eq(await p.locator('.sheet .helper').count(), 5);
    await p.locator('.sheet .helper').nth(1).click();
    const g = await game(p);
    g.vals.forEach((v, c) => { if (!v) ok(g.notes[c] & (1 << (g.sol[c] - 1)), 'notes of cell ' + c + ' keep the right flower'); });
    const c = g.vals.indexOf(0), wrong = g.sol[c] % 9 + 1;
    await tap(p, c); await key(p, wrong);
    ok(!(await p.locator('.cell').nth(c).getAttribute('class')).includes('wilt'), 'with wilting off nothing shows');
    await p.locator('.tool.hintb').click();
    ok(/wrong place/.test(await p.locator('.bubble').innerText()), 'the bee will not guess over a wrong flower');
    await p.locator('.tool.friends').click(); await p.locator('.sheet .helper[data-helper="owl"]').click();
    ok((await p.locator('.cell').nth(c).getAttribute('class')).includes('wilt'), 'the owl marked it');
    ok(/One flower is wilted/.test(await p.locator('.bubble').innerText()));
    await p.locator('.tool.friends').click(); await p.locator('.sheet .helper[data-helper="frog"]').click();
    eq((await game(p)).vals[c], g.sol[c], 'the frog replaced the wrong flower in the chosen cell');
    eq(await p.evaluate(() => [BD.game.current.owl, BD.game.current.frog, BD.shop.stock(BD.state, 'owl'), BD.shop.stock(BD.state, 'frog')]), [true, true, 4, 4], 'each used one charge');
    await p.evaluate(() => { BD.state.set.wilt = true; BD.save(); });
  });
  await test('new seeds swaps the garden; start over clears what was planted', async () => {
    await open(p, '#/play/2-2/5');
    await solve(p, 3);
    await p.locator('.round').nth(1).click();
    await p.locator('.sheet .btn.ghost').last().click(); await p.locator('.sheet .btn.primary').click();
    await p.waitForTimeout(300);
    let g = await game(p);
    eq(g.vals, g.giv);
    await p.locator('.round').nth(1).click();
    await p.locator('.sheet .menu > .btn').nth(1).click(); await p.locator('.sheet .btn.primary').click();
    await p.waitForSelector('.board'); await p.waitForTimeout(150);
    g = await game(p);
    eq(g.garden, 5);
  });

  section('Worlds');
  await test('every rule draws on the board: lily pads, bee paths, vines, moons and suns, bunny hops', async () => {
    await unlock(p, ['4-1', '4-2', '4-3', '5-1', '5-2', '6-1', '7-1', '8-1', '8-2', '8-3', '3-1', '2-2']);
    await open(p, '#/play/4-4');
    ok((await p.locator('.lines .thick').getAttribute('d')).length > 200);
    ok(/Lily pads/.test(await p.locator('.chips').innerText()));
    await open(p, '#/play/3-2');
    eq(await p.locator('.under .beepath').count(), 1);
    await open(p, '#/play/5-3');
    ok(await p.locator('.under .vine').count() >= 5);
    eq(await p.locator('.under .bulb').count(), await p.locator('.under .vine').count());
    await open(p, '#/play/7-2');
    ok(await p.locator('.under .moon').count() > 5 && await p.locator('.under .sun').count() > 5);
    await open(p, '#/play/6-2');
    await tap(p, 40);
    eq(await p.locator('.cell.hop').count(), 8);
    await open(p, '#/play/8-4');
    const chips = await p.locator('.chips').innerText();
    ok(/Lily pads/.test(chips) && /Vines/.test(chips) && /Even and odd/.test(chips), chips);
    await p.locator('.chips').click();
    eq(await p.locator('.sheet .rule').count(), 4, 'three rules and the moon/sun legend');
    await p.locator('.sheet-x').click();
  });
  await test('finishing the four levels of a world earns its stamp', async () => {
    await p.evaluate(() => { ['1-2', '1-3'].forEach((k) => { BD.state.levels[k] = { stars: 3, g: '3', extra: 0, at: 1 }; }); delete BD.state.games['1-4']; BD.save(); });
    await open(p, '#/play/1-4');
    await solve(p);
    await p.waitForSelector('.sheet .win', { timeout: 4000 });
    ok(/New stamp/.test(await p.locator('.stamp-new:not(.levelup)').innerText()));
    await p.locator('.sheet a.btn.ghost').click();
    await p.waitForSelector('.world');
    ok((await p.locator('#world-1 .stamp').getAttribute('class')).includes('got'));
  });

  section('Skins, daily, garden, settings');
  await test('flowers and critters replace the numbers; vines and moons add the little number', async () => {
    await p.goto(BASE + '#/settings');
    await p.locator('.settingsp .seg').nth(1).click();
    eq(await p.evaluate(() => BD.state.skin), 'flowers');
    await open(p, '#/play/2-3');
    ok(await p.locator('.cell .tok use[href^="#bd-flowers-"]').count() > 20);
    eq(await p.locator('.cell .badge').count(), 0);
    await open(p, '#/play/5-3');
    ok(await p.locator('.cell .badge').count() > 10);
    await p.locator('.round').nth(1).click();
    eq(await p.locator('.sheet .seg').count(), 2, 'only the skins you own are offered');
    await p.locator('.sheet-x').click(); await p.waitForTimeout(260);
    await p.evaluate(() => { BD.state.own['skin-critters'] = 1; BD.save(); });
    await p.locator('.round').nth(1).click();
    await p.locator('.sheet .seg[data-skin="critters"]').click();
    await p.waitForTimeout(260);
    ok(await p.locator('.cell .tok use[href^="#bd-critters-"]').count() > 10);
    await p.locator('.round').nth(1).click(); await p.locator('.sheet .seg[data-skin="numbers"]').click(); await p.waitForTimeout(260);
    ok(await p.locator('.cell > .num').count() > 10);
  });
  await test('daily bouquet: today\'s rule, solve it, streak of one, share text', async () => {
    await p.goto(BASE + '#/daily'); await p.waitForSelector('.dailyp');
    const name = await p.evaluate(() => BD.worlds.dailyOf(BD.worlds.dayKey()).name);
    ok((await p.locator('.today h2').innerText()).includes(name));
    await p.locator('.today .btn.primary').click();
    await p.waitForSelector('.board');
    await solve(p);
    await p.waitForSelector('.sheet .win', { timeout: 5000 });
    eq(await p.evaluate(() => BD.worlds.streak(BD.state.daily)), 1);
    await p.evaluate(() => { window.__shared = null; navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; });
    await p.locator('.sheet .btn.primary').click();
    const shared = await p.evaluate(() => window.__shared);
    ok(/Bloomdoku/.test(shared.text) && /★★★/.test(shared.text) && !/\d{9}/.test(shared.text), JSON.stringify(shared));
    await p.locator('.sheet a.btn').click();
    await p.waitForSelector('.dailyp');
    ok(/1 day in a row/.test(await p.locator('.streak.big').innerText()));
    eq(await p.locator('.day.got').count(), 1);
    eq(await p.locator('.today a.btn.primary').count(), 0, 'today is done: no second play');
  });
  await test('my garden: a flower per finished level, stamps, and gardens out of 3,200', async () => {
    await p.goto(BASE + '#/garden'); await p.waitForSelector('.gardenp');
    eq(await p.locator('.spot').count(), 44);
    ok(/of 4,400 gardens/.test(await p.locator('.stats').innerText()));
    ok(/Level \d+ · /.test(await p.locator('.levelcard').innerText()));
    eq(await p.locator('.bed .stamp.got').count(), 1);
    const solved = await p.evaluate(() => BD.worlds.totals(BD.state).solved);
    ok((await p.locator('.stat b').first().innerText()) === String(solved) && solved >= 4);
  });
  await test('Spanish: the whole interface switches, and back', async () => {
    await p.goto(BASE + '#/settings');
    await p.locator('.seg', { hasText: 'Español' }).click();
    ok(/Ajustes/.test(await p.locator('h1').innerText()));
    ok(/Mundos/.test(await p.locator('.tabs').innerText()));
    await p.goto(BASE + '#/'); await p.waitForSelector('.world');
    ok(/Vivero de brotes/.test(await p.locator('#world-1').innerText()));
    await open(p, '#/play/2-3');
    ok(/Bulbos escondidos · Jardín/.test(await p.locator('.play-title b').innerText()));
    ok(/Pista/.test(await p.locator('.tools').innerText()));
    await p.locator('.tool.hintb').click();
    ok(/casilla|fila|columna|parcela/.test(await p.locator('.bubble').innerText()));
    await p.goto(BASE + '#/settings');
    await p.locator('.seg', { hasText: 'English' }).click();
    ok(/Settings/.test(await p.locator('h1').innerText()));
  });
  await test('night garden: the theme is applied and remembered', async () => {
    await p.locator('.seg', { hasText: 'Night' }).click();
    eq(await p.evaluate(() => document.documentElement.getAttribute('data-theme')), 'night');
    const bg = await p.evaluate(() => getComputedStyle(document.querySelector('.card')).backgroundColor);
    await p.reload(); await p.waitForSelector('.settingsp');
    eq(await p.evaluate(() => document.documentElement.getAttribute('data-theme')), 'night');
    ok(bg !== 'rgb(255, 254, 250)', 'cards are dark: ' + bg);
    await p.locator('.seg', { hasText: 'Auto' }).click();
  });
  await test('settings toggles are saved; clearing progress keeps them', async () => {
    await p.locator('label[for="set-sundial"]').click();
    eq(await p.evaluate(() => BD.state.set.sundial), true);
    await open(p, '#/play/2-3');
    eq(await p.locator('.clock').count(), 1);
    await p.goto(BASE + '#/settings');
    await p.locator('.btn.danger').last().click(); await p.locator('.sheet .btn.primary').click();
    await p.waitForTimeout(260);
    eq(await p.evaluate(() => [Object.keys(BD.state.levels).length, Object.keys(BD.state.daily).length, BD.state.set.sundial]), [0, 0, true]);
  });
  await test('a phone set to Spanish starts in Spanish; a dark phone starts at night', async () => {
    const q = await phone(390, 844, { locale: 'es-ES', colorScheme: 'dark' });
    ok(/Soy Púa/.test(await q.locator('.hero p').innerText()));
    const bg = await q.evaluate(() => getComputedStyle(document.querySelector('.world')).backgroundColor);
    ok(!/25[0-5], 25[0-5]/.test(bg), 'dark world card: ' + bg);
    await q.context().close();
  });
  await test('keyboard on a computer: arrows move, digits plant, N toggles notes', async () => {
    await open(p, '#/play/1-1');
    const g = await game(p), c = g.vals.indexOf(0);
    await tap(p, c);
    await p.keyboard.press(String(g.sol[c]));
    eq((await game(p)).vals[c], g.sol[c]);
    await p.keyboard.press('ArrowRight');
    eq((await game(p)).sel, Math.floor(c / g.n) * g.n + (c % g.n + 1) % g.n);
  });
  await p.context().close();

  section('Twin gardens');
  const tw = await phone(390, 844);
  await test('two figures in a cell: the left half is the first, the right half the second, and the pad follows', async () => {
    await open(tw, '#/play/9-1');
    ok(/Couples/.test(await tw.locator('.chips').innerText()));
    ok(/left half/.test(await tw.locator('.bubble').innerText()), 'the first twin garden explains the two halves');
    eq(await tw.locator('.cell').count(), 81);
    eq(await tw.locator('.cell .half').count(), 162);
    const g = await game(tw), h = 81, a = [...Array(h).keys()].find((c) => !g.giv[c]), b = [...Array(h).keys()].find((c) => !g.giv[h + c]);
    ok(a != null && b != null, 'first and second figures to find');
    await tap(tw, a);
    eq((await game(tw)).sel, a);
    ok(await tw.locator('.cell').nth(a).locator('.half.fa.on').count() === 1);
    await key(tw, g.sol[a]);
    eq((await game(tw)).vals[a], g.sol[a], 'the first figure is planted');
    await tap(tw, h + b);
    if ((await game(tw)).sel !== h + b) await tap(tw, h + b);
    eq((await game(tw)).sel, h + b);
    ok((await tw.locator('.pad').getAttribute('class')).includes('second'));
    await key(tw, g.sol[h + b] % 9 + 1);
    ok(await tw.locator('.cell').nth(b).locator('.half.fb.wilt').count() === 1, 'a wrong second figure wilts on its own half');
    await tw.locator('.key.erase').click();
    await key(tw, g.sol[h + b]);
    const now = await game(tw);
    eq([now.vals[a], now.vals[h + b]], [g.sol[a], g.sol[h + b]]);
  });
  await test('notes are coloured dots in each half; the hint says which figure to look at', async () => {
    await tw.locator('.tool.friends').click(); await tw.locator('.sheet .helper').nth(1).click();
    ok(await tw.locator('.cell .dots i[class^="v"]').count() > 3, 'the caterpillar wrote dots');
    await tw.locator('.tool.hintb').click();
    ok(/(first|second) figure of the glowing cell/.test(await tw.locator('.bubble').innerText()));
    eq(await tw.locator('.half.hinted').count(), 1);
  });
  await test('the twin tutorial: a tiny 4×4 pair of gardens first', async () => {
    const q = await phone(390, 844);
    await q.goto(BASE + '#/'); await q.waitForSelector('#twin');
    await q.locator('#twin a', { hasText: 'Try two tiny ones first' }).click();
    await q.waitForSelector('.board');
    eq([await q.locator('.cell').count(), await q.locator('.cell .half').count()], [16, 32]);
    await solve(q);
    await q.waitForSelector('.sheet .lesson', { timeout: 4000 });
    ok(/Next lesson/.test(await q.locator('.sheet .btn.primary').innerText()));
    await q.context().close();
  });
  await test('finishing a twin garden: no couple twice, stars saved, the next level opens', async () => {
    await solve(tw);
    await tw.waitForSelector('.sheet .win', { timeout: 4000 });
    const done = await tw.evaluate(() => BD.state.levels['9-1']);
    eq([done.g.length, done.stars > 0], [1, true]);
    await tw.locator('.sheet a.btn.ghost').click();
    await tw.waitForSelector('#twin');
    ok(/Twin gardens/.test(await tw.locator('#twin').innerText()) && /1,200/.test(await tw.locator('#twin').innerText()));
    ok(!(await tw.locator('[data-level="9-2"]').getAttribute('class')).includes('locked'));
  });
  await test('the 9×9 ballroom plays the same way and hints alone can finish it', async () => {
    await unlock(tw, ['9-2']);
    await open(tw, '#/play/9-3');
    eq(await tw.locator('.cell').count(), 81);
    for (let i = 0; i < 60; i++) {
      const g = await game(tw);
      if (!g.vals.includes(0)) break;
      await tw.locator('.tool.hintb').click();
      const slot = await tw.evaluate(() => BD.game.current.hint && BD.game.current.hint.cell);
      ok(slot != null && g.vals[slot] === 0, 'hint ' + i);
      await key(tw, g.sol[slot]);
    }
    await tw.waitForSelector('.sheet .win', { timeout: 4000 });
    eq(await tw.locator('.win-stars .on').count(), 3);
  });
  await tw.context().close();

  section('Chestnuts and the shop');
  const sh = await phone(390, 844);
  await test('chestnuts are earned by playing and shown on the map; the shop sells helpers one by one', async () => {
    await open(sh, '#/play/1-1'); await solve(sh);
    await sh.waitForSelector('.sheet .win', { timeout: 4000 });
    eq(await sh.locator('.win-gain .nuts').innerText(), '+4 🌰');
    await sh.locator('.sheet a.btn.ghost').click(); await sh.waitForSelector('.world');
    const b = await sh.evaluate(() => BD.shop.balance(BD.state));
    ok(b >= 4 && b < 12 && (await sh.locator('.nutchip').innerText()).includes('🌰 ' + b), 'balance ' + b);
    await sh.locator('.nutchip').click(); await sh.waitForSelector('.shopp');
    await sh.locator('button[data-item="frog"]').click();
    await sh.waitForFunction((need) => new RegExp('You need ' + need + ' more chestnuts').test(document.getElementById('toast').innerText), 12 - b);
    await sh.evaluate(() => { BD.state.levels['1-2'] = { stars: 3, g: '3', extra: 0, at: 1 }; BD.save(); });
    await sh.reload(); await sh.waitForSelector('.shopp');
    const b2 = await sh.evaluate(() => BD.shop.balance(BD.state));
    await sh.locator('button[data-item="lady"]').click();
    eq(await sh.evaluate(() => [BD.shop.stock(BD.state, 'lady'), BD.shop.balance(BD.state)]), [6, b2 - 6]);
    eq(await sh.locator('.purse').innerText(), '🌰 ' + (b2 - 6));
  });
  await test('the shop has four aisles; a helper look is bought from its close-up and the helper wears it', async () => {
    eq(await sh.locator('.aisles button').count(), 4);
    await sh.evaluate(() => { BD.state.levels['1-3'] = { stars: 3, g: '3'.repeat(60), extra: 0, at: 60 }; BD.save(); });
    await sh.reload(); await sh.waitForSelector('.shopp');
    eq(await sh.locator('.items [data-item^="hskin-"]').count(), 20, 'four looks for each of the five helpers');
    const before = await sh.evaluate(() => [BD.shop.balance(BD.state), BD.shop.price(BD.state, 'hskin-bee-bumble')]);
    await sh.locator('[data-item="hskin-bee-bumble"]').click();
    await sh.waitForSelector('.sheet .stage svg');
    await sh.locator('.sheet .btn.primary').click(); await sh.waitForTimeout(260);
    eq(await sh.evaluate(() => [BD.shop.wearing(BD.state, 'h-bee'), BD.shop.balance(BD.state)]), ['bumble', before[0] - before[1]]);
    await open(sh, '#/play/2-1/7');
    await sh.locator('.tool.hintb').click();
    await sh.waitForSelector('#fx .fx-bee');
    ok((await sh.locator('#fx .fx-bee').innerHTML()).length > 200, 'the bee flies in, in its new look');
    await sh.locator('.tool.friends').click();
    eq(await sh.locator('.sheet .helper .hicon svg').count(), 5, 'the helpers sheet shows each helper drawn');
    await sh.locator('.sheet-x').click(); await sh.waitForTimeout(260);
    await sh.goto(BASE + '#/settings'); await sh.waitForSelector('.version');
    await sh.locator('.version .btn').click();
    await sh.waitForFunction(() => /latest version/.test(document.querySelector('.version').innerText));
    await sh.goto(BASE + '#/shop'); await sh.waitForSelector('.shopp');
  });
  await test('things to keep: a look for the garden, a hat for Pua, fruits for the cells; bought once, worn at will', async () => {
    await sh.evaluate(() => { ['1-2', '1-3', '1-4', '2-1'].forEach((k) => { BD.state.levels[k] = { stars: 3, g: '3'.repeat(40), extra: 0, at: 40 }; }); BD.save(); });
    await sh.reload(); await sh.waitForSelector('.shopp');
    const rich = await sh.evaluate(() => BD.shop.balance(BD.state));
    const cost = await sh.evaluate(() => ['theme-autumn', 'hat-crown', 'skin-fruits', 'effect-hearts'].map((id) => BD.shop.price(BD.state, id)));
    ok(rich > cost.reduce((a, b) => a + b), 'chestnuts: ' + rich);
    const buy = async (aisle, id) => { await sh.locator('[data-aisle="' + aisle + '"]').click(); await sh.locator('.items [data-item="' + id + '"]').click(); await sh.locator('.sheet .btn.primary').click(); await sh.waitForTimeout(260); };
    await buy('looks', 'theme-autumn');
    eq(await sh.evaluate(() => [document.documentElement.getAttribute('data-garden'), BD.shop.balance(BD.state)]), ['autumn', rich - cost[0]]);
    ok((await sh.locator('.items [data-item="theme-autumn"]').getAttribute('class')).includes('on'));
    await buy('looks', 'theme-meadow');
    eq(await sh.evaluate(() => [document.documentElement.getAttribute('data-garden'), BD.shop.balance(BD.state)]), [null, rich - cost[0]], 'wearing something owned is free');
    await buy('pua', 'hat-crown');
    eq(await sh.evaluate(() => BD.shop.wearing(BD.state, 'hat')), 'crown');
    await buy('cells', 'skin-fruits');
    await buy('looks', 'effect-hearts');
    eq(await sh.evaluate(() => BD.shop.balance(BD.state)), rich - cost[0] - cost[1] - cost[2] - cost[3]);
    await open(sh, '#/play/2-1/50');
    ok(await sh.locator('.cell .tok use[href^="#bd-fruits-"]').count() > 20, 'fruits grow in the cells');
    await sh.reload(); await sh.waitForSelector('.board');
    eq(await sh.evaluate(() => [BD.skin(), BD.shop.wearing(BD.state, 'hat'), BD.shop.wearing(BD.state, 'effect')]), ['fruits', 'crown', 'hearts'], 'kept after a reload');
    await solve(sh);
    await sh.waitForSelector('.petals i.ch', { timeout: 5000 });
    eq(await sh.locator('.petals i.ch').first().innerText(), '♥');
    await sh.locator('.sheet a.btn.ghost').click();
  });
  await test('the ladybird marks where a flower can still go; a helper with no charges left leads to the shop', async () => {
    await open(sh, '#/play/2-1/51');
    const g = await game(sh), v = g.sol[g.vals.indexOf(0)];
    await sh.locator('.tool.friends').click(); await sh.locator('.sheet .helper[data-helper="lady"]').click();
    ok(/Choose a flower first/.test(await sh.locator('.bubble').innerText()));
    eq(await sh.evaluate(() => BD.shop.stock(BD.state, 'lady')), 6, 'nothing used yet');
    await key(sh, v);
    await sh.locator('.tool.friends').click(); await sh.locator('.sheet .helper[data-helper="lady"]').click();
    const marked = await sh.locator('.cell.can').count();
    ok(marked > 0 && marked < g.vals.filter((x) => !x).length, marked + ' cells marked, fewer than all the empty ones');
    const right = g.sol.map((s, c) => (s === v && !g.vals[c] ? c : -1)).filter((c) => c >= 0);
    for (const c of right) ok((await sh.locator('.cell').nth(c).getAttribute('class')).includes('can'), 'the right cell ' + c + ' is among them');
    eq(await sh.evaluate(() => BD.shop.stock(BD.state, 'lady')), 5);
    await sh.evaluate(() => { BD.state.used.frog = 99; BD.save(); });
    await sh.locator('.tool.friends').click();
    ok(/None left/.test(await sh.locator('.sheet .helper[data-helper="frog"]').innerText()));
    await sh.locator('.sheet .helper[data-helper="frog"]').click();
    await sh.waitForSelector('.shopp');
  });
  await sh.context().close();

  section('Friends');
  const ana = await phone(390, 844), ben = await phone(390, 844);
  const signUp = async (p, user) => {
    await p.goto(BASE + '#/friends'); await p.waitForSelector('#acc-user');
    await p.fill('#acc-user', user); await p.fill('#acc-pass', 'secret-' + user);
    await p.locator('.account .btn.primary').click();
    await p.waitForSelector('.mecard');
    return p.locator('.code b').innerText();
  };
  const news = (p) => p.evaluate(() => BD.cloud.refresh());
  let anaCode = '';
  await test('creating an account needs a username and a password, and gives a friend code', async () => {
    await ana.goto(BASE + '#/friends'); await ana.waitForSelector('#acc-user');
    ok(/Play with friends/.test(await ana.locator('.friendsp').innerText()));
    await ana.fill('#acc-user', 'a'); await ana.fill('#acc-pass', 'secret-ana');
    await ana.locator('.account .btn.primary').click();
    ok(/3 to 20/.test(await ana.locator('.form-msg').innerText()));
    await open(ana, '#/play/1-1'); await solve(ana); await ana.waitForSelector('.sheet .win', { timeout: 4000 });
    anaCode = await signUp(ana, 'ana');
    ok(/^[A-HJ-NP-Z2-9]{6}$/.test(anaCode), anaCode);
    ok(/ana/.test(await ana.locator('.mecard').innerText()) && /Level 1/.test(await ana.locator('.mecard').innerText()));
    eq(Object.values(fake.saves)[0].data.levels['1-1'].g, '3', 'the progress went to the account');
    eq(await ana.locator('.frow.rank').count(), 1, 'the ranking starts with you');
  });
  await test('a friend code sends a request; accepting makes both friends, ranked by level', async () => {
    await signUp(ben, 'ben');
    await ben.fill('#fr-code', 'ZZZZZZ'); await ben.locator('.friendsp .btn.primary.small', { hasText: 'Add' }).click();
    await ben.waitForFunction(() => /Nobody has that code/.test(document.getElementById('toast').innerText));
    await ben.fill('#fr-code', anaCode.toLowerCase()); await ben.locator('.friendsp .btn.primary.small', { hasText: 'Add' }).click();
    await ben.waitForFunction(() => /has not answered yet/.test(document.querySelector('.friendsp').innerText));
    await news(ana);
    ok(/1/.test(await ana.locator('.tabs .badge-n').innerText()), 'the Friends tab shows there is news');
    await ana.goto(BASE + '#/'); await ana.goto(BASE + '#/friends');
    await ana.waitForFunction(() => /wants to be your friend/.test(document.querySelector('.friendsp').innerText));
    await ana.locator('.frow .btn.primary', { hasText: 'Accept' }).click();
    await ana.waitForSelector('a.frow.rank[data-friend="ben"]');
    const rows = await ana.locator('.frow.rank b').allInnerTexts();
    eq(rows, ['ana (you)', 'ben'], 'ana has a garden, so she is first');
    eq(await ana.locator('.tabs .badge-n').count(), 0);
  });
  await test('a friend\'s page shows their level and garden; messages and flowers arrive, with "seen"', async () => {
    await news(ben);
    await ben.goto(BASE + '#/'); await ben.goto(BASE + '#/friends'); await ben.waitForSelector('a.frow.rank[data-friend="ana"]');
    await ben.locator('a.frow.rank[data-friend="ana"]').click();
    await ben.waitForSelector('.friendp .thread');
    ok(/ana/.test(await ben.locator('.play-title').innerText()) && /Level 1/.test(await ben.locator('.play-title').innerText()));
    ok(/same level|ahead/.test(await ben.locator('.compare').innerText()));
    await ben.locator('.fgarden summary').click();
    eq(await ben.locator('.fgarden .spot').count(), 44);
    ok((await ben.locator('.fgarden .spot').first().innerHTML()).includes('scale(.8)'), 'ana\'s first level is in bloom in her garden');
    await ben.fill('#msg-text', 'Hi Ana! <i>hello</i>');
    await ben.locator('.composer .btn').click();
    await ben.waitForSelector('.msg.mine .text');
    eq(await ben.locator('.msg.mine .text').innerText(), 'Hi Ana! <i>hello</i>', 'shown as text, never as HTML');
    eq(await ben.locator('.msg i').count(), 0);
    await ben.locator('.stickers button').nth(2).click();
    await ben.waitForSelector('.msg.mine.sticker');
    await news(ana);
    eq(await ana.locator('.tabs .badge-n').innerText(), '2');
    ok(/2/.test(await ana.locator('a.frow.rank[data-friend="ben"] .badge-n').innerText().catch(async () => { await ana.goto(BASE + '#/'); await ana.goto(BASE + '#/friends'); return ana.locator('a.frow.rank[data-friend="ben"] .badge-n').innerText(); })));
    await ana.locator('a.frow.rank[data-friend="ben"]').click();
    await ana.waitForSelector('.msg .text');
    eq(await ana.locator('.msg').count(), 2);
    await ana.waitForFunction(() => !document.querySelector('.tabs .badge-n'), null, { timeout: 5000 });
    await ana.fill('#msg-text', 'Hello Ben'); await ana.keyboard.press('Enter');
    await ana.waitForSelector('.msg.mine');
    await ben.goto(BASE + '#/friends'); await ben.locator('a.frow.rank[data-friend="ana"]').click();
    await ben.waitForFunction(() => document.querySelectorAll('.msg').length === 3);
    ok(/seen/.test(await ben.locator('.msg.mine').first().innerText()), 'ben sees that ana read his message');
  });
  await test('a garden challenge: sent from the win sheet, played by the friend even in a level still locked', async () => {
    await ana.evaluate(() => { ['4-1'].forEach((k) => { BD.state.levels[k] = { stars: 1, g: '1', extra: 0, at: 1 }; }); BD.save(); });
    await open(ana, '#/play/4-2/7'); await solve(ana);
    await ana.waitForSelector('.sheet .win', { timeout: 4000 });
    await ana.locator('.challenge-btn').click();
    await ana.locator('.sheet .helper', { hasText: 'ben' }).click();
    await ana.waitForFunction(() => /Sent to ben/.test(document.getElementById('toast').innerText));
    await ben.goto(BASE + '#/friends'); await ben.locator('a.frow.rank[data-friend="ana"]').click();
    await ben.waitForSelector('.msg .challenge');
    const card = await ben.locator('.msg .challenge').innerText();
    ok(/Six pads/.test(card) && /Garden 7/.test(card) && /ana: ★★★/.test(card), card);
    ok(!(await ben.evaluate(() => BD.worlds.open(BD.state, BD.worlds.level('4-2')))), 'the level is locked for ben');
    await ben.locator('.msg .challenge .btn').click();
    await ben.waitForSelector('.board');
    eq(await ben.evaluate(() => [BD.game.current.key, BD.game.current.pz.garden, BD.game.current.pz.givens.join('')]), ['4-2', 6, await ana.evaluate(() => BD.worlds.puzzle('4-2', 6).givens.join(''))], 'the very same garden');
  });
  await test('the same account on another device brings the progress; an invitation link fills in the code', async () => {
    await ana.evaluate(() => BD.cloud.sync()); // (the app does this by itself a few seconds after a change)
    const tablet = await phone(430, 932);
    await tablet.goto(BASE + '#/friends'); await tablet.waitForSelector('#acc-user');
    await tablet.fill('#acc-user', 'ana'); await tablet.fill('#acc-pass', 'wrong-password');
    await tablet.locator('.account .btn', { hasText: 'Sign in' }).click();
    await tablet.waitForFunction(() => /Wrong username or password/.test(document.querySelector('.form-msg').innerText));
    await tablet.fill('#acc-pass', 'secret-ana');
    await tablet.locator('.account .btn', { hasText: 'Sign in' }).click();
    await tablet.waitForSelector('.mecard');
    eq(await tablet.locator('.code b').innerText(), anaCode);
    await tablet.goto(BASE + '#/'); await tablet.waitForSelector('.world');
    ok(/★★★/.test(await tablet.locator('[data-level="1-1"] .stone-stars').innerText()) && /★★★/.test(await tablet.locator('[data-level="4-2"] .stone-stars').innerText()), 'ana\'s stars are on the new device');
    await tablet.goto(BASE + '#/add/abc234'); await tablet.waitForSelector('#fr-code');
    eq(await tablet.inputValue('#fr-code'), 'ABC234');
    await tablet.goto(BASE + '#/settings'); await tablet.waitForSelector('.settingsp');
    ok(/ana/.test(await tablet.locator('.settingsp .card').first().innerText()) && /Sign out/.test(await tablet.locator('.settingsp .card').first().innerText()));
    await tablet.locator('.btn', { hasText: 'Sign out' }).click();
    await tablet.waitForSelector('#acc-user');
    ok(/★★★/.test(await tablet.evaluate(() => BD.stars(BD.worlds.stars(BD.state, '1-1')))), 'signing out keeps what is on the device');
    await tablet.context().close();
  });
  await test('removing a friend takes them off the ranking and the conversation', async () => {
    await ben.goto(BASE + '#/friends'); await ben.locator('a.frow.rank[data-friend="ana"]').click();
    await ben.waitForSelector('.friendp .thread');
    await ben.locator('.friendp .round').nth(1).click();
    await ben.locator('.sheet .btn.danger').click(); await ben.locator('.sheet .btn.primary').click();
    await ben.waitForSelector('.friendsp .mecard');
    eq(await ben.locator('a.frow.rank').count(), 0);
    eq(fake.friends.length, 0);
  });
  await test('where friends are not switched on yet, the account still works and the page says so', async () => {
    fake.friendsOff = true;
    const q = await phone(390, 844);
    await q.goto(BASE + '#/friends'); await q.waitForSelector('#acc-user');
    await q.fill('#acc-user', 'cleo'); await q.fill('#acc-pass', 'secret-cleo');
    await q.locator('.account .btn.primary').click();
    await q.waitForFunction(() => /not switched on yet/.test(document.querySelector('.friendsp').innerText));
    ok(await q.evaluate(() => BD.cloud.signedIn() && BD.cloud.friendsOff()));
    fake.friendsOff = false;
    await q.locator('.btn', { hasText: 'Try again' }).click();
    await q.waitForSelector('.mecard');
    await q.context().close();
  });
  await ana.context().close(); await ben.context().close();

  section('Offline');
  await test('after one visit the app opens with no network', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const q = await ctx.newPage();
    await q.goto(BASE);
    await q.waitForSelector('.world');
    await q.evaluate(() => navigator.serviceWorker.ready);
    await q.waitForFunction(() => caches.keys().then((k) => k.length > 0 && caches.open(k[0]).then((c) => c.keys()).then((ks) => ks.length >= 21)), null, { timeout: 8000 });
    await ctx.setOffline(true);
    await q.reload();
    await q.waitForSelector('.world');
    await q.goto(BASE + '#/play/1-1'); await q.waitForSelector('.board');
    eq(await q.locator('.cell').count(), 81);
    await ctx.close();
  });

  await test('no errors in the console during the whole run', async () => { eq(errors, []); });
  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
