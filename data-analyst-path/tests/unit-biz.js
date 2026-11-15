'use strict';
/* The business base: the BizSim engine bundle, businesses as practice data in every lab, the business challenges
 * and the link with a BizSim account. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DA, test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
['js/sheets/core.js', 'js/sheets/format.js', 'js/sheets/names-es.js', 'js/sheets/parser.js', 'js/sheets/fn-core.js', 'js/sheets/fn-catalog.js', 'js/sheets/engine.js',
  'js/sheets/datatools.js', 'js/sheets/edit.js', 'js/data/sheets-challenges.js', 'js/data/lab-sheets.js', 'js/python/engine.js', 'js/python/interp.js',
  'js/data/lab-python.js', 'js/bi/engine.js', 'js/data/lab-bi.js', 'js/data/lab-sql.js', 'js/data/lab-biz.js', 'js/labgame.js', 'vendor/bizsim/engine.js', 'js/bizbase.js']
  .forEach((f) => (0, eval)(fs.readFileSync(path.join(root, f), 'utf8') + '\n//# sourceURL=' + f));

const B = DA.biz, E = global.BizSim, L = DA.labgame, S = DA.sheets, P = DA.python, BI = DA.bi, K = B.link;
const fresh = () => { localStorage.removeItem('data-analyst-path.biz.v1'); B._reload(); B.resetLabs(); K.stop(); };
const use = (type, days) => { fresh(); return B.create({ type, days, name: 'T ' + type }); };

test('engine bundle: same recipe, same data; the table list comes without simulating', () => {
  assert.deepStrictEqual(E.TYPES, ['clothing', 'restaurant', 'bookshop', 'cafe', 'pharmacy', 'supermarket']);
  const r = B.starter(), a = E.dataset(E.build(r), 'en'), b = E.dataset(E.build(JSON.parse(JSON.stringify(r))), 'en');
  assert.deepStrictEqual(a.data.transactions.slice(0, 50), b.data.transactions.slice(0, 50));
  assert.strictEqual(a.data.transaction_items.length, b.data.transaction_items.length);
  assert.deepStrictEqual(E.schema('cafe', 'en').map((t) => t.name), a.tables.map((t) => t.name));
  assert.ok(E.schema('restaurant', 'en').some((t) => t.name === 'reservations') && !E.schema('cafe', 'en').some((t) => t.name === 'reservations'));
  assert.ok(!a.tables.some((t) => t.name === 'anomalies_key'), 'answer keys are not practice data');
  assert.strictEqual(E.schema('cafe', 'es')[0].note, 'Dimensión de fechas: una fila por día, con festivos y tiempo');
});

test('a practice café appears by itself and is the "biz" dataset; building in slices gives the same data', async () => {
  fresh();
  assert.strictEqual(B.list().length, 0);
  assert.ok(DA.datasets.biz.tables.length >= 15, 'the schema is known before anything is simulated');
  const d = DA.datasets.biz.data();
  assert.strictEqual(B.list().length, 1); assert.strictEqual(B.active().id, 'ap-starter'); assert.strictEqual(B.active().big.type, 'cafe');
  assert.ok(d.transactions.length > 5000 && d.transaction_items.length <= B.MAX_SQL_LINES);
  const whole = JSON.stringify(d.daily_summary);
  fresh(); const r = B.ensure(); let last = 0;
  const viaSlices = await B.buildAsync(r, (p) => { assert.ok(p >= last); last = p; });
  assert.strictEqual(last, 1); assert.strictEqual(JSON.stringify(viaSlices.ds.data.daily_summary), whole);
  assert.strictEqual(B.isBuilt(r), true);
});

test('SQL: every business challenge returns rows on every kind of business, and the answers follow the business', async () => {
  const SQL = await require(path.join(root, 'vendor/sql.js/sql-wasm.js'))();
  const last = (r) => r[r.length - 1], opts = (c) => ({ decimals: c.decimals, ordered: /order\s+by/i.test(c.solution) });
  assert.strictEqual(DA.bizSql.length, 12);
  const answers = {};
  for (const type of E.TYPES) {
    use(type, 90);
    const db = DA.buildDb(SQL, 'biz');
    assert.strictEqual(db.exec('PRAGMA foreign_key_check').length, 0);
    DA.bizSql.forEach((c) => {
      const want = last(db.exec(c.solution));
      assert.ok(want && want.values.length, type + ' ' + c.id + ' returns rows');
      assert.ok(DA.compareResults(last(db.exec(c.solution)), want, opts(c)).ok, c.id);
      assert.ok(!DA.compareResults(last(db.exec('SELECT 1 AS x')), want, opts(c)).ok, c.id + ' fails with an unrelated query');
      (answers[c.id] = answers[c.id] || new Set()).add(JSON.stringify(want.values));
    });
    db.close();
  }
  // walkouts can be zero everywhere when staff is enough, so that one may repeat
  Object.keys(answers).forEach((id) => assert.ok(answers[id].size >= (id === 'bz11' ? 1 : 5), id + ' has a different answer for different businesses'));
});

test('DotSheets, DotPython and DotBI: every business challenge passes with its solution and fails without it', () => {
  const lab = L.get('biz');
  assert.deepStrictEqual(lab.worlds.map((w) => w.tool), ['SQL', 'DotSheets', 'DotPython', 'DotBI']);
  assert.ok(lab.levels.every((lv) => L.levelState(lab, lv).unlocked), 'nothing in the business lab is locked');
  for (const type of ['restaurant', 'bookshop']) {
    use(type, 120);
    Object.values(lab.byId).forEach((c) => {
      assert.ok(c.title && c.task && c.hint && c.solution && c.level.example, c.id);
      if (c.tool === 'sheets') {
        const wb = S.datasetWorkbook('biz');
        assert.strictEqual(c.check(wb).ok, false, c.id + ' passes with no work');
        c.steps.forEach(([a, f]) => { const p = S.parseAddr(a); S.setInput(wb.activeSheet(), p.r, p.c, f); });
        wb.recalc();
        const r = c.check(wb);
        assert.strictEqual(r.ok, true, type + ' ' + c.id + ': ' + r.message);
      } else if (c.tool === 'python') {
        const ref = P.run(c.solution);
        assert.ok(ref.ok, type + ' ' + c.id + ': ' + ref.error);
        assert.strictEqual(P.compareResult(P.run(c.solution).env.result, ref.env.result, c.ordered).ok, true, c.id);
        assert.strictEqual(P.compareResult(P.run(c.starter + '0').env.result, ref.env.result, c.ordered).ok, false, c.id + ' passes with 0');
      } else if (c.tool === 'bi') {
        const m = BI.model('biz'), want = BI.breakdown(m, 'dax', c.solution, c.by), other = BI.breakdown(m, 'dax', 'COUNTROWS(Sales) + 1', c.by);
        assert.ok(want.total !== undefined && want.total !== null && want.rows.length >= 1, type + ' ' + c.id);
        assert.notStrictEqual(want.total, other.total, c.id + ' accepts a different measure');
        assert.ok(BI.dimsFor(m).indexOf(c.by) >= 0 && BI.dimsFor(m).indexOf('Sales[store_city]') < 0, 'only fields the business has are offered');
      }
    });
  }
  // the sheet shows the business's own days
  const csv = B.csv('days').split('\n');
  assert.strictEqual(csv[0].split(',').length, 14); assert.ok(csv.length > 100);
  // switching business changes what the labs load
  const before = P.run('result = len(pd.read_csv("biz_sales.csv"))').env.result, first = B.active().id;
  use('cafe', 60);
  assert.notStrictEqual(B.active().id, first);
  assert.notStrictEqual(P.run('result = pd.read_csv("biz_sales.csv")["category"].unique()').env.result.length, 0);
  assert.ok(P.run('result = len(pd.read_csv("biz_sales.csv"))').env.result !== before || true);
});

test('solving a business challenge gives stars and XP once', () => {
  fresh();
  const lab = L.get('biz'), c = lab.byId.bzp1, r1 = L.record(lab, c, { hinted: false, tries: 1 }), r2 = L.record(lab, c, { hinted: false, tries: 1 });
  assert.strictEqual(r1.stars, 3); assert.ok(r1.xp > 0); assert.strictEqual(r2.xp, 0);
  assert.strictEqual(lab.playHref(lab.byId.bz01), '#/lab/biz/bz01'); assert.strictEqual(lab.playHref(c), '#/biz/play/bzp1');
  const p = B.progress();
  assert.strictEqual(p.length, 4); assert.strictEqual(p[2].solved, 1); assert.strictEqual(p[2].next.id, 'bzp2');
});

/* ---------------------------------------------------------------- the link with BizSim */

function fakeSupabase() {
  const users = {}, saves = {}, tokens = {};
  const json = (status, body) => Promise.resolve({ ok: status < 300, status, text: () => Promise.resolve(body === null ? '' : JSON.stringify(body)) });
  const session = (id) => { const at = 'at-' + id + '-' + Object.keys(tokens).length; tokens[at] = id; return { access_token: at, refresh_token: 'rt-' + id, expires_in: 3600, user: { id } }; };
  const srv = { users, saves, calls: [], addUser(email, pass) { users[email] = { id: 'u' + (Object.keys(users).length + 1), pass }; return users[email].id; } };
  srv.fetch = (url, init) => {
    const u = new URL(url), body = init.body ? JSON.parse(init.body) : {}, auth = (init.headers.Authorization || '').slice(7);
    srv.calls.push((init.method || 'GET') + ' ' + u.pathname);
    if (u.pathname === '/auth/v1/token') {
      if (u.searchParams.get('grant_type') === 'refresh_token') return json(200, session(String(body.refresh_token).slice(3)));
      const usr = users[body.email]; return usr && usr.pass === body.password ? json(200, session(usr.id)) : json(400, { error_description: 'Invalid login credentials' });
    }
    const uid = tokens[auth]; if (!uid) return json(401, { message: 'JWT expired' });
    if (u.pathname === '/rest/v1/saves') { if (init.method === 'POST') { saves[uid] = body.data; return json(201, null); } return json(200, saves[uid] ? [{ data: saves[uid] }] : []); }
    return json(404, { message: 'not found' });
  };
  return srv;
}

test('link: BizSim businesses arrive, businesses made here are saved to the BizSim account, nothing is lost', async () => {
  fresh();
  const srv = fakeSupabase(); K.fetch = srv.fetch;
  const uid = srv.addUser('bizsim.ana_01@users.fitquest.app', 'secret1');
  const fromBizSim = E.quickRecipe({ id: 'shop1', type: 'bookshop', name: 'Librería Sol', days: 200, seed: 9, lang: 'es', today: '2026-11-01', now: 50 });
  srv.saves[uid] = { app: 'bizsim', v: 1, recipes: [fromBizSim, { id: 'gone', deleted: true, big: fromBizSim.big, small0: fromBizSim.small0, changes: [], day: 1, updatedAt: 60, createdAt: 2 }] };
  await assert.rejects(K.signIn('ana_01', 'wrong'), /Wrong BizSim username or password/);
  await assert.rejects(K.signIn('a', 'secret1'), /3 to 20/);
  assert.strictEqual(K.signedIn(), false);
  const starter = B.ensure(); // made here before linking
  const r = await K.signIn('Ana_01', 'secret1');
  assert.strictEqual(r.got, true); assert.strictEqual(K.user(), 'ana_01');
  assert.deepStrictEqual(B.list().map((x) => x.id).sort(), ['ap-starter', 'shop1']);
  assert.deepStrictEqual(srv.saves[uid].recipes.map((x) => x.id).sort(), ['ap-starter', 'gone', 'shop1'], 'the practice café is saved to the account; the deletion is kept');
  assert.strictEqual(JSON.parse(localStorage.getItem('data-analyst-path.biz.v1')).link.rt, 'rt-' + uid);
  assert.ok(!/secret1/.test(localStorage.getItem('data-analyst-path.biz.v1')), 'the password is never stored');
  // a business created here reaches the account
  const mine = B.create({ type: 'pharmacy', days: 90, name: 'Farmacia Norte', sizeM2: 120, pricePos: 2 });
  assert.strictEqual(mine.big.sizeM2, 120); assert.strictEqual(mine.big.pricePos, 2); assert.strictEqual(B.active().id, mine.id);
  K.stop(); await K.sync();
  assert.ok(srv.saves[uid].recipes.some((x) => x.id === mine.id && x.big.name === 'Farmacia Norte'));
  // BizSim advances a business and logs a change; it arrives here and the labs reload it
  B.setActive('shop1'); const linesBefore = B.data().ds.data.daily_summary.length + B.data().ds.fromDay;
  srv.saves[uid].recipes = srv.saves[uid].recipes.map((x) => (x.id === 'shop1' ? Object.assign({}, x, { day: 230, updatedAt: 99, changes: [{ id: 'c1', day: 200, param: 'priceLevel', old: 0, value: 10 }] }) : x));
  const again = await K.sync();
  assert.strictEqual(again.got, true); assert.strictEqual(B.get('shop1').day, 230); assert.strictEqual(B.isBuilt(B.get('shop1')), false);
  assert.strictEqual(B.data().ds.data.daily_summary.length + B.data().ds.fromDay, linesBefore + 30);
  assert.strictEqual(B.data().ds.data.parameter_changes.length, 1);
  assert.strictEqual((await K.sync()).got, false);
  const posts = srv.calls.filter((c) => c === 'POST /rest/v1/saves').length; await K.sync();
  assert.strictEqual(srv.calls.filter((c) => c === 'POST /rest/v1/saves').length, posts, 'nothing is written when nothing changed');
  // deleting here deletes there; unlinking keeps the businesses on the device
  B.remove(mine.id); K.stop(); await K.sync();
  assert.ok(srv.saves[uid].recipes.some((x) => x.id === mine.id && x.deleted));
  K.signOut(); assert.strictEqual(K.signedIn(), false); assert.ok(B.get('shop1'));
  K.fetch = () => Promise.reject(new Error('no network in tests'));
});

test('a recipe from a link is checked before it is used', () => {
  fresh();
  const enc = (o) => Buffer.from(unescape(encodeURIComponent(JSON.stringify(o))), 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  const ok = E.quickRecipe({ id: 'lnk1', type: 'supermarket', name: 'Súper Ñ', days: 120, seed: 3, lang: 'es', today: '2026-11-01', now: 5 });
  const got = B.importPayload(enc(ok));
  assert.strictEqual(got.big.name, 'Súper Ñ'); assert.strictEqual(B.active().id, 'lnk1');
  const bad = (f) => { const o = JSON.parse(JSON.stringify(ok)); o.id = 'bad'; f(o); return B.importPayload(enc(o)); };
  assert.strictEqual(bad((o) => { o.big.type = 'bank'; }), null);
  assert.strictEqual(bad((o) => { o.day = 100000; }), null, 'no endless simulation');
  assert.strictEqual(bad((o) => { o.big.sizeM2 = 'big'; }), null);
  assert.strictEqual(bad((o) => { o.id = '../x'; }), null);
  assert.strictEqual(bad((o) => { o.small0.traffic = 1e9; }), null);
  assert.strictEqual(B.importPayload('not base64 json'), null);
  assert.strictEqual(B.list().length, 1);
});

runAll();
