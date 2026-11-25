(function () {
  'use strict';
  var BJ = window.BJ;
  function $(s, el) { return (el || document).querySelector(s); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  var SUITS = ['♠', '♥', '♦', '♣'];
  var UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1];
  var ACT = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split' };

  var PIPS = {
    '♥': '<path d="M50 90C18 62 7 46 7 30 7 16 18 7 30 7c9 0 16 5 20 13 4-8 11-13 20-13 12 0 23 9 23 23 0 16-11 32-43 60z"/>',
    '♦': '<path d="M50 5 87 50 50 95 13 50z"/>',
    '♠': '<path d="M50 6c32 28 43 43 43 57 0 12-9 20-20 20-8 0-14-4-18-10 1 9 4 16 10 22H35c6-6 9-13 10-22-4 6-10 10-18 10C16 83 7 75 7 63 7 49 18 34 50 6z"/>',
    '♣': '<circle cx="50" cy="27" r="20"/><circle cx="27" cy="58" r="20"/><circle cx="73" cy="58" r="20"/><path d="M44 50h12c0 22 3 35 10 45H34c7-10 10-23 10-45z"/>'
  };
  function pip(s) { return '<svg class="pip" viewBox="0 0 100 100" aria-hidden="true">' + PIPS[s] + '</svg>'; }
  function stepper(id) {
    return '<span class="btns" style="gap:6px"><button type="button" class="ghost step" data-step="-1" data-for="' + id + '" aria-label="Lower">−</button>' +
      '<input type="text" id="' + id + '" inputmode="numeric" autocomplete="off">' +
      '<button type="button" class="ghost step" data-step="1" data-for="' + id + '" aria-label="Raise">+</button></span>';
  }
  function mk(v) { return { v: v, r: v === 1 ? 'A' : v === 10 ? pick(['10', 'J', 'Q', 'K']) : String(v), s: pick(SUITS) }; }
  function cardHTML(c, cls) {
    cls = cls ? ' ' + cls : '';
    if (!c) return '<div class="card back' + cls + '" aria-label="face-down card"></div>';
    var red = c.s === '♥' || c.s === '♦';
    return '<div class="card' + (red ? ' red' : '') + cls + '" aria-label="' + c.r + c.s + '"><b>' + c.r + '</b>' + pip(c.s) + '</div>';
  }
  function signed(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }
  function parseCount(s) {
    s = String(s).trim().replace(/[−–—]/g, '-').replace(/^\+/, '');
    return /^-?\d+$/.test(s) ? parseInt(s, 10) : null;
  }
  function vals(cards) { return cards.map(function (c) { return c.v; }); }
  function handName(v) {
    if (v.length === 2 && v[0] === v[1]) return 'a pair of ' + (v[0] === 1 ? 'aces' : v[0] === 10 ? 'tens' : v[0] + 's');
    var t = BJ.total(v);
    return (t.soft ? 'soft ' : 'hard ') + t.t;
  }
  function upName(v) { return v === 1 ? 'an ace' : v === 8 ? 'an 8' : 'a ' + v; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function hardPair(t) {            // two different non-ace cards making hard t
    var lo = Math.max(2, t - 10), hi = Math.min(10, t - 2), a;
    do { a = lo + rnd(hi - lo + 1); } while (a === t - a);
    return Math.random() < 0.5 ? [a, t - a] : [t - a, a];
  }
  function fullDeck(decks) {
    var d = [], i, j, x, n, v, s;
    for (n = 0; n < decks; n++) for (s = 0; s < 4; s++) for (v = 1; v <= 13; v++)
      d.push({ v: v > 10 ? 10 : v, r: v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v), s: SUITS[s] });
    for (i = d.length - 1; i > 0; i--) { j = rnd(i + 1); x = d[i]; d[i] = d[j]; d[j] = x; }
    return d;
  }

  /* ---------- saved progress ---------- */
  var P = { stratBest: 0, rcRun: 0, rcBestRun: 0, rcBestTime: null, tcBest: 0, devBest: 0, tableShoes: 0 };
  try { var saved = JSON.parse(localStorage.getItem('hilo-trainer') || '{}'); for (var k in saved) if (k in P) P[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem('hilo-trainer', JSON.stringify(P)); } catch (e) {} }
  /* ---------- house rules and bankroll (saved) ---------- */
  var SET = { bankroll: 200 }, R = BJ.rules(null);
  try {
    var ss = JSON.parse(localStorage.getItem('hilo-settings') || '{}');
    R = BJ.rules(ss.rules); if (ss.bankroll >= 10) SET.bankroll = Math.round(ss.bankroll);
  } catch (e) {}
  function saveSettings() { try { localStorage.setItem('hilo-settings', JSON.stringify({ rules: R, bankroll: SET.bankroll })); } catch (e) {} }
  // Rule sets to start from. A preset leaves the biggest bet and the bankroll alone.
  var PRESETS = [
    { id: 'standard', name: 'Standard shoe', rules: { decks: 6, h17: false, das: true, doubleOn: 'any', maxHands: 4, bj: 1.5, pen: 0.75, hole: 'peek' },
      note: 'The usual six-deck game: the dealer checks the hole card for blackjack and stands on every 17.' },
    { id: 'sevilla', name: 'Sevilla casino', rules: { decks: 6, h17: false, das: true, doubleOn: 'any', maxHands: 4, bj: 1.5, pen: 0.75, hole: 'enhc' },
      note: 'The rules Andalusian casinos play by (Order of 4 February 2010, BOJA 39): six decks, the dealer takes the second card after you and stands on every 17, double on any two cards and after a split, pairs can be split again, split aces get one card each, blackjack pays 3 to 2, insurance, no surrender. Taken from the regulation, not checked at the tables in Sevilla: the limits, how deep the shoe is dealt and whether a shuffling machine is used are the casino’s choice, and the regulation does not say what a dealer blackjack does to doubled and split bets (here it takes them, the usual rule without a hole card).' }
  ];
  function presetOf() {
    for (var i = 0; i < PRESETS.length; i++) {
      var same = true; for (var k in PRESETS[i].rules) if (PRESETS[i].rules[k] !== R[k]) same = false;
      if (same) return PRESETS[i];
    }
    return null;
  }
  function rulesLine() {
    var out = [R.decks + ' decks', 'dealer ' + (R.h17 ? 'hits' : 'stands on') + ' soft 17'];
    if (R.hole === 'enhc') out.push('no hole card');
    out.push(R.das ? 'double after split' : 'no double after split');
    if (R.doubleOn !== 'any') out.push('double on ' + (R.doubleOn === '9-11' ? '9 to 11' : '10 or 11') + ' only');
    out.push(R.bj === 1.5 ? '3 to 2' : '6 to 5');
    return out.join(' · ');
  }
  function list(xs) { return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function canD(v, afterSplit) { return BJ.canDouble(v, R, !!afterSplit); }

  function passed() {
    return { strategy: P.stratBest >= 100, 'running-count': P.rcBestRun >= 3, 'true-count': P.tcBest >= 30,
             deviations: P.devBest >= 50, table: P.tableShoes >= 1 };
  }
  function pill(id, key) {
    var ok = passed()[key], el = $(id);
    el.textContent = ok ? 'Passed' : 'Not passed'; el.className = 'pill' + (ok ? ' done' : '');
  }
  function meter(el, items) {
    el.innerHTML = items.map(function (it) { return '<span>' + it[0] + ' <b>' + it[1] + '</b></span>'; }).join('');
  }

  /* ---------- plan ---------- */
  function renderPlan() {
    var groups = [['plus', '+1', 'low cards', [2, 3, 4, 5, 6]], ['', '0', 'neutral', [7, 8, 9]], ['minus', '−1', 'tens and aces', [10, 'J', 'Q', 'K', 'A']]];
    $('#tagstrip').innerHTML = groups.map(function (g, gi) {
      return '<div class="taggroup ' + g[0] + '"><div class="hand">' + g[3].map(function (r, i) {
        return cardHTML({ r: String(r), s: SUITS[(gi + i) % 4] }, 'sm');
      }).join('') + '</div><strong>' + g[1] + '<span>' + g[2] + '</span></strong></div>';
    }).join('');
    var ok = passed();
    var stages = [
      ['strategy', 'Play basic strategy without thinking', 'Until this is automatic, counting only distracts you into errors that cost more than the count earns.', '100 hands correct in a row', P.stratBest ? 'Best streak ' + P.stratBest : ''],
      ['running-count', 'Keep the running count at speed', 'One number, updated for every card on the table, while cards arrive faster than you would like.', 'a deck of 51 cards in 30 seconds, right, three times running', P.rcBestTime ? 'Best deck ' + P.rcBestTime.toFixed(1) + ' s' : ''],
      ['true-count', 'Turn it into a true count', 'Read the discard tray, work out the decks left, divide, round down.', '30 in a row', P.tcBest ? 'Best streak ' + P.tcBest : ''],
      ['true-count', 'Bet the ramp', 'One unit until the true count reaches +2, then ' + list(BJ.rampSteps(R).slice(1)) + ' units. This is where the money is made. It is drilled together with stage 3.', 'the right bet on each of those 30', ''],
      ['deviations', 'Learn the deviations', 'Insurance at +3 or higher, and ' + BJ.devs(R).length + ' hands whose best play changes with the count.', '50 correct in a row', P.devBest ? 'Best streak ' + P.devBest : ''],
      ['table', 'Put it together', 'A dealt shoe with bets, splits and doubles, and surprise checks on your count.', 'a whole shoe with every count check right and at most one play or bet error', P.tableShoes ? P.tableShoes + ' clean shoe' + (P.tableShoes > 1 ? 's' : '') : '']
    ];
    $('#stages').innerHTML = stages.map(function (s) {
      return '<li><div class="body"><h3>' + s[1] + '</h3><p>' + s[2] + '</p><p class="std">Standard: <b>' + s[3] + '</b></p></div>' +
        '<div class="side"><span class="pill' + (ok[s[0]] ? ' done' : '') + '">' + (ok[s[0]] ? 'Passed' : (s[4] || 'Not passed')) + '</span>' +
        '<a class="btn ghost" href="#' + s[0] + '">Open drill</a></div></li>';
    }).join('');
  }

  /* ---------- basic strategy ---------- */
  var strat = { cur: null, streak: 0, n: 0, right: 0, redo: [] };
  function stratDeal() {
    var h;
    if (strat.redo.length && Math.random() < 0.35) h = strat.redo.shift();
    else {
      var x = Math.random(), v;
      if (x < 0.45) v = hardPair(8 + rnd(10));
      else if (x < 0.72) v = Math.random() < 0.5 ? [1, 2 + rnd(8)] : [2 + rnd(8), 1];
      else { v = 1 + rnd(10); v = [v, v]; }
      h = { v: v, up: pick(UPS) };
    }
    strat.cur = h;
    $('#strat-dealer').innerHTML = cardHTML(mk(h.up), 'in') + cardHTML(null);
    $('#strat-player').innerHTML = h.v.map(function (c) { return cardHTML(mk(c), 'in'); }).join('');
    $('#strat-label').textContent = 'Your hand: ' + handName(h.v);
    $('#strat-btns [data-a="P"]').disabled = h.v[0] !== h.v[1];
    $('#strat-btns [data-a="D"]').disabled = !canD(h.v);
    meter($('#strat-meter'), [['Streak', strat.streak], ['Best', P.stratBest], ['This session', strat.n ? strat.right + ' of ' + strat.n : 'no hands yet']]);
    pill('#strat-pill', 'strategy');
  }
  function stratAnswer(a) {
    var h = strat.cur, fb = $('#strat-fb');
    if (!h || (a === 'P' && h.v[0] !== h.v[1]) || (a === 'D' && !canD(h.v))) return;
    var want = BJ.basic(h.v, h.up, canD(h.v), true, R), ok = a === want;
    var what = cap(handName(h.v)) + ' against ' + upName(h.up);
    strat.n++;
    if (ok) { strat.right++; strat.streak++; fb.className = 'feedback ok'; fb.textContent = 'Right. ' + what + ': ' + ACT[want].toLowerCase() + '.'; }
    else {
      strat.streak = 0; strat.redo.push({ v: h.v, up: h.up }, { v: h.v, up: h.up });
      fb.className = 'feedback no'; fb.textContent = 'No. ' + what + ' is ' + ACT[want].toLowerCase() + ', not ' + ACT[a].toLowerCase() + '. It will come round again.';
    }
    if (strat.streak > P.stratBest) { P.stratBest = strat.streak; save(); }
    stratDeal();
  }
  function renderCharts() {
    function tbl(title, rows) {
      var h = '<table class="chart"><caption>' + title + '</caption><thead><tr><th></th>' +
        UPS.map(function (u) { return '<th>' + (u === 1 ? 'A' : u) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.forEach(function (r) {
        h += '<tr><th class="rowh">' + r[0] + '</th>' + UPS.map(function (u) {
          var a = BJ.basic(r[1], u, canD(r[1]), true, R); return '<td class="a' + a + '">' + a + '</td>';
        }).join('') + '</tr>';
      });
      return h + '</tbody></table>';
    }
    var hard = [['5 to 8', [6, 2]]], soft = [], pairs = [], t, v;
    for (t = 9; t <= 16; t++) hard.push([String(t), t <= 11 ? [t - 2, 2] : [10, t - 10]]);
    hard.push(['17 up', [10, 7]]);
    for (v = 2; v <= 9; v++) soft.push(['A, ' + v, [1, v]]);
    for (v = 1; v <= 10; v++) pairs.push([(v === 1 ? 'A' : v) + ', ' + (v === 1 ? 'A' : v), [v, v]]);
    $('#charts').innerHTML = tbl('Hard totals', hard) + tbl('Soft totals', soft) + tbl('Pairs', pairs);
  }

  /* ---------- running count ---------- */
  var rc = { seq: [], i: 0, timer: null, live: false, asking: false, step: 1, t0: 0, elapsed: 0, len: 51 };
  function rcStop() { if (rc.timer) clearInterval(rc.timer); rc.timer = null; rc.live = false; }
  function rcIdle(msg) {
    rcStop(); rc.asking = false;
    $('#rc-stage').innerHTML = '<p class="muted">' + msg + '</p>';
    $('#rc-start').textContent = 'Deal';
    rcMeter();
  }
  function rcMeter() {
    meter($('#rc-meter'), [['Clean decks in a row', P.rcRun + ' of 3'], ['Fastest correct deck', P.rcBestTime ? P.rcBestTime.toFixed(1) + ' s' : 'none yet']]);
    pill('#rc-pill', 'running-count');
  }
  function rcShow() {
    var h = '<div class="hand">';
    for (var j = 0; j < rc.step && rc.i + j < rc.seq.length; j++) h += cardHTML(rc.seq[rc.i + j], 'lg in');
    h += '</div><div class="handinfo">Card ' + Math.min(rc.i + rc.step, rc.seq.length) + ' of ' + rc.seq.length + '</div>';
    if (rc.self) h += '<button id="rc-next">Next card <kbd>Space</kbd></button>';
    $('#rc-stage').innerHTML = h;
  }
  function rcNext() {
    if (!rc.live) return;
    rc.i += rc.step;
    if (rc.i >= rc.seq.length) rcAsk(); else rcShow();
  }
  function rcStart() {
    if (rc.live) { rcIdle('Stopped. Deal again when you are ready.'); return; }
    var pace = $('#rc-pace').value;
    rc.len = +$('#rc-len').value; rc.self = pace === 'self'; rc.step = $('#rc-pairs').checked ? 2 : 1;
    rc.seq = (rc.len === 51 ? fullDeck(1) : fullDeck(6)).slice(0, rc.len);
    rc.i = 0; rc.live = true; rc.asking = false; rc.t0 = performance.now();
    $('#rc-fb').textContent = ''; $('#rc-start').textContent = 'Stop';
    rcShow();
    if (!rc.self) rc.timer = setInterval(rcNext, 1000 * rc.step / +pace);
  }
  function rcAsk() {
    rc.elapsed = (performance.now() - rc.t0) / 1000;
    rcStop(); rc.asking = true; $('#rc-start').textContent = 'Deal';
    $('#rc-stage').innerHTML = '<form id="rc-form" class="controls"><label for="rc-input">Running count' + stepper('rc-input') + '</label><button>Check</button></form>';
    $('#rc-input').focus();
  }
  function rcSubmit() {
    var guess = parseCount($('#rc-input').value), fb = $('#rc-fb');
    if (guess === null) { fb.className = 'feedback no'; fb.textContent = 'Type a whole number, such as 3 or -2.'; return; }
    var run = 0, review = rc.seq.map(function (c) {
      run += BJ.tag(c.v);
      return '<span class="' + (c.s === '♥' || c.s === '♦' ? 'red' : '') + '">' + c.r + pip(c.s) + '<em>' + signed(run) + '</em></span>';
    }).join('');
    var ok = guess === run, secs = rc.elapsed.toFixed(1), deck = rc.len === 51;
    fb.className = 'feedback ' + (ok ? 'ok' : 'no');
    fb.textContent = (ok ? 'Right: ' + signed(run) + '.' : 'No. The count was ' + signed(run) + ', you said ' + signed(guess) + '.') + ' ' + rc.len + ' cards in ' + secs + ' seconds.' +
      (deck && ok && rc.elapsed > 30 ? ' Correct, but over 30 seconds, so it does not count toward the standard.' : '');
    if (deck) {
      if (ok && rc.elapsed <= 30) { P.rcRun++; P.rcBestRun = Math.max(P.rcBestRun, P.rcRun); } else P.rcRun = 0;
      if (ok && (P.rcBestTime === null || rc.elapsed < P.rcBestTime)) P.rcBestTime = rc.elapsed;
      save();
    }
    rc.asking = false;
    $('#rc-stage').innerHTML = '<div class="stack"><div class="row-label" style="margin:0">Each card with the count after it</div><div class="review">' + review + '</div></div>';
    rcMeter();
  }

  /* ---------- true count and bets ---------- */
  var tc = { cur: null, streak: 0 };
  function half(n) { var w = Math.floor(n); return (w ? w : '') + (n % 1 ? '½' : '') || '0'; }
  function renderRamp() {
    var steps = BJ.rampSteps(R);
    $('#tc-bets').innerHTML = steps.map(function (b) { return '<button data-bet="' + b + '">' + b + '</button>'; }).join('');
    $('#ramp-table').innerHTML = '<thead><tr><th>True count</th><th class="n">+1 or less</th><th class="n">+2</th><th class="n">+3</th><th class="n">+4</th><th class="n">+5 or more</th></tr></thead>' +
      '<tbody><tr><td>Bet, in units</td>' + steps.map(function (b) { return '<td class="n">' + b + '</td>'; }).join('') + '</tr></tbody>';
  }
  function tcDeal() {
    var dealtHalves = 1 + rnd(Math.max(1, Math.round(2 * R.decks * R.pen))), left = R.decks - dealtHalves / 2;
    var r = Math.round((-3 + Math.random() * 10.5) * left);
    if (r === 0 && Math.random() < 0.7) r = pick([-3, -2, 2, 3, 5, 7]);
    var t = Math.floor(r / left);
    tc.cur = { rc: r, left: left, dealt: dealtHalves / 2, tc: t, bet: BJ.ramp(t, R) };
    $('#tc-rc').textContent = signed(r);
    var h = '';
    for (var i = 0; i < 2 * R.decks; i++) h += '<span class="' + (i < dealtHalves ? 'full' : '') + '"></span>';
    $('#tc-tray').innerHTML = h;
    $('#tc-traytext').innerHTML = '<b>' + half(dealtHalves / 2) + '</b> of ' + R.decks + ' decks dealt';
    $('#tc-input').value = '';
    meter($('#tc-meter'), [['Streak', tc.streak], ['Best', P.tcBest]]);
    pill('#tc-pill', 'true-count');
  }
  function tcAnswer(bet) {
    var c = tc.cur, fb = $('#tc-fb'), guess = parseCount($('#tc-input').value);
    if (guess === null) { fb.className = 'feedback no'; fb.textContent = 'Enter the true count first, then choose the bet.'; $('#tc-input').focus(); return; }
    var ok = guess === c.tc && bet === c.bet;
    var work = signed(c.rc) + ' ÷ ' + half(c.left) + ' decks left = ' + (c.rc / c.left).toFixed(2).replace('-', '−') + ', so the true count is ' + signed(c.tc) + ' and the bet is ' + c.bet + (c.bet === 1 ? ' unit.' : ' units.');
    if (ok) { tc.streak++; fb.className = 'feedback ok'; fb.textContent = 'Right. ' + work; }
    else {
      tc.streak = 0; fb.className = 'feedback no';
      fb.textContent = 'No. ' + work + ' You said ' + signed(guess) + ' and ' + bet + (bet === 1 ? ' unit.' : ' units.');
    }
    if (tc.streak > P.tcBest) { P.tcBest = tc.streak; save(); }
    tcDeal();
  }

  /* ---------- deviations ---------- */
  var dev = { cur: null, streak: 0 };
  function devRule(d) {
    var hand = d.pair ? 'A pair of tens' : 'Hard ' + d.t;
    return hand + ' against ' + upName(d.up) + ': ' + ACT[d.hi].toLowerCase() + ' at ' + signed(d.idx) + ' or higher, otherwise ' + ACT[d.lo].toLowerCase() + '.';
  }
  function devDeal() {
    var off = pick([-3, -2, -1, -1, 0, 0, 1, 2]), c;
    if (Math.random() < 0.14) {
      c = { ins: true, v: [2 + rnd(9), 2 + rnd(9)], up: 1, tc: BJ.INSURANCE_INDEX + off };
    } else {
      var d = pick(BJ.devs(R));
      c = { d: d, v: d.pair ? [10, 10] : hardPair(d.t), up: d.up, tc: d.idx + off };
    }
    dev.cur = c;
    $('#dev-tc').textContent = signed(c.tc);
    $('#dev-dealer').innerHTML = cardHTML(mk(c.up), 'in') + cardHTML(null);
    $('#dev-player').innerHTML = c.v.map(function (x) { return cardHTML(mk(x), 'in'); }).join('');
    $('#dev-label').textContent = 'Your hand: ' + handName(c.v);
    $('#dev-btns').innerHTML = c.ins
      ? '<button data-a="Y">Take insurance <kbd>Y</kbd></button><button data-a="N">No insurance <kbd>N</kbd></button>'
      : '<button data-a="H">Hit <kbd>H</kbd></button><button data-a="S">Stand <kbd>S</kbd></button><button data-a="D"' + (canD(c.v) ? '' : ' disabled') + '>Double <kbd>D</kbd></button><button data-a="P"' + (c.v[0] !== c.v[1] ? ' disabled' : '') + '>Split <kbd>P</kbd></button>';
    meter($('#dev-meter'), [['Streak', dev.streak], ['Best', P.devBest]]);
    pill('#dev-pill', 'deviations');
  }
  function devAnswer(a) {
    var c = dev.cur, fb = $('#dev-fb'), want, rule;
    if (!c) return;
    if (c.ins) {
      if (a !== 'Y' && a !== 'N') return;
      want = c.tc >= BJ.INSURANCE_INDEX ? 'Y' : 'N'; rule = 'Insurance: take it at +3 or higher, never below.';
    } else {
      if (!ACT[a] || (a === 'P' && c.v[0] !== c.v[1]) || (a === 'D' && !canD(c.v))) return;
      want = BJ.play(c.v, c.up, c.tc, canD(c.v), true, true, R); rule = devRule(c.d);
    }
    var ok = a === want;
    if (ok) dev.streak++; else dev.streak = 0;
    fb.className = 'feedback ' + (ok ? 'ok' : 'no');
    fb.textContent = (ok ? 'Right at ' : 'No, not at ') + signed(c.tc) + '. ' + rule;
    if (dev.streak > P.devBest) { P.devBest = dev.streak; save(); }
    devDeal();
  }
  function renderDevTable() {
    var h = '<thead><tr><th>Your hand</th><th>Dealer shows</th><th class="n">Index</th><th>At the index or higher</th><th>Below it</th></tr></thead><tbody>' +
      '<tr><td>Any hand</td><td>A</td><td class="n">+3</td><td>Take insurance</td><td>Decline</td></tr>';
    BJ.devs(R).forEach(function (d) {
      h += '<tr><td>' + (d.pair ? '10, 10' : 'Hard ' + d.t) + '</td><td>' + (d.up === 1 ? 'A' : d.up) + '</td><td class="n">' + signed(d.idx) + '</td><td>' + ACT[d.hi] + '</td><td>' + ACT[d.lo] + '</td></tr>';
    });
    $('#dev-table').innerHTML = h + '</tbody>';
  }

  /* ---------- full table ---------- */
  var T = { shoe: [], pos: 0, rc: 0, bank: SET.bankroll, buyins: 1, phase: 'bet', hands: [], dealer: [], hole: false, active: 0,
            bet: 1, ins: false, live: false, notes: [], peeked: false, s: null, summary: '' };
  try {
    var tb = JSON.parse(localStorage.getItem('hilo-table') || 'null');
    if (tb && tb.start === SET.bankroll && isFinite(tb.bank)) { T.bank = tb.bank; T.buyins = tb.buyins || 1; }
  } catch (e) {}
  function saveTable() { try { localStorage.setItem('hilo-table', JSON.stringify({ start: SET.bankroll, bank: T.bank, buyins: T.buyins })); } catch (e) {} }
  function freshStats() { return { plays: 0, playsOk: 0, bets: 0, betsOk: 0, checks: 0, checksOk: 0 }; }
  function tShuffle() { T.shoe = fullDeck(R.decks); T.pos = 0; T.rc = 0; T.s = freshStats(); T.peeked = $('#t-show').checked; }
  function tReset() { T.hands = []; T.dealer = []; T.notes = []; T.summary = ''; T.phase = 'bet'; T.live = false; T.ins = false; tShuffle(); }
  function tDraw(hidden) { var c = T.shoe[T.pos++]; if (!hidden) T.rc += BJ.tag(c.v); return c; }
  function tLeft() { return BJ.shoeSize(R) - T.pos; }
  function tTC() { return BJ.trueCount(T.rc, tLeft()); }
  function tFree() {            // chips that are not already riding on this round
    var out = T.bank;
    if (T.live) { T.hands.forEach(function (h) { out -= h.bet; }); if (T.ins) out -= T.bet / 2; }
    return out;
  }
  function note(text, ok) { T.notes.push({ text: text, ok: ok }); }
  function num(n) { return String(Math.round(n * 10) / 10).replace('-', '−'); }
  function units(n) { return (n > 0 ? '+' : '') + num(n) + (Math.abs(n) === 1 ? ' unit' : ' units'); }
  function plain(n) { return num(n) + (n === 1 ? ' unit' : ' units'); }
  function dealerStands() { var v = BJ.total(vals(T.dealer)); return !(v.t < 17 || (R.h17 && v.t === 17 && v.soft)); }

  function tBuyIn() { T.bank += SET.bankroll; T.buyins++; saveTable(); tRender(); }
  function tBet(b) {
    if (T.phase !== 'bet' || b > T.bank) return;
    T.notes = []; T.summary = '';
    var t = tTC(), want = BJ.ramp(t, R);
    BJ.rampSteps(R).forEach(function (s) { if (s <= T.bank && s <= BJ.ramp(t, R)) want = s; });   // the ramp, as far as the chips go
    T.s.bets++;
    if (b === want) T.s.betsOk++; else note('Bet: the ramp called for ' + plain(want) + ' at a true count of ' + signed(t) + '. You bet ' + b + '.', false);
    T.bet = b; T.ins = false; T.active = 0; T.live = true;
    var p1 = tDraw(), up = tDraw(), p2 = tDraw();
    T.hands = [{ cards: [p1, p2], bet: b, ace: false, split: false, res: '' }];
    T.dealer = R.hole === 'peek' ? [up, tDraw(true)] : [up];
    T.hole = R.hole !== 'peek';             // nothing face down without a hole card
    if (up.v === 1 && tFree() >= b / 2) { T.phase = 'insurance'; tRender(); return; }
    tAfterInsurance();
  }
  function tInsure(yes) {
    if (T.phase !== 'insurance') return;
    var t = tTC(), want = t >= BJ.INSURANCE_INDEX;
    T.s.plays++;
    if (yes === want) T.s.playsOk++; else note('Insurance at a true count of ' + signed(t) + ': ' + (want ? 'take it.' : 'decline.') + ' The index is +3.', false);
    T.ins = yes; tAfterInsurance();
  }
  function tReveal() { if (!T.hole) { T.hole = true; T.rc += BJ.tag(T.dealer[1].v); } }
  function tPayInsurance(dBJ) {
    if (!T.ins) return;
    T.bank += dBJ ? T.bet : -T.bet / 2;
    note('Insurance ' + (dBJ ? 'paid ' + plain(T.bet) : 'lost ' + plain(T.bet / 2)) + '.', dBJ);
    T.ins = false;
  }
  function tAfterInsurance() {
    var h = T.hands[0], pBJ = BJ.total(vals(h.cards)).t === 21, upv = T.dealer[0].v, dBJ = false;
    if (R.hole === 'peek') dBJ = BJ.total(vals(T.dealer)).t === 21;
    else if (pBJ && (upv === 1 || upv === 10)) { T.dealer.push(tDraw()); dBJ = BJ.total(vals(T.dealer)).t === 21; }   // only this card can beat a blackjack
    if (R.hole === 'peek' || pBJ) tPayInsurance(dBJ);
    if (dBJ) { tReveal(); if (pBJ) h.res = 'Push'; else { h.res = 'Dealer blackjack, ' + units(-T.bet); T.bank -= T.bet; } tEnd(); return; }
    if (pBJ) { tReveal(); h.res = 'Blackjack, ' + units(R.bj * T.bet); T.bank += R.bj * T.bet; tEnd(); return; }
    T.phase = 'play'; tAdvance();
  }
  function tCan(h) {
    var v = vals(h.cards), two = v.length === 2, chips = tFree() >= T.bet;
    return { D: canD(v, h.split) && chips, P: two && v[0] === v[1] && T.hands.length < R.maxHands && chips };
  }
  function tAdvance() {
    while (T.active < T.hands.length) {
      var h = T.hands[T.active];
      if (h.cards.length === 1) h.cards.push(tDraw());
      if (h.ace || BJ.total(vals(h.cards)).t >= 21) { T.active++; continue; }
      tRender(); return;
    }
    tDealer();
  }
  function tAct(a) {
    if (T.phase !== 'play') return;
    var h = T.hands[T.active], can = tCan(h), v = vals(h.cards);
    if ((a === 'D' && !can.D) || (a === 'P' && !can.P)) return;
    var t = tTC(), want = BJ.play(v, T.dealer[0].v, t, can.D, can.P, true, R);
    T.s.plays++;
    if (a === want) T.s.playsOk++;
    else note(cap(handName(v)) + ' against ' + upName(T.dealer[0].v) + ' at a true count of ' + signed(t) + ': ' + ACT[want].toLowerCase() + '. You chose ' + ACT[a].toLowerCase() + '.', false);
    if (a === 'H') h.cards.push(tDraw());
    else if (a === 'S') T.active++;
    else if (a === 'D') { h.bet += T.bet; h.cards.push(tDraw()); T.active++; }
    else {
      var second = h.cards[1], ace = h.cards[0].v === 1;
      h.cards = [h.cards[0], tDraw()]; h.ace = ace; h.split = true;
      T.hands.splice(T.active + 1, 0, { cards: [second], bet: T.bet, ace: ace, split: true, res: '' });
    }
    tAdvance();
  }
  function tDealer() {
    var live = T.hands.some(function (h) { return BJ.total(vals(h.cards)).t <= 21; }), dBJ = false;
    if (R.hole === 'peek') tReveal();
    else if (live || T.ins) { T.dealer.push(tDraw()); dBJ = BJ.total(vals(T.dealer)).t === 21; }   // the second card, now that you have played
    tPayInsurance(dBJ);
    if (live && !dBJ) while (!dealerStands()) T.dealer.push(tDraw());
    var dt = BJ.total(vals(T.dealer)).t;
    T.hands.forEach(function (h) {
      var pt = BJ.total(vals(h.cards)).t, r;
      if (pt > 21 || dBJ) r = -1; else if (dt > 21 || pt > dt) r = 1; else if (pt < dt) r = -1; else r = 0;
      T.bank += r * h.bet;
      h.res = (pt > 21 ? 'Bust' : dBJ ? 'Dealer blackjack' : r > 0 ? 'Win' : r < 0 ? 'Lose' : 'Push') + (r ? ', ' + units(r * h.bet) : '');
    });
    tEnd();
  }
  function tEnd() {
    T.active = -1; T.live = false; T.ins = false; saveTable();
    T.phase = (T.pos >= BJ.cutAt(R) || Math.random() < 0.25) ? 'check' : 'bet';
    tRender();
    if (T.phase === 'check') { var i = $('#t-check-input'); if (i) i.focus(); }
  }
  function tCheck() {
    var g = parseCount($('#t-check-input').value);
    if (g === null) { $('#t-check-input').focus(); return; }
    T.s.checks++;
    if (g === T.rc) { T.s.checksOk++; note('Count check: ' + signed(T.rc) + ' is right.', true); }
    else note('Count check: the running count is ' + signed(T.rc) + ', you said ' + signed(g) + '. Carry on from ' + signed(T.rc) + '.', false);
    if (T.pos >= BJ.cutAt(R)) {
      var s = T.s, errs = (s.plays - s.playsOk) + (s.bets - s.betsOk), clean = s.checks === s.checksOk && errs <= 1 && !T.peeked;
      T.summary = 'Shoe finished: ' + s.playsOk + ' of ' + s.plays + ' plays, ' + s.betsOk + ' of ' + s.bets + ' bets, ' + s.checksOk + ' of ' + s.checks + ' count checks. ' +
        (clean ? 'That meets the standard.' : T.peeked ? 'The count was on show, so it does not count toward the standard.' : 'Not yet at the standard.') + ' New shoe, count back to 0.';
      if (clean) { P.tableShoes++; save(); }
      tShuffle();
    }
    T.phase = 'bet'; tRender();
  }
  function tRender() {
    var h = '';
    $('#t-tray').style.width = (100 * T.pos / BJ.shoeSize(R)).toFixed(1) + '%';
    $('#t-tray').parentNode.style.setProperty('--decks', R.decks);
    if (T.dealer.length) {
      $('#t-dealer').innerHTML = T.dealer.map(function (c, i) { return i === 1 && !T.hole ? cardHTML(null) : cardHTML(c, i > 1 ? 'in' : ''); }).join('');
      var dv = BJ.total(vals(T.dealer)).t;
      $('#t-dealer-label').textContent = 'Dealer' + (T.hole && T.dealer.length > 1 ? ': ' + (dv > 21 ? 'bust with ' + dv : dv) : '');
    } else { $('#t-dealer').innerHTML = cardHTML(null) + (R.hole === 'peek' ? cardHTML(null) : ''); $('#t-dealer-label').textContent = 'Dealer'; }
    T.hands.forEach(function (hd, i) {
      var t = BJ.total(vals(hd.cards));
      h += '<div class="playerhand' + (i === T.active && T.phase === 'play' ? ' active' : '') + '"><div class="hand">' + hd.cards.map(function (c) { return cardHTML(c); }).join('') + '</div>' +
        '<div class="handinfo"><b>' + (t.soft && t.t < 21 ? 'Soft ' : '') + t.t + '</b> · bet ' + hd.bet + (hd.res ? ' · <b>' + hd.res + '</b>' : '') + '</div></div>';
    });
    $('#t-hands').innerHTML = h || '<div class="playerhand"><p class="muted">Place a bet to deal the first hand. The shoe is fresh, so the count is 0.</p></div>';
    var coach = $('#t-coach').checked, notes = T.notes.filter(function (n) { return coach || n.ok; });
    $('#t-notes').innerHTML = (T.summary ? '<div class="feedback">' + T.summary + '</div>' : '') +
      notes.map(function (n) { return '<div class="feedback ' + (n.ok ? 'ok' : 'no') + '">' + n.text + '</div>'; }).join('');
    var c = '';
    if (T.phase === 'bet' && T.bank < 1) c = '<div class="stack"><p>You are out of chips.</p><div class="btns"><button data-buyin="1">Add a buy-in of ' + plain(SET.bankroll) + '</button></div></div>';
    else if (T.phase === 'bet') c = '<label>Your bet, in units<span class="btns" style="gap:6px">' + BJ.rampSteps(R).map(function (b) { return '<button data-bet="' + b + '"' + (b > T.bank ? ' disabled' : '') + '>' + b + '</button>'; }).join('') + '</span></label>';
    else if (T.phase === 'insurance') c = '<div class="btns"><button data-ins="1">Take insurance <kbd>Y</kbd></button><button data-ins="0">No insurance <kbd>N</kbd></button></div>';
    else if (T.phase === 'play') {
      var can = tCan(T.hands[T.active]);
      c = '<div class="btns"><button data-a="H">Hit <kbd>H</kbd></button><button data-a="S">Stand <kbd>S</kbd></button><button data-a="D"' + (can.D ? '' : ' disabled') + '>Double <kbd>D</kbd></button><button data-a="P"' + (can.P ? '' : ' disabled') + '>Split <kbd>P</kbd></button></div>';
    } else c = '<form id="t-check" class="controls"><label for="t-check-input">' + (T.pos >= BJ.cutAt(R) ? 'Cut card is out. Running count before the shuffle?' : 'Running count right now?') + stepper('t-check-input') + '</label><button>Check</button></form>';
    $('#t-controls').innerHTML = c;
    var s = T.s;
    meter($('#t-meter'), [['Bankroll', plain(T.bank)], ['Result', units(T.bank - T.buyins * SET.bankroll)], ['Buy-ins', T.buyins], ['Plays', s.playsOk + '/' + s.plays], ['Bets', s.betsOk + '/' + s.bets], ['Count checks', s.checksOk + '/' + s.checks]]);
    $('#t-buyin').textContent = 'Add a buy-in (' + plain(SET.bankroll) + ')';
    $('#t-buyin').disabled = T.live;
    $('#t-count').textContent = $('#t-show').checked ? 'Running ' + signed(T.rc) + ' · ' + half(BJ.decksLeft(tLeft())) + ' decks left · true ' + signed(tTC()) : '';
    pill('#table-pill', 'table');
  }

  /* ---------- the edge ---------- */
  function modes() {
    return [['Basic strategy, flat bet', {}], ['Count, bet 1 to ' + R.spread + ' units, basic strategy', { spread: true }],
            ['Count, bet 1 to ' + R.spread + ' units, with deviations', { spread: true, dev: true }]];
  }
  var BASE = [[-0.419, -0.419, 11.54], [0.491, 0.814, 30.39], [0.740, 1.227, 31.46]];   // 60 million hands, standard rules
  var edgeDone = { key: '', rows: null, hands: 0 }, edgeBusy = false;
  function pct(x, d) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d); }
  function edgeTable(rows, hands) {
    var M = modes();
    $('#edge-table').innerHTML = '<thead><tr><th>How you play</th><th class="n">Edge on money bet</th><th class="n">Units per 100 hands</th><th class="n">Swing per 100 hands (1 SD)</th></tr></thead><tbody>' +
      M.map(function (m, i) {
        var r = rows && rows[i];
        return '<tr><td>' + m[0] + '</td><td class="n">' + (r ? pct(r[0], 2) + '%' : '…') + '</td><td class="n">' + (r ? pct(r[1], 2) : '…') + '</td><td class="n">' + (r ? '±' + r[2].toFixed(1) : '…') + '</td></tr>';
      }).join('') + '</tbody>';
    var std = BJ.isDefault(R), n = hands ? hands.toLocaleString('en-US') : '';
    $('#edge-note').textContent = !hands ? 'Shown: a 60-million-hand run of the standard rules. A run of a million hands here can land a few tenths of a percent away, which is a lesson in how slowly this edge shows up.'
      : std ? 'Shown: your run, ' + n + ' hands of each. The 60-million-hand figures are −0.42%, +0.49% and +0.74%. The gap is sampling noise: even a million hands leaves the counting rows uncertain by a few tenths of a percent.'
      : 'Shown: ' + n + ' hands of each under your rules (' + rulesLine() + '). Even a million hands leaves the counting rows uncertain by a few tenths of a percent, so run it more than once.';
  }
  function edgeRun() {
    if (edgeBusy) return;
    var btn = $('#edge-run'), CH = 100000, N = 1000000, done = 0, M = modes(), k = BJ.key(R), rules = R;
    var acc = M.map(function () { return { net: 0, init: 0, sumsq: 0 }; });
    btn.disabled = true; edgeBusy = true;
    (function chunk() {
      if (k !== BJ.key(R)) { edgeBusy = false; btn.disabled = false; btn.textContent = 'Run 1,000,000 hands of each'; if (view === 'edge') edgeShow(); return; }   // the rules changed meanwhile
      M.forEach(function (m, i) { var r = BJ.simulate(CH, m[1], null, rules); acc[i].net += r.net; acc[i].init += r.init; acc[i].sumsq += r.sumsq; });
      done += CH;
      edgeDone = { key: k, hands: done, rows: acc.map(function (a) { var mean = a.net / done; return [100 * a.net / a.init, 100 * mean, 10 * Math.sqrt(a.sumsq / done - mean * mean)]; }) };
      edgeTable(edgeDone.rows, done);
      if (done < N) { btn.textContent = 'Running, ' + (done / 1000) + ',000 hands'; setTimeout(chunk, 0); }
      else { edgeBusy = false; btn.disabled = false; btn.textContent = 'Run another 1,000,000'; }
    })();
  }
  // What the edge view shows on opening: the last run for these rules, the stored figures for the standard rules,
  // or a fresh run for rules that have no figures yet.
  function edgeShow() {
    var std = BJ.isDefault(R);
    $('#paths-text').textContent = 'About 200 hours of play with the 1 to ' + R.spread + ' ramp and deviations' + (std ? '. The straight line is the average result.' : ' under your rules.') + ' Each path is one perfect player.';
    if (edgeDone.key === BJ.key(R)) edgeTable(edgeDone.rows, edgeDone.hands);
    else if (std) edgeTable(BASE, 0);
    else { edgeTable(null, 0); edgeRun(); }
    drawPaths();
  }
  var pathSeed = 7;
  function drawPaths() {
    var cv = $('#paths'), w = cv.clientWidth, hgt = cv.clientHeight;
    if (!w) return;
    var dpr = window.devicePixelRatio || 1, g = cv.getContext('2d'), css = getComputedStyle(document.documentElement);
    function tok(n) { return css.getPropertyValue(n).trim(); }
    cv.width = w * dpr; cv.height = hgt * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hgt);
    var N = 20000, STEP = 100, EV = BJ.isDefault(R) ? 0.01227 : null, paths = [], lo = 0, hi = EV ? EV * N : 0, i, j;
    for (i = 0; i < 6; i++) {
      var p = BJ.simulate(N, { spread: true, dev: true, pathStep: STEP }, BJ.mulberry32(pathSeed * 100 + i), R).path;
      paths.push(p); for (j = 0; j < p.length; j++) { if (p[j] < lo) lo = p[j]; if (p[j] > hi) hi = p[j]; }
    }
    var tick = 250; lo = Math.floor(lo / tick) * tick; hi = Math.ceil(hi / tick) * tick;
    var L = 54, Rt = 12, Tp = 12, B = 30;
    function X(n) { return L + (w - L - Rt) * n / N; }
    function Y(v) { return Tp + (hgt - Tp - B) * (hi - v) / (hi - lo); }
    g.font = '12px ' + tok('--mono'); g.textBaseline = 'middle';
    for (var v = lo; v <= hi; v += tick) {
      g.strokeStyle = v === 0 ? 'rgba(244,239,222,.55)' : 'rgba(244,239,222,.12)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - R, Y(v)); g.stroke();
      g.fillStyle = tok('--muted'); g.textAlign = 'right'; g.fillText((v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), L - 8, Y(v));
    }
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (var n = 0; n <= N; n += 5000) g.fillText(n === 0 ? '0' : (n / 1000) + ',000' + (n === N ? ' hands' : ''), Math.min(X(n), w - Rt - 44), hgt - B + 10);
    if (EV) {
      g.strokeStyle = tok('--brass'); g.lineWidth = 2; g.setLineDash([6, 5]);
      g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(N), Y(EV * N)); g.stroke(); g.setLineDash([]);
    }
    paths.forEach(function (p) {
      var end = p[p.length - 1];
      g.strokeStyle = end >= 0 ? tok('--good') : tok('--bad'); g.globalAlpha = 0.85; g.lineWidth = 1.4; g.beginPath();
      for (j = 0; j < p.length; j++) { if (j) g.lineTo(X(j * STEP), Y(p[j])); else g.moveTo(X(0), Y(p[0])); }
      g.stroke(); g.globalAlpha = 1;
      g.fillStyle = end >= 0 ? tok('--good') : tok('--bad'); g.beginPath(); g.arc(X(N), Y(end), 3.5, 0, 6.3); g.fill();
    });
    var behind = paths.filter(function (p) { return p[p.length - 1] < 0; }).length;
    cv.setAttribute('aria-label', 'Bankroll paths of six simulated counters over 20,000 hands, in units. ' + behind + ' of 6 finish behind.' + (EV ? ' Expected result is +' + Math.round(EV * N) + ' units.' : ''));
  }

  /* ---------- rules and bankroll view ---------- */
  var FIELDS = [
    ['decks', 'Decks', function (v) { return v + ' decks'; }],
    ['h17', 'Dealer on soft 17', function (v) { return v ? 'Hits' : 'Stands'; }],
    ['hole', 'Dealer’s second card', function (v) { return v === 'peek' ? 'Dealt first, checked for blackjack' : 'After you play (no hole card)'; }],
    ['doubleOn', 'Double on', function (v) { return v === 'any' ? 'Any two cards' : v === '9-11' ? 'Hard 9, 10 or 11 only' : 'Hard 10 or 11 only'; }],
    ['das', 'Double after a split', function (v) { return v ? 'Allowed' : 'Not allowed'; }],
    ['maxHands', 'Split up to', function (v) { return v + ' hands'; }],
    ['bj', 'Blackjack pays', function (v) { return v === 1.5 ? '3 to 2' : '6 to 5'; }],
    ['pen', 'Cut card after', function (v) { return Math.round(v * 100) + '% of the shoe'; }]
  ];
  function selectHTML(k, label, text) {
    return '<label for="set-' + k + '">' + label + '<select id="set-' + k + '" data-k="' + k + '">' + BJ.CHOICES[k].map(function (v, i) {
      return '<option value="' + i + '"' + (R[k] === v ? ' selected' : '') + '>' + text(v) + '</option>';
    }).join('') + '</select></label>';
  }
  function renderRules() {
    var pre = presetOf();
    $('#set-preset').innerHTML = PRESETS.map(function (p) { return '<option value="' + p.id + '"' + (pre === p ? ' selected' : '') + '>' + p.name + '</option>'; }).join('') +
      (pre ? '' : '<option value="" selected>Your own rules</option>');
    $('#set-preset-note').textContent = pre ? pre.note : 'Your own mix of rules. The chart, the deviations, the practice table and the simulation all follow it.';
    $('#set-rules').innerHTML = FIELDS.map(function (f) { return selectHTML(f[0], f[1], f[2]); }).join('');
    $('#set-money').innerHTML = '<label for="set-bankroll">Buy-in, in units<input type="text" id="set-bankroll" inputmode="numeric" autocomplete="off" value="' + SET.bankroll + '" style="width:130px"></label>' +
      selectHTML('spread', 'Biggest bet', function (v) { return v + ' units (' + v + ' times the smallest)'; });
    $('#set-ramp').textContent = 'Bet ramp: 1 unit up to a true count of +1, then ' + list(BJ.rampSteps(R).slice(1)) + ' units at +2, +3, +4 and +5 or more. At the table you can add another buy-in whenever you like; each one is counted.';
    $('#rules-line').textContent = rulesLine();
  }
  // The rules changed: everything that depends on them starts again.
  function applyRules() {
    R = BJ.rules(R); saveSettings();
    renderRules(); renderCharts(); renderDevTable(); renderRamp();
    strat.redo = []; stratDeal(); tcDeal(); devDeal(); tReset(); tRender();
    $('#set-fb').textContent = 'Saved. Every drill now uses these rules, and the practice table starts a fresh shoe.';
  }

  /* ---------- routing and input ---------- */
  var VIEWS = ['plan', 'strategy', 'running-count', 'true-count', 'deviations', 'table', 'edge', 'rules'], view = 'plan';
  function route() {
    var h = location.hash.replace('#', '');
    view = VIEWS.indexOf(h) >= 0 ? h : 'plan';
    VIEWS.forEach(function (v) { $('#view-' + v).classList.toggle('on', v === view); });
    Array.prototype.forEach.call(document.querySelectorAll('.tabs a'), function (a) {
      if (a.getAttribute('href') === '#' + view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (view !== 'running-count' && rc.live) rcIdle('Stopped. Deal again when you are ready.');
    if (view === 'plan') renderPlan();
    if (view === 'edge') edgeShow();
    if (view === 'rules') $('#set-fb').textContent = '';
    window.scrollTo(0, 0);
  }
  function delegate(sel, attr, fn) {
    $(sel).addEventListener('click', function (e) { var b = e.target.closest('button[' + attr + ']'); if (b && !b.disabled) fn(b.getAttribute(attr)); });
  }
  delegate('#strat-btns', 'data-a', stratAnswer);
  delegate('#dev-btns', 'data-a', devAnswer);
  delegate('#tc-bets', 'data-bet', function (b) { tcAnswer(+b); });
  delegate('#t-controls', 'data-bet', function (b) { tBet(+b); });
  delegate('#t-controls', 'data-a', tAct);
  delegate('#t-controls', 'data-ins', function (v) { tInsure(v === '1'); });
  delegate('#t-controls', 'data-buyin', tBuyIn);
  $('#t-buyin').addEventListener('click', function () { if (!T.live) tBuyIn(); });
  $('#view-rules').addEventListener('change', function (e) {
    var el = e.target, k = el.getAttribute('data-k');
    if (k) { R[k] = BJ.CHOICES[k][+el.value]; applyRules(); }
    else if (el.id === 'set-preset') {
      var p = PRESETS.filter(function (x) { return x.id === el.value; })[0];
      if (p) { for (var key in p.rules) R[key] = p.rules[key]; applyRules(); }
    } else if (el.id === 'set-bankroll') {
      var v = parseCount(el.value);
      if (v === null || v < 10 || v > 1000000) { el.value = SET.bankroll; $('#set-fb').textContent = 'The buy-in must be a whole number from 10 to 1,000,000 units.'; return; }
      SET.bankroll = v; T.bank = v; T.buyins = 1; saveSettings(); saveTable(); renderRules(); tRender();
      $('#set-fb').textContent = 'Saved. Your bankroll at the practice table is now ' + plain(v) + '.';
    }
  });
  $('#set-reset').addEventListener('click', function () { var keep = R.spread; R = BJ.rules(null); R.spread = keep; applyRules(); });
  $('#t-controls').addEventListener('submit', function (e) { e.preventDefault(); tCheck(); });
  $('#rc-start').addEventListener('click', rcStart);
  $('#rc-stage').addEventListener('click', function (e) { if (e.target.closest('#rc-next') || (rc.self && e.target.closest('.card'))) rcNext(); });
  $('#rc-stage').addEventListener('submit', function (e) { e.preventDefault(); rcSubmit(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-step]'); if (!b) return;
    var i = document.getElementById(b.getAttribute('data-for')), v = parseCount(i.value);
    i.value = (v === null ? 0 : v) + (+b.getAttribute('data-step'));
  });
  $('#t-coach').addEventListener('change', tRender);
  $('#t-show').addEventListener('change', function () { if (this.checked) T.peeked = true; tRender(); });
  $('#edge-run').addEventListener('click', edgeRun);
  $('#paths-new').addEventListener('click', function () { pathSeed = 1 + rnd(1e6); drawPaths(); });
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    var key = e.key.toUpperCase();
    if (view === 'strategy' && ACT[key]) stratAnswer(key);
    else if (view === 'deviations' && (ACT[key] || key === 'Y' || key === 'N')) devAnswer(key);
    else if (view === 'table') {
      if (T.phase === 'play' && ACT[key]) tAct(key);
      else if (T.phase === 'insurance' && (key === 'Y' || key === 'N')) tInsure(key === 'Y');
    } else if (view === 'running-count' && e.key === ' ' && rc.live && rc.self) { e.preventDefault(); rcNext(); }
  });
  window.addEventListener('hashchange', route);
  var resizeT; window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (view === 'edge') drawPaths(); }, 150); });

  renderRules(); renderRamp(); renderCharts(); renderDevTable();
  stratDeal(); tcDeal(); devDeal(); tShuffle(); tRender();
  if (/[?&]hooks=1/.test(location.search)) window.__hilo = { T: T, act: tAct, bet: tBet, insure: tInsure, check: tCheck, rules: function () { return R; } };   // for the tests
  rcIdle('Choose a length and a pace, then deal. Say the count to yourself as each card lands.');
  route();
})();
