/* Blackjack table: the page. The rules live in engine.js (window.BJ); this file draws the table, deals the cards with
 * small animations (out of the shoe, flipped in flight, slid apart on a split, swept to the tray), moves the chips,
 * and saves the game in this browser. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY = 'blackjack.v1';
  const SPEEDS = { off: 0, fast: 0.55, normal: 1, slow: 1.6 };
  const CHIPS = [1, 5, 10, 25, 100, 500, 1000, 5000, 10000];
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DEFAULT_PREFS = { speed: reduced ? 'off' : 'normal', sound: true, totals: true, hints: false, count: false, felt: 'green', back: 'red' };
  const MOVE = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };
  const MOVE_BTN = { H: 'hitBtn', S: 'standBtn', D: 'doubleBtn', P: 'splitBtn', R: 'surrenderBtn' };
  const RESULT = { win: 'Win', blackjack: 'Blackjack', push: 'Push', lose: 'Lose', bust: 'Bust', surrender: 'Surrendered', even: 'Even money' };
  const SUIT_NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
  const RANK_NAME = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
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

  // The setup form: the house rules and the money. Values are [stored value, label].
  const RULE_FIELDS = [
    ['Money', [
      { k: 'bankroll', label: 'Starting bankroll', type: 'money', quick: [100, 500, 1000, 5000, 10000, 100000] },
      { k: 'currency', label: 'Currency', type: 'seg', opts: [['$', '$ Dollars'], ['€', '€ Euros'], ['£', '£ Pounds']] },
      { k: 'minBet', label: 'Minimum bet', type: 'select', opts: [1, 2, 5, 10, 15, 25, 50, 100, 500, 1000] },
      { k: 'maxBet', label: 'Maximum bet', type: 'select', opts: [50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 50000] },
    ]],
    ['Shoe and dealer', [
      { k: 'decks', label: 'Decks in the shoe', type: 'seg', opts: [[1, '1'], [2, '2'], [4, '4'], [6, '6'], [8, '8']] },
      { k: 'penetration', label: 'Reshuffle after', type: 'range', min: 0.5, max: 0.9, step: 0.05, fmt: (v) => Math.round(v * 100) + '% of the shoe' },
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

  let S = null;                 // the game (engine state, plain JSON)
  let P = Object.assign({}, DEFAULT_PREFS);
  let busy = false;             // an animation sequence is running: input waits
  let swept = true;             // after a round, the chips have left the table
  let holdBank = false;         // keep the bankroll figure still while chips are in flight
  let pendingFly = 0;           // chips flying to the bet circle: draw the stack when they land
  let dealQueued = false;       // Deal was tapped while chips were still flying
  let shownBank = null, bankTween = 0, toastTimer = 0, openSheetId = null, lastFocus = null;
  const cardEls = new Map();    // card id -> element
  let setupValues = null;

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
  function money(c, signed) {
    const cur = S ? S.rules.currency : '$', v = Math.abs(c) / 100;
    const txt = cur + v.toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
    if (signed) return (c > 0 ? '+' : c < 0 ? '−' : '') + txt;
    return (c < 0 ? '−' : '') + txt;
  }
  const short = (d) => (d >= 1000 ? d / 1000 + 'K' : String(d));
  const sgn = (n, dp) => (n > 0.0001 ? '+' : n < -0.0001 ? '−' : '') + Math.abs(n).toFixed(dp || 0);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save() { try { if (S) localStorage.setItem(KEY, JSON.stringify({ s: S, prefs: P })); } catch (e) { /* private mode */ } }
  function toast(text) {
    const t = $('toast');
    t.textContent = text; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
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
  const stackEl = (i) => (seatEl(i) || seatEl(0)).querySelector('.stack');
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
    d.innerHTML = '<div class="hand"></div><div class="total"></div><div class="result" aria-live="polite"></div><div class="spot"><div class="stack"></div><div class="ins"></div></div><div class="amt"></div>';
    return d;
  }
  function setTotal(el, cards, o) {
    const vis = cards.filter((c) => !c.down);
    const v = vis.length ? BJ.handValue(vis) : null;
    if (!v || (!P.totals && !(v.total > 21 || o.bj))) { el.textContent = ''; el.className = 'total'; return; }
    el.textContent = o.bj ? 'Blackjack' : v.soft && v.total < 21 && !o.final ? (v.total - 10) + ' / ' + v.total : String(v.total);
    el.className = 'total' + (v.total > 21 ? ' bust' : '') + (o.bj ? ' bj' : v.total === 21 ? ' t21' : '');
  }
  function renderSeat(seat, h, i, ch) {
    placeCards(seat.querySelector('.hand'), h ? h.cards : [], ch);
    const turn = S.phase === 'player' && i === S.active;
    seat.classList.toggle('turn', turn);
    seat.classList.toggle('active', turn && S.hands.length > 1);
    setTotal(seat.querySelector('.total'), h ? h.cards : [], { final: !!(h && h.done), bj: !!(h && h.bj && !h.split) });
    let stake = 0;
    if (S.phase === 'betting') stake = S.bet;
    else if (h && !(S.phase === 'done' && swept)) stake = h.bet;
    const stack = seat.querySelector('.stack');
    if (stack._v !== stake && !(S.phase === 'betting' && pendingFly)) { stack.innerHTML = stackHTML(stake); stack._v = stake; }
    const insV = i === 0 && S.phase !== 'betting' && !(S.phase === 'done' && swept) ? S.insurance : 0;
    const ins = seat.querySelector('.ins');
    if (ins._v !== insV) { ins.innerHTML = insV ? stackHTML(insV, 4) : ''; ins._v = insV; }
    seat.querySelector('.amt').textContent = stake ? money(stake) : S.phase === 'betting' ? 'Your bet' : '';
    const res = seat.querySelector('.result'), key = S.phase === 'done' && h && h.result ? h.result + h.paid : '';
    if (res._k !== key) {
      res._k = key;
      if (!key) { res.className = 'result'; res.innerHTML = ''; }
      else {
        const net = h.paid - h.bet;
        const tone = net > 0 ? ' good' : net < 0 ? ' bad' : '';
        res.className = 'result show' + tone;
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
    hands.forEach((h, i) => renderSeat(box.children[i], h, i, ch));
  }
  function message() {
    const R = S.rules;
    switch (S.phase) {
      case 'betting':
        if (BJ.isBroke(S)) return ['Out of chips'];
        if (!S.bet) return [`Place your bet · ${money(R.minBet * 100)} to ${money(R.maxBet * 100)}`];
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
  function renderHud() {
    const R = S.rules;
    if (!holdBank) tweenBank(S.bankroll);
    $('gauge').style.height = (100 * S.shoe.length / S.size).toFixed(1) + '%';
    $('cutmark').style.bottom = (100 * (S.size - S.cut) / S.size).toFixed(1) + '%';
    $('shoe').title = `Shoe: ${(S.shoe.length / 52).toFixed(1)} of ${R.decks} deck${R.decks > 1 ? 's' : ''} left. The red line is the cut card.`;
    $('pile').style.setProperty('--h', Math.min(1, S.discards / S.size).toFixed(3));
    $('pile').classList.toggle('has', S.discards > 0);
    const cnt = $('count');
    cnt.hidden = !P.count;
    if (P.count) cnt.innerHTML = `Running <b>${sgn(S.count)}</b> · True <b>${sgn(BJ.trueCount(S), 1)}</b>`;
    $('print1').textContent = 'Blackjack pays ' + R.payout.replace(':', ' to ');
    $('print2').textContent = R.hitSoft17 ? 'Dealer must hit soft 17' : 'Dealer stands on all 17s';
    $('print3').textContent = R.insurance ? 'Insurance pays 2 to 1' : `Table limits ${money(R.minBet * 100)} to ${money(R.maxBet * 100)}`;
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
      $('chipTray').querySelectorAll('[data-d]').forEach((b) => { b.disabled = busy || !BJ.canAdd(S, Number(b.dataset.d) * 100); });
      const r1 = BJ.rebetAmount(S, 1), r2 = BJ.rebetAmount(S, 2), min = R.minBet * 100;
      $('clearBtn').disabled = busy || !S.bet;
      $('rebetBtn').disabled = busy || !S.lastBet || r1 < min || r1 === S.bet;
      $('doubleRebetBtn').disabled = busy || !S.lastBet || r2 < min || r2 === S.bet || r2 === r1;
      $('dealBtn').disabled = busy || !BJ.canDeal(S);
      $('dealBtn').textContent = S.bet ? 'Deal ' + money(S.bet) : 'Deal';
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
      const r1 = BJ.rebetAmount(S, 1), can = r1 >= R.minBet * 100;
      const d = S.last ? S.last.dealer : 0;
      $('doneText').textContent = S.last && S.last.dealerBJ ? 'The dealer had blackjack.' : d > 21 ? `The dealer busted with ${d}.` : `The dealer finished on ${d}.`;
      $('againBtn').textContent = can ? 'Deal again ' + money(r1) : 'Continue';
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
  async function collectAnim() {
    const pile = $('pile').getBoundingClientRect(), els = Array.from(cardEls.values());
    document.querySelectorAll('.result.show').forEach((r) => r.classList.add('gone'));
    await Promise.all(els.map((el, k) => {
      const r = el.getBoundingClientRect();
      const dx = pile.left + pile.width / 2 - (r.left + r.width / 2), dy = pile.top + pile.height / 2 - (r.top + r.height / 2);
      const t = { duration: 430, delay: k * 35, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' };
      return Promise.all([
        anim(el, [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(90deg) scale(.5)`, opacity: 0.1 }], t),
        el._down ? null : anim(el.firstChild, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], t),
      ]);
    }));
    els.forEach((el) => el.remove());
    cardEls.clear();
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
      if (win > 0) pays.push(flyChips(win, dealerSpot, stackEl(i), { delay: i * 120 }).then(() => { const st = stackEl(i); st.innerHTML = stackHTML(h.paid); st._v = h.paid; }));
    });
    if (L.insurancePaid) {
      const ins = seatEl(0).querySelector('.ins');
      pays.push(flyChips(L.insurancePaid - L.insurance, dealerSpot, ins, { size: ins.offsetWidth }).then(() => { ins.innerHTML = stackHTML(L.insurancePaid, 4); }));
    }
    if (pays.length) { Sound.chips(); await Promise.all(pays); await wait(380); }
    const sweeps = [];
    S.hands.forEach((h, i) => {
      const st = stackEl(i);
      if (h.paid > 0) sweeps.push(flyChips(h.paid, st, bank, { delay: i * 90, fade: true, duration: 520 }));
      else sweeps.push(flyChips(h.bet, st, dealerSpot, { delay: i * 90, fade: true, duration: 520 }));
      st.innerHTML = ''; st._v = 0;
    });
    if (L.insurance) {
      const ins = seatEl(0).querySelector('.ins');
      sweeps.push(flyChips(L.insurancePaid || L.insurance, ins, L.insurancePaid ? bank : dealerSpot, { fade: true, size: ins.offsetWidth, duration: 520 }));
      ins.innerHTML = ''; ins._v = 0;
    }
    swept = true;
    holdBank = false;
    setTimeout(() => tweenBank(S.bankroll), 200 * speed());
    await Promise.all(sweeps);
  }
  async function show(ev) {
    switch (ev.kind) {
      case 'shuffle':
        renderHud(); setMsg('Shuffling a fresh shoe');
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
  // Lets the table play its own steps (dealing, the dealer's turn, paying) until the player has to act.
  async function run() {
    if (busy || !S) return;
    busy = true;
    renderControls();
    try {
      let ev;
      while ((ev = BJ.step(S))) { await show(ev); save(); }
    } catch (e) { console.error(e); }
    busy = false;
    await sync();
    save();
  }

  /* ---------- player input ---------- */
  async function betFly(cents, from) {
    pendingFly++;
    renderHud(); renderControls();
    await flyChips(cents, from, stackEl(0));
    pendingFly--;
    if (!pendingFly) {
      await sync();
      if (dealQueued) { dealQueued = false; deal(); }
    }
  }
  function placeChip(btn) {
    if (busy || S.phase !== 'betting') return;
    const d = Number(btn.dataset.d) * 100;
    if (!BJ.addBet(S, d)) {
      toast(d > S.bankroll ? 'Not enough chips for that one' : `The table maximum is ${money(S.rules.maxBet * 100)}`);
      return;
    }
    Sound.unlock(); Sound.chip();
    betFly(d, btn);
    save();
  }
  function clearBet() {
    if (busy || S.phase !== 'betting' || !S.bet) return;
    flyChips(S.bet, stackEl(0), $('bank'), { fade: true });
    BJ.clearBet(S);
    sync(); save();
  }
  function rebetUI(mult) {
    if (busy || S.phase !== 'betting' || !BJ.rebet(S, mult)) return;
    Sound.unlock(); Sound.chips();
    stackEl(0).innerHTML = ''; stackEl(0)._v = 0;
    betFly(S.bet, $('bank'));
    save();
  }
  function deal() {
    if (pendingFly && BJ.canDeal(S)) { dealQueued = true; return; }
    if (busy || !BJ.canDeal(S)) return;
    Sound.unlock();
    BJ.deal(S);
    swept = false;
    save();
    run();
  }
  async function act(name) {
    if (busy || S.phase !== 'player') return;
    const can = { hit: BJ.canHit, stand: BJ.canStand, double: BJ.canDouble, split: BJ.canSplit, surrender: BJ.canSurrender }[name];
    if (!can || !can(S)) return;
    Sound.unlock();
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
    if (busy || S.phase !== 'insurance' || (take && !BJ.canInsure(S))) return;
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
    if (busy || S.phase !== 'done') return;
    busy = true;
    renderControls();
    await collectAnim();
    BJ.collect(S);
    swept = false;
    busy = false;
    await sync();
    if (rebet && BJ.rebet(S, 1)) {
      Sound.chips();
      stackEl(0).innerHTML = ''; stackEl(0)._v = 0;
      await betFly(S.bet, $('bank'));
      deal();
    }
    save();
  }
  function rebuy() {
    if (busy || !BJ.rebuy(S)) return;
    S.history.push(S.bankroll);
    Sound.chips();
    toast(`Rebuy: ${money(S.rules.bankroll * 100, true)} in chips`);
    sync(); save();
  }

  /* ---------- sheets: setup, menu, statistics ---------- */
  function openSheet(id) {
    if (openSheetId && openSheetId !== id) $(openSheetId).classList.remove('open');
    lastFocus = openSheetId ? lastFocus : document.activeElement;
    openSheetId = id;
    const el = $(id);
    el.classList.add('open');
    const box = el.querySelector('.box');
    box.scrollTop = 0;
    const f = el.querySelector('button:not([hidden]):not([data-close]), input, select');
    if (f) f.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!openSheetId || (openSheetId === 'setup' && !S)) return;
    $(openSheetId).classList.remove('open');
    openSheetId = null;
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
  const allRuleFields = () => RULE_FIELDS.reduce((a, s) => a.concat(s[1]), []);
  function readSetup() {
    const v = {};
    allRuleFields().forEach((f) => { v[f.k] = readField(f, 'r'); });
    return v;
  }
  function renderSetup(values) {
    setupValues = values;
    $('setupFields').innerHTML = RULE_FIELDS.map(([title, fields]) =>
      `<h3>${title}</h3>` + fields.map((f) => fieldHTML(f, values[f.k], 'r', values.currency)).join('')).join('');
    $('presets').innerHTML = BJ.PRESETS.map((p) => `<button type="button" class="preset" data-preset="${p.id}"><b>${p.label}</b><span>${p.note}</span></button>`).join('');
    markPreset();
  }
  function markPreset() {
    const v = readSetup();
    document.querySelectorAll('[data-preset]').forEach((b) => {
      const p = BJ.PRESETS.find((x) => x.id === b.dataset.preset);
      b.classList.toggle('on', Object.keys(p.rules).every((k) => String(p.rules[k]) === String(v[k])));
    });
    const edge = BJ.houseEdge(v), err = BJ.checkRules(v);
    $('setupErr').textContent = err.join(' ');
    $('setupForm').querySelector('[type=submit]').textContent = `Take a seat · house edge about ${edge.toFixed(1)}%`;
  }
  function openSetup() {
    const base = S ? Object.assign({}, S.rules) : Object.assign({}, BJ.DEFAULT_RULES);
    $('setup').classList.toggle('first', !S);
    renderSetup(base);
    openSheet('setup');
  }
  function renderPrefs() {
    $('prefFields').innerHTML = PREF_FIELDS.map((f) => fieldHTML(f, P[f.k], 'p', '')).join('');
  }
  function applyPrefs() {
    document.body.dataset.felt = P.felt;
    document.body.dataset.back = P.back;
    document.body.classList.toggle('calm', !speed());
    Sound.set(P.sound);
  }
  function renderRules() {
    const R = S.rules;
    const dbl = { any: 'Any first two cards', '9-11': 'Hard 9, 10 or 11', '10-11': 'Hard 10 or 11', none: 'Not allowed' }[R.doubleOn];
    const rows = [
      ['Starting bankroll', money(R.bankroll * 100)],
      ['Table limits', `${money(R.minBet * 100)} to ${money(R.maxBet * 100)}`],
      ['Shoe', `${R.decks} deck${R.decks > 1 ? 's' : ''}, reshuffled after about ${Math.round(R.penetration * 100)}%`],
      ['Blackjack pays', R.payout.replace(':', ' to ')],
      ['Dealer', (R.hitSoft17 ? 'Hits soft 17' : 'Stands on all 17s') + ', peeks for blackjack'],
      ['Double down', dbl + (R.doubleOn !== 'none' && R.das && R.maxHands > 1 ? ', also after a split' : '')],
      ['Splits', R.maxHands > 1 ? `Up to ${R.maxHands} hands; aces ${R.resplitAces ? 'can be resplit' : 'once'}, ${R.hitSplitAces ? 'and may be hit' : 'one card each'}` : 'Not allowed'],
      ['Surrender', R.surrender === 'late' ? 'Late surrender, half the bet back' : 'Not offered'],
      ['Insurance', R.insurance ? 'Offered under an ace, pays 2 to 1' : 'Not offered'],
      ['House edge', `About ${BJ.houseEdge(R).toFixed(2)}% with perfect basic strategy`],
    ];
    $('rulesList').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  }
  function renderStats() {
    const st = S.stats, total = S.bankroll + S.bet + S.hands.reduce((a, h) => a + (S.phase === 'done' ? 0 : h.bet), 0);
    const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '–');
    const hist = S.history.length > 1 ? S.history : [S.history[0], S.history[0]];
    const lo = Math.min(...hist), hi = Math.max(...hist), span = hi - lo || 1;
    const pts = hist.map((v, i) => `${(300 * i / (hist.length - 1)).toFixed(1)},${(88 - 80 * (v - lo) / span).toFixed(1)}`).join(' ');
    const y0 = (88 - 80 * (hist[0] - lo) / span).toFixed(1);
    const bar = (label, n, colour) => `<div class="r"><span>${label}</span><div class="t"><i style="width:${st.hands ? 100 * n / st.hands : 0}%;background:${colour}"></i></div><span class="n">${n}</span></div>`;
    const rows = [
      ['Rounds played', st.rounds], ['Blackjacks', st.blackjacks], ['Busts', st.busts],
      ['Doubles won', `${st.doublesWon} of ${st.doubles}`], ['Splits', st.splits], ['Surrenders', st.surrenders],
      ['Insurance taken', st.insurance], ['Best round', money(st.best, true)], ['Worst round', money(st.worst, true)],
      ['Total bet', money(st.wagered)], ['Return on bets', st.wagered ? sgn(100 * st.net / st.wagered, 1) + '%' : '–'],
      ['Moves that match the chart', st.decisions ? `${pct(st.correct, st.decisions)} of ${st.decisions}` : '–'],
      ['Rebuys', st.rebuys],
    ];
    $('statsBody').innerHTML =
      `<div class="figs3"><div><span>Chips now</span><b>${money(total)}</b></div>` +
      `<div><span>Result</span><b class="${st.net > 0 ? 'good' : st.net < 0 ? 'bad' : ''}">${money(st.net, true)}</b></div>` +
      `<div><span>Peak</span><b>${money(st.peak)}</b></div></div>` +
      `<svg class="spark" viewBox="0 0 300 96" preserveAspectRatio="none" role="img" aria-label="Chips after each round">` +
      `<line x1="0" x2="300" y1="${y0}" y2="${y0}" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>` +
      `<polyline points="0,96 ${pts} 300,96" fill="rgba(232,201,111,.14)" stroke="none"/>` +
      `<polyline points="${pts}" fill="none" stroke="#e8c96f" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>` +
      `<div class="spark-l"><span>Start ${money(hist[0])}</span><span>Low ${money(lo)} · High ${money(hi)}</span></div>` +
      `<div class="bars">${bar('Won', st.won, '#e8c96f')}${bar('Pushed', st.pushed, '#9aa3ad')}${bar('Lost', st.lost, '#c8333b')}</div>` +
      `<dl class="list">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` +
      `<div class="row"><button class="btn ghost" type="button" id="resetStatsBtn">Reset statistics</button></div>`;
  }
  async function startGame(rules) {
    S = BJ.newGame(rules);
    cardEls.forEach((el) => el.remove());
    cardEls.clear();
    $('seats').innerHTML = '';
    swept = true; shownBank = null; pendingFly = 0;
    buildChipTray();
    closeSheet();
    await sync(false);
    save();
    busy = true;
    renderControls();
    setMsg('Shuffling a fresh shoe');
    await shuffleAnim();
    busy = false;
    await sync();
  }

  /* ---------- wiring ---------- */
  function bind() {
    $('chipTray').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) placeChip(b); });
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
    $('brokeNewBtn').addEventListener('click', openSetup);
    $('menuBtn').addEventListener('click', () => { if (!S) return; renderRules(); renderPrefs(); openSheet('menu'); });
    $('statsBtn').addEventListener('click', () => { if (!S) return; renderStats(); openSheet('stats'); });
    $('openStatsBtn').addEventListener('click', () => { renderStats(); openSheet('stats'); });
    $('newGameBtn').addEventListener('click', openSetup);
    document.querySelectorAll('.sheet').forEach((sh) => {
      sh.addEventListener('click', (e) => { if (e.target === sh || e.target.closest('[data-close]')) closeSheet(); });
    });
    $('statsBody').addEventListener('click', (e) => {
      if (e.target.id !== 'resetStatsBtn') return;
      if (e.target.dataset.sure) { BJ.resetStats(S); save(); renderStats(); toast('Statistics reset'); }
      else { e.target.dataset.sure = '1'; e.target.textContent = 'Tap again to reset'; }
    });
    // setup form
    $('presets').addEventListener('click', (e) => {
      const b = e.target.closest('[data-preset]');
      if (!b) return;
      const p = BJ.PRESETS.find((x) => x.id === b.dataset.preset);
      renderSetup(Object.assign(readSetup(), p.rules));
    });
    $('setupFields').addEventListener('click', (e) => {
      const q = e.target.closest('[data-quick]');
      if (q) { $('r-bankroll').value = q.dataset.quick; markPreset(); }
    });
    $('setupFields').addEventListener('input', (e) => {
      if (e.target.id === 'r-penetration') $('r-penetration-o').textContent = Math.round(e.target.value * 100) + '% of the shoe';
      if (e.target.name === 'r-currency') { renderSetup(readSetup()); return; }
      markPreset();
    });
    $('setupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = readSetup(), err = BJ.checkRules(v);
      if (err.length) { $('setupErr').textContent = err.join(' '); return; }
      Sound.unlock();
      startGame(v);
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
      if (e.metaKey || e.ctrlKey || e.altKey || !S) return;
      if (openSheetId) { if (e.key === 'Escape') closeSheet(); return; }
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      const k = e.key.toLowerCase(), onButton = tag === 'button';
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
    const persist = () => save();
    document.addEventListener('visibilitychange', persist);
    window.addEventListener('pagehide', persist);
  }

  function start(data) {
    const saved = data && data.s ? data : load();
    if (saved && saved.prefs) P = Object.assign({}, DEFAULT_PREFS, saved.prefs);
    applyPrefs();
    bind();
    if (saved && saved.s && saved.s.v === 1 && saved.s.rules && Array.isArray(saved.s.shoe)) {
      S = saved.s;
      S.rules = BJ.normalizeRules(S.rules);
      swept = true;
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
