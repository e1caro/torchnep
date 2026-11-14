/* Spanish (Spain): every piece of content has a translation, translations keep their placeholders and option order,
 * the interface dictionary behaves, and the SQL puzzle generator gives the same puzzles in both languages. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');

function load(lang) {
  const mem = { 'data-analyst-path.lang': lang };
  const ctx = { console };
  ctx.window = ctx;
  ctx.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  const vm = require('vm');
  vm.createContext(ctx);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const wanted = /js\/(i18n|data\/|i18n\/|ui\.js|game\.js|arcade-sqlgen|arcade-worlds|sheets\/core|sheets\/names-es|labgame)/;
  const files = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]).filter((f) => wanted.test(f));
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  return ctx.DA;
}

const tests = [];
// Names that are the same in both languages (product and tool names, code).
const SAME = /^(SQL|Dot Club|KPI|ETL|NaN|Anti-join|1 \/ 2 = 0|VLOOKUP|XLOOKUP|Marketing|Rosetta.*|Lv \d+)$/;
function changed(es, en, label) { if (es === en && !SAME.test(en)) throw new Error(label + ' is not translated: ' + en); }
function test(name, fn) { tests.push([name, fn]); }

const EN = load('en');
const ES = load('es');
ES.i18n.applyContent();
EN.i18n.applyContent(); // a no-op in English

test('English stays English: overlays do nothing and DA.t returns the source', () => {
  assert.strictEqual(EN.lessons[0].title, JSON.parse(JSON.stringify(EN.lessons[0].title)));
  assert.ok(!/[áéíóúñ¿¡]/.test(EN.lessons.map((l) => l.title).join(' ')), 'English lesson titles have no Spanish');
  assert.strictEqual(EN.t('Step {0} of {1}', [1, 2]), 'Step 1 of 2');
});

test('every lesson, chapter, mission brief and boss is in Spanish, with the same quiz shape', () => {
  EN.lessons.forEach((l, i) => {
    const e = ES.lessons[i];
    changed(e.title, l.title, l.id + ' title');
    assert.notStrictEqual(e.why, l.why, l.id + ' why');
    assert.strictEqual(e.learn.length, l.learn.length, l.id + ' learn length');
    assert.strictEqual(e.quiz.options.length, l.quiz.options.length, l.id + ' options');
    assert.strictEqual(e.quiz.answer, l.quiz.answer, l.id + ' answer index');
    ['{{bg}}', '{{lang}}'].forEach((p) => assert.strictEqual(e.ai.text.includes(p), l.ai.text.includes(p), l.id + ' keeps ' + p));
    assert.strictEqual((e.ai.text.match(/\[\[/g) || []).length > 0, (l.ai.text.match(/\[\[/g) || []).length > 0, l.id + ' keeps [[blanks]]');
    const code = (s) => (s.match(/<code>/g) || []).length;
    l.learn.forEach((x, j) => assert.strictEqual(code(e.learn[j]), code(x), l.id + ' learn ' + j + ' keeps its code'));
  });
  EN.modules.forEach((m, i) => changed(ES.modules[i].title, m.title, m.id));
  Object.keys(EN.missionData).forEach((k) => assert.notStrictEqual(ES.missionData[k].brief, EN.missionData[k].brief, k));
  Object.keys(EN.bossData).forEach((k) => assert.notStrictEqual(ES.bossData[k].title, EN.bossData[k].title, k));
  Object.keys(EN.scenarios).forEach((k) => EN.scenarios[k].forEach((s, i) => {
    const e = ES.scenarios[k][i];
    assert.notStrictEqual(e.q, s.q, k + ' ' + i);
    assert.strictEqual(e.options.length, s.options.length);
    assert.strictEqual(e.answer, s.answer);
  }));
});

test('every practice question and Discover card is in Spanish', () => {
  EN.extraQuestions.forEach((q, i) => {
    const e = ES.extraQuestions[i];
    assert.strictEqual(e.id, q.id);
    assert.notStrictEqual(e.q, q.q, q.id);
    assert.strictEqual(e.options.length, q.options.length, q.id);
    assert.strictEqual(e.answer, q.answer, q.id);
  });
  EN.feedCards.forEach((c, i) => {
    const e = ES.feedCards[i];
    changed(e.title, c.title, c.id);
    if (c.take) changed(e.take, c.take, c.id + ' take');
    assert.strictEqual(e.body.length, c.body.length, c.id);
  });
});

test('every lab challenge, SQLab challenge, arcade level and SQL puzzle is in Spanish', () => {
  ['labSheets', 'labPython', 'labBI'].forEach((k) => {
    EN[k].worlds.forEach((w, wi) => {
      changed(ES[k].worlds[wi].title, w.title, k + ' world ' + wi);
      w.levels.forEach((lv, li) => lv.challenges.forEach((c, ci) => {
        const e = ES[k].worlds[wi].levels[li].challenges[ci];
        assert.notStrictEqual(e.task, c.task, c.id + ' task');
        assert.strictEqual(e.solution, c.solution, c.id + ' keeps its solution');
        if (c.options) assert.strictEqual(e.options.length, c.options.length, c.id);
        if (c.ask) assert.strictEqual(e.ask.answer, c.ask.answer, c.id);
      }));
    });
  });
  EN.challenges.forEach((c, i) => {
    assert.notStrictEqual(ES.challenges[i].task, c.task, c.id);
    assert.strictEqual(ES.challenges[i].solution, c.solution, c.id);
  });
  EN.puzzles.forEach((p, i) => { assert.notStrictEqual(ES.puzzles[i].ask, p.ask, p.id); assert.strictEqual(ES.puzzles[i].sql, p.sql, p.id); });
  Object.keys(EN.arcadeCatalog).forEach((g) => EN.arcadeCatalog[g].worlds.forEach((w, wi) => assert.notStrictEqual(ES.arcadeCatalog[g].worlds[wi].intro, w.intro, g + ' ' + wi)));
});

test('the SQL puzzle generator gives the same puzzles in both languages, worded in each', () => {
  for (let n = 1; n <= 16; n++) for (let s = 1; s <= 25; s++) {
    const a = EN.sqlgen.make(n, s), b = ES.sqlgen.make(n, s);
    assert.strictEqual(b.sql, a.sql, n + '/' + s);
    assert.strictEqual(JSON.stringify(b.extra), JSON.stringify(a.extra), n + '/' + s);
    assert.ok(!/undefined|NaN/.test(b.ask + b.why), n + '/' + s + ': ' + b.ask);
    assert.notStrictEqual(b.ask, a.ask, n + '/' + s);
  }
});

test('the interface dictionary: templates, numbers only where marked, repeated placeholders', () => {
  const tr = ES.i18n.tr;
  assert.strictEqual(tr('Step 2 of 5: Learn, done'), 'Paso 2 de 5: Aprender, hecho');
  assert.strictEqual(tr('12 rows'), '12 filas');
  assert.strictEqual(tr('Keep the matching rows'), null, 'a numeric template does not swallow words');
  assert.strictEqual(tr('K2 is empty. Put your formula in K2.'), 'K2 está vacía. Pon tu fórmula en K2.');
  assert.strictEqual(tr('✗ K2 is empty. Put your formula in K2.'), '✗ K2 está vacía. Pon tu fórmula en K2.');
  assert.strictEqual(EN.i18n.tr('Home'), null, 'nothing translates in English');
});

let pass = 0, fail = 0;
tests.forEach(([name, fn]) => {
  try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n  ' + e.message); }
});
console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exitCode = 1;
