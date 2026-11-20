/* Kaidoneta crew page: the pirates, the online crew, links, events and settings. */
(function (root) {
  'use strict';
  var K = root.K, C = K.core, U = K.ui, X = K.fx, A = K.art, cloud = K.cloud;
  var esc = U.esc;
  var doc = root.document;

  function sw(on) { return '<span class="switch' + (on ? ' on' : '') + '" aria-hidden="true"></span>'; }
  function dupes() {
    var by = {}, out = [];
    C.members(U.book).forEach(function (m) { var k = m.name.trim().toLowerCase(); (by[k] = by[k] || []).push(m); });
    Object.keys(by).forEach(function (k) { if (by[k].length > 1) out.push(by[k]); });
    return out;
  }
  function ago(t) { return t ? U.ago(t) : 'never'; }

  U.crewPage = function () {
    var ms = C.members(U.book), me = U.me(), ev = U.ev();
    var html = '<div class="page">';
    // online crew
    if (cloud.signedIn()) {
      var err = cloud.lastError();
      html += '<h2 class="sec">☁️ Online crew</h2><div class="card"><div class="row"><div style="font-size:32px">🏴‍☠️</div><div class="grow"><b style="font-size:18px">' + esc(cloud.crew()) + '</b>' +
        '<div class="small ' + (err ? '' : 'muted') + '" style="' + (err ? 'color:#fda4af' : '') + '">' + (err ? '⚠️ ' + esc(err) : '✅ Synced ' + ago(cloud.lastSync())) + '</div></div></div>' +
        '<div class="row" style="margin-top:12px"><button class="btn sm grow" data-act="syncNow">🔄 Sync now</button><button class="btn sm grow" data-act="invite">📨 Invite</button></div>' +
        '<button class="btn ghost sm block" style="margin-top:6px" data-act="leaveCrew">Leave the crew on this phone</button></div>';
    } else {
      html += '<h2 class="sec">☁️ Online crew</h2><div class="card"><b>Everyone logs from their own phone</b><div class="small muted" style="margin:4px 0 12px">Put the crew online with a crew name and a password you share with your friends. Each phone keeps working offline and syncs when it has signal.</div>' +
        '<div class="row"><button class="btn primary sm grow" data-act="createCrew">Create crew</button><button class="btn sm grow" data-act="joinCrew">Join crew</button></div></div>';
    }
    // pirates
    html += '<h2 class="sec">🏴‍☠️ Pirates <span class="more">' + ms.length + '</span></h2><div class="card">' + ms.map(function (m) {
      return '<div class="member-row"><button class="row grow" style="text-align:left;min-width:0" data-act="player" data-id="' + m.id + '">' + U.av(m) +
        '<span class="grow" style="min-width:0"><b class="ellip" style="display:block">' + esc(m.name) + (m.id === U.local.me ? ' <span class="me-tag">ME</span>' : '') + '</b><span class="small muted">' + U.lchip(m.leader) + '</span></span></button>' +
        '<button class="btn sm" data-act="editMember" data-id="' + m.id + '">Edit</button></div>';
    }).join('') + '<div class="row" style="margin-top:10px"><button class="btn sm grow" data-act="addMember">＋ Add pirate</button><button class="btn sm grow" data-act="who">' + (me ? '🔁 I\'m not ' + esc(me.name) : '🙋 Who am I?') + '</button></div></div>';
    dupes().forEach(function (list) {
      html += '<div class="warn-box">👯 ' + list.length + ' pirates called “' + esc(list[0].name) + '” (added on different phones?). <button class="btn sm" style="margin-top:8px" data-act="mergeDupes" data-ids="' + list.map(function (m) { return m.id; }).join(',') + '">Merge them into one</button></div>';
    });
    // events
    html += '<h2 class="sec">🏯 Event</h2><div class="card"><button class="list-btn" data-act="events"><span style="font-size:26px">🌉</span><span class="grow"><b>' + esc(ev.name) + '</b><div class="small muted">' + esc(U.dateLabel(ev.date)) + (ev.city ? ' · ' + esc(ev.city) : '') + ' · rounds of ' + ev.mins + ' min</div></span><span class="chev">›</span></button></div>';
    // links
    html += '<h2 class="sec">🔗 No signal? Share by link</h2><div class="card"><div class="small muted" style="margin-bottom:10px">Send the whole crew (pirates, rounds, reactions) as a link in your group chat. Opening it on another phone merges it in; nothing is lost.</div>' +
      '<div class="row"><button class="btn sm grow" data-act="sendLink">📤 Send crew link</button><button class="btn sm grow" data-act="importLink">📥 Open a link</button></div></div>';
    // settings
    html += '<h2 class="sec">⚙️ This phone</h2><div class="card">' +
      '<button class="list-btn" data-act="toggle" data-k="sound"><span style="font-size:22px">🔊</span><span class="grow"><b>Sounds</b><div class="small muted">Thunder on a win</div></span>' + sw(U.local.sound) + '</button>' +
      '<button class="list-btn" data-act="toggle" data-k="buzz"><span style="font-size:22px">📳</span><span class="grow"><b>Vibration</b><div class="small muted">Android phones</div></span>' + sw(U.local.buzz) + '</button>' +
      '<button class="list-btn" data-act="kaidoStyle"><span style="font-size:22px">👹</span><span class="grow"><b>Kaido style</b><div class="small muted">' + (U.kaidoId() ? esc(A.kaidoVariants[U.kaidoId()].name) : 'The dragon') + ' · on the home screen</div></span><span class="chev">›</span></button>' +
      '<button class="list-btn" data-act="install"><span style="font-size:22px">📲</span><span class="grow"><b>Add to Home Screen</b><div class="small muted">Full screen and offline</div></span><span class="chev">›</span></button>' +
      '<button class="list-btn" data-act="wipe"><span style="font-size:22px">🧨</span><span class="grow"><b style="color:#fda4af">Erase this phone</b><div class="small muted">Removes the crew\'s data from this phone only</div></span></button>' +
    '</div>';
    html += '<p class="small dim" style="text-align:center;margin:22px 10px 0">Kaidoneta · fan-made for friends, not affiliated with Bandai, Shueisha or Toei Animation. Original drawings. ¡Vamos!</p>';
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
    var html = U.head(old ? 'Edit pirate' : opts.me || !ms.length ? 'Your pirate' : 'New pirate') +
      '<div style="display:flex;justify-content:center;margin:8px 0 4px" id="mb-av"></div>' +
      '<div class="field"><label for="mb-name">Name</label><input class="inp" id="mb-name" maxlength="24" autocomplete="off" value="' + esc(f.name) + '" placeholder="' + (isMe ? 'Your name' : 'Friend\'s name') + '"></div>' +
      '<div class="field"><span class="lab">Emblem</span><div class="chips" id="mb-emoji"></div></div>' +
      '<div class="field"><span class="lab">Colour</span><div class="chips" id="mb-color"></div></div>' +
      '<div class="field"><span class="lab">Leader</span><div class="row"><input class="inp grow" id="mb-leader" list="mb-dl" maxlength="40" value="' + esc(f.leader.name) + '"><input class="inp" id="mb-set" maxlength="12" style="width:30%" value="' + esc(f.leader.set) + '" placeholder="Set"></div>' +
        '<datalist id="mb-dl">' + C.LEADERS.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
        '<div class="chips" id="mb-lcolors" style="margin-top:10px"></div></div>' +
      '<div class="field"><label for="mb-deck">Deck nickname</label><input class="inp" id="mb-deck" maxlength="40" value="' + esc(f.deck) + '" placeholder="e.g. Purple Thunder Bagua"></div>' +
      '<button class="list-btn" id="mb-me"><span style="font-size:22px">🙋</span><span class="grow"><b>This is me</b><div class="small muted">This phone logs rounds as this pirate</div></span>' + sw(isMe) + '</button>' +
      '<div class="save-bar">' + (old ? '<button class="btn danger" data-del>Delete</button>' : '') + '<button class="btn primary" data-ok>' + (old ? 'Save' : 'Join the crew') + '</button></div>';
    var sh = U.sheet(html, { tall: true });
    var q = function (s) { return sh.querySelector(s); };
    function paint() {
      q('#mb-av').innerHTML = U.av({ emoji: f.emoji, color: f.color, name: f.name }, 'lg');
      q('#mb-emoji').innerHTML = C.EMOJIS.map(function (e) { return '<button class="chip emoji' + (f.emoji === e ? ' on' : '') + '" data-e="' + e + '">' + e + '</button>'; }).join('');
      q('#mb-color').innerHTML = C.MEMBER_COLORS.map(function (c) { return '<button class="chip swatch' + (f.color === c ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join('');
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
      if (!name) { X.toast('Every pirate needs a name.', 'bad'); q('#mb-name').focus(); return; }
      var rec = { id: old ? old.id : C.newId('m'), name: name, emoji: f.emoji, color: f.color, leader: { name: q('#mb-leader').value.trim() || 'Kaido', colors: f.leader.colors, set: q('#mb-set').value.trim() }, deck: q('#mb-deck').value.trim() };
      var first = !C.members(U.book).length;
      C.put(U.book, 'members', rec);
      if (isMe) U.local.me = rec.id; else if (U.local.me === rec.id) U.local.me = '';
      U.saveLocal();
      U.close();
      if (first) U.tab = 'home';
      U.save();
      X.toast(old ? 'Saved' : first ? '¡Bienvenido a bordo, ' + name + '! Now add your crew.' : name + ' joined the crew ⚡', 'good');
    };
    var del = q('[data-del]');
    if (del) del.onclick = function () {
      var n = C.games(U.book, old.id, null).length;
      U.confirm('Remove ' + old.name + '?', n ? 'Their ' + n + ' rounds leave the rankings too (on every phone of the crew).' : 'They have no rounds yet.', 'Remove', function () {
        C.remove(U.book, 'members', old.id);
        if (U.local.me === old.id) { U.local.me = ''; U.saveLocal(); }
        U.close(); U.save();
      }, true);
    };
    if (!old) setTimeout(function () { try { q('#mb-name').focus(); } catch (e) { /* ok */ } }, 300);
  };
  U.acts.mergeDupes = function (el) {
    var ids = el.getAttribute('data-ids').split(','), keep = ids[0];
    U.confirm('Merge into one pirate?', 'All their rounds and reactions end up on one profile.', 'Merge', function () {
      ids.slice(1).forEach(function (d) { C.mergeMembers(U.book, keep, d); if (U.local.me === d) U.local.me = keep; });
      U.saveLocal(); U.save(); X.toast('Merged', 'good');
    });
  };

  /* ---------- online crew ---------- */
  U.acts.createCrew = function () { U.crewSheet('create'); };
  U.acts.joinCrew = function () { U.crewSheet('join'); };
  U.crewSheet = function (mode, name) {
    var html = U.head(mode === 'create' ? 'Create crew' : 'Join crew') +
      '<div class="seg full" style="margin-bottom:6px"><button class="' + (mode === 'create' ? 'on' : '') + '" data-mode="create">Create</button><button class="' + (mode === 'join' ? 'on' : '') + '" data-mode="join">Join</button></div>' +
      '<p class="small muted">' + (mode === 'create'
        ? 'Choose a crew name and a password, then tell your friends both (in person or in your group chat). This phone\'s pirates and rounds go online with it.'
        : 'Type the crew name and password your friend gave you. Whatever is on this phone is merged in: nothing is lost.') + '</p>' +
      '<div class="field"><label for="cr-name">Crew name</label><input class="inp" id="cr-name" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="kaidoneta_bristol" value="' + esc(name || '') + '"></div>' +
      '<div class="field"><label for="cr-pass">Crew password</label><input class="inp" id="cr-pass" type="password" autocomplete="off" minlength="6" placeholder="At least 6 characters"></div>' +
      '<label class="row small muted" style="gap:8px"><input type="checkbox" id="cr-show"> Show password</label>' +
      '<div id="cr-err"></div>' +
      '<div class="save-bar"><button class="btn primary" data-go>' + (mode === 'create' ? '🏴‍☠️ Create crew' : '☁️ Join crew') + '</button></div>';
    var sh = U.topSheet() && U.topSheet().querySelector('#cr-name') ? U.swap(html) : U.sheet(html);
    var q = function (s) { return sh.querySelector(s); };
    Array.prototype.forEach.call(sh.querySelectorAll('[data-mode]'), function (b) { b.onclick = function () { U.crewSheet(b.getAttribute('data-mode'), q('#cr-name').value); }; });
    q('#cr-show').onchange = function () { q('#cr-pass').type = this.checked ? 'text' : 'password'; };
    q('[data-go]').onclick = function () {
      var btn = this, crew = q('#cr-name').value, pass = q('#cr-pass').value;
      btn.disabled = true; btn.textContent = 'Connecting…';
      q('#cr-err').innerHTML = '';
      (mode === 'create' ? cloud.create(crew, pass) : cloud.join(crew, pass)).then(function (c) {
        U.close();
        U.startCloud();
        U.render();
        X.toast((mode === 'create' ? 'Crew ' : 'Joined ') + c + ' ⚡ Everything syncs now.', 'good');
        if (!U.me() && C.members(U.book).length) setTimeout(U.whoSheet, 400);
        else if (!C.members(U.book).length) setTimeout(function () { U.memberSheet(null, { me: true }); }, 400);
      }, function (e) {
        btn.disabled = false; btn.textContent = mode === 'create' ? '🏴‍☠️ Create crew' : '☁️ Join crew';
        q('#cr-err').innerHTML = '<div class="warn-box">' + esc(e.message) + '</div>';
      });
    };
  };
  U.acts.syncNow = function () {
    cloud.sync().then(function (took) { X.toast(took ? 'Synced: news from the crew ⚡' : 'Synced', 'good'); U.render(); }, function (e) { X.toast(e.message, 'bad'); U.render(); });
  };
  U.acts.invite = function () {
    var url = root.location.origin + root.location.pathname + '#join=' + encodeURIComponent(cloud.crew());
    var text = 'Join our Kaidoneta crew "' + cloud.crew() + '" for the Bristol Regional ⚡ Open this link, then type the crew password I give you.';
    share(text, url);
  };
  U.acts.leaveCrew = function () {
    U.confirm('Leave the crew on this phone?', 'This phone stops syncing. Everything stays on this phone and online for the others.', 'Leave', function () { cloud.leave(); U.render(); });
  };

  /* ---------- links ---------- */
  function share(text, url) {
    var nav = root.navigator;
    if (nav.share) { nav.share({ title: 'Kaidoneta', text: text, url: url }).then(null, function () { /* cancelled */ }); return; }
    var sh = U.sheet(U.head('Copy and send') + '<p class="small muted">' + esc(text) + '</p><textarea class="inp" readonly style="min-height:120px">' + esc(url) + '</textarea><button class="btn primary block" style="margin-top:10px" data-copy>Copy link</button>');
    sh.querySelector('[data-copy]').onclick = function () {
      var t = sh.querySelector('textarea'); t.select();
      (nav.clipboard ? nav.clipboard.writeText(url) : Promise.reject()).then(function () { X.toast('Copied', 'good'); }, function () { try { doc.execCommand('copy'); X.toast('Copied', 'good'); } catch (e) { X.toast('Select the text and copy it.'); } });
    };
  }
  U.acts.sendLink = function () {
    C.pack(U.book).then(function (code) {
      var url = root.location.origin + root.location.pathname + '#crew=' + code, n = C.count(U.book);
      share('Kaidoneta crew: ' + n.members + ' pirates, ' + n.matches + ' rounds. Open it to merge into your app ⚡', url);
    });
  };
  U.importSheet = function () {
    var sh = U.sheet(U.head('Open a crew link') + '<p class="small muted">Paste the link (or code) a friend sent. It is merged with this phone: newest edits win, nothing is lost.</p><textarea class="inp" id="im-code" placeholder="https://…#crew=…"></textarea><div id="im-err"></div><div class="save-bar"><button class="btn primary" data-go>Merge</button></div>');
    sh.querySelector('[data-go]').onclick = function () {
      C.unpack(sh.querySelector('#im-code').value).then(function (b) { U.close(); setTimeout(function () { confirmMerge(b); }, 80); }, function (e) {
        sh.querySelector('#im-err').innerHTML = '<div class="warn-box">' + esc(e.message || 'That link did not open.') + '</div>';
      });
    };
  };
  function confirmMerge(b) {
    var n = C.count(b);
    U.confirm('Merge this crew?', n.members + ' pirates · ' + n.matches + ' rounds · ' + n.events + ' events. Newest edits win; nothing on this phone is lost.', 'Merge', function () {
      U.book = C.ensureBristol(C.merge(U.book, b));
      U.save();
      X.toast('Merged ⚡', 'good');
      if (!U.me() && C.members(U.book).length) setTimeout(U.whoSheet, 300);
    });
  }
  U.openLink = function (hash) {
    try { root.history.replaceState(null, '', root.location.pathname + '#/home'); } catch (e) { /* file:// */ }
    C.unpack(hash).then(confirmMerge, function (e) { X.toast(e.message || 'That link did not open.', 'bad'); });
  };

  /* ---------- settings ---------- */
  U.acts.toggle = function (el) { var k = el.getAttribute('data-k'); U.local[k] = !U.local[k]; U.saveLocal(); U.render(); if (k === 'buzz') X.buzz(40); };
  U.acts.kaidoStyle = function () {
    var v = A.kaidoVariants || {}, cur = U.kaidoId() || 'dragon';
    var opts = U.KAIDO_ORDER.filter(function (id) { return v[id]; }).map(function (id) { return { id: id, name: v[id].name, art: v[id].svg({ still: true }) }; });
    opts.push({ id: 'dragon', name: 'The dragon', art: A.dragon() });
    var sh = U.sheet(U.head('Kaido style') + '<p class="small muted" style="margin-top:0">Who watches over the home screen.</p><div class="styles">' +
      opts.map(function (o) { return '<button class="style-card' + (o.id === cur ? ' on' : '') + '" data-style="' + o.id + '"><span class="style-art">' + o.art + '</span><b>' + esc(o.name) + '</b></button>'; }).join('') + '</div>');
    Array.prototype.forEach.call(sh.querySelectorAll('[data-style]'), function (b) {
      b.onclick = function () { U.local.kaido = b.getAttribute('data-style'); U.saveLocal(); U.close(); U.go('home'); };
    });
  };
  U.acts.install = function () {
    U.sheet(U.head('📲 Add to Home Screen') +
      '<div class="card"><b>iPhone (Safari)</b><div class="small muted">Tap <b>Share</b> (the square with the arrow) → <b>Add to Home Screen</b> → Add.</div></div>' +
      '<div class="card"><b>Android (Chrome)</b><div class="small muted">Tap <b>⋮</b> → <b>Add to Home screen</b> (or <b>Install app</b>).</div></div>' +
      '<p class="small muted">It then opens full screen and works with no signal. Rounds sync to the online crew when the phone is back online.</p>');
  };
  U.acts.wipe = function () {
    U.confirm('Erase this phone?', 'Pirates, rounds and settings are removed from this phone. If the crew is online, the others keep everything and you can join again.', 'Erase', function () {
      ['kaidoneta.book', 'kaidoneta.local', 'kaidoneta.hero'].forEach(function (k) { try { root.localStorage.removeItem(k); } catch (e) { /* ok */ } });
      cloud.leave();
      root.location.hash = '';
      root.location.reload();
    }, true);
  };
})(window);
