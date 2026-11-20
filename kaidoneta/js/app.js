/* Kaidoneta app: state, saving, the header and tabs, and the HQ, Bounty Board and Meta pages.
 * The log sheet is in log.js, the pirate sheet in player.js, the day's tools in tools.js and the crew page in crew.js.
 */
(function (root) {
  'use strict';
  var K = root.K, C = K.core, A = K.art, X = K.fx, cloud = K.cloud;
  var U = (K.ui = {});
  var doc = root.document;

  /* ---------- saving ---------- */
  var BOOK_KEY = 'kaidoneta.book', LOCAL_KEY = 'kaidoneta.local', OLD_HERO_KEY = 'kaidoneta.hero';
  function read(k) { try { return JSON.parse(root.localStorage.getItem(k)); } catch (e) { return null; } }
  function write(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  U.book = C.ensureBristol(C.cleanBook(read(BOOK_KEY)));
  U.local = Object.assign({ me: '', ev: C.BRISTOL.id, sound: true, buzz: true, scope: 'event', kit: {}, timer: { mins: 0, end: 0, left: 0 }, welcomed: false }, read(LOCAL_KEY) || {});
  // After every change to the crew's data: keep it, sync it, show it.
  U.save = function () {
    if (!write(BOOK_KEY, U.book)) X.toast('Este móvil no ha podido guardar. Libera espacio o sal del modo incógnito.', 'bad');
    cloud.touch();
    U.render();
  };
  U.saveLocal = function () { write(LOCAL_KEY, U.local); };
  // A pirate merged into another (here or on another phone): this phone's "me" follows it...
  U.fixMe = function () {
    if (!U.local.me || U.member(U.local.me) || !C.aliasOf) return;
    var to = C.aliasOf(U.book, U.local.me);
    if (to && to !== U.local.me) { U.local.me = to; U.saveLocal(); }
  };
  // ...and so do rounds and reactions that still name the old profile. True if the book changed.
  function heal() {
    var changed = !!(C.fixAliases && C.fixAliases(U.book));
    U.fixMe();
    return changed;
  }
  /* ---------- helpers ---------- */
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  U.$ = $;
  U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var esc = U.esc;
  U.ev = function () {
    return C.get(U.book, 'events', U.local.ev) || C.events(U.book)[0] || C.get(C.ensureBristol(U.book), 'events', C.BRISTOL.id);
  };
  U.me = function () { return C.get(U.book, 'members', U.local.me); };
  U.member = function (id) { return C.get(U.book, 'members', id); };
  U.color = function (id) { for (var i = 0; i < C.COLORS.length; i++) if (C.COLORS[i].id === id) return C.COLORS[i]; return null; };
  U.av = function (m, cls) {
    if (!m) return '<span class="av ' + (cls || '') + '" style="--c:#4b3a6e">?</span>';
    return '<span class="av ' + (cls || '') + '" style="--c:' + esc(m.color) + '"><span aria-hidden="true">' + esc(m.emoji) + '</span>' + A.horns() + '</span>';
  };
  U.dots = function (colors) {
    return '<span class="dots">' + (colors || []).map(function (c) { var x = U.color(c); return x ? '<i class="cdot" style="background:' + x.hex + '" title="' + x.name + '"></i>' : ''; }).join('') + '</span>';
  };
  U.lchip = function (l) {
    l = l || {};
    return '<span class="lchip">' + U.dots(l.colors) + '<span class="ellip">' + esc(l.name || 'Líder desconocido') + '</span>' + (l.set ? '<span class="set">' + esc(l.set) + '</span>' : '') + '</span>';
  };
  U.leaderText = function (l) {
    l = l || {};
    var cols = (l.colors || []).map(function (c) { var x = U.color(c); return x ? x.name : ''; }).join('/');
    return (l.name || 'Desconocido') + (cols ? ' (' + cols + ')' : '');
  };
  U.roundLabel = function (m) { return m.top ? m.top : m.round ? 'R' + m.round : '—'; };
  U.ago = function (t) {
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'ahora mismo';
    if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
    return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };
  U.dateLabel = function (d) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; }
  };
  U.today = function () { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); };
  U.daysTo = function (d) { return Math.round((new Date(d + 'T12:00:00') - new Date(U.today() + 'T12:00:00')) / 86400000); };
  U.berries = function (n) { return C.berries(n); };
  U.short = function (n) { return n >= 1e9 ? (n / 1e9).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + ' mil M' : n >= 1e6 ? Math.round(n / 1e6) + 'M' : C.berries(n); };
  U.pct = function (x) { return Math.round(x * 100) + '%'; };
  U.recText = function (r) { return r.w + '-' + r.l + (r.d ? '-' + r.d : ''); };
  // The letter shown for a result (the stored value stays W/L/D): V(ictoria), D(errota), E(mpate).
  U.resLetter = function (res) { return { W: 'V', L: 'D', D: 'E' }[res] || res; };
  U.move = function (n) { return n > 0 ? '<span class="move up">▲' + n + '</span>' : n < 0 ? '<span class="move down">▼' + (-n) + '</span>' : ''; };

  /* ---------- sheets (bottom panels); the phone's back button closes them ---------- */
  var stack = [];
  U.sheet = function (html, opts) {
    opts = opts || {};
    var wrap = doc.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet-back" data-act="close"></div><div class="sheet' + (opts.tall ? ' tall' : '') + '" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>';
    $('#sheets').appendChild(wrap);
    stack.push({ wrap: wrap, onClose: opts.onClose });
    try { root.history.pushState({ sheet: stack.length }, ''); } catch (e) { /* file:// */ }
    doc.body.style.overflow = 'hidden';
    var sh = wrap.querySelector('.sheet');
    A.mountDragon && A.mountDragon(sh);
    return sh;
  };
  U.swap = function (html) { // new content in the open sheet, same history entry
    var top = stack[stack.length - 1];
    if (!top) return U.sheet(html);
    var sh = top.wrap.querySelector('.sheet');
    sh.innerHTML = '<div class="grab"></div>' + html;
    sh.scrollTop = 0;
    return sh;
  };
  function drop() {
    var top = stack.pop();
    if (!top) return;
    top.wrap.remove();
    if (!stack.length) doc.body.style.overflow = '';
    if (top.onClose) top.onClose();
  }
  // Closing from the app drops the sheet at once and walks history back once for all the sheets closed in the
  // same moment; the popstate that follows is ours and is skipped. The phone's back button closes one sheet.
  var owed = 0, skip = 0;
  U.close = function () {
    if (!stack.length) return;
    drop();
    if (!root.history.state || !root.history.state.sheet) return;
    if (++owed === 1) setTimeout(function () { var n = owed; owed = 0; skip++; root.history.go(-n); }, 0);
  };
  U.topSheet = function () { var t = stack[stack.length - 1]; return t ? t.wrap.querySelector('.sheet') : null; };
  root.addEventListener('popstate', function () { if (skip) { skip--; return; } drop(); });
  U.head = function (title, extra) {
    return '<div class="sheet-head"><h3>' + title + '</h3>' + (extra || '') + '<button class="x" data-act="close" aria-label="Cerrar">✕</button></div>';
  };
  U.confirm = function (title, text, yes, fn, danger) {
    var sh = U.sheet(U.head(esc(title)) + '<p class="muted">' + text + '</p><div class="row" style="margin-top:16px"><button class="btn grow" data-act="close">Cancelar</button><button class="btn grow ' + (danger ? 'danger' : 'primary') + '" data-ok>' + esc(yes) + '</button></div>');
    sh.querySelector('[data-ok]').onclick = function () { U.close(); fn(); };
  };

  /* ---------- clicks: data-act="name" calls U.acts[name](element, event) ---------- */
  U.acts = {};
  doc.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = U.acts[el.getAttribute('data-act')];
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
  });
  U.acts.close = function () { U.close(); };
  U.acts.tab = function (el) { U.go(el.getAttribute('data-tab')); };
  U.acts.log = function (el) { U.logSheet(el.getAttribute('data-id') || null, el.getAttribute('data-mem') || null); };
  U.acts.player = function (el) { U.playerSheet(el.getAttribute('data-id')); };
  U.acts.scope = function (el) { U.local.scope = el.getAttribute('data-scope'); U.saveLocal(); U.render(); };
  U.acts.react = function (el) {
    var me = U.me();
    if (!me) { U.whoSheet(); return; }
    C.react(U.book, el.getAttribute('data-id'), me.id, el.getAttribute('data-emoji'));
    X.buzz(15);
    U.save();
    var again = doc.querySelector('[data-act="react"][data-id="' + el.getAttribute('data-id') + '"][data-emoji="' + el.getAttribute('data-emoji') + '"]');
    if (again) again.classList.add('pop');
  };
  U.acts.events = function () { U.eventsSheet(); };
  U.acts.who = function () { U.whoSheet(); };

  /* ---------- tabs ---------- */
  var TABS = [
    { id: 'home', icon: '🏯', label: 'Cuartel' },
    { id: 'board', icon: '💰', label: 'Tablón de recompensas' },
    { id: 'log', label: 'Registrar ronda' },
    { id: 'meta', icon: '📊', label: 'El meta' },
    { id: 'crew', icon: '🏴‍☠️', label: 'Tripulación' },
  ];
  U.tab = (function () { var h = (root.location.hash.match(/^#\/(\w+)/) || [])[1]; return ['home', 'board', 'meta', 'crew'].indexOf(h) >= 0 ? h : 'home'; })();
  U.go = function (tab) {
    if (tab === 'log') { U.logSheet(); return; }
    U.tab = tab;
    try { root.history.replaceState(root.history.state, '', '#/' + tab); } catch (e) { /* file:// */ }
    U.render();
    root.scrollTo(0, 0);
  };
  function tabs() {
    return TABS.map(function (t) {
      if (t.id === 'log') {
        return '<button class="tab tab-log" data-act="tab" data-tab="log" aria-label="Registrar ronda"><span class="fab">' + A.bolt() + '</span></button>';
      }
      return '<button class="tab' + (U.tab === t.id ? ' on' : '') + '" data-act="tab" data-tab="' + t.id + '" aria-label="' + t.label + '"' + (U.tab === t.id ? ' aria-current="page"' : '') + '><span class="t-ico" aria-hidden="true">' + t.icon + '</span></button>';
    }).join('');
  }

  /* ---------- header ---------- */
  U.timerLeft = function () {
    var t = U.local.timer;
    if (t.end) return t.end - Date.now();
    if (t.left) return t.left;
    return null;
  };
  U.fmtTime = function (ms) {
    var neg = ms < 0, s = Math.ceil(Math.abs(ms) / 1000);
    if (neg) s = Math.floor(Math.abs(ms) / 1000);
    return (neg ? '-' : '') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  function header() {
    var t = U.timerLeft(), running = !!U.local.timer.end;
    var timer = t !== null ? '<button class="chip-btn timer-pill' + (t < 5 * 60000 ? ' warn' : '') + '" data-act="timer" id="timer-pill">⏱ <span>' + U.fmtTime(t) + '</span>' + (running ? '' : ' ⏸') + '</button>' : '';
    var st = cloud.signedIn() ? (cloud.lastError() ? 'err' : 'ok') : '';
    var sync = cloud.signedIn()
      ? '<button class="chip-btn" data-act="tab" data-tab="crew" aria-label="Sincronización de la tripulación"><span class="sync-dot ' + st + '" id="sync-dot"></span>' + esc(cloud.crew()) + '</button>'
      : '<button class="chip-btn" data-act="tab" data-tab="crew" aria-label="Sin sincronizar: solo en este móvil"><span class="sync-dot"></span>Solo</button>';
    return '<div class="brand">' + '<img class="crest" src="icons/badge.jpg" alt="" aria-hidden="true">' + '<b>Kaidoneta</b></div>' + timer + sync;
  }
  U.updateHeader = function () { var h = $('#top'); if (h && !h.hidden) { h.innerHTML = header(); h.classList.toggle('timing', U.timerLeft() !== null && root.innerWidth < 420); } };

  /* ---------- HQ ---------- */
  // Kaido: one of the rendered styles (js/kaido-*.js), chosen in Crew → Kaido style; 'dragon' shows the dragon instead.
  U.KAIDO_ORDER = ['bust', 'backlit', 'ukiyoe']; // the first that exists is the default: the crew chose the close-up
  U.kaidoId = function () {
    var v = A.kaidoVariants || {}, id = U.local.kaido;
    if (id === 'dragon') return '';
    if (v[id]) return id;
    for (var i = 0; i < U.KAIDO_ORDER.length; i++) if (v[U.KAIDO_ORDER[i]]) return U.KAIDO_ORDER[i];
    return '';
  };
  U.kaidoArt = function (opts) { var id = U.kaidoId(); return id ? A.kaidoVariants[id].svg(opts || {}) : ''; };
  U.dragonArt = function (cls) { return A.dragon(cls); };
  function heroBolts() {
    return '<svg class="hero-bolts" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="hb1" d="' + A.boltPath(30, 0, 70, 170, 11, 18) + '"/><path class="hb2" d="' + A.boltPath(380, 20, 330, 210, 5, 16) + '"/><path class="hb3" d="' + A.boltPath(200, 0, 250, 90, 21, 10) + '"/></svg>';
  }
  function heroArt() {
    var k = U.kaidoArt({ cls: 'hero-k' });
    if (k) return '<div class="hero-kaido k-' + U.kaidoId() + '">' + k + '</div>';
    return '<div class="hero-dragon">' + U.dragonArt('hero-d') + '</div>' + heroBolts();
  }
  function countdown(ev) {
    var d = U.daysTo(ev.date);
    if (d > 1) return '⏳ Faltan ' + d + ' días';
    if (d === 1) return '🔥 ¡Mañana!';
    if (d === 0) return '⚔️ ¡Hoy! ¡Vamos!';
    return '🏁 Terminado';
  }
  function home() {
    var ev = U.ev(), me = U.me(), book = U.book, members = C.members(book);
    var meBox;
    if (me) {
      var games = C.games(book, me.id, ev.id), rec = C.record(games), b = C.bounty(games), rk = C.rankOf(b).rank, next = C.nextRound(book, me.id, ev.id);
      meBox = '<div class="hero-me">' +
        '<button data-act="player" data-id="' + me.id + '" aria-label="Mis estadísticas">' + U.av(me, 'lg') + '</button>' +
        '<div class="who"><div class="row" style="gap:8px"><span class="name ellip">' + esc(me.name) + '</span><span class="rank-chip">' + rk.icon + ' ' + rk.name + '</span></div>' +
        '<div class="row" style="gap:12px;margin-top:4px"><span class="rec">' + U.recText(rec) + ' <small>' + rec.pts + ' pts</small></span><span class="bounty">฿' + U.berries(b) + '</span></div></div>' +
        '<button class="btn primary block" data-act="log" data-mem="' + me.id + '">' + A.bolt() + ' Registrar ronda ' + next + '</button>' +
      '</div>';
    } else {
      meBox = '<div class="hero-me"><div style="font-size:30px">🏴‍☠️</div><div class="who"><div class="name">¿Quién eres?</div><div class="muted small">Elige tu pirata para que la app sepa que este móvil es tuyo.</div></div><button class="btn primary block" data-act="who">Elegir mi pirata</button></div>';
    }
    var html = '<section class="hero-title">' +
        '<button class="kicker" data-act="events">¡Vamos Kaidoneta! · ' + esc(U.dateLabel(ev.date)) + ' ▾</button>' +
        '<div class="row" style="align-items:flex-end;gap:10px"><h1 class="grow">' + esc(ev.name) + '</h1><span class="count">' + countdown(ev) + '</span></div>' +
      '</section>' +
      '<section class="hero">' +
      A.balloon('#f472b6', '#fde68a', 'b1') + A.balloon('#a78bfa', '#fff', 'b2') + A.balloon('#fbbf24', '#7c3aed', 'b3') +
      heroArt() +
      '<div class="hero-skyline">' + A.skyline() + '</div>' +
      '<div class="hero-shade"></div>' +
    '</section><div class="hero-me-wrap">' + meBox + '</div>';

    html += '<div class="page" style="padding-top:4px">';
    if (iosSafari() && !U.local.iosTip) {
      html += '<div class="warn-box ios-tip" style="margin:0 0 12px">📲 En iPhone, añade Kaidoneta a la pantalla de inicio y úsala desde ahí: la app de la pantalla de inicio guarda sus propios datos.' +
        '<div class="row" style="margin-top:8px;gap:8px"><button class="btn sm grow" data-act="install">Cómo se hace</button><button class="btn sm ghost" data-act="iosTipOff">Entendido</button></div></div>';
    }
    html += '<div class="tools">' +
      '<button class="tool" data-act="timer"><span class="t-ico">⏱</span>Tempori&shy;zador</button>' +
      '<button class="tool" data-act="dice"><span class="t-ico">🎲</span>¿Quién empieza?</button>' +
      '<button class="tool" data-act="kit"><span class="t-ico">🎒</span>Mochila</button>' +
      '<button class="tool" data-act="bristol"><span class="t-ico">🌉</span>Bristol</button>' +
    '</div>';

    if (members.length < 2) {
      html += '<div class="card" style="margin-top:14px"><div class="row"><div style="font-size:32px">🏴‍☠️</div><div class="grow"><b>Monta tu tripulación</b><div class="muted small">Añade a tus amigos para registrar sus rondas y pelear por la recompensa más alta. O pon la tripulación online y que cada uno registre desde su móvil.</div></div></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn sm grow" data-act="addMember">＋ Añadir amigo</button><button class="btn sm grow" data-act="tab" data-tab="crew">☁️ Tripulación online</button></div></div>';
    }

    var rows = C.board(book, ev.id);
    if (rows.some(function (r) { return r.rec.n; })) {
      html += '<h2 class="sec">🏆 Cómo vamos <button class="more" data-act="tab" data-tab="board">Tablón de recompensas ›</button></h2><div class="card">';
      rows.slice(0, 5).forEach(function (r) {
        html += '<button class="mini-row" style="width:100%;text-align:left" data-act="player" data-id="' + r.mem.id + '">' +
          '<span class="pos' + (r.pos === 1 ? ' p1' : '') + '">' + r.pos + '</span>' + U.av(r.mem, 'sm') +
          '<span class="grow"><b class="ellip" style="display:block">' + esc(r.mem.name) + '</b><span class="small muted">' + U.recText(r.rec) + ' · ฿' + U.short(r.bounty) + '</span></span>' +
          U.move(r.move) + '<span class="pts">' + r.rec.pts + '<small>pts</small></span></button>';
      });
      html += '</div>';
    }

    var feed = C.live(book, 'matches').filter(function (m) { return m.ev === ev.id && U.member(m.mem); })
      .sort(function (a, b) { return (b.t || b.at) - (a.t || a.at); });
    html += '<h2 class="sec">⚡ En directo</h2>';
    if (!feed.length) {
      html += '<div class="card empty"><div class="big">🐉</div><b>Aún no hay rondas.</b><div class="small">Registra la primera con el botón morado. ¡Vamos!</div></div>';
    } else {
      html += feed.slice(0, U._feedAll ? 500 : 25).map(feedItem).join('');
      if (feed.length > 25 && !U._feedAll) html += '<button class="btn block ghost" style="margin-top:8px" data-act="feedAll">Ver las ' + feed.length + ' rondas</button>';
    }
    html += '</div>';
    return html;
  }
  U.acts.feedAll = function () { U._feedAll = true; U.render(); };
  // iPhone Safari, not the Home Screen app (which keeps its own, separate data)
  function iosSafari() { var n = root.navigator; return !n.standalone && /iPhone|iPad|iPod/.test(n.userAgent || ''); }
  U.acts.iosTipOff = function () { U.local.iosTip = true; U.saveLocal(); U.render(); };

  function feedItem(m) {
    var mem = U.member(m.mem), opp = m.oppMem ? U.member(m.oppMem) : null, me = U.me();
    var verb = m.res === 'W' ? 'ganó a' : m.res === 'L' ? 'perdió contra' : 'empató con';
    var oppHtml = opp ? '<b>🗡️ ' + esc(opp.name) + '</b>' : U.lchip(m.opp);
    var gain = '';
    if (m.res !== 'L') {
      var games = C.games(U.book, m.mem, m.ev), idx = -1;
      games.forEach(function (g, k) { if (g.m.id === m.id && !g.mirror) idx = k; });
      if (idx >= 0) { var gn = C.gain(games, idx); if (gn > 0) gain = '<span class="gain">+฿' + U.short(gn) + '</span>'; }
    }
    var rx = C.reactionsFor(U.book, m.id);
    var reacts = C.REACTIONS.map(function (e) {
      var who = rx[e] || [], mine = me && who.indexOf(me.id) >= 0;
      return '<button class="react' + (mine ? ' mine' : '') + '" data-act="react" data-id="' + m.id + '" data-emoji="' + e + '" aria-label="Reaccionar con ' + e + '">' + e + (who.length ? '<b>' + who.length + '</b>' : '') + '</button>';
    }).join('');
    var by = m.by && m.by !== m.mem && U.member(m.by) ? ' · por ' + esc(U.member(m.by).name) : '';
    var turn = m.first === true ? 'fue 1º' : m.first === false ? 'fue 2º' : '';
    return '<article class="feed-item r-' + m.res + '">' +
      '<button data-act="player" data-id="' + m.mem + '" aria-label="' + esc(mem.name) + '">' + U.av(mem, 'sm') + '</button>' +
      '<div style="min-width:0;padding-right:30px"><div class="line"><b>' + esc(mem.name) + '</b> ' + verb + ' ' + oppHtml + (m.oppName && !opp ? ' <span class="muted">(' + esc(m.oppName) + ')</span>' : '') + '</div>' +
      '<div class="meta"><span class="res ' + m.res + '">' + U.resLetter(m.res) + '</span><b>' + U.roundLabel(m) + '</b>' + (turn ? '<span>' + turn + '</span>' : '') + (m.bo === 3 && m.score ? '<span>Bo3 ' + esc(m.score) + '</span>' : '') + gain + '<span>' + U.ago(m.t || m.at) + by + '</span></div></div>' +
      (m.mvp || m.notes ? '<div class="note">' + (m.mvp ? '⭐ MVP: ' + esc(m.mvp) + (m.notes ? ' · ' : '') : '') + esc(m.notes) + '</div>' : '') +
      '<div class="reacts">' + reacts + '</div>' +
      '<button class="edit-link" data-act="log" data-id="' + m.id + '" aria-label="Editar esta ronda">✎</button>' +
    '</article>';
  }

  /* ---------- Bounty Board ---------- */
  U.poster = function (r, top, scopeName) {
    var rk = C.rankOf(r.bounty).rank;
    return '<button class="poster' + (top ? ' top' : '') + '" data-act="player" data-id="' + r.mem.id + '" aria-label="' + esc(r.mem.name) + ', puesto ' + r.pos + '">' +
      (top ? '<span class="crown" aria-hidden="true">👑</span>' : '') +
      '<span class="badge-pos">' + r.pos + '</span>' + (r.move ? '<span class="pmove">' + U.move(r.move) + '</span>' : '') +
      '<span class="wanted">SE BUSCA</span>' +
      '<span class="pic" style="--c:' + esc(r.mem.color) + '">' + A.horns() + '<span class="emo">' + esc(r.mem.emoji) + '</span></span>' +
      '<span class="doa">VIVO O MUERTO</span>' +
      '<span class="pname">' + esc(r.mem.name) + '</span>' +
      '<span class="pb">' + U.berries(r.bounty) + '-</span>' +
      '<span class="pstats"><span>' + U.recText(r.rec) + '</span><span>' + r.rec.pts + ' pts</span>' + (r.rec.n ? '<span>' + U.pct(r.rec.rate) + '</span>' : '') + (r.streak.cur === 'W' && r.streak.len >= 2 ? '<span>🔥' + r.streak.len + '</span>' : '') + '</span>' +
      '<span class="prank">' + rk.icon + ' ' + rk.name + '</span>' +
      '<span class="marine">KAIDONETA</span>' +
    '</button>';
  };
  function scopeSeg(ev) {
    var s = U.local.scope === 'all' ? 'all' : 'event';
    return '<div class="seg full" role="tablist"><button class="' + (s === 'event' ? 'on' : '') + '" data-act="scope" data-scope="event">' + esc(ev.name) + '</button><button class="' + (s === 'all' ? 'on' : '') + '" data-act="scope" data-scope="all">Histórico</button></div>';
  }
  function board() {
    var ev = U.ev(), all = U.local.scope === 'all', rows = C.board(U.book, all ? null : ev.id);
    var html = '<div class="page"><div class="board-head"><h1><span>Beasts Pirates</span>Tablón de<br>recompensas</h1>' + U.dragonArt() + '</div>' + scopeSeg(ev);
    if (!rows.length) return html + '<div class="card empty" style="margin-top:14px"><div class="big">🏴‍☠️</div>Aún no hay piratas. Añade a tu tripulación en la pestaña Tripulación.</div></div>';
    if (!rows.some(function (r) { return r.rec.n; })) html += '<div class="card empty" style="margin-top:14px"><div class="big">💰</div><b>Aún no hay recompensas.</b><div class="small">Cada victoria sube tu recompensa: ir segundo, las rachas, el top cut y ganar a un compañero dan extra.</div></div>';
    html += '<div class="posters">' + rows.map(function (r, i) { return U.poster(r, i === 0 && r.rec.n > 0); }).join('') + '</div>';
    html += '<h2 class="sec">📜 Las reglas</h2><div class="card small muted">' +
      'Victoria <b>+฿80M</b> · yendo segundo <b>+฿20M</b> · cada victoria seguida en racha <b>+฿20M</b> más que la anterior · victoria en el top cut <b>+฿100M</b> · ganar a un compañero <b>+฿50M</b> · empate <b>+฿20M</b>. La recompensa nunca baja. ' +
      'Clasificación: puntos (victoria 3, empate 1), luego % victorias y luego recompensa.<div style="margin-top:10px" class="chips">' +
      C.RANKS.map(function (r) { return '<span class="rank-chip">' + r.icon + ' ' + r.name + ' ' + (r.min ? '฿' + U.short(r.min) : '') + '</span>'; }).join('') +
      '</div><div style="margin-top:10px">El mismísimo Kaido: ฿' + U.berries(C.KAIDO_BOUNTY) + '. Sigue subiendo.</div></div>';
    return html + '</div>';
  }

  /* ---------- Meta ---------- */
  function bar(x, n, width) {
    n = n || 1;
    return '<span class="bar" style="width:' + width + '%"><i class="w" style="width:' + (x.w / n * 100) + '%"></i><i class="d" style="width:' + (x.d / n * 100) + '%"></i><i class="l" style="width:' + (x.l / n * 100) + '%"></i></span>';
  }
  function meta() {
    var ev = U.ev(), all = U.local.scope === 'all', M = C.meta(U.book, all ? null : ev.id);
    var html = '<div class="page"><div class="board-head"><h1><span>' + (all ? 'Todos los eventos' : esc(ev.city || ev.name)) + '</span>El<br>meta</h1></div>' + scopeSeg(ev);
    if (!M.n) return html + '<div class="card empty" style="margin-top:14px"><div class="big">📊</div><b>Aún no hay nada que ver.</b><div class="small">Registra rondas y aquí verás contra qué líderes y colores ha jugado la tripulación, y cómo nos ha ido contra cada uno.</div></div></div>';
    var r = M.rec, first = { w: 0, l: 0, d: 0 }, second = { w: 0, l: 0, d: 0 };
    C.live(U.book, 'matches').forEach(function (m) {
      if (m.oppMem || (!all && m.ev !== ev.id) || !U.member(m.mem) || !C.get(U.book, 'events', m.ev)) return;
      var k = m.res === 'W' ? 'w' : m.res === 'L' ? 'l' : 'd';
      if (m.first === true) first[k]++; else if (m.first === false) second[k]++;
    });
    var rate = function (x) { var n = x.w + x.l + x.d; return n ? U.pct(x.w / n) + ' <span class="dim small">(' + U.recText(x) + ')</span>' : '<span class="dim">—</span>'; };
    html += '<h2 class="sec">🏴‍☠️ Nosotros contra el resto</h2><div class="card"><div class="big-stat"><div><b style="color:var(--gold)">' + r.w + '</b><span>Victorias</span></div><div><b style="color:#fb7185">' + r.l + '</b><span>Derrotas</span></div><div><b>' + U.pct(r.rate) + '</b><span>% victorias</span></div></div>' +
      '<div class="duo" style="margin-top:10px"><div class="card"><div class="lab">Yendo primero</div>' + rate(first) + '</div><div class="card"><div class="lab">Yendo segundo</div>' + rate(second) + '</div></div></div>';
    var maxC = Math.max.apply(null, M.colors.map(function (c) { return c.n; }).concat([1]));
    html += '<h2 class="sec">🎨 Colores rivales</h2><div class="card bars">' + M.colors.map(function (c) {
      return '<div class="bar-row"><span class="row" style="gap:8px"><i class="cdot" style="background:' + c.color.hex + ';width:14px;height:14px"></i><b>' + c.color.name + '</b></span>' +
        '<span>' + bar(c, c.n || 1, Math.max(4, c.n / maxC * 100)) + '</span>' +
        '<span class="small">' + (c.n ? c.n + ' · ' + U.recText(c) : '<span class="dim">0</span>') + '</span></div>';
    }).join('') + '<div class="small dim" style="margin-top:6px">Dorado: nuestras victorias · rojo: derrotas · los líderes bicolor cuentan para los dos colores.</div></div>';
    var maxL = M.leaders.length ? M.leaders[0].n : 1;
    html += '<h2 class="sec">👑 Líderes rivales</h2><div class="card">' + M.leaders.map(function (x) {
      return '<div class="lead-row"><span style="min-width:0">' + U.lchip(x.leader) + '</span><span class="small"><b>×' + x.n + '</b> · <span style="color:var(--gold)">' + x.w + 'V</span> <span style="color:#fb7185">' + x.l + 'D</span>' + (x.d ? ' ' + x.d + 'E' : '') + '</span>' +
        bar(x, x.n, Math.max(6, x.n / maxL * 100)) + '</div>';
    }).join('') + '</div>';
    var tough = M.leaders.filter(function (x) { return x.l; }).sort(function (a, b) { return b.l - a.l || a.w - b.w; })[0];
    var prey = M.leaders.filter(function (x) { return x.w; }).sort(function (a, b) { return b.w - a.w || a.l - b.l; })[0];
    if (tough || prey) {
      html += '<div class="duo" style="margin-top:12px">' +
        '<div class="card"><div class="lab">😤 Némesis</div>' + (tough ? U.lchip(tough.leader) + '<div class="small muted">' + U.recText(tough) + '</div>' : '<span class="dim">¡Ninguno!</span>') + '</div>' +
        '<div class="card"><div class="lab">🍖 Presa favorita</div>' + (prey ? U.lchip(prey.leader) + '<div class="small muted">' + U.recText(prey) + '</div>' : '<span class="dim">—</span>') + '</div></div>';
    }
    return html + '</div>';
  }

  /* ---------- onboarding ---------- */
  function onboard() {
    return '<div class="onboard"><img class="onboard-badge" src="icons/badge.jpg" alt="Road to Bristol · Kaidoneta">' +
      '<h1 class="sr">Kaidoneta</h1>' +
      '<p>La bitácora de los Beasts Pirates para el <b>Regional de Bristol</b>. Registra cada ronda, sube tu recompensa y escala en el Tablón de recompensas de la tripulación.</p>' +
      '<button class="btn primary" data-act="start">' + A.bolt() + ' Montar la tripulación</button>' +
      '<button class="btn" data-act="joinOnline">☁️ Unirme a mi tripulación online</button>' +
      '<button class="btn ghost" data-act="importLink">🔗 Abrir un enlace de tripulación</button>' +
      '<p class="small dim" style="margin-top:20px">Hecho por fans para los amigos. Sin relación con Bandai, Shueisha ni Toei Animation.</p>' +
    '</div>';
  }
  U.acts.start = function () { U.memberSheet(null, { me: true }); };
  U.acts.joinOnline = function () { U.crewSheet('join'); };
  U.acts.importLink = function () { U.importSheet(); };

  /* ---------- render ---------- */
  U.render = function () {
    var view = $('#view'), top = $('#top'), nav = $('#tabs');
    if (!C.members(U.book).length) {
      top.hidden = true; nav.hidden = true;
      view.innerHTML = onboard();
    } else {
      top.hidden = false; nav.hidden = false;
      U.updateHeader();
      nav.innerHTML = tabs();
      view.innerHTML = U.tab === 'board' ? board() : U.tab === 'meta' ? meta() : U.tab === 'crew' ? U.crewPage() : home();
    }
    A.mountDragon && A.mountDragon(view);
  };

  /* ---------- who am I ---------- */
  U.whoSheet = function () {
    var ms = C.members(U.book);
    var sh = U.sheet(U.head('¿Quién eres?') + '<p class="muted small">Este móvil registra las rondas a tu nombre y enseña tu balance en el Cuartel. Puedes cambiarlo cuando quieras en Tripulación.</p>' +
      '<div>' + ms.map(function (m) { return '<button class="list-btn" data-pick="' + m.id + '">' + U.av(m) + '<span class="grow"><b>' + esc(m.name) + '</b><div class="small muted">' + U.lchip(m.leader) + '</div></span>' + (m.id === U.local.me ? '<span class="me-tag">YO</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<button class="btn block" style="margin-top:12px" data-new>＋ No estoy en la lista</button>');
    Array.prototype.forEach.call(sh.querySelectorAll('[data-pick]'), function (b) {
      b.onclick = function () { U.local.me = b.getAttribute('data-pick'); U.saveLocal(); U.close(); U.render(); X.toast('¡Vamos, ' + U.me().name + '!', 'good'); };
    });
    sh.querySelector('[data-new]').onclick = function () { U.close(); setTimeout(function () { U.memberSheet(null, { me: true }); }, 50); };
  };

  /* ---------- events ---------- */
  U.eventsSheet = function () {
    var evs = C.events(U.book);
    var sh = U.sheet(U.head('Eventos') + '<div>' + evs.map(function (e) {
      return '<div class="row list-btn"><button class="grow row" style="text-align:left" data-pick="' + e.id + '"><span style="font-size:24px">' + (e.id === C.BRISTOL.id ? '🌉' : '🏯') + '</span><span class="grow"><b>' + esc(e.name) + '</b><div class="small muted">' + esc(U.dateLabel(e.date)) + (e.city ? ' · ' + esc(e.city) : '') + '</div></span>' + (e.id === U.ev().id ? '<span class="me-tag">AHORA</span>' : '') + '</button><button class="btn sm" data-edit="' + e.id + '">Editar</button></div>';
    }).join('') + '</div><button class="btn block" style="margin-top:12px" data-new>＋ Nuevo evento</button>');
    Array.prototype.forEach.call(sh.querySelectorAll('[data-pick]'), function (b) {
      b.onclick = function () { U.local.ev = b.getAttribute('data-pick'); U.saveLocal(); U.close(); U.render(); };
    });
    Array.prototype.forEach.call(sh.querySelectorAll('[data-edit]'), function (b) { b.onclick = function () { U.eventForm(b.getAttribute('data-edit')); }; });
    sh.querySelector('[data-new]').onclick = function () { U.eventForm(null); };
  };
  U.eventForm = function (id) {
    var e = id ? C.get(U.book, 'events', id) : { name: '', date: U.today(), city: '', rounds: 0, mins: 35 };
    var sh = U.swap(U.head(id ? 'Editar evento' : 'Nuevo evento') +
      '<div class="field"><label for="ev-name">Nombre</label><input class="inp" id="ev-name" maxlength="40" value="' + esc(e.name) + '" placeholder="Campeonato de tienda"></div>' +
      '<div class="row"><div class="field grow"><label for="ev-date">Fecha</label><input class="inp" id="ev-date" type="date" value="' + esc(e.date) + '"></div><div class="field grow"><label for="ev-city">Ciudad</label><input class="inp" id="ev-city" maxlength="30" value="' + esc(e.city) + '"></div></div>' +
      '<div class="row"><div class="field grow"><label for="ev-rounds">Rondas suizas</label><input class="inp" id="ev-rounds" type="number" min="0" max="15" inputmode="numeric" value="' + (e.rounds || '') + '" placeholder="?"></div><div class="field grow"><label for="ev-mins">Ronda (min)</label><input class="inp" id="ev-mins" type="number" min="5" max="120" inputmode="numeric" value="' + e.mins + '"></div></div>' +
      '<div class="save-bar">' + (id && id !== C.BRISTOL.id ? '<button class="btn danger" data-del>Borrar</button>' : '') + '<button class="btn primary" data-ok>Guardar</button></div>');
    sh.querySelector('[data-ok]').onclick = function () {
      var rec = { id: id || C.newId('ev'), name: $('#ev-name').value.trim() || 'Evento', date: $('#ev-date').value || U.today(), city: $('#ev-city').value, rounds: Number($('#ev-rounds').value) || 0, mins: Number($('#ev-mins').value) || 35 };
      C.put(U.book, 'events', rec);
      if (!id) U.local.ev = rec.id;
      U.saveLocal(); U.save(); U.close();
      X.toast(id ? 'Evento guardado' : 'Evento creado y seleccionado', 'good');
    };
    var del = sh.querySelector('[data-del]');
    if (del) del.onclick = function () {
      var n = C.live(U.book, 'matches').filter(function (m) { return m.ev === id; }).length;
      U.confirm('¿Borrar ' + e.name + '?', n === 1 ? 'Su ronda registrada desaparecerá de todas las clasificaciones.' : n ? 'Sus ' + n + ' rondas registradas desaparecerán de todas las clasificaciones.' : 'No tiene rondas.', 'Borrar', function () {
        C.remove(U.book, 'events', id);
        if (U.local.ev === id) U.local.ev = C.BRISTOL.id;
        U.saveLocal(); U.close(); U.save();
      }, true);
    };
  };

  /* ---------- links: #crew=... merges a crew's data, #join=name opens the crew form ---------- */
  function links() {
    var h = root.location.hash;
    if (/[#&]crew=/.test(h)) U.openLink(h); // it takes the code out of the address, so this runs once
    else if (/[#&]join=/.test(h)) {
      var name = '';
      try { name = decodeURIComponent((h.match(/join=([^&]+)/) || [])[1] || ''); } catch (e) { /* a broken link */ }
      try { root.history.replaceState(root.history.state, '', root.location.pathname + '#/' + U.tab); } catch (e) { /* file:// */ }
      U.crewSheet('join', name);
    }
  }

  /* ---------- boot ---------- */
  var started = false;
  U.startCloud = function () { if (!started && cloud.signedIn()) { started = true; cloud.start(); } };
  U.boot = function () {
    try { root.localStorage.removeItem(OLD_HERO_KEY); } catch (e) { /* an older version's picture */ }
    cloud.getBook = function () { return U.book; };
    cloud.setBook = function (b) {
      U.book = C.ensureBristol(b);
      var fixed = heal();
      write(BOOK_KEY, U.book);
      if (fixed) setTimeout(function () { cloud.touch(); }, 0); // the moved rounds go back up to the crew
    };
    cloud.on(function (what) {
      if (what === 'book') {
        U.render();
        if (!U.me() && C.members(U.book).length && !U._askedWho && !U.topSheet()) { U._askedWho = true; U.whoSheet(); }
      } else U.updateHeader();
      var dot = $('#sync-dot');
      if (dot) dot.className = 'sync-dot ' + (what === 'syncing' ? 'busy' : cloud.lastError() ? 'err' : 'ok');
      if (U.tab === 'crew' && (what === 'synced' || what === 'error' || what === 'session') && !U.topSheet()) U.render();
    });
    if (heal()) U.save(); else U.render();
    U.startCloud();
    setInterval(function () {
      U.tickTimer && U.tickTimer();
    }, 1000);
    // links, at launch and when one is opened while the app is already open
    links();
    root.addEventListener('hashchange', links);
    // offline + installable (not from file://)
    if ('serviceWorker' in root.navigator && /^https?:/.test(root.location.protocol)) {
      root.addEventListener('load', function () { root.navigator.serviceWorker.register('sw.js').then(null, function () { /* not available */ }); });
    }
  };
})(window);
