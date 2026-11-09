'use strict';
const assert = require('assert');
const { DA, setDay, test, runAll } = require('./harness');
const ui = DA.ui, G = DA.game;
const metDays = (days) => days.forEach((d) => { ui.state.met[d] = true; });
const run = (start, n) => Array.from({ length: n }, (_, i) => ui.addDays(start, i));

test('date helpers are calendar-correct across month ends and DST', () => {
  assert.strictEqual(ui.addDays('2026-11-30', 1), '2026-12-01');
  assert.strictEqual(ui.addDays('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(ui.diffDays('2026-03-28', '2026-03-30'), 2); // Europe DST change on the 29th
  assert.strictEqual(ui.diffDays('2026-10-24', '2026-10-26'), 2);
});

test('levels: thresholds and titles', () => {
  assert.strictEqual(G.xpFor(2), 100); assert.strictEqual(G.xpFor(3), 250); assert.strictEqual(G.xpFor(5), 700);
  assert.strictEqual(G.level(0), 1); assert.strictEqual(G.level(99), 1); assert.strictEqual(G.level(100), 2); assert.strictEqual(G.level(249), 2); assert.strictEqual(G.level(250), 3);
  assert.strictEqual(G.title(1), 'Curious Beginner'); assert.strictEqual(G.title(4), 'Query Cadet'); assert.strictEqual(G.title(12), 'Junior Analyst');
  const li = G.levelInfo(175); assert.strictEqual(li.level, 2); assert.strictEqual(li.into, 75); assert.strictEqual(li.next, 75); assert.strictEqual(Math.round(li.pct), 50);
});

test('awards are one-time and keyed', () => {
  assert.strictEqual(G.award('lesson:l0-1', 30), 30);
  assert.strictEqual(G.award('lesson:l0-1', 30), 0);
  assert.strictEqual(G.addXp('drill:1', 10), 10); assert.strictEqual(G.addXp('drill:1', 8), 8);
  // 30 + 10 + 8 = 48 crosses the 40 XP daily goal, which adds the goal bonus once
  assert.strictEqual(G.totalXp(), 48 + ui.XP.goalBonus);
  assert.strictEqual(G.dayXp('2026-11-09'), 48 + ui.XP.goalBonus);
});

test('daily goal: reached once, adds a bonus, queues a celebration', () => {
  ui.state.profile.dailyGoal = 40;
  G.award('a', 30); assert.ok(!ui.state.met['2026-11-09']);
  G.award('b', 10);
  assert.ok(ui.state.met['2026-11-09']);
  assert.strictEqual(ui.state.xp['goal:2026-11-09'].n, ui.XP.goalBonus);
  assert.strictEqual(G._queue.filter((x) => x.type === 'goal').length, 1);
  G.award('c', 50); assert.strictEqual(G._queue.filter((x) => x.type === 'goal').length, 1);
});

test('level-up is queued when XP crosses a threshold', () => {
  G.award('x', 120);
  assert.ok(G._queue.some((x) => x.type === 'level' && x.level === 2));
});

test('streak: consecutive days, best, and today pending', () => {
  metDays(run('2026-11-05', 4)); // 5,6,7,8 ; today is the 9th and not done yet
  let s = G.streak();
  assert.strictEqual(s.count, 4); assert.ok(s.atRisk); assert.ok(!s.metToday);
  ui.state.met['2026-11-09'] = true; s = G.streak();
  assert.strictEqual(s.count, 5); assert.ok(s.metToday); assert.ok(!s.atRisk);
});

test('streak: a missed day breaks it when there is no freeze', () => {
  metDays(['2026-11-05', '2026-11-06', '2026-11-08']); // 7th missed
  let s = G.streak();
  assert.strictEqual(s.count, 1); assert.strictEqual(s.best, 2);
});

test('streak: lapsed streak shows 0 but keeps the best', () => {
  metDays(run('2026-11-01', 3)); // 1,2,3 then nothing until the 9th
  const s = G.streak();
  assert.strictEqual(s.count, 0); assert.strictEqual(s.best, 3);
});

test('streak: a freeze is earned at 7 days and covers one missed day', () => {
  metDays(run('2026-10-25', 7)); // 25..31 Oct: 7 days earns a freeze
  assert.strictEqual(G.streak().freezes, 1);
  metDays(['2026-11-02']);       // 1 Nov missed, covered by the freeze
  setDay('2026-11-02');
  let s = G.streak();
  assert.strictEqual(s.count, 8); assert.strictEqual(s.freezes, 0); assert.ok(s.metToday);
  setDay('2026-11-09');          // 3..8 Nov missed: far too many for any freeze
  assert.strictEqual(G.streak().count, 0); assert.strictEqual(G.streak().best, 8);
});

test('streak: pending freeze keeps a streak alive through a missed day', () => {
  metDays(run('2026-10-31', 7)); // 31 Oct .. 6 Nov, freeze earned
  // 7 Nov missed, 8 Nov missed, today 9 Nov: 2 missed days, 1 freeze -> broken
  assert.strictEqual(G.streak().count, 0);
  setDay('2026-11-08'); // one missed day (7 Nov) and a freeze held -> still alive
  const s = G.streak();
  assert.strictEqual(s.count, 7); assert.ok(s.atRisk);
});

test('quests: chest only when all three are done, once per day', () => {
  G.quest('lesson'); G.quest('drill');
  assert.ok(!G.quests().all); assert.strictEqual(G.quests().chest, 0);
  G.quest('sql');
  const q = G.quests();
  assert.ok(q.all); assert.ok(q.chest >= 15 && q.chest <= 40);
  assert.strictEqual(ui.state.stats.questsAll, 1);
  const before = G.totalXp(); G.quest('sql'); assert.strictEqual(G.totalXp(), before);
  // next day starts fresh
  setDay('2026-11-10'); assert.ok(!G.quests().lesson);
});

test('badges are earned once and queued', () => {
  ui.state.done['l0-1'] = true; G.touch();
  assert.ok(ui.state.badges['first-lesson']);
  const n = G._queue.filter((x) => x.type === 'badge').length;
  G.touch(); assert.strictEqual(G._queue.filter((x) => x.type === 'badge').length, n);
  const mod0 = DA.modules[0]; mod0.lessons.forEach((l) => { ui.state.done[l.id] = true; }); G.touch();
  assert.ok(ui.state.badges['mod-m0']);
  const b = G.badges().find((x) => x.id === 'quiz-5'); assert.strictEqual(b.max, 5); assert.strictEqual(b.cur, 0);
});

test('heat map and week bars have the right shape', () => {
  G.award('k', 50);
  const bars = G.weekBars(); assert.strictEqual(bars.length, 7); assert.ok(bars[6].isToday); assert.strictEqual(bars[6].xp, G.dayXp('2026-11-09'));
  const cols = G.heat(12); assert.strictEqual(cols.length, 12); assert.ok(cols.every((c) => c.length === 7));
  assert.strictEqual(cols[0][0].day, 'Mon');
  const flat = cols.flat(); assert.strictEqual(flat.filter((c) => c.d === '2026-11-09').length, 1);
  assert.ok(flat.filter((c) => c.future).every((c) => c.d > '2026-11-09'));
  assert.strictEqual(cols[11][0].d, '2026-11-09'); // 9 Nov 2026 is a Monday
});

test('v1 progress is carried over as XP without a date', () => {
  const s = ui.sanitize({ v: 1, done: { 'l0-1': true, 'l2-1': true }, quiz: { 'l0-1': { sel: 1 } }, sql: { r1: true } });
  assert.ok(s.xp['lesson:l0-1'] && s.xp['lesson:l0-1'].d === '');
  assert.ok(s.xp['quiz:l0-1'] && s.xp['sql:r1'].n === 15);
  ui.state = s; assert.ok(G.totalXp() > 0); assert.strictEqual(G.dayXp('2026-11-09'), 0);
});

test('sanitize rejects junk', () => {
  const s = ui.sanitize({ v: 2, xp: { ok: { d: '2026-11-09', n: 5 }, bad1: { d: 'yesterday', n: 5 }, bad2: { d: '2026-11-09', n: 99999 }, 'a b': { d: '', n: 1 } },
    met: { '2026-11-09': true, nope: true }, srs: { q1: { box: 9, due: '2026-11-09', t: 1 }, q2: { box: 2, due: '2026-11-10', t: 5 } },
    profile: { dailyGoal: 7, theme: 'neon', hours: 999 }, stats: { drills: -4, bestCombo: 3.9 } });
  assert.deepStrictEqual(Object.keys(s.xp), ['ok']); assert.deepStrictEqual(Object.keys(s.met), ['2026-11-09']);
  assert.deepStrictEqual(Object.keys(s.srs), ['q2']); assert.strictEqual(s.profile.dailyGoal, 40); assert.strictEqual(s.profile.theme, 'auto');
  assert.strictEqual(s.profile.hours, 8); assert.strictEqual(s.stats.drills, 0); assert.strictEqual(s.stats.bestCombo, 3);
});

require('./unit-more');
require('./unit-sync');
require('./unit-pwa');
require('./unit-native');
runAll();
