/* Kaidoneta crew page: the pirates, the online crew, links, events and settings. */
(function (root) {
  'use strict';
  var K = root.K, C = K.core, U = K.ui, X = K.fx, A = K.art, cloud = K.cloud;
  var esc = U.esc;
  var doc = root.document;

  function sw(on) { return '<span class="switch' + (on ? ' on' : '') + '" aria-hidden="true"></span>'; }
  function dupes() {
    var by = Object.create(null), out = []; // no prototype: a pirate called "constructor" or "__proto__" is just a name
    C.members(U.book).forEach(function (m) { var k = m.name.trim().toLowerCase(); (by[k] = by[k] || []).push(m); });
    Object.keys(by).forEach(function (k) { if (by[k].length > 1) out.push(by[k]); });
    return out;
  }
  function ago(t) { return t ? U.ago(t) : 'nunca'; }

  U.crewPage = function () {
    var ms = C.members(U.book), me = U.me(), ev = U.ev();
    var html = '<div class="page">';
    // online crew
    if (cloud.signedIn()) {
      var err = cloud.lastError();
      html += '<h2 class="sec">☁️ Tripulación online</h2><div class="card"><div class="row"><div style="font-size:32px">🏴‍☠️</div><div class="grow"><b style="font-size:18px">' + esc(cloud.crew()) + '</b>' +
        '<div class="small ' + (err ? '' : 'muted') + '" style="' + (err ? 'color:#fda4af' : '') + '">' + (err ? '⚠️ ' + esc(err) : '✅ Sincronizado: ' + ago(cloud.lastSync())) + '</div></div></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn sm grow" data-act="syncNow">🔄 Sincronizar</button><button class="btn sm grow" data-act="invite">📨 Invitar</button></div>' +
        '<button class="btn ghost sm block" style="margin-top:6px" data-act="leaveCrew">Salir de la tripulación en este móvil</button></div>';
    } else {
      html += '<h2 class="sec">☁️ Tripulación online</h2><div class="card"><b>Cada uno registra desde su móvil</b><div class="small muted" style="margin:4px 0 12px">Sube la tripulación online con un nombre y una contraseña que compartes con tus amigos. Cada móvil sigue funcionando sin conexión y se sincroniza en cuanto pilla cobertura.</div>' +
        '<div class="row"><button class="btn primary sm grow" style="flex:1.7" data-act="createCrew">Crear tripulación</button><button class="btn sm grow" data-act="joinCrew">Unirse</button></div></div>';
    }
    // pirates
    html += '<h2 class="sec">🏴‍☠️ Piratas <span class="more">' + ms.length + '</span></h2><div class="card">' + ms.map(function (m) {
      return '<div class="member-row"><button class="row grow" style="text-align:left;min-width:0" data-act="player" data-id="' + m.id + '">' + U.av(m) +
        '<span class="grow" style="min-width:0"><b class="ellip" style="display:block">' + esc(m.name) + (m.id === U.local.me ? ' <span class="me-tag">YO</span>' : '') + '</b><span class="small muted">' + U.lchip(m.leader) + '</span></span></button>' +
        '<button class="btn sm" data-act="editMember" data-id="' + m.id + '">Editar</button></div>';
    }).join('') + '<div class="row" style="margin-top:10px"><button class="btn sm grow" data-act="addMember">＋ Añadir pirata</button><button class="btn sm grow" data-act="who">' + (me ? '🔁 No soy ' + esc(me.name) : '🙋 ¿Quién soy?') + '</button></div></div>';
    dupes().forEach(function (list) {
      html += '<div class="warn-box">👯 Hay ' + list.length + ' piratas llamados “' + esc(list[0].name) + '” (¿añadidos desde móviles distintos?). <button class="btn sm" style="margin-top:8px" data-act="mergeDupes" data-ids="' + list.map(function (m) { return m.id; }).join(',') + '">Fusionarlos en uno</button></div>';
    });
    // events
    html += '<h2 class="sec">🏯 Evento</h2><div class="card"><button class="list-btn" data-act="events"><span style="font-size:26px">🌉</span><span class="grow"><b>' + esc(ev.name) + '</b><div class="small muted">' + esc(U.dateLabel(ev.date)) + (ev.city ? ' · ' + esc(ev.city) : '') + ' · rondas de ' + ev.mins + ' min</div></span><span class="chev">›</span></button></div>';
    // links
    html += '<h2 class="sec">🔗 ¿Sin cobertura? Por enlace</h2><div class="card"><div class="small muted" style="margin-bottom:10px">Manda toda la tripulación (piratas, rondas y reacciones) como enlace por el grupo. Al abrirlo en otro móvil se fusiona todo. En iPhone con Kaidoneta en la pantalla de inicio, copia el enlace y pégalo en 📥 Abrir un enlace.</div>' +
      '<div class="row"><button class="btn sm grow" data-act="sendLink">📤 Enviar enlace</button><button class="btn sm grow" data-act="importLink">📥 Abrir un enlace</button></div></div>';
    // settings
    html += '<h2 class="sec">⚙️ Este móvil</h2><div class="card">' +
      '<button class="list-btn" data-act="toggle" data-k="sound"><span style="font-size:22px">🔊</span><span class="grow"><b>Sonidos</b><div class="small muted">Truenos al ganar</div></span>' + sw(U.local.sound) + '</button>' +
      '<button class="list-btn" data-act="toggle" data-k="buzz"><span style="font-size:22px">📳</span><span class="grow"><b>Vibración</b><div class="small muted">Móviles Android</div></span>' + sw(U.local.buzz) + '</button>' +
      '<button class="list-btn" data-act="kaidoStyle"><span style="font-size:22px">👹</span><span class="grow"><b>Estilo de Kaido</b><div class="small muted">' + (U.kaidoId() ? esc(A.kaidoVariants[U.kaidoId()].name) : 'El dragón') + ' · en el Cuartel</div></span><span class="chev">›</span></button>' +
      '<button class="list-btn" data-act="install"><span style="font-size:22px">📲</span><span class="grow"><b>Añadir a pantalla de inicio</b><div class="small muted">Pantalla completa y sin conexión</div></span><span class="chev">›</span></button>' +
      '<button class="list-btn" data-act="wipe"><span style="font-size:22px">🧨</span><span class="grow"><b style="color:#fda4af">Borrar este móvil</b><div class="small muted">Borra los datos de la tripulación solo de este móvil</div></span></button>' +
    '</div>';
    html += '<p class="small dim" style="text-align:center;margin:22px 10px 0">Kaidoneta · hecha por fans para los amigos, sin relación con Bandai, Shueisha ni Toei Animation. Dibujos originales. ¡Vamos!</p>';
    return html + '</div>';
  };

  /* ---------- pirates ---------- */
  U.acts.addMember = function () { U.memberSheet(null); };
  U.acts.editMember = function (el) { U.memberSheet(el.getAttribute('data-id')); };
  U.memberSheet = function (id, opts) {
    opts = opts || {};
    var old = id ? U.member(id) : null, ms = C.members(U.book);
    var f = old ? JSON.parse(JSON.stringify(old)) : {
      name: '', emoji: C.EMOJIS[ms.length % C.EMOJIS.length], color: C.MEMBER_COLORS[ms.length % C.MEMBER_COLORS.length],
      leader: { name: C.KAIDO.name, colors: C.KAIDO.colors.slice(), set: C.KAIDO.set }, deck: '',
    };
    var isMe = opts.me || (old && old.id === U.local.me) || (!old && !ms.length);
    var html = U.head(old ? 'Editar pirata' : opts.me || !ms.length ? 'Tu pirata' : 'Nuevo pirata') +
      '<div style="display:flex;justify-content:center;margin:8px 0 4px" id="mb-av"></div>' +
      '<div class="field"><label for="mb-name">Nombre</label><input class="inp" id="mb-name" maxlength="24" autocomplete="off" value="' + esc(f.name) + '" placeholder="' + (isMe ? 'Tu nombre' : 'Nombre de tu amigo') + '"></div>' +
      '<div class="field"><span class="lab">Emblema</span><div class="chips" id="mb-emoji"></div></div>' +
      '<div class="field"><span class="lab">Color</span><div class="chips" id="mb-color"></div></div>' +
      '<div class="field"><span class="lab">Líder</span><div class="row"><input class="inp grow" id="mb-leader" list="mb-dl" maxlength="40" value="' + esc(f.leader.name) + '"><input class="inp" id="mb-set" maxlength="12" style="width:30%" value="' + esc(f.leader.set) + '" placeholder="Set"></div>' +
        '<datalist id="mb-dl">' + C.LEADERS.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
        '<div class="chips" id="mb-lcolors" style="margin-top:10px"></div></div>' +
      '<div class="field"><label for="mb-deck">Apodo del mazo</label><input class="inp" id="mb-deck" maxlength="40" value="' + esc(f.deck) + '" placeholder="p. ej. Raimei Hakke morado"></div>' +
      '<button class="list-btn" id="mb-me"><span style="font-size:22px">🙋</span><span class="grow"><b>Soy yo</b><div class="small muted">Este móvil registra las rondas como este pirata</div></span>' + sw(isMe) + '</button>' +
      '<div class="save-bar">' + (old ? '<button class="btn danger" data-del>Borrar</button>' : '') + '<button class="btn primary" data-ok>' + (old ? 'Guardar' : 'Subir a bordo') + '</button></div>';
    var sh = U.sheet(html, { tall: true });
    var q = function (s) { return sh.querySelector(s); };
    function paint() {
      q('#mb-av').innerHTML = U.av({ emoji: f.emoji, color: f.color, name: f.name }, 'lg');
      q('#mb-emoji').innerHTML = C.EMOJIS.map(function (e) { return '<button class="chip emoji' + (f.emoji === e ? ' on' : '') + '" data-e="' + e + '">' + e + '</button>'; }).join('');
      q('#mb-color').innerHTML = C.MEMBER_COLORS.map(function (c, i) { return '<button class="chip swatch' + (f.color === c ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '" aria-label="Color ' + (i + 1) + '"></button>'; }).join('');
      q('#mb-lcolors').innerHTML = C.COLORS.map(function (c) { return '<button class="chip color' + (f.leader.colors.indexOf(c.id) >= 0 ? ' on' : '') + '" data-lc="' + c.id + '" style="background:' + c.hex + '" aria-label="' + c.name + '"></button>'; }).join('');
      q('#mb-me').querySelector('.switch').classList.toggle('on', isMe);
    }
    paint();
    sh.addEventListener('click', function (e) {
      var b = e.target.closest('[data-e],[data-c],[data-lc]');
      if (!b) return;
      if (b.hasAttribute('data-e')) f.emoji = b.getAttribute('data-e');
      if (b.hasAttribute('data-c')) f.color = b.getAttribute('data-c');
      if (b.hasAttribute('data-lc')) {
        var c = b.getAttribute('data-lc'), i = f.leader.colors.indexOf(c);
        if (i >= 0) f.leader.colors.splice(i, 1); else { f.leader.colors.push(c); if (f.leader.colors.length > 2) f.leader.colors.shift(); }
      }
      paint();
    });
    q('#mb-me').onclick = function () { isMe = !isMe; paint(); };
    q('[data-ok]').onclick = function () {
      var name = q('#mb-name').value.trim();
      if (!name) { X.toast('Todo pirata necesita un nombre.', 'bad'); q('#mb-name').focus(); return; }
      var rec = { id: old ? old.id : C.newId('m'), name: name, emoji: f.emoji, color: f.color, leader: { name: q('#mb-leader').value.trim() || 'Kaido', colors: f.leader.colors, set: q('#mb-set').value.trim() }, deck: q('#mb-deck').value.trim() };
      var first = !C.members(U.book).length;
      C.put(U.book, 'members', rec);
      if (isMe) U.local.me = rec.id; else if (U.local.me === rec.id) U.local.me = '';
      U.saveLocal();
      U.close();
      if (first) U.tab = 'home';
      U.save();
      X.toast(old ? 'Guardado' : first ? '¡Bienvenido a bordo, ' + name + '! Ahora añade a tu tripulación.' : name + ' se une a la tripulación ⚡', 'good');
    };
    var del = q('[data-del]');
    if (del) del.onclick = function () {
      var n = C.games(U.book, old.id, null).length;
      U.confirm('¿Borrar a ' + old.name + '?', n ? 'Sus rondas (' + n + ') también desaparecen de la clasificación, en todos los móviles de la tripulación.' : 'Todavía no tiene rondas.', 'Borrar', function () {
        C.remove(U.book, 'members', old.id);
        if (U.local.me === old.id) { U.local.me = ''; U.saveLocal(); }
        U.close(); U.save();
      }, true);
    };
    if (!old) setTimeout(function () { try { q('#mb-name').focus(); } catch (e) { /* ok */ } }, 300);
  };
  U.acts.mergeDupes = function (el) {
    var ids = el.getAttribute('data-ids').split(','), keep = ids[0];
    U.confirm('¿Fusionar en un solo pirata?', 'Todas sus rondas y reacciones acaban en un solo perfil.', 'Fusionar', function () {
      ids.slice(1).forEach(function (d) { C.mergeMembers(U.book, keep, d); if (U.local.me === d) U.local.me = keep; });
      U.saveLocal(); U.save(); X.toast('Fusionados', 'good');
    });
  };

  /* ---------- online crew ---------- */
  U.acts.createCrew = function () { U.crewSheet('create'); };
  U.acts.joinCrew = function () { U.crewSheet('join'); };
  U.crewSheet = function (mode, name) {
    var html = U.head(mode === 'create' ? 'Crear tripulación' : 'Unirse a una tripulación') +
      '<div class="seg full" style="margin-bottom:6px"><button class="' + (mode === 'create' ? 'on' : '') + '" data-mode="create">Crear</button><button class="' + (mode === 'join' ? 'on' : '') + '" data-mode="join">Unirse</button></div>' +
      '<p class="small muted">' + (mode === 'create'
        ? 'Elige un nombre y una contraseña para la tripulación y pásaselos a tus amigos (en persona o por el grupo). Los piratas y las rondas de este móvil se suben con ella.'
        : 'Escribe el nombre y la contraseña de la tripulación que te ha pasado tu amigo. Lo que haya en este móvil se fusiona: no se pierde nada.') + '</p>' +
      '<div class="field"><label for="cr-name">Nombre de la tripulación</label><input class="inp" id="cr-name" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="kaidoneta_bristol" value="' + esc(name || '') + '"></div>' +
      '<div class="field"><label for="cr-pass">Contraseña de la tripulación</label><input class="inp" id="cr-pass" type="password" autocomplete="off" minlength="6" placeholder="Mínimo 6 caracteres"></div>' +
      '<label class="row small muted" style="gap:8px"><input type="checkbox" id="cr-show"> Mostrar contraseña</label>' +
      '<div id="cr-err"></div>' +
      '<div class="save-bar"><button class="btn primary" data-go>' + (mode === 'create' ? '🏴‍☠️ Crear tripulación' : '☁️ Unirse') + '</button></div>';
    var sh = U.topSheet() && U.topSheet().querySelector('#cr-name') ? U.swap(html) : U.sheet(html);
    var q = function (s) { return sh.querySelector(s); };
    Array.prototype.forEach.call(sh.querySelectorAll('[data-mode]'), function (b) { b.onclick = function () { U.crewSheet(b.getAttribute('data-mode'), q('#cr-name').value); }; });
    q('#cr-show').onchange = function () { q('#cr-pass').type = this.checked ? 'text' : 'password'; };
    q('[data-go]').onclick = function () {
      var btn = this, crew = q('#cr-name').value, pass = q('#cr-pass').value;
      btn.disabled = true; btn.textContent = 'Conectando…';
      q('#cr-err').innerHTML = '';
      (mode === 'create' ? cloud.create(crew, pass) : cloud.join(crew, pass)).then(function (c) {
        // a slow answer may arrive after the user moved on: close this sheet only if it is still the one on top
        if (U.topSheet() === sh) U.close();
        U.startCloud();
        U.render();
        X.toast((mode === 'create' ? 'Tripulación ' + c + ' creada' : '¡Ya estás en ' + c + '!') + ' ⚡ Ahora se sincroniza todo.', 'good');
        setTimeout(function () {
          if (U.topSheet()) return;
          if (!U.me() && C.members(U.book).length) U.whoSheet();
          else if (!C.members(U.book).length) U.memberSheet(null, { me: true });
        }, 400);
      }, function (e) {
        btn.disabled = false; btn.textContent = mode === 'create' ? '🏴‍☠️ Crear tripulación' : '☁️ Unirse';
        q('#cr-err').innerHTML = '<div class="warn-box">' + esc(e.message) + '</div>';
        if (U.topSheet() !== sh) X.toast(e.message, 'bad');
      });
    };
  };
  U.acts.syncNow = function () {
    cloud.sync().then(function (took) { X.toast(took ? 'Sincronizado: hay novedades de la tripulación ⚡' : 'Sincronizado', 'good'); U.render(); }, function (e) { X.toast(e.message, 'bad'); U.render(); });
  };
  U.acts.invite = function () {
    var url = root.location.origin + root.location.pathname + '#join=' + encodeURIComponent(cloud.crew());
    var text = '¡Únete a nuestra tripulación de Kaidoneta “' + cloud.crew() + '” para el Regional de Bristol! ⚡ Abre este enlace y escribe la contraseña de la tripulación que te pase. En iPhone, si tienes Kaidoneta en la pantalla de inicio, ábrela desde ahí → Tripulación → Unirse, y escribe el nombre “' + cloud.crew() + '” y la contraseña.';
    share(text, url);
  };
  U.acts.leaveCrew = function () {
    U.confirm('¿Salir de la tripulación en este móvil?', 'Este móvil deja de sincronizarse. Todo se queda en este móvil, y online para los demás.', 'Salir', function () { cloud.leave(); U.render(); });
  };

  /* ---------- links ---------- */
  function share(text, url) {
    var nav = root.navigator;
    if (nav.share) { nav.share({ title: 'Kaidoneta', text: text, url: url }).then(null, function () { /* cancelled */ }); return; }
    var sh = U.sheet(U.head('Copia y envía') + '<p class="small muted">' + esc(text) + '</p><textarea class="inp" readonly style="min-height:120px">' + esc(url) + '</textarea><button class="btn primary block" style="margin-top:10px" data-copy>Copiar enlace</button>');
    sh.querySelector('[data-copy]').onclick = function () {
      var t = sh.querySelector('textarea'); t.select();
      (nav.clipboard ? nav.clipboard.writeText(url) : Promise.reject()).then(function () { X.toast('Copiado', 'good'); }, function () { try { doc.execCommand('copy'); X.toast('Copiado', 'good'); } catch (e) { X.toast('Selecciona el texto y cópialo.'); } });
    };
  }
  U.acts.sendLink = function () {
    C.pack(U.book).then(function (code) {
      var url = root.location.origin + root.location.pathname + '#crew=' + code, n = C.count(U.book);
      share('Tripulación de Kaidoneta: ' + n.members + ' piratas, ' + n.matches + ' rondas. Ábrelo para fusionarlo con tu app ⚡ En iPhone con Kaidoneta en la pantalla de inicio: copia el enlace y pégalo en Tripulación → Abrir un enlace.', url);
    });
  };
  U.importSheet = function () {
    var sh = U.sheet(U.head('Abrir un enlace') + '<p class="small muted">Pega el enlace (o el código) que te ha mandado un amigo. Se fusiona con este móvil: en cada pirata, ronda o evento gana el cambio más reciente.</p><textarea class="inp" id="im-code" placeholder="https://…#crew=…"></textarea><div id="im-err"></div><div class="save-bar"><button class="btn primary" data-go>Fusionar</button></div>');
    sh.querySelector('[data-go]').onclick = function () {
      C.unpack(sh.querySelector('#im-code').value).then(function (b) { U.close(); setTimeout(function () { confirmMerge(b); }, 80); }, function (e) {
        sh.querySelector('#im-err').innerHTML = '<div class="warn-box">' + esc(e.message || 'Ese enlace no se ha podido abrir.') + '</div>';
      });
    };
  };
  // Live records on this phone that a newer deletion in the link would remove.
  function deletions(b) {
    var n = 0;
    ['members', 'matches', 'events'].forEach(function (coll) {
      var theirs = b[coll] || {};
      Object.keys(theirs).forEach(function (k) {
        var t = theirs[k], mine = U.book[coll] && U.book[coll][k];
        if (t && t.del && mine && !mine.del && t.at > mine.at) n++;
      });
    });
    return n;
  }
  function confirmMerge(b) {
    var n = C.count(b), gone = deletions(b);
    U.confirm('¿Fusionar esta tripulación?', n.members + ' piratas · ' + n.matches + ' rondas · ' + n.events + ' eventos. En cada pirata, ronda o evento gana el cambio más reciente, también si es un borrado.' +
      (gone ? ' <b>Ojo: este enlace borra ' + gone + (gone === 1 ? ' cosa' : ' cosas') + ' (piratas, rondas o eventos) de este móvil.</b>' : ''), 'Fusionar', function () {
      U.book = C.ensureBristol(C.merge(U.book, b));
      if (C.fixAliases) C.fixAliases(U.book);
      U.fixMe && U.fixMe();
      U.save();
      X.toast('Fusionado ⚡', 'good');
      if (!U.me() && C.members(U.book).length) setTimeout(U.whoSheet, 300);
    });
  }
  U.openLink = function (hash) {
    try { root.history.replaceState(root.history.state, '', root.location.pathname + '#/' + (U.tab || 'home')); } catch (e) { /* file:// */ }
    C.unpack(hash).then(confirmMerge, function (e) { X.toast(e.message || 'Ese enlace no se ha podido abrir.', 'bad'); });
  };

  /* ---------- settings ---------- */
  U.acts.toggle = function (el) { var k = el.getAttribute('data-k'); U.local[k] = !U.local[k]; U.saveLocal(); U.render(); if (k === 'buzz') X.buzz(40); };
  U.acts.kaidoStyle = function () {
    var v = A.kaidoVariants || {}, cur = U.kaidoId() || 'dragon';
    var opts = U.KAIDO_ORDER.filter(function (id) { return v[id]; }).map(function (id) { return { id: id, name: v[id].name, art: v[id].svg({ still: true }) }; });
    opts.push({ id: 'dragon', name: 'El dragón', art: A.dragon() });
    var sh = U.sheet(U.head('Estilo de Kaido') + '<p class="small muted" style="margin-top:0">Quién vigila el Cuartel.</p><div class="styles">' +
      opts.map(function (o) { return '<button class="style-card' + (o.id === cur ? ' on' : '') + '" data-style="' + o.id + '"><span class="style-art">' + o.art + '</span><b>' + esc(o.name) + '</b></button>'; }).join('') + '</div>');
    Array.prototype.forEach.call(sh.querySelectorAll('[data-style]'), function (b) {
      b.onclick = function () { U.local.kaido = b.getAttribute('data-style'); U.saveLocal(); U.close(); U.go('home'); };
    });
  };
  U.acts.install = function () {
    U.sheet(U.head('📲 Añadir a pantalla de inicio') +
      '<div class="card"><b>iPhone (Safari)</b><div class="small muted">Toca <b>Compartir</b> (el cuadrado con la flecha) → <b>Añadir a pantalla de inicio</b> → Añadir.</div>' +
        '<div class="small muted" style="margin-top:8px">Ojo: en iPhone la app de la pantalla de inicio guarda sus propios datos, aparte de Safari. Ábrela desde el icono (con cobertura la primera vez) y únete ahí a la tripulación online: Tripulación → Unirse, con el nombre y la contraseña de la tripulación. Los enlaces de tripulación se abren en Safari: cópialos y pégalos en Tripulación → 📥 Abrir un enlace.</div></div>' +
      '<div class="card"><b>Android (Chrome)</b><div class="small muted">Toca <b>⋮</b> → <b>Añadir a pantalla de inicio</b> (o <b>Instalar app</b>).</div></div>' +
      '<p class="small muted">Así se abre a pantalla completa y funciona sin cobertura. Las rondas se sincronizan con la tripulación online cuando el móvil vuelve a tener conexión.</p>');
  };
  U.acts.wipe = function () {
    U.confirm('¿Borrar este móvil?', 'Se borran de este móvil los piratas, las rondas y los ajustes. Si la tripulación está online, los demás lo conservan todo y puedes volver a unirte.', 'Borrar', function () {
      ['kaidoneta.book', 'kaidoneta.local', 'kaidoneta.hero'].forEach(function (k) { try { root.localStorage.removeItem(k); } catch (e) { /* ok */ } });
      cloud.leave();
      root.location.hash = '';
      root.location.reload();
    }, true);
  };
})(window);
