/* Poker Coach: the page. Lessons, drills, the table with its coach, the tools, and saving (localStorage).
 * The rules, the opponents and the coach's sums are in engine.js (window.PK); the lesson texts in lessons.js. */
(function () {
  'use strict';
  const PK = window.PK, PKL = window.PKL;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'poker.v1', TABLE_KEY = 'poker.table.v1', HANDS_KEY = 'poker.hands.v1';
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- saved progress ----------
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or off */ } }
  const P = Object.assign({ v: 1, lessons: {}, drills: {}, settings: {}, stats: PK.emptyStats() }, load(KEY) || {});
  P.settings = Object.assign({ hints: true, speed: 'normal', mix: 'mixed', fourColor: true }, P.settings);
  P.stats = Object.assign(PK.emptyStats(), P.stats);
  const saveP = () => store(KEY, P);
  let T = load(TABLE_KEY);
  if (T && (T.v !== 1 || !Array.isArray(T.seats) || T.seats.length !== 6)) T = null;
  let HANDS = load(HANDS_KEY) || [];
  const saveT = () => store(TABLE_KEY, T);

  // ---------- drawing ----------
  const SUIT_ID = ['S', 'H', 'D', 'C'], SUIT_CL = ['s', 'h', 'd', 'c'], SUIT_WORD = ['spades', 'hearts', 'diamonds', 'clubs'];
  const RANK_SHOW = (r) => (r === 'T' ? '10' : r);
  function card(c, cls) {
    const r = PK.RANKS[c >> 2], s = c & 3;
    return `<span class="card ${SUIT_CL[s]} ${cls || ''}" role="img" aria-label="${PK.RANK_NAME[c >> 2]} of ${SUIT_WORD[s]}"><b>${RANK_SHOW(r)}</b><svg aria-hidden="true"><use href="#suit-${SUIT_ID[s]}"/></svg></span>`;
  }
  const cards = (list, cls) => list.map((c) => card(c, cls)).join('');
  const back = (cls) => `<span class="card back ${cls || ''}" aria-label="a card face down"></span>`;
  const slot = () => '<span class="card slot" aria-hidden="true"></span>';
  // suit signs in running text, coloured like the cards
  const suitText = (s) => s.replace(/[♠♥♦♣]/g, (g) => `<i class="sg ${'shdc'['♠♥♦♣'.indexOf(g)]}">${g}︎</i>`);
  const pct = (x) => Math.round(x * 100) + '%';
  const bb = (chips) => PK.fmtBB(chips) + ' bb';
  const AT = { UTG: 'under the gun', HJ: 'in the hijack', CO: 'in the cutoff', BTN: 'on the button', SB: 'in the small blind', BB: 'in the big blind' };
  const WHO = { UTG: 'the player under the gun', HJ: 'the hijack', CO: 'the cutoff', BTN: 'the button', SB: 'the small blind', BB: 'the big blind' };

  function grid(key, opts) {
    opts = opts || {};
    const ch = PK.CHARTS[key];
    const cells = PK.HANDS.map((h) => {
      const a = ch.raise.has(h.name) ? 'r' : ch.call.has(h.name) ? 'c' : 'f';
      return `<i class="${a}${opts.mark === h.name ? ' mark' : ''}" style="--d:${h.row + h.col}">${h.name}</i>`;
    }).join('');
    const r = PK.rangePct(ch.raise), c = PK.rangePct(ch.call);
    const raiseWord = key.startsWith('open') || key.startsWith('vsLimp') ? 'Raise' : key === 'vs3bet.IP' || key === 'vs3bet.OOP' ? 'Raise again (4-bet)' : key === 'vs4bet' ? 'All-in' : 'Re-raise (3-bet)';
    const legend = `<span class="lg r">${raiseWord} ${pct(r)}</span>` + (c ? `<span class="lg c">Call ${pct(c)}</span>` : '') + `<span class="lg f">Fold ${pct(1 - r - c)}</span>`;
    return `<figure class="grid-fig${opts.hero ? ' hero' : ''}"><div class="grid${opts.animate && !reduced ? ' animate' : ''}">${cells}</div>` +
      `<figcaption>${opts.caption === false ? '' : `<span class="gt">${esc(PK.CHART_TITLE[key])}</span>`}<span class="legend">${legend}</span></figcaption></figure>`;
  }
  const LADDER = [
    ['Straight flush', '9s 8s 7s 6s 5s', 40, 'Five in a row, one suit. A-K-Q-J-T of one suit is a royal flush.'],
    ['Four of a kind', 'Qc Qd Qh Qs 7d', 624, ''],
    ['Full house', 'Ks Kh Kd 4c 4s', 3744, 'Three of one rank and two of another.'],
    ['Flush', 'Ah Jh 8h 5h 2h', 5108, 'Five of one suit.'],
    ['Straight', 'Tc 9d 8s 7h 6c', 10200, 'Five in a row.'],
    ['Three of a kind', '7s 7h 7d Kc 2s', 54912, ''],
    ['Two pair', 'Js Jd 5c 5h As', 123552, ''],
    ['One pair', 'As Ad 9c 6h 3s', 1098240, ''],
    ['High card', 'Ac Qd 8s 5h 3c', 1302540, 'Nothing: the highest card plays.'],
  ];
  const ladder = () => '<ol class="ladder">' + LADDER.map(([n, cs, k, note]) =>
    `<li><div class="lname"><b>${n}</b><span>${k.toLocaleString('en-GB')}</span></div><div class="lcards">${cards(PK.parseCards(cs), 'mini')}</div>${note ? `<p>${note}</p>` : ''}</li>`).join('') + '</ol>';
  function seatsDiagram() {
    const seats = [['BTN', 'Button: acts last after the flop'], ['SB', 'Small blind'], ['BB', 'Big blind'], ['UTG', 'Under the gun: acts first before the flop'], ['HJ', 'Hijack'], ['CO', 'Cutoff']];
    return '<figure class="seats-fig"><div class="mini-felt">' + seats.map(([p, t], i) =>
      `<span class="ms ms${i}" title="${t}"><b>${p}</b>${p === 'BTN' ? '<i class="dbtn">D</i>' : ''}</span>`).join('') +
      '<span class="mf-note">Play moves to the left, clockwise</span></div><figcaption>Under the gun acts first before the flop; the button acts last after it.</figcaption></figure>';
  }
  function oddsTable(outsList) {
    const rows = (outsList || [2, 4, 6, 8, 9, 12, 15]).map((o) => {
      const two = 1 - ((47 - o) * (46 - o)) / (47 * 46), one = o / 47;
      return `<tr><td>${o}</td><td>${pct(one)}</td><td>${o * 2}%</td><td>${pct(two)}</td><td>${o * 4}%</td></tr>`;
    }).join('');
    return `<table class="mini odds"><thead><tr><th>Outs</th><th>Next card</th><th>× 2</th><th>By the river</th><th>× 4</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function rich(html) {
    return suitText(html)
      .replace(/\{\{cards ([^}]+)\}\}/g, (m, cs) => `<div class="cardrow">${cards(PK.parseCards(cs))}</div>`)
      .replace(/\{\{grid ([^}]+)\}\}/g, (m, k) => grid(k.trim()))
      .replace(/\{\{ladder\}\}/g, ladder)
      .replace(/\{\{seats\}\}/g, seatsDiagram)
      .replace(/\{\{odds\}\}/g, () => oddsTable());
  }

  // ---------- views ----------
  let view = { name: 'learn' };
  let sheet = null;
  const TABS = ['learn', 'drills', 'play', 'tools'];
  const PARENT = { lesson: 'learn', drill: 'drills', chart: 'tools', equity: 'tools', odds: 'tools', stats: 'play' };
  function go(name, arg, opts) {
    if (name !== 'play') stopLoop();
    view = { name, arg };
    render();
    if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
    if (name === 'play') startLoop();
  }
  function render() {
    const tab = TABS.includes(view.name) ? view.name : PARENT[view.name];
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
    document.body.dataset.view = view.name;
    $('#back').hidden = !PARENT[view.name];
    $('#title').textContent = TITLES[view.name](view.arg);
    $('#view').innerHTML = VIEWS[view.name](view.arg);
    if (AFTER[view.name]) AFTER[view.name](view.arg);
  }
  const TITLES = {
    learn: () => 'Poker Coach', lesson: (id) => lessonById(id).title, drills: () => 'Drills', drill: (id) => drillById(id).title,
    play: () => 'Table', tools: () => 'Tools', chart: () => 'Charts', equity: () => 'Equity calculator', odds: () => 'Outs and odds', stats: () => 'Your play',
  };
  const lessonById = (id) => PKL.LESSONS.find((l) => l.id === id);
  const drillById = (id) => PKL.DRILLS.find((d) => d.id === id);
  const drillState = (id) => (P.drills[id] = Object.assign({ best: 0, streak: 0, right: 0, total: 0 }, P.drills[id]));
  const VIEWS = {}, AFTER = {};

  // Learn: the path of lessons
  VIEWS.learn = () => {
    const L = PKL.LESSONS, done = L.filter((l) => P.lessons[l.id] && P.lessons[l.id].done).length;
    const next = L.find((l) => !(P.lessons[l.id] && P.lessons[l.id].done));
    const passed = PKL.DRILLS.filter((d) => drillState(d.id).best >= d.target).length;
    const nIdx = next ? L.indexOf(next) + 1 : 0;
    return `<section class="hero-block">
      <div class="hero-text"><h1 class="display">Learn to play Hold'em well</h1>
      <p class="lede">Raise these hands when it is folded to you on the button, fold the rest. The ${L.length} lessons show why, the drills make it automatic, and the table puts it to work with a coach watching every decision.</p></div>
      ${grid('open.BTN', { hero: true, animate: !P.seenHero })}
    </section>
    ${next ? `<section class="next">
      <p class="next-k">Next: lesson ${nIdx} of ${L.length}</p>
      <h2>${esc(next.title)}</h2><p>${esc(next.intro)}</p>
      <button class="btn primary" data-go="lesson" data-arg="${next.id}">${done ? 'Continue' : 'Start the first lesson'}</button>
    </section>` : `<section class="next"><h2>All ${L.length} lessons done</h2><p>Keep the skills sharp at the table and in the drills.</p><button class="btn primary" data-go="play">Take a seat</button></section>`}
    <p class="progress-line">${done} of ${L.length} lessons finished, ${passed} of ${PKL.DRILLS.length} drills passed${P.stats.hands ? ', ' + P.stats.hands.toLocaleString('en-GB') + ' hands played' : ''}.</p>
    <ol class="path">${L.map((l, i) => {
      const st = P.lessons[l.id] || {};
      return `<li class="${st.done ? 'done' : ''}${next === l ? ' current' : ''}"><button data-go="lesson" data-arg="${l.id}"><span class="num">${i + 1}</span><span class="pt"><b>${esc(l.title)}</b><span>${esc(l.intro)}</span></span>${st.done ? '<span class="tick" aria-label="finished">✓︎</span>' : ''}</button></li>`;
    }).join('')}</ol>`;
  };
  AFTER.learn = () => { if (!P.seenHero) { P.seenHero = true; saveP(); } };

  // A lesson: sections, then a check of three questions
  let quiz = null;
  VIEWS.lesson = (id) => {
    const l = lessonById(id), i = PKL.LESSONS.indexOf(l);
    quiz = { id, answers: [] };
    const nextL = PKL.LESSONS[i + 1];
    return `<article class="lesson">
      <p class="kicker">Lesson ${i + 1} of ${PKL.LESSONS.length}</p>
      <h1 class="display">${esc(l.title)}</h1><p class="lede">${esc(l.intro)}</p>
      ${l.sections.map((s) => `<section><h2>${esc(s.h)}</h2>${rich(s.body)}</section>`).join('')}
      <section class="quiz" id="quiz"><h2>Check yourself</h2>
        ${l.quiz.map((q, k) => `<div class="q" data-q="${k}"><p class="qq">${suitText(esc(q.q))}</p><div class="opts">${q.options.map((o, j) =>
          `<button class="opt" data-quiz="${k}" data-opt="${j}">${suitText(esc(o))}</button>`).join('')}</div><p class="why" hidden></p></div>`).join('')}
        <div class="quiz-end" id="quizEnd" hidden></div>
      </section>
      <nav class="lesson-nav">${l.drill ? `<button class="btn" data-go="drill" data-arg="${l.drill}">Practise: ${esc(drillById(l.drill).title)}</button>` : ''}
        ${nextL ? `<button class="btn ghost" data-go="lesson" data-arg="${nextL.id}">Next lesson: ${esc(nextL.title)}</button>` : `<button class="btn ghost" data-go="play">Take a seat at the table</button>`}</nav>
    </article>`;
  };
  function answerQuiz(k, j) {
    const l = lessonById(quiz.id), q = l.quiz[k];
    if (quiz.answers[k] !== undefined) return;
    quiz.answers[k] = j;
    const box = document.querySelector(`.q[data-q="${k}"]`);
    box.querySelectorAll('.opt').forEach((b, x) => { b.disabled = true; b.classList.toggle('right', x === q.answer); b.classList.toggle('wrong', x === j && j !== q.answer); });
    const why = box.querySelector('.why');
    why.hidden = false;
    why.innerHTML = `<b>${j === q.answer ? 'Right.' : 'Not quite.'}</b> ${suitText(esc(q.why))}`;
    if (quiz.answers.filter((x) => x !== undefined).length === l.quiz.length) {
      const right = quiz.answers.filter((x, i) => x === l.quiz[i].answer).length;
      const prev = P.lessons[l.id] || {};
      P.lessons[l.id] = { done: true, best: Math.max(prev.best || 0, right) };
      saveP();
      const end = $('#quizEnd');
      end.hidden = false;
      end.innerHTML = `<p><b>${right} of ${l.quiz.length} right.</b> ${right === l.quiz.length ? 'Lesson finished.' : 'Lesson finished; read the explanations above for the ones you missed.'}</p>`;
    }
  }

  // ---------- drills ----------
  VIEWS.drills = () => `<p class="lede">Short questions, one after another. Get the target number right in a row to pass a drill.</p>
    <ul class="drill-list">${PKL.DRILLS.map((d) => {
      const s = drillState(d.id), passed = s.best >= d.target;
      return `<li><button data-go="drill" data-arg="${d.id}"><span class="dt"><b>${esc(d.title)}</b><span>${esc(d.about)}</span></span>
        <span class="meter" aria-label="best run ${s.best} of ${d.target}"><i style="width:${Math.min(100, (s.best / d.target) * 100)}%"></i></span>
        <span class="dmeta">${passed ? 'Passed' : `Best run ${s.best} of ${d.target}`}${s.total ? `, ${pct(s.right / s.total)} right` : ''}</span></button></li>`;
    }).join('')}</ul>`;

  let D = null; // the drill on screen: { id, q, done, choice }
  const R = Math.random;
  function newQuestion(id) {
    switch (id) {
      case 'showdown': return PK.drillShowdown(R);
      case 'preflop': return PK.drillPreflop(R);
      case 'outs': return PK.drillOuts(R);
      case 'potodds': { const q = (function f() { const x = PK.drillPotOdds(R); return x.close ? f() : x; })(); q.type = R() < 0.5 ? 'need' : 'decide'; return q; }
      case 'equity': return PK.drillEquity(R);
      case 'nuts': return PK.drillNuts(R);
    }
  }
  VIEWS.drill = (id) => {
    if (!D || D.id !== id) D = { id, q: newQuestion(id), done: false };
    const d = drillById(id), s = drillState(id);
    return `<section class="drill" data-drill="${id}">
      <div class="streak"><span class="meter big" aria-hidden="true"><i style="width:${Math.min(100, (s.streak / d.target) * 100)}%"></i></span>
      <span><b>${s.streak}</b> in a row. Best ${s.best}, target ${d.target}${s.best >= d.target ? ' (passed)' : ''}.</span></div>
      <div class="dq" id="dq">${drillBody(id, D.q)}</div>
      <div class="dfeed" id="dfeed" aria-live="polite"></div>
      <p class="dlink"><button class="linkish" data-go="lesson" data-arg="${d.lesson}">Read the lesson: ${esc(lessonById(d.lesson).title)}</button></p>
    </section>`;
  };
  const opt = (v, label, k) => `<button class="opt" data-ans="${esc(String(v))}"><kbd>${k}</kbd>${label}</button>`;
  function drillBody(id, q) {
    if (id === 'showdown') return `<p class="prompt">Which hand wins?</p>
      <div class="board">${cards(q.board)}</div>
      <div class="two"><div class="hand-a"><span class="hl">Hand A</span>${cards(q.a)}</div><div class="hand-b"><span class="hl">Hand B</span>${cards(q.b)}</div></div>
      <div class="opts row">${opt('a', 'Hand A', 1)}${opt('b', 'Hand B', 2)}${opt('split', 'Split pot', 3)}</div>`;
    if (id === 'preflop') {
      const open = q.key.startsWith('open');
      const where = open ? `Folded to you <b>${AT[q.pos]}</b>.` : `${cap(WHO[q.raiser])} raises to ${q.raiser === 'SB' ? '3' : '2.5'} bb. You are <b>${AT[q.pos]}</b>.`;
      return `<p class="prompt">${where} What do you do?</p><div class="cardrow big">${cards(q.combo)}</div>
        <div class="opts row">${opt('fold', 'Fold', 1)}${opt('call', open ? 'Limp' : 'Call', 2)}${opt('raise', open ? 'Raise' : '3-bet', 3)}</div>`;
    }
    if (id === 'outs') return `<p class="prompt">How many outs to a ${q.count === 2 ? 'set' : 'straight or a flush'}?</p>
      <div class="board">${cards(q.board)}${q.board.length === 3 ? slot() + slot() : slot()}</div><div class="cardrow">${cards(q.hole)}</div>
      <div class="opts row">${q.choices.map((c, i) => opt(c, String(c), i + 1)).join('')}</div>`;
    if (id === 'potodds') {
      const sit = `The pot is <b>${q.pot} bb</b>. Your opponent bets <b>${q.bet} bb</b>.`;
      if (q.type === 'need') {
        const vals = [...new Set([q.need].concat([1 / 6, 0.2, 0.25, 2 / 7, 0.3, 1 / 3, 0.375, 0.4].filter((x) => Math.abs(x - q.need) > 0.01)))].slice(0, 4);
        q.choices = vals.sort((a, b) => a - b);
        return `<p class="prompt">${sit} What share of the pot must you win to call?</p><div class="opts row">${q.choices.map((v, i) => opt(v.toFixed(4), pct(v), i + 1)).join('')}</div>`;
      }
      return `<p class="prompt">${sit} You are on the ${q.street} with <b>${q.outs} outs</b> and one card to come for this call. Call or fold?</p>
        <div class="opts row">${opt('call', 'Call', 1)}${opt('fold', 'Fold', 2)}</div>`;
    }
    if (id === 'equity') return `<p class="prompt">Both all-in before the flop. How does the first hand do?</p>
      <div class="two"><div class="hand-a"><span class="hl">First</span>${cards(q.a)}</div><div class="vs">against</div><div class="hand-b"><span class="hl">Second</span>${cards(q.b)}</div></div>
      <div class="opts col">${PK.EQ_BUCKETS.map((b, i) => opt(i, b.text, i + 1)).join('')}</div>`;
    if (id === 'nuts') return `<p class="prompt">Which two cards make the best possible hand on this board?</p>
      <div class="board">${cards(q.board)}</div>
      <div class="opts grid2">${q.options.map((o, i) => `<button class="opt hand-opt" data-ans="${i}"><kbd>${i + 1}</kbd>${cards(o.hand, 'mini')}</button>`).join('')}</div>`;
    return '';
  }
  function answerDrill(v) {
    if (!D || D.done) return;
    const { id, q } = D, s = drillState(id), d = drillById(id);
    let right, text;
    if (id === 'showdown') {
      right = v === q.answer;
      const win = q.answer === 'split' ? null : q.answer;
      const na = PK.describe(q.sa), nb = PK.describe(q.sb);
      text = `Hand A: ${na}. Hand B: ${nb}. ` + (win ? `<b>Hand ${win.toUpperCase()} wins</b>${q.decided === 'kicker' ? ', on the kicker' : q.decided === 'cards' ? ', on the higher cards' : ''}.` : '<b>The best five cards are equal: split pot.</b>');
      if (win) {
        const b5 = PK.best5((win === 'a' ? q.a : q.b).concat(q.board)).cards;
        text += `<div class="cardrow small">${cards(b5, 'mini')}</div>`;
      }
    } else if (id === 'preflop') {
      right = v === q.answer;
      const word = { fold: 'fold', call: q.key.startsWith('open') ? 'limp' : 'call', raise: q.key.startsWith('open') ? 'raise' : '3-bet' }[q.answer];
      text = `<b>${q.hand}: ${word}.</b> ${q.key.startsWith('open') && v === 'call' ? 'Limping is never in these charts: raise or fold when it is folded to you.' : ''}` + grid(q.key, { mark: q.hand });
    } else if (id === 'outs') {
      right = +v === q.count;
      const one = q.cardsLeft === 2 ? `By the river: about ${q.count * 4}% (outs × 4); the next card alone ${q.count * 2}%.` : `With the river to come: about ${q.count * 2}% (outs × 2).`;
      text = `<b>${q.count} outs</b>${q.draws.length ? ' (' + q.draws.join(' and ') + ')' : ''}. ${one}<div class="cardrow small">${cards(q.outs, 'mini')}</div>`;
    } else if (id === 'potodds') {
      const work = `You call ${q.bet} to win ${q.pot} + ${q.bet}: ${q.bet} ÷ (${q.pot} + ${q.bet} + ${q.bet}) = <b>${pct(q.need)}</b>.`;
      if (q.type === 'need') { right = Math.abs(+v - q.need) < 0.001; text = work; }
      else {
        right = v === q.answer;
        text = `${work} ${q.outs} outs with one card to come ≈ ${q.outs * 2}% (exactly ${pct(q.hit)}). <b>${q.answer === 'call' ? 'Call' : 'Fold'}.</b>`;
      }
    } else if (id === 'equity') {
      right = +v === q.answer;
      text = `<b>The first hand wins ${pct(q.win)}</b>${q.tie > 0.005 ? `, splits ${pct(q.tie)}` : ''}: an equity of ${pct(q.equity)}. ${PK.EQ_BUCKETS[q.answer].text}.`;
    } else if (id === 'nuts') {
      right = +v === q.answer;
      text = `<b>The nuts: ${q.nut.toLowerCase()}</b>${q.nutCombos > 1 ? ` (${q.nutCombos} combinations make it)` : ''}.<ul class="nutlist">${q.options.map((o) => `<li>${cards(o.hand, 'mini')} ${esc(o.desc)}</li>`).join('')}</ul>`;
    }
    D.done = true;
    s.total++;
    if (right) { s.right++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
    const justPassed = right && s.streak === d.target;
    saveP();
    document.querySelectorAll('#dq .opt').forEach((b) => {
      b.disabled = true;
      const a = b.dataset.ans;
      const isRight = id === 'potodds' && D.q.type === 'need' ? Math.abs(+a - q.need) < 0.001 : id === 'showdown' || id === 'preflop' || (id === 'potodds') ? a === String(q.answer) : +a === (id === 'outs' ? q.count : q.answer);
      b.classList.toggle('right', isRight);
      b.classList.toggle('wrong', a === String(v) && !right);
    });
    $('#dfeed').innerHTML = `<div class="vrow"><span class="verdict ${right ? 'good' : 'bad'}">${right ? 'Right' : 'Not this time'}</span><button class="btn primary" id="nextQ">Next question<kbd>Enter</kbd></button></div>` +
      (justPassed ? `<p class="passed">${d.target} in a row: drill passed.</p>` : '') + `<div class="exp">${text}</div>`;
    const streak = document.querySelector('.streak');
    streak.innerHTML = `<span class="meter big" aria-hidden="true"><i style="width:${Math.min(100, (s.streak / d.target) * 100)}%"></i></span><span><b>${s.streak}</b> in a row. Best ${s.best}, target ${d.target}${s.best >= d.target ? ' (passed)' : ''}.</span>`;
    $('#nextQ').focus({ preventScroll: true });
    const fb = $('#dfeed').getBoundingClientRect();
    if (fb.top > window.innerHeight - 140) window.scrollBy({ top: fb.top - window.innerHeight * 0.45, behavior: reduced ? 'auto' : 'smooth' });
  }
  function nextQuestion() { if (!D) return; D = { id: D.id, q: newQuestion(D.id), done: false }; render(); }

  // ---------- tools ----------
  VIEWS.tools = () => `<ul class="tool-list">
    <li><button data-go="chart"><b>Charts</b><span>Every preflop chart: raising first in, facing a raise, after a re-raise.</span></button></li>
    <li><button data-go="equity"><b>Equity calculator</b><span>Your hand against another hand or a range, on any board.</span></button></li>
    <li><button data-go="odds"><b>Outs and odds</b><span>From the number of outs to the chance of hitting, and the price of a call.</span></button></li>
    <li><button data-go="stats"><b>Your play</b><span>Hands, results, how often you played like the coach, your leaks and the hands you played.</span></button></li>
  </ul>`;
  const CHART_GROUPS = [
    ['Folded to you', ['open.UTG', 'open.HJ', 'open.CO', 'open.BTN', 'open.SB']],
    ['Facing a raise', ['vsEarly.IP', 'vsLate.IP', 'vsEarly.SB', 'vsLate.SB', 'vsEarly.BB', 'vsLate.BB', 'vsSB.BB']],
    ['After a re-raise', ['vs3bet.IP', 'vs3bet.OOP', 'vs4bet', 'cold3bet']],
    ['Limpers', ['vsLimp.IP', 'vsLimp.BB']],
  ];
  const CHART_SHORT = { 'open.UTG': 'UTG', 'open.HJ': 'HJ', 'open.CO': 'CO', 'open.BTN': 'BTN', 'open.SB': 'SB', 'vsEarly.IP': 'v early, in position', 'vsLate.IP': 'BTN v CO',
    'vsEarly.SB': 'SB v early', 'vsLate.SB': 'SB v BTN', 'vsEarly.BB': 'BB v early', 'vsLate.BB': 'BB v late', 'vsSB.BB': 'BB v SB', 'vs3bet.IP': 'In position', 'vs3bet.OOP': 'Out of position',
    'vs4bet': 'Facing a 4-bet', 'cold3bet': 'Raise and re-raise before you', 'vsLimp.IP': 'Limpers before you', 'vsLimp.BB': 'Big blind v limpers' };
  VIEWS.chart = (key) => {
    key = key || P.lastChart || 'open.BTN';
    return `${CHART_GROUPS.map(([g, ks]) => `<div class="chips-row"><span class="cg">${g}</span>${ks.map((k) => `<button class="chip${k === key ? ' on' : ''}" data-chart="${k}">${CHART_SHORT[k]}</button>`).join('')}</div>`).join('')}
      ${grid(key)}
      <p class="note">Six players, 100 bb stacks, opens of 2.5 bb. Pairs run down the diagonal, suited hands are above it, offsuit hands below.</p>`;
  };

  // equity calculator: hand A against a hand or a range, with a board
  const EQ = { a: [], b: [], board: [], range: null, slot: 'a', result: null };
  const RANGE_PRESETS = [
    ['any', 'Any two cards', () => PK.topRange(0, 1)], ['t10', 'Top 10%', () => PK.topRange(0, 0.1)], ['t25', 'Top 25%', () => PK.topRange(0, 0.25)],
    ['utg', 'Under the gun opens', () => PK.CHARTS['open.UTG'].raise], ['btn', 'Button opens', () => PK.CHARTS['open.BTN'].raise],
    ['bbdef', 'Big blind calls a button raise', () => PK.CHARTS['vsLate.BB'].call], ['3bet', 'A 3-bet from early', () => PK.CHARTS['vsEarly.IP'].raise],
  ];
  VIEWS.equity = () => {
    const used = new Set(EQ.a.concat(EQ.b, EQ.board));
    const slotBox = (k, label, n) => {
      const list = EQ[k];
      return `<button class="eq-slot${EQ.slot === k ? ' on' : ''}" data-eqslot="${k}"><span class="hl">${label}</span><span class="cardrow">${list.map((c) => card(c, 'mini')).join('')}${Array(n - list.length).fill(slot()).join('')}</span></button>`;
    };
    const res = EQ.result;
    return `<div class="eq-top">${slotBox('a', 'Your hand', 2)}<div class="vs">against</div>
      ${EQ.range ? `<button class="eq-slot range on" data-eqslot="b"><span class="hl">A range</span><b>${esc(RANGE_PRESETS.find((r) => r[0] === EQ.range)[1])}</b></button>` : slotBox('b', 'Their hand', 2)}</div>
      <div class="chips-row"><span class="cg">or a range</span>${RANGE_PRESETS.map(([k, t]) => `<button class="chip${EQ.range === k ? ' on' : ''}" data-range="${k}">${t}</button>`).join('')}</div>
      ${slotBox('board', 'Board (optional)', 5)}
      <div class="picker" role="group" aria-label="Choose cards">${[0, 1, 2, 3].map((s) => `<div class="prow">${PK.RANKS.split('').reverse().map((r) => {
        const c = PK.RANKS.indexOf(r) * 4 + s;
        return `<button class="pick ${SUIT_CL[s]}" data-pick="${c}" ${used.has(c) ? 'disabled' : ''} aria-label="${PK.RANK_NAME[c >> 2]} of ${SUIT_WORD[s]}">${RANK_SHOW(r)}</button>`;
      }).join('')}</div>`).join('')}</div>
      <div class="eq-actions"><button class="btn primary" id="eqRun" ${EQ.a.length === 2 && (EQ.range || EQ.b.length === 2) && EQ.board.length !== 1 && EQ.board.length !== 2 ? '' : 'disabled'}>Work it out</button><button class="btn ghost" id="eqClear">Clear</button></div>
      <div class="eq-res" aria-live="polite">${res ? `<div class="bar"><i class="you" style="width:${res.e * 100}%"></i></div>
        <p><b>You: ${(res.e * 100).toFixed(1)}%</b> (win ${(res.w * 100).toFixed(1)}%, split ${(res.t * 100).toFixed(1)}%), from ${res.n.toLocaleString('en-GB')} ${res.exact ? 'runouts, every one' : 'random runouts'}.</p>` : `<p class="note">Choose your two cards, theirs or a range, and a flop, turn or river if you like.</p>`}</div>`;
  };
  function eqPick(c) {
    const k = EQ.slot, max = k === 'board' ? 5 : 2;
    if (k === 'b' && EQ.range) EQ.range = null;
    if (EQ[k].length < max) EQ[k].push(c);
    if (EQ[k].length === max) EQ.slot = k === 'a' ? (EQ.range || EQ.b.length === 2 ? 'board' : 'b') : k === 'b' ? 'board' : 'board';
    EQ.result = null;
    render();
  }
  function eqRun() {
    const players = [{ hand: EQ.a }];
    if (EQ.range) players.push({ range: PK.rangeCombos(RANGE_PRESETS.find((r) => r[0] === EQ.range)[2](), EQ.a.concat(EQ.board)) });
    else players.push({ hand: EQ.b });
    const e = PK.equity(players, EQ.board, { samples: 60000 });
    EQ.result = { e: e.equity[0], w: e.win[0], t: e.tie[0], n: e.samples, exact: !EQ.range && EQ.board.length >= 3 };
    render();
  }
  VIEWS.odds = () => `<p class="lede">With two cards to come you hit by the river about outs × 4 percent of the time; with one card, outs × 2. The exact figures:</p>
    ${oddsTable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])}
    <h2>The price of a call</h2><table class="mini"><thead><tr><th>They bet</th><th>You need</th></tr></thead><tbody>
    ${[[0.25, 'a quarter of the pot'], [1 / 3, 'a third of the pot'], [0.5, 'half the pot'], [2 / 3, 'two thirds'], [0.75, 'three quarters'], [1, 'the pot'], [1.5, 'one and a half pots'], [2, 'twice the pot']]
      .map(([f, t]) => `<tr><td>${t}</td><td>${(f / (1 + 2 * f) * 100).toFixed(1)}%</td></tr>`).join('')}</tbody></table>`;

  // ---------- your play ----------
  const LEAK_TEXT = {
    limp: 'Limping when it was folded to you', loose: 'Playing too many hands before the flop', tight: 'Folding good hands before the flop',
    freeFold: 'Folding when you could check', badCall: 'Calling without the price', badFold: 'Folding hands that had the price',
    missedValue: 'Checking strong hands instead of betting', bluffMulti: 'Bluffing into several players', badRaise: 'Raising with too little',
  };
  VIEWS.stats = () => {
    const s = P.stats, h = s.hands;
    const rate = h ? (s.won / PK.BB / h) * 100 : 0;
    const dec = s.good + s.ok + s.mistakes;
    const leaks = Object.entries(s.leaks || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const f = (x, n) => (n ? pct(x / n) : 'none yet');
    return `${h ? `<div class="stat-grid">
      <div><span>Hands</span><b>${h.toLocaleString('en-GB')}</b></div>
      <div><span>Won</span><b class="${s.won >= 0 ? 'pos' : 'neg'}">${s.won >= 0 ? '+' : ''}${bb(s.won)}</b></div>
      <div><span>Per 100 hands</span><b class="${rate >= 0 ? 'pos' : 'neg'}">${rate >= 0 ? '+' : ''}${rate.toFixed(1)} bb</b></div>
      <div><span>Played like the coach</span><b>${dec ? pct(s.good / dec) : '–'}</b></div></div>
      <table class="mini wide"><tbody>
      <tr><td>Hands you put money in voluntarily (VPIP)</td><td>${f(s.vpip, h)}</td><td class="aim">aim for 20 to 28%</td></tr>
      <tr><td>Hands you raised before the flop (PFR)</td><td>${f(s.pfr, h)}</td><td class="aim">a few points under VPIP</td></tr>
      <tr><td>Flops seen</td><td>${f(s.sawFlop, h)}</td><td></td></tr>
      <tr><td>Went to showdown, of flops seen</td><td>${f(s.wtsd, s.sawFlop)}</td><td class="aim">about 25 to 30%</td></tr>
      <tr><td>Won at showdown</td><td>${f(s.wsd, s.wtsd)}</td><td class="aim">50% or more</td></tr>
      <tr><td>Decisions graded good, fine, mistake</td><td colspan="2">${s.good}, ${s.ok}, ${s.mistakes}</td></tr>
      <tr><td>Before the flop by the chart</td><td colspan="2">${f(s.preGood, s.preTotal)}</td></tr>
      <tr><td>After the flop as the coach would</td><td colspan="2">${f(s.postGood, s.postTotal)}</td></tr>
      <tr><td>Rebuys</td><td colspan="2">${s.rebuys}</td></tr></tbody></table>
      <h2>Your leaks</h2>${leaks.length ? `<ol class="leaks">${leaks.map(([k, n]) => `<li><b>${LEAK_TEXT[k] || k}</b><span>${n} time${n === 1 ? '' : 's'}</span></li>`).join('')}</ol>` : '<p class="note">No mistakes recorded yet.</p>'}
      <h2>Hands you played</h2>${HANDS.length ? `<ul class="hand-list">${HANDS.slice(0, 40).map((x, i) => `<li><button data-review="${i}"><span class="cardrow">${cards(x.hole, 'mini')}</span><span class="hpos">${x.pos}</span><span class="hboard">${x.board.length ? cards(x.board, 'mini') : '<em>no flop</em>'}</span><span class="hnet ${x.net >= 0 ? 'pos' : 'neg'}">${x.net > 0 ? '+' : ''}${bb(x.net)}</span>${x.mistakes ? `<span class="hm">${x.mistakes} mistake${x.mistakes > 1 ? 's' : ''}</span>` : ''}</button></li>`).join('')}</ul>` : ''}
      <p><button class="btn ghost" id="resetStats">Clear your play statistics</button></p>`
    : `<p class="lede">Nothing here yet. Play some hands at the table: every decision is graded and your leaks show up here.</p><button class="btn primary" data-go="play">Take a seat</button>`}`;
  };

  // ---------- the table ----------
  let loop = 0, busy = false, lastActs = {}, feedback = null, advice = null, raiseTo = 0, shownBoard = 0, lastHandNo = -1;
  const SPEED = { fast: 280, normal: 650, slow: 1100 };
  const delay = () => SPEED[P.settings.speed] || 650;
  function ensureTable() {
    if (!T) { T = PK.newTable({ mix: P.settings.mix }); T.sessionHands = 0; T.sessionWon = 0; saveT(); }
    return T;
  }
  // seat i drawn at place (i - 0) around the table: you at the bottom, then clockwise
  function seatHTML(i) {
    const s = T.seats[i], pos = T.street === 'idle' ? '' : PK.seatPos(T, i);
    const acting = T.toAct === i && T.street !== 'done';
    const la = lastActs[i];
    const won = T.street === 'done' && T.result && T.result.winners.includes(i);
    const holeHTML = !s.hole ? '' : s.hero ? '' : s.folded ? '' : (s.shown || (T.street === 'done' && T.result && T.result.showdown && !s.folded)) ? cards(s.hole, 'mini') : back('mini') + back('mini');
    const style = s.hero ? '' : `<span class="style ${s.style}">${PK.STYLES[s.style].name}</span>`;
    return `<div class="seat p${i}${acting ? ' acting' : ''}${s.folded && T.street !== 'idle' ? ' out' : ''}${won ? ' won' : ''}${s.hero ? ' hero' : ''}" data-seat="${i}">
      <div class="plate"><b class="nm">${esc(s.name)}</b>${style}<span class="stk">${bb(s.stack)}</span>${pos ? `<span class="pos">${pos}</span>` : ''}</div>
      <div class="hole">${holeHTML}</div>
      ${la ? `<span class="act ${la.type}">${esc(la.text)}</span>` : ''}
      ${s.bet > 0 ? `<span class="bet"><i class="chip-dot"></i>${PK.fmtBB(s.bet)}</span>` : ''}
      ${T.button === i && T.street !== 'idle' ? '<span class="dbtn" aria-label="dealer button">D</span>' : ''}
    </div>`;
  }
  VIEWS.play = () => {
    ensureTable();
    return `<section class="play">
      <div class="table-area"><div class="felt" id="felt">${[1, 2, 3, 4, 5, 0].map(seatHTML).join('')}
        <div class="center"><div class="board" id="board"></div><div class="pot" id="pot"></div></div></div></div>
      <div class="me" id="me"></div>
      <div class="actions" id="actions"></div>
      <aside class="side"><div class="coach" id="coach" aria-live="polite"></div><ol class="tlog" id="tlog" aria-label="This hand so far"></ol></aside>
      <div class="table-meta" id="tmeta"></div>
    </section>`;
  };
  AFTER.play = () => drawTable();
  function drawTable() {
    if (view.name !== 'play' || !T) return;
    const felt = $('#felt');
    if (!felt) return;
    // seats
    [1, 2, 3, 4, 5, 0].forEach((i) => {
      const el = felt.querySelector(`[data-seat="${i}"]`);
      const tmp = document.createElement('div');
      tmp.innerHTML = seatHTML(i);
      el.replaceWith(tmp.firstElementChild);
    });
    // board: new cards slide in
    const b = $('#board');
    if (T.handNo !== lastHandNo) { shownBoard = 0; lastHandNo = T.handNo; }
    b.innerHTML = T.board.map((c, k) => card(c, k >= shownBoard && !reduced ? 'deal' : '')).join('') + Array(5 - T.board.length).fill(slot()).join('');
    shownBoard = T.board.length;
    const potNow = T.street === 'done' ? 0 : PK.pot(T);
    $('#pot').innerHTML = T.street === 'idle' ? '' : T.street === 'done' ? resultLine() : `Pot <b>${bb(potNow)}</b>`;
    // your turn: the coach looks at the spot at once
    let fresh = false;
    if (T.toAct === 0 && T.street !== 'done' && !advice) { advice = PK.coachAdvice(T); raiseTo = 0; fresh = true; if (!T.decisions) T.decisions = []; }
    // you
    const me = T.seats[0];
    const cls = me.hole && T.board.length ? PK.classify(me.hole, T.board) : null;
    $('#me').innerHTML = me.hole && !me.folded ? `<div class="cardrow big">${cards(me.hole)}</div><div class="made">${cls ? esc(cap(cls.made)) + (cls.draws.length ? ', ' + esc(cls.draws.join(', ')) : '') : esc(PK.handClass(me.hole[0], me.hole[1])) + (T.street !== 'idle' ? ' ' + AT[PK.seatPos(T, 0)] : '')}</div>`
      : me.hole && me.folded ? `<div class="cardrow big dim">${cards(me.hole)}</div><div class="made">You folded</div>` : '';
    drawCoach();
    drawActions();
    $('#tlog').innerHTML = T.log.map((l) => `<li class="${l.kind}">${esc(l.text)}</li>`).join('');
    if (fresh) { const a = $('#actions').getBoundingClientRect(); if (a.bottom > window.innerHeight - 64) $('#actions').scrollIntoView({ block: 'end', behavior: reduced ? 'auto' : 'smooth' }); }
    $('#tmeta').innerHTML = `<span>Hand ${T.handNo || 0}</span><span>This table ${T.sessionWon >= 0 ? '+' : ''}${bb(T.sessionWon || 0)} over ${T.sessionHands || 0} hands</span><button class="linkish" id="openSettings">Settings</button>`;
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function resultLine() {
    const wins = T.log.filter((l) => l.kind === 'win').map((l) => esc(l.text));
    return `<span class="res">${wins.join('<br>')}</span>`;
  }
  function drawCoach() {
    const el = $('#coach');
    if (!el) return;
    let html = '';
    if (feedback) html += `<div class="fb ${feedback.grade}${T.toAct === 0 && advice && P.settings.hints ? ' small' : ''}"><span class="badge">${{ good: 'Good', ok: 'Fine', mistake: 'Mistake' }[feedback.grade]}</span><span>${esc(feedback.note)}</span></div>`;
    if (T.toAct === 0 && T.street !== 'done' && advice && P.settings.hints) html += adviceHTML(advice);
    else if (T.street === 'done' && T.seats[0].hole) html += `<p class="hint-line">${T.decisions && T.decisions.length ? `${T.decisions.length} decision${T.decisions.length > 1 ? 's' : ''} this hand. ` : ''}<button class="linkish" id="reviewLast">Review the hand</button></p>`;
    else if (T.toAct > 0) html += `<p class="hint-line wait">${esc(T.seats[T.toAct].name)} to act…</p>`;
    el.innerHTML = html;
  }
  function adviceHTML(a) {
    if (a.street === 'preflop') {
      const word = a.action === 'raise' ? (T.raises === 0 ? `raise to ${bb(a.raiseTo)}` : T.raises === 1 ? `3-bet to ${bb(a.raiseTo)}` : `raise to ${bb(a.raiseTo)}`) : a.action;
      return `<div class="adv"><p><b>Chart: ${esc(word)}.</b> ${esc(a.why)}</p></div>`;
    }
    const word = a.action === 'bet' ? `bet about ${a.size >= 0.7 ? 'three quarters of' : 'half'} the pot` : a.action === 'raise' ? `raise to ${bb(a.raiseTo)}` : a.action;
    return `<div class="adv"><span class="bar" aria-hidden="true"><i style="width:${a.equity * 100}%"></i>${a.toCall ? `<em style="left:${a.need * 100}%"></em>` : ''}</span>
      <p>You have about <b>${pct(a.equity)}</b> against their likely hands${a.toCall ? `; calling ${bb(a.toCall)} to win ${bb(a.pot)} needs <b>${pct(a.need)}</b>` : ''}.</p>
      <p><b>Coach: ${esc(word)}${a.close ? ' (close)' : ''}.</b> ${esc(a.why)}</p></div>`;
  }
  function drawActions() {
    const el = $('#actions');
    if (!el) return;
    const me = T.seats[0];
    if (T.street === 'idle' || T.street === 'done') {
      if (me.stack <= 0) { el.innerHTML = `<p class="busted">You are out of chips.</p><button class="btn primary" id="rebuy">Buy in again for 100 bb</button>`; return; }
      el.innerHTML = `<button class="btn primary wide" id="deal">${T.street === 'idle' ? 'Deal the first hand' : 'Next hand'}<kbd>Enter</kbd></button>`;
      return;
    }
    if (T.toAct !== 0 || busy) { el.innerHTML = '<div class="act-wait" aria-hidden="true"></div>'; return; }
    const L = PK.legal(T);
    const potNow = PK.pot(T);
    let sizes = [];
    if (L.raise) {
      if (T.street === 'preflop') {
        const std = PK.preflopRaiseTo(T, 0);
        sizes = [[std, 'Standard'], [Math.round(T.currentBet + potNow + L.toCall), 'Pot'], [L.raise.max, 'All-in']];
        if (T.raises === 0) sizes.unshift([Math.round(2 * PK.BB + T.limpers * PK.BB), 'Min']);
      } else {
        const base = (f) => Math.round(T.currentBet + (potNow + L.toCall) * f);
        sizes = L.check ? [[base(1 / 3), '⅓'], [base(0.5), '½'], [base(0.75), '¾'], [base(1), 'Pot'], [L.raise.max, 'All-in']]
          : [[Math.round(T.currentBet * 2.5), '2.5×'], [Math.round(T.currentBet * 3), '3×'], [base(1), 'Pot'], [L.raise.max, 'All-in']];
      }
      sizes = sizes.map(([v, t]) => [Math.max(L.raise.min, Math.min(L.raise.max, v)), t]).filter((x, k, a) => a.findIndex((y) => y[0] === x[0]) === k);
      if (!raiseTo || raiseTo < L.raise.min || raiseTo > L.raise.max) {
        const want = advice && (advice.raiseTo || advice.betTo);
        raiseTo = want && want >= L.raise.min ? want : sizes[0][0];
      }
    }
    const word = L.check ? 'Bet' : 'Raise to';
    el.innerHTML = `${L.raise ? `<div class="sizes">${sizes.map(([v, t]) => `<button class="chip${v === raiseTo ? ' on' : ''}" data-size="${v}">${t}</button>`).join('')}
      <input type="range" id="sizer" min="${L.raise.min}" max="${L.raise.max}" step="${PK.BB / 2}" value="${raiseTo}" aria-label="Bet size"></div>` : ''}
      <div class="btns">
        ${L.check ? '' : `<button class="btn act-fold" data-act="fold">Fold<kbd>F</kbd></button>`}
        <button class="btn act-call" data-act="${L.check ? 'check' : 'call'}">${L.check ? 'Check' : 'Call ' + bb(L.toCall)}<kbd>C</kbd></button>
        ${L.raise ? `<button class="btn act-raise" data-act="raise">${raiseTo >= L.raise.max ? 'All-in ' + bb(raiseTo) : word + ' ' + bb(raiseTo)}<kbd>R</kbd></button>` : ''}
      </div>`;
  }

  function stopLoop() { clearTimeout(loop); loop = 0; }
  function startLoop() { stopLoop(); loop = setTimeout(step, 30); }
  // One step of the table: an opponent acts, a card is dealt, or it is your turn.
  function step() {
    loop = 0;
    if (view.name !== 'play' || !T) return;
    if (T.street === 'idle' || T.street === 'done') { drawTable(); return; }
    if (T.toAct === -1) { // all-in: the board runs out a street at a time
      PK.runOutStep(T);
      if (T.street === 'done') endHand();
      saveT(); drawTable();
      loop = setTimeout(step, delay() * 1.3);
      return;
    }
    if (T.toAct === 0) { drawTable(); return; } // your turn: drawTable asks the coach
    const before = T.street, i = T.toAct, a = PK.botAction(T);
    const L = PK.legal(T);
    PK.act(T, a);
    lastActs[i] = actLabel(a, L, T, i);
    afterAct(before);
    loop = setTimeout(step, T.street !== before ? delay() * 1.4 : delay());
  }
  function actLabel(a, L, st, i) {
    const s = st.seats[i];
    if (a.type === 'fold') return { type: 'fold', text: 'Fold' };
    if (a.type === 'check' || (a.type === 'call' && L.check)) return { type: 'check', text: 'Check' };
    if (a.type === 'call' || !L.raise) return { type: 'call', text: s.allIn ? 'All-in' : 'Call' };
    return { type: 'raise', text: s.allIn ? 'All-in' : (L.check && st.street !== 'preflop' ? 'Bet ' : 'Raise ') + PK.fmtBB(Math.min(a.to, L.raise.max)) };
  }
  function afterAct(before) {
    if (T.street !== before) { lastActs = {}; if (T.street === 'flop' && !T.seats[0].folded) T.heroSawFlop = true; }
    if (T.street === 'done') endHand();
    saveT();
    drawTable();
  }
  function heroAct(type) {
    if (!T || T.toAct !== 0 || T.street === 'done' || busy) return;
    const L = PK.legal(T);
    let a = { type };
    if (type === 'raise') { if (!L.raise) return; a.to = raiseTo; }
    if (type === 'fold' && L.check) a = { type: 'check' }; // there is no Fold button when checking is free
    const adv = advice || PK.coachAdvice(T);
    const g = PK.grade(adv, a, L);
    feedback = g;
    const before = T.street;
    T.decisions.push({ street: T.street, board: T.board.slice(), grade: g.grade, note: g.note, want: g.want, did: g.did, eq: adv.equity, need: adv.need, toCall: L.toCall, pot: adv.pot, leak: leakOf(adv, g, L), hand: adv.hand || null });
    PK.act(T, a);
    lastActs[0] = actLabel(a, L, T, 0);
    advice = null;
    afterAct(before);
    loop = setTimeout(step, delay());
  }
  function leakOf(adv, g, L) {
    if (g.grade !== 'mistake') return null;
    if (adv.street === 'preflop') return g.did === 'call' && g.want === 'raise' ? 'limp' : g.want === 'fold' ? 'loose' : g.did === 'fold' ? (L.check ? 'freeFold' : 'tight') : null;
    if (g.did === 'fold') return L.check ? 'freeFold' : 'badFold';
    if (g.did === 'call') return 'badCall';
    if (g.did === 'check') return 'missedValue';
    if (g.did === 'bet') return 'bluffMulti';
    if (g.did === 'raise') return 'badRaise';
    return null;
  }
  function deal() {
    if (!T) ensureTable();
    if (T.seats[0].stack <= 0) return;
    stopLoop();
    lastActs = {}; feedback = null; advice = null; T.heroSawFlop = false;
    PK.startHand(T);
    saveT();
    drawTable();
    loop = setTimeout(step, delay());
  }
  function endHand() {
    const me = T.seats[0], s = P.stats;
    const net = me.stack - me.startStack;
    s.hands++; s.won += net;
    T.sessionHands = (T.sessionHands || 0) + 1; T.sessionWon = (T.sessionWon || 0) + net;
    const pre = me.pre;
    if (pre && pre !== 'check') s.vpip++;
    if (['open', 'iso', '3bet', '4bet'].includes(pre)) s.pfr++;
    if (T.heroSawFlop) s.sawFlop++;
    const sd = T.result && T.result.showdown && !me.folded;
    if (sd) { s.wtsd++; if (me.won > 0) s.wsd++; }
    if (net > 0) s.wonHands++;
    let mistakes = 0;
    for (const d of T.decisions || []) {
      if (d.grade === 'good') s.good++; else if (d.grade === 'ok') s.ok++; else { s.mistakes++; mistakes++; }
      if (d.street === 'preflop') { s.preTotal++; if (d.grade === 'good') s.preGood++; } else { s.postTotal++; if (d.grade === 'good') s.postGood++; }
      if (d.leak) s.leaks[d.leak] = (s.leaks[d.leak] || 0) + 1;
    }
    HANDS.unshift({ no: T.handNo, at: Date.now(), pos: PK.seatPos(T, 0), hole: me.hole.slice(), board: T.board.slice(), net, mistakes, decisions: T.decisions || [],
      shown: T.seats.map((x, i) => (i > 0 && !x.folded && T.result.showdown ? { name: x.name, hole: x.hole.slice() } : null)).filter(Boolean),
      log: T.log.map((l) => ({ street: l.street, text: l.text, kind: l.kind })) });
    HANDS = HANDS.slice(0, 60);
    store(HANDS_KEY, HANDS);
    saveP();
  }

  // ---------- sheets: settings, hand review ----------
  function openSheet(html, cls) {
    sheet = cls || 'sheet';
    $('#sheet').innerHTML = `<div class="sheet-card ${cls || ''}" role="dialog" aria-modal="true"><button class="icon-btn close" id="closeSheet" aria-label="Close">✕︎</button>${html}</div>`;
    $('#sheet').hidden = false;
    document.body.classList.add('sheet-open');
    const f = $('#sheet button:not(.close), #sheet input');
    if (f) f.focus({ preventScroll: true });
  }
  function closeSheet() { sheet = null; $('#sheet').hidden = true; $('#sheet').innerHTML = ''; document.body.classList.remove('sheet-open'); }
  function settingsSheet() {
    const S = P.settings;
    const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button class="chip${S[k] === v ? ' on' : ''}" data-set="${k}" data-val="${v}">${t}</button>`).join('')}</div>`;
    openSheet(`<h2>Settings</h2>
      <label class="row"><span><b>Coach hints</b><small>The chart's play before the flop, your equity and the price after it, before you act. Grades come after you act either way.</small></span><input type="checkbox" id="setHints" ${S.hints ? 'checked' : ''}></label>
      <div class="row col"><b>Speed of the other players</b>${seg('speed', [['fast', 'Fast'], ['normal', 'Normal'], ['slow', 'Slow']])}</div>
      <label class="row"><span><b>Four-colour deck</b><small>Diamonds blue and clubs green, as most online rooms do: flushes are easier to see.</small></span><input type="checkbox" id="setColors" ${S.fourColor ? 'checked' : ''}></label>
      <div class="row col"><b>Opponents at a new table</b>${seg('mix', [['soft', 'Soft'], ['mixed', 'Mixed'], ['tough', 'Tough']])}<small>Soft: mostly calling stations. Mixed: one of each kind and two regulars. Tough: regulars and a maniac.</small></div>
      <div class="row col"><button class="btn" id="newTable">Leave this table and sit at a new one</button></div>
      <div class="row col"><button class="btn ghost danger" id="resetAll">Clear all progress</button></div>`, 'settings');
  }
  function reviewSheet(h) {
    if (!h) return;
    const lines = (st) => h.log.filter((l) => l.street === st).map((l) => `<li class="${l.kind}">${esc(l.text)}</li>`).join('');
    const decs = h.decisions.map((d) => `<li class="dec ${d.grade}"><div class="dh"><span class="badge">${{ good: 'Good', ok: 'Fine', mistake: 'Mistake' }[d.grade]}</span><b>${cap(d.street)}</b>${d.board.length ? `<span class="cardrow">${cards(d.board, 'mini')}</span>` : ''}</div>
      <p>You chose <b>${d.did}</b>${d.want && d.want !== d.did ? `, the coach would ${d.want}` : ''}. ${esc(d.note)}${d.eq !== undefined && d.eq !== null && d.street !== 'preflop' ? ` <small>Your equity ${pct(d.eq)}${d.toCall ? ', the price ' + pct(d.need) : ''}.</small>` : ''}</p></li>`).join('');
    openSheet(`<h2>Hand ${h.no}</h2>
      <div class="rv-top"><div><span class="hl">You, ${h.pos}</span><span class="cardrow">${cards(h.hole, 'mini')}</span></div><div><span class="hl">Board</span><span class="cardrow">${h.board.length ? cards(h.board, 'mini') : '<em>no flop</em>'}</span></div><div><span class="hl">Result</span><b class="${h.net >= 0 ? 'pos' : 'neg'}">${h.net > 0 ? '+' : ''}${bb(h.net)}</b></div></div>
      ${h.shown.length ? `<p class="shown">${h.shown.map((x) => `${esc(x.name)} ${cards(x.hole, 'mini')}`).join(' ')}</p>` : ''}
      <h3>Your decisions</h3><ol class="decs">${decs || '<li>None: you were not asked to act.</li>'}</ol>
      <h3>What happened</h3>${['preflop', 'flop', 'turn', 'river', 'showdown'].map((s) => lines(s) ? `<ul class="log">${lines(s)}</ul>` : '').join('')}`, 'review');
  }

  // ---------- input ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-go]');
    if (!t) return;
    if (t.id === 'closeSheet' || (sheet && t.closest('#sheet') && t.dataset.go)) closeSheet();
    if (t.dataset.go) { go(t.dataset.go, t.dataset.arg); return; }
    if (t.dataset.tab) { go(t.dataset.tab); return; }
    if (t.dataset.quiz !== undefined) { answerQuiz(+t.dataset.quiz, +t.dataset.opt); return; }
    if (t.dataset.ans !== undefined) { answerDrill(t.dataset.ans); return; }
    if (t.id === 'nextQ') { nextQuestion(); return; }
    if (t.dataset.chart) { P.lastChart = t.dataset.chart; saveP(); view.arg = t.dataset.chart; render(); return; }
    if (t.dataset.eqslot) { EQ.slot = t.dataset.eqslot; if (EQ.slot === 'b' && EQ.range) EQ.range = null; EQ[EQ.slot] = []; EQ.result = null; render(); return; }
    if (t.dataset.range) { EQ.range = t.dataset.range; EQ.b = []; EQ.slot = EQ.a.length < 2 ? 'a' : 'board'; EQ.result = null; render(); return; }
    if (t.dataset.pick) { eqPick(+t.dataset.pick); return; }
    if (t.id === 'eqRun') { eqRun(); return; }
    if (t.id === 'eqClear') { Object.assign(EQ, { a: [], b: [], board: [], range: null, slot: 'a', result: null }); render(); return; }
    if (t.dataset.act) { heroAct(t.dataset.act); return; }
    if (t.dataset.size) { raiseTo = +t.dataset.size; drawActions(); return; }
    if (t.id === 'deal') { deal(); return; }
    if (t.id === 'rebuy') { T.seats[0].stack = 100 * PK.BB; P.stats.rebuys++; saveP(); saveT(); drawTable(); return; }
    if (t.id === 'openSettings' || t.id === 'settingsBtn') { settingsSheet(); return; }
    if (t.id === 'reviewLast') { reviewSheet(HANDS[0]); return; }
    if (t.dataset.review !== undefined) { reviewSheet(HANDS[+t.dataset.review]); return; }
    if (t.dataset.set) { P.settings[t.dataset.set] = t.dataset.val; saveP(); settingsSheet(); if (view.name === 'play') drawTable(); return; }
    if (t.id === 'newTable') { stopLoop(); T = null; ensureTable(); lastActs = {}; feedback = null; closeSheet(); go('play'); return; }
    if (t.id === 'resetStats') { if (confirm('Clear your play statistics and hand history?')) { P.stats = PK.emptyStats(); HANDS = []; store(HANDS_KEY, HANDS); saveP(); render(); } return; }
    if (t.id === 'resetAll') { if (confirm('Clear all progress: lessons, drills, statistics and the table?')) { localStorage.removeItem(KEY); localStorage.removeItem(TABLE_KEY); localStorage.removeItem(HANDS_KEY); location.reload(); } return; }
    if (t.id === 'back') { goBack(); return; }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'setHints') { P.settings.hints = e.target.checked; saveP(); if (view.name === 'play') drawTable(); }
    if (e.target.id === 'setColors') { P.settings.fourColor = e.target.checked; saveP(); applySettings(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'sizer') {
      raiseTo = +e.target.value;
      const L = PK.legal(T), b = document.querySelector('[data-act="raise"]');
      if (b) b.firstChild.textContent = raiseTo >= L.raise.max ? 'All-in ' + bb(raiseTo) : (L.check ? 'Bet ' : 'Raise to ') + bb(raiseTo);
      document.querySelectorAll('[data-size]').forEach((c) => c.classList.toggle('on', +c.dataset.size === raiseTo));
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.matches && e.target.matches('input[type="text"], textarea')) return;
    const k = e.key;
    if (k === 'Escape') { if (sheet) { closeSheet(); e.preventDefault(); } else if (PARENT[view.name]) { goBack(); e.preventDefault(); } return; }
    if (sheet) return;
    if (view.name === 'play' && T) {
      if (T.toAct === 0 && T.street !== 'done') {
        const L = PK.legal(T);
        if (k === 'f' || k === 'F') { if (!L.check) heroAct('fold'); e.preventDefault(); }
        else if (k === 'c' || k === 'C' || k === 'k' || k === 'K') { heroAct(L.check ? 'check' : 'call'); e.preventDefault(); }
        else if ((k === 'r' || k === 'R' || k === 'b' || k === 'B') && L.raise) { heroAct('raise'); e.preventDefault(); }
        else if (/^[1-6]$/.test(k)) { const b = document.querySelectorAll('[data-size]')[+k - 1]; if (b) { b.click(); e.preventDefault(); } }
      } else if ((k === 'Enter' || k === ' ') && (T.street === 'done' || T.street === 'idle') && $('#deal')) { deal(); e.preventDefault(); }
      return;
    }
    if (view.name === 'drill' && D) {
      if (!D.done && /^[1-5]$/.test(k)) { const b = document.querySelectorAll('#dq .opt')[+k - 1]; if (b) { b.click(); e.preventDefault(); } }
      else if (D.done && (k === 'Enter' || k === ' ' || k === 'n' || k === 'N')) { nextQuestion(); e.preventDefault(); }
    }
  });
  function goBack() {
    if (sheet) { closeSheet(); return true; }
    if (PARENT[view.name]) { go(PARENT[view.name]); return true; }
    if (view.name !== 'learn') { go('learn'); return true; }
    return false;
  }
  function applySettings() { document.body.classList.toggle('four-color', !!P.settings.fourColor); }
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

  // what the Android app asks when Back is pressed: true when the page handled it
  window.PokerApp = { back: goBack, get state() { return T; }, get progress() { return P; }, get drill() { return D; }, get advice() { return advice; }, go, deal, heroAct, PK };
  applySettings();
  const start = (location.hash || '').replace('#', '');
  go(TABS.includes(start) ? start : 'learn');
})();
