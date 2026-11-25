/* Bloomdoku accounts: sync between devices, friends and messages.
 *
 * An account is a username and a password (no e-mail). It lives in the free Supabase project the other apps use
 * (fitai-app/cloud.js, data-analyst-path/js/cloud.js): plain REST calls with fetch, no library. Bloomdoku accounts
 * are separate from theirs ("bloom." in front of the username).
 *  - Sync: the progress (stars, gardens, daily bouquets) is kept in this account's row of "saves", which nobody else
 *    can read. Every sync MERGES the two copies (BD.worlds.merge), so playing on two devices never loses anything.
 *  - Friends: profiles, friend requests and messages live in the bloom_* tables of tools/supabase.sql. Friends see a
 *    summary (BD.worlds.publicProfile); only friends can write to each other. Until that file has been run in the
 *    project, C.friendsOff() is true and everything else still works.
 * The password is never kept: only the session tokens, on this device.
 */
(function () {
  'use strict';
  var BD = (window.BD = window.BD || {});
  var W = BD.worlds;
  var C = (BD.cloud = {});

  C.URL = 'https://fghbrevlqmrugbnqshoj.supabase.co';
  C.KEY = 'sb_publishable_22MWQyEpsR2OyZv9RXkswg_FdGjA2i9'; // the publishable key: public by design, access is limited by the database rules
  C.USER_RE = /^[a-z0-9_]{3,20}$/;
  C.MIN_PASS = 6;
  C.MAX_MSG = 500;
  C.DELAY = 3000;      // after a change, wait this long for more changes before syncing
  C.EVERY = 60000;     // while the app is open and visible, look for news this often
  C.email = function (user) { return 'bloom.' + user + '@users.fitquest.app'; }; // an address nobody receives
  C.fetch = function (url, opts) { return window.fetch(url, opts); };            // replaced in tests
  C.now = function () { return Date.now(); };

  var KEY = 'bloomdoku.cloud', S = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function keep() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }
  C.reload = function () { S = load(); F = empty(); }; // tests: another device

  C.signedIn = function () { return !!(S.uid && S.rt); };
  C.user = function () { return S.user || ''; };
  C.uid = function () { return S.uid || ''; };
  C.code = function () { return S.code || ''; };
  C.lastSync = function () { return S.syncAt || 0; };
  C.friendsOff = function () { return !!S.off; };

  var listeners = [];
  C.on = function (fn) { listeners.push(fn); };
  function changed(what) { listeners.forEach(function (fn) { try { fn(what); } catch (e) { /* a listener's own problem */ } }); }

  function fail(msg, code) { var e = new Error(msg); e.code = code; return e; }
  function T(s) { return s; } // marks a sentence for translation; BD.t is applied where the error is shown
  var OFFLINE = T('No connection. Your progress is safe on this device and syncs when you are back online.');
  var FRIENDLY = [
    [/already (been )?registered|already exists/i, T('That username is taken. Pick another, or sign in if it is yours.')],
    [/invalid login credentials|invalid grant/i, T('Wrong username or password.')],
    [/password should be at least|weak password/i, T('Use a password of at least 6 characters.')],
    [/rate limit|too many requests/i, T('Too many attempts. Wait a minute and try again.')],
    [/too many messages/i, T('Too many messages. Wait a minute.')],
    [/signups? not allowed|disabled/i, T('New accounts are closed right now. Try again later.')],
    [/row-level security|violates/i, T('That is not allowed.')],
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
          // a bloom_* table or function the project does not have yet: friends are not switched on
          if (/\/rest\/v1\/(rpc\/)?bloom_/.test(path) && (r.status === 404 || /PGRST20[25]|42P01|42883/.test((body && body.code) || ''))) throw fail(T('Friends are not switched on yet.'), 'nofriends');
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
        C.signOut();
        throw fail(T('Your session ended. Sign in again.'), 'signedout');
      })
      .then(function () { refreshing = null; }, function (e) { refreshing = null; throw e; });
    return refreshing;
  }
  // An authorised request: refreshes the session first when it is about to expire, and once more on a 401.
  function api(path, opts) {
    opts = opts || {};
    if (!C.signedIn()) return Promise.reject(fail(T('Sign in first.'), 'signedout'));
    var ready = !S.at || (S.exp && C.now() > S.exp - 60000) ? refresh() : Promise.resolve();
    return ready.then(function () { return send(path, opts, true); }).then(null, function (e) {
      if (e.code === 401 && !opts.retried) { opts.retried = true; return refresh().then(function () { return send(path, opts, true); }); }
      throw e;
    });
  }

  /* ---------- account ---------- */
  function check(user, pass) {
    if (!C.USER_RE.test(user)) throw fail(T('A username has 3 to 20 letters, digits or _.'), 'input');
    if (String(pass || '').length < C.MIN_PASS) throw fail(T('Use a password of at least 6 characters.'), 'input');
  }
  function entered(user) {
    return function (s) {
      if (!s || !s.access_token) throw fail(T('The account service did not answer as expected. Try again.'), 'auth');
      S = { user: user };
      setSession(s);
      F = empty();
      changed('session');
      return C.sync().then(null, function (e) { if (e.code === 'signedout') throw e; }).then(function () { return C.user(); });
    };
  }
  C.signUp = function (user, pass) {
    user = String(user || '').trim().toLowerCase();
    return Promise.resolve().then(function () { check(user, pass); })
      .then(function () { return send('/auth/v1/signup', { method: 'POST', body: { email: C.email(user), password: pass } }, false); })
      .then(entered(user));
  };
  C.signIn = function (user, pass) {
    user = String(user || '').trim().toLowerCase();
    return Promise.resolve().then(function () { check(user, pass); })
      .then(function () { return send('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: C.email(user), password: pass } }, false); })
      .then(entered(user));
  };
  C.signOut = function () {
    clearTimeout(timer);
    S = {}; F = empty(); last = '';
    keep();
    changed('session');
  };
  C.deleteAccount = function () {
    return api('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} }).then(function () { C.signOut(); });
  };

  /* ---------- sync ---------- */
  var timer = null, last = '', syncing = null, waiting = false; // waiting: a change has not been sent yet
  function canon(v) { // JSON with sorted keys, so two equal copies always give the same text
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v);
  }
  function apply(p) {
    var s = BD.state;
    s.levels = p.levels; s.daily = p.daily; s.seen = p.seen; s.invites = p.invites; s.avatar = p.avatar;
    s.own = p.own; s.bought = p.bought; s.used = p.used;
    BD.state = BD.sanitize(s);
    last = canon(W.progress(BD.state)); // what was just merged is not a change to send again
    BD.save();
  }
  // Reads the account's copy, merges it with this device and writes back what changed, on both sides.
  C.sync = function () {
    if (!C.signedIn()) return Promise.resolve(false);
    if (syncing) return syncing;
    clearTimeout(timer);
    waiting = false;
    syncing = api('/rest/v1/saves?id=eq.' + S.uid + '&select=data').then(function (rows) {
      var remote = rows && rows[0] ? rows[0].data : null, mine = W.progress(BD.state);
      var merged = W.merge(remote, mine), text = canon(merged), took = false, jobs = [];
      if (text !== canon(W.merge(null, mine))) { apply(merged); took = true; }
      if (!remote || text !== canon(W.merge(remote, null))) {
        jobs.push(api('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: { id: S.uid, data: merged, updated_at: new Date(C.now()).toISOString() } }));
      }
      last = canon(W.progress(BD.state));
      return Promise.all(jobs).then(function () { return profile(); }).then(function () {
        S.syncAt = C.now(); keep();
        if (took) changed('progress');
        return took;
      });
    }).then(function (v) { syncing = null; return v; }, function (e) { syncing = null; throw e; });
    return syncing;
  };
  // Called after every save: when the progress changed, sync a little later (several changes become one sync).
  C.touch = function () {
    if (!C.signedIn()) return;
    var now = canon(W.progress(BD.state));
    if (now === last) return;
    clearTimeout(timer);
    waiting = true;
    timer = setTimeout(function () { C.sync().then(null, function () { /* tries again at the next change or visit */ }); }, C.DELAY);
  };

  /* ---------- profile ---------- */
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0, 1, I or O: easy to read out
  C.random = function () { return Math.random(); };
  function newCode() { var c = ''; for (var i = 0; i < 6; i++) c += ALPHABET.charAt(Math.floor(C.random() * ALPHABET.length)); return c; }
  // Creates the profile the first time, then keeps what friends see up to date. Quietly does nothing while friends
  // are not switched on in the project.
  function profile() {
    var pub = W.publicProfile(BD.state), text = canon(pub);
    var known = S.code ? Promise.resolve([{ code: S.code }]) : api('/rest/v1/bloom_profiles?id=eq.' + S.uid + '&select=code');
    return known.then(function (rows) {
      if (S.off) { S.off = false; keep(); }
      if (rows && rows[0]) {
        S.code = rows[0].code;
        if (S.pub === text) return keep();
        return api('/rest/v1/bloom_profiles?id=eq.' + S.uid, { method: 'PATCH', body: { public: pub, updated_at: new Date(C.now()).toISOString() } }).then(function () { S.pub = text; keep(); });
      }
      return (function create(tries) {
        var code = newCode();
        return api('/rest/v1/bloom_profiles', { method: 'POST', body: { id: S.uid, username: S.user, code: code, public: pub } })
          .then(function () { S.code = code; S.pub = text; keep(); }, function (e) { if (e.code === 409 && tries > 0) return create(tries - 1); throw e; });
      })(5);
    }).then(null, function (e) {
      if (e.code !== 'nofriends') throw e;
      S.off = true; keep();
    });
  }

  /* ---------- friends ---------- */
  function empty() { return { loaded: false, friends: [], incoming: [], outgoing: [], unread: {}, at: 0 }; }
  var F = empty();
  C.friends = function () { return F; };
  C.unreadTotal = function () { var n = 0; Object.keys(F.unread).forEach(function (k) { n += F.unread[k]; }); return n + F.incoming.length; };

  // Friends (both asked), requests to me, requests I sent, and how many unread messages each friend sent.
  C.loadFriends = function () {
    if (!C.signedIn()) return Promise.resolve(F);
    var me = S.uid;
    return api('/rest/v1/bloom_friends?or=(user_id.eq.' + me + ',friend_id.eq.' + me + ')&select=user_id,friend_id').then(function (rows) {
      var out = {}, inc = {}, ids = {};
      rows.forEach(function (r) { if (r.user_id === me) out[r.friend_id] = 1; else inc[r.user_id] = 1; ids[r.user_id === me ? r.friend_id : r.user_id] = 1; });
      var list = Object.keys(ids);
      return Promise.all([
        list.length ? api('/rest/v1/bloom_profiles?id=in.(' + list.join(',') + ')&select=id,username,public,updated_at') : [],
        api('/rest/v1/bloom_messages?to_id=eq.' + me + '&read_at=is.null&select=id,from_id'),
      ]).then(function (res) {
        var by = {}, before = C.unreadTotal(), unread = {};
        res[0].forEach(function (p) { p.public = p.public || {}; by[p.id] = p; });
        res[1].forEach(function (m) { unread[m.from_id] = (unread[m.from_id] || 0) + 1; });
        var pick = function (a, b) { return list.filter(function (id) { return by[id] && !!out[id] === a && !!inc[id] === b; }).map(function (id) { return by[id]; }); };
        F = { loaded: true, friends: pick(true, true), incoming: pick(false, true), outgoing: pick(true, false), unread: unread, at: C.now() };
        if (S.off) { S.off = false; keep(); }
        changed(C.unreadTotal() > before ? 'news' : 'friends');
        return F;
      });
    }).then(null, function (e) {
      if (e.code === 'nofriends') { S.off = true; keep(); changed('friends'); }
      throw e;
    });
  };
  C.friend = function (id) { return F.friends.filter(function (f) { return f.id === id; })[0] || null; };

  // Asks the player with this code to be friends. If they had already asked, you are friends at once.
  C.addFriend = function (code) {
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return Promise.reject(fail(T('A friend code has 6 letters and digits.'), 'input'));
    if (code === S.code) return Promise.reject(fail(T('That is your own code. Send it to a friend.'), 'input'));
    return api('/rest/v1/rpc/bloom_find', { method: 'POST', body: { friend_code: code } }).then(function (rows) {
      var p = rows && rows[0];
      if (!p) throw fail(T('Nobody has that code. Check it with your friend.'), 'input');
      return C.accept(p.id).then(function () { return { id: p.id, username: p.username, friends: !!C.friend(p.id) }; });
    });
  };
  C.accept = function (id) {
    return api('/rest/v1/bloom_friends', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: { user_id: S.uid, friend_id: id } }).then(C.loadFriends);
  };
  // Declines or cancels a request, or ends a friendship: both rows go.
  C.remove = function (id) {
    return api('/rest/v1/rpc/bloom_unfriend', { method: 'POST', body: { other: id } }).then(C.loadFriends);
  };
  C.report = function (id, messageId, text) {
    return api('/rest/v1/bloom_reports', { method: 'POST', body: { reporter: S.uid, about: id, message_id: messageId || null, body: String(text || '').slice(0, 500) || null } });
  };

  /* ---------- messages ---------- */
  // The last 100 messages between me and a friend, oldest first.
  C.thread = function (id) {
    var me = S.uid;
    return api('/rest/v1/bloom_messages?or=(and(from_id.eq.' + me + ',to_id.eq.' + id + '),and(from_id.eq.' + id + ',to_id.eq.' + me + '))&order=id.desc&limit=100&select=id,from_id,to_id,kind,body,created_at,read_at')
      .then(function (rows) { return rows.reverse(); });
  };
  C.send = function (id, kind, body) {
    body = typeof body === 'string' ? body.trim() : JSON.stringify(body);
    if (!body) return Promise.reject(fail(T('Write something first.'), 'input'));
    if (body.length > C.MAX_MSG) return Promise.reject(fail(T('That message is too long.'), 'input'));
    return api('/rest/v1/bloom_messages', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { from_id: S.uid, to_id: id, kind: kind || 'text', body: body } })
      .then(function (rows) { return rows && rows[0]; });
  };
  C.markRead = function (id) {
    if (!F.unread[id]) return Promise.resolve();
    return api('/rest/v1/bloom_messages?to_id=eq.' + S.uid + '&from_id=eq.' + id + '&read_at=is.null', { method: 'PATCH', body: { read_at: new Date(C.now()).toISOString() } })
      .then(function () { delete F.unread[id]; changed('friends'); });
  };
  C.unsend = function (messageId) { return api('/rest/v1/bloom_messages?id=eq.' + messageId + '&from_id=eq.' + S.uid, { method: 'DELETE' }); };

  /* ---------- keeping up to date ---------- */
  // When the app opens, when it comes back to the screen and once a minute while it is visible.
  C.refresh = function () {
    if (!C.signedIn()) return Promise.resolve();
    return C.sync().then(null, function (e) { if (e.code === 'signedout') throw e; })
      .then(function () { return S.off ? null : C.loadFriends(); })
      .then(null, function () { /* offline or busy: the next visit tries again */ });
  };
  C.start = function () {
    last = '';
    // back on screen: look for news. Leaving the screen: send at once what was still waiting.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) C.refresh();
      else if (waiting) C.sync().then(null, function () { /* the next visit sends it */ });
    });
    setInterval(function () { if (!document.hidden) C.refresh(); }, C.EVERY);
    C.refresh();
  };
})();
