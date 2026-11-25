/* Bloomdoku chestnuts and shop: pure logic, no DOM (window.BD.shop, or module.exports in Node).
 *
 * Chestnuts are EARNED by playing and worked out from the progress itself (S.earned): nothing is stored for them, so
 * two devices that sync can never count a garden twice. What is stored is only what was done with them:
 *   state.own    { 'theme-autumn': 100, ... } things bought once and kept, with the price paid (1 = the list price)
 *   state.bought { frog: 2, ... }             helper charges bought
 *   state.used   { frog: 5, ... }             helper charges used
 *   state.wear   { theme, hat, coat, ring, effect, frame, sound, 'h-bee', 'h-frog', ... }   what is on now (per device)
 * Balance = earned - what was paid for everything owned - the price of every charge bought.
 */
(function (root) {
  'use strict';
  var W = root.BD && root.BD.worlds ? root.BD.worlds : require('./worlds.js');
  var E = root.BD && root.BD.engine ? root.BD.engine : require('./engine.js');
  var S = {};
  function T(s) { return s; } // marks a name for translation

  /* ---------- earning ---------- */
  S.forGarden = function (stars) { return stars ? 1 + stars : 0; };              // 2, 3 or 4 for a garden, by its stars
  S.forDaily = function (stars) { return 4 + 2 * stars; };                        // 6, 8 or 10 for a daily bouquet
  S.STAMP = 25; S.LEVEL = 10; S.EXTRA = 2;                                         // a world stamp, a new level, a garden after the 100th
  S.earned = function (state) {
    var n = 0;
    W.levels.forEach(function (lv) {
      var r = state.levels && state.levels[lv.key];
      if (!r) return;
      for (var i = 0; i < (r.g || '').length; i++) n += S.forGarden(+r.g.charAt(i) || 0);
      n += (r.extra || 0) * S.EXTRA;
    });
    W.worlds.forEach(function (w) { if (W.worldState(state, w).complete) n += S.STAMP; });
    Object.keys(state.daily || {}).forEach(function (d) { n += S.forDaily(state.daily[d].stars || 1); });
    return n + (W.player(state).level - 1) * S.LEVEL;
  };

  /* ---------- catalog ---------- */
  // kind 'helper': a charge used up in a garden; every player starts with `start` of them.
  // Everything else is bought once and kept. Price 0 = everyone has it, and it is what is worn by default.
  //   skin    what grows in the cells            theme   the colours of the whole app      frame  the edge of the board
  //   hskin   the look of one helper (helper: bee | cat | lady | owl | frog)
  //   hat, coat, ring   what Pua wears, Pua's coat, and the ring around your critter that friends see
  //   effect  what falls when a garden blooms    sound   the instrument of the musical garden
  // Ids are saved (state.own): never rename one; add new things at the end of their kind.
  S.items = [];
  function add(kind, value, name, price, extra) {
    var it = { id: kind === 'helper' ? value : kind + '-' + value, kind: kind, value: value, name: name, price: price };
    for (var k in extra || {}) it[k] = extra[k];
    S.items.push(it);
  }
  add('helper', 'frog', T('Frog'), 12, { icon: '🐸', art: 'frog', what: T('Plants one flower for you.'), start: 5 });
  add('helper', 'owl', T('Owl'), 8, { icon: '🦉', art: 'owl', what: T('Shows which flowers are wilted.'), start: 5 });
  add('helper', 'lady', T('Ladybird'), 6, { icon: '🐞', art: 'ladybird', what: T('Shows every cell where one flower can still go.'), start: 5 });

  // the five helpers and their looks; `art` names the drawing set in js/helpers.js
  S.HELPERS = [
    { id: 'bee', art: 'bee', name: T('Bee'), icon: '🐝' }, { id: 'cat', art: 'caterpillar', name: T('Caterpillar'), icon: '🐛' },
    { id: 'lady', art: 'ladybird', name: T('Ladybird'), icon: '🐞' }, { id: 'owl', art: 'owl', name: T('Owl'), icon: '🦉' },
    { id: 'frog', art: 'frog', name: T('Frog'), icon: '🐸' },
  ];
  [['bee', [['classic', T('Honey bee'), 0], ['bumble', T('Bumblebee'), 70], ['queen', T('Queen bee'), 180], ['space', T('Space bee'), 260]]],
   ['cat', [['classic', T('Green caterpillar'), 0], ['rainbow', T('Rainbow caterpillar'), 90], ['bookworm', T('Bookworm'), 140], ['candy', T('Candy caterpillar'), 200]]],
   ['lady', [['classic', T('Red ladybird'), 0], ['golden', T('Golden ladybird'), 110], ['night', T('Night ladybird'), 170], ['hearts', T('Heart ladybird'), 130]]],
   ['owl', [['classic', T('Brown owl'), 0], ['snowy', T('Snowy owl'), 100], ['wizard', T('Wizard owl'), 240], ['detective', T('Detective owl'), 200]]],
   ['frog', [['classic', T('Green frog'), 0], ['prince', T('Frog prince'), 150], ['ninja', T('Ninja frog'), 220], ['dart', T('Dart frog'), 120]]],
  ].forEach(function (h) { h[1].forEach(function (s) { add('hskin', h[0] + '-' + s[0], s[1], s[2], { helper: h[0], look: s[0] }); }); });

  add('skin', 'numbers', T('Numbers'), 0);
  add('skin', 'flowers', T('Flowers'), 0);
  add('skin', 'critters', T('Critters'), 40);
  add('skin', 'fruits', T('Fruits'), 120);
  add('skin', 'gems', T('Gems'), 160);
  add('skin', 'sweets', T('Sweets'), 160);
  add('skin', 'sea', T('Sea friends'), 200);

  // colors: sky, accent, leaf (the swatch in the shop; the stylesheet holds the full look). air: what drifts in the sky.
  add('theme', 'meadow', T('Morning meadow'), 0, { colors: ['#DFF3EA', '#F2668B', '#3FA66B'], air: '' });
  add('theme', 'blossom', T('Cherry blossom'), 80, { colors: ['#FDE7EF', '#E0457B', '#5FA878'], air: 'petals' });
  add('theme', 'autumn', T('Chestnut autumn'), 100, { colors: ['#FBEBD3', '#D9662B', '#8A9A2B'], air: 'leaves' });
  add('theme', 'lagoon', T('Lily lagoon'), 100, { colors: ['#DDF1F7', '#1F9BB8', '#2FA58F'], air: 'bubbles' });
  add('theme', 'snow', T('First snow'), 140, { colors: ['#EEF3FB', '#5B7FD6', '#6F9FC0'], air: 'snow' });
  add('theme', 'candy', T('Candy garden'), 180, { colors: ['#F7E9FB', '#B55FD6', '#F28AB8'], air: 'sparkles' });
  add('theme', 'honey', T('Honey afternoon'), 120, { colors: ['#FFF3CC', '#D98A0B', '#7FA53A'], air: 'pollen' });
  add('theme', 'forest', T('Deep forest'), 160, { colors: ['#DDEEDD', '#2F8F5B', '#2E7D4F'], air: 'fireflies' });
  add('theme', 'sunset', T('Sunset beach'), 160, { colors: ['#FFE3D3', '#E8573F', '#E0962B'], air: 'sparkles' });
  add('theme', 'lavender', T('Lavender dusk'), 200, { colors: ['#ECE6FA', '#7A5BD0', '#8E9BD6'], air: 'petals' });

  add('frame', 'classic', T('Plain edge'), 0);
  add('frame', 'wood', T('Wooden planter'), 90);
  add('frame', 'picket', T('White fence'), 120);
  add('frame', 'stone', T('Stone wall'), 120);
  add('frame', 'vine', T('Ivy'), 150);
  add('frame', 'candy', T('Candy stripes'), 180);
  add('frame', 'gold', T('Golden frame'), 260);

  add('hat', 'flower', T('Little flower'), 0);
  add('hat', 'bow', T('Ribbon bow'), 30);
  add('hat', 'leaf', T('Leaf umbrella'), 45);
  add('hat', 'straw', T('Gardener\'s straw hat'), 60);
  add('hat', 'party', T('Party hat'), 60);
  add('hat', 'glasses', T('Sunglasses'), 90);
  add('hat', 'acorn', T('Chestnut cap'), 120);
  add('hat', 'crown', T('Crown'), 300);
  add('hat', 'beanie', T('Woolly hat'), 70);
  add('hat', 'chef', T('Chef\'s hat'), 80);
  add('hat', 'wreath', T('Flower crown'), 110);
  add('hat', 'bunny', T('Bunny ears'), 130);
  add('hat', 'headphones', T('Headphones'), 150);
  add('hat', 'pirate', T('Pirate hat'), 170);
  add('hat', 'tophat', T('Top hat'), 190);
  add('hat', 'wizard', T('Wizard hat'), 240);

  // colors: spikes, inner spikes, face
  add('coat', 'classic', T('Hazel'), 0, { colors: ['#9A6B45', '#B98558', '#FBE3C4'] });
  add('coat', 'cocoa', T('Cocoa'), 60, { colors: ['#5C3A21', '#7A5233', '#F3D2B0'] });
  add('coat', 'snow', T('Snow'), 60, { colors: ['#D9DEE8', '#F4F6FA', '#FFF4E8'] });
  add('coat', 'peach', T('Peach'), 90, { colors: ['#F2A07B', '#F8C3A4', '#FFEBD9'] });
  add('coat', 'mint', T('Mint'), 120, { colors: ['#5DBE9A', '#8FD9BD', '#F2FBEF'] });
  add('coat', 'sky', T('Sky'), 120, { colors: ['#5A9BE0', '#8FBDF0', '#F1F7FF'] });
  add('coat', 'lilac', T('Lilac'), 120, { colors: ['#9478E0', '#B9A5F0', '#F6F0FF'] });
  add('coat', 'golden', T('Golden'), 250, { colors: ['#D99A0B', '#F5C518', '#FFF3C4'] });
  add('coat', 'galaxy', T('Galaxy'), 400, { colors: ['#2E2A66', '#5146A8', '#E9E4FF'], stars: true });

  add('ring', 'none', T('No ring'), 0);
  add('ring', 'leaf', T('Leaf ring'), 80);
  add('ring', 'ice', T('Ice ring'), 140);
  add('ring', 'stars', T('Star ring'), 160);
  add('ring', 'gold', T('Golden ring'), 200);
  add('ring', 'rainbow', T('Rainbow ring'), 260);

  add('effect', 'petals', T('Petals'), 0);
  add('effect', 'hearts', T('Hearts'), 50);
  add('effect', 'leaves', T('Autumn leaves'), 50);
  add('effect', 'stars', T('Stars'), 70);
  add('effect', 'snow', T('Snowflakes'), 70);
  add('effect', 'confetti', T('Confetti'), 90);
  add('effect', 'bubbles', T('Bubbles'), 90);
  add('effect', 'notes', T('Music notes'), 110);
  add('effect', 'butterflies', T('Butterflies'), 140);
  add('effect', 'chestnuts', T('Chestnut rain'), 160);
  add('effect', 'fireworks', T('Fireworks'), 220);

  add('sound', 'kalimba', T('Kalimba'), 0);
  add('sound', 'marimba', T('Marimba'), 120);
  add('sound', 'musicbox', T('Music box'), 120);
  add('sound', 'harp', T('Harp'), 180);
  add('sound', 'bells', T('Bells'), 180);
  add('sound', 'chiptune', T('Game console'), 220);

  S.KINDS = ['helper', 'hskin', 'skin', 'theme', 'frame', 'hat', 'coat', 'ring', 'effect', 'sound'];
  S.item = function (id) { for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i]; return null; };
  S.of = function (kind) { return S.items.filter(function (it) { return it.kind === kind; }); };
  S.find = function (kind, value) { return S.item(kind + '-' + value); };
  S.looksOf = function (helper) { return S.items.filter(function (it) { return it.kind === 'hskin' && it.helper === helper; }); };
  // How special a thing is, from its price: it only changes how its card shines.
  S.rarity = function (it) { return !it.price ? 'basic' : it.price < 100 ? 'common' : it.price < 200 ? 'rare' : it.price < 400 ? 'epic' : 'legendary'; };
  function slot(it) { return it.kind === 'hskin' ? 'h-' + it.helper : it.kind; } // where it is worn

  /* ---------- today's offer ---------- */
  // One thing a day at 40 % off, the same day for everyone, chosen among what this player does not own yet.
  S.OFF = 0.4;
  S.deal = function (state, day) {
    var open = S.items.filter(function (it) { return it.kind !== 'helper' && it.price > 0 && !S.owns(state, it.id); });
    if (!open.length) return null;
    var it = open[E.hash('deal:' + (day || W.dayKey())) % open.length];
    return { item: it, price: Math.max(1, Math.round(it.price * (1 - S.OFF) / 5) * 5) };
  };
  S.price = function (state, id, day) {
    var it = S.item(id), deal = it && it.kind !== 'helper' ? S.deal(state, day) : null;
    return !it ? 0 : deal && deal.item.id === id ? deal.price : it.price;
  };

  /* ---------- owning, buying, using ---------- */
  S.owns = function (state, id) { var it = S.item(id); return !!it && it.kind !== 'helper' && (it.price === 0 || !!(state.own && state.own[id])); };
  S.stock = function (state, id) {
    var it = S.item(id);
    if (!it || it.kind !== 'helper') return 0;
    return Math.max(0, it.start + ((state.bought && state.bought[id]) || 0) - ((state.used && state.used[id]) || 0));
  };
  S.spent = function (state) {
    var n = 0;
    S.items.forEach(function (it) {
      if (it.kind === 'helper') n += ((state.bought && state.bought[it.id]) || 0) * it.price;
      else if (state.own && state.own[it.id]) n += state.own[it.id] > 1 ? Math.min(state.own[it.id], it.price) : it.price;
    });
    return n;
  };
  S.balance = function (state) { return Math.max(0, S.earned(state) - S.spent(state)); };
  S.canBuy = function (state, id, day) {
    var it = S.item(id);
    return !!it && it.price > 0 && (it.kind === 'helper' || !S.owns(state, id)) && S.balance(state) >= S.price(state, id, day);
  };
  // Buys one: a charge of a helper, or a thing to keep (which is put on at once). Returns true if it was bought.
  S.buy = function (state, id, day) {
    if (!S.canBuy(state, id, day)) return false;
    var it = S.item(id), price = S.price(state, id, day);
    if (it.kind === 'helper') { state.bought = state.bought || {}; state.bought[id] = (state.bought[id] || 0) + 1; }
    else { state.own = state.own || {}; state.own[id] = price === it.price ? 1 : Math.max(2, price); S.wear(state, id); }
    return true;
  };
  // Uses one charge of a helper in a garden. Returns false when there is none left.
  S.use = function (state, id) {
    if (S.stock(state, id) < 1) return false;
    state.used = state.used || {};
    state.used[id] = (state.used[id] || 0) + 1;
    return true;
  };
  // Puts on something owned.
  S.wear = function (state, id) {
    var it = S.item(id);
    if (!it || it.kind === 'helper' || !S.owns(state, id)) return false;
    if (it.kind === 'skin') state.skin = it.value;
    else { state.wear = state.wear || {}; state.wear[slot(it)] = it.kind === 'hskin' ? it.look : it.value; }
    return true;
  };
  // What is on for a kind ('theme', 'hat', ...) or for a helper ('h-bee'): the chosen one if it is owned, else the free one.
  S.wearing = function (state, kind) {
    var helper = kind.indexOf('h-') === 0 ? kind.slice(2) : null;
    var v = kind === 'skin' ? state.skin : state.wear && state.wear[kind];
    var it = v && (helper ? S.find('hskin', helper + '-' + v) : S.find(kind, v));
    if (it && S.owns(state, it.id)) return helper ? it.look : it.value;
    return helper ? 'classic' : S.of(kind)[0].value;
  };
  S.isOn = function (state, id) { var it = S.item(id); return !!it && it.kind !== 'helper' && S.owns(state, id) && S.wearing(state, slot(it)) === (it.kind === 'hskin' ? it.look : it.value); };
  // How much of the shop is collected: [owned, all], counting only things that cost something.
  S.collected = function (state) {
    var all = S.items.filter(function (it) { return it.kind !== 'helper' && it.price > 0; });
    return [all.filter(function (it) { return S.owns(state, it.id); }).length, all.length];
  };

  root.BD = root.BD || {};
  root.BD.shop = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
