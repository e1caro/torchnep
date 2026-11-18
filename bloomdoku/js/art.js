/* Bloomdoku drawings: nine flowers, nine critters, nine fruits, Pua the hedgehog and what Pua wears, all SVG so they look the same on every phone.
 * The flowers and critters are defined once as <symbol>s (A.install) and drawn with <use>, which keeps a 9×9 board of
 * tokens and pencil notes light. */
(function () {
  'use strict';
  var BD = (window.BD = window.BD || {});
  var A = (BD.art = {});
  var INK = '#3B2A4A';

  function T(s) { return s; } // marks a name for translation

  // One colour per value, shared by numbers, flowers and critters.
  A.colors = ['#F2668B', '#F28A2E', '#E3B008', '#4FB06D', '#2FB5A6', '#4D9DE8', '#8C6FE0', '#D05FC2', '#E2574C'];
  A.flowerNames = [T('Cherry blossom'), T('Tulip'), T('Sunflower'), T('Clover'), T('Star flower'), T('Forget-me-not'), T('Aster'), T('Rose'), T('Poppy')];
  A.critterNames = [T('Pig'), T('Fox'), T('Chick'), T('Frog'), T('Bunny'), T('Bear'), T('Cat'), T('Octopus'), T('Ladybird')];

  function petals(k, rx, ry, dist, fill, rot) {
    var out = '';
    for (var i = 0; i < k; i++) out += '<ellipse cx="20" cy="' + (20 - dist) + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '" transform="rotate(' + ((rot || 0) + i * 360 / k) + ' 20 20)"/>';
    return out;
  }
  function pointed(k, fill, rot) {
    var out = '';
    for (var i = 0; i < k; i++) out += '<path d="M20 20Q12.5 11 20 2.5Q27.5 11 20 20Z" fill="' + fill + '" transform="rotate(' + ((rot || 0) + i * 360 / k) + ' 20 20)"/>';
    return out;
  }
  var FLOWERS = [
    petals(5, 6.4, 7.6, 9, '#F78FB0') + '<circle cx="20" cy="20" r="4.4" fill="#FFE08A"/><circle cx="20" cy="20" r="1.6" fill="#F2668B"/>',
    '<path d="M8.5 13Q8 34 20 34Q32 34 31.500 13L25.5 20L20 9.500L14.5 20Z" fill="#F28A2E"/><path d="M14.5 20Q14 31 20 32Q26 31 25.5 20L20 9.500Z" fill="#FBB668"/>',
    petals(12, 3.1, 7, 11, '#F5C518') + '<circle cx="20" cy="20" r="7.4" fill="#8A5A2B"/><circle cx="20" cy="20" r="4" fill="#A9743B"/>',
    petals(4, 7.4, 8, 9, '#4FB06D', 45) + '<circle cx="20" cy="20" r="3.2" fill="#2E8A4C"/><path d="M20 20L20 11M20 20L29 20M20 20L20 29M20 20L11 20" stroke="#2E8A4C" stroke-width="1.2" stroke-linecap="round" transform="rotate(45 20 20)"/>',
    pointed(6, '#2FB5A6') + '<circle cx="20" cy="20" r="4" fill="#FFF3B0"/>',
    petals(5, 6.8, 6.8, 9, '#5AA9F0', 36) + '<circle cx="20" cy="20" r="5" fill="#fff"/><circle cx="20" cy="20" r="2.4" fill="#F5C518"/>',
    petals(9, 3.3, 7.6, 10.400, '#9C82EA') + '<circle cx="20" cy="20" r="5.2" fill="#FFD45C"/>',
    '<circle cx="20" cy="20" r="16" fill="#D05FC2"/><circle cx="18" cy="18.500" r="11" fill="#E285D6"/><circle cx="21" cy="21" r="7" fill="#C24BB3"/><circle cx="19.500" cy="19.500" r="3.4" fill="#EBA5E2"/>',
    petals(4, 9.200, 9.600, 8, '#E2574C') + petals(4, 6, 6.5, 6, '#F0786C', 45) + '<circle cx="20" cy="20" r="4.6" fill="' + INK + '"/><circle cx="20" cy="20" r="1.6" fill="#F5C518"/>',
  ];

  var EYES = '<circle cx="14.500" cy="22" r="2" fill="' + INK + '"/><circle cx="25.500" cy="22" r="2" fill="' + INK + '"/><circle cx="15.100" cy="21.300" r=".7" fill="#fff"/><circle cx="26.100" cy="21.300" r=".7" fill="#fff"/>';
  var BLUSH = '<circle cx="10.500" cy="26.500" r="2.4" fill="#FF8FA8" opacity=".55"/><circle cx="29.500" cy="26.500" r="2.4" fill="#FF8FA8" opacity=".55"/>';
  function head(fill) { return '<circle cx="20" cy="23" r="14" fill="' + fill + '"/>'; }
  var CRITTERS = [
    // pig
    '<path d="M8 15L7 5.500L16.500 10Z" fill="#EE7FA0"/><path d="M32 15L33 5.500L23.500 10Z" fill="#EE7FA0"/>' + head('#F7A6BE') + EYES + BLUSH +
      '<ellipse cx="20" cy="28" rx="6" ry="4.2" fill="#EE7FA0"/><circle cx="18" cy="28" r="1.100" fill="#B9456B"/><circle cx="22" cy="28" r="1.100" fill="#B9456B"/>',
    // fox
    '<path d="M6.500 17L7 3L18 11Z" fill="#F28A2E"/><path d="M33.500 17L33 3L22 11Z" fill="#F28A2E"/><path d="M9 12L9.500 7L14 10.500Z" fill="#7A3E12"/><path d="M31 12L30.500 7L26 10.500Z" fill="#7A3E12"/>' + head('#F59A3C') +
      '<path d="M6.200 25Q13 24 20 31Q27 24 33.800 25Q32.500 37 20 37Q7.500 37 6.200 25Z" fill="#fff"/>' + EYES + '<circle cx="20" cy="30.500" r="2" fill="' + INK + '"/>',
    // chick
    '<path d="M20 10.500Q15.500 5 19 3.500Q20.500 6 20 10.500ZM20 10.500Q24.500 5.500 22 3Q20 5.500 20 10.500Z" fill="#F2B21B"/>' + head('#FFD54A') + EYES + BLUSH +
      '<path d="M16.500 25.500L23.500 25.500L20 30Z" fill="#F28A2E"/>',
    // frog
    '<circle cx="12.500" cy="12" r="5.800" fill="#6CC57F"/><circle cx="27.500" cy="12" r="5.800" fill="#6CC57F"/>' + head('#6CC57F') +
      '<circle cx="12.500" cy="12" r="3.700" fill="#fff"/><circle cx="27.500" cy="12" r="3.700" fill="#fff"/><circle cx="12.500" cy="12.500" r="1.900" fill="' + INK + '"/><circle cx="27.500" cy="12.500" r="1.900" fill="' + INK + '"/>' +
      BLUSH + '<path d="M12 26.500Q20 33 28 26.500" fill="none" stroke="' + INK + '" stroke-width="1.600" stroke-linecap="round"/>',
    // bunny
    '<ellipse cx="14" cy="9.500" rx="3.900" ry="9" fill="#5CCFC0" transform="rotate(-8 14 9.500)"/><ellipse cx="26" cy="9.500" rx="3.900" ry="9" fill="#5CCFC0" transform="rotate(8 26 9.500)"/>' +
      '<ellipse cx="14" cy="10" rx="1.700" ry="6" fill="#FFC2D1" transform="rotate(-8 14 10)"/><ellipse cx="26" cy="10" rx="1.700" ry="6" fill="#FFC2D1" transform="rotate(8 26 10)"/>' + head('#5CCFC0') + EYES + BLUSH +
      '<path d="M18.300 26L21.700 26L20 28.200Z" fill="#FF8FA8"/><path d="M20 28.200Q20 30.500 17.500 30.500M20 28.200Q20 30.500 22.500 30.500" fill="none" stroke="' + INK + '" stroke-width="1.200" stroke-linecap="round"/>',
    // bear
    '<circle cx="9.500" cy="12.500" r="5.200" fill="#6FB2F0"/><circle cx="30.500" cy="12.500" r="5.200" fill="#6FB2F0"/><circle cx="9.500" cy="12.500" r="2.500" fill="#CFE5FB"/><circle cx="30.500" cy="12.500" r="2.500" fill="#CFE5FB"/>' + head('#6FB2F0') + EYES +
      '<ellipse cx="20" cy="28.500" rx="5.600" ry="4.300" fill="#CFE5FB"/><ellipse cx="20" cy="26.800" rx="2" ry="1.500" fill="' + INK + '"/><path d="M20 28Q20 30.500 18 30.500M20 28Q20 30.500 22 30.500" fill="none" stroke="' + INK + '" stroke-width="1.100" stroke-linecap="round"/>',
    // cat
    '<path d="M7 17L8 4L18 11Z" fill="#A994F0"/><path d="M33 17L32 4L22 11Z" fill="#A994F0"/><path d="M9.500 13L10 7.500L14.500 11Z" fill="#FFC2D1"/><path d="M30.500 13L30 7.500L25.500 11Z" fill="#FFC2D1"/>' + head('#A994F0') + EYES + BLUSH +
      '<path d="M18.600 26L21.400 26L20 27.800Z" fill="#FF8FA8"/><path d="M20 27.800Q19 30.500 16.500 29.500M20 27.800Q21 30.500 23.500 29.500" fill="none" stroke="' + INK + '" stroke-width="1.200" stroke-linecap="round"/>' +
      '<path d="M3 24.500L8 25.500M3 28.500L8 27.800M37 24.500L32 25.500M37 28.500L32 27.800" stroke="' + INK + '" stroke-width=".9" stroke-linecap="round" opacity=".6"/>',
    // octopus
    '<circle cx="8.500" cy="32" r="4.200" fill="#E07BD3"/><circle cx="16" cy="34" r="4.200" fill="#E07BD3"/><circle cx="24" cy="34" r="4.200" fill="#E07BD3"/><circle cx="31.500" cy="32" r="4.200" fill="#E07BD3"/>' +
      '<circle cx="20" cy="19" r="14" fill="#E07BD3"/><circle cx="14.500" cy="19" r="2" fill="' + INK + '"/><circle cx="25.500" cy="19" r="2" fill="' + INK + '"/><circle cx="15.100" cy="18.300" r=".7" fill="#fff"/><circle cx="26.100" cy="18.300" r=".7" fill="#fff"/>' +
      '<circle cx="10.500" cy="23.500" r="2.400" fill="#FFB3D9" opacity=".7"/><circle cx="29.500" cy="23.500" r="2.400" fill="#FFB3D9" opacity=".7"/><circle cx="20" cy="24.500" r="1.900" fill="' + INK + '"/>',
    // ladybird
    '<path d="M14 7Q11 3 8.500 4M26 7Q29 3 31.500 4" fill="none" stroke="' + INK + '" stroke-width="1.300" stroke-linecap="round"/><circle cx="20" cy="12" r="8" fill="' + INK + '"/>' +
      '<circle cx="20" cy="24" r="13.500" fill="#E2574C"/><path d="M20 10.500L20 37.500" stroke="' + INK + '" stroke-width="1.400"/>' +
      '<circle cx="13" cy="21" r="2.700" fill="' + INK + '"/><circle cx="27" cy="21" r="2.700" fill="' + INK + '"/><circle cx="14.500" cy="30" r="2.300" fill="' + INK + '"/><circle cx="25.500" cy="30" r="2.300" fill="' + INK + '"/>' +
      '<circle cx="16.500" cy="10.500" r="1.800" fill="#fff"/><circle cx="23.500" cy="10.500" r="1.800" fill="#fff"/><circle cx="16.800" cy="10.800" r=".8" fill="' + INK + '"/><circle cx="23.800" cy="10.800" r=".8" fill="' + INK + '"/>',
  ];

  var LEAF = '#4FB06D';
  var FRUITS = [
    // strawberry
    '<path d="M20 37Q5 27 7.500 16Q10 9 20 12.500Q30 9 32.500 16Q35 27 20 37Z" fill="#F2668B"/><path d="M11 12Q20 3 29 12Q24 15.500 20 12.500Q16 15.500 11 12Z" fill="' + LEAF + '"/>' +
      '<circle cx="14" cy="20" r="1.100" fill="#FFE08A"/><circle cx="20" cy="18.500" r="1.100" fill="#FFE08A"/><circle cx="26" cy="20" r="1.100" fill="#FFE08A"/><circle cx="17" cy="25.500" r="1.100" fill="#FFE08A"/><circle cx="23" cy="25.500" r="1.100" fill="#FFE08A"/><circle cx="20" cy="31" r="1.100" fill="#FFE08A"/>',
    // orange
    '<circle cx="20" cy="22.500" r="14.500" fill="#F59A3C"/><circle cx="14.500" cy="17" r="3.400" fill="#FBB668"/><path d="M20 9Q24 3 30 5Q27 11 20 9Z" fill="' + LEAF + '"/><circle cx="20" cy="9.500" r="1.400" fill="#7A4A21"/>',
    // lemon
    '<path d="M4 21Q11 7 24 9Q33 10 37 19Q31 34 17 32.500Q7 31 4 21Z" fill="#F5C518"/><path d="M11 18Q16 12 23 12.500" fill="none" stroke="#FFE98A" stroke-width="2.600" stroke-linecap="round"/>',
    // pear
    '<path d="M20 8.500Q26 8.500 26 15Q26 19 30 24.500Q33.500 35 20 36Q6.500 35 10 24.500Q14 19 14 15Q14 8.500 20 8.500Z" fill="#7CC76B"/><path d="M20 9L21 3" stroke="#7A4A21" stroke-width="2" stroke-linecap="round"/><path d="M21 5Q27 2 30 6Q25 9 21 5Z" fill="' + LEAF + '"/><circle cx="15.500" cy="26" r="2.800" fill="#A6DD98"/>',
    // melon slice
    '<path d="M4 15Q20 21 36 15Q34 35 20 35Q6 35 4 15Z" fill="#2FB5A6"/><path d="M7.500 17.500Q20 22 32.500 17.500Q31 31.500 20 31.500Q9 31.500 7.500 17.500Z" fill="#C8F3EA"/>' +
      '<ellipse cx="15" cy="24.500" rx="1.100" ry="1.800" fill="#178A7E"/><ellipse cx="20" cy="26.500" rx="1.100" ry="1.800" fill="#178A7E"/><ellipse cx="25" cy="24.500" rx="1.100" ry="1.800" fill="#178A7E"/>',
    // blueberry
    '<circle cx="20" cy="21.500" r="14.500" fill="#4D9DE8"/><path d="M20 9L22 13L26.500 13L23 16L24.500 20.500L20 18L15.500 20.500L17 16L13.500 13L18 13Z" fill="#2B78C2"/><circle cx="13.500" cy="25" r="3" fill="#86BFF5"/>',
    // grapes
    '<path d="M20 9L20 3" stroke="#7A4A21" stroke-width="2" stroke-linecap="round"/><path d="M20 5Q27 1 31 6Q25 10 20 5Z" fill="' + LEAF + '"/>' +
      '<circle cx="12.500" cy="14" r="6" fill="#8C6FE0"/><circle cx="27.500" cy="14" r="6" fill="#8C6FE0"/><circle cx="20" cy="13" r="6" fill="#9C82EA"/><circle cx="16" cy="23" r="6" fill="#8C6FE0"/><circle cx="24" cy="23" r="6" fill="#9C82EA"/><circle cx="20" cy="32" r="6" fill="#8C6FE0"/>',
    // dragon fruit
    '<ellipse cx="20" cy="22" rx="12.500" ry="15" fill="#D05FC2"/><path d="M8.500 17L3 12L10 12.500ZM31.500 17L37 12L30 12.500ZM9 28L3 29L8.500 23.500ZM31 28L37 29L31.500 23.500ZM16 8L20 1L24 8Z" fill="' + LEAF + '"/><ellipse cx="16" cy="18" rx="3" ry="4.500" fill="#E99BE0"/>',
    // cherries
    '<path d="M12.500 22Q13 9 26 4M28 22Q29 12 26 4" fill="none" stroke="#7A4A21" stroke-width="2" stroke-linecap="round"/><path d="M26 4Q33 2 36 7Q30 10 26 4Z" fill="' + LEAF + '"/>' +
      '<circle cx="12.500" cy="27.500" r="8.500" fill="#E2574C"/><circle cx="28" cy="28.500" r="8" fill="#C23A30"/><circle cx="9.500" cy="24.500" r="2.200" fill="#F29A92"/>',
  ];
  A.fruitNames = [T('Strawberry'), T('Orange'), T('Lemon'), T('Pear'), T('Melon'), T('Blueberry'), T('Grapes'), T('Dragon fruit'), T('Cherries')];

  // What Pua wears (js/shop.js, kind 'hat'). Drawn over the hedgehog in its 64 x 64 box.
  var HATS = {
    flower: '<g transform="translate(45 15) scale(.34)">' + FLOWERS[0] + '</g>',
    bow: '<path d="M46 17L37.500 11.500L37.500 22.500ZM46 17L54.500 11.500L54.500 22.500Z" fill="#F2668B"/><circle cx="46" cy="17" r="3.200" fill="#D43B66"/>',
    leaf: '<path d="M32 22L32 6" stroke="#2E8A4C" stroke-width="2.200" stroke-linecap="round"/><path d="M8 14Q32 -8 56 14Q44 9 32 12Q20 9 8 14Z" fill="#4FB06D"/><path d="M32 12L32 3M22 12Q26 6 32 3M42 12Q38 6 32 3" fill="none" stroke="#2E8A4C" stroke-width="1.200" stroke-linecap="round"/>',
    straw: '<ellipse cx="32" cy="17" rx="25" ry="5.500" fill="#E3BC5C"/><path d="M19 17Q19 3 32 3Q45 3 45 17Q32 21 19 17Z" fill="#F2D488"/><path d="M19.300 13.500Q32 17.500 44.700 13.500L45 17Q32 21 19 17Z" fill="#E2574C"/>',
    party: '<path d="M24 18L32 2L40 18Q32 21 24 18Z" fill="#8C6FE0"/><path d="M27 12Q32 14 37 12L38.500 15Q32 17.500 25.500 15ZM30 6Q32 7 34 6L35.500 9Q32 10.500 28.500 9Z" fill="#FFD86B"/><circle cx="32" cy="3" r="3" fill="#F2668B"/>',
    glasses: '<rect x="17.500" y="35.500" width="13" height="9" rx="4" fill="#3B2A4A"/><rect x="33.500" y="35.500" width="13" height="9" rx="4" fill="#3B2A4A"/><path d="M30 38.500Q32 37 34 38.500" fill="none" stroke="#3B2A4A" stroke-width="1.800"/><path d="M20 38L24 37M36 38L40 37" stroke="#fff" stroke-width="1.300" stroke-linecap="round" opacity=".7"/>',
    acorn: '<path d="M17 18Q17 3 32 3Q47 3 47 18Q32 23 17 18Z" fill="#7A4A21"/><path d="M19 12Q32 16 45 12M24 6.500Q32 9.500 40 6.500M26 4.500L24 17M38 4.500L40 17M32 3L32 20" fill="none" stroke="#5C3615" stroke-width="1"/><path d="M32 4L33 0" stroke="#5C3615" stroke-width="2.200" stroke-linecap="round"/>',
    crown: '<path d="M19 18L18 5L25.500 11L32 2L38.500 11L46 5L45 18Q32 22 19 18Z" fill="#F5C518"/><circle cx="32" cy="13.500" r="2.400" fill="#E2574C"/><circle cx="24" cy="14.500" r="1.700" fill="#4D9DE8"/><circle cx="40" cy="14.500" r="1.700" fill="#4FB06D"/>',
  };
  A.hats = HATS;

  // Every set of nine drawings that can grow in the cells, by skin name. js/packs.js adds more (A.addSet).
  A.sets = { flowers: FLOWERS, critters: CRITTERS, fruits: FRUITS };
  A.setNames = { flowers: A.flowerNames, critters: A.critterNames, fruits: A.fruitNames };
  A.addSet = function (skin, drawings, names) { A.sets[skin] = drawings; A.setNames[skin] = names; };

  A.install = function () {
    if (document.getElementById('bd-defs')) return;
    var s = '<svg id="bd-defs" xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
    Object.keys(A.sets).forEach(function (skin) {
      for (var i = 0; i < 9; i++) s += '<symbol id="bd-' + skin + '-' + (i + 1) + '" viewBox="0 0 40 40">' + A.sets[skin][i] + '</symbol>';
    });
    s += '</defs></svg>';
    document.body.insertAdjacentHTML('afterbegin', s);
  };

  // A helper (bee, caterpillar, ladybird, owl, frog) in one of its looks: an SVG whose wings, eyes and legs carry
  // the classes the stylesheet animates (.hw, .he, .hp, .hs, .hl). The drawings come from js/packs.js.
  A.helpers = {};
  var HELPER_EMOJI = { bee: '🐝', caterpillar: '🐛', ladybird: '🐞', owl: '🦉', frog: '🐸' };
  A.helper = function (art, look, size, cls) {
    var set = A.helpers[art], inner = set && (set[look] || set.classic);
    if (!inner) return '<span class="emo">' + (HELPER_EMOJI[art] || '') + '</span>';
    return '<svg class="hsprite h-' + art + (cls ? ' ' + cls : '') + '" viewBox="0 0 64 64" width="' + (size || 44) + '" height="' + (size || 44) + '" aria-hidden="true">' + inner + '</svg>';
  };

  // A value drawn in a skin ('numbers', 'flowers' or 'critters'). `badge` adds the small number to a drawing.
  A.token = function (v, skin, badge) {
    if (skin === 'numbers' || !skin || !A.sets[skin]) return '<span class="num v' + v + '">' + v + '</span>';
    return '<span class="tok"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#bd-' + skin + '-' + v + '"/></svg>' + (badge ? '<b class="badge v' + v + '">' + v + '</b>' : '') + '</span>';
  };
  A.name = function (v, skin) { return A.setNames[skin] ? BD.t(A.setNames[skin][v - 1]) : String(v); };

  // Pua the hedgehog. mood: 'hi' | 'happy' | 'think' | 'wow' | 'sleepy' | 'oops'. hat: one of A.hats; coat: one of
  // the shop's coats (both default to what is worn).
  A.pua = function (mood, size, hat, coat) {
    var worn = BD.shop && BD.state;
    if (!hat) hat = worn ? BD.shop.wearing(BD.state, 'hat') : 'flower';
    if (!coat) coat = worn ? BD.shop.wearing(BD.state, 'coat') : 'classic';
    var fur = (BD.shop && BD.shop.find('coat', coat)) || { colors: ['#9A6B45', '#B98558', '#FBE3C4'] }, C = fur.colors;
    var sky = fur.stars ? '<circle cx="14" cy="28" r="1.200" fill="#FFE98A"/><circle cx="24" cy="12" r="1" fill="#fff"/><circle cx="40" cy="10" r="1.300" fill="#FFE98A"/><circle cx="50" cy="24" r="1" fill="#fff"/><circle cx="32" cy="18" r=".9" fill="#fff"/>' : '';
    var eyes, mouth;
    if (mood === 'happy') { eyes = '<path d="M21.500 41Q24.500 37 27.500 41M36.500 41Q39.500 37 42.500 41" fill="none" stroke="' + INK + '" stroke-width="2.200" stroke-linecap="round"/>'; mouth = '<path d="M27 48.500Q32 54.500 37 48.500Z" fill="' + INK + '"/>'; }
    else if (mood === 'think') { eyes = '<circle cx="25.500" cy="39" r="2.500" fill="' + INK + '"/><circle cx="40.500" cy="39" r="2.500" fill="' + INK + '"/>'; mouth = '<path d="M29 50.500L35 49.500" stroke="' + INK + '" stroke-width="1.800" stroke-linecap="round"/>'; }
    else if (mood === 'wow') { eyes = '<circle cx="24.500" cy="40" r="3.200" fill="' + INK + '"/><circle cx="39.500" cy="40" r="3.200" fill="' + INK + '"/><circle cx="25.500" cy="39" r="1.100" fill="#fff"/><circle cx="40.500" cy="39" r="1.100" fill="#fff"/>'; mouth = '<ellipse cx="32" cy="51" rx="2.400" ry="2.800" fill="' + INK + '"/>'; }
    else if (mood === 'sleepy') { eyes = '<path d="M21.500 40.500L27.500 40.500M36.500 40.500L42.500 40.500" stroke="' + INK + '" stroke-width="2.200" stroke-linecap="round"/>'; mouth = '<path d="M29.500 50Q32 51.500 34.500 50" fill="none" stroke="' + INK + '" stroke-width="1.700" stroke-linecap="round"/>'; }
    else if (mood === 'oops') { eyes = '<circle cx="24.500" cy="40" r="2.500" fill="' + INK + '"/><circle cx="39.500" cy="40" r="2.500" fill="' + INK + '"/><path d="M20.500 35.500L27 37M43.500 35.500L37 37" stroke="' + INK + '" stroke-width="1.500" stroke-linecap="round"/>'; mouth = '<path d="M28.500 51.500Q32 48.500 35.500 51.500" fill="none" stroke="' + INK + '" stroke-width="1.800" stroke-linecap="round"/>'; }
    else { eyes = '<circle cx="24.500" cy="40" r="2.500" fill="' + INK + '"/><circle cx="39.500" cy="40" r="2.500" fill="' + INK + '"/><circle cx="25.300" cy="39.200" r=".9" fill="#fff"/><circle cx="40.300" cy="39.200" r=".9" fill="#fff"/>'; mouth = '<path d="M28 49Q32 53.500 36 49" fill="none" stroke="' + INK + '" stroke-width="1.800" stroke-linecap="round"/>'; }
    return '<svg class="pua" viewBox="0 0 64 64" width="' + (size || 56) + '" height="' + (size || 56) + '" aria-hidden="true">' +
      '<path d="M8 42L3.500 31L11 31.500L8 20.500L16 23L15 12L23 16.500L25 6L32 12.500L39 6L41 16.500L49 12L48 23L56 20.500L53 31.500L60.500 31L56 42Q56 58 32 58Q8 58 8 42Z" fill="' + C[0] + '"/>' +
      '<path d="M14 40L11 33L16.500 34L15 27L21 30L21.500 23L27 27L32 21L37 27L42.500 23L43 30L49 27L47.500 34L53 33L50 40Z" fill="' + C[1] + '"/>' + sky +
      '<circle cx="15" cy="33" r="4.200" fill="' + C[2] + '"/><circle cx="49" cy="33" r="4.200" fill="' + C[2] + '"/><circle cx="15" cy="33" r="2" fill="#FFB3C4"/><circle cx="49" cy="33" r="2" fill="#FFB3C4"/>' +
      '<ellipse cx="32" cy="44" rx="19" ry="14" fill="' + C[2] + '"/>' + eyes +
      '<circle cx="19.500" cy="47" r="3.200" fill="#FF8FA8" opacity=".55"/><circle cx="44.500" cy="47" r="3.200" fill="#FF8FA8" opacity=".55"/>' +
      '<ellipse cx="32" cy="45.500" rx="2.600" ry="2" fill="' + INK + '"/>' + mouth +
      (HATS[hat] || HATS.flower) + '</svg>';
  };

  // A plant for the garden page: 0 seed, 1 sprout, 2 bud, 3 in bloom (the flower of value v).
  A.plant = function (stage, v, color) {
    var s = '<svg class="plant" viewBox="0 0 40 56" aria-hidden="true"><ellipse cx="20" cy="52" rx="11" ry="3.200" fill="#B98558" opacity=".55"/>';
    if (stage === 0) s += '<ellipse cx="20" cy="49.500" rx="3.400" ry="2.400" fill="#9A6B45"/>';
    else {
      var top = stage === 1 ? 40 : stage === 2 ? 30 : 24;
      s += '<path d="M20 52L20 ' + top + '" stroke="#4FB06D" stroke-width="2.400" stroke-linecap="round"/>';
      s += '<path d="M20 46Q13 46 11.500 40Q18 39.500 20 46Z" fill="#4FB06D"/>';
      if (stage > 1) s += '<path d="M20 41Q27 41 28.500 35Q22 34.500 20 41Z" fill="#6BC586"/>';
      if (stage === 1) s += '<path d="M20 40Q26 40 27.500 34.500Q21.500 34.500 20 40Z" fill="#6BC586"/>';
      if (stage === 2) s += '<ellipse cx="20" cy="26.500" rx="4.600" ry="6" fill="' + color + '"/><path d="M15.500 28Q20 33 24.500 28Q23 32.500 20 32.500Q17 32.500 15.500 28Z" fill="#4FB06D"/>';
      if (stage === 3) s += '<g transform="translate(4 4) scale(.8)">' + FLOWERS[v - 1] + '</g>';
    }
    return s + '</svg>';
  };
})();
