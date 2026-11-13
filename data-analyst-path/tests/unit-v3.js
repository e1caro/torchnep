'use strict';
/* Version 3: Discover feed, XP boost, streak repair, week race, mini-games. */
const assert = require('assert');
const path = require('path');
const { DA, root, setDay, advance, test } = require('./harness');
const ui = DA.ui, G = DA.game, F = DA.feed, A = DA.arcade, Y = DA.sync;
const run = (start, n) => Array.from({ length: n }, (_, i) => ui.addDays(start, i));
const cardsOf = (plan) => plan.filter((x) => x.type === 'card').map((x) => x.card);

/* ---------------------------------------------------------------- feed content */

test('feed cards: 130+, unique, well-formed, and every "go deeper" lesson exists', () => {
  const cards = DA.feedCards;
  assert.ok(cards.length >= 130, 'only ' + cards.length + ' cards');
  assert.strictEqual(new Set(cards.map((c) => c.id)).size, cards.length);
  const kinds = ['story', 'idea', 'tip', 'myth', 'chart', 'quote', 'word'];
  cards.forEach((c) => {
    assert.ok(/^[\w-]{1,40}$/.test(c.id), c.id);
    assert.ok(kinds.includes(c.kind), c.id + ' kind');
    assert.ok(DA.feedCats.includes(c.cat), c.id + ' category ' + c.cat);
    assert.ok(c.title && c.title.length <= 110, c.id + ' title');
    assert.ok(c.body.length <= 2, c.id + ' has more than 2 paragraphs');
    assert.ok(c.body.join(' ').split(/\s+/).length <= 70, c.id + ' is too long for one screen');
    if (c.lesson) assert.ok(DA.lessonById[c.lesson], c.id + ' links to unknown lesson ' + c.lesson);
    if (c.kind === 'myth') { assert.strictEqual(typeof c.truth, 'boolean'); assert.ok(c.take, c.id + ' needs an explanation'); }
    if (c.kind === 'chart') assert.ok(['truncate', 'pie', 'sort', 'rainbow', 'dual'].includes(c.chart));
    if (c.kind === 'quote') assert.ok(c.who);
    if (c.kind !== 'quote' && c.kind !== 'myth') assert.ok(c.body.length >= 1 && c.take, c.id + ' needs a body and a takeaway');
  });
  DA.feedCats.forEach((cat) => assert.ok(cards.filter((c) => c.cat === cat).length >= 8, cat + ' has too few cards'));
  const myths = cards.filter((c) => c.kind === 'myth');
  assert.ok(myths.some((m) => m.truth) && myths.some((m) => !m.truth), 'myths need both true and false answers');
});

/* ---------------------------------------------------------------- feed plan */

test('plan: same order all day, a new order tomorrow', () => {
  const a = cardsOf(F.plan('For you')).map((c) => c.id), b = cardsOf(F.plan('For you')).map((c) => c.id);
  assert.deepStrictEqual(a, b);
  setDay('2026-11-10');
  assert.notDeepStrictEqual(cardsOf(F.plan('For you')).map((c) => c.id).slice(0, 12), a.slice(0, 12));
});

test('plan: no repeats, review question every 4th slot, a game every 10th, "caught up" after 5 new cards, then an end', () => {
  const plan = F.plan('For you');
  const ids = cardsOf(plan).map((c) => c.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'a card appears twice');
  assert.strictEqual(plan[plan.length - 1].type, 'end');
  assert.strictEqual(plan[3].type, 'quiz'); assert.strictEqual(plan[7].type, 'quiz');
  const caughtAt = plan.findIndex((x) => x.type === 'caught');
  assert.strictEqual(plan.slice(0, caughtAt).filter((x) => x.type === 'card').length, 5, 'caught-up card comes after exactly 5 new cards');
  assert.strictEqual(plan.filter((x) => x.type === 'caught').length, 1);
  assert.ok(plan.some((x) => x.type === 'game'));
  const quizIds = plan.filter((x) => x.type === 'quiz').map((x) => x.q.id);
  assert.strictEqual(new Set(quizIds).size, quizIds.length, 'a question appears twice');
  assert.ok(plan.length <= F.MAX + 3);
});

test('plan: never two cards of the same kind in a row near the top', () => {
  const kinds = cardsOf(F.plan('For you')).slice(0, 40).map((c) => c.kind);
  for (let i = 1; i < kinds.length; i++) assert.notStrictEqual(kinds[i], kinds[i - 1], 'two ' + kinds[i] + ' cards in a row at ' + i);
});

test('plan: due review questions come before new ones', () => {
  ui.state.srs.x05 = { box: 1, due: '2026-11-09', t: 1 };
  ui.state.srs.x09 = { box: 2, due: '2026-11-01', t: 1 };
  const q = F.plan('For you').filter((x) => x.type === 'quiz').map((x) => x.q.id);
  assert.deepStrictEqual(q.slice(0, 2).sort(), ['x05', 'x09']);
});

test('plan: unread cards first, then read ones (oldest first); topics being studied drift forward', () => {
  ['s-wald', 's-snow', 't-sql-cte'].forEach((id, i) => { ui.state.cards[id] = ui.addDays('2026-11-01', i); });
  const ids = cardsOf(F.plan('For you')).map((c) => c.id);
  const firstRead = ids.findIndex((id) => ui.state.cards[id]);
  assert.strictEqual(firstRead, ids.length - 3);
  assert.deepStrictEqual(ids.slice(-3), ['s-wald', 's-snow', 't-sql-cte']);
  // studying SQL: SQL cards are over-represented in the first 20
  ui.state.done['l2-1'] = true; ui.state.done['l0-1'] = true; ui.state.done['l0-2'] = true; ui.state.done['l0-3'] = true;
  ['l1-1', 'l1-2', 'l1-3'].forEach((l) => { ui.state.done[l] = true; });
  const top = cardsOf(F.plan('For you')).slice(0, 20).filter((c) => c.cat === 'SQL').length;
  assert.ok(top >= 5, 'only ' + top + ' SQL cards in the first 20');
});

test('plan: a category filter shows only that category, with no questions or games', () => {
  const plan = F.plan('Charts');
  assert.ok(cardsOf(plan).length >= 8 && cardsOf(plan).every((c) => c.cat === 'Charts'));
  assert.ok(plan.every((x) => x.type === 'card' || x.type === 'end'));
});

test('plan: saved cards, deep links, and an unknown filter falls back to "For you"', () => {
  assert.deepStrictEqual(F.plan('Saved'), [{ type: 'empty' }]);
  F.toggleSave('s-mars'); F.toggleSave('q-box');
  assert.deepStrictEqual(cardsOf(F.plan('Saved')).map((c) => c.id).sort(), ['q-box', 's-mars']);
  assert.strictEqual(F.toggleSave('q-box'), false); assert.ok(!F.isSaved('q-box'));
  const plan = F.plan('For you', 's-tanks');
  assert.strictEqual(plan[0].card.id, 's-tanks');
  assert.strictEqual(cardsOf(plan).filter((c) => c.id === 's-tanks').length, 1);
  assert.strictEqual(F.plan('nonsense')[0].type, 'card');
});

test('reading collects a card once, pays XP once, and five in a day pays the daily bonus', () => {
  ui.state.profile.dailyGoal = 80; // keep the daily-goal bonus out of the arithmetic
  assert.strictEqual(F.markRead('s-wald'), true); assert.strictEqual(F.markRead('s-wald'), false);
  assert.strictEqual(G.totalXp(), ui.XP.card);
  assert.strictEqual(F.markRead('m-avg', true), true);
  assert.strictEqual(G.totalXp(), 2 * ui.XP.card + ui.XP.cardRight);
  assert.strictEqual(F.markRead('nope'), false);
  ['s-snow', 's-mars'].forEach((id) => F.markRead(id));
  assert.ok(!ui.state.xp['feed5:2026-11-09']);
  F.markRead('q-box');
  assert.strictEqual(ui.state.xp['feed5:2026-11-09'].n, ui.XP.feedFive);
  assert.strictEqual(F.readToday(), 5); assert.strictEqual(F.collected(), 5);
  // nothing left before "caught up" today
  assert.ok(!F.plan('For you').some((x) => x.type === 'caught'));
  setDay('2026-11-10'); assert.strictEqual(F.readToday(), 0);
  assert.ok(F.plan('For you').some((x) => x.type === 'caught'));
});

test('collection summary and share text', () => {
  F.markRead('s-wald');
  const col = F.collection();
  assert.deepStrictEqual(col.map((c) => c.cat), DA.feedCats);
  assert.strictEqual(col.find((c) => c.cat === 'Stories').have, 1);
  assert.strictEqual(col.reduce((t, c) => t + c.cards.length, 0), DA.feedCards.length);
  assert.ok(F.shareText(DA.feedById['s-wald']).includes('survivorship'));
  assert.ok(F.shareText(DA.feedById['m-avg']).startsWith(DA.feedById['m-avg'].title + '\nMyth.'));
  assert.ok(F.shareText(DA.feedById['q-box']).includes('George Box'));
});

/* ---------------------------------------------------------------- boost, repair, week race */

test('XP boost: 15 minutes of double XP after the quest chest, then back to normal', () => {
  ui.state.profile.dailyGoal = 80;
  assert.strictEqual(G.boostLeft(), 0);
  G.quest('lesson'); G.quest('drill'); G.quest('sql');
  assert.strictEqual(G.boostLeft(), G.BOOST_MS);
  assert.strictEqual(G.award('a', 10), 20, 'doubled');
  assert.strictEqual(G.addXp('round', 8), 16);
  advance(G.BOOST_MS - 1000); assert.ok(G.boostLeft() > 0);
  advance(2000); assert.strictEqual(G.boostLeft(), 0);
  assert.strictEqual(G.award('b', 10), 10, 'normal again');
});

test('capped awards (endless games cannot be farmed)', () => {
  ui.state.profile.dailyGoal = 80;
  assert.strictEqual(G.addXp('game:corr:2026-11-09', 12, 'x', 20), 12);
  assert.strictEqual(G.addXp('game:corr:2026-11-09', 12, 'x', 20), 8);
  assert.strictEqual(G.addXp('game:corr:2026-11-09', 5, 'x', 20), 0);
  assert.strictEqual(ui.state.xp['game:corr:2026-11-09'].n, 20);
  assert.strictEqual(G.addXp('game:new', 5, 'x', 0), 0); assert.ok(!ui.state.xp['game:new'], 'no empty ledger entry is left behind');
});

test('streak repair: twice the goal on the day after a miss wins the streak back', () => {
  ui.state.profile.dailyGoal = 20;
  run('2026-11-04', 4).forEach((d) => { ui.state.met[d] = true; }); // 4,5,6,7 Nov; the 8th was missed; today is the 9th
  assert.strictEqual(G.streak().count, 0);
  let o = G.repairOffer();
  assert.deepStrictEqual({ streak: o.streak, need: o.need, left: o.left, day: o.day }, { streak: 4, need: 40, left: 40, day: '2026-11-08' });
  G.award('x', 25); // reaches the normal goal (20) and its +10 bonus: 35, not yet 40
  assert.ok(ui.state.met['2026-11-09']); assert.ok(!ui.state.repaired['2026-11-08']);
  assert.strictEqual(G.streak().count, 1);
  assert.strictEqual(G.repairOffer().left, 5);
  G.award('y', 5);
  assert.ok(ui.state.repaired['2026-11-08']);
  assert.strictEqual(G.streak().count, 5, '4 days + today, yesterday forgiven');
  assert.strictEqual(G.repairOffer(), null);
  assert.ok(ui.state.badges.comeback);
  assert.strictEqual(G._queue.filter((x) => x.type === 'repair').length, 1);
});

test('streak repair is not offered when it should not be', () => {
  ui.state.profile.dailyGoal = 20;
  ui.state.met['2026-11-06'] = true; ui.state.met['2026-11-07'] = true;        // run of 2: too short
  assert.strictEqual(G.repairOffer(), null);
  ui.state.met = {}; run('2026-11-03', 4).forEach((d) => { ui.state.met[d] = true; }); // ended on the 6th: two days missed
  assert.strictEqual(G.repairOffer(), null);
  ui.state.met = {}; run('2026-11-01', 7).forEach((d) => { ui.state.met[d] = true; }); // 7-day run earned a freeze, which covers the 8th
  assert.strictEqual(G.streak().count, 7); assert.strictEqual(G.repairOffer(), null);
  ui.state.met = {}; run('2026-11-05', 4).forEach((d) => { ui.state.met[d] = true; }); // nothing missed
  assert.strictEqual(G.repairOffer(), null);
});

test('streak as of an earlier date, and flame tiers', () => {
  run('2026-11-01', 9).forEach((d) => { ui.state.met[d] = true; });
  assert.strictEqual(G.streak('2026-11-03').count, 3);
  assert.strictEqual(G.streak().count, 9);
  assert.deepStrictEqual([0, 6, 7, 29, 30, 99, 100, 400].map(G.flameTier), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('week race: this week against the same point of last week', () => {
  // today is Monday 9 Nov 2026. Move to Wednesday the 11th.
  setDay('2026-11-11');
  const put = (k, d, n) => { ui.state.xp[k] = { d, n }; };
  put('a', '2026-11-02', 50); put('b', '2026-11-04', 30); put('c', '2026-11-06', 100); // last week: Mon 50, Wed 30, Fri 100
  put('d', '2026-11-09', 60); put('e', '2026-11-11', 40);                               // this week: Mon 60, Wed 40
  put('old', '2026-10-20', 500); put('carried', '', 999);
  const r = G.weekRace();
  assert.deepStrictEqual({ cur: r.cur, prevSame: r.prevSame, prevAll: r.prevAll, best: r.best, ahead: r.ahead, day: r.day, beaten: r.beaten },
    { cur: 100, prevSame: 80, prevAll: 180, best: 500, ahead: 20, day: 2, beaten: false });
  put('f', '2026-11-11', 90); G.touch();
  assert.ok(G.weekRace().beaten); assert.ok(ui.state.badges['beat-week']);
});

test('the chapter bonus is paid once, by the boss case, with the old chest key', () => {
  ui.state.profile.dailyGoal = 80;
  const J = DA.journey, m = DA.modules[0];
  m.lessons.forEach((l) => { J.complete(l.id, true); });
  assert.ok(!ui.state.xp['module:' + m.id], 'finishing the lessons no longer pays the chest');
  assert.strictEqual(J.bossResult(m.id, 1, 3).stars, 0);
  assert.ok(!ui.state.xp['module:' + m.id]);
  const r = J.bossResult(m.id, 3, 3);
  assert.strictEqual(r.stars, 3);
  assert.strictEqual(r.xp, ui.XP.module);
  assert.strictEqual(J.bossResult(m.id, 3, 3).xp, 0);
  assert.ok(J.boss(m.id).won);
});

test('new state survives sanitize and merges without loss', () => {
  const a = ui.sanitize({ v: 2, cards: { 's-wald': '2026-11-05', bogus: '2026-11-05', 's-snow': 'yesterday' }, saved: { 's-mars': true, nope: true },
    blocks: { b01: true, b03: 3, b04: 7, b05: 'x', b999: 2 }, repaired: { '2026-11-08': true, x: true }, boost: 1700000000000, stats: { corrBest: 6 } });
  assert.deepStrictEqual(a.cards, { 's-wald': '2026-11-05' }); assert.deepStrictEqual(a.saved, { 's-mars': true });
  assert.deepStrictEqual(a.blocks, { b01: 1, b03: 3 }, 'old saves (true) count as 1 star; bad values and unknown puzzles are dropped'); assert.deepStrictEqual(a.repaired, { '2026-11-08': true });
  assert.strictEqual(a.boost, 1700000000000);
  const b = ui.sanitize({ v: 2, cards: { 's-wald': '2026-11-02', 'q-box': '2026-11-06' }, saved: { 'q-box': true }, blocks: { b02: 2, b01: 3, b03: 1 }, repaired: { '2026-10-01': true }, boost: 5, stats: { corrBest: 9 } });
  const m = Y.merge(a, b);
  assert.deepStrictEqual(m.cards, { 's-wald': '2026-11-02', 'q-box': '2026-11-06' });
  assert.deepStrictEqual(Object.keys(m.saved).sort(), ['q-box', 's-mars']);
  assert.deepStrictEqual(m.blocks, { b01: 3, b02: 2, b03: 3 }, 'merging keeps the best stars of each puzzle');
  assert.deepStrictEqual(Object.keys(m.repaired).sort(), ['2026-10-01', '2026-11-08']);
  assert.strictEqual(m.boost, 1700000000000); assert.strictEqual(m.stats.corrBest, 9);
  assert.deepStrictEqual(Y.merge(m, a), m); assert.deepStrictEqual(Y.merge(b, a).cards, m.cards);
});

/* ---------------------------------------------------------------- mini-games */

test('guess the correlation: the answer shown is the true correlation of the picture', () => {
  let neg = 0, pos = 0;
  for (let i = 0; i < 300; i++) {
    const r = A.corrRound();
    assert.strictEqual(r.pts.length, 40);
    r.pts.forEach((p) => assert.ok(p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1));
    assert.ok(Math.abs(A.pearson(r.pts) - r.r) <= 0.006, 'drawn points have r=' + A.pearson(r.pts) + ' but the game says ' + r.r);
    assert.ok(r.r >= -1 && r.r <= 1);
    if (r.r < -0.3) neg++; if (r.r > 0.3) pos++;
  }
  assert.ok(neg > 50 && pos > 50, 'both directions appear');
  assert.deepStrictEqual([[0.5, 0.5], [0.45, 0.5], [0.4, 0.5], [0.31, 0.5], [0.29, 0.5], [-0.5, 0.5]].map((x) => A.corrScore(x[0], x[1])), [3, 3, 2, 1, 0, 0]);
  assert.strictEqual(A.corrWord(0.05), 'almost no relationship'); assert.strictEqual(A.corrWord(-0.7), 'a strong negative relationship'); assert.strictEqual(A.corrWord(0.2), 'a weak positive relationship');
});

test('SQL blocks: 90+ puzzles in 8 levels, well-formed, with fix-the-bug puzzles in every level', () => {
  assert.ok(DA.puzzles.length >= 90, DA.puzzles.length + ' puzzles');
  assert.strictEqual(DA.blockLevels.length, 8);
  const ids = new Set(), asks = new Set();
  DA.puzzles.forEach((p, i) => {
    assert.strictEqual(p.id, 'b' + String(i + 1).padStart(2, '0'), 'ids are permanent and in order');
    assert.ok(!asks.has(p.ask), 'duplicate question: ' + p.ask); asks.add(p.ask); ids.add(p.id);
    assert.strictEqual(p.sql, p.tiles.join(' ')); assert.ok(p.ask && p.why, p.id);
    assert.ok(p.extra.length >= (p.fix ? 1 : 2), p.id + ' needs tempting wrong tiles');
    assert.ok(DA.datasets[p.ds], p.id + ' dataset'); assert.ok(p.tiles.length >= 4 && p.tiles.length <= 18, p.id + ' has ' + p.tiles.length + ' tiles');
    assert.ok(p.lv >= 1 && p.lv <= 8, p.id + ' level');
    const t = A.blockTiles(p), pool = A.blockPool(p);
    assert.strictEqual(t.length, pool.length);
    assert.deepStrictEqual(t.map((x) => x.text).sort(), pool.slice().sort());
    if (p.fix) {
      assert.notStrictEqual(p.fix.join(' '), p.sql, p.id + ' broken query is different');
      assert.deepStrictEqual(A.blockStart(p, t).map((x) => x.text), p.fix, p.id + ' starts with the broken query in the tray');
    } else assert.deepStrictEqual(A.blockStart(p, t), []);
  });
  // the tiles of the answer are always all there, for both kinds
  DA.puzzles.forEach((p) => { const pool = A.blockPool(p).slice(); p.tiles.forEach((x) => { const k = pool.indexOf(x); assert.ok(k >= 0, p.id + ' misses ' + x); pool.splice(k, 1); }); });
  DA.blockLevels.forEach((l) => {
    const ps = A.levelPuzzles(l.n);
    assert.ok(ps.length >= 10, 'level ' + l.n + ' has ' + ps.length);
    assert.ok(ps.some((p) => p.fix), 'level ' + l.n + ' has a bug to fix');
  });
});

test('SQL blocks: rounds, levels, stars and "continue"', () => {
  A.rand = () => 0.42;
  const l1 = A.levelPuzzles(1).map((p) => p.id);
  assert.deepStrictEqual(A.blockRound(1).map((p) => p.id), l1.slice(0, 5), 'unsolved ones first, in order');
  assert.strictEqual(A.nextLevel(), 1);
  l1.slice(0, 5).forEach((id) => { ui.state.blocks[id] = 3; });
  assert.deepStrictEqual(A.blockRound(1).map((p) => p.id), l1.slice(5, 10));
  A.levelPuzzles(1).forEach((p) => { ui.state.blocks[p.id] = 3; });
  ui.state.blocks[l1[2]] = 1;
  assert.strictEqual(A.blockRound(1)[0].id, l1[2], 'once all are solved, the ones with fewest stars come back first');
  assert.strictEqual(A.nextLevel(), 2, 'continue goes to the first level not cleared');
  assert.deepStrictEqual(A.blockRound().map((p) => p.lv), [2, 2, 2, 2, 2]);
  const st = A.levelStats(1);
  assert.ok(st.cleared && st.solved === st.total && st.stars === st.max - 2);
  const mix = A.blockRound('mix');
  assert.strictEqual(mix.length, 5); assert.ok(mix.every((p) => ui.state.blocks[p.id]), 'mixed review only uses solved puzzles');
  ui.state.blocks = {};
  assert.ok(A.blockRound('mix').every((p) => p.lv === 1), 'mixed review with nothing solved falls back to "continue"');
  DA.puzzles.forEach((p) => { ui.state.blocks[p.id] = 3; });
  ui.state.blocks[A.levelPuzzles(6)[0].id] = 2;
  assert.strictEqual(A.nextLevel(), 6, 'all cleared: continue goes where stars are missing');
  const T = A.totals();
  assert.strictEqual(T.solved, DA.puzzles.length); assert.strictEqual(T.levels, 8); assert.strictEqual(T.fixed, T.fixes); assert.strictEqual(T.stars, T.max - 1);
  // stars
  assert.deepStrictEqual([[1, 0], [2, 0], [1, 1], [3, 0], [2, 1], [1, 2], [6, 4]].map(([c, hn]) => A.starsFor(c, hn)), [3, 2, 2, 1, 1, 1, 1]);
  assert.strictEqual(A.stars('b01', { blocks: { b01: true } }), 1, 'old saves count as one star');
  // tiles are never handed out already in order
  A.rand = () => 0.999999; // a "shuffle" that changes nothing
  const p = DA.puzzles[0], order = A.blockTiles(p).map((x) => x.i).join();
  assert.notStrictEqual(order, A.blockPool(p).map((_, k) => k).join());
  A.rand = Math.random;
});

test('SQL blocks: hints point at the wrong tile or the next one, and tiles get a colour by kind', () => {
  const p = DA.puzzles.find((x) => x.fix && x.ask.includes('3 CHEAPEST'));
  const h1 = A.blockHint(p, p.fix);
  assert.strictEqual(h1.text, 'DESC', 'in the broken query the hint points at the bug');
  const h2 = A.blockHint(p, p.tiles.slice(0, 3));
  assert.strictEqual(h2.next, p.tiles[3]);
  assert.ok(/Check/.test(A.blockHint(p, p.tiles).say));
  assert.strictEqual(A.blockHint(p, p.tiles.concat(['ASC'])).text, 'ASC', 'an extra tile at the end is pointed out');
  const kinds = { SELECT: 'kw', 'GROUP BY': 'kw', 'LIMIT 3': 'kw', 'WITH per AS': 'kw', 'COUNT(*)': 'fn', "channel = 'delivery'": 'cond', 'price > 4': 'cond', 'orders o': 'tbl', products: 'tbl', 'name ,': 'col', '(SELECT AVG(price) FROM products)': 'sub' };
  Object.entries(kinds).forEach(([t, k]) => assert.strictEqual(A.tileKind(t), k, t));
  // row order matters only when the final result is sorted
  assert.ok(A.sortsResult('SELECT a FROM t ORDER BY a'));
  assert.ok(!A.sortsResult('SELECT a , RANK() OVER (ORDER BY a) FROM t'));
  assert.ok(A.sortsResult('WITH m AS (SELECT x FROM t ORDER BY x) SELECT x FROM m ORDER BY x'));
});

test('SQL blocks: every reference query runs on the practice data, and answers are judged by their result', async () => {
  const initSqlJs = require(path.join(root, 'vendor/sql.js/sql-wasm.js'));
  const SQL = await initSqlJs();
  const dbs = { retail: DA.buildDb(SQL, 'retail'), lab: DA.buildDb(SQL, 'lab') };
  const runner = (ds) => (sql) => { const r = dbs[ds].exec(sql); return r.length ? r[r.length - 1] : undefined; };
  DA.puzzles.forEach((p) => {
    const res = runner(p.ds)(p.sql);
    assert.ok(res && res.values.length >= 1, p.id + ' returns no rows: ' + p.sql);
    assert.strictEqual(A.blockCheck(p, p.tiles, runner(p.ds)).ok, true, p.id);
    assert.strictEqual(A.blockCheck(p, p.tiles, null).ok, true, p.id + ' (no engine)');
    assert.strictEqual(A.blockCheck(p, p.tiles.slice(0, -1), runner(p.ds)).ok, false, p.id + ' accepts an incomplete query');
    if (p.fix) assert.strictEqual(A.blockCheck(p, p.fix, runner(p.ds)).ok, false, p.id + ': the "broken" query is accepted as right');
    if (p.fix) assert.strictEqual(A.blockCheck(p, p.fix, null).ok, false);
  });
  const byAsk = (t) => DA.puzzles.find((p) => p.ask.includes(t));
  // an equivalent arrangement is accepted (conditions swapped around AND)
  const and = byAsk('older than 50');
  const swapped = ['SELECT', 'participant_id', 'FROM', 'participants', 'WHERE', "group_name = 'intervention'", 'AND', 'age > 50'];
  assert.strictEqual(A.blockCheck(and, swapped, runner('lab')).ok, true);
  assert.strictEqual(A.blockCheck(and, swapped, null).ok, false, 'without the engine only the reference order passes');
  // the tempting wrong tiles really are wrong
  const del = byAsk('delivery orders');
  const noQuotes = A.blockCheck(del, ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', 'channel = delivery'], runner('retail'));
  assert.ok(!noQuotes.ok && noQuotes.error && /no such column/.test(noQuotes.message), noQuotes.message);
  const never = byAsk('never placed');
  assert.strictEqual(A.blockCheck(never, ['SELECT', 'COUNT(*)', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON', 'o.customer_id = c.customer_id', 'WHERE', 'o.order_id = NULL'], runner('retail')).ok, false);
  assert.strictEqual(A.blockCheck(never, ['SELECT', 'COUNT(*)', 'FROM', 'customers c', 'JOIN', 'orders o', 'ON', 'o.customer_id = c.customer_id', 'WHERE', 'o.order_id IS NULL'], runner('retail')).ok, false);
  const having = byAsk('more than 3 products');
  assert.ok(A.blockCheck(having, ['SELECT', 'category', 'FROM', 'products', 'WHERE', 'COUNT(*) > 3', 'GROUP BY', 'category'], runner('retail')).error);
  const top3 = byAsk('3 most expensive');
  assert.strictEqual(A.blockCheck(top3, ['SELECT', 'name ,', 'price', 'FROM', 'products', 'ORDER BY', 'price', 'ASC', 'LIMIT 3'], runner('retail')).ok, false);
  assert.strictEqual(A.blockCheck(top3, [], runner('retail')).ok, false);
});
