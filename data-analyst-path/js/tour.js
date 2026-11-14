/* The Dot tour: a guided walk through the whole game, led by Dot. It opens a page, rings the part it talks about and
 * explains it in a panel. It never starts on its own: the home page offers it once, and Settings and the You page can
 * replay it. You can leave at any step (✕, "Skip the tour" or Escape) and nothing is lost or locked.
 * Whether you have seen it is kept on this device only (it is not progress, so it does not sync). */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var T = (DA.tour = {});
  var KEY = 'data-analyst-path.tour';
  function L(en, es) { return DA.L ? DA.L(en, es) : en; }
  function get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: it is offered again next visit */ } }
  T.seen = function () { return get() === 'done'; };
  // The home page offers the tour until you take it or say "not now".
  T.offer = function () { return !get(); };
  T.later = function () { if (!get()) set('later'); };

  function mission() {
    var l = DA.ui && DA.ui.nextLesson ? DA.ui.nextLesson() : null;
    return '#/mission/' + ((l && l.id) || (DA.lessons && DA.lessons[0].id));
  }

  // [route, target selectors (first that exists), mood, title en, title es, text en, text es]
  T.steps = function () {
    return [
      ['#/', '.hero-card .dot-says, .hero .dot-says', 'happy',
        'Hi, I\'m Dot!', '¡Hola, soy Dot!',
        'You have just joined Dot & Co., a small chain of cafés, as its new data analyst. Every mission is a real request from the team, and each one teaches you a skill. Let me show you around: it takes two minutes.',
        'Acabas de entrar en Dot & Co., una pequeña cadena de cafeterías, para encargarte de sus datos. Cada misión es una petición real del equipo, y cada una te enseña una habilidad. Te enseño todo: son dos minutos.'],
      ['#/', '.hero-level', 'proud',
        'XP and levels', 'XP y niveles',
        'Everything you finish gives XP: lessons, practice, labs, games and cards. XP raises your level and your title. Nothing is ever taken away.',
        'Todo lo que terminas da XP: lecciones, práctica, laboratorios, juegos y tarjetas. El XP sube tu nivel y tu título. Nunca se pierde nada.'],
      ['#/', '.card.today', 'cheer',
        'Today: a small goal and three quests', 'Hoy: un objetivo pequeño y tres misiones diarias',
        'The ring is your daily goal. Reach it to keep your streak; a streak freeze covers a missed day, and a missed streak can be won back. Finish the three quests (learn, practise, code) for a surprise chest of bonus XP.',
        'El anillo es tu objetivo diario. Cúmplelo para mantener la racha; un protector cubre un día perdido, y una racha rota se puede recuperar. Completa las tres misiones diarias (aprender, practicar, programar) para abrir un cofre sorpresa con XP extra.'],
      ['#/journey', '.chapter.current, .chapter', 'happy',
        'The journey', 'El recorrido',
        'The course is a road of 9 chapters, from your first week to the job interview. Each chapter has its missions and ends with a boss case that pays a chapter bonus. Tap any mission: nothing is locked, so you can jump ahead.',
        'El curso es un camino de 9 capítulos, desde tu primera semana hasta la entrevista de trabajo. Cada capítulo tiene sus misiones y termina con un caso jefe que da un extra de capítulo. Toca cualquier misión: no hay nada bloqueado, puedes adelantarte.'],
      [mission(), '.m-steps', 'happy',
        'Five steps per mission', 'Cinco pasos por misión',
        'Brief: what the team needs. Learn: the key ideas. Try: solve it for real, in a lab or a short case. Check: a few questions, with review of older topics. Debrief: what you learned and what comes next. Already know it? Use Test out.',
        'Encargo: lo que necesita el equipo. Aprender: las ideas clave. Probar: resuélvelo de verdad, en un laboratorio o un caso breve. Comprobar: unas preguntas, con repaso de temas anteriores. Cierre: lo que has aprendido y lo que viene. ¿Ya lo sabes? Usa Ponte a prueba.'],
      ['#/practice', '.start-card', 'cheer',
        'Practice', 'Práctica',
        'A round takes about two minutes. Questions you miss come back after a few days until they stick (spaced repetition). Below are the four labs, with your progress in each.',
        'Una ronda dura unos dos minutos. Las preguntas que fallas vuelven al cabo de unos días hasta que se quedan (repetición espaciada). Debajo están los cuatro laboratorios, con tu progreso en cada uno.'],
      ['#/lab', '.lab-world', 'proud',
        'The labs: you write real code', 'Los laboratorios: escribes código de verdad',
        'SQLab, DotSheets, DotPython and DotBI run real SQL, spreadsheet formulas, pandas and DAX or Tableau in your browser. Each has 8 worlds of 4 levels. In the labs you type the answer yourself; the check accepts any correct solution, and hints and the solution are always there.',
        'SQLab, DotSheets, DotPython y DotBI ejecutan SQL, fórmulas, pandas y DAX o Tableau de verdad en tu navegador. Cada uno tiene 8 mundos de 4 niveles. En los laboratorios escribes tú la respuesta; la corrección acepta cualquier solución correcta, y siempre tienes pistas y la solución.'],
      ['#/arcade', '.game-tile', 'wow',
        'The arcade: build with tiles', 'El arcade: construye con fichas',
        'Six quick games, one per tool. Here you never type: you build queries from tiles, tap cells, chain cards or drop pills. Each game has 4 worlds of 4 levels, and every level makes new puzzles without end.',
        'Seis juegos rápidos, uno por herramienta. Aquí nunca escribes: construyes consultas con fichas, tocas celdas, encadenas cartas o sueltas píldoras. Cada juego tiene 4 mundos de 4 niveles, y cada nivel crea puzles nuevos sin fin.'],
      ['#/feed', '.fcard', 'happy',
        'Discover', 'Descubrir',
        'Short cards worth knowing: data stories, myths, chart crimes, tips and words. Answer or read one to collect it. Five cards a day count towards your goal.',
        'Tarjetas cortas que merece la pena conocer: historias de datos, mitos, crímenes gráficos, consejos y palabras. Responde o lee una para coleccionarla. Cinco tarjetas al día cuentan para tu objetivo.'],
      ['#/me', '.level-badge', 'proud',
        'You', 'Tú',
        'Your level, your streak calendar, the badges you have earned and the ones still ahead, and your collection of world stamps and boss trophies.',
        'Tu nivel, tu calendario de racha, las insignias que has ganado y las que te quedan, y tu colección de sellos de mundo y trofeos de jefe.'],
      ['#/prompts', '.prompt-item, .prompt-list', 'happy',
        'Learn with AI, the right way', 'Aprende con IA, como es debido',
        'Every lesson and this library have ready-made prompts that already know your background. Copy one into your AI assistant. The AI toolbox page has the rules that keep you learning instead of copying.',
        'Cada lección y esta biblioteca tienen prompts listos que ya conocen tu perfil. Copia uno en tu asistente de IA. La página de herramientas de IA tiene las reglas para seguir aprendiendo en lugar de copiar.'],
      ['#/settings', '.lang-choice', 'happy',
        'Settings', 'Ajustes',
        'Choose the language, your daily goal and a reminder, and turn on sync to keep your phone and computer together. You can replay this tour from here at any time.',
        'Elige el idioma, tu objetivo diario y un recordatorio, y activa la sincronización para tener juntos el móvil y el ordenador. Desde aquí puedes repetir este tour cuando quieras.'],
      ['#/', '.continue-btn, .hero .btn.accent', 'cheer',
        'Your turn', 'Te toca',
        'That is everything. Start with your next mission, or play a two-minute round. Ten minutes a day is plenty. See you in the journey!',
        '¡Eso es todo! Empieza por tu siguiente misión o juega una ronda de dos minutos. Con diez minutos al día basta. ¡Nos vemos en el recorrido!'],
    ];
  };

  var panel = null, ring = null, at = 0, list = null, onKey = null, lastFocus = null;

  function clearRing() { if (ring) { ring.classList.remove('tour-ring'); ring = null; } }
  function target(sel) {
    var parts = sel.split(',');
    for (var i = 0; i < parts.length; i++) {
      var el = document.querySelector(parts[i].trim());
      if (el && el.getClientRects().length) return el;
    }
    return null;
  }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function show(i) {
    at = Math.max(0, Math.min(list.length - 1, i));
    var s = list[at];
    var go = function () {
      clearRing();
      var el = target(s[1]);
      if (el) {
        el.classList.add('tour-ring');
        ring = el;
        el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      }
      paint(s, el);
    };
    if (location.hash !== s[0] && !(s[0] === '#/' && (location.hash === '' || location.hash === '#'))) {
      location.hash = s[0];
      setTimeout(go, 160); // let the page draw first
    } else go();
  }

  function paint(s, el) {
    var h = DA.ui.h, last = at === list.length - 1;
    if (!panel) {
      panel = h('div', { class: 'tour', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'tour-title', 'aria-describedby': 'tour-text' });
      document.body.appendChild(panel);
    }
    DA.ui.clear(panel);
    // Put the panel where it does not cover the ringed part.
    var low = el && el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 > window.innerHeight / 2;
    panel.classList.toggle('top', !!low);
    var back = h('button', { class: 'btn ghost', type: 'button', disabled: at === 0, onclick: function () { show(at - 1); } }, L('← Back', '← Atrás'));
    var next = h('button', { class: 'btn accent', type: 'button', onclick: function () { if (last) T.stop(true); else show(at + 1); } }, last ? L('Finish ✓', 'Terminar ✓') : L('Next →', 'Siguiente →'));
    panel.appendChild(h('div', { class: 'tour-head' },
      h('div', { class: 'tour-dot', 'aria-hidden': 'true' }, DA.mascot ? DA.mascot.svg(s[2], 56) : null),
      h('div', { class: 'grow' },
        h('p', { class: 'tour-count small muted', text: L('Step ' + (at + 1) + ' of ' + list.length, 'Paso ' + (at + 1) + ' de ' + list.length) }),
        h('h2', { id: 'tour-title', tabindex: '-1', text: L(s[3], s[4]) })),
      h('button', { class: 'icon-btn tour-x', type: 'button', 'aria-label': L('Skip the tour', 'Saltar el tour'), onclick: function () { T.stop(false); } }, '✕')));
    panel.appendChild(h('p', { id: 'tour-text', class: 'tour-text', text: L(s[5], s[6]) }));
    panel.appendChild(h('div', { class: 'tour-progress', 'aria-hidden': 'true' }, list.map(function (_, j) { return h('span', { class: j === at ? 'on' : j < at ? 'past' : '' }); })));
    panel.appendChild(h('div', { class: 'row tour-actions' },
      h('button', { class: 'btn ghost small tour-skip', type: 'button', onclick: function () { T.stop(false); } }, L('Skip the tour', 'Saltar el tour')),
      h('span', { class: 'grow' }), back, next));
    var t = panel.querySelector('#tour-title');
    if (t) t.focus({ preventScroll: true });
  }

  T.active = function () { return !!panel; };
  T.start = function () {
    if (panel) return;
    lastFocus = document.activeElement;
    list = T.steps();
    onKey = function (e) {
      if (!panel) return;
      if (e.key === 'Escape') { e.preventDefault(); T.stop(false); }
      else if (e.key === 'ArrowRight' && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); if (at < list.length - 1) show(at + 1); }
      else if (e.key === 'ArrowLeft' && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); if (at > 0) show(at - 1); }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('touring');
    show(0);
  };
  // finished: true when the last step was reached. Either way the home page stops offering it.
  T.stop = function (finished) {
    clearRing();
    if (panel) { panel.remove(); panel = null; }
    if (onKey) document.removeEventListener('keydown', onKey);
    onKey = null;
    document.body.classList.remove('touring');
    set('done');
    if (finished && DA.ui && DA.ui.toast) DA.ui.toast(L('Tour finished. You can replay it from Settings.', 'Tour terminado. Puedes repetirlo desde Ajustes.'));
    var offer = document.querySelector('.tour-offer');
    if (offer) offer.remove();
    if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  // Pages that change under the tour (the user followed a link) keep the ring on the right element.
  window.addEventListener('hashchange', function () { if (panel && list && location.hash !== list[at][0]) { clearRing(); } });

  // The card on the home page.
  T.offerCard = function () {
    if (!T.offer()) return null;
    var h = DA.ui.h;
    var card = h('section', { class: 'card tour-offer' },
      DA.mascot.say('wow', L('New here, or want a refresher? Let me show you how everything works: missions, labs, games, cards and more. Two minutes.',
        '¿Acabas de llegar o quieres repasar? Te enseño cómo funciona todo: misiones, laboratorios, juegos, tarjetas y más. Dos minutos.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn accent', type: 'button', onclick: function () { T.start(); } }, L('Take the tour with Dot', 'Haz el tour con Dot')),
          h('button', { class: 'btn ghost', type: 'button', onclick: function () { T.later(); card.remove(); } }, L('Not now', 'Ahora no')))));
    return card;
  };
  // A button for Settings and the You page.
  T.button = function (cls) {
    return DA.ui.h('button', { class: cls || 'btn', type: 'button', onclick: function () { T.start(); } }, L('🎓 Replay the tour with Dot', '🎓 Repetir el tour con Dot'));
  };
})();
