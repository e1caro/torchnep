/* Kaidoneta online crew: the friends' phones share one book.
 *
 * A crew is a name and a password the friends share. It is an account in the free Supabase project the other apps
 * use (fitai-app/cloud.js, bloomdoku/js/cloud.js), signed in as kaido.<crew>@users.fitquest.app, and the crew's
 * book lives in that account's row of the existing "saves" table: no new tables, nothing to set up.
 * Every sync reads the crew's copy, MERGES it with this phone's (K.core.merge: newest edit wins, record by record)
 * and writes back what changed on either side, so phones that log at the same time never lose a round: if one
 * write lands over another, the next sync of the phone that lost it puts its rounds back.
 * The password is never kept, only the session tokens, on this phone.
 */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var core = K.core;
  var C = (K.cloud = {});

  C.URL = 'https://fghbrevlqmrugbnqshoj.supabase.co';
  C.KEY = 'sb_publishable_22MWQyEpsR2OyZv9RXkswg_FdGjA2i9'; // the publishable key: public by design, access is limited by the database rules
  C.CREW_RE = /^[a-z0-9_]{3,20}$/;
  C.MIN_PASS = 6;
  C.DELAY = 1500;   // after a change, wait this long for more changes before syncing
  C.EVERY = 20000;  // while the app is open and visible, look for the crew's news this often
  C.email = function (crew) { return 'kaido.' + crew + '@users.fitquest.app'; }; // an address nobody receives
  C.fetch = function (url, opts) { return root.fetch(url, opts); };              // replaced in tests
  C.now = function () { return Date.now(); };
  // The app plugs these in: the phone's book, and what to do with a merged one.
  C.getBook = function () { return core.emptyBook(); };
  C.setBook = function () {};

  var KEY = 'kaidoneta.cloud', S = load();
  function store() { try { return root.localStorage; } catch (e) { return null; } }
  function load() { try { return JSON.parse(store().getItem(KEY)) || {}; } catch (e) { return {}; } }
  function keep() { try { store().setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }
  C.reload = function () { S = load(); }; // tests: another phone

  C.signedIn = function () { return !!(S.uid && S.rt); };
  C.crew = function () { return S.crew || ''; };
  C.lastSync = function () { return S.syncAt || 0; };
  C.lastError = function () { return S.err || ''; };

  var listeners = [];
  C.on = function (fn) { listeners.push(fn); };
  function changed(what) { listeners.forEach(function (fn) { try { fn(what); } catch (e) { /* a listener's own problem */ } }); }

  function fail(msg, code) { var e = new Error(msg); e.code = code; return e; }
  var OFFLINE = 'No signal. Everything is saved on this phone and syncs when you are back online.';
  var FRIENDLY = [
    [/already (been )?registered|already exists/i, 'That crew name is taken. Join it with its password, or pick another name.'],
    [/invalid login credentials|invalid grant/i, 'Wrong crew name or password.'],
    [/password should be at least|weak password/i, 'Use a crew password of at least 6 characters.'],
    [/rate limit|too many requests/i, 'Too many attempts. Wait a minute and try again.'],
    [/signups? not allowed|disabled/i, 'New crews are closed right now. Try again later.'],
  ];
  function friendly(raw) {
    for (var i = 0; i < FRIENDLY.length; i++) if (FRIENDLY[i][0].test(raw)) return FRIENDLY[i][1];
    return raw;
  }

  /* ---------- requests ---------- */
  function setSession(s) {
    S.at = s.access_token; S.rt = s.refresh_token || S.rt;
    S.exp = C.now() + (s.expires_in || 3600) * 1000;
    S.uid = (s.user && s.user.id) || S.uid;
    keep();
  }
  function send(path, opts, auth) {
    var hd = { apikey: C.KEY, 'Content-Type': 'application/json' };
    Object.keys(opts.headers || {}).forEach(function (k) { hd[k] = opts.headers[k]; });
    if (auth) hd.Authorization = 'Bearer ' + S.at;
    var init = { method: opts.method || 'GET', headers: hd };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
    return Promise.resolve().then(function () { return C.fetch(C.URL + path, init); })
      .then(null, function () { throw fail(OFFLINE, 'offline'); })
      .then(function (r) {
        return r.text().then(function (txt) {
          var body = null;
          try { body = txt ? JSON.parse(txt) : null; } catch (e) { /* not JSON */ }
          if (r.ok) return body;
          var raw = String((body && (body.msg || body.error_description || body.message || body.error)) || ('HTTP ' + r.status));
          throw fail(friendly(raw), r.status);
        });
      });
  }
  var refreshing = null;
  function refresh() {
    if (refreshing) return refreshing;
    refreshing = send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: S.rt } }, false)
      .then(function (s) { setSession(s); }, function (e) {
        if (e.code === 'offline') throw e;
        C.leave();
        throw fail('The crew session ended. Join the crew again.', 'signedout');
      })
      .then(function () { refreshing = null; }, function (e) { refreshing = null; throw e; });
    return refreshing;
  }
  function api(path, opts) {
    opts = opts || {};
    if (!C.signedIn()) return Promise.reject(fail('Join a crew first.', 'signedout'));
    var ready = !S.at || (S.exp && C.now() > S.exp - 60000) ? refresh() : Promise.resolve();
    return ready.then(function () { return send(path, opts, true); }).then(null, function (e) {
      if (e.code === 401 && !opts.retried) { opts.retried = true; return refresh().then(function () { return send(path, opts, true); }); }
      throw e;
    });
  }

  /* ---------- crew ---------- */
  C.clean = function (crew) { return String(crew || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); };
  function check(crew, pass) {
    if (!C.CREW_RE.test(crew)) throw fail('A crew name has 3 to 20 letters, digits or _.', 'input');
    if (String(pass || '').length < C.MIN_PASS) throw fail('Use a crew password of at least 6 characters.', 'input');
  }
  function entered(crew) {
    return function (s) {
      if (!s || !s.access_token) throw fail('The crew service did not answer as expected. Try again.', 'auth');
      S = { crew: crew };
      setSession(s);
      changed('session');
      return C.sync().then(function () { return crew; });
    };
  }
  // A new crew. If the name exists already, try to join it with the same password instead.
  C.create = function (crew, pass) {
    crew = C.clean(crew);
    return Promise.resolve().then(function () { check(crew, pass); })
      .then(function () { return send('/auth/v1/signup', { method: 'POST', body: { email: C.email(crew), password: pass } }, false); })
      .then(entered(crew), function (e) {
        if (/taken/.test(e.message)) return C.join(crew, pass).then(null, function () { throw e; });
        throw e;
      });
  };
  C.join = function (crew, pass) {
    crew = C.clean(crew);
    return Promise.resolve().then(function () { check(crew, pass); })
      .then(function () { return send('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: C.email(crew), password: pass } }, false); })
      .then(entered(crew));
  };
  C.leave = function () {
    clearTimeout(timer);
    S = {}; last = '';
    keep();
    changed('session');
  };

  /* ---------- sync ---------- */
  var timer = null, last = '', syncing = null, waiting = false;
  C.sync = function () {
    if (!C.signedIn()) return Promise.resolve(false);
    if (syncing) return syncing;
    clearTimeout(timer);
    waiting = false;
    changed('syncing');
    syncing = api('/rest/v1/saves?id=eq.' + S.uid + '&select=data').then(function (rows) {
      var data = rows && rows[0] ? rows[0].data : null;
      var remote = data && data.app === 'kaidoneta' ? core.cleanBook(data.book) : null;
      var mine = C.getBook(), merged = core.merge(remote, mine), took = false;
      if (!core.same(merged, mine)) { C.setBook(merged); took = true; }
      last = core.canon(merged);
      var job = remote && core.same(merged, remote) ? Promise.resolve() :
        api('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: { id: S.uid, data: { app: 'kaidoneta', v: 1, book: merged }, updated_at: new Date(C.now()).toISOString() } });
      return job.then(function () {
        S.syncAt = C.now(); S.err = ''; keep();
        changed(took ? 'book' : 'synced');
        return took;
      });
    }).then(function (v) { syncing = null; return v; }, function (e) {
      syncing = null;
      S.err = e.message; keep();
      changed('error');
      throw e;
    });
    return syncing;
  };
  // Called after every change: syncs a moment later (several quick changes become one sync).
  C.touch = function () {
    if (!C.signedIn()) return;
    if (core.canon(C.getBook()) === last) return;
    clearTimeout(timer);
    waiting = true;
    timer = setTimeout(function () { C.sync().then(null, function () { /* tries again at the next change or visit */ }); }, C.DELAY);
  };
  C.pending = function () { return waiting; };

  C.start = function () {
    root.document.addEventListener('visibilitychange', function () {
      if (!root.document.hidden) C.sync().then(null, function () {});
      else if (waiting) C.sync().then(null, function () {});
    });
    root.addEventListener('online', function () { C.sync().then(null, function () {}); });
    setInterval(function () { if (!root.document.hidden) C.sync().then(null, function () {}); }, C.EVERY);
    C.sync().then(null, function () {});
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
