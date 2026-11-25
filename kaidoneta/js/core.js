/* Kaidoneta: the crew's data and everything computed from it (no DOM here, so node can test it).
 *
 * The "book" is what the crew shares: four collections of records (members, events, matches, reactions), each
 * record { id, at: last edit in ms, del: 1 when deleted, ...fields }. Two copies of a book are MERGED record by
 * record (the newest edit wins; a deletion is a record too), so phones that logged at the same time never lose a
 * round. Rankings, bounties, stats and achievements are computed from the matches and never stored.
 */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var C = (K.core = {});

  C.COLLS = ['members', 'events', 'matches', 'reactions'];

  C.COLORS = [
    { id: 'red', name: 'Rojo', hex: '#e5484d' },
    { id: 'green', name: 'Verde', hex: '#2fae68' },
    { id: 'blue', name: 'Azul', hex: '#3e7bfa' },
    { id: 'purple', name: 'Morado', hex: '#9b5cf6' },
    { id: 'black', name: 'Negro', hex: '#2b2733' },
    { id: 'yellow', name: 'Amarillo', hex: '#f5c518' },
  ];
  var COLOR_IDS = C.COLORS.map(function (c) { return c.id; });

  // Suggestions for the opponent's leader (any name can be typed). Colours are picked separately: most characters
  // have leaders in several colours.
  C.LEADERS = [
    'Monkey.D.Luffy', 'Roronoa Zoro', 'Nami', 'Sanji', 'Nico Robin', 'Usopp', 'Franky', 'Jinbe', 'Trafalgar Law',
    'Eustass Kid', 'Shanks', 'Buggy', 'Charlotte Linlin (Big Mom)', 'Charlotte Katakuri', 'Kaido', 'Yamato',
    'Enel', 'Rob Lucci', 'Donquixote Doflamingo', 'Crocodile', 'Gecko Moria', 'Boa Hancock', 'Sabo',
    'Portgas.D.Ace', 'Edward Newgate', 'Marshall.D.Teach', 'Smoker', 'Sakazuki', 'Kuzan', 'Borsalino', 'Issho',
    'Koby', 'Monkey.D.Garp', 'Vegapunk', 'Imu', 'Uta', 'Nefeltari Vivi', 'Rebecca', 'Jewelry Bonney',
    'Bartholomew Kuma', 'Kozuki Oden', "Kin'emon", 'Dracule Mihawk', 'Arlong', 'Kalgara', 'Sengoku', 'Lucy',
  ];

  C.STAGES = ['Top 64', 'Top 32', 'Top 16', 'Top 8', 'Top 4', 'Final'];
  C.REACTIONS = ['🔥', '⚡', '🐉', '💀', '🍶', '😭'];
  C.EMOJIS = ['🐉', '👹', '⚡', '🍶', '🏴‍☠️', '🦁', '🐺', '🦅', '🐍', '🦖', '🐲', '🔥', '🌋', '🎈', '🌉', '⚓', '🗡️', '👑', '🍖', '🐙'];
  C.MEMBER_COLORS = ['#9b5cf6', '#e5484d', '#f5c518', '#2fae68', '#3e7bfa', '#ff7ac6', '#22d3ee', '#fb923c'];

  C.KAIDO = { name: 'Kaido', colors: ['purple'], set: 'OP17' };
  // The regional is created on every phone with the same id, so a crew that syncs never gets two of it.
  C.BRISTOL = { id: 'ev-bristol-2026-11-21', name: 'Regional de Bristol', date: '2026-11-21', city: 'Bristol', rounds: 0, mins: 35 };

  /* ---------- small helpers ---------- */
  C.now = function () { return Date.now(); };
  C.random = function () { return Math.random(); };
  C.newId = function (prefix) {
    var s = '';
    for (var i = 0; i < 10; i++) s += 'abcdefghijkmnpqrstuvwxyz23456789'.charAt(Math.floor(C.random() * 32));
    return (prefix || 'r') + '-' + s;
  };
  function canon(v) { // JSON with sorted keys: two equal records always give the same text
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v);
  }
  C.canon = canon;
  // Cut to size without leaving half an emoji: a lone surrogate makes the online crew's database refuse every sync.
  function str(v, max) {
    if (typeof v !== 'string') return '';
    return v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max)
      .replace(/[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g, function (p) { return p.length === 2 ? p : ''; });
  }
  function int(v, lo, hi, def) { v = Math.round(Number(v)); return isFinite(v) && v >= lo && v <= hi ? v : def; }
  var ID_RE = /^[a-z]{1,4}-[a-z0-9-]{3,40}$/;
  function okId(v) { return typeof v === 'string' && ID_RE.test(v); }
  function colors(v) {
    if (!Array.isArray(v)) return [];
    var out = [];
    v.forEach(function (c) { if (COLOR_IDS.indexOf(c) >= 0 && out.indexOf(c) < 0) out.push(c); });
    return out.slice(0, 3).sort(function (a, b) { return COLOR_IDS.indexOf(a) - COLOR_IDS.indexOf(b); });
  }
  function leader(v) {
    v = v && typeof v === 'object' ? v : {};
    return { name: str(v.name, 40), colors: colors(v.colors), set: str(v.set, 12) };
  }
  C.cleanLeader = leader;

  /* ---------- records ---------- */
  // Every record that comes from outside (a link, the crew's account) goes through here: unknown fields are
  // dropped, text is cut to size and anything malformed is left out.
  var CLEAN = {
    members: function (r) {
      return { name: str(r.name, 24) || 'Pirata', emoji: str(r.emoji, 12) || '🐉', color: /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : '#9b5cf6', leader: leader(r.leader), deck: str(r.deck, 40) };
    },
    events: function (r) {
      return { name: str(r.name, 40) || 'Evento', date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : '2026-01-01', city: str(r.city, 30), rounds: int(r.rounds, 0, 15, 0), mins: int(r.mins, 5, 120, 35) };
    },
    matches: function (r) {
      if (!okId(r.ev) || !okId(r.mem)) return null;
      var res = r.res === 'W' || r.res === 'L' || r.res === 'D' ? r.res : null;
      if (!res) return null;
      return {
        ev: r.ev, mem: r.mem, round: int(r.round, 0, 20, 0), top: C.STAGES.indexOf(r.top) >= 0 ? r.top : '',
        opp: leader(r.opp), oppName: str(r.oppName, 30), oppMem: okId(r.oppMem) && r.oppMem !== r.mem ? r.oppMem : '',
        res: res, first: r.first === true || r.first === false ? r.first : null, bo: r.bo === 3 ? 3 : 1,
        score: /^[0-3]-[0-3]$/.test(r.score) ? r.score : '', mvp: str(r.mvp, 40), notes: str(r.notes, 300),
        myLeader: leader(r.myLeader), by: okId(r.by) ? r.by : '', t: int(r.t, 0, 9e15, 0),
      };
    },
    reactions: function (r) {
      if (!okId(r.match) || !okId(r.mem) || C.REACTIONS.indexOf(r.emoji) < 0) return null;
      return { match: r.match, mem: r.mem, emoji: r.emoji };
    },
  };
  C.SKEW = 2 * 86400000; // how far ahead of this phone's clock another phone's edit may be dated
  function cleanRecord(coll, r) {
    if (!r || typeof r !== 'object' || !okId(r.id)) return null;
    var at = Math.min(int(r.at, 0, 9e15, 0), C.now() + C.SKEW); // a date far in the future would win every merge forever
    if (r.del) {
      var t = { id: r.id, at: at, del: 1 };
      if (coll === 'members' && okId(r.into) && r.into !== r.id) t.into = r.into; // merged into that pirate
      return t;
    }
    var body = CLEAN[coll](r);
    if (!body) return null;
    body.id = r.id; body.at = at;
    return body;
  }
  C.emptyBook = function () { return { members: {}, events: {}, matches: {}, reactions: {} }; };
  C.cleanBook = function (b) {
    var out = C.emptyBook();
    if (!b || typeof b !== 'object') return out;
    C.COLLS.forEach(function (coll) {
      var src = b[coll];
      if (!src || typeof src !== 'object') return;
      Object.keys(src).slice(0, 5000).forEach(function (k) {
        var r = cleanRecord(coll, src[k]);
        if (r && r.id === k) out[coll][k] = r;
      });
    });
    return out;
  };

  // The newer edit wins; on the same millisecond, the larger text (so every phone picks the same one).
  function pick(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.at !== b.at) return a.at > b.at ? a : b;
    return canon(a) >= canon(b) ? a : b;
  }
  C.merge = function (a, b) {
    a = a || C.emptyBook(); b = b || C.emptyBook();
    var out = C.emptyBook();
    C.COLLS.forEach(function (coll) {
      var x = a[coll] || {}, y = b[coll] || {};
      Object.keys(x).concat(Object.keys(y)).forEach(function (k) { out[coll][k] = pick(x[k], y[k]); });
    });
    return out;
  };
  C.same = function (a, b) { return canon(a) === canon(b); };

  // Writing to a book: put() adds or replaces a record (stamping the time), remove() leaves a tombstone.
  C.put = function (book, coll, rec) {
    var r = {};
    Object.keys(rec).forEach(function (k) { r[k] = rec[k]; });
    var old = book[coll][r.id];
    r.at = Math.max(C.now(), old ? old.at + 1 : 0);
    var clean = cleanRecord(coll, r);
    if (!clean) throw new Error('Datos no válidos: ' + ({ members: 'pirata', events: 'evento', matches: 'ronda', reactions: 'reacción' }[coll] || coll) + '.');
    book[coll][clean.id] = clean;
    return clean;
  };
  C.remove = function (book, coll, id) {
    var old = book[coll][id];
    book[coll][id] = { id: id, at: Math.max(C.now(), old ? old.at + 1 : 0), del: 1 };
  };
  C.live = function (book, coll) {
    var m = book[coll] || {};
    return Object.keys(m).map(function (k) { return m[k]; }).filter(function (r) { return !r.del; });
  };
  C.get = function (book, coll, id) { var r = book[coll] && book[coll][id]; return r && !r.del ? r : null; };
  C.count = function (book) {
    var n = {};
    C.COLLS.forEach(function (c) { n[c] = C.live(book, c).length; });
    return n;
  };

  C.members = function (book) {
    return C.live(book, 'members').sort(function (a, b) { return a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1); });
  };
  C.events = function (book) {
    return C.live(book, 'events').sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.name.localeCompare(b.name); });
  };
  C.ensureBristol = function (book) {
    var old = book.events[C.BRISTOL.id];
    // An untouched default from before the app spoke Spanish gets the new name (still the oldest possible edit, so
    // every phone ends up with the same record and any real edit still wins).
    if (!old || old.del || (old.at === 1 && old.name === 'Bristol Regional')) {
      var e = {}; Object.keys(C.BRISTOL).forEach(function (k) { e[k] = C.BRISTOL[k]; });
      e.at = old && old.del ? old.at + 1 : 1; // the oldest possible edit, so any real change wins; after a deletion, just newer than it
      book.events[e.id] = cleanRecord('events', e);
    }
    return book;
  };

  // Folds one profile into another (the same friend added on two phones): their matches, the other side of their
  // friendly-fire matches and their reactions move over, then the duplicate is deleted.
  C.mergeMembers = function (book, keepId, dropId) {
    if (keepId === dropId) return;
    C.live(book, 'matches').forEach(function (m) {
      var change = false, r = JSON.parse(JSON.stringify(m));
      if (r.mem === dropId) { r.mem = keepId; change = true; }
      if (r.oppMem === dropId) { r.oppMem = keepId; change = true; }
      if (r.by === dropId) { r.by = keepId; change = true; }
      if (r.mem === r.oppMem) r.oppMem = '';
      if (change) C.put(book, 'matches', r);
    });
    C.live(book, 'reactions').forEach(function (x) {
      if (x.mem !== dropId) return;
      C.remove(book, 'reactions', x.id);
      var id = C.reactionId(x.match, keepId);
      if (!C.get(book, 'reactions', id)) C.put(book, 'reactions', { id: id, match: x.match, mem: keepId, emoji: x.emoji });
    });
    // the tombstone remembers who it became, so a round another phone logs later under the old profile is moved too
    var old = book.members[dropId];
    book.members[dropId] = { id: dropId, at: Math.max(C.now(), old ? old.at + 1 : 0), del: 1, into: keepId };
  };
  // The live pirate an id stands for now: itself, or the one it was merged into ('' if gone).
  C.aliasOf = function (book, id) {
    for (var i = 0; i < 6 && id; i++) {
      var r = book.members[id];
      if (!r) return '';
      if (!r.del) return id;
      id = r.into || '';
    }
    return '';
  };
  // Moves rounds and reactions that still name a merged-away pirate (logged on a phone that had not heard of the
  // merge yet) to the pirate it became. Returns true if anything changed.
  C.fixAliases = function (book) {
    var moved = false, merged = {};
    Object.keys(book.members).forEach(function (k) { var r = book.members[k]; if (r.del && r.into) merged[k] = 1; });
    if (!Object.keys(merged).length) return false;
    C.live(book, 'matches').forEach(function (m) {
      if (!merged[m.mem] && !merged[m.oppMem] && !merged[m.by]) return;
      var r = JSON.parse(JSON.stringify(m));
      if (merged[r.mem]) r.mem = C.aliasOf(book, r.mem) || r.mem;
      if (merged[r.oppMem]) r.oppMem = C.aliasOf(book, r.oppMem);
      if (merged[r.by]) r.by = C.aliasOf(book, r.by);
      if (r.mem === r.oppMem) r.oppMem = '';
      if (merged[r.mem]) return; // nowhere to go
      C.put(book, 'matches', r); moved = true;
    });
    C.live(book, 'reactions').forEach(function (x) {
      if (!merged[x.mem]) return;
      var to = C.aliasOf(book, x.mem);
      C.remove(book, 'reactions', x.id); moved = true;
      if (!to) return;
      var id = C.reactionId(x.match, to);
      if (!C.get(book, 'reactions', id)) C.put(book, 'reactions', { id: id, match: x.match, mem: to, emoji: x.emoji });
    });
    return moved;
  };

  C.reactionId = function (matchId, memId) { return 'x-' + matchId.replace(/^[a-z]+-/, '') + '-' + memId.replace(/^[a-z]+-/, ''); };
  C.react = function (book, matchId, memId, emoji) {
    var id = C.reactionId(matchId, memId), old = C.get(book, 'reactions', id);
    if (old && old.emoji === emoji) C.remove(book, 'reactions', id); // the same emoji again takes it back
    else C.put(book, 'reactions', { id: id, match: matchId, mem: memId, emoji: emoji });
  };
  C.reactionsFor = function (book, matchId) {
    var by = {};
    C.live(book, 'reactions').forEach(function (x) { if (x.match === matchId) (by[x.emoji] = by[x.emoji] || []).push(x.mem); });
    return by;
  };

  /* ---------- games: every match seen from one pirate ---------- */
  function flip(res) { return res === 'W' ? 'L' : res === 'L' ? 'W' : 'D'; }
  function slot(m) { return m.top ? 'T' + m.top : 'R' + m.round; }
  C.slot = slot;
  function valid(book, m) {
    var ev = C.get(book, 'events', m.ev);
    return !!(ev && C.get(book, 'members', m.mem));
  }
  // Order inside an event: Swiss rounds, then the top cut, then the time they were logged.
  function order(book) {
    return function (a, b) {
      var ea = C.get(book, 'events', a.m.ev), eb = C.get(book, 'events', b.m.ev);
      if (ea.date !== eb.date) return ea.date < eb.date ? -1 : 1;
      if (a.m.ev !== b.m.ev) return a.m.ev < b.m.ev ? -1 : 1;
      var pa = a.m.top ? 100 + C.STAGES.indexOf(a.m.top) : a.m.round || 50;
      var pb = b.m.top ? 100 + C.STAGES.indexOf(b.m.top) : b.m.round || 50;
      if (pa !== pb) return pa - pb;
      return (a.m.t || a.m.at) - (b.m.t || b.m.at);
    };
  }
  // The games of one pirate, oldest first, in one event (evId) or all of them (evId null). A friendly-fire match
  // logged by a crewmate shows up here with the result, the turn order and the leaders the other way round,
  // unless this pirate logged the same round against them too (then their own entry counts, once).
  C.games = function (book, memId, evId) {
    var all = C.live(book, 'matches').filter(function (m) { return valid(book, m) && (!evId || m.ev === evId); });
    // one entry per pirate per round: if two phones logged the same round (bad signal), the first one logged counts
    all.sort(function (a, b) { return (a.t || a.at) - (b.t || b.at) || (a.id < b.id ? -1 : 1); });
    var taken = {}, out = [];
    all.forEach(function (m) {
      if (m.mem !== memId) return;
      var k = m.ev + '|' + slot(m);
      if (taken[k]) return;
      taken[k] = 1;
      out.push({ m: m, res: m.res, first: m.first, opp: m.opp, oppMem: m.oppMem && C.get(book, 'members', m.oppMem) ? m.oppMem : '', mirror: false });
    });
    // a crewmate's friendly-fire round counts the other way round, unless this pirate has that round already
    all.forEach(function (m) {
      if (m.oppMem !== memId || m.mem === memId) return;
      var k = m.ev + '|' + slot(m);
      if (taken[k]) return;
      taken[k] = 1;
      out.push({ m: m, res: flip(m.res), first: m.first === null ? null : !m.first, opp: m.myLeader, oppMem: m.mem, mirror: true });
    });
    return out.sort(order(book));
  };

  C.nextRound = function (book, memId, evId) {
    var max = 0;
    C.games(book, memId, evId).forEach(function (g) { if (!g.m.top && g.m.round > max) max = g.m.round; });
    return max + 1;
  };
  // A crewmate already logged this round against this pirate (so it must not be logged twice).
  C.loggedBy = function (book, evId, round, top, memId, oppMemId) {
    var key = top ? 'T' + top : 'R' + round;
    return C.live(book, 'matches').filter(function (m) {
      return m.ev === evId && slot(m) === key && ((m.mem === oppMemId && m.oppMem === memId) || (m.mem === memId && m.oppMem === oppMemId));
    })[0] || null;
  };
  // What already fills this round for this pirate (their own entry or a crewmate's friendly-fire entry naming them),
  // apart from the match being edited. slotKey is C.slot()'s 'R3' or 'TTop 8'.
  C.slotTaken = function (book, memId, evId, slotKey, exceptId) {
    return C.live(book, 'matches').filter(function (m) {
      return m.id !== exceptId && m.ev === evId && slot(m) === slotKey && (m.mem === memId || m.oppMem === memId) && valid(book, m);
    })[0] || null;
  };

  /* ---------- records, streaks, bounty ---------- */
  C.record = function (games) {
    var r = { w: 0, l: 0, d: 0, n: games.length, pts: 0, rate: 0, first: { w: 0, l: 0, d: 0 }, second: { w: 0, l: 0, d: 0 } };
    games.forEach(function (g) {
      var k = g.res === 'W' ? 'w' : g.res === 'L' ? 'l' : 'd';
      r[k]++;
      if (g.first === true) r.first[k]++;
      if (g.first === false) r.second[k]++;
    });
    r.pts = r.w * 3 + r.d;
    r.rate = r.n ? r.w / r.n : 0;
    return r;
  };
  C.streaks = function (games) {
    var cur = '', len = 0, bestW = 0, bestL = 0;
    games.forEach(function (g) {
      if (g.res === cur) len++; else { cur = g.res; len = 1; }
      if (cur === 'W') bestW = Math.max(bestW, len);
      if (cur === 'L') bestL = Math.max(bestL, len);
    });
    return { cur: cur, len: len, bestW: bestW, bestL: bestL };
  };

  var M = 1000000;
  C.BOUNTY = { base: 1 * M, win: 80 * M, second: 20 * M, streak: 20 * M, top: 100 * M, crew: 50 * M, draw: 20 * M };
  // A bounty only grows: every win pays, more going second, on a streak, in the top cut or against a crewmate.
  C.bounty = function (games) {
    var B = C.BOUNTY, b = B.base, streak = 0;
    games.forEach(function (g) {
      if (g.res === 'W') {
        streak++;
        b += B.win + (g.first === false ? B.second : 0) + (streak - 1) * B.streak + (g.m.top ? B.top : 0) + (g.oppMem ? B.crew : 0);
      } else {
        streak = 0;
        if (g.res === 'D') b += B.draw;
      }
    });
    return b;
  };
  C.gain = function (games, i) { return C.bounty(games.slice(0, i + 1)) - C.bounty(games.slice(0, i)); };

  // The Beasts Pirates, from the bottom up.
  C.RANKS = [
    { id: 'waiter', name: 'Waiter', icon: '🍶', min: 0 },
    { id: 'pleasure', name: 'Pleasure', icon: '😆', min: 60 * M },
    { id: 'gifter', name: 'Gifter', icon: '🦁', min: 140 * M },
    { id: 'headliner', name: 'Headliner', icon: '🎭', min: 240 * M },
    { id: 'tobiroppo', name: 'Tobiroppo', icon: '🦅', min: 380 * M },
    { id: 'allstar', name: 'All-Star', icon: '⭐', min: 560 * M },
    { id: 'emperor', name: 'Emperador', icon: '🐉', min: 800 * M },
  ];
  C.rankOf = function (bounty) {
    var r = C.RANKS[0];
    C.RANKS.forEach(function (x) { if (bounty >= x.min) r = x; });
    var i = C.RANKS.indexOf(r), next = C.RANKS[i + 1] || null;
    return { rank: r, next: next, progress: next ? (bounty - r.min) / (next.min - r.min) : 1 };
  };
  C.KAIDO_BOUNTY = 4611100000;
  C.berries = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }; // Spain: 4.611.100.000

  /* ---------- the Bounty Board ---------- */
  function standings(book, evId, filter) {
    var rows = C.members(book).map(function (mem) {
      var games = C.games(book, mem.id, evId).filter(filter || function () { return true; });
      var rec = C.record(games);
      return { mem: mem, games: games, rec: rec, bounty: C.bounty(games), streak: C.streaks(games) };
    });
    rows.sort(function (a, b) {
      return b.rec.pts - a.rec.pts || b.rec.rate - a.rec.rate || b.bounty - a.bounty || a.rec.l - b.rec.l || a.mem.name.localeCompare(b.mem.name);
    });
    rows.forEach(function (r, i) { r.pos = i + 1; });
    return rows;
  };
  // Ranked by points (win 3, draw 1), then win rate, then bounty. move: places gained since the last round (in an
  // event: the table before the latest round anyone logged).
  C.board = function (book, evId) {
    var rows = standings(book, evId);
    if (evId) {
      var last = 0;
      rows.forEach(function (r) { r.games.forEach(function (g) { if (!g.m.top && g.m.round > last) last = g.m.round; if (g.m.top) last = Math.max(last, 100 + C.STAGES.indexOf(g.m.top)); }); });
      if (last > 1) {
        var before = standings(book, evId, function (g) { return (g.m.top ? 100 + C.STAGES.indexOf(g.m.top) : g.m.round) < last; }), at = {};
        before.forEach(function (r) { at[r.mem.id] = r.rec.n ? r.pos : null; });
        rows.forEach(function (r) { r.move = at[r.mem.id] ? at[r.mem.id] - r.pos : 0; });
      }
    }
    rows.forEach(function (r) { if (r.move === undefined) r.move = 0; });
    return rows;
  };

  /* ---------- matchups and the meta ---------- */
  C.leaderKey = function (l) { return (l && l.name ? l.name.toLowerCase().replace(/\s+/g, ' ') : '?') + '|' + ((l && l.colors) || []).join('/'); };
  C.matchups = function (games) {
    var by = {};
    games.forEach(function (g) {
      var k = C.leaderKey(g.opp), x = by[k] || (by[k] = { leader: g.opp, w: 0, l: 0, d: 0, n: 0 });
      x.n++; x[g.res === 'W' ? 'w' : g.res === 'L' ? 'l' : 'd']++;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.n - a.n || b.w - a.w || (a.leader.name || '').localeCompare(b.leader.name || ''); });
  };
  C.nemesis = function (games) {
    var list = C.matchups(games).filter(function (x) { return x.l > 0; });
    list.sort(function (a, b) { return b.l - a.l || a.w - b.w; });
    return list[0] || null;
  };
  C.prey = function (games) {
    var list = C.matchups(games).filter(function (x) { return x.w > 0; });
    list.sort(function (a, b) { return b.w - a.w || a.l - b.l; });
    return list[0] || null;
  };
  // What the crew met: every logged match against someone outside the crew, by leader and by colour.
  C.meta = function (book, evId) {
    var games = [];
    C.live(book, 'matches').forEach(function (m) {
      if (!valid(book, m) || (evId && m.ev !== evId) || m.oppMem) return;
      games.push({ m: m, res: m.res, first: m.first, opp: m.opp, oppMem: '', mirror: false });
    });
    var colorsSeen = {};
    C.COLORS.forEach(function (c) { colorsSeen[c.id] = { color: c, n: 0, w: 0, l: 0, d: 0 }; });
    games.forEach(function (g) {
      (g.opp.colors || []).forEach(function (c) {
        var x = colorsSeen[c]; x.n++; x[g.res === 'W' ? 'w' : g.res === 'L' ? 'l' : 'd']++;
      });
    });
    return { n: games.length, rec: C.record(games), leaders: C.matchups(games), colors: C.COLORS.map(function (c) { return colorsSeen[c.id]; }) };
  };

  /* ---------- achievements ---------- */
  function byEvent(games) {
    var out = {};
    games.forEach(function (g) { (out[g.m.ev] = out[g.m.ev] || []).push(g); });
    return Object.keys(out).map(function (k) { return out[k]; });
  }
  function wins(gs) { return gs.filter(function (g) { return g.res === 'W'; }); }
  function named(g, re) { return re.test((g.opp && g.opp.name) || ''); }
  C.BADGES = [
    { id: 'debut', icon: '🚐', name: 'Todos a bordo', desc: 'Registra tu primera ronda en Kaidoneta', test: function (gs) { return gs.length > 0; } },
    { id: 'thunder', icon: '⚡', name: 'Raimei Hakke', desc: 'Gana 3 rondas seguidas', test: function (gs) { return C.streaks(gs).bestW >= 3; } },
    { id: 'boro', icon: '🔥', name: 'Boro Breath', desc: 'Gana yendo segundo', test: function (gs) { return wins(gs).some(function (g) { return g.first === false; }); } },
    { id: 'iron', icon: '🛡️', name: 'Cuerpo de hierro', desc: 'Gana 3 rondas yendo primero', test: function (gs) { return wins(gs).filter(function (g) { return g.first === true; }).length >= 3; } },
    { id: 'gertlush', icon: '🍺', name: 'Bristol en llamas', desc: 'Gana 4 rondas en un evento', test: function (gs) { return byEvent(gs).some(function (e) { return wins(e).length >= 4; }); } },
    { id: 'raid', icon: '🏯', name: 'Asalto a Onigashima', desc: 'Gana 5 rondas en un evento', test: function (gs) { return byEvent(gs).some(function (e) { return wins(e).length >= 5; }); } },
    { id: 'emperor', icon: '👑', name: 'Emperador del mar', desc: 'Pasa 4+ rondas suizas de un evento sin perder', test: function (gs) {
      // the first four Swiss rounds of an event without a loss: once earned, a later loss does not take it away
      return byEvent(gs).some(function (e) {
        var sw = e.filter(function (g) { return !g.m.top; });
        return sw.length >= 4 && sw.slice(0, 4).every(function (g) { return g.res !== 'L'; });
      });
    } },
    { id: 'clifton', icon: '🌉', name: 'Escalada en Clifton', desc: 'Juega el top cut', test: function (gs) { return gs.some(function (g) { return !!g.m.top; }); } },
    { id: 'comeback', icon: '🎈', name: 'Remontada en globo', desc: 'Pierde la primera ronda de un evento y gana las 3 siguientes', test: function (gs) {
      return byEvent(gs).some(function (e) { return e.length >= 4 && e[0].res === 'L' && e[1].res === 'W' && e[2].res === 'W' && e[3].res === 'W'; });
    } },
    { id: 'rainbow', icon: '🌈', name: 'Arcoíris', desc: 'Gana a líderes de los seis colores', test: function (gs) {
      var seen = {};
      wins(gs).forEach(function (g) { (g.opp.colors || []).forEach(function (c) { seen[c] = 1; }); });
      return COLOR_IDS.every(function (c) { return seen[c]; });
    } },
    { id: 'mirror', icon: '🐉', name: 'Dragón contra dragón', desc: 'Gana a un líder Kaido', test: function (gs) { return wins(gs).some(function (g) { return named(g, /kaid/i); }); } },
    { id: 'rocks', icon: '🍰', name: 'Reunión de los Rocks', desc: 'Gana a un líder Big Mom (Charlotte Linlin)', test: function (gs) { return wins(gs).some(function (g) { return named(g, /linlin|big ?mom/i); }); } },
    { id: 'friendly', icon: '🗡️', name: 'Fuego amigo', desc: 'Gana a un compañero de la tripulación', test: function (gs) { return wins(gs).some(function (g) { return !!g.oppMem; }); } },
    { id: 'even', icon: '🤝', name: 'Tablas', desc: 'Empata una ronda (se acabó el tiempo)', test: function (gs) { return gs.some(function (g) { return g.res === 'D'; }); } },
    { id: 'gear5', icon: '🥁', name: 'Trauma del Gear 5', desc: 'Pierde contra un líder Luffy (a Kaido también le pasó)', shame: true, test: function (gs) { return gs.some(function (g) { return g.res === 'L' && named(g, /luffy/i); }); } },
    { id: 'hangover', icon: '🍻', name: 'Resaca en el puerto', desc: 'Pierde 3 rondas seguidas', shame: true, test: function (gs) { return C.streaks(gs).bestL >= 3; } },
  ];
  C.badges = function (games) {
    return C.BADGES.map(function (b) { return { badge: b, got: !!b.test(games) }; });
  };

  /* ---------- link sharing ---------- */
  // The book in a URL-safe string. Compressed when the browser can (CompressionStream), plain otherwise.
  function b64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64url(t) {
    t = t.replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    var s = atob(t), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function pipe(bytes, stream) {
    var res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return res.arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  C.pack = function (book) {
    var text = JSON.stringify({ app: 'kaidoneta', v: 1, book: book });
    var bytes = new TextEncoder().encode(text);
    if (typeof CompressionStream === 'undefined') return Promise.resolve('j' + b64url(bytes));
    return pipe(bytes, new CompressionStream('deflate-raw')).then(function (z) { return 'z' + b64url(z); });
  };
  function linkError(msg) { var e = new Error(msg); e.code = 'link'; return e; }
  var NOT_A_LINK = 'Eso no es un enlace de Kaidoneta.';
  C.unpack = function (code) {
    return Promise.resolve().then(function () {
      code = String(code || '').trim();
      var m = code.match(/[#&?]crew=([A-Za-z0-9_-]+)/);
      if (m) code = m[1];
      var kind = code.charAt(0), bytes = unb64url(code.slice(1));
      if (kind === 'z') {
        if (typeof DecompressionStream === 'undefined') throw linkError('Este navegador no puede abrir enlaces comprimidos. Prueba con Chrome o Safari actualizados.');
        return pipe(bytes, new DecompressionStream('deflate-raw'));
      }
      if (kind === 'j') return bytes;
      throw linkError(NOT_A_LINK);
    }).then(function (bytes) {
      var data = JSON.parse(new TextDecoder().decode(bytes));
      if (!data || data.app !== 'kaidoneta') throw linkError(NOT_A_LINK);
      return C.cleanBook(data.book);
    }).then(null, function (e) {
      // the browser's own errors (bad base64, broken JSON...) come in English: say it in Spanish
      if (e && e.code === 'link') throw e;
      throw linkError('Ese enlace está roto o incompleto. Pide que te lo vuelvan a mandar.');
    });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
