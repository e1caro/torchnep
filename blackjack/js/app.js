/* Blackjack table: the page. The rules live in engine.js (window.BJ); this file draws the table, deals the cards with
 * small animations (out of the shoe, flipped in flight, slid apart on a split, swept to the tray), moves the chips,
 * runs the lobby of tables, keeps every session's statistics and saves the game in this browser. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY = 'blackjack.v1', TABLES_KEY = 'blackjack.tables.v1', SESSIONS_KEY = 'blackjack.sessions.v1';
  const SPEEDS = { off: 0, fast: 0.55, normal: 1, slow: 1.6 };
  const CHIPS = [1, 5, 10, 25, 100, 500, 1000, 5000, 10000];
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DEFAULT_PREFS = { speed: reduced ? 'off' : 'normal', sound: true, totals: true, hints: false, count: false, felt: 'green', back: 'red' };
  const MOVE = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };
  const MOVE_BTN = { H: 'hitBtn', S: 'standBtn', D: 'doubleBtn', P: 'splitBtn', R: 'surrenderBtn' };
  const RESULT = { win: 'Win', blackjack: 'Blackjack', push: 'Push', lose: 'Lose', bust: 'Bust', surrender: 'Surrendered',
    even: 'Even money', charlie: 'Charlie', returned: 'Bet back' };
  const SUIT_NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
  const SUIT_CH = { S: '♠︎', H: '♥︎', D: '♦︎', C: '♣︎' };
  const RANK_NAME = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
  const SIDE_LABEL = { pp: 'Pairs', t3: '21+3' };
  const SIDE_FULL = { pp: 'Perfect Pairs', t3: '21+3' };
  const SIDE_SHORT = { perfect: 'Perfect', colored: 'Coloured', mixed: 'Mixed', suitedTrips: 'Suited trips', straightFlush: 'Str. flush',
    trips: 'Trips', straight: 'Straight', flush: 'Flush' };
  const GROUPS = { floor: 'Casino floor', online: 'Online', mine: 'My tables' };
  // Pip positions (percent of the pip area) for the number cards; pips below the middle are drawn upside down.
  const PIPS = {
    2: [[50, 0], [50, 100]],
    3: [[50, 0], [50, 50], [50, 100]],
    4: [[0, 0], [100, 0], [0, 100], [100, 100]],
    5: [[0, 0], [100, 0], [50, 50], [0, 100], [100, 100]],
    6: [[0, 0], [100, 0], [0, 50], [100, 50], [0, 100], [100, 100]],
    7: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [0, 100], [100, 100]],
    8: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [50, 75], [0, 100], [100, 100]],
    9: [[0, 0], [100, 0], [0, 33.3], [100, 33.3], [50, 50], [0, 66.7], [100, 66.7], [0, 100], [100, 100]],
    10: [[0, 0], [100, 0], [50, 16.7], [0, 33.3], [100, 33.3], [0, 66.7], [100, 66.7], [50, 83.3], [0, 100], [100, 100]],
  };

  // The lobby: the buy-in is yours; the rest are the table's rules, which you can change. Values are [stored, label].
  const BUYIN_FIELDS = [
    { k: 'bankroll', label: 'Buy-in', type: 'money', quick: [100, 500, 1000, 5000, 10000, 100000] },
    { k: 'currency', label: 'Currency', type: 'seg', opts: [['$', '$ Dollars'], ['€', '€ Euros'], ['£', '£ Pounds']] },
  ];
  const RULE_FIELDS = [
    ['Table limits', [
      { k: 'minBet', label: 'Minimum bet', type: 'select', opts: [1, 2, 5, 10, 15, 25, 50, 100, 500, 1000] },
      { k: 'maxBet', label: 'Maximum bet', type: 'select', opts: [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000] },
    ]],
    ['Shoe and dealer', [
      { k: 'decks', label: 'Decks in the shoe', type: 'seg', opts: [[1, '1'], [2, '2'], [4, '4'], [6, '6'], [8, '8']] },
      { k: 'continuous', label: 'Shuffle every hand', note: 'As online games do; otherwise the cut card decides', type: 'toggle' },
      { k: 'penetration', label: 'Cut card at', type: 'range', min: 0.5, max: 0.9, step: 0.05, fmt: (v) => Math.round(v * 100) + '% of the shoe' },
      { k: 'holeCard', label: 'Dealer’s second card', type: 'seg', opts: [['peek', 'Peeks for blackjack'], ['enhc', 'After you (European)'], ['obo', 'After you, first bet only']] },
      { k: 'hitSoft17', label: 'Dealer on soft 17', type: 'seg', opts: [[false, 'Stands'], [true, 'Hits']] },
      { k: 'payout', label: 'Blackjack pays', type: 'seg', opts: [['3:2', '3 to 2'], ['6:5', '6 to 5'], ['1:1', '1 to 1']] },
      { k: 'insurance', label: 'Insurance offered', note: 'When the dealer shows an ace; pays 2 to 1', type: 'toggle' },
    ]],
    ['Your options', [
      { k: 'doubleOn', label: 'Double down on', type: 'seg', opts: [['any', 'Any 2 cards'], ['9-11', '9 to 11'], ['10-11', '10 or 11'], ['none', 'Never']] },
      { k: 'das', label: 'Double after a split', type: 'toggle' },
      { k: 'maxHands', label: 'Split up to', type: 'seg', opts: [[1, 'No splits'], [2, '2 hands'], [3, '3 hands'], [4, '4 hands']] },
      { k: 'resplitAces', label: 'Resplit aces', type: 'toggle' },
      { k: 'hitSplitAces', label: 'Hit split aces', note: 'Otherwise each split ace gets one card', type: 'toggle' },
      { k: 'surrender', label: 'Late surrender', note: 'Give up the first two cards for half the bet', type: 'tv', on: 'late', off: 'none' },
      { k: 'charlie', label: 'Card Charlie', note: 'A hand of this many cards that has not bust wins', type: 'seg', opts: [[0, 'Off'], [5, '5 cards'], [6, '6 cards'], [7, '7 cards']] },
    ]],
    ['Side bets', [
      { k: 'sidePP', label: 'Perfect Pairs', note: 'Your first two cards: a pair pays 6, 12 or 25 to 1', type: 'toggle' },
      { k: 'side213', label: '21+3', note: 'Your two cards and the dealer’s up card as a poker hand: 5 to 100 to 1', type: 'toggle' },
      { k: 'sideMax', label: 'Side bet maximum', type: 'select', opts: [10, 25, 50, 100, 250, 500, 1000] },
    ]],
  ];
  const PREF_FIELDS = [
    { k: 'speed', label: 'Animations', type: 'seg', opts: [['off', 'Off'], ['fast', 'Fast'], ['normal', 'Normal'], ['slow', 'Slow']] },
    { k: 'felt', label: 'Felt', type: 'seg', opts: [['green', 'Green'], ['blue', 'Blue'], ['red', 'Burgundy']] },
    { k: 'back', label: 'Card backs', type: 'seg', opts: [['red', 'Red'], ['blue', 'Blue'], ['black', 'Black']] },
    { k: 'sound', label: 'Sound', type: 'toggle' },
    { k: 'totals', label: 'Show hand totals', type: 'toggle' },
    { k: 'hints', label: 'Basic strategy hints', note: 'Lights up the chart move and tells you when you leave it', type: 'toggle' },
    { k: 'count', label: 'Show the card count', note: 'Hi-Lo running count and true count', type: 'toggle' },
  ];

  let S = null;                 // the game (engine state, plain JSON) with S.table and S.session added here
  let P = Object.assign({}, DEFAULT_PREFS);
  let busy = false;             // an animation sequence is running: input waits
  let swept = true;             // after a round, the chips have left the table
  let sidesSwept = true;        // the side bets of this round have been paid or taken
  let holdBank = false;         // keep the bankroll figure still while chips are in flight
  let pendingFly = 0;           // chips flying to a bet circle: draw the stacks when they land
  let dealQueued = false;       // Deal was tapped while chips were still flying
  let target = 'main';          // where the next chip goes: the main bet or a side bet
  let shownBank = null, bankTween = 0, toastTimer = 0, openSheetId = null, lastFocus = null;
  const cardEls = new Map();    // card id -> element
  const lobby = { group: 'floor', id: 'strip', edited: false };
  let statsView = { tab: 'session', rec: null, ended: false };

  const params = new URLSearchParams(location.search);
  if (params.get('seed')) BJ.setRng(BJ.seeded(Number(params.get('seed'))));

  /* ---------- small helpers ---------- */
  const speed = () => (SPEEDS[P.speed] == null ? 1 : SPEEDS[P.speed]);
  const wait = (ms) => new Promise((res) => setTimeout(res, ms * speed()));
  function anim(el, frames, o) {
    const k = speed();
    if (!k || !el || !el.animate) return Promise.resolve();
    const a = el.animate(frames, Object.assign({}, o, { duration: o.duration * k, delay: (o.delay || 0) * k }));
    return a.finished.then(() => a, () => a);
  }
  function money(c, signed, cur) {
    cur = cur || (S ? S.rules.currency : '$');
    const v = Math.abs(c) / 100;
    const txt = cur + v.toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
    if (signed) return (c > 0 ? '+' : c < 0 ? '−' : '') + txt;
    return (c < 0 ? '−' : '') + txt;
  }
  const short = (d) => (d >= 1000 ? d / 1000 + 'K' : String(d));
  const shortMoney = (units, cur) => cur + (units >= 1000 ? units / 1000 + 'K' : units);
  const sgn = (n, dp) => (n > 0.0001 ? '+' : n < -0.0001 ? '−' : '') + Math.abs(n).toFixed(dp || 0);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const tone = (n) => (n > 0 ? 'good' : n < 0 ? 'bad' : '');
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
  const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '–');
  function fmtDur(ms) {
    const m = Math.round(ms / 60000);
    if (m < 1) return '< 1 min';
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return new Date(ts).toISOString().slice(0, 16).replace('T', ' '); }
  }
  function readJSON(key, dflt) { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? dflt : v; } catch (e) { return dflt; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function save() { if (S) writeJSON(KEY, { s: S, prefs: P }); else writeJSON(KEY, { prefs: P }); }
  function toast(text) {
    const t = $('toast');
    t.textContent = text; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }
  function setMsg(text, cls) { const m = $('msg'); m.textContent = text; m.className = 'msg' + (cls ? ' ' + cls : ''); }

  /* ---------- chips ---------- */
  function breakdown(cents, max) {
    let left = Math.floor(cents / 100);
    const out = [];
    for (let i = CHIPS.length - 1; i >= 0 && out.length < max; i--) {
      while (left >= CHIPS[i] && out.length < max) { out.push(CHIPS[i]); left -= CHIPS[i]; }
    }
    if (!out.length && cents > 0) out.push(1); // half chips (a 3:2 payout) still show something
    return out;
  }
  const stackHTML = (cents, max) => breakdown(cents, max || 12).map((d, k) => `<span class="chip c${d}" style="--k:${k}"><i>${short(d)}</i></span>`).join('');
  // Up to six chips, from the biggest one that still makes the minimum bet; smaller ones fill a short tray.
  function tableChips() {
    const R = S.rules, list = CHIPS.filter((d) => d <= R.maxBet);
    let start = 0;
    list.forEach((d, i) => { if (d <= R.minBet) start = i; });
    const out = list.slice(start, start + 6);
    while (out.length < 5 && start > 0) out.unshift(list[--start]);
    return out;
  }
  function buildChipTray() {
    $('chipTray').innerHTML = tableChips().map((d) =>
      `<button type="button" class="chip-btn" data-d="${d}" aria-label="Add a ${money(d * 100)} chip"><span class="chip c${d}"><i>${short(d)}</i></span></button>`).join('');
  }
  const seatEl = (i) => $('seats').children[i];
  const stackEl = (i) => (seatEl(i) || seatEl(0)).querySelector('.spot .stack');
  const sideEl = (t) => seatEl(0).querySelector(`.side[data-target="${t}"]`);
  const targetStack = (t) => (t === 'main' ? stackEl(0) : sideEl(t).querySelector('.stack'));
  function chipSize() { const st = stackEl(0); return st ? st.offsetWidth : 40; }
  // A little stack of chips flies from one element to another.
  function flyChips(cents, from, to, o) {
    o = o || {};
    if (!speed() || cents <= 0 || !from || !to) return Promise.resolve();
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'fly';
    el.style.setProperty('--chip', (o.size || chipSize()) + 'px');
    el.style.left = a.left + a.width / 2 + 'px';
    el.style.top = a.top + a.height / 2 + 'px';
    el.innerHTML = stackHTML(cents, 6);
    document.body.appendChild(el);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    return anim(el, [
      { transform: 'translate(-50%,-50%) scale(.92)', opacity: 1 },
      { transform: `translate(calc(${dx}px - 50%),calc(${dy}px - 50%)) scale(${o.fade ? 0.7 : 1})`, opacity: o.fade ? 0 : 1 },
    ], { duration: o.duration || 430, delay: o.delay || 0, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'both' }).then(() => el.remove());
  }

  /* ---------- cards ---------- */
  const tilt = (id) => ((id * 7919) % 9 - 4) * 0.45;
  const suitSvg = (s) => `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#suit-${s}"/></svg>`;
  function cardName(c) { return (RANK_NAME[c.rank] || c.rank) + ' of ' + SUIT_NAME[c.suit]; }
  function fillFace(el, c) {
    const f = el.querySelector('.front'), u = suitSvg(c.suit);
    let mid;
    if (c.rank === 'A') mid = `<div class="ace">${u}</div>`;
    else if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K') mid = `<div class="court"><svg class="crown" viewBox="0 0 100 50" aria-hidden="true"><use href="#crown-${c.rank}"/></svg><b>${c.rank}</b>${u}</div>`;
    else mid = '<div class="pips">' + PIPS[c.rank].map(([x, y]) => `<span class="pip${y > 50 ? ' rot' : ''}" style="left:${x}%;top:${y}%">${u}</span>`).join('') + '</div>';
    const idx = `<b>${c.rank}</b>${u}`;
    f.className = 'face front ' + (c.suit === 'H' || c.suit === 'D' ? 'red' : 'black') + (c.rank === '10' ? ' t10' : '');
    f.innerHTML = `<div class="idx tl">${idx}</div><div class="idx br">${idx}</div>${mid}`;
    el.setAttribute('aria-label', cardName(c));
  }
  function makeCard(c) {
    const el = document.createElement('div');
    el.className = 'card' + (c.down ? ' down' : '');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Face-down card');
    el.style.rotate = tilt(c.id) + 'deg';
    el.innerHTML = '<div class="inner"><div class="face front"></div><div class="face back"></div></div>';
    el._down = c.down;
    if (!c.down) fillFace(el, c);
    return el;
  }
  function placeCards(box, cards, ch) {
    const n = cards.length;
    box.style.setProperty('--n', Math.max(n, 1));
    if (n > 5) box.style.setProperty('--f', Math.max(0.14, 1.25 / (n - 1)).toFixed(3));
    else box.style.removeProperty('--f');
    cards.forEach((c, i) => {
      let el = cardEls.get(c.id);
      if (!el) { el = makeCard(c); cardEls.set(c.id, el); ch.added.push(el); }
      else if (el._down && !c.down) { fillFace(el, c); el.classList.remove('down'); el._down = false; ch.flipped.push(el); }
      el.style.setProperty('--i', i);
      el.style.zIndex = String(i + 1);
      if (box.children[i] !== el) box.appendChild(el); // also moves a card into a new hand on a split
    });
  }
  function clearCards() { cardEls.forEach((el) => el.remove()); cardEls.clear(); }
  function dealIn(el, o, faceUp, k) {
    const r = el.getBoundingClientRect();
    const dx = o.left + o.width / 2 - (r.left + r.width / 2), dy = o.top + o.height / 2 - (r.top + r.height / 2);
    const t = { duration: 440, delay: k * 120, easing: 'cubic-bezier(.18,.7,.24,1)', fill: 'backwards' };
    const jobs = [anim(el, [
      { transform: `translate(${dx}px,${dy}px) rotate(-80deg) scale(.62)`, opacity: 0 },
      { opacity: 1, offset: 0.12 },
      { transform: 'none', opacity: 1 },
    ], t)];
    if (faceUp) jobs.push(anim(el.firstChild, [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(180deg)', offset: 0.3 }, { transform: 'rotateY(0deg)' }], t));
    return Promise.all(jobs);
  }
  function flipUp(el) {
    Sound.flip();
    return Promise.all([
      anim(el.firstChild, [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], { duration: 480, easing: 'cubic-bezier(.4,.1,.3,1)' }),
      anim(el, [{ transform: 'none' }, { transform: 'translateY(-14%) scale(1.08)', offset: 0.5 }, { transform: 'none' }], { duration: 480, easing: 'ease-in-out' }),
    ]);
  }

  /* ---------- drawing the table ---------- */
  function makeSeat() {
    const d = document.createElement('div');
    d.className = 'seat';
    const side = (t) => `<button type="button" class="side" data-target="${t}" hidden aria-label="${SIDE_FULL[t]} side bet"><span class="stack"></span><b class="slbl">${SIDE_LABEL[t]}</b><em class="spop"></em></button>`;
    d.innerHTML = '<div class="hand"></div><div class="total"></div><div class="result" aria-live="polite"></div>' +
      `<div class="spots">${side('pp')}<div class="spot" data-target="main" aria-label="Main bet"><div class="stack"></div><div class="ins"></div></div>${side('t3')}</div>` +
      '<div class="amt"></div>';
    return d;
  }
  function setTotal(el, cards, o) {
    const vis = cards.filter((c) => !c.down);
    const v = vis.length ? BJ.handValue(vis) : null;
    if (!v || (!P.totals && !(v.total > 21 || o.bj))) { el.textContent = ''; el.className = 'total'; return; }
    el.textContent = o.bj ? 'Blackjack' : v.soft && v.total < 21 && !o.final ? (v.total - 10) + ' / ' + v.total : String(v.total);
    el.className = 'total' + (v.total > 21 ? ' bust' : '') + (o.bj ? ' bj' : v.total === 21 ? ' t21' : '');
  }
  function setStack(st, cents, max) { if (st._v !== cents) { st.innerHTML = cents ? stackHTML(cents, max) : ''; st._v = cents; } }
  function renderSeat(seat, h, i, ch, n) {
    placeCards(seat.querySelector('.hand'), h ? h.cards : [], ch);
    const turn = S.phase === 'player' && i === S.active, betting = S.phase === 'betting';
    seat.classList.toggle('turn', turn);
    seat.classList.toggle('active', turn && S.hands.length > 1);
    setTotal(seat.querySelector('.total'), h ? h.cards : [], { final: !!(h && h.done), bj: !!(h && h.bj && !h.split) });
    let stake = 0;
    if (betting) stake = S.bet;
    else if (h && !(S.phase === 'done' && swept)) stake = h.bet;
    const hold = betting && pendingFly > 0;
    if (!hold) setStack(seat.querySelector('.spot .stack'), stake);
    const insV = i === 0 && !betting && !(S.phase === 'done' && swept) ? S.insurance : 0;
    setStack(seat.querySelector('.ins'), insV, 4);
    const anySide = S.rules.sidePP || S.rules.side213;
    const spot = seat.querySelector('.spot');
    spot.classList.toggle('sel', betting && anySide && target === 'main' && i === 0);
    if (betting && anySide && i === 0) { spot.setAttribute('role', 'button'); spot.tabIndex = 0; }
    else { spot.removeAttribute('role'); spot.removeAttribute('tabindex'); }
    ['pp', 't3'].forEach((t) => {
      const el = seat.querySelector(`.side[data-target="${t}"]`);
      el.hidden = !(i === 0 && n <= 1 && (t === 'pp' ? S.rules.sidePP : S.rules.side213));
      if (el.hidden) return;
      let v = 0;
      if (betting) v = S.side[t];
      else if (S.sides && S.sides[t] && !sidesSwept) v = S.sides[t].bet;
      if (!hold) setStack(el.querySelector('.stack'), v, 6);
      el.querySelector('.slbl').textContent = v ? SIDE_LABEL[t] + ' ' + money(v) : SIDE_LABEL[t];
      el.classList.toggle('sel', betting && target === t);
      el.disabled = !betting;
    });
    seat.querySelector('.amt').textContent = stake ? money(stake) : betting ? 'Your bet' : '';
    const res = seat.querySelector('.result'), key = S.phase === 'done' && h && h.result ? h.result + h.paid : '';
    if (res._k !== key) {
      res._k = key;
      if (!key) { res.className = 'result'; res.innerHTML = ''; }
      else {
        const net = h.paid - h.bet;
        res.className = 'result show ' + tone(net);
        res.innerHTML = `<b>${RESULT[h.result]}</b><span>${net ? money(net, true) : 'bet back'}</span>`;
      }
    }
  }
  function renderTable(ch) {
    placeCards($('dealerHand'), S.dealer, ch);
    setTotal($('dealerTotal'), S.dealer, { final: S.phase === 'settle' || S.phase === 'done', bj: S.dealerBJ && !S.dealer.some((c) => c.down) });
    const hands = S.hands.length ? S.hands : [null], box = $('seats');
    while (box.children.length < hands.length) box.appendChild(makeSeat());
    while (box.children.length > hands.length) box.lastChild.remove();
    box.dataset.n = hands.length;
    hands.forEach((h, i) => renderSeat(box.children[i], h, i, ch, hands.length));
  }
  function message() {
    const R = S.rules;
    switch (S.phase) {
      case 'betting':
        if (BJ.isBroke(S)) return ['Out of chips'];
        if (target !== 'main') return [`Chips go on ${SIDE_FULL[target]} · up to ${money(Math.min(R.sideMax, R.maxBet) * 100)}`];
        if (!S.bet) return [`Place your bet · ${money(R.minBet * 100)} to ${money(R.maxBet * 100)}` + (R.sidePP || R.side213 ? ' · tap a small circle for a side bet' : '')];
        return [BJ.canDeal(S) ? 'Ready when you are' : `The minimum bet is ${money(R.minBet * 100)}`];
      case 'deal': return [S.needShuffle ? 'Shuffling' : 'Dealing'];
      case 'insurance': return [S.hands[0].bj ? 'Blackjack! Even money?' : 'Dealer shows an ace'];
      case 'peek': return ['Dealer checks for blackjack'];
      case 'player': return [S.hands.length > 1 ? `Hand ${S.active + 1} of ${S.hands.length}: your move` : 'Your move'];
      case 'dealer': case 'settle': return [S.dealerBJ ? 'Dealer has blackjack' : 'Dealer plays'];
      case 'done': {
        const n = S.last ? S.last.net : 0;
        if (n > 0) return ['You win ' + money(n, true), 'big good'];
        if (n < 0) return [(S.last.dealerBJ ? 'Dealer blackjack ' : 'You lose ') + money(n, true), 'big bad'];
        return ['Push', 'big'];
      }
      default: return [''];
    }
  }
  function tweenBank(to) {
    const el = $('bank');
    if (shownBank === null || !speed()) { shownBank = to; el.textContent = money(to); return; }
    if (to === shownBank) return;
    const from = shownBank, t0 = performance.now(), dur = 560 * speed(), id = ++bankTween;
    shownBank = to;
    el.classList.toggle('up', to > from);
    el.classList.toggle('down', to < from);
    const tick = (t) => {
      if (id !== bankTween) return;
      const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
      el.textContent = money(k < 1 ? Math.round((from + (to - from) * e) / 100) * 100 : to);
      if (k < 1) requestAnimationFrame(tick);
      else setTimeout(() => { if (id === bankTween) el.classList.remove('up', 'down'); }, 500);
    };
    requestAnimationFrame(tick);
  }
  function feltLines(R) {
    const lines = [];
    // the third printed line on the felt has room for about 26 letters
    if (R.holeCard !== 'peek') lines.push('Dealer draws after you');
    if (R.charlie) lines.push(`${R.charlie}-card Charlie wins`);
    if (R.sidePP && R.side213) lines.push('Perfect Pairs · 21+3');
    else if (R.sidePP) lines.push('Pairs pay up to 25 to 1');
    else if (R.side213) lines.push('21+3 pays up to 100 to 1');
    if (R.insurance) lines.push('Insurance pays 2 to 1');
    lines.push(`Limits ${shortMoney(R.minBet, R.currency)} to ${shortMoney(R.maxBet, R.currency)}`);
    return lines;
  }
  function renderHud() {
    const R = S.rules;
    if (!holdBank) tweenBank(S.bankroll);
    $('tableLabel').textContent = `${S.table.name} · ${shortMoney(R.minBet, R.currency)} to ${shortMoney(R.maxBet, R.currency)}`;
    $('gauge').style.height = (100 * S.shoe.length / S.size).toFixed(1) + '%';
    $('cutmark').style.bottom = R.continuous ? '-10%' : (100 * (S.size - S.cut) / S.size).toFixed(1) + '%';
    $('shoe').title = R.continuous ? 'The shoe is shuffled before every hand.' :
      `Shoe: ${(S.shoe.length / 52).toFixed(1)} of ${R.decks} deck${R.decks > 1 ? 's' : ''} left. The red line is the cut card.`;
    $('pile').style.setProperty('--h', Math.min(1, S.discards / S.size).toFixed(3));
    $('pile').classList.toggle('has', S.discards > 0);
    const cnt = $('count');
    cnt.hidden = !P.count;
    if (P.count) cnt.innerHTML = `Running <b>${sgn(S.count)}</b> · True <b>${sgn(BJ.trueCount(S), 1)}</b>`;
    $('print1').textContent = 'Blackjack pays ' + R.payout.replace(':', ' to ');
    $('print2').textContent = R.hitSoft17 ? 'Dealer must hit soft 17' : 'Dealer stands on all 17s';
    $('print3').textContent = feltLines(R)[0];
    const [text, cls] = message();
    setMsg(text, cls);
  }
  function showPanel(id) { ['pBet', 'pPlay', 'pIns', 'pDone', 'pBroke'].forEach((p) => { $(p).hidden = p !== id; }); }
  function renderControls() {
    const ph = S.phase, R = S.rules;
    if (ph === 'betting') {
      const broke = BJ.isBroke(S);
      showPanel(broke ? 'pBroke' : 'pBet');
      if (broke) { $('rebuyBtn').textContent = 'Rebuy ' + money(R.bankroll * 100); return; }
      $('chipTray').querySelectorAll('[data-d]').forEach((b) => { b.disabled = busy || !BJ.canAdd(S, Number(b.dataset.d) * 100, target); });
      const p1 = BJ.rebetPlan(S, 1), p2 = BJ.rebetPlan(S, 2), min = R.minBet * 100, total = BJ.betTotal(S);
      const same = (p) => p.main === S.bet && p.pp === S.side.pp && p.t3 === S.side.t3;
      $('clearBtn').disabled = busy || !total;
      $('rebetBtn').disabled = busy || !S.lastBet || p1.main < min || same(p1);
      $('doubleRebetBtn').disabled = busy || !S.lastBet || p2.main < min || same(p2) || p2.total === p1.total;
      $('dealBtn').disabled = busy || !BJ.canDeal(S);
      $('dealBtn').textContent = total ? 'Deal ' + money(total) : 'Deal';
    } else if (ph === 'insurance') {
      showPanel('pIns');
      const h = S.hands[0], [pn, pd] = BJ.PAYOUTS[R.payout];
      $('insText').textContent = h.bj
        ? `You have blackjack. Take ${money(h.bet)} now, whatever the dealer has, or play on for ${money(Math.round(h.bet * pn / pd))}?`
        : `Insurance costs ${money(BJ.insuranceCost(S))} and pays 2 to 1 if the dealer has blackjack.`;
      $('insYes').firstChild.textContent = h.bj ? 'Even money ' : 'Insure ' + money(BJ.insuranceCost(S)) + ' ';
      $('insNo').firstChild.textContent = h.bj ? 'Play on ' : 'No thanks ';
      $('insYes').disabled = busy || !BJ.canInsure(S);
      $('insNo').disabled = busy;
    } else if (ph === 'done') {
      showPanel('pDone');
      const p = BJ.rebetPlan(S, 1), can = p.main >= R.minBet * 100;
      const d = S.last ? S.last.dealer : 0;
      $('doneText').textContent = S.last && S.last.dealerBJ ? 'The dealer had blackjack.' : d > 21 ? `The dealer busted with ${d}.` :
        S.dealer.length < 2 ? 'The dealer did not need a second card.' : `The dealer finished on ${d}.`;
      $('againBtn').textContent = can ? 'Deal again ' + money(p.total) : 'Continue';
      $('againBtn').disabled = busy;
      $('changeBtn').disabled = busy;
    } else {
      showPanel('pPlay');
      const my = ph === 'player' && !busy;
      const can = { H: BJ.canHit(S), S: BJ.canStand(S), D: BJ.canDouble(S), P: BJ.canSplit(S), R: BJ.canSurrender(S) };
      const advice = my && P.hints ? BJ.advise(S) : null;
      Object.keys(MOVE_BTN).forEach((m) => {
        const b = $(MOVE_BTN[m]);
        b.disabled = !my || !can[m];
        b.classList.toggle('rec', !!advice && advice.move === m);
      });
      $('surrenderBtn').style.visibility = my && can.R ? 'visible' : 'hidden';
      $('hint').innerHTML = advice ? `Chart: <b>${MOVE[advice.move]}</b> · ${esc(advice.why)}` : ph === 'player' && !busy ? '' : '&nbsp;';
    }
  }
  // Draws everything from the state; with animate, new cards fly from the shoe, turned cards flip and cards that
  // moved (a split, a hand that grew) glide to their new place.
  function sync(animate) {
    const before = new Map();
    if (animate !== false) cardEls.forEach((el, id) => before.set(id, el.getBoundingClientRect()));
    const ch = { added: [], flipped: [] };
    renderTable(ch);
    renderHud();
    renderControls();
    if (animate === false) return Promise.resolve();
    const jobs = [], shoe = $('shoeMouth').getBoundingClientRect();
    ch.added.forEach((el, k) => jobs.push(dealIn(el, shoe, !el._down, k)));
    ch.flipped.forEach((el) => jobs.push(flipUp(el)));
    cardEls.forEach((el, id) => {
      const a = before.get(id);
      if (!a || ch.added.indexOf(el) >= 0) return;
      const b = el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        jobs.push(anim(el, [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)' }));
      }
    });
    return Promise.all(jobs);
  }

  /* ---------- table moments ---------- */
  async function shuffleAnim() {
    Sound.shuffle();
    if (!speed()) return;
    const box = document.createElement('div');
    box.className = 'riffle';
    box.innerHTML = Array.from({ length: 12 }, () => '<i class="cb"></i>').join('');
    $('felt').appendChild(box);
    const cards = Array.from(box.children);
    await Promise.all(cards.map((c, i) => {
      const left = i % 2 === 0, sx = left ? -72 : 72, rot = left ? -10 : 10;
      const from = `translate(${sx}%,${-i * 1.2}px) rotate(${rot}deg)`;
      return anim(c, [{ transform: from }, { transform: from, offset: 0.22 + i * 0.035 }, { transform: `translate(0,${-i * 1.5}px) rotate(0deg)` }],
        { duration: 1050, easing: 'ease-in-out', fill: 'forwards' });
    }));
    const s = $('shoeMouth').getBoundingClientRect(), r = box.getBoundingClientRect();
    await anim(box, [{ transform: 'none', opacity: 1 }, { transform: `translate(${s.left + s.width / 2 - (r.left + r.width / 2)}px,${s.top + s.height / 2 - (r.top + r.height / 2)}px) scale(.55)`, opacity: 0 }],
      { duration: 420, easing: 'ease-in', fill: 'forwards' });
    box.remove();
  }
  async function peekAnim() {
    const hole = S.dealer[1] && cardEls.get(S.dealer[1].id);
    if (!hole) return;
    await anim(hole, [{ transform: 'none' }, { transform: 'translateY(-9%) rotateX(26deg)', offset: 0.35 }, { transform: 'translateY(-9%) rotateX(26deg)', offset: 0.7 }, { transform: 'none' }],
      { duration: 900, easing: 'ease-in-out' });
  }
  function clearPops() { document.querySelectorAll('.spop.show').forEach((p) => { p.className = 'spop'; p.textContent = ''; }); }
  async function collectAnim() {
    const pile = $('pile').getBoundingClientRect(), els = Array.from(cardEls.values());
    document.querySelectorAll('.result.show').forEach((r) => r.classList.add('gone'));
    clearPops();
    await Promise.all(els.map((el, k) => {
      const r = el.getBoundingClientRect();
      const dx = pile.left + pile.width / 2 - (r.left + r.width / 2), dy = pile.top + pile.height / 2 - (r.top + r.height / 2);
      const t = { duration: 430, delay: k * 35, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' };
      return Promise.all([
        anim(el, [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(90deg) scale(.5)`, opacity: 0.1 }], t),
        el._down ? null : anim(el.firstChild, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], t),
      ]);
    }));
    clearCards();
  }
  // Side bets are settled as soon as the first cards are out: winners are paid from the rack, losers swept away.
  async function sideAnim() {
    const sd = S.sides, dealer = $('dealerHand'), bank = $('bank'), jobs = [], wins = [];
    // the result shows in a label on each side circle (a toast would cover the dealer's cards)
    holdBank = true;
    ['pp', 't3'].forEach((t, k) => {
      const b = sd[t];
      if (!b) return;
      const el = sideEl(t), st = el.querySelector('.stack'), pop = el.querySelector('.spop'), size = st.offsetWidth || 24;
      pop.textContent = b.kind ? `${SIDE_SHORT[b.kind]} ${money(b.paid - b.bet, true)}` : t === 'pp' ? 'No pair' : 'No hand';
      pop.className = 'spop show ' + (b.kind ? 'good' : 'bad');
      if (b.kind) {
        wins.push(`${SIDE_FULL[t]}: ${b.name}, ${b.odds} to 1`);
        jobs.push((async () => {
          await flyChips(b.paid - b.bet, dealer, st, { size: size, delay: k * 120 });
          setStack(st, b.paid, 6);
          await wait(450);
          const f = flyChips(b.paid, st, bank, { size: size, fade: true, duration: 520 });
          setStack(st, 0);
          await f;
        })());
      } else {
        jobs.push((async () => {
          await wait(420 + k * 120);
          const f = flyChips(b.bet, st, dealer, { size: size, fade: true, duration: 480 });
          setStack(st, 0);
          await f;
        })());
      }
    });
    if (wins.length) Sound.win();
    await Promise.all(jobs);
    sidesSwept = true;
    holdBank = false;
    tweenBank(S.bankroll);
    setTimeout(() => { if (S && S.phase !== 'betting') document.querySelectorAll('.spop.show.bad').forEach((p) => { p.className = 'spop'; }); }, 2400);
  }
  async function settleAnim() {
    const L = S.last;
    holdBank = true; swept = false;
    await sync();
    const best = Math.max(...S.hands.map((h) => h.paid - h.bet));
    if (S.hands.some((h) => h.result === 'blackjack')) Sound.blackjack();
    else if (L.net > 0 || best > 0) Sound.win();
    else if (L.net < 0) Sound.lose();
    else Sound.push();
    await wait(420);
    const dealerSpot = $('dealerHand'), bank = $('bank'), pays = [];
    S.hands.forEach((h, i) => {
      const win = h.paid - h.bet;
      if (win > 0) pays.push(flyChips(win, dealerSpot, stackEl(i), { delay: i * 120 }).then(() => setStack(stackEl(i), h.paid)));
    });
    if (L.insurancePaid) {
      const ins = seatEl(0).querySelector('.ins');
      pays.push(flyChips(L.insurancePaid - L.insurance, dealerSpot, ins, { size: ins.offsetWidth }).then(() => setStack(ins, L.insurancePaid, 4)));
    }
    if (pays.length) { Sound.chips(); await Promise.all(pays); await wait(380); }
    const sweeps = [];
    S.hands.forEach((h, i) => {
      const st = stackEl(i);
      if (h.paid > 0) sweeps.push(flyChips(h.paid, st, bank, { delay: i * 90, fade: true, duration: 520 }));
      else sweeps.push(flyChips(h.bet, st, dealerSpot, { delay: i * 90, fade: true, duration: 520 }));
      setStack(st, 0);
    });
    if (L.insurance) {
      const ins = seatEl(0).querySelector('.ins');
      sweeps.push(flyChips(L.insurancePaid || L.insurance, ins, L.insurancePaid ? bank : dealerSpot, { fade: true, size: ins.offsetWidth, duration: 520 }));
      setStack(ins, 0);
    }
    swept = true;
    holdBank = false;
    setTimeout(() => { if (S) tweenBank(S.bankroll); }, 200 * speed());
    await Promise.all(sweeps);
  }
  async function show(ev) {
    switch (ev.kind) {
      case 'shuffle':
        renderHud();
        if (S.rules.continuous) { // a machine shuffle between hands: quick and quiet
          Sound.card();
          await anim($('shoe'), [{ transform: 'none' }, { transform: 'scale(1.08) rotate(-3deg)' }, { transform: 'none' }], { duration: 320, easing: 'ease-in-out' });
          break;
        }
        setMsg('Shuffling a fresh shoe');
        await shuffleAnim();
        renderHud();
        toast(`Fresh shoe: ${S.rules.decks} deck${S.rules.decks > 1 ? 's' : ''} shuffled`);
        break;
      case 'card':
        Sound.card();
        await sync();
        if (S.midShuffle) { S.midShuffle = false; toast('The shoe ran out mid-round: the dealer shuffled the discards'); }
        await wait(ev.to === 'd' && S.phase !== 'deal' ? 300 : 60);
        break;
      case 'side': await sync(); await sideAnim(); await sync(); break;
      case 'peek':
        setMsg('Dealer checks for blackjack');
        await peekAnim();
        if (ev.bj) { setMsg('Dealer has blackjack'); await wait(250); }
        await sync();
        break;
      case 'reveal': await sync(); await wait(300); break;
      case 'settle': await settleAnim(); break;
      default: await sync();
    }
  }
  // Lets the table play its own steps (dealing, side bets, the dealer's turn, paying) until the player has to act.
  async function run() {
    if (busy || !S) return;
    busy = true;
    renderControls();
    try {
      let ev;
      while ((ev = BJ.step(S))) { await show(ev); save(); }
    } catch (e) { console.error(e); }
    busy = false;
    if (S) { touch(); await sync(); }
    save();
  }

  /* ---------- player input ---------- */
  // Time at the table: the gaps between moves, ignoring breaks longer than ten minutes.
  function newSession() { const now = Date.now(); return { id: now.toString(36) + Math.random().toString(36).slice(2, 6), started: now, last: now, played: 0 }; }
  function touch() {
    if (!S || !S.session) return;
    const now = Date.now(), gap = now - S.session.last;
    if (gap > 0 && gap < 600000) S.session.played += gap;
    S.session.last = now;
  }
  async function betFly(cents, from, to) {
    pendingFly++;
    renderHud(); renderControls();
    await flyChips(cents, from, to);
    pendingFly--;
    if (!pendingFly) {
      await sync();
      if (dealQueued) { dealQueued = false; deal(); }
    }
  }
  function placeChip(btn) {
    if (busy || !S || S.phase !== 'betting') return;
    const d = Number(btn.dataset.d) * 100;
    if (!BJ.addBet(S, d, target)) {
      const cap = target === 'main' ? S.rules.maxBet : Math.min(S.rules.sideMax, S.rules.maxBet);
      toast(d > S.bankroll ? 'Not enough chips for that one' : `The ${target === 'main' ? 'table' : SIDE_FULL[target]} maximum is ${money(cap * 100)}`);
      return;
    }
    Sound.unlock(); Sound.chip();
    betFly(d, btn, targetStack(target));
    save();
  }
  function selectTarget(t) {
    if (busy || !S || S.phase !== 'betting' || !t) return;
    target = t === target && t !== 'main' ? 'main' : t;
    sync(false);
  }
  function clearBet() {
    if (busy || !S || S.phase !== 'betting' || !BJ.betTotal(S)) return;
    flyChips(BJ.betTotal(S), stackEl(0), $('bank'), { fade: true });
    BJ.clearBet(S);
    sync(); save();
  }
  function rebetUI(mult) {
    if (busy || !S || S.phase !== 'betting' || !BJ.rebet(S, mult)) return;
    Sound.unlock(); Sound.chips();
    target = 'main';
    seatEl(0).querySelectorAll('.stack').forEach((st) => setStack(st, 0));
    betFly(BJ.betTotal(S), $('bank'), stackEl(0));
    save();
  }
  function deal() {
    if (!S) return;
    if (pendingFly && BJ.canDeal(S)) { dealQueued = true; return; }
    if (busy || !BJ.canDeal(S)) return;
    Sound.unlock();
    touch();
    BJ.deal(S);
    swept = false; sidesSwept = !S.sides; target = 'main';
    save();
    run();
  }
  async function act(name) {
    if (busy || !S || S.phase !== 'player') return;
    const can = { hit: BJ.canHit, stand: BJ.canStand, double: BJ.canDouble, split: BJ.canSplit, surrender: BJ.canSurrender }[name];
    if (!can || !can(S)) return;
    Sound.unlock();
    touch();
    busy = true;
    renderControls();
    const i = S.active, h = S.hands[i];
    if (name === 'double' || name === 'split') { Sound.chips(); await flyChips(h.bet, $('bank'), stackEl(i)); }
    const ev = { hit: BJ.hit, stand: BJ.stand, double: BJ.double, split: BJ.split, surrender: BJ.surrender }[name](S);
    if (ev && ev.kind === 'card') Sound.card();
    await sync();
    if (P.hints && S.advice && S.advice.best !== S.advice.move) toast(`The chart says ${MOVE[S.advice.best].toLowerCase()} here (${S.advice.why})`);
    busy = false;
    save();
    run();
  }
  async function insure(take) {
    if (busy || !S || S.phase !== 'insurance' || (take && !BJ.canInsure(S))) return;
    touch();
    busy = true;
    renderControls();
    if (take && !S.hands[0].bj) {
      const ins = seatEl(0).querySelector('.ins');
      Sound.chips();
      await flyChips(BJ.insuranceCost(S), $('bank'), ins, { size: ins.offsetWidth || 24 });
    }
    BJ.insurance(S, take);
    if (P.hints && take) toast(S.hands[0].bj ? 'The chart never takes even money' : 'The chart never takes insurance');
    await sync();
    busy = false;
    save();
    run();
  }
  async function nextRound(rebet) {
    if (busy || !S || S.phase !== 'done') return;
    touch();
    busy = true;
    renderControls();
    await collectAnim();
    BJ.collect(S);
    swept = false;
    busy = false;
    await sync();
    if (rebet && BJ.rebet(S, 1)) {
      Sound.chips();
      seatEl(0).querySelectorAll('.stack').forEach((st) => setStack(st, 0));
      await betFly(BJ.betTotal(S), $('bank'), stackEl(0));
      deal();
    }
    save();
  }
  function rebuy() {
    if (busy || !S || !BJ.rebuy(S)) return;
    S.history.push(S.bankroll);
    Sound.chips();
    toast(`Rebuy: ${money(S.rules.bankroll * 100, true)} in chips`);
    sync(); save();
  }

  /* ---------- sessions: every visit to a table, kept when you leave ---------- */
  const loadSessions = () => readJSON(SESSIONS_KEY, []);
  function downsample(arr, n) {
    if (arr.length <= n) return arr.slice();
    const out = [];
    for (let i = 0; i < n; i++) out.push(arr[Math.round(i * (arr.length - 1) / (n - 1))]);
    return out;
  }
  function record(s) {
    const onTable = s.phase === 'betting' || s.phase === 'done' ? 0 : s.hands.reduce((a, h) => a + h.bet, 0) + s.insurance;
    return { id: s.session.id, table: s.table.name, tableId: s.table.id, felt: s.table.felt, rules: s.rules,
      started: s.session.started, ended: s.session.last, played: s.session.played, chips: s.bankroll + BJ.betTotal(s) + onTable,
      stats: JSON.parse(JSON.stringify(s.stats)), history: downsample(s.history, 120) };
  }
  function archive(s) {
    if (!s || !s.stats.rounds) return null;
    const rec = record(s), list = loadSessions().filter((r) => r.id !== rec.id);
    list.push(rec);
    writeJSON(SESSIONS_KEY, list.slice(-200));
    return rec;
  }
  async function leaveTable() {
    if (busy || !S) return;
    if (S.phase !== 'betting' && S.phase !== 'done') { toast('Finish this round first'); return; }
    if (S.phase === 'done') { busy = true; await collectAnim(); busy = false; BJ.collect(S); }
    BJ.clearBet(S);
    touch();
    const rec = archive(S);
    S = null;
    save();
    clearCards();
    $('seats').innerHTML = '';
    $('bank').textContent = ''; $('tableLabel').textContent = 'Bankroll'; shownBank = null;
    if (openSheetId) { $(openSheetId).classList.remove('open'); openSheetId = null; }
    if (rec) { statsView = { tab: 'sessions', rec: rec.id, ended: true }; renderStats(); openSheet('stats'); }
    else openSetup();
  }

  /* ---------- sheets ---------- */
  function openSheet(id) {
    if (openSheetId && openSheetId !== id) $(openSheetId).classList.remove('open');
    lastFocus = openSheetId ? lastFocus : document.activeElement;
    openSheetId = id;
    const el = $(id);
    el.classList.add('open');
    el.querySelector('.box').scrollTop = 0;
    const f = el.querySelector('[aria-selected=true], button:not([hidden]):not([data-close]), input, select');
    if (f) f.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!openSheetId || (openSheetId === 'setup' && !S)) return;
    const was = openSheetId;
    $(was).classList.remove('open');
    openSheetId = null;
    if (!S) { openSetup(); return; } // no table yet: back to the lobby
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function fieldHTML(f, val, pre, cur) {
    const id = pre + '-' + f.k, note = f.note ? `<small>${f.note}</small>` : '';
    if (f.type === 'seg') {
      return `<div class="field"><span class="lbl" id="${id}-l">${f.label}${note}</span><div class="seg" role="radiogroup" aria-labelledby="${id}-l">` +
        f.opts.map((o, i) => `<label><input type="radio" name="${id}" id="${id}-${i}" value="${i}"${String(o[0]) === String(val) ? ' checked' : ''}><span>${o[1]}</span></label>`).join('') + '</div></div>';
    }
    if (f.type === 'toggle' || f.type === 'tv') {
      const on = f.type === 'tv' ? val === f.on : !!val;
      return `<label class="field row-f" for="${id}"><span class="lbl">${f.label}${note}</span><input type="checkbox" class="sw" id="${id}" name="${id}"${on ? ' checked' : ''}></label>`;
    }
    if (f.type === 'select') {
      const opts = f.opts.indexOf(Number(val)) >= 0 ? f.opts : f.opts.concat([Number(val)]).sort((a, b) => a - b);
      return `<label class="field row-f" for="${id}"><span class="lbl">${f.label}</span><select id="${id}" name="${id}">` +
        opts.map((o) => `<option value="${o}"${o === Number(val) ? ' selected' : ''}>${cur}${o.toLocaleString('en-US')}</option>`).join('') + '</select></label>';
    }
    if (f.type === 'money') {
      return `<div class="field"><label class="lbl" for="${id}">${f.label}</label><div class="money-in"><span class="cur">${cur}</span>` +
        `<input id="${id}" name="${id}" type="number" inputmode="numeric" min="1" max="10000000" step="1" value="${val}"></div>` +
        `<div class="quick">${f.quick.map((q) => `<button type="button" class="pill" data-quick="${q}">${cur}${q.toLocaleString('en-US')}</button>`).join('')}</div></div>`;
    }
    if (f.type === 'range') {
      return `<div class="field"><label class="lbl" for="${id}">${f.label}<output id="${id}-o" for="${id}">${f.fmt(val)}</output></label>` +
        `<input type="range" id="${id}" name="${id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${val}"></div>`;
    }
    return '';
  }
  function readField(f, pre) {
    const id = pre + '-' + f.k;
    if (f.type === 'seg') { const c = document.querySelector(`input[name="${id}"]:checked`); return c ? f.opts[Number(c.value)][0] : undefined; }
    if (f.type === 'toggle') return $(id).checked;
    if (f.type === 'tv') return $(id).checked ? f.on : f.off;
    return Number($(id).value);
  }

  /* ---------- the lobby ---------- */
  const ruleFields = () => RULE_FIELDS.reduce((a, s) => a.concat(s[1]), []);
  const myTables = () => readJSON(TABLES_KEY, []);
  const findTable = (id) => BJ.TABLES.concat(myTables()).find((t) => t.id === id) || null;
  function readSetup() {
    const v = {};
    BUYIN_FIELDS.concat(ruleFields()).forEach((f) => { v[f.k] = readField(f, 'r'); });
    return v;
  }
  function rulesOnly(v) { const r = Object.assign({}, v); delete r.bankroll; delete r.currency; return BJ.normalizeRules(r); }
  function tableTags(r) {
    const tags = [r.decks + (r.decks > 1 ? ' decks' : ' deck'), r.hitSoft17 ? 'H17' : 'S17', 'BJ ' + r.payout];
    if (r.holeCard !== 'peek') tags.push(r.holeCard === 'obo' ? 'No hole card (first bet only)' : 'No hole card');
    if (r.doubleOn !== 'any') tags.push(r.doubleOn === 'none' ? 'No doubling' : 'Double ' + r.doubleOn.replace('-', '–'));
    if (r.das && r.doubleOn !== 'none' && r.maxHands > 1) tags.push('DAS');
    tags.push(r.maxHands > 1 ? 'Split to ' + r.maxHands : 'No splits');
    if (r.resplitAces && r.maxHands > 2) tags.push('Resplit aces');
    if (r.hitSplitAces) tags.push('Hit split aces');
    if (r.surrender === 'late') tags.push('Surrender');
    if (r.charlie) tags.push(r.charlie + '-card Charlie');
    if (r.continuous) tags.push('Shuffled every hand');
    if (r.sidePP) tags.push('Perfect Pairs');
    if (r.side213) tags.push('21+3');
    return tags;
  }
  function renderLobby() {
    const v = readSetup(), cur = v.currency;
    $('lobbyTabs').querySelectorAll('[data-group]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.group === lobby.group)));
    const list = lobby.group === 'mine' ? myTables() : BJ.TABLES.filter((t) => t.group === lobby.group);
    $('tableList').innerHTML = list.map((t) => {
      const r = t.rules, on = t.id === lobby.id, low = r.minBet > v.bankroll;
      return `<div class="tcard${on ? ' on' : ''}${low ? ' low' : ''}${t.group === 'mine' ? ' mine' : ''}" data-felt="${t.felt}">` +
        `<button type="button" class="tpick" data-table="${t.id}" aria-pressed="${on}">` +
        `<span class="tname">${esc(t.name)}</span><span class="tplace">${esc(t.place)}</span>` +
        `<span class="tlim">${money(r.minBet * 100, false, cur)} to ${money(r.maxBet * 100, false, cur)}</span>` +
        `<span class="ttags">${tableTags(r).join(' · ')}</span>` +
        `<span class="tedge">House edge ${BJ.houseEdge(r).toFixed(2)}%${low ? ' · the minimum is above your buy-in' : ''}${on && lobby.edited ? ' · rules changed below' : ''}</span></button>` +
        (t.group === 'mine' ? `<button type="button" class="tdel" data-del="${t.id}">Remove</button>` : '') + '</div>';
    }).join('') || '<p class="tempty">No saved tables yet. Choose any table, change its rules below and save them here.</p>';
    $('lobbyStatsBtn').hidden = !loadSessions().length;
    updateLobbySum();
  }
  function updateLobbySum() {
    const v = readSetup(), t = findTable(lobby.id), err = BJ.checkRules(v);
    const name = (t ? t.name : 'Custom table') + (lobby.edited ? ' with your rules' : '');
    $('lobbySum').innerHTML = `<b>${esc(name)}</b> · ${money(v.minBet * 100, false, v.currency)} to ${money(v.maxBet * 100, false, v.currency)} · house edge ${BJ.houseEdge(v).toFixed(2)}%`;
    $('setupErr').textContent = err.join(' ');
    $('sitBtn').textContent = S ? 'Sit down' : 'Sit down with ' + money(v.bankroll * 100, false, v.currency);
  }
  function renderSetupFields(values) {
    $('buyin').innerHTML = BUYIN_FIELDS.map((f) => fieldHTML(f, values[f.k], 'r', values.currency)).join('');
    $('setupFields').innerHTML = RULE_FIELDS.map(([title, fields]) =>
      `<h3>${title}</h3>` + fields.map((f) => fieldHTML(f, values[f.k], 'r', values.currency)).join('')).join('');
    $('r-penetration').disabled = !!values.continuous;
  }
  function selectTable(id) {
    const t = findTable(id);
    if (!t) return;
    const v = readSetup();
    lobby.id = id; lobby.group = t.group; lobby.edited = false;
    renderSetupFields(Object.assign({ bankroll: v.bankroll, currency: v.currency }, t.rules));
    $('saveName').value = '';
    renderLobby();
  }
  function markEdited() {
    const t = findTable(lobby.id), v = rulesOnly(readSetup());
    lobby.edited = !!t && Object.keys(t.rules).some((k) => String(t.rules[k]) !== String(v[k]));
    $('r-penetration').disabled = !!v.continuous;
    renderLobby();
  }
  function openSetup() {
    const base = S ? Object.assign({}, S.rules) : Object.assign({}, BJ.DEFAULT_RULES, { bankroll: (readJSON(KEY, {}).lastBuyIn) || 1000 });
    const t = findTable(S && S.table ? S.table.id : lobby.id) || BJ.TABLES[0];
    lobby.id = t.id; lobby.group = t.group; lobby.edited = false;
    $('setup').classList.toggle('first', !S);
    renderSetupFields(Object.assign({ bankroll: base.bankroll, currency: base.currency }, t.rules));
    renderLobby();
    openSheet('setup');
  }
  function saveTable() {
    const v = rulesOnly(readSetup()), t = findTable(lobby.id);
    const name = $('saveName').value.trim() || (t ? t.name + ' (mine)' : 'My table');
    const list = myTables();
    const mine = { id: 'my-' + Date.now().toString(36), group: 'mine', name: name.slice(0, 40), place: 'Saved ' + fmtDate(Date.now()), felt: t ? t.felt : P.felt, rules: v };
    list.push(mine);
    writeJSON(TABLES_KEY, list);
    toast(`Saved to My tables: ${mine.name}`);
    selectTable(mine.id);
  }
  function removeTable(btn) {
    if (!btn.dataset.sure) { btn.dataset.sure = '1'; btn.textContent = 'Tap to remove'; return; }
    writeJSON(TABLES_KEY, myTables().filter((t) => t.id !== btn.dataset.del));
    if (lobby.id === btn.dataset.del) lobby.id = '';
    renderLobby();
  }
  async function startGame(rules, meta) {
    if (S) archive(S);
    S = BJ.newGame(rules);
    S.table = meta;
    S.session = newSession();
    P.felt = meta.felt || P.felt;
    applyPrefs();
    clearCards();
    $('seats').innerHTML = '';
    swept = true; sidesSwept = true; shownBank = null; pendingFly = 0; target = 'main';
    buildChipTray();
    if (openSheetId) { $(openSheetId).classList.remove('open'); openSheetId = null; }
    await sync(false);
    save();
    try { const d = readJSON(KEY, {}); d.lastBuyIn = rules.bankroll; writeJSON(KEY, d); } catch (e) { /* ignore */ }
    busy = true;
    renderControls();
    setMsg('Shuffling a fresh shoe');
    await shuffleAnim();
    busy = false;
    await sync();
  }

  /* ---------- menu ---------- */
  function renderPrefs() { $('prefFields').innerHTML = PREF_FIELDS.map((f) => fieldHTML(f, P[f.k], 'p', '')).join(''); }
  function applyPrefs() {
    document.body.dataset.felt = P.felt;
    document.body.dataset.back = P.back;
    document.body.classList.toggle('calm', !speed());
    Sound.set(P.sound);
  }
  function rulesRows(R) {
    const dbl = { any: 'Any first two cards', '9-11': 'Hard 9, 10 or 11', '10-11': 'Hard 10 or 11', none: 'Not allowed' }[R.doubleOn];
    const m = (c) => money(c, false, R.currency);
    const rows = [
      ['Table limits', `${m(R.minBet * 100)} to ${m(R.maxBet * 100)}`],
      ['Buy-in', m(R.bankroll * 100)],
      ['Shoe', `${R.decks} deck${R.decks > 1 ? 's' : ''}, ` + (R.continuous ? 'shuffled every hand' : `reshuffled after about ${Math.round(R.penetration * 100)}%`)],
      ['Blackjack pays', R.payout.replace(':', ' to ')],
      ['Dealer', (R.hitSoft17 ? 'Hits soft 17' : 'Stands on all 17s') + ', ' + { peek: 'peeks for blackjack under an ace or a ten',
        enhc: 'takes the second card after you; a dealer blackjack takes doubles and splits too',
        obo: 'takes the second card after you; a dealer blackjack takes only your first bet' }[R.holeCard]],
      ['Double down', dbl + (R.doubleOn !== 'none' && R.das && R.maxHands > 1 ? ', also after a split' : '')],
      ['Splits', R.maxHands > 1 ? `Up to ${R.maxHands} hands; aces ${R.resplitAces ? 'can be resplit' : 'once'}, ${R.hitSplitAces ? 'and may be hit' : 'one card each'}` : 'Not allowed'],
      ['Surrender', R.surrender === 'late' ? 'Late surrender, half the bet back' + (R.holeCard === 'peek' ? '' : ' (not against an ace)') : 'Not offered'],
      ['Insurance', R.insurance ? 'Offered under an ace, pays 2 to 1' : 'Not offered'],
    ];
    if (R.charlie) rows.push(['Charlie', `${R.charlie} cards without busting win`]);
    if (R.sidePP) rows.push(['Perfect Pairs', `Mixed 6, coloured 12, perfect 25 to 1; house edge ${BJ.ppEdge(R.decks).toFixed(2)}%`]);
    if (R.side213) rows.push(['21+3', `Flush 5, straight 10, trips 30, straight flush 40, suited trips 100 to 1; house edge ${BJ.t3Edge(R.decks).toFixed(2)}%`]);
    if (R.sidePP || R.side213) rows.push(['Side bet limit', m(Math.min(R.sideMax, R.maxBet) * 100)]);
    rows.push(['House edge', `About ${BJ.houseEdge(R).toFixed(2)}% with perfect basic strategy`]);
    return rows;
  }
  function renderRules() {
    $('menuTitle').textContent = S.table.name;
    $('rulesList').innerHTML = rulesRows(S.rules).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  }

  /* ---------- statistics ---------- */
  function spark(hist, w, h) {
    const H = hist.length > 1 ? hist : [hist[0], hist[0]];
    const lo = Math.min(...H), hi = Math.max(...H), span = hi - lo || 1;
    const pts = H.map((v, i) => `${(w * i / (H.length - 1)).toFixed(1)},${(h - 4 - (h - 8) * (v - lo) / span).toFixed(1)}`).join(' ');
    return { pts: pts, lo: lo, hi: hi, y0: (h - 4 - (h - 8) * (H[0] - lo) / span).toFixed(1), last: H[H.length - 1], first: H[0] };
  }
  function sideRows(st, R, m) {
    const rows = [];
    [['pp', 'Perfect Pairs', BJ.ppEdge(R.decks)], ['t3', '21+3', BJ.t3Edge(R.decks)]].forEach(([t, name, edge]) => {
      const x = st.sides && st.sides[t];
      if (x && x.bets) rows.push([name, `${x.wins} of ${x.bets} won · ${m(x.paid - x.wagered, true)}`, `house edge ${edge.toFixed(2)}%`]);
    });
    return rows;
  }
  function sessionView(rec, live) {
    const st = rec.stats, R = rec.rules, m = (c, sg) => money(c, sg, R.currency);
    const sp = spark(rec.history, 300, 96);
    const perHour = rec.played > 120000 ? Math.round(st.rounds / (rec.played / 3600000)) : null;
    const bar = (label, n, colour) => `<div class="r"><span>${label}</span><div class="t"><i style="width:${st.hands ? 100 * n / st.hands : 0}%;background:${colour}"></i></div><span class="n">${n}</span></div>`;
    const list = (rows) => `<dl class="list">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
    const sides = sideRows(st, R, m);
    const rebuys = st.rebuys ? `${st.rebuys} · ${m(st.bought - st.start)}` : 'None';
    return `<div class="sess-head"><b>${esc(rec.table)}</b><span>${fmtDate(rec.started)} · ${fmtDur(rec.played)}${live ? ' so far' : ''}</span></div>` +
      `<div class="figs3"><div><span>Result</span><b class="${tone(st.net)}">${m(st.net, true)}</b></div>` +
      `<div><span>${live ? 'Chips now' : 'Left with'}</span><b>${m(rec.chips)}</b></div>` +
      `<div><span>Rounds</span><b>${st.rounds}</b></div></div>` +
      `<svg class="spark" viewBox="0 0 300 96" preserveAspectRatio="none" role="img" aria-label="Chips after each round">` +
      `<line x1="0" x2="300" y1="${sp.y0}" y2="${sp.y0}" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>` +
      `<polyline points="0,96 ${sp.pts} 300,96" fill="rgba(232,201,111,.14)" stroke="none"/>` +
      `<polyline points="${sp.pts}" fill="none" stroke="#e8c96f" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>` +
      `<div class="spark-l"><span>Start ${m(sp.first)}</span><span>Low ${m(sp.lo)} · High ${m(sp.hi)}</span></div>` +
      `<div class="bars">${bar('Won', st.won, '#e8c96f')}${bar('Pushed', st.pushed, '#9aa3ad')}${bar('Lost', st.lost, '#c8333b')}</div>` +
      '<h4>Money</h4>' + list([
        ['Buy-in', m(st.start)], ['Rebuys', rebuys], ['Total bet', m(st.wagered)],
        ['Average bet', st.rounds ? m(Math.round(st.wagered / st.rounds / 100) * 100) : '–'], ['Biggest bet', m(st.biggestBet)],
        ['Best round', m(st.best, true)], ['Worst round', m(st.worst, true)], ['Peak', m(st.peak)], ['Low', m(st.low)],
        ['Return on bets', st.wagered ? sgn(100 * st.net / st.wagered, 2) + '%' : '–'],
      ]) +
      '<h4>Play</h4>' + list([
        ['Hands', st.hands], perHour ? ['Rounds per hour', perHour] : null,
        ['Blackjacks', st.blackjacks], ['Busts', st.busts], ['Doubles won', `${st.doublesWon} of ${st.doubles}`], ['Splits', st.splits],
        ['Surrenders', st.surrenders], R.charlie ? ['Charlies', st.charlies] : null,
        ['Insurance taken', st.insurance ? `${st.insurance} · won ${st.insuranceWon}` : '0'],
        ['Longest winning run', plural(st.winStreak, 'round')],
        ['Longest losing run', plural(st.loseStreak, 'round')],
        ['Moves that match the chart', st.decisions ? `${pct(st.correct, st.decisions)} of ${st.decisions}` : '–'],
      ]) +
      '<h4>Dealer</h4>' + list([
        ['Dealer busts', `${st.dealerBusts} · ${pct(st.dealerBusts, st.rounds)} of rounds`], ['Dealer blackjacks', st.dealerBJs],
      ]) +
      (sides.length ? '<h4>Side bets</h4>' + list(sides.map(([k, v, e]) => [k, `${v}<br><small>${e}</small>`])) : '') +
      `<h4>Rules</h4><p class="note">${tableTags(R).join(' · ')} · ${money(R.minBet * 100, false, R.currency)} to ${money(R.maxBet * 100, false, R.currency)}</p>`;
  }
  function cardsMini(codes) {
    return codes.map((c) => { const s = c.slice(-1); return `<i class="mc${s === 'H' || s === 'D' ? ' r' : ''}">${c.slice(0, -1)}${SUIT_CH[s]}</i>`; }).join('');
  }
  function handsView() {
    if (!S.log.length) return '<p class="empty">No hands yet at this table. Every round you play is listed here, newest first.</p>';
    const m = (c, sg) => money(c, sg);
    const sideLine = (name, b) => (b ? `<div class="hl-row"><span class="who">${name}</span><span>${b.k ? BJ.SIDE_NAMES[b.k] : 'Lost'} · ${m(b.b)}</span><span class="res">${m(b.p - b.b, true)}</span></div>` : '');
    return `<p class="note">The last ${S.log.length} rounds of this session, newest first.</p><ol class="hlog">` + S.log.slice().reverse().map((e) =>
      `<li><div class="hl-top"><span>Round ${e.n} · bet ${m(e.staked)}</span><b class="${tone(e.net)}">${m(e.net, true)}</b></div>` +
      `<div class="hl-row"><span class="who">Dealer</span>${cardsMini(e.d)}<span class="tt">${e.dt > 21 ? e.dt + ' bust' : e.dt}</span></div>` +
      e.h.map((h, i) => `<div class="hl-row"><span class="who">${e.h.length > 1 ? 'Hand ' + (i + 1) : 'You'}</span>${cardsMini(h.c)}<span class="tt">${h.t}</span><span class="res">${RESULT[h.r]} · ${m(h.b)}</span></div>`).join('') +
      sideLine('Pairs', e.pp) + sideLine('21+3', e.t3) +
      (e.ins ? `<div class="hl-row"><span class="who">Insurance</span><span>${m(e.ins)}</span><span class="res">${e.insP ? 'Paid 2 to 1' : 'Lost'}</span></div>` : '') +
      '</li>').join('') + '</ol>';
  }
  function sessionsList() {
    const list = loadSessions().slice().reverse();
    const live = S && S.stats.rounds ? `<button type="button" class="srow" data-go="session"><span><b>${esc(S.table.name)}</b><span>Playing now · ${plural(S.stats.rounds, 'round')}</span></span>${miniSpark(S.history)}<span class="s-net ${tone(S.stats.net)}">${money(S.stats.net, true)}</span></button>` : '';
    if (!list.length && !live) return '<p class="empty">No sessions yet. A session is one visit to a table; it is kept here when you leave the table.</p>';
    return `<div class="srows">${live}${list.map((r) =>
      `<button type="button" class="srow" data-rec="${r.id}"><span><b>${esc(r.table)}</b><span>${fmtDate(r.started)} · ${fmtDur(r.played)} · ${plural(r.stats.rounds, 'round')}</span></span>` +
      `${miniSpark(r.history)}<span class="s-net ${tone(r.stats.net)}">${money(r.stats.net, true, r.rules.currency)}</span></button>`).join('')}</div>` +
      (list.length ? `<div class="row wrap"><button type="button" class="btn ghost" id="csvBtn">Copy as CSV</button><button type="button" class="btn ghost" id="clearHistBtn">Clear history</button></div>` : '');
  }
  function miniSpark(hist) {
    const sp = spark(hist, 72, 28);
    const up = sp.last >= sp.first;
    return `<svg viewBox="0 0 72 28" preserveAspectRatio="none" aria-hidden="true"><polyline points="${sp.pts}" fill="none" stroke="${up ? '#e8c96f' : '#e0675f'}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function allRecords() { return loadSessions().concat(S && S.stats.rounds ? [record(S)] : []); }
  function totalsView() {
    const recs = allRecords();
    if (!recs.length) return '<p class="empty">Nothing yet: play a few rounds and your totals over every session show up here.</p>';
    const cur = recs[recs.length - 1].rules.currency, m = (c, sg) => money(c, sg, cur);
    const mixed = recs.some((r) => r.rules.currency !== cur);
    const sum = (f) => recs.reduce((a, r) => a + f(r), 0);
    const net = sum((r) => r.stats.net), wag = sum((r) => r.stats.wagered), rounds = sum((r) => r.stats.rounds);
    const dec = sum((r) => r.stats.decisions), cor = sum((r) => r.stats.correct);
    const sorted = recs.slice().sort((a, b) => b.stats.net - a.stats.net), best = sorted[0], worst = sorted[sorted.length - 1];
    const sideNet = sum((r) => ['pp', 't3'].reduce((a, t) => a + (r.stats.sides && r.stats.sides[t] ? r.stats.sides[t].paid - r.stats.sides[t].wagered : 0), 0));
    const sideBets = sum((r) => ['pp', 't3'].reduce((a, t) => a + (r.stats.sides && r.stats.sides[t] ? r.stats.sides[t].bets : 0), 0));
    const byTable = {};
    recs.forEach((r) => {
      const k = r.table, x = byTable[k] || (byTable[k] = { name: r.table, n: 0, rounds: 0, net: 0, played: 0 });
      x.n++; x.rounds += r.stats.rounds; x.net += r.stats.net; x.played += r.played;
    });
    const rows = Object.values(byTable).sort((a, b) => b.rounds - a.rounds);
    const list = (items) => `<dl class="list">${items.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
    return `<div class="figs3"><div><span>Result, all time</span><b class="${tone(net)}">${m(net, true)}</b></div>` +
      `<div><span>Sessions</span><b>${recs.length}</b></div><div><span>Time played</span><b>${fmtDur(sum((r) => r.played))}</b></div></div>` +
      list([
        ['Rounds', rounds], ['Hands', sum((r) => r.stats.hands)], ['Total bet', m(wag)],
        ['Return on bets', wag ? sgn(100 * net / wag, 2) + '%' : '–'],
        ['Sessions in profit', `${recs.filter((r) => r.stats.net > 0).length} of ${recs.length}`],
        ['Best session', `${m(best.stats.net, true)} · ${esc(best.table)}`], ['Worst session', `${m(worst.stats.net, true)} · ${esc(worst.table)}`],
        ['Best round', m(Math.max(...recs.map((r) => r.stats.best)), true)],
        ['Blackjacks', sum((r) => r.stats.blackjacks)], ['Rebuys', sum((r) => r.stats.rebuys)],
        ['Moves that match the chart', dec ? `${pct(cor, dec)} of ${dec}` : '–'],
        sideBets ? ['Side bets', `${sideBets} · ${m(sideNet, true)}`] : null,
      ]) +
      '<h4>By table</h4><div class="ttab-wrap"><table class="ttab"><thead><tr><th>Table</th><th>Sessions</th><th>Rounds</th><th>Time</th><th>Result</th></tr></thead><tbody>' +
      rows.map((x) => `<tr><td>${esc(x.name)}</td><td>${x.n}</td><td>${x.rounds}</td><td>${fmtDur(x.played)}</td><td class="${tone(x.net)}">${m(x.net, true)}</td></tr>`).join('') +
      '</tbody></table></div>' + (mixed ? '<p class="note">Sessions in different currencies are added as they are.</p>' : '');
  }
  function renderStats() {
    const tabs = $('statsTabs');
    if (!S && (statsView.tab === 'session' || statsView.tab === 'hands')) statsView.tab = 'sessions';
    tabs.querySelectorAll('[data-tab]').forEach((b) => {
      b.hidden = !S && (b.dataset.tab === 'session' || b.dataset.tab === 'hands');
      b.setAttribute('aria-selected', String(b.dataset.tab === statsView.tab));
    });
    let html = '';
    if (statsView.tab === 'session') {
      html = sessionView(record(S), true) +
        '<div class="row wrap"><button class="btn ghost" type="button" id="resetStatsBtn">Reset statistics</button><button class="btn gold" type="button" id="statsLeaveBtn">Leave table</button></div>';
    } else if (statsView.tab === 'hands') html = handsView();
    else if (statsView.tab === 'sessions') {
      const rec = statsView.rec && loadSessions().find((r) => r.id === statsView.rec);
      if (rec) {
        html = (statsView.ended ? '<p class="note">You left the table. Here is how the session went.</p>' : '') + sessionView(rec, false) +
          '<div class="row wrap">' + (statsView.ended && !S ? '<button class="btn gold" type="button" id="chooseTableBtn">Choose a table</button>'
            : '<button class="btn ghost" type="button" id="backBtn">All sessions</button>') +
          `<button class="btn ghost" type="button" id="delRecBtn" data-rec="${rec.id}">Remove this session</button></div>`;
      } else html = sessionsList();
    } else html = totalsView();
    $('statsBody').innerHTML = html;
  }
  function csv() {
    const head = ['started', 'table', 'minutes', 'rounds', 'hands', 'won', 'pushed', 'lost', 'blackjacks', 'buy_in', 'rebuys', 'total_bet', 'result', 'peak', 'low', 'chart_accuracy', 'currency'];
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = loadSessions().map((r) => {
      const st = r.stats;
      return [new Date(r.started).toISOString(), q(r.table), Math.round(r.played / 60000), st.rounds, st.hands, st.won, st.pushed, st.lost, st.blackjacks,
        st.start / 100, st.rebuys, st.wagered / 100, st.net / 100, st.peak / 100, st.low / 100, st.decisions ? (st.correct / st.decisions).toFixed(3) : '', r.rules.currency].join(',');
    });
    return [head.join(',')].concat(rows).join('\n');
  }

  /* ---------- wiring ---------- */
  function twoTap(btn, label, fn) {
    if (btn.dataset.sure) { fn(); return; }
    btn.dataset.sure = '1'; btn.textContent = label;
  }
  function bind() {
    $('chipTray').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) placeChip(b); });
    $('seats').addEventListener('click', (e) => { const el = e.target.closest('[data-target]'); if (el) selectTarget(el.dataset.target); });
    $('seats').addEventListener('keydown', (e) => {
      const el = e.target.closest('.spot[role=button]');
      if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); selectTarget('main'); }
    });
    $('clearBtn').addEventListener('click', clearBet);
    $('rebetBtn').addEventListener('click', () => rebetUI(1));
    $('doubleRebetBtn').addEventListener('click', () => rebetUI(2));
    $('dealBtn').addEventListener('click', deal);
    document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    $('insYes').addEventListener('click', () => insure(true));
    $('insNo').addEventListener('click', () => insure(false));
    $('againBtn').addEventListener('click', () => nextRound(true));
    $('changeBtn').addEventListener('click', () => nextRound(false));
    $('rebuyBtn').addEventListener('click', rebuy);
    $('brokeLeaveBtn').addEventListener('click', leaveTable);
    $('menuBtn').addEventListener('click', () => { if (!S) return; renderRules(); renderPrefs(); openSheet('menu'); });
    const openStats = () => { statsView = { tab: S ? 'session' : 'sessions', rec: null, ended: false }; renderStats(); openSheet('stats'); };
    $('statsBtn').addEventListener('click', openStats);
    $('openStatsBtn').addEventListener('click', openStats);
    $('lobbyStatsBtn').addEventListener('click', openStats);
    $('leaveBtn').addEventListener('click', leaveTable);
    document.querySelectorAll('.sheet').forEach((sh) => {
      sh.addEventListener('click', (e) => { if (e.target === sh || e.target.closest('[data-close]')) closeSheet(); });
    });
    $('statsTabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (b) { statsView = { tab: b.dataset.tab, rec: null, ended: false }; renderStats(); }
    });
    $('statsBody').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.rec && b.classList.contains('srow')) { statsView.rec = b.dataset.rec; statsView.ended = false; renderStats(); $('stats').querySelector('.box').scrollTop = 0; }
      else if (b.dataset.go) { statsView = { tab: b.dataset.go, rec: null, ended: false }; renderStats(); }
      else if (b.id === 'backBtn') { statsView.rec = null; renderStats(); }
      else if (b.id === 'chooseTableBtn') { $('stats').classList.remove('open'); openSheetId = null; openSetup(); }
      else if (b.id === 'statsLeaveBtn') leaveTable();
      else if (b.id === 'resetStatsBtn') twoTap(b, 'Tap again to reset', () => { BJ.resetStats(S); save(); renderStats(); toast('Statistics of this session reset'); });
      else if (b.id === 'delRecBtn') twoTap(b, 'Tap again to remove', () => {
        writeJSON(SESSIONS_KEY, loadSessions().filter((r) => r.id !== b.dataset.rec));
        statsView = { tab: 'sessions', rec: null, ended: false }; renderStats(); toast('Session removed');
      });
      else if (b.id === 'clearHistBtn') twoTap(b, 'Tap again to clear', () => { writeJSON(SESSIONS_KEY, []); renderStats(); toast('Session history cleared'); });
      else if (b.id === 'csvBtn') {
        const text = csv();
        const done = () => toast(`Copied ${loadSessions().length} sessions as CSV`);
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => toast('Copying is not allowed here'));
        else toast('Copying is not allowed here');
      }
    });
    // lobby
    $('lobbyTabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-group]');
      if (b) { lobby.group = b.dataset.group; renderLobby(); }
    });
    $('tableList').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { removeTable(del); return; }
      const b = e.target.closest('[data-table]');
      if (b) selectTable(b.dataset.table);
    });
    $('buyin').addEventListener('click', (e) => {
      const q = e.target.closest('[data-quick]');
      if (q) { $('r-bankroll').value = q.dataset.quick; renderLobby(); }
    });
    const onFormInput = (e) => {
      if (e.target.id === 'r-penetration') $('r-penetration-o').textContent = Math.round(e.target.value * 100) + '% of the shoe';
      if (e.target.name === 'r-currency') { const v = readSetup(); renderSetupFields(v); renderLobby(); return; }
      if (e.target.closest('#setupFields')) markEdited(); else renderLobby();
    };
    $('setupForm').addEventListener('input', onFormInput);
    $('saveTableBtn').addEventListener('click', saveTable);
    $('saveName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveTable(); } });
    $('setupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = readSetup(), err = BJ.checkRules(v);
      if (err.length) { $('setupErr').textContent = err.join(' '); return; }
      const t = findTable(lobby.id);
      const meta = t ? { id: t.id, name: t.name + (lobby.edited ? ' (your rules)' : ''), felt: t.felt } : { id: 'custom', name: 'Custom table', felt: P.felt };
      Sound.unlock();
      startGame(v, meta);
    });
    // look and help: applies at once
    $('prefFields').addEventListener('change', (e) => {
      const f = PREF_FIELDS.find((x) => e.target.name === 'p-' + x.k || e.target.id === 'p-' + x.k);
      if (!f) return;
      P[f.k] = readField(f, 'p');
      applyPrefs();
      save();
      if (S) sync(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (openSheetId) { if (e.key === 'Escape') closeSheet(); return; }
      if (!S) return;
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      const k = e.key.toLowerCase(), onButton = tag === 'button' || (e.target && e.target.getAttribute && e.target.getAttribute('role') === 'button');
      const go = (k === 'enter' || k === ' ') && !onButton;
      if (S.phase === 'player') {
        const m = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' }[k];
        if (m) { e.preventDefault(); act(m); }
      } else if (S.phase === 'insurance') {
        if (k === 'y') insure(true);
        if (k === 'n') insure(false);
      } else if (S.phase === 'betting') {
        if (go) { e.preventDefault(); if (BJ.canDeal(S)) deal(); else rebetUI(1); }
        if (k === 'backspace' || k === 'delete') clearBet();
      } else if (S.phase === 'done') {
        if (go) { e.preventDefault(); nextRound(true); }
        if (k === 'c') nextRound(false);
      }
    });
    const persist = () => { touch(); save(); };
    document.addEventListener('visibilitychange', persist);
    window.addEventListener('pagehide', persist);
  }

  function start(data) {
    const saved = data && data.s ? data : readJSON(KEY, null);
    if (saved && saved.prefs) P = Object.assign({}, DEFAULT_PREFS, saved.prefs);
    applyPrefs();
    bind();
    if (saved && saved.s && saved.s.v === 1 && saved.s.rules && Array.isArray(saved.s.shoe)) {
      S = BJ.upgrade(saved.s);
      if (!S.table) S.table = { id: 'custom', name: 'Your table', felt: P.felt };
      if (!S.session) S.session = newSession();
      swept = true; sidesSwept = true;
      buildChipTray();
      sync(false);
      run();
    } else {
      openSetup();
    }
  }

  // For the browser tests: the game, whether anything is moving, and money as the page writes it.
  window.BJGame = { get state() { return S; }, get busy() { return busy || pendingFly > 0 || dealQueued; }, fmt: (c) => money(c) };
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ s: S, prefs: P }));
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
