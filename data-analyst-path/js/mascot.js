/* Dot, the mascot: a friendly data point. Drawn as inline SVG so it works offline and follows the theme.
 * Dot encourages and celebrates. Dot never nags, guilt-trips or counts what you missed. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h;
  var M = (DA.mascot = {});
  var NS = 'http://www.w3.org/2000/svg', uid = 0;

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) e.appendChild(arguments[i]);
    return e;
  }

  // moods: happy, cheer, think, sleepy, wow, proud
  M.svg = function (mood, size) {
    mood = mood || 'happy';
    var id = 'dotg' + (++uid), s = size || 96;
    var svg = el('svg', { viewBox: '0 0 120 120', width: s, height: s, class: 'mascot mood-' + mood, 'aria-hidden': 'true', focusable: 'false' });
    var grad = el('linearGradient', { id: id, x1: '0', y1: '0', x2: '1', y2: '1' }, el('stop', { offset: '0', 'stop-color': '#3b82f6' }), el('stop', { offset: '1', 'stop-color': '#0d9488' }));
    svg.appendChild(el('defs', null, grad));
    var up = mood === 'cheer';
    // arms (behind the body)
    svg.appendChild(el('path', { class: 'm-arm', d: up ? 'M26 62 Q10 44 16 28' : 'M24 70 Q10 76 12 90', fill: 'none', stroke: '#0d9488', 'stroke-width': 7, 'stroke-linecap': 'round' }));
    svg.appendChild(el('path', { class: 'm-arm', d: up ? 'M94 62 Q110 44 104 28' : mood === 'think' ? 'M92 76 Q104 84 86 92' : 'M96 70 Q110 76 108 90', fill: 'none', stroke: '#0d9488', 'stroke-width': 7, 'stroke-linecap': 'round' }));
    // feet
    svg.appendChild(el('ellipse', { cx: 46, cy: 108, rx: 11, ry: 6, fill: '#0b7f7a' }));
    svg.appendChild(el('ellipse', { cx: 74, cy: 108, rx: 11, ry: 6, fill: '#0b7f7a' }));
    // antenna with the yellow point from the app icon
    svg.appendChild(el('path', { d: 'M60 30 L60 15', stroke: '#0b7f7a', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    svg.appendChild(el('circle', { class: 'm-point', cx: 60, cy: 11, r: 7, fill: '#ffd166' }));
    // body
    svg.appendChild(el('circle', { cx: 60, cy: 68, r: 40, fill: 'url(#' + id + ')' }));
    svg.appendChild(el('ellipse', { cx: 47, cy: 50, rx: 14, ry: 9, fill: '#fff', opacity: '.18' }));
    // cheeks
    svg.appendChild(el('circle', { cx: 37, cy: 78, r: 6, fill: '#ff9db0', opacity: '.55' }));
    svg.appendChild(el('circle', { cx: 83, cy: 78, r: 6, fill: '#ff9db0', opacity: '.55' }));
    // eyes
    var eyes = el('g', { class: 'm-eyes' });
    if (mood === 'sleepy') {
      eyes.appendChild(el('path', { d: 'M38 66 Q46 72 54 66', fill: 'none', stroke: '#0b2540', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
      eyes.appendChild(el('path', { d: 'M66 66 Q74 72 82 66', fill: 'none', stroke: '#0b2540', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    } else if (mood === 'proud') {
      eyes.appendChild(el('path', { d: 'M38 66 Q46 58 54 66', fill: 'none', stroke: '#0b2540', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
      eyes.appendChild(el('path', { d: 'M66 66 Q74 58 82 66', fill: 'none', stroke: '#0b2540', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    } else {
      var big = mood === 'wow' || mood === 'cheer', dx = mood === 'think' ? 3 : 0, dy = mood === 'think' ? -3 : 0;
      [46, 74].forEach(function (cx) {
        eyes.appendChild(el('ellipse', { cx: cx, cy: 64, rx: big ? 10 : 9, ry: big ? 11.5 : 10, fill: '#fff' }));
        eyes.appendChild(el('circle', { cx: cx + dx, cy: 65 + dy, r: big ? 5.5 : 5, fill: '#0b2540' }));
        eyes.appendChild(el('circle', { cx: cx + dx + 2, cy: 63 + dy, r: 1.8, fill: '#fff' }));
      });
    }
    svg.appendChild(eyes);
    // mouth
    var mouth = { happy: 'M50 84 Q60 94 70 84', proud: 'M48 82 Q60 96 72 82', think: 'M54 88 Q62 85 68 89', sleepy: '', wow: '', cheer: '' }[mood];
    if (mouth) svg.appendChild(el('path', { d: mouth, fill: 'none', stroke: '#0b2540', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    if (mood === 'wow') svg.appendChild(el('ellipse', { cx: 60, cy: 88, rx: 5, ry: 6.5, fill: '#0b2540' }));
    if (mood === 'sleepy') svg.appendChild(el('ellipse', { cx: 60, cy: 87, rx: 3.5, ry: 4, fill: '#0b2540' }));
    if (mood === 'cheer') {
      svg.appendChild(el('path', { d: 'M48 82 Q60 100 72 82 Z', fill: '#0b2540' }));
      svg.appendChild(el('path', { d: 'M54 90 Q60 96 66 90 Q60 87 54 90 Z', fill: '#ff7a90' }));
    }
    if (mood === 'sleepy') {
      var z = el('text', { x: 92, y: 36, 'font-size': 18, 'font-weight': 800, fill: '#7eaaff', class: 'm-z' });
      z.textContent = 'z';
      svg.appendChild(z);
    }
    return svg;
  };

  // Mascot with a speech bubble. `text` may be a string or DOM nodes; `action` an optional link/button.
  M.say = function (mood, text, action, size) {
    return h('div', { class: 'dot-says' },
      h('div', { class: 'dot-figure' }, M.svg(mood, size || 84)),
      h('div', { class: 'dot-bubble' }, h('p', null, text), action || null));
  };

  // What Dot says on the home page: the single most useful thing right now.
  M.homeLine = function () {
    var G = DA.game, t = G.today(), st = t.streak, q = t.quests, li = G.levelInfo(), offer = G.repairOffer(), boost = G.boostLeft();
    var left = Math.max(0, t.goal - t.xp), questsLeft = 3 - (q.lesson ? 1 : 0) - (q.drill ? 1 : 0) - (q.sql ? 1 : 0);
    var last = G.lastActive(), away = last ? ui.diffDays(last, ui.today()) : 0;
    if (boost > 0) return { mood: 'cheer', text: 'Double XP is on for ' + Math.ceil(boost / 60000) + ' more minute' + (boost > 60000 ? 's' : '') + '. A good moment for a round!', href: '#/practice/play', cta: 'Play a round' };
    if (offer) return { mood: 'wow', text: 'You missed yesterday, but your ' + offer.streak + '-day streak is not gone: earn ' + offer.need + ' XP today and it comes back. ' + (offer.left < offer.need ? offer.left + ' XP to go.' : ''), href: '#/practice/play', cta: 'Win it back' };
    if (!G.totalXp()) return { mood: 'happy', text: 'Hi, I\'m Dot! Start with a 2-minute practice round, or scroll a few cards in Discover.', href: '#/practice/play', cta: 'First round' };
    if (t.met && q.all) return { mood: 'proud', text: 'Goal reached and all quests done. That is a full day. See you tomorrow, or keep exploring.', href: '#/feed', cta: 'Discover' };
    if (t.met) return { mood: 'proud', text: 'Daily goal reached! ' + questsLeft + ' quest' + (questsLeft === 1 ? '' : 's') + ' left for the surprise chest and 15 minutes of double XP.', href: '', cta: '' };
    if (away >= 3) return { mood: 'happy', text: 'Good to see you again! No catching up needed: one short round and you are back in the rhythm.', href: '#/practice/play', cta: 'Play a round' };
    if (st.count > 0 && st.atRisk) return { mood: 'happy', text: 'Day ' + (st.count + 1) + ' of your streak is ' + left + ' XP away. One round does it.', href: '#/practice/play', cta: 'Keep it going' };
    if (li.next <= 30) return { mood: 'wow', text: 'Only ' + li.next + ' XP to level ' + (li.level + 1) + '!', href: '#/practice/play', cta: 'Level up' };
    return { mood: 'happy', text: left + ' XP to today\'s goal. A practice round is worth about 40.', href: '#/practice/play', cta: 'Play a round' };
  };
})();
