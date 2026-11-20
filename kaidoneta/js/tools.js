/* Kaidoneta tools for the day: the round timer, the dragon dice (who goes first), the kit checklist, Bristol. */
(function (root) {
  'use strict';
  var K = root.K, U = K.ui, X = K.fx;
  var esc = U.esc;
  var doc = root.document;

  /* ---------- round timer: keeps counting when the app is closed (it stores the end time) ---------- */
  function T() { return U.local.timer; }
  function preset() { return T().mins || U.ev().mins || 35; }
  U.acts.timer = function () { U.timerSheet(); };
  U.timerSheet = function () {
    var ev = U.ev();
    var presets = [30, 35, 40, 50].concat(ev.mins && [30, 35, 40, 50].indexOf(ev.mins) < 0 ? [ev.mins] : []).sort(function (a, b) { return a - b; });
    var sh = U.sheet(U.head('Temporizador') +
      '<div class="timer-big" id="tm-big" aria-live="off"></div>' +
      '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap"><button class="btn" data-tm="-1" style="white-space:nowrap">−1 min</button><button class="btn primary" data-tm="go" id="tm-go" style="min-width:130px"></button><button class="btn" data-tm="1" style="white-space:nowrap">+1 min</button></div>' +
      '<div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost sm" data-tm="reset">↺ Reiniciar</button></div>' +
      '<div class="field"><span class="lab">Duración de la ronda</span><div class="chips" id="tm-presets">' + presets.map(function (p) { return '<button class="chip' + (preset() === p ? ' on' : '') + '" data-tm-p="' + p + '">' + p + ' min</button>'; }).join('') + '</div></div>' +
      '<p class="small muted">Comprueba la duración que anuncien los jueces. Avisa cuando quedan 5 minutos y al acabar el tiempo: vibra en Android; en iPhone suena, con el volumen alto (y sin el modo silencio). Las alertas saltan con la app abierta; el tiempo sigue contando aunque la cierres (lo verás en la barra de arriba).</p>');
    sh.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tm],[data-tm-p]');
      if (!b) return;
      var t = T(), a = b.getAttribute('data-tm'), now = Date.now();
      if (b.hasAttribute('data-tm-p')) {
        t.mins = Number(b.getAttribute('data-tm-p'));
        if (!t.end) { t.left = 0; t.warn = false; t.done = false; }
        Array.prototype.forEach.call(sh.querySelectorAll('[data-tm-p]'), function (c) { c.classList.toggle('on', c === b); });
      } else if (a === 'go') {
        if (t.end) { t.left = t.end - now; t.end = 0; }
        else {
          t.end = now + (t.left || preset() * 60000); t.left = 0; if (t.end - now > 5 * 60000) t.warn = false; if (t.end > now) t.done = false;
          // iPhone only lets sound start from a tap: wake the audio now so the 5-minute and TIME! alerts can play later
          X.sound('tick');
        }
        X.buzz(20);
      } else if (a === 'reset') { t.end = 0; t.left = 0; t.warn = false; t.done = false; }
      else {
        var d = Number(a) * 60000;
        if (t.end) t.end += d; else t.left = Math.max(60000, (t.left || preset() * 60000) + d);
        if (U.timerLeft() > 5 * 60000) t.warn = false;
        if (U.timerLeft() > 0) t.done = false;
      }
      U.saveLocal();
      U.tickTimer();
      U.updateHeader();
    });
    U.tickTimer();
  };
  U.tickTimer = function () {
    var t = T(), left = U.timerLeft(), big = doc.getElementById('tm-big'), go = doc.getElementById('tm-go');
    if (big) {
      var shown = left === null ? preset() * 60000 : left;
      big.textContent = left !== null && left <= 0 ? '¡FIN!' : U.fmtTime(shown);
      big.className = 'timer-big' + (left !== null && left <= 0 ? ' over' : left !== null && left < 5 * 60000 ? ' warn' : '');
    }
    if (go) go.innerHTML = t.end ? '⏸ Pausa' : (left ? '▶ Seguir' : '▶ Empezar');
    var pill = doc.getElementById('timer-pill');
    if (pill && left !== null) { pill.querySelector('span').textContent = U.fmtTime(left); pill.classList.toggle('warn', left < 5 * 60000); }
    if (!t.end) return;
    if (!pill) U.updateHeader();
    if (left <= 5 * 60000 && left > 0 && !t.warn) { t.warn = true; U.saveLocal(); X.buzz([200, 100, 200]); X.sound('tick'); X.toast('⏱ Quedan 5 minutos'); }
    if (left <= 0 && !t.done) { t.done = true; U.saveLocal(); X.buzz([400, 150, 400, 150, 600]); X.sound('alarm'); X.toast('⏱ ¡TIEMPO! Acabad la ronda como digan los jueces.', 'bad'); }
  };

  /* ---------- the dragon dice ---------- */
  var PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]] };
  function die(n, cls) {
    return '<svg class="die ' + (cls || '') + '" viewBox="0 0 100 100" role="img" aria-label="Dado: ' + n + '"><defs><linearGradient id="dg-' + cls + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#4c1d95"/></linearGradient></defs>' +
      '<rect x="4" y="4" width="92" height="92" rx="20" fill="url(#dg-' + cls + ')" stroke="#fde68a" stroke-width="3"/>' +
      PIPS[n].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="#fde68a"/>'; }).join('') + '</svg>';
  }
  U.acts.dice = function () {
    var sh = U.sheet(U.head('¿Quién empieza?') +
      '<p class="small muted" style="margin-top:0">A los dados. Quien saque más elige si va primero o segundo. Si empatáis, se tira otra vez.</p>' +
      '<div class="dice-row"><div class="die-box" id="db-a"><b>Tú</b><div id="d-a">' + die(6, 'a') + '</div></div><div class="die-box" id="db-b"><b>Rival</b><div id="d-b">' + die(6, 'b') + '</div></div></div>' +
      '<div id="d-out" class="empty" style="padding:8px;min-height:44px"></div>' +
      '<button class="btn primary block" data-roll style="font-size:16px">🎲 Tira los dados del dragón</button>');
    var busy = false;
    sh.querySelector('[data-roll]').onclick = function () {
      if (busy) return;
      busy = true;
      var n = 0, a = 1, b = 1, out = sh.querySelector('#d-out');
      out.textContent = '';
      sh.querySelector('#db-a').classList.remove('win'); sh.querySelector('#db-b').classList.remove('win');
      X.sound('dice'); X.buzz(30);
      var still = X.still();
      var iv = setInterval(function () {
        a = 1 + Math.floor(Math.random() * 6); b = 1 + Math.floor(Math.random() * 6);
        sh.querySelector('#d-a').innerHTML = die(a, 'a' + (still ? '' : ' rolling'));
        sh.querySelector('#d-b').innerHTML = die(b, 'b' + (still ? '' : ' rolling'));
        if (++n >= (still ? 1 : 12)) {
          clearInterval(iv); busy = false;
          sh.querySelector('#d-a').innerHTML = die(a, 'a'); sh.querySelector('#d-b').innerHTML = die(b, 'b');
          if (a === b) { out.innerHTML = '<b>¡Empate! Tira otra vez.</b>'; return; }
          sh.querySelector(a > b ? '#db-a' : '#db-b').classList.add('win');
          out.innerHTML = a > b ? '<b style="color:var(--gold2)">¡Ganas la tirada!</b><div class="small">A los mazos de Kaido les suele gustar ir… tú decides, capi.</div>' : '<b>Gana el rival.</b><div class="small">Prepárate, vayas como vayas.</div>';
          X.buzz(a > b ? [30, 40, 60] : 60);
        }
      }, 75);
    };
  };

  /* ---------- kit checklist (per event, on this phone) ---------- */
  var KIT = [
    ['deck', '🃏', 'Mazo: 50 cartas + el líder Kaido, enfundadas'],
    ['don', '🟣', 'Mazo de DON!! (10 cartas)'],
    ['list', '📝', 'Lista de mazo entregada / registrada'],
    ['ticket', '🎟️', 'Entrada, DNI y cuenta de la app del evento'],
    ['sleeves', '🛡️', 'Fundas de repuesto'],
    ['mat', '🗺️', 'Tapete'],
    ['dice', '🎲', 'Dados y contadores'],
    ['pen', '🖊️', 'Boli'],
    ['charger', '🔋', 'Cargador / batería externa'],
    ['water', '💧', 'Agua y algo de picar'],
    ['cash', '💷', 'Tarjeta o efectivo para comer'],
    ['trade', '📒', 'Carpeta de cambios'],
    ['travel', '🚆', 'Cómo llegar al recinto (y volver)'],
  ];
  U.acts.kit = function () { U.kitSheet(); };
  U.kitSheet = function (keep) {
    var ev = U.ev(), done = U.local.kit[ev.id] || {}, n = KIT.filter(function (k) { return done[k[0]]; }).length;
    var html = U.head('Revisa la mochila') +
      '<div class="row"><div class="progress grow"><i style="width:' + Math.round(n / KIT.length * 100) + '%"></i></div><b>' + n + '/' + KIT.length + '</b></div>' +
      '<p class="small muted">' + (n === KIT.length ? '⚡ Listo para asaltar Onigashima. ¡Vamos!' : 'Para ' + esc(ev.name) + '. Se guarda en este móvil.') + '</p>' +
      KIT.map(function (k) { return '<button class="kit-row' + (done[k[0]] ? ' done' : '') + '" data-k="' + k[0] + '" aria-pressed="' + !!done[k[0]] + '"><span class="kit-box">' + (done[k[0]] ? '✓' : '') + '</span><span style="font-size:22px">' + k[1] + '</span><span class="kit-label grow">' + k[2] + '</span></button>'; }).join('') +
      '<button class="btn ghost block sm" data-reset style="margin-top:8px">Desmarcar todo</button>';
    var sh = keep ? U.swap(html) : U.sheet(html);
    // ticking a row updates it in place, so the list does not jump back to the top
    function paintKit() {
      var d = U.local.kit[ev.id] || {}, got = KIT.filter(function (k) { return d[k[0]]; }).length;
      sh.querySelector('.progress i').style.width = Math.round(got / KIT.length * 100) + '%';
      sh.querySelector('.progress').nextElementSibling.textContent = got + '/' + KIT.length;
      sh.querySelector('p.small.muted').innerHTML = got === KIT.length ? '⚡ Listo para asaltar Onigashima. ¡Vamos!' : 'Para ' + esc(ev.name) + '. Se guarda en este móvil.';
      Array.prototype.forEach.call(sh.querySelectorAll('[data-k]'), function (b) {
        var on = !!d[b.getAttribute('data-k')];
        b.classList.toggle('done', on);
        b.setAttribute('aria-pressed', String(on));
        b.querySelector('.kit-box').textContent = on ? '✓' : '';
      });
    }
    Array.prototype.forEach.call(sh.querySelectorAll('[data-k]'), function (b) {
      b.onclick = function () {
        var d = U.local.kit[ev.id] = U.local.kit[ev.id] || {}, k = b.getAttribute('data-k');
        if (d[k]) delete d[k]; else d[k] = 1;
        X.buzz(10);
        U.saveLocal(); paintKit();
      };
    });
    sh.querySelector('[data-reset]').onclick = function () { U.local.kit[ev.id] = {}; U.saveLocal(); paintKit(); };
  };

  /* ---------- Bristol ---------- */
  var SPOTS = [
    ['🌉', 'Puente colgante de Clifton', 'El puente de Brunel sobre el desfiladero del Avon. Crúzalo andando y vuelve de noche a verlo iluminado desde el lado de Clifton.'],
    ['⚓', 'Harbourside y el SS Great Britain', 'Los muelles de toda la vida: el gran barco de hierro de Brunel, y bares y comida junto al agua. Muy pirata.'],
    ['🍔', 'Wapping Wharf', 'Restaurantes y bares pequeñitos montados en contenedores, junto al puerto.'],
    ['🎨', 'Stokes Croft', 'Arte urbano (Bristol es la ciudad de Banksy), bares independientes y comida hasta tarde.'],
    ['🗼', 'Cabot Tower, Brandon Hill', 'Sube a la torre y tendrás vistas de toda la ciudad. Gratis.'],
    ['🛍️', 'Cabot Circus', 'Centro comercial enorme en pleno centro, por si se te ha olvidado algo.'],
  ];
  var PHRASES = [
    ['Gert lush!', '¡Buenísimo! Una pasada (como ganar una ronda).'],
    ['Alright, my lover?', '¿Qué pasa, cariño? Es un «hola» y se lo dicen a cualquiera.'],
    ['Cheers, drive!', '¡Gracias, conductor! (al bajarte del bus).'],
    ['Where\'s it to?', '¿Dónde está?'],
    ['Proper job!', '¡Bien hecho!'],
    ['Ark at ee!', '¡Míralo a él!'],
  ];
  U.acts.bristol = function () {
    U.sheet(U.head('🌉 Bristol') +
      '<p class="small muted" style="margin-top:0">Después de la última ronda: unos clásicos para la tripulación.</p>' +
      '<div class="card">' + SPOTS.map(function (s) { return '<div class="spot"><span class="si">' + s[0] + '</span><div><b>' + s[1] + '</b><div class="small muted">' + s[2] + '</div></div></div>'; }).join('') + '</div>' +
      '<h2 class="sec">🗣️ Habla como en Bristol</h2><div class="card">' + PHRASES.map(function (p) { return '<div class="phrase"><b>' + esc(p[0]) + '</b><span class="muted">' + esc(p[1]) + '</span></div>'; }).join('') + '</div>');
  };
})(window);
