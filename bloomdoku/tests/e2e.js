/* Bloomdoku in a real browser at iPhone sizes (needs Playwright):
 *   python3 -m http.server 8000 &        (in bloomdoku/)
 *   BASE=http://localhost:8000 node tests/e2e.js
 */
'use strict';
const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:8000').replace(/\/$/, '') + '/index.html';
const SIZES = [[375, 667, 'iPhone SE'], [390, 844, 'iPhone 14'], [430, 932, 'iPhone Pro Max']];

let passed = 0, failed = 0;
async function test(name, fn) {
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
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(BASE);
    await p.waitForSelector('.world');
    return p;
  }
  const tap = (p, c) => p.locator('.cell').nth(c).dispatchEvent('pointerdown');
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

  console.log('Layout at iPhone sizes');
  for (const [w, h, name] of SIZES) {
    await test(name + ' (' + w + '×' + h + '): no sideways scrolling on any page, tab bar reachable', async () => {
      const p = await phone(w, h);
      for (const hash of ['#/', '#/daily', '#/garden', '#/settings']) {
        await p.goto(BASE + hash); await p.waitForTimeout(60);
        await noSideScroll(p, hash);
        const tabs = await p.locator('.tabs a').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height, r.bottom]; }));
        eq(tabs.length, 4);
        tabs.forEach((t) => ok(t[0] >= 44 && t[1] >= 44 && t[2] <= h + 1, hash + ': tab ' + t));
      }
      await p.context().close();
    });
    await test(name + ': the whole play screen fits, the board is square, keys are 44 px or more', async () => {
      const p = await phone(w, h);
      await unlock(p, ['1-1', '1-2', '2-1', '2-2', '4-1', '4-2', '4-3', '8-1', '8-2', '8-3']);
      for (const lv of ['1-1', '4-1', '1-3', '4-3', '2-3', '8-4']) { // 4×4, 5×5, 6×6, 7×7, 9×9, 9×9 with three rules
        await open(p, '#/play/' + lv);
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

  console.log('Playing');
  const p = await phone(390, 844);
  await test('first visit: Pua greets, level 1-1 is open, 1-2 is locked, every world starts open', async () => {
    ok(/Pua/.test(await p.locator('.hero p').innerText()));
    eq(await p.locator('.stone.locked').count(), 24);
    eq(await p.locator('.stone:not(.locked)').count(), 8);
    await p.locator('[data-level="1-2"]').click();
    ok(/Four little seeds/.test(await p.locator('#toast').innerText()));
  });
  await test('a level sheet shows what it teaches, the world intro and 100 numbered gardens', async () => {
    await p.locator('[data-level="1-1"]').click();
    await p.waitForSelector('.sheet .tiles');
    eq(await p.locator('.sheet .tile').count(), 100);
    ok(/one rule of sudoku/.test(await p.locator('.sheet .intro').innerText()));
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

  console.log('Hints and helpers');
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
    eq(await p.locator('.sheet .helper').count(), 4);
    await p.locator('.sheet .helper').nth(1).click();
    const g = await game(p);
    g.vals.forEach((v, c) => { if (!v) ok(g.notes[c] & (1 << (g.sol[c] - 1)), 'notes of cell ' + c + ' keep the right flower'); });
    const c = g.vals.indexOf(0), wrong = g.sol[c] % 9 + 1;
    await tap(p, c); await key(p, wrong);
    ok(!(await p.locator('.cell').nth(c).getAttribute('class')).includes('wilt'), 'with wilting off nothing shows');
    await p.locator('.tool.hintb').click();
    ok(/wrong place/.test(await p.locator('.bubble').innerText()), 'the bee will not guess over a wrong flower');
    await p.locator('.tool.friends').click(); await p.locator('.sheet .helper').nth(2).click();
    ok((await p.locator('.cell').nth(c).getAttribute('class')).includes('wilt'), 'the owl marked it');
    ok(/One flower is wilted/.test(await p.locator('.bubble').innerText()));
    await p.locator('.tool.friends').click(); await p.locator('.sheet .helper').nth(3).click();
    eq((await game(p)).vals[c], g.sol[c], 'the frog replaced the wrong flower in the chosen cell');
    eq(await p.evaluate(() => [BD.game.current.owl, BD.game.current.frog]), [true, true]);
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

  console.log('Worlds');
  await test('every rule draws on the board: lily pads, bee paths, vines, moons and suns, bunny hops', async () => {
    await unlock(p, ['4-1', '4-2', '4-3', '5-1', '5-2', '6-1', '7-1', '8-1', '8-2', '8-3', '3-1']);
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
    ok(/New stamp/.test(await p.locator('.stamp-new').innerText()));
    await p.locator('.sheet a.btn.ghost').click();
    await p.waitForSelector('.world');
    ok((await p.locator('#world-1 .stamp').getAttribute('class')).includes('got'));
  });

  console.log('Skins, daily, garden, settings');
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
    await p.locator('.sheet .seg').nth(2).click();
    await p.waitForTimeout(260);
    ok(await p.locator('.cell .tok use[href^="#bd-critters-"]').count() > 10);
    await p.locator('.round').nth(1).click(); await p.locator('.sheet .seg').nth(0).click(); await p.waitForTimeout(260);
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
    eq(await p.locator('.spot').count(), 32);
    ok(/of 3,200 gardens/.test(await p.locator('.stats').innerText()));
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
    await p.locator('.btn.danger').click(); await p.locator('.sheet .btn.primary').click();
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

  console.log('Offline');
  await test('after one visit the app opens with no network', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const q = await ctx.newPage();
    await q.goto(BASE);
    await q.waitForSelector('.world');
    await q.evaluate(() => navigator.serviceWorker.ready);
    await q.waitForFunction(() => caches.keys().then((k) => k.length > 0 && caches.open(k[0]).then((c) => c.keys()).then((ks) => ks.length >= 18)), null, { timeout: 8000 });
    await ctx.setOffline(true);
    await q.reload();
    await q.waitForSelector('.world');
    await q.goto(BASE + '#/play/1-1'); await q.waitForSelector('.board');
    eq(await q.locator('.cell').count(), 16);
    await ctx.close();
  });

  await test('no errors in the console during the whole run', async () => { eq(errors, []); });
  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
