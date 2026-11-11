/* Automatic sync between devices with an account.
 *
 * Sign in with the same username on the phone app and on the web, and every device keeps the same progress.
 * Each sync reads the account's copy, MERGES it with this device (DA.sync.merge: lessons, XP, streak days and
 * reviews are unioned, so nothing is ever overwritten or lost) and writes the result back. It runs when the app
 * opens, a few seconds after each change, when you come back to the tab or app, and every couple of minutes.
 *
 * The account lives in the free Supabase project that FitQuest's accounts already use (fitai-app/cloud.js): the
 * same REST calls with fetch, no library. Only the progress is stored online, in this account's row of the
 * "saves" table, which the database lets nobody else read (row-level security, fitai-app/tools/supabase.sql).
 * Accounts are separate from FitQuest's ("analyst." in front of the username), so the two apps never mix.
 * The password is never kept: only the session tokens, on this device.
 */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui;
  var C = (DA.cloud = {});

  C.URL = 'https://fghbrevlqmrugbnqshoj.supabase.co';
  C.KEY = 'sb_publishable_22MWQyEpsR2OyZv9RXkswg_FdGjA2i9'; // the publishable key: public by design, access is limited by the database rules
  C.USER_RE = /^[a-z0-9_]{3,20}$/;
  C.MIN_PASS = 6;
  C.DELAY = 3000;         // after a change, wait this long for more changes before syncing
  C.EVERY = 120000;       // while the app is open and visible, also sync this often
  C.email = function (user) { return 'analyst.' + user + '@users.fitquest.app'; }; // an address nobody receives
  C.fetch = function (url, opts) { return window.fetch(url, opts); }; // replaced in tests
  C.now = function () { return Date.now(); };

  var KEY = 'data-analyst-path.cloud', S = load(), noop = function () { /* reported elsewhere */ };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function keep() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }

  C.signedIn = function () { return !!(S.uid && S.rt); };
  C.user = function () { return S.user || ''; };
  C.lastSync = function () { return S.syncAt || 0; };
  C.lastError = function () { return S.error || ''; };

  function fail(msg, code) { var e = new Error(msg); e.code = code; return e; }
  var OFFLINE = 'No connection. Your progress is safe on this device and syncs when you are back online.';
  var FRIENDLY = [
    [/already (been )?registered|already exists/i, 'That username is taken. Pick another, or sign in if it is yours.'],
    [/invalid login credentials|invalid grant/i, 'Wrong username or password.'],
    [/password should be at least|weak password/i, 'Use a password of at least ' + C.MIN_PASS + ' characters.'],
    [/rate limit|too many/i, 'Too many attempts. Wait a minute and try again.'],
    [/signups? not allowed|disabled/i, 'New accounts are closed right now. Try again later.']
  ];
  function friendly(raw) {
    for (var i = 0; i < FRIENDLY.length; i++) if (FRIENDLY[i][0].test(raw)) return FRIENDLY[i][1];
    return 'The sync service answered: ' + raw;
  }

  /* ---------------------------------------------------------------- requests */

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
    if (opts.body !== undefined) init.body = opts.body;
    if (opts.keepalive) init.keepalive = true;
    return Promise.resolve().then(function () { return C.fetch(C.URL + path, init); })
      .then(null, function () { throw fail(OFFLINE, 'offline'); })
      .then(function (r) {
        return r.text().then(function (txt) {
          var body = null;
          try { body = txt ? JSON.parse(txt) : null; } catch (e) { /* not JSON */ }
          if (!r.ok) {
            var raw = (body && (body.msg || body.error_description || body.message || body.error)) || ('HTTP ' + r.status);
            throw fail(friendly(String(raw)), r.status);
          }
          return body;
        });
      });
  }

  var refreshing = null;
  function refresh() {
    if (refreshing) return refreshing;
    refreshing = send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: S.rt }) }, false)
      .then(function (s) { setSession(s); }, function (e) {
        if (e.code === 'offline') throw e;
        C.signOut();
        throw fail('Your session ended. Sign in again to keep syncing.', 'signedout');
      })
      .then(function () { refreshing = null; }, function (e) { refreshing = null; throw e; });
    return refreshing;
  }

  // An authorised request: refreshes the session first when it is about to expire, and once more on a 401.
  function api(path, opts) {
    opts = opts || {};
    var ready = !S.at || (S.exp && C.now() > S.exp - 60000) ? refresh() : Promise.resolve();
    return ready.then(function () { return send(path, opts, true); }).then(null, function (e) {
      if (e.code === 401 && !opts.retried) { opts.retried = true; return refresh().then(function () { return send(path, opts, true); }); }
      throw e;
    });
  }

  /* ---------------------------------------------------------------- comparing */

  // JSON with sorted keys, so two equal states always give the same text.
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v);
  }
  // Progress without the device's own settings (theme, sound, reminder...): each device keeps those.
  function progress(s) { var o = {}; Object.keys(s).forEach(function (k) { if (k !== 'profile') o[k] = s[k]; }); return canon(o); }
  C._canon = canon;

  /* ---------------------------------------------------------------- sync */

  var running = null, again = false, applying = false, timer = null;

  function doSync() {
    var uid = S.uid;
    return api('/rest/v1/saves?id=eq.' + encodeURIComponent(uid) + '&select=data,updated_at').then(function (rows) {
      var row = rows && rows[0], d = row && row.data;
      var remote = d && d.app === 'data-analyst-path' && d.state ? ui.sanitize(d.state) : null;
      var local = ui.sanitize(ui.state);
      var merged = remote ? DA.sync.merge(local, remote) : local;
      var got = canon(merged) !== canon(local);
      if (got) {
        applying = true;
        try { ui.state = merged; ui.save(); } finally { applying = false; }
      }
      var push = !remote || progress(merged) !== progress(remote) || (!remote.profile.bg && merged.profile.bg);
      var done = function () {
        S.syncAt = C.now(); S.error = ''; keep();
        if (got && typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('cloud-merged'));
        return { got: got, pushed: push };
      };
      if (!push) return done();
      var body = JSON.stringify({ id: uid, data: { app: 'data-analyst-path', v: 2, state: merged }, updated_at: new Date(C.now()).toISOString() });
      return api('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: body, keepalive: body.length < 60000 }).then(done);
    });
  }

  // Merges this device with the account. Resolves to { got: new progress arrived, pushed: the account was updated }.
  C.sync = function () {
    if (!C.signedIn()) return Promise.resolve(null);
    if (running) { again = true; return running; }
    clearTimeout(timer); timer = null;
    var after = function () {
      running = null;
      if (again) { again = false; C.sync().then(null, noop); }
    };
    running = doSync().then(function (r) { after(); paint(); return r; }, function (e) {
      if (C.signedIn()) { S.error = e.message; keep(); }
      after(); paint(); throw e;
    });
    return running;
  };

  function paint() { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('cloud-status')); }

  // Every save on this device schedules a sync a few seconds later (several quick changes make one sync).
  var baseSave = ui.save;
  ui.save = function () {
    baseSave.apply(ui, arguments);
    if (applying || !C.signedIn()) return;
    clearTimeout(timer);
    timer = setTimeout(function () { timer = null; C.sync().then(null, noop); }, C.DELAY);
  };
  C.pending = function () { return !!timer; };
  C.stop = function () { clearTimeout(timer); timer = null; };

  /* ---------------------------------------------------------------- account */

  function check(user, pass) {
    user = String(user || '').trim().toLowerCase();
    if (!C.USER_RE.test(user)) return Promise.reject(fail('Usernames are 3 to 20 letters, numbers or _ (no spaces).', 'input'));
    if (String(pass || '').length < C.MIN_PASS) return Promise.reject(fail('Use a password of at least ' + C.MIN_PASS + ' characters.', 'input'));
    return Promise.resolve(user);
  }

  // A new account: what is on this device becomes the account's progress.
  C.signUp = function (user, pass) {
    return check(user, pass).then(function (u) {
      return send('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: C.email(u), password: pass }) }, false).then(function (s) {
        if (!s || !s.access_token) throw fail('New accounts are closed right now. Try again later.', 'closed');
        setSession(s); S.user = u; keep();
        return C.sync();
      });
    });
  };

  // An existing account: its progress and this device's are merged.
  C.signIn = function (user, pass) {
    return check(user, pass).then(function (u) {
      return send('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: C.email(u), password: pass }) }, false).then(function (s) {
        setSession(s); S.user = u; keep();
        return C.sync();
      });
    });
  };

  // Forgets the account on this device. The progress stays on this device and in the account.
  C.signOut = function () {
    C.stop();
    Object.keys(S).forEach(function (k) { delete S[k]; });
    keep(); paint();
  };

  // Deletes the online copy and the account itself; this device keeps its progress.
  C.deleteAccount = function () {
    var uid = S.uid;
    return api('/rest/v1/saves?id=eq.' + encodeURIComponent(uid), { method: 'DELETE' })
      .then(function () { return api('/rest/v1/rpc/delete_my_account', { method: 'POST', body: '{}' }).then(null, noop); })
      .then(function () { C.signOut(); });
  };

  /* ---------------------------------------------------------------- when to sync */

  var lastTry = 0;
  function soon() {
    if (!C.signedIn() || C.now() - lastTry < 10000) return;
    lastTry = C.now();
    C.sync().then(null, noop);
  }
  C.start = function () {
    if (typeof document === 'undefined') return;
    soon();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') soon();
      else if (timer) C.sync().then(null, noop); // leaving: send what is waiting now
    });
    window.addEventListener('online', soon);
    window.addEventListener('pagehide', function () { if (timer) C.sync().then(null, noop); });
    setInterval(function () { if (document.visibilityState !== 'hidden') soon(); }, C.EVERY);
  };
})();
