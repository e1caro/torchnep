/* Bloomdoku pages: the map of worlds, a level's 100 gardens, the daily bouquet, my garden, settings; the router,
 * sharing, and the service worker. */
(function () {
  'use strict';
  var BD = window.BD, W = BD.worlds, A = BD.art, h = BD.h, t = BD.t;
  var view = null;

  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, BD.state.lang === 'es' ? '.' : ','); }
  function standalone() { return navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); }
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

  /* ---------- the map ---------- */
  function continueTarget() {
    var keys = Object.keys(BD.state.games).filter(function (k) { return k.indexOf('daily:') !== 0 && W.level(k); });
    if (keys.length) { var lv = W.level(keys[keys.length - 1]); return { lv: lv, garden: BD.state.games[lv.key].pz.garden, resume: true }; }
    var nx = W.next(BD.state);
    return { lv: nx, garden: W.at(BD.state, nx.key), resume: false };
  }

  function home() {
    var s = BD.state, tot = W.totals(s), go = continueTarget(), today = W.dayKey(), doneToday = s.daily[today];
    var greet = !tot.solved && !go.resume ? t('Hello! I am Pua. Shall we plant the first garden?')
      : go.resume ? t('Your garden is waiting where you left it.')
      : t('{0} gardens in bloom. The next one is ready.', num(tot.solved));

    var page = h('div.page.home',
      h('header.hero',
        h('div.hero-pua', { html: A.pua(go.resume ? 'hi' : 'happy', 76) }),
        h('div.hero-text', h('h1', 'Bloomdoku'), h('p', greet))),
      h('a.btn.primary.big', { href: '#/play/' + go.lv.key },
        h('span', go.resume ? t('Continue') : tot.solved ? t('Next garden') : t('Plant the first garden')),
        h('small', go.lv.world.icon + ' ' + t(go.lv.name) + ' · ' + t('Garden {0}', go.garden + 1))),
      h('a.daily-card' + (doneToday ? '.done' : ''), { href: '#/daily' },
        h('span.emo', '💐'),
        h('span.grow', h('b', t('Daily bouquet')), h('span', t(W.dailyOf(today).name) + (doneToday ? ' · ' + BD.stars(doneToday.stars) : ''))),
        h('span.streak', { 'aria-label': t('{0} days in a row', W.streak(s.daily, today)) }, '🔥 ' + W.streak(s.daily, today))),
      !standalone() && isIos() && !s.seen.install ? installCard() : null,
      W.worlds.map(worldCard),
      h('p.foot', t('{0} gardens in 8 worlds, and a new bouquet every day.', num(W.total()))));
    BD.clear(view).appendChild(page);
  }

  function installCard() {
    var card = h('section.install',
      h('b', '📲 ' + t('Put Bloomdoku on your Home Screen')),
      h('p', t('In Safari, tap Share, then "Add to Home Screen". It opens full screen and works offline.')),
      h('button.btn.small.ghost', { type: 'button', onclick: function () { BD.state.seen.install = 1; BD.save(); card.parentNode.removeChild(card); } }, t('Got it')));
    return card;
  }

  function worldCard(w) {
    var s = BD.state, ws = W.worldState(s, w);
    return h('section.world', { style: { '--wc': w.color }, id: 'world-' + w.n },
      h('div.world-head',
        h('span.world-icon', w.icon),
        h('div.grow', h('h2', t(w.name)), h('p', t(w.rule))),
        h('span.stamp' + (ws.complete ? '.got' : ''), { title: t('World stamp'), 'aria-label': ws.complete ? t('World stamp earned') : t('World stamp: finish the four levels') }, w.stamp)),
      h('div.stones',
        w.levels.map(function (lv) {
          var open = W.open(s, lv), st = W.stars(s, lv.key), solved = W.solved(s, lv.key);
          return h('button.stone' + (open ? '' : '.locked') + (st ? '.done' : ''), {
            type: 'button', 'data-level': lv.key,
            'aria-label': t(lv.name) + ': ' + (open ? t('{0} of 3 stars', st) + ', ' + t('{0} of {1} gardens', solved, W.GARDENS) : t('locked')),
            onclick: function () { open ? levelSheet(lv) : BD.toast(t('Finish a garden of "{0}" to open this level.', t(w.levels[lv.n - 2].name))); },
          },
            h('span.stone-n', open ? String(lv.n) : '🔒'),
            h('span.stone-name', t(lv.name)),
            h('span.stone-stars', open ? BD.stars(st) : ''),
            open ? h('span.stone-count', Math.min(solved, W.GARDENS) + '/' + W.GARDENS) : null);
        })));
  }

  // A level: what it teaches and its 100 numbered gardens.
  function levelSheet(lv) {
    var s = BD.state, w = lv.world, at = W.at(s, lv.key), saved = s.games[lv.key], solved = W.solved(s, lv.key);
    var firstVisit = !s.seen['w' + w.n];
    if (firstVisit) { s.seen['w' + w.n] = 1; BD.save(); }
    var tiles = [];
    for (var g = 0; g < W.GARDENS; g++) (function (g) {
      var st = W.gardenStars(s, lv.key, g), here = saved ? saved.pz.garden === g : g === at;
      tiles.push(h('a.tile' + (st ? '.s' + st : '') + (here ? '.here' : ''), {
        href: '#/play/' + lv.key + '/' + (g + 1), onclick: function () { close(); },
        'aria-label': t('Garden {0}', g + 1) + (st ? ': ' + t('{0} of 3 stars', st) : ''),
      }, h('b', String(g + 1)), h('i', st ? BD.stars(st).slice(0, st) : '')));
    })(g);
    var close = BD.sheet(h('div.level', { style: { '--wc': w.color } },
      h('p.level-world', w.icon + ' ' + t(w.name) + ' ' + lv.key),
      h('h2', t(lv.name)),
      h('p', t(lv.teaches) + '.'),
      firstVisit || lv.n === 1 ? h('div.intro', h('p', t(w.intro)), h('div.concepts', w.concepts.map(function (c) { return h('span.chip', t(c)); }))) : null,
      h('a.btn.primary.big', { href: '#/play/' + lv.key, onclick: function () { close(); } },
        h('span', saved ? t('Continue') : t('Play')),
        h('small', t('Garden {0}', (saved ? saved.pz.garden : at) + 1))),
      h('div.level-bar', h('span', { style: { width: Math.min(100, solved) + '%' } })),
      h('p.muted.small', t('{0} of {1} gardens in bloom in this level', Math.min(solved, W.GARDENS), W.GARDENS) + '. ' + t('Pick any garden:')),
      h('div.tiles', tiles)));
  }

  /* ---------- daily bouquet ---------- */
  function daily() {
    var s = BD.state, today = W.dayKey(), info = W.dailyOf(today), done = s.daily[today], saved = s.games['daily:' + today];
    var rules = W.rulesOf(info.p), streak = W.streak(s.daily, today), week = [];
    var d = W.parseDay(today), names = BD.state.lang === 'es' ? ['D', 'L', 'M', 'X', 'J', 'V', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    d.setDate(d.getDate() - 6);
    for (var i = 0; i < 7; i++) {
      var k = W.dayKey(d), r = s.daily[k];
      week.push(h('div.day' + (r ? '.got' : '') + (k === today ? '.today' : ''), { 'aria-label': k + (r ? ': ' + t('{0} of 3 stars', r.stars) : '') },
        h('span', { html: r ? '<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#bd-flowers-' + ((d.getDay() + 6) % 9 + 1) + '"/></svg>' : '' }), h('small', names[d.getDay()])));
      d.setDate(d.getDate() + 1);
    }
    var date = W.parseDay(today).toLocaleDateString(BD.state.lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    var page = h('div.page.dailyp',
      h('header.hero.small', h('div.hero-pua', { html: A.pua(done ? 'happy' : 'hi', 64) }), h('div.hero-text', h('h1', t('Daily bouquet')), h('p', date))),
      h('section.card.today',
        h('h2', t(info.name)),
        h('div.concepts', (rules.length ? rules : ['base']).map(function (r) { return h('span.chip', BD.game.RULES[r][0] + ' ' + t(BD.game.RULES[r][1])); })),
        h('p.muted', t('One garden a day, the same for everyone. The rule changes with the day of the week.')),
        done ? h('p.result', BD.stars(done.stars) + ' · ' + (done.slips ? t('{0} wilted', done.slips) : t('Not a petal out of place'))) : null,
        done
          ? h('button.btn.primary.big', { type: 'button', onclick: function () { BD.share(today); } }, h('span', t('Share my bouquet')))
          : h('a.btn.primary.big', { href: '#/daily/play' }, h('span', saved ? t('Continue') : t('Pick today\'s bouquet'))),
        done ? h('p.muted.small', t('A new bouquet opens tomorrow. The worlds never run out.')) : null),
      h('section.card',
        h('div.row.between', h('h2', t('This week')), h('span.streak.big', '🔥 ' + (streak === 1 ? t('1 day in a row') : t('{0} days in a row', streak)))),
        h('div.week', week)));
    BD.clear(view).appendChild(page);
  }

  BD.share = function (day) {
    var r = BD.state.daily[day];
    if (!r) return;
    var date = W.parseDay(day).toLocaleDateString(BD.state.lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' });
    var text = 'Bloomdoku 💐 ' + date + '\n' + t(W.dailyOf(day).name) + ' ' + BD.stars(r.stars) + '\n' +
      (r.slips ? '🥀 ' + r.slips : '🌸 ' + t('Not a petal out of place')) + (r.bees ? ' · 🐝 ' + r.bees : '') + (r.frog ? ' · 🐸' : '') + (r.owl ? ' · 🦉' : '') +
      '\n🔥 ' + W.streak(BD.state.daily, W.dayKey());
    var url = location.href.split('#')[0];
    if (navigator.share) { navigator.share({ text: text, url: url }).catch(function () { /* closed the share sheet */ }); return; }
    var done = function () { BD.toast(t('Copied. Paste it anywhere.')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + '\n' + url).then(done, function () { BD.toast(text); });
    else BD.toast(text);
  };

  /* ---------- my garden ---------- */
  function garden() {
    var s = BD.state, tot = W.totals(s);
    function stat(n, label) { return h('div.stat', h('b', n), h('span', label)); }
    var page = h('div.page.gardenp',
      h('header.hero.small', h('div.hero-pua', { html: A.pua('happy', 64) }), h('div.hero-text', h('h1', t('My garden')), h('p', tot.solved ? t('Every level you finish plants a flower here. Stars make it grow.') : t('Nothing planted yet. Finish a garden and its flower appears here.')))),
      h('section.stats',
        stat(num(tot.solved), t('of {0} gardens in bloom', num(tot.gardens))),
        stat(tot.stars + '/' + tot.max, t('stars')),
        stat(String(W.streak(s.daily, W.dayKey())), t('days in a row')),
        stat(String(tot.dailies), t('daily bouquets'))),
      h('section.meadow',
        W.worlds.map(function (w) {
          var ws = W.worldState(s, w);
          return h('div.bed', { style: { '--wc': w.color } },
            h('div.bed-head', h('span', w.icon + ' ' + t(w.name)), h('span.stamp' + (ws.complete ? '.got' : ''), { 'aria-label': ws.complete ? t('World stamp earned') : t('World stamp: finish the four levels') }, w.stamp)),
            h('div.bed-row', w.levels.map(function (lv) {
              var st = W.stars(s, lv.key);
              return h('div.spot', { 'aria-label': t(lv.name) + ': ' + t('{0} of 3 stars', st) },
                h('span', { html: A.plant(st, (w.n + lv.n) % 9 + 1, w.color) }), h('small', t(lv.name)));
            })));
        })),
      h('p.foot', t('Seed, sprout, bud, bloom: one stage per star.')));
    BD.clear(view).appendChild(page);
  }

  /* ---------- settings ---------- */
  function settings() {
    var s = BD.state;
    function toggle(key, label, hint) {
      var input = h('input', { type: 'checkbox', role: 'switch', id: 'set-' + key, checked: s.set[key] ? true : null, onchange: function () { s.set[key] = input.checked; BD.save(); if (key === 'sound') BD.sound.unlock(); } });
      return h('label.setting', { for: 'set-' + key }, h('span.grow', h('b', label), hint ? h('span', hint) : null), input, h('i.switch'));
    }
    function seg(value, current, label, fn, extra) { return h('button.seg' + (value === current ? '.on' : ''), { type: 'button', 'aria-pressed': value === current ? 'true' : 'false', onclick: function () { fn(value); settings(); } }, extra || null, label); }
    var page = h('div.page.settingsp',
      h('header.hero.small', h('div.hero-text', h('h1', t('Settings')))),
      h('section.card',
        h('h2', t('What grows in the cells')),
        h('div.segs',
          seg('numbers', s.skin, t('Numbers'), setSkin, h('span', { html: A.token(5, 'numbers') })),
          seg('flowers', s.skin, t('Flowers'), setSkin, h('span', { html: A.token(1, 'flowers') })),
          seg('critters', s.skin, t('Critters'), setSkin, h('span', { html: A.token(5, 'critters') }))),
        h('div.preview', [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (v) { return h('span', { html: A.token(v, s.skin, s.skin !== 'numbers' && s.set.badge) }); })),
        toggle('badge', t('Little numbers on flowers and critters'), t('Always shown in gardens with vines or moons, where the order matters.'))),
      h('section.card',
        h('h2', t('Playing')),
        toggle('wilt', t('Wrong flowers wilt at once'), t('Off: nothing is checked until you ask the owl.')),
        toggle('tidy', t('Tidy my notes'), t('Planting a flower removes it from the notes it sees.')),
        toggle('sundial', t('Sundial'), t('Shows the time on the board. Nothing depends on it.'))),
      h('section.card',
        h('h2', t('Sound and touch')),
        toggle('sound', t('Musical garden'), t('Each flower is a note; a finished row plays its melody.')),
        toggle('haptic', t('Tap feedback'), t('A light tap on phones that allow it.'))),
      h('section.card',
        h('h2', t('Look')),
        h('div.segs', seg('auto', s.theme, t('Auto'), setTheme), seg('day', s.theme, t('Day'), setTheme), seg('night', s.theme, t('Night'), setTheme)),
        h('h2', t('Language')),
        h('div.segs', seg('en', s.lang, 'English', setLang), seg('es', s.lang, 'Español', setLang))),
      !standalone() ? h('section.card',
        h('h2', t('On your iPhone')),
        h('ol.steps', h('li', t('Open this page in Safari.')), h('li', t('Tap the Share button (the square with an arrow).')), h('li', t('Choose "Add to Home Screen" and tap Add.'))),
        h('p.muted.small', t('Then open Bloomdoku from its icon: full screen and offline. Your progress stays on this phone.'))) : null,
      h('section.card',
        h('h2', t('Start again')),
        h('p.muted.small', t('Clears stars, gardens in progress and daily bouquets on this phone. Settings stay.')),
        h('button.btn.ghost.danger', { type: 'button', onclick: function () { BD.confirm(t('Clear all progress?'), t('This cannot be undone.'), t('Clear everything'), function () { BD.reset(); BD.toast(t('Progress cleared.')); settings(); }); } }, t('Clear all progress'))),
      h('p.foot', 'Bloomdoku · ' + t('Everything is stored on this phone. No accounts, no tracking.')));
    BD.clear(view).appendChild(page);
  }
  function setSkin(v) { BD.state.skin = v; BD.save(); }
  function setTheme(v) { BD.state.theme = v; BD.save(); BD.applyTheme(); }
  function setLang(v) { BD.state.lang = v; BD.save(); BD.applyTheme(); tabs(); }

  /* ---------- router ---------- */
  function T(s) { return s; } // marks a sentence for translation
  var TABS = [
    ['', T('Worlds'), '<path d="M3.500 6.500 9 4l6 2.500L20.500 4v13.500L15 20l-6-2.500L3.500 20zM9 4v13.500M15 6.500V20"/>'],
    ['daily', T('Daily'), '<path d="M12 21v-8M12 13c-4 0-6-2.500-6-6 3 0 6 2 6 6zM12 13c4 0 6-2.500 6-6-3 0-6 2-6 6zM12 9c-1.500-2-1.500-4 0-6 1.500 2 1.500 4 0 6z"/>'],
    ['garden', T('My garden'), '<path d="M12 21v-9M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 6V3M6.800 9 4.200 7.500M17.200 9l2.600-1.500M12 16c-2.500 0-4-1-5-3M12 18c2.500 0 4-1 5-3"/>'],
    ['settings', T('Settings'), '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>'],
  ];
  function tabs(active) {
    var bar = document.getElementById('tabs');
    if (active == null) active = bar.getAttribute('data-active') || '';
    bar.setAttribute('data-active', active);
    BD.clear(bar);
    TABS.forEach(function (tb) {
      bar.appendChild(h('a' + (tb[0] === active ? '.on' : ''), { href: '#/' + tb[0], 'aria-current': tb[0] === active ? 'page' : null },
        h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + tb[2] + '</svg>' }), t(tb[1])));
    });
  }

  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('/'), page = parts[0] || '';
    BD.closeSheets();
    Array.prototype.forEach.call(document.querySelectorAll('.petals'), function (el) { el.parentNode.removeChild(el); });
    var playing = (page === 'play' && parts[1]) || (page === 'daily' && parts[2 - 1] === 'play');
    document.body.classList.toggle('playing', !!playing);
    if (!playing) BD.game.close();
    window.scrollTo(0, 0);
    if (page === 'play' && parts[1]) {
      var lv = W.level(parts[1]);
      if (!lv || !W.open(BD.state, lv)) { location.hash = '#/'; return; }
      var g = parseInt(parts[2], 10);
      BD.game.open(view, 'level', lv.key, g >= 1 && g <= W.GARDENS ? g - 1 : null);
    } else if (page === 'daily' && parts[1] === 'play') BD.game.open(view, 'daily', W.dayKey());
    else if (page === 'daily') { tabs('daily'); daily(); }
    else if (page === 'garden') { tabs('garden'); garden(); }
    else if (page === 'settings') { tabs('settings'); settings(); }
    else { tabs(''); home(); }
  }

  /* ---------- offline ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    var had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!had) { had = true; return; }
      var bar = document.getElementById('update');
      BD.clear(bar).appendChild(h('span', t('A new version is ready.')));
      bar.appendChild(h('button.btn.small.primary', { type: 'button', onclick: function () { location.reload(); } }, t('Reload')));
      bar.classList.add('show');
    });
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ });
  }

  BD.start = function () {
    BD.load();
    BD.applyTheme();
    A.install();
    view = document.getElementById('view');
    window.addEventListener('hashchange', route);
    // iPhone only lets sound start from a touch: any of these counts.
    ['pointerdown', 'touchend', 'click'].forEach(function (ev) { document.addEventListener(ev, BD.sound.unlock, { passive: true }); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) BD.save(); });
    // iOS Safari zooms on a double tap and on a pinch: neither helps on a game board.
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    route();
    registerSW();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', BD.start); else BD.start();
})();
