'use strict';
/* The journey: every mission and boss resolves, every lab level is practised somewhere, and old saved progress migrates exactly. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DA, test, runAll, setDay } = require('./harness');

const root = path.join(__dirname, '..');
['js/sheets/core.js', 'js/sheets/format.js', 'js/sheets/names-es.js', 'js/sheets/parser.js', 'js/sheets/fn-core.js', 'js/sheets/fn-catalog.js', 'js/sheets/engine.js',
  'js/sheets/datatools.js', 'js/sheets/edit.js', 'js/data/sheets-challenges.js', 'js/data/lab-sheets.js', 'js/python/engine.js', 'js/python/interp.js',
  'js/data/lab-python.js', 'js/bi/engine.js', 'js/data/lab-bi.js', 'js/data/lab-sql.js', 'js/labgame.js'].forEach((f) => (0, eval)(fs.readFileSync(path.join(root, f), 'utf8') + '\n//# sourceURL=' + f));

const ui = DA.ui, G = DA.game, J = DA.journey, L = DA.labgame, Y = DA.sync;
const LABS = ['sheets', 'python', 'bi', 'sql'];
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'state-before-revamp.json'), 'utf8'));
const ledger = (s) => Object.keys(s.xp).reduce((a, k) => a + s.xp[k].n, 0);
const strip = (s) => { const o = JSON.parse(JSON.stringify(s)); delete o.journey; delete o.bosses; return o; };

test('every mission resolves: brief, cast, learn cards, Try levels, Check question and Debrief', () => {
  assert.strictEqual(Object.keys(DA.missionData).length, DA.lessons.length, 'one mission per lesson');
  DA.lessons.forEach((l) => {
    const m = J.mission(l.id);
    assert.ok(m && m.brief.length > 20, l.id + ' brief');
    assert.ok(DA.cast[DA.missionData[l.id].who], l.id + ' cast');
    assert.ok(l.learn.length >= 3, l.id + ' learn cards');
    m.steps.forEach((s) => assert.ok(J.STEPS.includes(s), l.id + ' step ' + s));
    assert.deepStrictEqual(m.steps.filter((s) => s !== 'try'), ['brief', 'learn', 'check', 'debrief'], l.id + ' step order');
    m.levels.forEach((r) => {
      assert.ok(r.level, l.id + ' level ' + r.lab + ' ' + r.key + ' exists');
      assert.ok(r.level.challenges.length > 0, l.id + ' level has challenges');
    });
    assert.ok(m.targets.length <= J.TARGETS);
    assert.ok(DA.drill.byId('l:' + l.id), l.id + ' check question');
    assert.ok(l.doit && l.ai && l.ai.text, l.id + ' debrief task and prompt');
  });
});

test('every boss case resolves, one per chapter', () => {
  DA.modules.forEach((m) => {
    const b = J.boss(m.id);
    assert.ok(DA.bossData[m.id] && b.title && b.brief, m.id + ' boss');
    assert.ok(b.questions.length >= 3, m.id + ' boss questions');
    b.questions.forEach((id) => assert.ok(DA.drill.byId(id), m.id + ' question ' + id));
    b.levels.forEach((r) => assert.ok(r.level, m.id + ' boss level ' + r.key));
  });
});

test('every lab level is practised by a mission or a boss, and no two missions share a level', () => {
  const owner = {};
  J.mapped().forEach((x) => {
    const k = x.lab + ' ' + x.key;
    if (!x.owner.startsWith('boss:')) {
      assert.ok(!owner[k] || owner[k].startsWith('boss:'), k + ' is used by ' + owner[k] + ' and ' + x.owner);
    }
    owner[k] = owner[k] || x.owner;
  });
  LABS.forEach((id) => {
    const lab = L.get(id);
    assert.ok(lab.worlds.length >= 4);
    lab.levels.forEach((lv) => assert.ok(owner[id + ' ' + lv.key], id + ' level ' + lv.key + ' (' + lv.title + ') is not mapped'));
  });
});

test('old saved state loads with identical XP, done lessons, stars, quizzes, notes and badges', () => {
  const s = ui.sanitize(fixture);
  ui.state = s;
  assert.strictEqual(G.totalXp(), ledger(fixture));
  assert.strictEqual(G.totalXp(), 1355);
  assert.deepStrictEqual(Object.keys(s.done).sort(), Object.keys(fixture.done).sort());
  LABS.forEach((lab) => assert.deepStrictEqual(s.labs[lab], fixture.labs[lab], lab + ' stars'));
  assert.deepStrictEqual(s.quiz, fixture.quiz);
  assert.deepStrictEqual(s.notes, fixture.notes);
  assert.deepStrictEqual(s.badges, fixture.badges);
  assert.deepStrictEqual(s.xp, fixture.xp);
  assert.deepStrictEqual(s.journey, {});
  assert.deepStrictEqual(s.bosses, {});
});

test('old saved state maps onto the journey: done missions, the current one, and earned chapter bonuses', () => {
  ui.state = ui.sanitize(fixture);
  Object.keys(fixture.done).forEach((id) => {
    J.mission(id).steps.filter((s) => s !== 'try').forEach((s) => assert.ok(J.stepDone(id, s), id + ' ' + s));
  });
  const cur = J.current();
  assert.strictEqual(cur.lesson.id, 'l2-3');
  assert.strictEqual(cur.step, 'brief');
  assert.ok(J.boss('m0').won && J.boss('m1').won, 'chests already opened count as won boss cases');
  assert.strictEqual(J.boss('m0').stars, 0);
  assert.ok(!J.boss('m2').won);
  assert.strictEqual(J.bossResult('m0', 5, 5).xp, 0, 'a won chapter never pays twice');
  assert.strictEqual(G.totalXp(), 1355);
  assert.strictEqual(L.stars('sql', 'r1'), fixture.labs.sql.r1);
  assert.ok(J.tryState('l2-1').hit >= 1, 'stars already won count toward Try');
});

test('mission steps: brief and learn are remembered, Try is derived from lab stars, Check from the quiz', () => {
  setDay('2026-11-13');
  const id = 'l2-3';
  assert.strictEqual(J.currentStep(id), 'brief');
  J.mark(id, J.BITS.brief);
  assert.strictEqual(J.currentStep(id), 'learn');
  J.mark(id, J.BITS.learn);
  assert.strictEqual(J.currentStep(id), 'try');
  const lab = L.get('sql');
  J.mission(id).targets.forEach((r) => L.record(lab, r.level.challenges[0], { hinted: false, tries: 1 }));
  assert.ok(J.tryState(id).done);
  assert.strictEqual(J.stars(id), 3);
  assert.strictEqual(J.currentStep(id), 'check');
  const q = DA.drill.byId('l:' + id);
  assert.strictEqual(J.answer(q, q.answer), true);
  assert.ok(ui.state.quiz[id].ok);
  assert.ok(ui.state.xp['quiz:' + id]);
  assert.strictEqual(J.currentStep(id), 'debrief');
  const before = G.totalXp();
  const xp = J.complete(id, true);
  assert.strictEqual(xp, ui.XP.lesson(DA.lessonById[id]));
  assert.strictEqual(G.totalXp(), before + xp);
  assert.strictEqual(J.complete(id, true), 0, 'completing twice pays nothing');
  assert.ok(G.quests().lesson);
  assert.deepStrictEqual(J.progress(id), { done: 5, total: 5, step: 'debrief', index: 5 });
});

test('test out completes a mission only when every answer is right, with the same one-time XP', () => {
  const id = 'l4-1';
  assert.strictEqual(J.testOut(id, false), 0);
  assert.ok(!ui.state.done[id]);
  const xp = J.testOut(id, true);
  assert.strictEqual(xp, ui.XP.lesson(DA.lessonById[id]));
  assert.ok(ui.state.done[id] && J.tested(id));
  assert.strictEqual(J.testOut(id, true), 0);
  const qs = J.checkQuestions(id, 3);
  assert.strictEqual(qs.length, 4);
  assert.strictEqual(qs[0].id, 'l:' + id);
  assert.strictEqual(new Set(qs.map((q) => q.id)).size, 4);
});

test('a boss with a hands-on part pays the chapter bonus once both parts are done', () => {
  setDay('2026-11-13');
  const b = J.boss('m2');
  assert.ok(b.levels.length >= 1);
  const r = J.bossResult('m2', 4, 4);
  assert.strictEqual(r.stars, 3);
  assert.strictEqual(r.xp, 0, 'questions alone do not close a case with a hands-on part');
  assert.ok(!J.boss('m2').won);
  L.record(L.get('sql'), b.levels[0].level.challenges[0], { hinted: true, tries: 3 });
  assert.strictEqual(J.checkBoss('m2'), ui.XP.module);
  assert.ok(J.boss('m2').won);
  assert.strictEqual(J.checkBoss('m2'), 0);
});

test('journey fields merge like the rest: idempotent, commutative, and safe with an old client', () => {
  const a = ui.sanitize(fixture);
  a.journey = { 'l2-3': 1, 'l2-4': 3 };
  a.bosses = { m0: 2 };
  a.labs.sql.r4 = 3;
  a.xp['sql:r4'] = { d: '2026-11-12', n: 45 };
  const b = ui.sanitize(fixture);
  b.journey = { 'l2-3': 2, 'l3-1': 4 };
  b.bosses = { m0: 3, m1: 1 };
  b.done['l3-2'] = true;
  b.xp['lesson:l3-2'] = { d: '2026-11-12', n: 60 };
  const ab = Y.merge(a, b), ba = Y.merge(b, a);
  assert.deepStrictEqual(ab, ba, 'commutative');
  assert.deepStrictEqual(Y.merge(ab, ab), ab, 'idempotent');
  assert.deepStrictEqual(Y.merge(Y.merge(a, b), b), ab, 'associative with repeats');
  assert.deepStrictEqual(ab.journey, { 'l2-3': 3, 'l2-4': 3, 'l3-1': 4 });
  assert.deepStrictEqual(ab.bosses, { m0: 3, m1: 1 });
  assert.ok(fixture.xp['sql:r4'], 'the same award earned on two devices');
  assert.strictEqual(ab.xp['sql:r4'].d, fixture.xp['sql:r4'].d, 'keeps the earlier day');
  assert.strictEqual(ledger(ab), ledger(fixture) + 60, 'each award counted once');

  const old = strip(ab);
  const back = Y.merge(ab, old);
  assert.deepStrictEqual(back, ab, 'an old client that drops the new fields loses nothing on the next merge');
  assert.strictEqual(ledger(Y.merge(old, ab)), ledger(ab));
  ui.state = ui.sanitize(old);
  assert.ok(ui.state.done['l3-2'] && J.stepDone('l3-2', 'learn'), 'derived steps survive without the new fields');
});

test('sanitize rejects bad journey and boss values', () => {
  const s = ui.sanitize({ v: 2, journey: { 'l2-3': 9, 'l0-1': 3, nope: 1, 'l1-1': -1, 'l1-2': '2' }, bosses: { m0: 4, m1: 2, x9: 1, m2: 0 } });
  assert.deepStrictEqual(s.journey, { 'l0-1': 3, 'l1-2': 2 });
  assert.deepStrictEqual(s.bosses, { m1: 2 });
});

runAll();
