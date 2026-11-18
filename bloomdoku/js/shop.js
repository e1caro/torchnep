/* Bloomdoku chestnuts and shop: pure logic, no DOM (window.BD.shop, or module.exports in Node).
 *
 * Chestnuts are EARNED by playing and worked out from the progress itself (S.earned): nothing is stored for them, so
 * two devices that sync can never count a garden twice. What is stored is only what was done with them:
 *   state.own    { 'theme-autumn': 1, ... }   things bought once and kept
 *   state.bought { frog: 2, ... }             helper charges bought
 *   state.used   { frog: 5, ... }             helper charges used
 *   state.wear   { theme, hat, effect }       what is on now (per device)
 * Balance = earned - price of everything owned - price of every charge bought.
 */
(function (root) {
  'use strict';
  var W = root.BD && root.BD.worlds ? root.BD.worlds : require('./worlds.js');
  var S = {};
  function T(s) { return s; } // marks a name for translation

  /* ---------- earning ---------- */
  S.forGarden = function (stars) { return stars ? 4 + 2 * stars : 0; };          // 6, 8 or 10 for a garden, by its stars
  S.forDaily = function (stars) { return 10 + 5 * stars; };                       // 15, 20 or 25 for a daily bouquet
  S.STAMP = 50; S.LEVEL = 20; S.EXTRA = 6;
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
  // The others are bought once: 'skin' (what grows in the cells), 'theme' (the look of the garden),
  // 'hat' (what Pua wears; friends see it) and 'effect' (what falls when a garden blooms). Price 0 = everyone has it.
  S.items = [
    { id: 'frog', kind: 'helper', icon: '🐸', name: T('Frog'), what: T('Plants one flower for you.'), price: 12, start: 5 },
    { id: 'owl', kind: 'helper', icon: '🦉', name: T('Owl'), what: T('Shows which flowers are wilted.'), price: 8, start: 5 },
    { id: 'lady', kind: 'helper', icon: '🐞', name: T('Ladybird'), what: T('Shows every cell where one flower can still go.'), price: 6, start: 5 },

    { id: 'skin-numbers', kind: 'skin', value: 'numbers', name: T('Numbers'), price: 0 },
    { id: 'skin-flowers', kind: 'skin', value: 'flowers', name: T('Flowers'), price: 0 },
    { id: 'skin-critters', kind: 'skin', value: 'critters', name: T('Critters'), price: 40 },
    { id: 'skin-fruits', kind: 'skin', value: 'fruits', name: T('Fruits'), price: 120 },

    { id: 'theme-meadow', kind: 'theme', value: 'meadow', name: T('Morning meadow'), price: 0, colors: ['#DFF3EA', '#F2668B', '#3FA66B'] },
    { id: 'theme-blossom', kind: 'theme', value: 'blossom', name: T('Cherry blossom'), price: 80, colors: ['#FDE7EF', '#E0457B', '#C77DA0'] },
    { id: 'theme-autumn', kind: 'theme', value: 'autumn', name: T('Chestnut autumn'), price: 100, colors: ['#FBEBD3', '#D9662B', '#A8742A'] },
    { id: 'theme-lagoon', kind: 'theme', value: 'lagoon', name: T('Lily lagoon'), price: 100, colors: ['#DDF1F7', '#1F9BB8', '#2FB5A6'] },
    { id: 'theme-snow', kind: 'theme', value: 'snow', name: T('First snow'), price: 140, colors: ['#EEF3FB', '#5B7FD6', '#8FA8C9'] },
    { id: 'theme-candy', kind: 'theme', value: 'candy', name: T('Candy garden'), price: 180, colors: ['#F7E9FB', '#B55FD6', '#F28AB8'] },

    { id: 'hat-flower', kind: 'hat', value: 'flower', name: T('Little flower'), price: 0 },
    { id: 'hat-bow', kind: 'hat', value: 'bow', name: T('Ribbon bow'), price: 30 },
    { id: 'hat-leaf', kind: 'hat', value: 'leaf', name: T('Leaf umbrella'), price: 45 },
    { id: 'hat-straw', kind: 'hat', value: 'straw', name: T('Gardener\'s straw hat'), price: 60 },
    { id: 'hat-party', kind: 'hat', value: 'party', name: T('Party hat'), price: 60 },
    { id: 'hat-glasses', kind: 'hat', value: 'glasses', name: T('Sunglasses'), price: 90 },
    { id: 'hat-acorn', kind: 'hat', value: 'acorn', name: T('Chestnut cap'), price: 120 },
    { id: 'hat-crown', kind: 'hat', value: 'crown', name: T('Crown'), price: 300 },

    { id: 'effect-petals', kind: 'effect', value: 'petals', name: T('Petals'), price: 0 },
    { id: 'effect-hearts', kind: 'effect', value: 'hearts', name: T('Hearts'), price: 50 },
    { id: 'effect-leaves', kind: 'effect', value: 'leaves', name: T('Autumn leaves'), price: 50 },
    { id: 'effect-stars', kind: 'effect', value: 'stars', name: T('Stars'), price: 70 },
    { id: 'effect-snow', kind: 'effect', value: 'snow', name: T('Snowflakes'), price: 70 },
  ];
  S.KINDS = ['helper', 'skin', 'theme', 'hat', 'effect'];
  S.item = function (id) { for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i]; return null; };
  S.of = function (kind) { return S.items.filter(function (it) { return it.kind === kind; }); };
  S.find = function (kind, value) { return S.item(kind + '-' + value); };

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
      else if (state.own && state.own[it.id]) n += it.price;
    });
    return n;
  };
  S.balance = function (state) { return Math.max(0, S.earned(state) - S.spent(state)); };
  S.canBuy = function (state, id) {
    var it = S.item(id);
    return !!it && it.price > 0 && (it.kind === 'helper' || !S.owns(state, id)) && S.balance(state) >= it.price;
  };
  // Buys one: a charge of a helper, or a thing to keep (which is put on at once). Returns true if it was bought.
  S.buy = function (state, id) {
    if (!S.canBuy(state, id)) return false;
    var it = S.item(id);
    if (it.kind === 'helper') { state.bought = state.bought || {}; state.bought[id] = (state.bought[id] || 0) + 1; }
    else { state.own = state.own || {}; state.own[id] = 1; S.wear(state, id); }
    return true;
  };
  // Uses one charge of a helper in a garden. Returns false when there is none left.
  S.use = function (state, id) {
    if (S.stock(state, id) < 1) return false;
    state.used = state.used || {};
    state.used[id] = (state.used[id] || 0) + 1;
    return true;
  };
  // Puts on something owned: a skin, a theme, a hat or an effect.
  S.wear = function (state, id) {
    var it = S.item(id);
    if (!it || !S.owns(state, id)) return false;
    if (it.kind === 'skin') state.skin = it.value;
    else { state.wear = state.wear || {}; state.wear[it.kind] = it.value; }
    return true;
  };
  S.wearing = function (state, kind) {
    var v = kind === 'skin' ? state.skin : state.wear && state.wear[kind], it = v && S.find(kind, v);
    return it && S.owns(state, it.id) ? it.value : S.of(kind)[0].value;
  };

  root.BD = root.BD || {};
  root.BD.shop = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
