/* Bounce Arrows - game, rendering, UI and progression. Rules/generation live in levels.js. */
(() => {
  'use strict';
  const { DIRS } = Levels;
  const t = k => I18N.t(k);
  const $ = s => document.querySelector(s);

  /* ---------------------------------------------------------------- save */
  const SAVE_KEY = 'bouncearrows.v1';
  const DEFAULTS = { level: 1, coins: 40, hints: 3, cleared: 0, streak: 0, lastDaily: '', dailyDone: {}, noAds: false, sound: true, lang: null, seen: {} };
  function loadSave() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
    catch (_) { return Object.assign({}, DEFAULTS); }
  }
  let save = loadSave();
  window.BA_SAVE = save;
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { /* private mode */ } };

  /* ---------------------------------------------------------------- sound */
  const Sfx = {
    ac: null,
    init() {
      if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { /* no audio */ } }
      if (this.ac && this.ac.state === 'suspended') this.ac.resume();
    },
    tone(f, d, type, v, slide) {
      if (!save.sound || !this.ac) return;
      const ac = this.ac, o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, n);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), n + d);
      g.gain.setValueAtTime(v || 0.1, n);
      g.gain.exponentialRampToValueAtTime(0.0001, n + d);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(n + d);
    },
    exit(c) { this.tone(380 + Math.min(c, 10) * 55, 0.14, 'triangle', 0.1, 420); },
    bump() { this.tone(160, 0.2, 'square', 0.07, -70); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.12), i * 110)); },
    fail() { [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'sawtooth', 0.07), i * 140)); },
  };
  const vibrate = ms => { try { if (save.sound && navigator.vibrate) navigator.vibrate(ms); } catch (_) { /* ignore */ } };

  /* ---------------------------------------------------------------- state */
  const PALETTE = ['#5ad1ff', '#ff7eb6', '#7fe08f', '#b79cff', '#ff9f5a', '#4fe0c8', '#ff6b6b'];
  const GOLD = '#ffcf4a';
  const cv = $('#board'), ctx = cv.getContext('2d');
  const g = { screen: 'home', arrows: [], occ: null, w: 0, h: 0, cell: 40, ox: 0, oy: 0, W: 0, H: 0, dpr: 1, queue: [], floats: [], over: true, won: true, pressing: false, press: -1, hintId: -1, hintUntil: 0 };
  const nowMs = () => performance.now();

  const pad2 = n => String(n).padStart(2, '0');
  const dateStr = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  const todayStr = () => dateStr(new Date());
  const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateStr(d); };
  const streakNow = () => (save.lastDaily === todayStr() || save.lastDaily === yesterdayStr()) ? save.streak : 0;

  /* ------------------------------------------------------------- screens */
  function show(id) {
    g.screen = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    if (id === 'play') layout();
    if (id === 'home') updateHome();
  }

  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.remove('show'), ms || 3200);
  }

  function updateHud() {
    $('#hearts').textContent = '❤️'.repeat(Math.max(0, g.hearts)) + '🖤'.repeat(Math.max(0, 3 - g.hearts));
    $('#coins').textContent = save.coins;
    $('#hintCount').textContent = save.hints;
    $('#lvlLabel').textContent = g.mode === 'daily' ? t('daily') + ' ' + g.cfg.daily.slice(5) : t('level') + ' ' + g.cfg.n;
  }

  function updateHome() {
    $('#homeTitle').textContent = t('title');
    $('#homeTagline').textContent = t('tagline');
    $('#homeCoins').textContent = save.coins;
    $('#btnPlay').textContent = '▶ ' + t('play') + ' · ' + t('level') + ' ' + save.level;
    const done = !!save.dailyDone[todayStr()];
    $('#btnDaily').textContent = '📅 ' + t('daily') + (done ? ' ✓ ' + t('dailyDone') : '');
    const s = streakNow();
    $('#homeStreak').textContent = s ? '🔥 ' + s + ' ' + t('streak') : t('dailyNew');
    $('#hintLabel').textContent = t('hint');
    $('#restartLabel').textContent = t('restart');
  }

  /* --------------------------------------------------------------- modal */
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(label, cls, fn) { const b = el('button', 'btn ' + (cls || ''), label); b.onclick = fn; return b; }
  function openModal(build) { const c = $('#modalCard'); c.innerHTML = ''; build(c); $('#modal').classList.add('show'); }
  function closeModal() { $('#modal').classList.remove('show'); }
  const modalOpen = () => $('#modal').classList.contains('show');

  /* --------------------------------------------------------------- layout */
  function layout() {
    const wrap = $('#boardWrap');
    g.W = wrap.clientWidth; g.H = wrap.clientHeight;
    g.dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(g.W * g.dpr); cv.height = Math.round(g.H * g.dpr);
    if (!g.w) return;
    g.cell = Math.max(16, Math.min(64, Math.floor(Math.min((g.W - 20) / g.w, (g.H - 20) / g.h))));
    g.ox = (g.W - g.cell * g.w) / 2; g.oy = (g.H - g.cell * g.h) / 2;
  }
  window.addEventListener('resize', layout);

  /* ----------------------------------------------------------- game setup */
  function startGame(mode, cfg) {
    const lv = Levels.generateLevel(cfg);
    g.mode = mode; g.cfg = cfg; g.w = lv.w; g.h = lv.h;
    g.arrows = lv.arrows.map(a => {
      const L = a.cells.length, path = a.cells.concat(a.ray);
      const last = path[path.length - 1], d = DIRS[a.exitDir];
      for (let i = 1; i <= L + 3; i++) path.push([last[0] + d[0] * i, last[1] + d[1] * i]);
      return Object.assign(a, { removed: false, anim: null, flash: 0, path, total: L + a.ray.length });
    });
    g.occ = Levels.makeOcc(lv);
    g.left = g.arrows.length; g.hearts = 3; g.mistakes = 0; g.over = false; g.won = false;
    g.queue = []; g.floats = []; g.combo = 0; g.comboCoins = 0; g.hintId = -1; g.press = -1; g.pressing = false;
    g.startT = nowMs(); g.continues = 0;
    closeModal(); show('play'); updateHud();
    Metrics.track('level_start', { mode, level: cfg.n, daily: cfg.daily });
    if (cfg.n === 1 && !save.seen.tip1) { save.seen.tip1 = 1; persist(); toast(t('tip1'), 5000); }
    else if (cfg.chain && !save.seen.chain) { save.seen.chain = 1; persist(); toast(t('tipChain'), 5000); }
    else if (cfg.bounce && !save.seen.bounce) { save.seen.bounce = 1; persist(); toast(t('tipBounce'), 5000); }
  }
  const startLevel = () => startGame('level', Levels.levelConfig(save.level));
  const startDaily = () => startGame('daily', Levels.dailyConfig(todayStr()));
  const restart = () => startGame(g.mode, g.cfg);

  /* ----------------------------------------------------------- gameplay */
  function exitArrow(a, viaChain) {
    a.removed = true; a.anim = { type: 'exit', t0: nowMs() };
    for (const [x, y] of a.cells) g.occ[y * g.w + x] = -1;
    g.left--;
    if (viaChain) {
      g.combo++; g.comboCoins += 2;
      const [hx, hy] = a.cells[a.cells.length - 1];
      g.floats.push({ x: hx, y: hy, text: 'x' + (g.combo + 1) + ' ' + t('combo'), t0: nowMs(), color: '#fff' });
    }
    Sfx.exit(g.combo);
    if (a.chain) chainFrom(a);
  }

  function chainFrom(a) {
    const ids = new Set();
    for (const [x, y] of a.cells) {
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
        const id = g.occ[ny * g.w + nx];
        if (id >= 0) ids.add(id);
      }
    }
    let i = 0;
    for (const id of ids) {
      g.queue.push({ at: nowMs() + 170 + i * 120, fn: () => {
        const b = g.arrows[id];
        if (!g.over && !b.removed && !b.anim && Levels.isFree(g.occ, g.w, b)) exitArrow(b, true);
      } });
      i++;
    }
  }

  function bump(a, blockerId) {
    a.anim = { type: 'bump', t0: nowMs() };
    g.arrows[blockerId].flash = nowMs();
    g.hearts--; g.mistakes++;
    Sfx.bump(); vibrate(40);
    updateHud();
    if (g.hearts <= 0) {
      g.over = true;
      Metrics.track('level_fail', { mode: g.mode, level: g.cfg.n, left: g.left });
      g.queue.push({ at: nowMs() + 500, fn: showFail });
    }
  }

  function tap(a) {
    if (g.over || g.won || a.removed || a.anim) return;
    const b = Levels.firstBlocker(g.occ, g.w, a);
    if (b < 0) exitArrow(a, false); else bump(a, b);
  }

  function useHint() {
    if (g.over || g.won) return;
    if (save.hints <= 0) return offerHint();
    const free = g.arrows.filter(a => !a.removed && !a.anim && Levels.isFree(g.occ, g.w, a));
    if (!free.length) return;
    // best hint = the free arrow that is blocking the most other arrows
    const blocks = new Map();
    for (const a of g.arrows) {
      if (a.removed) continue;
      const b = Levels.firstBlocker(g.occ, g.w, a);
      if (b >= 0) blocks.set(b, (blocks.get(b) || 0) + 1);
    }
    free.sort((p, q) => (blocks.get(q.id) || 0) - (blocks.get(p.id) || 0));
    g.hintId = free[0].id; g.hintUntil = nowMs() + 2500;
    save.hints--; persist(); updateHud();
    Metrics.track('hint_used', { level: g.cfg.n });
  }

  function offerHint() {
    openModal(c => {
      c.append(el('h2', '', t('noHint')));
      const buy = btn(t('buyHint'), '', () => { save.coins -= 25; save.hints++; persist(); closeModal(); updateHud(); });
      buy.disabled = save.coins < 25;
      c.append(buy,
        btn(t('hintAd'), 'alt', async () => { if (await Ads.rewarded('hint')) { save.hints++; persist(); closeModal(); updateHud(); } }),
        btn(t('cancel'), 'ghost', closeModal));
    });
  }

  /* ---------------------------------------------------------- end of level */
  function showFail() {
    Sfx.fail();
    openModal(c => {
      c.append(el('h2', '', '💔 ' + t('outTitle')), el('p', '', t('outBody')));
      if (g.continues < 2) {
        c.append(btn('🎬 ' + t('continueAd'), 'alt', async () => {
          if (await Ads.rewarded('continue')) { g.continues++; g.hearts = 2; g.over = false; closeModal(); updateHud(); }
        }));
      }
      c.append(btn(t('retry'), '', restart));
    });
  }

  function win() {
    g.won = true;
    const secs = Math.round((nowMs() - g.startT) / 1000);
    const stars = g.mistakes === 0 ? 3 : g.mistakes === 1 ? 2 : 1;
    let coins = 10 + stars * 5 + g.comboCoins, bonus = 0;
    Sfx.win();
    Metrics.track('level_win', { mode: g.mode, level: g.cfg.n, stars, secs, combo: g.combo });

    if (g.mode === 'level') {
      if (g.cfg.n === save.level) { save.level++; save.cleared++; }
    } else {
      const td = todayStr();
      if (!save.dailyDone[td]) {
        save.streak = save.lastDaily === yesterdayStr() ? save.streak + 1 : 1;
        save.lastDaily = td;
        bonus = 40 + Math.min(save.streak, 10) * 3;
        save.dailyDone[td] = { stars, secs };
        const keys = Object.keys(save.dailyDone).sort();
        keys.slice(0, Math.max(0, keys.length - 60)).forEach(k => delete save.dailyDone[k]);
      }
      coins += bonus;
    }
    save.coins += coins; persist(); updateHud();

    openModal(c => {
      c.append(el('h2', '', g.mode === 'daily' ? t('dailyWin') : t('win')));
      const st = el('div', 'stars');
      for (let i = 0; i < 3; i++) { const s = el('span', i < stars ? '' : 'off', '⭐'); st.append(s); }
      c.append(st, el('p', '', '+' + coins + ' ' + t('coins') + (bonus ? ' (' + t('bonus') + ' +' + bonus + ')' : '')));
      if (g.mode === 'daily') {
        c.append(el('p', '', '🔥 ' + save.streak + ' ' + t('streak')));
        c.append(btn('📤 ' + t('share'), 'alt', () => shareDaily(stars, secs)));
      }
      const dbl = btn('🎬 ' + t('double'), 'alt', async () => {
        if (await Ads.rewarded('double_coins')) { save.coins += coins; persist(); updateHud(); dbl.remove(); }
      });
      if (g.mode === 'level') c.append(dbl);
      c.append(btn(g.mode === 'daily' ? t('home') : t('next'), '', async () => {
        closeModal();
        if (g.mode === 'daily') return show('home');
        await Ads.maybeInterstitial(save.cleared, save.level - 1);
        startLevel();
      }));
    });
  }

  async function shareDaily(stars, secs) {
    const hearts = '❤️'.repeat(3 - Math.min(2, g.mistakes)) + '🖤'.repeat(Math.min(2, g.mistakes));
    const text = '🏹 Bounce Arrows ' + g.cfg.daily + '\n' + '⭐'.repeat(stars) + ' ' + hearts +
      ' ⏱ ' + Math.floor(secs / 60) + ':' + pad2(secs % 60) + '\n🔥 ' + save.streak + ' ' + t('streak') + '\n' + location.href.split('?')[0];
    Metrics.track('share', { daily: g.cfg.daily });
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (_) { /* cancelled */ } }
    try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch (_) { window.prompt('', text); }
  }

  /* ------------------------------------------------------------- settings */
  function openSettings() {
    openModal(c => {
      c.append(el('h2', '', '⚙ ' + t('settings')));
      const snd = btn(t('sound') + ': ' + (save.sound ? 'ON' : 'OFF'), 'ghost', () => { save.sound = !save.sound; persist(); openSettings(); });
      const lang = btn(t('language') + ': ' + I18N.get().toUpperCase(), 'ghost', () => {
        save.lang = I18N.get() === 'en' ? 'es' : 'en'; I18N.set(save.lang); persist(); updateHome(); if (g.screen === 'play') updateHud(); openSettings();
      });
      const ads = btn(save.noAds ? '✓ ' + t('adsRemoved') : '🚫 ' + t('removeAds'), save.noAds ? 'ghost' : 'alt', async () => {
        if (!save.noAds && await Billing.purchase('remove_ads')) { save.noAds = true; persist(); openSettings(); }
      });
      const reset = btn(t('reset'), 'danger', () => {
        if (confirm(t('resetAsk'))) { localStorage.removeItem(SAVE_KEY); location.reload(); }
      });
      c.append(snd, lang, ads, reset, btn(t('close'), '', closeModal));
    });
  }

  /* ---------------------------------------------------------------- input */
  function pick(e) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - g.ox) / g.cell), y = Math.floor((e.clientY - r.top - g.oy) / g.cell);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return -1;
    return g.occ[y * g.w + x];
  }
  cv.addEventListener('pointerdown', e => {
    Sfx.init();
    if (g.screen !== 'play' || modalOpen()) return;
    cv.setPointerCapture(e.pointerId);
    g.pressing = true; g.press = pick(e);
  });
  cv.addEventListener('pointermove', e => { if (g.pressing) g.press = pick(e); });
  cv.addEventListener('pointerup', e => {
    if (!g.pressing) return;
    g.pressing = false;
    const id = pick(e); g.press = -1;
    if (id >= 0) tap(g.arrows[id]);
  });
  cv.addEventListener('pointercancel', () => { g.pressing = false; g.press = -1; });

  $('#btnPlay').onclick = () => { Sfx.init(); startLevel(); };
  $('#btnDaily').onclick = () => { Sfx.init(); startDaily(); };
  $('#btnSettings').onclick = openSettings;
  $('#btnHome').onclick = () => { openModal(c => { c.append(el('h2', '', t('home')), btn(t('settings'), 'ghost', openSettings), btn('⌂ ' + t('home'), '', () => { closeModal(); show('home'); }), btn(t('close'), 'ghost', closeModal)); }); };
  $('#btnHint').onclick = useHint;
  $('#btnRestart').onclick = restart;
  $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal' && !g.won && !g.over) closeModal(); });

  /* ------------------------------------------------------------ rendering */
  function pointAt(path, arc) {
    const i = Math.max(0, Math.min(path.length - 2, Math.floor(arc))), f = arc - i;
    const p = path[i], q = path[i + 1];
    return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
  }
  const px = (x) => g.ox + (x + 0.5) * g.cell;
  const py = (y) => g.oy + (y + 0.5) * g.cell;

  function slideOffset(a, now) {
    if (!a.anim) return 0;
    const dt = (now - a.anim.t0) / 1000;
    if (a.anim.type === 'exit') return 5 * dt + 40 * dt * dt;
    return dt > 0.26 ? 0 : 0.2 * Math.sin(Math.PI * dt / 0.26);
  }

  function drawSnake(a, s, now, o) {
    const c = g.cell, L = a.cells.length, tail = s, head = s + L - 1;
    const pts = [pointAt(a.path, tail)];
    for (let i = Math.floor(tail) + 1; i <= Math.floor(head) && i < a.path.length; i++) pts.push(a.path[i]);
    pts.push(pointAt(a.path, head));
    const P = pts.map(p => [px(p[0]), py(p[1])]);
    const col = a.bounce ? GOLD : PALETTE[a.color];
    const hi = Math.min(Math.floor(head), a.path.length - 2);
    const dx = a.path[hi + 1][0] - a.path[hi][0], dy = a.path[hi + 1][1] - a.path[hi][1];
    const H = P[P.length - 1], hw = c * 0.3;

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); };
    const tri = () => {
      ctx.beginPath();
      ctx.moveTo(H[0] + dx * c * 0.48, H[1] + dy * c * 0.48);
      ctx.lineTo(H[0] - dx * c * 0.06 - dy * hw, H[1] - dy * c * 0.06 + dx * hw);
      ctx.lineTo(H[0] - dx * c * 0.06 + dy * hw, H[1] - dy * c * 0.06 - dx * hw);
      ctx.closePath();
    };
    const lw = c * 0.38;
    // outline (white glow for chain arrows, dark otherwise)
    if (a.chain) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 8 + 6 * Math.sin(now / 180); }
    ctx.strokeStyle = a.chain ? 'rgba(255,255,255,.95)' : 'rgba(5,8,24,.55)';
    ctx.lineWidth = lw + (a.chain ? 6 : 4); path(); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; tri(); ctx.fill();
    ctx.lineWidth = 3; ctx.stroke();
    ctx.shadowBlur = 0;
    // body
    ctx.strokeStyle = o.flash ? '#ff5d73' : col; ctx.lineWidth = lw; path(); ctx.stroke();
    ctx.fillStyle = o.flash ? '#ff5d73' : col; tri(); ctx.fill();
    if (a.bounce) { // dashed stripe marks the bounce arrows
      ctx.strokeStyle = 'rgba(40,30,0,.55)'; ctx.lineWidth = Math.max(2, c * 0.07);
      ctx.setLineDash([c * 0.12, c * 0.16]); path(); ctx.stroke(); ctx.setLineDash([]);
    }
    if (o.pulse) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 + 0.45 * Math.sin(now / 110)) + ')'; ctx.lineWidth = lw + 8; path(); ctx.stroke(); }
    ctx.restore();
  }

  function drawPreview(a) {
    const c = g.cell, col = a.bounce ? GOLD : PALETTE[a.color];
    const blocker = Levels.firstBlocker(g.occ, g.w, a);
    ctx.save();
    ctx.fillStyle = col; ctx.globalAlpha = 0.3;
    for (const [x, y] of a.ray) { ctx.beginPath(); ctx.roundRect(px(x) - c * 0.42, py(y) - c * 0.42, c * 0.84, c * 0.84, c * 0.18); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (blocker >= 0) {
      ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 3;
      for (const [x, y] of g.arrows[blocker].cells) { ctx.beginPath(); ctx.roundRect(px(x) - c * 0.45, py(y) - c * 0.45, c * 0.9, c * 0.9, c * 0.2); ctx.stroke(); }
    }
    ctx.restore();
  }

  function draw(now) {
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    ctx.clearRect(0, 0, g.W, g.H);
    const c = g.cell;
    ctx.fillStyle = 'rgba(160,175,255,.16)';
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { ctx.beginPath(); ctx.arc(px(x), py(y), c * 0.05, 0, 6.3); ctx.fill(); }

    if (g.pressing && g.press >= 0) drawPreview(g.arrows[g.press]);

    const hinted = now < g.hintUntil ? g.hintId : -1;
    for (const a of g.arrows) if (!a.removed) drawSnake(a, slideOffset(a, now), now, { flash: now - a.flash < 450, pulse: a.id === hinted });
    for (const a of g.arrows) if (a.removed && a.anim) drawSnake(a, slideOffset(a, now), now, {});

    for (const f of g.floats) {
      const k = (now - f.t0) / 900;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.fillStyle = f.color; ctx.font = '800 ' + Math.round(c * 0.5) + 'px system-ui';
      ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
      ctx.fillText(f.text, px(f.x), py(f.y) - k * c * 1.2); ctx.restore();
    }
  }

  function update(now) {
    for (let i = g.queue.length - 1; i >= 0; i--) {
      if (g.queue[i].at <= now) { const q = g.queue.splice(i, 1)[0]; q.fn(); }
    }
    for (const a of g.arrows) {
      if (!a.anim) continue;
      const dt = (now - a.anim.t0) / 1000;
      if (a.anim.type === 'exit' ? slideOffset(a, now) >= a.total : dt > 0.26) a.anim = null;
    }
    g.floats = g.floats.filter(f => now - f.t0 < 900);
    if (!g.over && !g.won && g.arrows.length && g.left === 0 && g.queue.length === 0 && g.arrows.every(a => !a.anim)) win();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (g.screen !== 'play') return;
    update(now); draw(now);
  }

  /* ----------------------------------------------------------------- boot */
  I18N.set(save.lang || I18N.detect());
  updateHome();
  requestAnimationFrame(frame);
  Metrics.track('app_open', { level: save.level });
  window.__ba = { g, save, tap, startLevel, startDaily }; // handy for tests / debugging
})();
