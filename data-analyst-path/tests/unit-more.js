'use strict';
const assert = require('assert');
const { DA, test } = require('./harness');
const ui = DA.ui, D = DA.drill;

test('question bank: 29 lesson quizzes + extras, all well-formed', () => {
  const bank = D.bank();
  assert.strictEqual(bank.length, 29 + DA.extraQuestions.length);
  assert.ok(DA.extraQuestions.length >= 60);
  assert.strictEqual(new Set(bank.map((q) => q.id)).size, bank.length, 'unique ids');
  bank.forEach((q) => {
    assert.ok(q.q && q.why, q.id + ' has text');
    assert.strictEqual(q.options.length, 4, q.id + ' has 4 options');
    assert.strictEqual(new Set(q.options).size, 4, q.id + ' options are distinct');
    assert.ok(q.answer >= 0 && q.answer < 4, q.id + ' answer in range');
    assert.ok(/^[\w:.\-]{1,60}$/.test(q.id), q.id + ' id is storable');
  });
  assert.ok(D.topics().includes('SQL') && D.topics().includes('Statistics'));
});

test('shuffled keeps the right answer pointing at the right text', () => {
  for (let i = 0; i < 300; i++) {
    const q = D.bank()[i % D.bank().length], sh = D.shuffled(q);
    assert.strictEqual(sh.options[sh.answer], q.options[q.answer]);
    assert.deepStrictEqual(sh.options.slice().sort(), q.options.slice().sort());
  }
  // the right answer is not always in the same position
  const pos = new Set(); for (let i = 0; i < 100; i++) pos.add(D.shuffled(D.byId('x01')).answer);
  assert.ok(pos.size >= 3);
});

test('pick: due questions come first, then unseen, no duplicates, category filter works', () => {
  ui.state.srs['x01'] = { box: 1, due: '2026-11-09', t: 1 };
  ui.state.srs['x02'] = { box: 2, due: '2026-11-08', t: 1 };
  ui.state.srs['x03'] = { box: 2, due: '2026-11-20', t: 1 }; // not due
  const p = D.pick(5);
  assert.strictEqual(p.length, 5); assert.strictEqual(new Set(p.map((q) => q.id)).size, 5);
  assert.ok(p.some((q) => q.id === 'x01') && p.some((q) => q.id === 'x02'), 'due questions included');
  assert.ok(!p.some((q) => q.id === 'x03'), 'not-due question skipped while unseen ones exist');
  const sql = D.pick(5, 'SQL'); assert.ok(sql.every((q) => q.cat === 'SQL'));
  assert.strictEqual(D.dueCount(), 2);
});

test('pick: prefers unseen questions from topics being studied', () => {
  ui.state.done['l2-1'] = true; ui.state.done['l2-2'] = true; // working in SQL; the next lesson (1.1) is in Learning
  for (let i = 0; i < 40; i++) {
    D.pick(5).forEach((q) => assert.ok(q.cat === 'SQL' || q.cat === 'Learning', 'unexpected topic ' + q.cat));
  }
});

test('pick: falls back to the weakest seen questions when nothing is new or due', () => {
  D.bank().filter((q) => q.cat === 'Career').forEach((q, i) => { ui.state.srs[q.id] = { box: 1 + (i % 3), due: '2026-12-01', t: 1 }; });
  const p = D.pick(5, 'Career'); assert.strictEqual(p.length, 5);
  assert.ok(p.every((q) => q.cat === 'Career'));
});

test('review schedule: boxes, intervals, reset on a wrong answer', () => {
  assert.deepStrictEqual(D.record('x01', true), { box: 1, due: '2026-11-10', t: ui.now().getTime() });
  assert.strictEqual(D.record('x01', true).due, '2026-11-12');  // box 2: +3
  assert.strictEqual(D.record('x01', true).due, '2026-11-16');  // box 3: +7
  assert.strictEqual(D.record('x01', true).due, '2026-11-23');  // box 4: +14
  const top = D.record('x01', true); assert.strictEqual(top.box, 5); assert.strictEqual(top.due, '2026-12-09'); // +30
  assert.strictEqual(D.record('x01', true).box, 5, 'capped at box 5');
  const wrong = D.record('x01', false); assert.strictEqual(wrong.box, 1); assert.strictEqual(wrong.due, '2026-11-09');
});

test('mastery counts questions in box 3 or higher', () => {
  D.record('x01', true); D.record('x01', true); D.record('x01', true); // box 3
  D.record('x02', true);                                               // box 1
  const m = D.mastery('SQL'); assert.strictEqual(m.mastered, 1); assert.strictEqual(m.seen, 2);
  assert.strictEqual(D.mastery().total, D.bank().length);
});

test('combo XP ladder', () => {
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 10].map(D.xpFor), [8, 8, 10, 12, 14, 16, 16]);
});

test('answer options do not give the answer away (length or "always/never")', () => {
  const bank = DA.drill.bank();
  let longest = 0;
  const tooLong = [], absolute = [];
  bank.forEach((q) => {
    const L = q.options.map((o) => o.length), right = L[q.answer], wrong = L.filter((_, i) => i !== q.answer), max = Math.max(...wrong);
    if (right > max) longest++;
    if (right > max * 1.2 + 4) tooLong.push(q.id + ': ' + q.options[q.answer]);
    q.options.forEach((o, i) => { if (i !== q.answer && /\b(always|never)\b/i.test(o)) absolute.push(q.id + ': ' + o); });
  });
  assert.deepStrictEqual(tooLong, [], 'the right answer is much longer than every wrong one');
  assert.ok(longest / bank.length <= 0.3, 'the right answer is the longest in ' + longest + ' of ' + bank.length + ' questions (chance would be about 25%)');
  assert.deepStrictEqual(absolute, [], '"always" and "never" only in wrong options are a giveaway');
});
