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
  /* ---------- the Blackbeard route: the real Edward Teach, who gave One Piece's Marshall D. Teach his name, is
     traditionally said to be from Bristol. Stops researched and fact-checked; visited ones are ticked on this phone. */
  // Researched and fact-checked (sources: VisitBristol, VisitEngland, Royal Museums Greenwich, Britannica, Historic
  // England, Bristol Museums, the Long John Silver Trust's Treasure Island Trail, Show of Strength, CAMRA).
  var ROUTE = {
    "intro": "El Barbanegra real (Edward Teach, o Thache) murió el 22 de noviembre de 1718 en Ocracoke, Carolina del Norte, luchando contra los hombres del teniente Maynard. Pudo nacer en Bristol hacia 1680: es tradición, no está probado (hay historiadores que lo sitúan en Jamaica). Lo que sí es historia: Bristol fue un gran puerto corsario y sus pubs están ligados a La isla del tesoro. Marshall D. Teach, el Barbanegra de One Piece, se llama así por él, y el 22 de noviembre de 2026 se cumplen 308 años de su muerte.",
    "walk": "Un paseo en bucle de unos 2,5-2,8 km: 35-45 minutos andando, o 2,5-3,5 horas con paradas en los pubs. Empieza en St Mary Redcliffe, cerca de la estación de Temple Meads, o únete en cualquier parada. Si preferís acabar en un pub, terminad en el Llandoger Trow.",
    "stops": [
      {
        "name": "Iglesia de St Mary Redcliffe",
        "address": "Redcliffe Way, BS1 6RA",
        "lat": 51.44832,
        "lng": -2.58954,
        "story": "Dice la leyenda que Barbanegra tenía una cueva escondite bajo esta iglesia; no hay pruebas. Es el gran monumento de Redcliffe, el barrio donde la tradición de Bristol sitúa su nacimiento.",
        "open": "Iglesia en uso, entrada gratis (se agradecen donativos), más o menos de 8:00 a 16:00-17:00 de lunes a sábado; puede cerrar por oficios."
      },
      {
        "name": "The Golden Guinea (pub)",
        "address": "19 Guinea Street, BS1 6SX",
        "lat": 51.44728,
        "lng": -2.59286,
        "story": "Guinea Street es la calle donde, según la tradición, vivió o nació Barbanegra, y el cartel del pub lo muestra a él. Ningún documento lo confirma. Aquí empieza el paseo teatral «Blood, Blackbeard & Buccaneers».",
        "open": "Pub en un edificio protegido de principios del siglo XVIII."
      },
      {
        "name": "Entrada de las Redcliffe Caves",
        "address": "Phoenix Wharf, BS1 6SR (al pie de la rampa, junto al Benjamin Perry Boathouse, frente al barco Thekla)",
        "lat": 51.44845,
        "lng": -2.59304,
        "story": "Túneles excavados en la arenisca roja para sacar arena para el vidrio y la cerámica de Bristol. Se dice que fueron el escondite de Barbanegra, pero no hay ninguna prueba.",
        "open": "Solo se ven desde fuera: las cuevas abren únicamente en visitas con entrada (por ejemplo, las del Bristol Film Festival)."
      },
      {
        "name": "The Ostrich (pub)",
        "address": "Lower Guinea Street, BS1 6TJ",
        "lat": 51.4479,
        "lng": -2.59391,
        "story": "Pub de hacia 1745 metido en la roca: desde dentro se ve una de las cuevas. Es el Black Spot G de la ruta de La isla del tesoro, dedicado a Israel Hands, pirata real que navegó con Barbanegra. Barbanegra no pisó este edificio: es posterior a su muerte.",
        "open": "Pub con terraza junto al puerto; pedid que os enseñen la cueva."
      },
      {
        "name": "M Shed (museo de Bristol)",
        "address": "Princes Wharf, Wapping Road, BS1 4RN",
        "lat": 51.4473,
        "lng": -2.5986,
        "story": "De aquí sale «Pirates and Prejudice», el paseo de los museos de Bristol sobre piratas reales y de ficción, de Henry Morgan a Barbanegra y Long John Silver, separando el mito de la historia.",
        "open": "Museo en el muelle. El paseo guiado es por temporadas (la de 2026 ya terminó)."
      },
      {
        "name": "Placa de Woodes Rogers, Queen Square",
        "address": "33-35 Queen Square, BS1 4LU (lado sur)",
        "lat": 51.44975,
        "lng": -2.59512,
        "story": "Woodes Rogers, corsario de Bristol: en 1709 rescató a Alexander Selkirk, el Robinson Crusoe real, y en 1718 llegó a Nassau como gobernador de las Bahamas para acabar con el refugio pirata que usaba Barbanegra. No fue él quien lo mató: fueron los hombres de Maynard.",
        "open": "Plaza pública, siempre abierta. El punto del mapa es aproximado: la placa está en el lado sur."
      },
      {
        "name": "The Hole in the Wall (pub)",
        "address": "2 The Grove, Queen Square, BS1 4QZ",
        "lat": 51.44944,
        "lng": -2.59365,
        "story": "Según la tradición, inspiró el Spy-Glass, la taberna de Long John Silver en La isla del tesoro. Sus ventanucos servían para vigilar a la leva y a los aduaneros.",
        "open": "Pub y restaurante en la esquina sureste de la plaza; preguntad por la mirilla."
      },
      {
        "name": "The Llandoger Trow (pub)",
        "address": "King Street, esquina con Welsh Back, BS1 4ER",
        "lat": 51.4519,
        "lng": -2.5931,
        "story": "De hacia 1664: dicen que inspiró la posada Almirante Benbow de La isla del tesoro, y una tradición sin pruebas cuenta que aquí Defoe conoció a Selkirk. Las guías dicen que Barbanegra bebía aquí y que su fantasma ronda el local; no hay pruebas, pero es el final perfecto.",
        "open": "Pub en uso (en invierno, lunes y martes abre a las 14:00)."
      }
    ]
  };
  function mapsPoint(st) { return 'https://www.google.com/maps/search/?api=1&query=' + st.lat + ',' + st.lng; }
  function mapsRoute(stops) {
    if (!stops.length) return '';
    var pt = function (st) { return st.lat + ',' + st.lng; };
    var mid = stops.slice(1, -1).map(pt).join('|');
    return 'https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=' + pt(stops[0]) + '&destination=' + pt(stops[stops.length - 1]) + (mid ? '&waypoints=' + encodeURIComponent(mid) : '');
  }
  U.acts.blackbeard = function () { U.routeSheet(); };
  U.routeSheet = function (keep) {
    var done = U.local.route = U.local.route || {}, stops = ROUTE.stops, n = stops.filter(function (st, i) { return done[i]; }).length;
    var html = U.head('🏴‍☠️ Ruta de Barbanegra') +
      '<p class="small muted" style="margin-top:0">' + esc(ROUTE.intro) + '</p>' +
      '<div class="row"><div class="progress grow"><i style="width:' + (stops.length ? Math.round(n / stops.length * 100) : 0) + '%"></i></div><b>' + n + '/' + stops.length + '</b></div>' +
      (n && n === stops.length ? '<div class="warn-box" style="text-align:center">🏴‍☠️ ¡Ruta completada! Barbanegra estaría orgulloso. Kaido, no tanto.</div>' : '') +
      '<a class="btn primary block" style="margin:12px 0" target="_blank" rel="noopener" href="' + esc(mapsRoute(stops)) + '">🗺️ Abrir la ruta en el mapa</a>' +
      '<p class="small dim" style="margin-top:0">' + esc(ROUTE.walk) + '</p>' +
      '<div class="card">' + stops.map(function (st, i) {
        return '<div class="route-stop' + (done[i] ? ' done' : '') + '">' +
          '<button class="route-num" data-stop="' + i + '" aria-pressed="' + !!done[i] + '" aria-label="Marcar ' + esc(st.name) + ' como visitada">' + (done[i] ? '✓' : (i + 1)) + '</button>' +
          '<div class="grow" style="min-width:0"><b>' + esc(st.name) + '</b><div class="small dim">' + esc(st.address) + '</div>' +
          '<div class="small muted" style="margin-top:4px">' + esc(st.story) + '</div>' +
          (st.open ? '<div class="small dim" style="margin-top:2px">' + esc(st.open) + '</div>' : '') +
          '<a class="route-go" target="_blank" rel="noopener" href="' + esc(mapsPoint(st)) + '">📍 Cómo llegar</a></div></div>';
      }).join('') + '</div>' +
      '<p class="small dim">Una leyenda pirata no es un dato histórico: lo que es tradición, lo decimos.</p>';
    var sh = keep ? U.swap(html) : U.sheet(html, { tall: true });
    Array.prototype.forEach.call(sh.querySelectorAll('[data-stop]'), function (b) {
      b.onclick = function () {
        var i = b.getAttribute('data-stop'), d = U.local.route = U.local.route || {};
        if (d[i]) delete d[i]; else d[i] = 1;
        X.buzz(15);
        U.saveLocal();
        var top = sh.scrollTop;
        U.routeSheet(true);
        var now = U.topSheet(); if (now) now.scrollTop = top;
        var all = stops.every(function (st, k) { return (U.local.route || {})[k]; });
        if (all && d[i]) { X.sound('win'); X.toast('🏴‍☠️ ¡Ruta de Barbanegra completada!', 'good'); }
      };
    });
  };

  U.acts.bristol = function () {
    U.sheet(U.head('🌉 Bristol') +
      '<p class="small muted" style="margin-top:0">Después de la última ronda: unos clásicos para la tripulación.</p>' +
      (ROUTE.stops.length ? '<button class="card route-card" data-act="blackbeard"><span style="font-size:34px">🏴‍☠️</span><span class="grow" style="text-align:left"><b>Ruta de Barbanegra</b><div class="small muted">' + ROUTE.stops.length + ' paradas piratas por el puerto. El Barbanegra real, el que dio nombre a Marshall D. Teach, sería de Bristol.</div></span><span class="chev">›</span></button>' : '') +
      '<div class="card">' + SPOTS.map(function (s) { return '<div class="spot"><span class="si">' + s[0] + '</span><div><b>' + s[1] + '</b><div class="small muted">' + s[2] + '</div></div></div>'; }).join('') + '</div>' +
      '<h2 class="sec">🗣️ Habla como en Bristol</h2><div class="card">' + PHRASES.map(function (p) { return '<div class="phrase"><b>' + esc(p[0]) + '</b><span class="muted">' + esc(p[1]) + '</span></div>'; }).join('') + '</div>');
  };
})(window);
