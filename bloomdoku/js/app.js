/* Bloomdoku pages: the map of worlds, a level's 100 gardens, the daily bouquet, my garden, the shop, settings;
 * the router, sharing and the Android bridge. (Friends: js/friends.js. Updates: js/update.js.) */
(function () {
  'use strict';
  var BD = window.BD, W = BD.worlds, A = BD.art, Shop = BD.shop, C = BD.cloud, h = BD.h, t = BD.t;
  var view = null;

  BD.SITE = 'https://e1caro.github.io/torchnep/bloomdoku/';
  // Inside the Android app (android-bloomdoku) the shell offers what a WebView lacks: share, copy and vibration.
  BD.native = window.BloomNative || null;

  function T(s) { return s; } // marks a sentence for translation
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, BD.state.lang === 'es' ? '.' : ','); }
  function standalone() { return !!BD.native || navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); }
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

  // The share sheet where there is one; closing it is fine, a refusal falls back to copying.
  BD.shareText = function (text, url) {
    function copy() {
      var done = function () { BD.toast(t('Copied. Paste it anywhere.')); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + '\n' + url).then(done, function () { BD.toast(text); });
      else BD.toast(text);
    }
    if (BD.native && BD.native.share) BD.native.share(text + '\n' + url);
    else if (navigator.share) navigator.share({ text: text, url: url }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); });
    else copy();
  };

  /* ---------- the map ---------- */
  function continueTarget() {
    var keys = Object.keys(BD.state.games).filter(function (k) { return k.indexOf('daily:') !== 0 && W.level(k); });
    if (keys.length) { var lv = W.level(keys[keys.length - 1]); return { lv: lv, garden: BD.state.games[lv.key].pz.garden, resume: true }; }
    var nx = W.next(BD.state);
    return { lv: nx, garden: W.at(BD.state, nx.key), resume: false };
  }
  function levelChip(p) {
    return h('a.chipbox.levelchip', { href: '#/garden', 'aria-label': t('Level {0}', p.level) + ', ' + t(p.title) + ', ' + t('{0} of {1} XP', p.xp - p.from, p.to - p.from) },
      h('b', t('Level {0}', p.level) + ' · ' + t(p.title)),
      h('span.xpbar', h('span', { style: { width: Math.round(100 * (p.xp - p.from) / (p.to - p.from)) + '%' } })));
  }
  function nutChip() {
    var n = Shop.balance(BD.state);
    return h('a.chipbox.nutchip', { href: '#/shop', 'aria-label': t('{0} chestnuts. Open the shop', n) }, h('b', '🌰 ' + num(n)), h('span', t('Shop')));
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
      h('div.chiprow', levelChip(W.player(s)), nutChip()),
      h('a.btn.primary.big', { href: '#/play/' + go.lv.key },
        h('span', go.resume ? t('Continue') : tot.solved ? t('Next garden') : t('Plant the first garden')),
        h('small', go.lv.world.icon + ' ' + t(go.lv.name) + ' · ' + t('Garden {0}', go.garden + 1))),
      h('a.daily-card' + (doneToday ? '.done' : ''), { href: '#/daily' },
        h('span.emo', '💐'),
        h('span.grow', h('b', t('Daily bouquet')), h('span', t(W.dailyOf(today).name) + (doneToday ? ' · ' + BD.stars(doneToday.stars) : ''))),
        h('span.streak', { 'aria-label': t('{0} days in a row', W.streak(s.daily, today)) }, '🔥 ' + W.streak(s.daily, today))),
      !standalone() && isIos() && !s.seen.install ? installCard() : null,
      !tot.solved && !s.seen['tut-classic'] ? h('a.tutorial-card', { href: '#/tutorial' },
        h('span.emo', '🌱'), h('span.grow', h('b', t('New to sudoku?')), h('span', t('Three tiny gardens with Pua teach the rule in a minute.'))), h('span.go', t('Tutorial'))) : null,
      W.worlds.slice(0, W.CLASSIC).map(worldCard),
      h('section.mode', { id: 'twin' },
        h('h2', '💃 ' + t('Twin gardens')),
        h('p', t('Two figures in every cell: one sudoku for the first, another for the second, and no couple ever repeats. {0} gardens.', num(W.twinTotal()))),
        h('a.btn.small', { href: '#/tutorial/twin' }, '🐥 ' + t('Try two tiny ones first'))),
      W.worlds.slice(W.CLASSIC).map(worldCard),
      h('p.foot', t('{0} gardens in {1} worlds, and a new bouquet every day.', num(W.total()), W.worlds.length)));
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
          : h('a.btn.primary.big', { href: '#/daily/play' }, h('span', saved ? t('Continue') : t('Pick today\'s bouquet')), h('small', '🌰 ' + t('up to {0} chestnuts', Shop.forDaily(3)))),
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
    BD.shareText(text, BD.native ? BD.SITE : location.href.split('#')[0]);
  };

  /* ---------- my garden ---------- */
  // The beds of a garden: one plant per level. starsOf(level) and completeOf(world) say whose garden it is.
  BD.gardenBeds = function (starsOf, completeOf) {
    return h('section.meadow',
      W.worlds.map(function (w) {
        var complete = completeOf(w);
        return h('div.bed', { style: { '--wc': w.color } },
          h('div.bed-head', h('span', w.icon + ' ' + t(w.name)), h('span.stamp' + (complete ? '.got' : ''), { 'aria-label': complete ? t('World stamp earned') : t('World stamp: finish the four levels') }, w.stamp)),
          h('div.bed-row', w.levels.map(function (lv) {
            var st = starsOf(lv);
            return h('div.spot', { 'aria-label': t(lv.name) + ': ' + t('{0} of 3 stars', st) },
              h('span', { html: A.plant(st, (w.n + lv.n) % 9 + 1, w.color) }), h('small', t(lv.name)));
          })));
      }));
  };
  function garden() {
    var s = BD.state, tot = W.totals(s), p = W.player(s);
    function stat(n, label, href) { return h(href ? 'a.stat' : 'div.stat', { href: href || null }, h('b', n), h('span', label)); }
    var page = h('div.page.gardenp',
      h('header.hero.small', h('div.hero-pua', { html: A.pua('happy', 64) }), h('div.hero-text', h('h1', t('My garden')), h('p', tot.solved ? t('Every level you finish plants a flower here. Stars make it grow.') : t('Nothing planted yet. Finish a garden and its flower appears here.')))),
      h('section.card.levelcard', h('div.row.between', h('b.big', t('Level {0}', p.level) + ' · ' + t(p.title)), h('span.muted', t('{0} of {1} XP', num(p.xp - p.from), num(p.to - p.from)))),
        h('div.xpbar', h('span', { style: { width: Math.round(100 * (p.xp - p.from) / (p.to - p.from)) + '%' } }))),
      h('section.stats',
        stat(num(tot.solved), t('of {0} gardens in bloom', num(tot.gardens))),
        stat(tot.stars + '/' + tot.max, t('stars')),
        stat('🌰 ' + num(Shop.balance(s)), t('chestnuts: open the shop'), '#/shop'),
        stat('🔥 ' + W.streak(s.daily, W.dayKey()), t('days in a row'))),
      BD.gardenBeds(function (lv) { return W.stars(s, lv.key); }, function (w) { return W.worldState(s, w).complete; }),
      h('p.foot', t('Seed, sprout, bud, bloom: one stage per star.')));
    BD.clear(view).appendChild(page);
  }

  /* ---------- the shop ---------- */
  // Four aisles; each shows some kinds of things (js/shop.js).
  var AISLES = [
    { id: 'helpers', icon: '🧺', name: T('Helpers'), kinds: ['helper', 'hskin'] },
    { id: 'cells', icon: '🌸', name: T('Cells'), kinds: ['skin', 'sound'] },
    { id: 'looks', icon: '🎨', name: T('Looks'), kinds: ['theme', 'frame', 'effect'] },
    { id: 'pua', icon: '🦔', name: T('Pua'), kinds: ['hat', 'coat', 'ring'] },
  ];
  var KIND_TITLE = {
    helper: [T('Helper charges'), T('Used up one by one in the gardens.')],
    skin: [T('What grows in the cells'), ''],
    sound: [T('Instrument'), T('How the musical garden sounds.')],
    theme: [T('Garden looks'), T('The colours of the whole app, by day and by night.')],
    frame: [T('Board edges'), ''],
    effect: [T('When a garden blooms'), ''],
    hat: [T('Pua\'s wardrobe'), T('Your friends see what Pua wears.')],
    coat: [T('Pua\'s coat'), ''],
    ring: [T('Ring around your critter'), T('Your friends see it in the ranking.')],
  };
  var RARITY = { basic: '', common: T('Common'), rare: T('Rare'), epic: T('Epic'), legendary: T('Legendary') };
  function miniBoard(cls) { var b = h('span.miniboard' + (cls || '')); for (var i = 0; i < 9; i++) b.appendChild(h('i', { html: i % 4 === 0 ? A.token(i / 4 + 2, BD.skin() === 'numbers' ? 'flowers' : BD.skin()) : '' })); return b; }
  function preview(it, big) {
    var s = BD.state;
    if (it.kind === 'helper') return h('span.pv', { html: BD.fx.art(it.id === 'lady' ? 'lady' : it.id, big ? 96 : 50, 'idle') });
    if (it.kind === 'hskin') return h('span.pv', { html: BD.fx.art(it.helper, big ? 110 : 58, big ? 'moving demo' : 'idle', it.look) });
    if (it.kind === 'skin') return h('span.pv.tokens' + (big ? '.big' : ''), (big ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [1, 4, 7]).map(function (v) { return h('i', { html: A.token(v, it.value) }); }));
    if (it.kind === 'theme') return h('span.pv.swatch', it.colors.map(function (c) { return h('i', { style: { background: c } }); }));
    if (it.kind === 'frame') return h('span.pv', miniBoard('.fr-' + it.value));
    if (it.kind === 'hat') return h('span.pv', { html: A.pua('happy', big ? 110 : 58, it.value) });
    if (it.kind === 'coat') return h('span.pv', { html: A.pua('happy', big ? 110 : 58, null, it.value) });
    if (it.kind === 'ring') return h('span.pv', h('span.avatar.ring-' + it.value + (big ? '.bigav' : ''), { style: { '--ac': A.colors[((s.avatar || 5) - 1) % 9] }, html: A.token(s.avatar || 5, 'critters') }));
    if (it.kind === 'sound') return h('span.pv.note', '♪');
    var fx = BD.game.EFFECTS[it.value];
    return h('span.pv.fx', [0, 1, 2].map(function (i) { return h('i' + (fx.ch ? '.ch' : ''), { style: { '--c': fx.colors[i % fx.colors.length] } }, fx.ch ? fx.ch[i % fx.ch.length] : null); }));
  }
  function priceTag(it) {
    var s = BD.state, now = Shop.price(s, it.id);
    return now < it.price ? [h('s', String(it.price)), ' 🌰 ' + now] : '🌰 ' + it.price;
  }

  function shop(aisle) {
    var s = BD.state, bal = Shop.balance(s), got = Shop.collected(s), deal = Shop.deal(s), keepY = shop.again ? window.scrollY : 0;
    shop.again = false;
    if (aisle && AISLES.some(function (a) { return a.id === aisle; })) shop.aisle = aisle;
    var here = AISLES.filter(function (a) { return a.id === (shop.aisle || 'helpers'); })[0];
    function redraw() { shop.again = true; shop(); }
    function buy(it, after) {
      if (!Shop.buy(s, it.id)) { BD.toast(t('You need {0} more chestnuts. Every garden gives some.', Shop.price(s, it.id) - Shop.balance(s))); return false; }
      BD.save(); BD.applyTheme(); BD.sound.melody([1, 3, 5, 8]);
      BD.toast(after);
      redraw();
      return true;
    }
    // One thing to keep, up close: what it is, what it costs, try it, buy it or put it on.
    function open(it) {
      var owned = Shop.owns(s, it.id), on = Shop.isOn(s, it.id), rare = Shop.rarity(it), stage = h('div.stage.r-' + rare, preview(it, true));
      var tryIt = it.kind === 'effect' ? function () { BD.game.petals(it.value); }
        : it.kind === 'sound' ? function () { BD.sound.unlock(); BD.sound.sample(it.value); }
        : null;
      var close = BD.sheet(h('div.menu.itemsheet',
        stage,
        h('h2', t(it.name)),
        h('p.muted', (RARITY[rare] ? t(RARITY[rare]) + ' · ' : '') + (it.kind === 'hskin' ? t('A look for this helper: {0}.', t(Shop.HELPERS.filter(function (x) { return x.id === it.helper; })[0].name)) : t(KIND_TITLE[it.kind][0]))),
        tryIt ? h('button.btn', { type: 'button', onclick: tryIt }, it.kind === 'sound' ? '♪ ' + t('Listen') : '✨ ' + t('Try it')) : null,
        owned
          ? h('button.btn.primary', { type: 'button', disabled: on ? true : null, onclick: function () { Shop.wear(s, it.id); BD.save(); BD.applyTheme(); close(); redraw(); } }, on ? '✓ ' + t('On') : t('Put on'))
          : h('button.btn.primary.buy', { type: 'button', onclick: function () { if (buy(it, t('It is yours!'))) close(); } }, t('Buy for {0}', '🌰 ' + Shop.price(s, it.id))),
        !owned && Shop.price(s, it.id) < it.price ? h('p.muted.small', t('Today\'s offer: {0} instead of {1}.', Shop.price(s, it.id), it.price)) : null));
      if (tryIt && it.kind === 'sound') tryIt();
    }
    function card(it) {
      var owned = Shop.owns(s, it.id), on = Shop.isOn(s, it.id);
      return h('button.item.r-' + Shop.rarity(it) + (on ? '.on' : '') + (owned ? '.owned' : ''), { type: 'button', 'data-item': it.id, 'aria-pressed': on ? 'true' : 'false', onclick: function () { open(it); } },
        preview(it), h('b', t(it.name)), h('small', on ? '✓ ' + t('On') : owned ? t('Put on') : priceTag(it)));
    }
    function section(kind) {
      var title = KIND_TITLE[kind];
      if (kind === 'helper') {
        return h('section.card', h('h2', t(title[0])), h('p.muted.small', t(title[1])),
          Shop.of('helper').map(function (it) {
            return h('div.frow', h('span.hicon', { html: BD.fx.art(it.id, 44, 'idle') }), h('span.grow', h('b', t(it.name)), h('small.muted', t(it.what))),
              h('span.stock', { 'aria-label': t('{0} left', Shop.stock(s, it.id)) }, '×' + Shop.stock(s, it.id)),
              h('button.btn.small' + (Shop.canBuy(s, it.id) ? '.primary' : ''), { type: 'button', 'data-item': it.id, onclick: function () { buy(it, t('One more: {0}.', t(it.name))); } }, '🌰 ' + it.price));
          }));
      }
      if (kind === 'hskin') {
        return h('section.card', h('h2', t('Helper looks')), h('p.muted.small', t('Dress the helpers. Each one keeps its job and its moves.')),
          Shop.HELPERS.map(function (hp) { return [h('h3', t(hp.name)), h('div.items', Shop.looksOf(hp.id).map(card))]; }));
      }
      return h('section.card', h('h2', t(title[0])), title[1] ? h('p.muted.small', t(title[1])) : null, h('div.items', Shop.of(kind).map(card)));
    }
    var page = h('div.page.shopp',
      h('header.hero.small', h('div.hero-pua', { html: A.pua('happy', 64) }),
        h('div.hero-text', h('h1', t('Shop')), h('p', t('Chestnuts come from blooming gardens, daily bouquets, stamps and new levels.'))),
        h('span.purse', { 'aria-label': t('{0} chestnuts', bal) }, '🌰 ' + num(bal))),
      h('div.collected', { 'aria-label': t('{0} of {1} collected', got[0], got[1]) }, h('span', t('{0} of {1} collected', got[0], got[1])), h('div.xpbar', h('span', { style: { width: Math.round(100 * got[0] / got[1]) + '%' } }))),
      deal ? h('button.deal.r-' + Shop.rarity(deal.item), { type: 'button', 'data-deal': deal.item.id, onclick: function () { open(deal.item); } },
        preview(deal.item), h('span.grow', h('small', '⭐ ' + t('Today\'s offer')), h('b', t(deal.item.name)), h('span', h('s', String(deal.item.price)), ' 🌰 ' + deal.price))) : null,
      h('nav.aisles', { 'aria-label': t('Shop') }, AISLES.map(function (a) {
        return h('button' + (a === here ? '.on' : ''), { type: 'button', 'data-aisle': a.id, 'aria-pressed': a === here ? 'true' : 'false', onclick: function () { shop.aisle = a.id; shop(); } }, h('span', a.icon), t(a.name));
      })),
      here.kinds.map(section),
      h('p.foot', t('Nothing here costs real money.')));
    BD.clear(view).appendChild(page);
    if (keepY) window.scrollTo(0, keepY);
  }

  /* ---------- settings ---------- */
  function settings() {
    var s = BD.state;
    function toggle(key, label, hint) {
      var input = h('input', { type: 'checkbox', role: 'switch', id: 'set-' + key, checked: s.set[key] ? true : null, onchange: function () { s.set[key] = input.checked; BD.save(); if (key === 'sound') BD.sound.unlock(); } });
      return h('label.setting', { for: 'set-' + key }, h('span.grow', h('b', label), hint ? h('span', hint) : null), input, h('i.switch'));
    }
    function seg(value, current, label, fn, extra) { return h('button.seg' + (value === current ? '.on' : ''), { type: 'button', 'data-value': value, 'aria-pressed': value === current ? 'true' : 'false', onclick: function () { fn(value); settings(); } }, extra || null, label); }
    var skin = BD.skin(), skins = Shop.of('skin').filter(function (it) { return Shop.owns(s, it.id); });
    var page = h('div.page.settingsp',
      h('header.hero.small', h('div.hero-text', h('h1', t('Settings')))),
      BD.friends.settingsCard(settings),
      BD.update.card(settings),
      h('section.card',
        h('h2', t('What grows in the cells')),
        h('div.segs', skins.map(function (it) { return seg(it.value, skin, t(it.name), setSkin, h('span', { html: A.token(it.value === 'numbers' ? 5 : 1, it.value) })); })),
        h('div.preview', [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (v) { return h('span', { html: A.token(v, skin, skin !== 'numbers' && s.set.badge) }); })),
        h('a.btn.ghost', { href: '#/shop' }, '🌰 ' + t('More in the shop')),
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
        h('h2', t('Tutorial')),
        h('p.muted.small', t('Tiny 4×4 gardens where Pua shows every step. They give no stars.')),
        h('div.row', h('a.btn', { href: '#/tutorial' }, '🌱 ' + t('The rule')), h('a.btn', { href: '#/tutorial/twin' }, '🐥 ' + t('Twin gardens')))),
      h('section.card',
        h('h2', t('Start again')),
        h('p.muted.small', t('Clears stars, chestnuts, everything bought and the gardens in progress on this phone. Settings stay.')),
        h('button.btn.ghost.danger', { type: 'button', onclick: function () { BD.confirm(t('Clear all progress?'), t('This cannot be undone.'), t('Clear everything'), function () { BD.reset(); BD.applyTheme(); BD.toast(t('Progress cleared.')); settings(); }); } }, t('Clear all progress'))),
      h('p.foot', 'Bloomdoku · ' + t('Without an account, everything stays on this phone. No tracking.')));
    BD.clear(view).appendChild(page);
  }
  function setSkin(v) { Shop.wear(BD.state, 'skin-' + v); BD.save(); }
  function setTheme(v) { BD.state.theme = v; BD.save(); BD.applyTheme(); }
  function setLang(v) { BD.state.lang = v; BD.save(); BD.applyTheme(); tabs(); }

  /* ---------- router ---------- */
  var TABS = [
    ['', T('Worlds'), '<path d="M3.500 6.500 9 4l6 2.500L20.500 4v13.500L15 20l-6-2.500L3.500 20zM9 4v13.500M15 6.500V20"/>'],
    ['daily', T('Daily'), '<path d="M12 21v-8M12 13c-4 0-6-2.500-6-6 3 0 6 2 6 6zM12 13c4 0 6-2.500 6-6-3 0-6 2-6 6zM12 9c-1.500-2-1.500-4 0-6 1.500 2 1.500 4 0 6z"/>'],
    ['friends', T('Friends'), '<circle cx="9" cy="8.500" r="3.200"/><path d="M3 19c.500-3.500 3-5.200 6-5.200s5.500 1.700 6 5.200"/><circle cx="17" cy="9.500" r="2.500"/><path d="M16.500 13.900c2.400.200 4 1.600 4.500 4.300"/>'],
    ['garden', T('My garden'), '<path d="M12 21v-9M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 6V3M6.800 9 4.200 7.500M17.200 9l2.600-1.500M12 16c-2.500 0-4-1-5-3M12 18c2.500 0 4-1 5-3"/>'],
    ['settings', T('Settings'), '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>'],
  ];
  function tabs(active) {
    var bar = document.getElementById('tabs');
    if (active == null) active = bar.getAttribute('data-active') || '';
    bar.setAttribute('data-active', active);
    BD.clear(bar);
    var news = C.signedIn() ? C.unreadTotal() : 0;
    TABS.forEach(function (tb) {
      bar.appendChild(h('a' + (tb[0] === active ? '.on' : ''), { href: '#/' + tb[0], 'aria-current': tb[0] === active ? 'page' : null },
        h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + tb[2] + '</svg>' }), t(tb[1]),
        tb[0] === 'friends' && news ? h('i.badge-n', { 'aria-label': t('{0} new', news) }, String(news)) : null));
    });
  }

  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('/'), page = parts[0] || '';
    BD.closeSheets();
    BD.friends.stop();
    BD.fx.clear();
    Array.prototype.forEach.call(document.querySelectorAll('.petals'), function (el) { el.parentNode.removeChild(el); });
    var playing = (page === 'play' && parts[1]) || (page === 'daily' && parts[1] === 'play') || page === 'tutorial';
    document.body.classList.toggle('playing', !!playing);
    if (!playing) BD.game.close();
    if (!playing && BD.update.applyIfQuiet()) return; // a new version was waiting for a calm moment
    window.scrollTo(0, 0);
    if (page === 'play' && parts[1]) {
      var lv = W.level(parts[1]);
      if (!lv || !W.open(BD.state, lv)) { location.hash = '#/'; return; }
      var g = parseInt(parts[2], 10);
      BD.game.open(view, 'level', lv.key, g >= 1 && g <= W.GARDENS ? g - 1 : null);
    } else if (page === 'tutorial') { // #/tutorial, #/tutorial/twin, #/tutorial/classic/2
      var kind = W.TUTORIAL[parts[1]] ? parts[1] : 'classic', step = parseInt(parts[2], 10);
      BD.game.open(view, 'tutorial', kind, step >= 1 && step <= W.TUTORIAL[kind].length ? step - 1 : 0);
    } else if (page === 'daily' && parts[1] === 'play') BD.game.open(view, 'daily', W.dayKey());
    else if (page === 'daily') { tabs('daily'); daily(); }
    else if (page === 'garden') { tabs('garden'); garden(); }
    else if (page === 'shop') { tabs('garden'); shop(parts[1]); }
    else if (page === 'settings') { tabs('settings'); settings(); }
    else if (page === 'add') { BD.friends.invite(parts[1]); location.replace('#/friends'); } // an invitation link
    else if (page === 'friend' && parts[1]) { tabs('friends'); BD.friends.friendPage(view, parts[1]); }
    else if (page === 'friends') { tabs('friends'); BD.friends.page(view); }
    else { tabs(''); home(); }
  }

  BD.start = function () {
    BD.load();
    BD.applyTheme();
    A.install();
    view = document.getElementById('view');
    if (BD.native) document.documentElement.classList.add('native');
    window.addEventListener('hashchange', route);
    // iPhone only lets sound start from a touch: any of these counts.
    ['pointerdown', 'touchend', 'click'].forEach(function (ev) { document.addEventListener(ev, BD.sound.unlock, { passive: true }); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) BD.save(); });
    // iOS Safari zooms on a double tap and on a pinch: neither helps on a game board.
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    // news from the account: progress merged from another device, a friend request, a message
    C.on(function (what) {
      var page = location.hash.replace(/^#\/?/, '').split('/')[0];
      if (what === 'news' && page !== 'friend') BD.toast('💌 ' + t('Something new from your friends.'));
      if (what === 'progress') { BD.applyTheme(); if (page === '' || page === 'garden' || page === 'shop') route(); }
      if (!document.body.classList.contains('playing')) tabs();
    });
    route();
    BD.update.register();
    C.start();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', BD.start); else BD.start();
})();
