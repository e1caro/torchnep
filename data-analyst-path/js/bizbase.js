/* The business base: BizSim businesses as practice data for every lab.
 *
 * A business is a small "recipe" (type, size, sliders, seed, change log). The BizSim engine (vendor/bizsim/engine.js,
 * built from ../bizsim) turns a recipe into the same tables on every device, so only recipes are stored and synced.
 * - One business is the active one. It is the "biz" dataset in SQLab and feeds the "Your business" world of
 *   DotSheets, DotPython and DotBI. With no business yet, a small practice café is created by itself.
 * - Linking (Settings): signing in to a BizSim account keeps the recipes of both apps merged, with BizSim's own merge
 *   rules, in that account's private row of the "saves" table (the same Supabase project as js/cloud.js).
 *   Businesses made here appear in BizSim and the other way round. The password is never kept, only the session.
 * Nothing here needs the link: everything works on this device alone. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var B = (DA.biz = {});
  var L = function (en, es) { return DA.L ? DA.L(en, es) : en; };
  var KEY = 'data-analyst-path.biz.v1', STARTER = 'ap-starter';
  B.TYPE_NAMES = { clothing: ['Clothing shop', 'Tienda de ropa'], restaurant: ['Restaurant', 'Restaurante'], bookshop: ['Bookshop', 'Librería'], cafe: ['Café', 'Cafetería'], pharmacy: ['Pharmacy', 'Farmacia'], supermarket: ['Supermarket', 'Supermercado'] };
  B.TYPE_ICONS = { clothing: '👕', restaurant: '🍽️', bookshop: '📚', cafe: '☕', pharmacy: '💊', supermarket: '🛒' };
  B.MAX_SQL_LINES = 60000;
  B.now = function () { return Date.now(); };
  B.today = function () { var d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10); };
  B.engine = function () { return window.BizSim; };
  B.typeName = function (t) { var n = B.TYPE_NAMES[t]; return n ? L(n[0], n[1]) : t; };

  /* ---------------------------------------------------------------- stored state */

  var S = load();
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* first run */ }
    s = s && typeof s === 'object' ? s : {};
    return { recipes: Array.isArray(s.recipes) ? s.recipes.filter(valid) : [], active: typeof s.active === 'string' ? s.active : '', link: s.link && typeof s.link === 'object' ? s.link : {} };
  }
  function keep() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }
  B._reload = function () { S = load(); built = {}; }; // tests

  // A recipe is data from another app or from a link: check its shape before the engine sees it.
  function valid(r) {
    var E = B.engine();
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !/^[\w-]{1,40}$/.test(r.id)) return false;
    if (r.deleted) return true;
    var b = r.big, n = function (v, lo, hi) { return typeof v === 'number' && isFinite(v) && v >= lo && v <= hi; };
    if (!b || typeof b !== 'object' || !E || E.TYPES.indexOf(b.type) < 0) return false;
    if (typeof b.name !== 'string' || b.name.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(b.startDate || '')) return false;
    if (!n(b.sizeM2, 10, 2000) || !n(b.seed, 0, 2147483647) || !n(b.openHour, 0, 23) || !n(b.closeHour, 1, 24) || b.closeHour <= b.openHour) return false;
    if ([1, 2, 3].indexOf(b.locationTier) < 0 || [0, 1, 2].indexOf(b.pricePos) < 0 || !n(b.staff, 1, 500) || !n(b.investment, 0, 1e8) || !n(b.closedDay, -1, 6)) return false;
    if (!n(r.day, 1, 1500) || !r.small0 || typeof r.small0 !== 'object' || !Array.isArray(r.changes) || r.changes.length > 2000) return false;
    var keys = ['traffic', 'items', 'priceLevel', 'promoDepth', 'promoShare', 'marketing', 'staffPerShift', 'reorderDays', 'supplierCost', 'quality'];
    if (!keys.every(function (k) { return n(r.small0[k], -100, 1e6); })) return false;
    return r.changes.every(function (c) { return c && typeof c.id === 'string' && n(c.day, 0, 5000) && typeof c.param === 'string' && c.param.length < 40 && n(c.value, -1e6, 1e6); });
  }
  B.valid = valid;

  B.list = function () { return S.recipes.filter(function (r) { return !r.deleted; }); };
  B.get = function (id) { return B.list().filter(function (r) { return r.id === id; })[0] || null; };
  B.active = function () { return B.get(S.active) || B.list()[0] || null; };
  function uid() { return Math.random().toString(36).slice(2, 8) + B.now().toString(36); }

  // The practice café that appears by itself. Its dates and seed are fixed, so it is the same on every device.
  B.starter = function () {
    var r = B.engine().quickRecipe({ id: STARTER, type: 'cafe', name: L('Practice café', 'Cafetería de práctica'), days: 180, seed: 2025, lang: DA.lang === 'es' ? 'es' : 'en', today: '2026-01-01', now: 1, traffic: 190 });
    return r;
  };
  // The business the labs use: the active one, or the practice café made on the spot.
  B.ensure = function () {
    var r = B.active();
    if (!r) { r = B.starter(); S.recipes.push(r); S.active = r.id; keep(); changed(); }
    return r;
  };
  B.create = function (o) {
    var E = B.engine(), days = Math.max(60, Math.min(730, +o.days || 180));
    var r = E.quickRecipe({ id: uid(), type: o.type, name: String(o.name || B.typeName(o.type)).slice(0, 40), days: days, seed: Math.floor(Math.random() * 1e6), lang: DA.lang === 'es' ? 'es' : 'en',
      today: B.today(), now: B.now(), sizeM2: +o.sizeM2 || undefined, pricePos: o.pricePos === undefined ? undefined : +o.pricePos });
    S.recipes.push(r); keep(); B.setActive(r.id); changed();
    return r;
  };
  B.remove = function (id) {
    S.recipes = S.recipes.map(function (r) { return r.id === id ? { id: r.id, big: r.big, small0: r.small0, changes: [], day: r.day, dirty: false, createdAt: r.createdAt, updatedAt: B.now(), deleted: true } : r; });
    if (S.active === id) S.active = '';
    delete built[id]; keep(); resetLabs(); changed();
  };
  B.setActive = function (id) { if (!B.get(id)) return; S.active = id; keep(); resetLabs(); };

  // A recipe handed over in a link from BizSim ("Practise in Analyst Path").
  B.importPayload = function (text) {
    var r;
    try { r = JSON.parse(decodeURIComponent(escape(atob(String(text).replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; }
    if (!valid(r) || r.deleted) return null;
    r = { id: r.id, big: r.big, small0: r.small0, changes: r.changes, day: r.day, dirty: false, createdAt: +r.createdAt || B.now(), updatedAt: +r.updatedAt || B.now() };
    S.recipes = B.engine().mergeRecipes(S.recipes, [r]); keep(); B.setActive(r.id); changed();
    return B.get(r.id);
  };

  /* ---------------------------------------------------------------- building the data */

  var built = {};
  function stamp(r) { return r.day + ':' + r.changes.length + ':' + r.updatedAt; }
  function finish(r, sim) {
    var E = B.engine(), lang = DA.lang === 'es' ? 'es' : 'en';
    return (built[r.id] = { stamp: stamp(r), ds: E.dataset(sim, lang, B.MAX_SQL_LINES), flat: E.flat(sim), summary: E.summary(sim) });
  }
  B.isBuilt = function (r) { return !!(r && built[r.id] && built[r.id].stamp === stamp(r)); };
  B.build = function (r) { return B.isBuilt(r) ? built[r.id] : finish(r, B.engine().build(r)); };
  // The same in slices, so a big business does not freeze the page. onProgress gets a number from 0 to 1.
  B.buildAsync = function (r, onProgress) {
    if (B.isBuilt(r)) return Promise.resolve(built[r.id]);
    return new Promise(function (resolve, reject) {
      var run;
      try { run = B.engine().start(r); } catch (e) { return reject(e); }
      (function slice() {
        try {
          var t = Date.now(), done = false;
          while (!done && Date.now() - t < 40) done = run.step(10);
          if (onProgress) onProgress(Math.min(1, run.sim.day / Math.max(1, r.day)));
          if (done) resolve(finish(r, run.sim)); else setTimeout(slice, 0);
        } catch (e) { reject(e); }
      })();
    });
  };
  B.data = function () { return B.build(B.ensure()); };

  // Each lab caches the data it loaded; they start again when the active business changes.
  function resetLabs() {
    if (DA.sqlLabReset) DA.sqlLabReset('biz');
    if (DA.sheets && DA.sheets.dropDataset) DA.sheets.dropDataset('biz');
    if (DA.py && DA.py.dropFiles) DA.py.dropFiles(/^biz_/);
    if (DA.biLabReset) DA.biLabReset('biz');
  }
  B.resetLabs = resetLabs;

  /* ---------------------------------------------------------------- the "biz" dataset (SQLab) */

  var ds = { id: 'biz', data: function () { return B.data().ds.data; } };
  Object.defineProperty(ds, 'title', { enumerable: true, get: function () { var r = B.active(); return r ? r.big.name : L('Your business', 'Tu negocio'); } });
  Object.defineProperty(ds, 'short', { enumerable: true, get: function () { return L('Your business', 'Tu negocio'); } });
  Object.defineProperty(ds, 'blurb', { enumerable: true, get: function () {
    var r = B.active();
    if (!r) return L('A simulated business with tickets, products, customers, stock, staff and costs. A practice café is created the first time you open it.', 'Un negocio simulado con tiques, productos, clientes, stock, personal y costes. La primera vez se crea una cafetería de práctica.');
    var d = B.isBuilt(r) ? built[r.id].ds : null;
    return B.typeName(r.big.type) + ' · ' + r.big.sizeM2 + ' m²' + (d ? ' · ' + L('sales from ', 'ventas del ') + d.from + L(' to ', ' al ') + d.to : '') + L('. Change it in Businesses.', '. Cámbialo en Negocios.');
  } });
  Object.defineProperty(ds, 'tables', { enumerable: true, get: function () {
    var r = B.active();
    return B.isBuilt(r) ? built[r.id].ds.tables : B.engine() ? B.engine().schema(r ? r.big.type : 'cafe', DA.lang === 'es' ? 'es' : 'en') : [];
  } });
  if (DA.datasets) DA.datasets.biz = ds;

  // The joined tables the other labs use.
  B.csv = function (table) {
    var t = B.data().flat[table], esc = function (v) { var s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [t.cols.join(',')].concat(t.rows.map(function (r) { return r.map(esc).join(','); })).join('\n') + '\n';
  };
  B.SHEET_COLS = 'A date, B weekday, C is_open, D visitors, E transactions, F units, G revenue_net, H cogs, I gross_margin, J labour_cost, K net_profit, L new_customers, M returning_customers, N stockout_products';

  /* ---------------------------------------------------------------- link with a BizSim account */

  var K = (B.link = {});
  var URL = 'https://fghbrevlqmrugbnqshoj.supabase.co', APIKEY = 'sb_publishable_22MWQyEpsR2OyZv9RXkswg_FdGjA2i9'; // as in js/cloud.js: public by design
  K.fetch = function (url, init) { return (DA.cloud && DA.cloud.fetch ? DA.cloud.fetch : window.fetch.bind(window))(url, init); };
  K.email = function (user) { return 'bizsim.' + user + '@users.fitquest.app'; };
  K.signedIn = function () { return !!(S.link.uid && S.link.rt); };
  K.user = function () { return S.link.user || ''; };
  K.lastSync = function () { return S.link.syncAt || 0; };
  K.lastError = function () { return S.link.error || ''; };
  function fail(msg, code) { var e = new Error(msg); e.code = code; return e; }
  function friendly(raw) {
    if (/invalid login credentials|invalid grant/i.test(raw)) return L('Wrong BizSim username or password.', 'Usuario o contraseña de BizSim incorrectos.');
    if (/rate limit|too many/i.test(raw)) return L('Too many attempts. Wait a minute and try again.', 'Demasiados intentos. Espera un minuto y vuelve a probar.');
    return L('BizSim answered: ', 'BizSim respondió: ') + raw;
  }
  function send(path, opts, auth) {
    var hd = { apikey: APIKEY, 'Content-Type': 'application/json' };
    Object.keys(opts.headers || {}).forEach(function (k) { hd[k] = opts.headers[k]; });
    if (auth) hd.Authorization = 'Bearer ' + S.link.at;
    var init = { method: opts.method || 'GET', headers: hd };
    if (opts.body !== undefined) init.body = opts.body;
    return Promise.resolve().then(function () { return K.fetch(URL + path, init); })
      .then(null, function () { throw fail(L('No connection. Your businesses are safe on this device.', 'Sin conexión. Tus negocios están a salvo en este dispositivo.'), 'offline'); })
      .then(function (r) {
        return r.text().then(function (txt) {
          var body = null;
          try { body = txt ? JSON.parse(txt) : null; } catch (e) { /* not JSON */ }
          if (!r.ok) throw fail(friendly(String((body && (body.msg || body.error_description || body.message || body.error)) || 'HTTP ' + r.status)), r.status);
          return body;
        });
      });
  }
  function setSession(s) { S.link.at = s.access_token; S.link.rt = s.refresh_token || S.link.rt; S.link.exp = B.now() + (s.expires_in || 3600) * 1000; S.link.uid = (s.user && s.user.id) || S.link.uid; keep(); }
  function refresh() {
    return send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: S.link.rt }) }, false).then(setSession, function (e) {
      if (e.code === 'offline') throw e;
      K.signOut(); throw fail(L('The BizSim link ended. Link it again in Settings.', 'El enlace con BizSim terminó. Vuelve a enlazarlo en Ajustes.'), 'signedout');
    });
  }
  function api(path, opts) {
    opts = opts || {};
    var ready = !S.link.at || (S.link.exp && B.now() > S.link.exp - 60000) ? refresh() : Promise.resolve();
    return ready.then(function () { return send(path, opts, true); }).then(null, function (e) {
      if (e.code === 401 && !opts.retried) { opts.retried = true; return refresh().then(function () { return send(path, opts, true); }); }
      throw e;
    });
  }
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v);
  }
  K.signIn = function (user, pass) {
    user = String(user || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(user)) return Promise.reject(fail(L('BizSim usernames are 3 to 20 letters, numbers or _.', 'Los usuarios de BizSim tienen de 3 a 20 letras, números o _.'), 'input'));
    return send('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: K.email(user), password: String(pass || '') }) }, false).then(function (s) {
      setSession(s); S.link.user = user; keep();
      return K.sync();
    });
  };
  K.signOut = function () { S.link = {}; keep(); changed(); };
  var running = null;
  // Reads the account's businesses, merges them with this device's and writes the result back when it differs.
  K.sync = function () {
    if (!K.signedIn()) return Promise.resolve(null);
    if (running) return running;
    var uidNow = S.link.uid;
    running = api('/rest/v1/saves?id=eq.' + encodeURIComponent(uidNow) + '&select=data').then(function (rows) {
      var d = rows && rows[0] && rows[0].data, remote = d && d.app === 'bizsim' && Array.isArray(d.recipes) ? d.recipes.filter(valid) : null;
      var merged = remote ? B.engine().mergeRecipes(S.recipes, remote) : S.recipes, got = canon(merged) !== canon(S.recipes);
      if (got) { S.recipes = merged; keep(); resetLabs(); }
      var done = function () { S.link.syncAt = B.now(); S.link.error = ''; keep(); changed(); return { got: got }; };
      if (remote && canon(merged) === canon(remote)) return done();
      return api('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: uidNow, data: { app: 'bizsim', v: 1, recipes: merged }, updated_at: new Date(B.now()).toISOString() }) }).then(done);
    }).then(function (r) { running = null; return r; }, function (e) { running = null; if (K.signedIn()) { S.link.error = e.message; keep(); } changed(); throw e; });
    return running;
  };
  var timer = null;
  function changed() {
    if (typeof document !== 'undefined' && document.dispatchEvent && typeof CustomEvent !== 'undefined') document.dispatchEvent(new CustomEvent('biz-changed'));
    if (!K.signedIn() || timer || typeof setTimeout === 'undefined') return;
    timer = setTimeout(function () { timer = null; K.sync().then(null, function () { /* shown in Settings */ }); }, 2500);
  }
  K.stop = function () { clearTimeout(timer); timer = null; };

  /* ---------------------------------------------------------------- the Businesses page */

  // Progress in each world of the business lab (one world per tool).
  B.progress = function () {
    var G = DA.labgame, lab = G && G.get('biz');
    if (!lab) return [];
    return lab.worlds.map(function (w) {
      var st = G.worldState(lab, w), first = null;
      w.levels.forEach(function (lv) { lv.challenges.forEach(function (c) { if (!first && !G.stars(lab.id, c.id)) first = c; }); });
      return { lab: lab, world: w, solved: st.solved, total: st.total, next: first || w.levels[0].challenges[0] };
    });
  };
  B.bizSimUrl = function () {
    var loc = typeof location !== 'undefined' ? location : null;
    return loc && /^https?:$/.test(loc.protocol) && /\/analyst\//.test(loc.pathname) ? loc.pathname.replace(/\/analyst\/.*$/, '/bizsim/') : 'https://e1caro.github.io/torchnep/bizsim/';
  };

  DA.views = DA.views || {};
  if (!DA.ui || !DA.ui.h) return; // under Node only the data part is used
  var ui = DA.ui, h = ui.h;
  var money = function (v) { return Math.round(v).toLocaleString(DA.lang === 'es' ? 'es-ES' : 'en-GB') + ' €'; };

  DA.views.biz = function (params) {
    if (params[0] === 'import' && params[1]) {
      var got = B.importPayload(params[1]);
      setTimeout(function () { ui.toast(got ? L('Business added: ', 'Negocio añadido: ') + got.big.name : L('That link does not hold a valid business.', 'Ese enlace no contiene un negocio válido.')); location.hash = '#/biz'; }, 0);
      return h('div', { class: 'view' }, h('p', { class: 'muted', text: L('Opening the business…', 'Abriendo el negocio…') }));
    }
    if (params[0] === 'map') return DA.labgame.mapView(DA.labgame.get('biz'));
    if (params[0] === 'play') {
      var lab = DA.labgame.get('biz'), c = lab && lab.byId[params[1]];
      if (!c) return DA.labgame.mapView(lab);
      if (c.tool === 'sql') { setTimeout(function () { location.replace(lab.playHref(c)); }, 0); return h('div', { class: 'view' }); }
      var r0 = B.ensure();
      if (!B.isBuilt(r0)) { // simulate first, without freezing the page, then show the challenge
        var bar0 = h('div', { class: 'biz-bar' }, h('span', null));
        B.buildAsync(r0, function (p) { bar0.firstChild.style.width = Math.round(p * 100) + '%'; }).then(function () { DA.render(); }, function () { location.hash = '#/biz'; });
        return h('div', { class: 'view' }, h('div', { class: 'callout info compact', role: 'status' }, L('Simulating ', 'Simulando ') + r0.big.name + '…', bar0));
      }
      return DA.labPages[c.tool](lab, c);
    }
    if (params[0] && B.get(params[0])) B.setActive(params[0]);
    var root = h('div', { class: 'view biz' });
    root.appendChild(h('h1', { text: L('Businesses', 'Negocios') }));
    root.appendChild(h('p', { class: 'muted', text: L('Simulated businesses from BizSim are the practice data of every lab. Pick one, or create a new one here: the business challenges below ask their questions about it, in SQL, spreadsheets, pandas and DAX.',
      'Los negocios simulados de BizSim son los datos de práctica de todos los laboratorios. Elige uno o crea uno nuevo aquí: los retos del negocio de abajo preguntan sobre él, en SQL, hojas de cálculo, pandas y DAX.') }));
    var body = h('div', null);
    root.appendChild(body);

    function paint() {
      ui.clear(body);
      var r = B.ensure();
      if (!B.isBuilt(r)) {
        var bar = h('div', { class: 'biz-bar' }, h('span', null)), note = h('div', { class: 'callout info compact', role: 'status' }, L('Simulating ', 'Simulando ') + r.big.name + '…', bar);
        body.appendChild(note);
        B.buildAsync(r, function (p) { bar.firstChild.style.width = Math.round(p * 100) + '%'; }).then(function () { if (root.isConnected !== false) paint(); }, function (e) { note.textContent = L('This business could not be simulated: ', 'No se pudo simular este negocio: ') + e.message; });
        return;
      }
      var d = built[r.id], s = d.summary;
      // the active business
      var hero = h('section', { class: 'card biz-hero' },
        h('div', { class: 'biz-head' }, h('span', { class: 'biz-icon', 'aria-hidden': 'true', text: B.TYPE_ICONS[r.big.type] || '🏪' }),
          h('div', null, h('h2', { class: 'notranslate', text: r.big.name }), h('p', { class: 'muted small', text: B.typeName(r.big.type) + ' · ' + r.big.sizeM2 + ' m² · ' + r.day + L(' days simulated, up to ', ' días simulados, hasta el ') + d.ds.to }))),
        h('div', { class: 'biz-kpis' },
          kpi(L('Revenue, 90 days', 'Ingresos, 90 días'), money(s.revenue)), kpi(L('Gross margin', 'Margen bruto'), Math.round(s.marginPct * 100) + ' %'),
          kpi(L('Tickets', 'Tiques'), s.tickets.toLocaleString()), kpi(L('Customers', 'Clientes'), s.customers.toLocaleString()), kpi(L('Products', 'Productos'), String(s.products))),
        h('p', { class: 'muted small', text: L('In the labs: ', 'En los laboratorios: ') + d.ds.data.transaction_items.length.toLocaleString() + L(' sale lines in SQLab (', ' líneas de venta en SQLab (') + d.ds.from + ' → ' + d.ds.to + L('), the last ', '), los últimos ') + d.flat.days.rows.length + L(' days in DotSheets, and ', ' días en DotSheets y ') + d.flat.sales.rows.length.toLocaleString() + L(' lines in DotPython and DotBI.', ' líneas en DotPython y DotBI.') }));
      var labs = h('div', { class: 'biz-labs' });
      B.progress().forEach(function (p) {
        labs.appendChild(h('a', { class: 'biz-lab', href: DA.labgame.href(p.lab, p.next) },
          h('strong', { class: 'notranslate', text: p.world.icon + ' ' + p.world.tool }), h('span', { class: 'muted small', text: p.solved + ' / ' + p.total + L(' solved', ' resueltos') }),
          h('span', { class: 'biz-meter' }, h('span', { style: 'width:' + Math.round((100 * p.solved) / Math.max(1, p.total)) + '%' }))));
      });
      hero.appendChild(labs);
      hero.appendChild(h('div', { class: 'row' }, h('a', { class: 'btn accent', href: '#/lab/biz' }, '🗄️ ' + L('Explore it in SQLab', 'Explóralo en SQLab')),
        h('a', { class: 'btn', href: '#/biz/map' }, L('All business challenges', 'Todos los retos del negocio')),
        h('a', { class: 'btn ghost', href: B.bizSimUrl(), target: '_blank', rel: 'noopener' }, L('Open BizSim', 'Abrir BizSim'))));
      body.appendChild(hero);

      // the others
      var others = B.list().filter(function (x) { return x.id !== r.id; });
      if (others.length) {
        var list = h('section', { class: 'card' }, h('h2', { text: L('Your other businesses', 'Tus otros negocios') }));
        others.forEach(function (x) {
          list.appendChild(h('div', { class: 'biz-row' }, h('span', { 'aria-hidden': 'true', text: B.TYPE_ICONS[x.big.type] || '🏪' }),
            h('div', { class: 'biz-row-main' }, h('strong', { class: 'notranslate', text: x.big.name }), h('span', { class: 'muted small', text: B.typeName(x.big.type) + ' · ' + x.day + L(' days', ' días') })),
            h('button', { class: 'btn small', type: 'button', onclick: function () { B.setActive(x.id); paint(); } }, L('Use for practice', 'Usar para practicar')),
            h('button', { class: 'btn ghost small', type: 'button', 'aria-label': L('Delete ', 'Eliminar ') + x.big.name, onclick: function () { if (window.confirm(L('Delete this business? If BizSim is linked it is deleted there too.', '¿Eliminar este negocio? Si BizSim está enlazado, también se elimina allí.'))) { B.remove(x.id); paint(); } } }, '🗑')));
        });
        body.appendChild(list);
      }
      body.appendChild(createCard(paint));
      body.appendChild(linkCard(paint));
    }
    function kpi(label, value) { return h('div', { class: 'biz-kpi' }, h('span', { class: 'muted small', text: label }), h('strong', { text: value })); }
    paint();
    return root;
  };

  function createCard(done) {
    var E = B.engine(), type = h('select', { id: 'bizType', 'aria-label': L('Type of business', 'Tipo de negocio') }, E.TYPES.map(function (t) { return h('option', { value: t, text: (B.TYPE_ICONS[t] || '') + ' ' + B.typeName(t) }); }));
    var name = h('input', { type: 'text', id: 'bizName', maxlength: '40', placeholder: L('Name (optional)', 'Nombre (opcional)'), 'aria-label': L('Name', 'Nombre') });
    var size = h('input', { type: 'range', id: 'bizSize', 'aria-label': L('Size in m²', 'Tamaño en m²') }), sizeOut = h('strong', null);
    var pos = h('select', { id: 'bizPos', 'aria-label': L('Price positioning', 'Posicionamiento de precio') }, [[0, L('Low price', 'Precio bajo')], [1, L('Mid range', 'Gama media')], [2, 'Premium']].map(function (o) { return h('option', { value: o[0], text: o[1], selected: o[0] === 1 }); }));
    var days = h('select', { id: 'bizDays', 'aria-label': L('History', 'Historial') }, [[90, L('3 months', '3 meses')], [180, L('6 months', '6 meses')], [365, L('1 year', '1 año')], [730, L('2 years', '2 años')]].map(function (o) { return h('option', { value: o[0], text: o[1], selected: o[0] === 180 }); }));
    function sizes() { var z = E.sizes[type.value]; size.min = z[0]; size.max = z[1]; size.step = 5; size.value = z[2]; sizeOut.textContent = z[2] + ' m²'; }
    type.addEventListener('change', sizes); size.addEventListener('input', function () { sizeOut.textContent = size.value + ' m²'; });
    sizes();
    return h('section', { class: 'card', id: 'bizCreate' }, h('h2', { text: L('Create a business', 'Crea un negocio') }),
      h('p', { class: 'muted small', text: L('A quick version of BizSim\'s wizard. The business is simulated on this device' + (K.signedIn() ? ' and saved to your BizSim account.' : '; link BizSim in Settings to see it there too.'),
        'Una versión rápida del asistente de BizSim. El negocio se simula en este dispositivo' + (K.signedIn() ? ' y se guarda en tu cuenta de BizSim.' : '; enlaza BizSim en Ajustes para verlo también allí.')) }),
      h('div', { class: 'biz-form' }, h('label', null, L('Type', 'Tipo'), type), h('label', null, L('Name', 'Nombre'), name),
        h('label', null, h('span', null, L('Size ', 'Tamaño '), sizeOut), size), h('label', null, L('Prices', 'Precios'), pos), h('label', null, L('History', 'Historial'), days)),
      h('div', { class: 'row' }, h('button', { class: 'btn accent', type: 'button', id: 'bizCreateBtn', onclick: function () { B.create({ type: type.value, name: name.value.trim(), sizeM2: +size.value, pricePos: +pos.value, days: +days.value }); done(); } }, L('Create and use it', 'Crear y usarlo'))));
  }

  function linkCard(done) {
    if (K.signedIn()) {
      var msg = h('span', { class: 'muted small', role: 'status', text: K.lastError() || '' });
      return h('section', { class: 'card', id: 'bizLink' }, h('h2', { text: L('BizSim link', 'Enlace con BizSim') }),
        h('p', null, h('strong', { text: '🔗 ' + L('Linked to the BizSim account ', 'Enlazado con la cuenta de BizSim ') + K.user() }), h('br'),
          h('span', { class: 'muted small', text: L('Businesses from BizSim appear here, and the ones you create here appear in BizSim.', 'Los negocios de BizSim aparecen aquí, y los que crees aquí aparecen en BizSim.') })),
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: function () { msg.textContent = L('Syncing…', 'Sincronizando…'); K.sync().then(function () { done(); }, function (e) { msg.textContent = e.message; }); } }, L('Sync now', 'Sincronizar ahora')),
          h('a', { class: 'btn ghost', href: '#/settings' }, L('Manage in Settings', 'Gestionar en Ajustes'))), msg);
    }
    return h('section', { class: 'card', id: 'bizLink' }, h('h2', { text: L('Link BizSim', 'Enlaza BizSim') }),
      h('p', { class: 'muted', text: L('BizSim is the full simulator: sliders for prices, staff, marketing and stock, live dashboards and exports. Link your BizSim account and its businesses become practice data here.',
        'BizSim es el simulador completo: controles de precios, personal, marketing y stock, paneles en vivo y descargas. Enlaza tu cuenta de BizSim y sus negocios serán datos de práctica aquí.') }),
      h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/settings' }, '🔗 ' + L('Link in Settings', 'Enlazar en Ajustes')), h('a', { class: 'btn ghost', href: B.bizSimUrl(), target: '_blank', rel: 'noopener' }, L('Open BizSim', 'Abrir BizSim'))));
  }

  // The card in Settings where the BizSim account is linked and unlinked.
  B.settingsCard = function (section) {
    var box = h('div', null), msg = h('p', { class: 'muted small', role: 'status' });
    function paint() {
      ui.clear(box);
      if (K.signedIn()) {
        box.appendChild(h('p', { class: 'sync-ok' }, h('strong', { text: '🔗 ' + L('Linked to the BizSim account ', 'Enlazado con la cuenta de BizSim ') + K.user() }), h('br'),
          h('span', { class: 'muted small', text: L('Its businesses are practice data in every lab, and the ones you create here appear in BizSim.', 'Sus negocios son datos de práctica en todos los laboratorios, y los que crees aquí aparecen en BizSim.') })));
        box.appendChild(h('div', { class: 'row' },
          h('button', { class: 'btn accent', type: 'button', onclick: function () { msg.textContent = L('Syncing…', 'Sincronizando…'); K.sync().then(function (r) { msg.textContent = r && r.got ? L('Synced: businesses arrived from BizSim.', 'Sincronizado: llegaron negocios de BizSim.') : L('Synced. Everything is up to date.', 'Sincronizado. Todo está al día.'); }, function (e) { msg.textContent = e.message; }); } }, L('Sync now', 'Sincronizar ahora')),
          h('a', { class: 'btn', href: '#/biz' }, L('See the businesses', 'Ver los negocios')),
          h('button', { class: 'btn ghost', type: 'button', onclick: function () { K.signOut(); msg.textContent = L('Unlinked. The businesses stay on this device and in BizSim.', 'Desenlazado. Los negocios siguen en este dispositivo y en BizSim.'); paint(); } }, L('Unlink', 'Desenlazar'))));
        return;
      }
      var user = h('input', { type: 'text', id: 'bizUser', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', maxlength: '20', placeholder: L('BizSim username', 'usuario de BizSim'), 'aria-label': L('BizSim username', 'Usuario de BizSim') });
      var pass = h('input', { type: 'password', id: 'bizPass', autocomplete: 'off', placeholder: L('BizSim password', 'contraseña de BizSim'), 'aria-label': L('BizSim password', 'Contraseña de BizSim') });
      var go = h('button', { class: 'btn accent', type: 'submit', id: 'bizLinkBtn' }, '🔗 ' + L('Link BizSim', 'Enlazar BizSim'));
      box.appendChild(h('p', { class: 'muted small', text: L('Enter the username and password of your BizSim account (the simulator app; it is a different account from the one above). Only a session is kept here, never the password.',
        'Escribe el usuario y la contraseña de tu cuenta de BizSim (la app del simulador; es una cuenta distinta de la de arriba). Aquí solo se guarda una sesión, nunca la contraseña.') }));
      box.appendChild(h('form', { class: 'row', onsubmit: function (e) {
        e.preventDefault(); go.disabled = true; msg.textContent = L('Connecting…', 'Conectando…');
        K.signIn(user.value, pass.value).then(function () { msg.textContent = L('Linked. Your BizSim businesses are now in Businesses.', 'Enlazado. Tus negocios de BizSim ya están en Negocios.'); paint(); }, function (e2) { msg.textContent = e2.message; go.disabled = false; });
      } }, user, pass, go));
    }
    paint();
    var card = section(L('Link BizSim', 'Enlaza BizSim'), null, h('div', null, box, msg));
    card.id = 'bizlink';
    return card;
  };
})();
