/* Kaidoneta: one pirate's sheet (wanted poster, stats, matchups, badges, rounds) and the poster image to share. */
(function (root) {
  'use strict';
  var K = root.K, C = K.core, U = K.ui, X = K.fx, A = K.art;
  var esc = U.esc;

  function stat(v, label) { return '<div class="stat"><b>' + v + '</b><span>' + label + '</span></div>'; }
  // result letters in Spanish: Victoria / Derrota / Empate
  function letter(r) { return { W: 'V', L: 'D', D: 'E' }[r] || r; }
  function wl(x) { var n = x.w + x.l + x.d; return n ? U.recText(x) + ' <span class="dim">· ' + U.pct(x.w / n) + '</span>' : '<span class="dim">—</span>'; }

  U.playerSheet = function (id, keepOpen) {
    var m = U.member(id);
    if (!m) return;
    var book = U.book, ev = U.ev(), all = U.local.scope === 'all';
    var games = C.games(book, id, all ? null : ev.id), allGames = C.games(book, id, null);
    var row = C.board(book, all ? null : ev.id).filter(function (r) { return r.mem.id === id; })[0];
    var rec = row.rec, st = row.streak, b = row.bounty, rk = C.rankOf(C.bounty(allGames));
    var nem = C.nemesis(games), prey = C.prey(games), mu = C.matchups(games);
    var poster = U.poster(row, true).replace('<button class="poster top"', '<div class="poster top" style="margin-top:22px"').replace(/<\/button>$/, '</div>').replace(/ data-act="player" data-id="[^"]*"/, '');
    var html = U.head(esc(m.name), '<button class="btn sm" data-edit>Editar</button>') +
      '<div class="seg full" style="margin-bottom:16px"><button class="' + (!all ? 'on' : '') + '" data-scope="event">' + esc(ev.name) + '</button><button class="' + (all ? 'on' : '') + '" data-scope="all">Histórico</button></div>' +
      poster +
      '<div class="row" style="margin-top:16px"><button class="btn gold grow" data-share>📸 Compartir</button><button class="btn primary grow" data-log>' + A.bolt() + ' Registrar</button></div>' +
      '<div class="small muted" style="margin-top:12px;text-align:center;overflow-wrap:anywhere">Juega con ' + U.lchip(m.leader) + (m.deck ? ' · “' + esc(m.deck) + '”' : '') + '</div>' +
      '<h2 class="sec">📈 Balance</h2><div class="stat-grid">' +
        stat(U.recText(rec), 'Balance') + stat(rec.pts, 'Puntos') + stat(rec.n ? U.pct(rec.rate) : '—', '% victorias') +
        stat(st.len ? letter(st.cur) + st.len : '—', 'Racha') + stat(st.bestW || '—', 'Mejor racha') + stat('฿' + U.short(b), 'Recompensa') +
      '</div>' +
      '<div class="duo" style="margin-top:8px"><div class="card"><div class="lab">Yendo primero</div>' + wl(rec.first) + '</div><div class="card"><div class="lab">Yendo segundo</div>' + wl(rec.second) + '</div></div>' +
      '<h2 class="sec">' + rk.rank.icon + ' ' + rk.rank.name + '</h2><div class="card"><div class="progress"><i style="width:' + Math.round(rk.progress * 100) + '%"></i></div>' +
        '<div class="small muted" style="margin-top:8px">' + (rk.next ? 'Te faltan ฿' + U.berries(rk.next.min - C.bounty(allGames)) + ' para ' + rk.next.icon + ' ' + rk.next.name + ' (recompensa total)' : 'Emperador de la tripulación. Kaido estaría orgulloso.') + '</div></div>';
    if (nem || prey) {
      html += '<div class="duo" style="margin-top:12px"><div class="card"><div class="lab">😤 Némesis</div>' + (nem ? U.lchip(nem.leader) + '<div class="small muted">' + U.recText(nem) + '</div>' : '<span class="dim">Nadie todavía</span>') + '</div>' +
        '<div class="card"><div class="lab">🍖 Presa favorita</div>' + (prey ? U.lchip(prey.leader) + '<div class="small muted">' + U.recText(prey) + '</div>' : '<span class="dim">Nadie todavía</span>') + '</div></div>';
    }
    if (mu.length) {
      html += '<h2 class="sec">⚔️ Enfrentamientos</h2><div class="card">' + mu.map(function (x) {
        return '<div class="lead-row"><span style="min-width:0">' + U.lchip(x.leader) + '</span><span class="small"><span style="color:var(--gold)">' + x.w + 'V</span> <span style="color:#fb7185">' + x.l + 'D</span>' + (x.d ? ' ' + x.d + 'E' : '') + '</span></div>';
      }).join('') + '</div>';
    }
    var badges = C.badges(allGames);
    html += '<h2 class="sec">🏅 Insignias <span class="more" style="color:var(--dim)">' + badges.filter(function (x) { return x.got; }).length + '/' + badges.length + '</span></h2><div class="badges">' +
      badges.map(function (x) { return '<div class="badge' + (x.got ? ' got' : '') + (x.badge.shame ? ' shame' : '') + '" title="' + esc(x.badge.desc) + '"><span class="bi">' + x.badge.icon + '</span>' + esc(x.badge.name) + '</div>'; }).join('') +
      '</div><div class="small dim" style="margin-top:8px">Toca una insignia para ver cómo se consigue.</div>';
    html += '<h2 class="sec">🗒️ Rondas</h2><div class="card">' + (games.length ? games.slice().reverse().map(function (g) {
      var opp = g.oppMem ? '🗡️ ' + esc((U.member(g.oppMem) || {}).name || 'Compañero') : U.lchip(g.opp);
      return '<button class="hist-row" style="width:100%;text-align:left" data-edit-match="' + g.m.id + '"><span class="rd">' + U.roundLabel(g.m) + '</span><span class="res ' + g.res + '">' + letter(g.res) + '</span><span class="grow ellip">' + opp + '</span><span class="small dim">' + (g.first === true ? '1º' : g.first === false ? '2º' : '') + '</span><span class="dim">' + (g.mirror ? '' : '✎') + '</span></button>';
    }).join('') : '<div class="empty small">Aún no hay rondas' + (all ? '' : ' en este evento') + '.</div>') + '</div>';

    var sh = keepOpen ? U.swap(html) : U.sheet(html, { tall: true });
    Array.prototype.forEach.call(sh.querySelectorAll('[data-scope]'), function (b) {
      b.onclick = function () { U.local.scope = b.getAttribute('data-scope'); U.saveLocal(); U.playerSheet(id, true); U.render(); };
    });
    sh.querySelector('[data-edit]').onclick = function () { U.close(); setTimeout(function () { U.memberSheet(id); }, 80); };
    sh.querySelector('[data-log]').onclick = function () { U.close(); setTimeout(function () { U.logSheet(null, id); }, 80); };
    sh.querySelector('[data-share]').onclick = function () { U.sharePoster(id); };
    Array.prototype.forEach.call(sh.querySelectorAll('[data-edit-match]'), function (b) {
      b.onclick = function () {
        var mt = C.get(U.book, 'matches', b.getAttribute('data-edit-match'));
        if (!mt) return;
        U.close(); setTimeout(function () { U.logSheet(mt.id); }, 80);
      };
    });
    Array.prototype.forEach.call(sh.querySelectorAll('.badge'), function (b) {
      b.onclick = function () { X.toast(b.textContent.trim() + ': ' + b.getAttribute('title')); };
    });
  };

  /* ---------- the poster image ---------- */
  function svgImage(svg) {
    if (!/xmlns=/.test(svg)) svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { res(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  function picImage(url) {
    return new Promise(function (res) { var img = new Image(); img.onload = function () { res(img); }; img.onerror = function () { res(null); }; img.src = url; });
  }
  function center(g, text, x, y, font, color, spacing) {
    g.font = font; g.fillStyle = color; g.textAlign = 'center';
    if (spacing && 'letterSpacing' in g) g.letterSpacing = spacing + 'px';
    g.fillText(text, x, y);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
  }
  // shrink the font until the text fits in max px (Spanish words run longer than the English ones)
  function fit(g, text, weight, size, family, max, min, spacing) {
    g.font = weight + ' ' + size + 'px ' + family;
    while (g.measureText(text).width + (spacing || 0) * text.length > max && size > min) { size -= 2; g.font = weight + ' ' + size + 'px ' + family; }
    return weight + ' ' + size + 'px ' + family;
  }
  var DISPLAY = '"Avenir Next Condensed", "Futura", Impact, "Roboto Condensed", "Arial Narrow", sans-serif';
  var SERIF = 'Rockwell, Georgia, "Noto Serif", serif';

  U.posterImage = function (id) {
    var m = U.member(id), ev = U.ev(), all = U.local.scope === 'all';
    var row = C.board(U.book, all ? null : ev.id).filter(function (r) { return r.mem.id === id; })[0];
    var allGames = C.games(U.book, id, null);
    var badges = C.badges(allGames).filter(function (x) { return x.got; });
    var rk = C.rankOf(row.bounty).rank;
    var W = 1080, H = 1350, cv = root.document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2c1257'); bg.addColorStop(.55, '#170a2c'); bg.addColorStop(1, '#0b0614');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var glow = g.createRadialGradient(820, 380, 40, 820, 380, 620);
    glow.addColorStop(0, 'rgba(168,85,247,.55)'); glow.addColorStop(1, 'rgba(168,85,247,0)');
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    var kid = U.kaidoId(), art = svgImage(kid ? U.kaidoArt({ still: true }) : A.dragon());
    return Promise.all([art, svgImage(A.horns()), picImage('icons/badge.jpg')]).then(function (imgs) {
      if (imgs[0]) {
        // the picture fills the right side, cropped like "cover", fading into the purple on the left
        var im = imgs[0], bw = 640, bh = 980, bx = 460, by = 80, iw = im.naturalWidth || im.width || bw, ih = im.naturalHeight || im.height || bh;
        var sc = kid ? Math.max(bw / iw, bh / ih) : Math.min(bw / iw, bh / ih), dw = iw * sc, dh = ih * sc;
        g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
        g.globalAlpha = .92; g.drawImage(im, bx + (bw - dw) / 2, by + (kid ? 0 : (bh - dh) / 2), dw, dh);
        g.globalAlpha = 1;
        var fade = g.createLinearGradient(bx, 0, bx + 260, 0); fade.addColorStop(0, '#170a2c'); fade.addColorStop(1, 'rgba(23,10,44,0)');
        g.fillStyle = fade; g.fillRect(bx, by, 260, bh);
        var fade2 = g.createLinearGradient(0, by + bh - 260, 0, by + bh); fade2.addColorStop(0, 'rgba(11,6,20,0)'); fade2.addColorStop(1, '#0b0614');
        g.fillStyle = fade2; g.fillRect(bx, by + bh - 260, bw, 260);
        g.restore();
      }
      // lightning
      g.save(); g.strokeStyle = '#fde68a'; g.lineWidth = 5; g.shadowColor = '#fbbf24'; g.shadowBlur = 24; g.lineJoin = 'round';
      [[60, 0, 180, 300], [1040, 860, 930, 1180]].forEach(function (L, k) {
        var p = new Path2D(K.art.boltPath(L[0], L[1], L[2], L[3], 17 + k * 9, 30)); g.stroke(p);
      });
      g.restore();
      // the parchment
      g.save(); g.translate(400, 660); g.rotate(-0.025); g.translate(-400, -660);
      g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
      var pg = g.createLinearGradient(0, 110, 0, 1200); pg.addColorStop(0, '#f6e7c6'); pg.addColorStop(1, '#e2c792');
      g.fillStyle = pg; g.fillRect(80, 100, 640, 1110);
      g.shadowColor = 'transparent';
      g.strokeStyle = '#2e1065'; g.lineWidth = 8; g.strokeRect(80, 100, 640, 1110);
      g.strokeStyle = 'rgba(59,29,15,.35)'; g.lineWidth = 2; g.strokeRect(100, 120, 600, 1070);
      center(g, 'SE BUSCA', 400, 245, fit(g, 'SE BUSCA', '900', 128, SERIF, 560, 64, 8), '#2a1206', 8);
      var pic = g.createRadialGradient(400, 450, 30, 400, 480, 300);
      pic.addColorStop(0, '#fff'); pic.addColorStop(.25, m.color); pic.addColorStop(1, '#1d0b36');
      g.fillStyle = pic; g.fillRect(140, 285, 520, 400);
      g.strokeStyle = '#3b1d0f'; g.lineWidth = 6; g.strokeRect(140, 285, 520, 400);
      if (imgs[1]) g.drawImage(imgs[1], 175, 292, 450, 270);
      center(g, m.emoji, 400, 600, '230px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif', '#000');
      center(g, 'VIVO O MUERTO', 400, 745, fit(g, 'VIVO O MUERTO', '900', 40, SERIF, 560, 24, 10), '#2a1206', 10);
      var name = m.name.toUpperCase(), size = 104;
      g.font = '900 ' + size + 'px ' + DISPLAY;
      while (g.measureText(name).width > 560 && size > 50) { size -= 4; g.font = '900 ' + size + 'px ' + DISPLAY; }
      center(g, name, 400, 850, '900 ' + size + 'px ' + DISPLAY, '#2a1206', 2);
      center(g, '฿ ' + U.berries(row.bounty) + '-', 400, 945, '900 66px ' + SERIF, '#2a1206');
      var line = U.recText(row.rec) + '  ·  ' + row.rec.pts + ' pts  ·  #' + row.pos + ' de la tripulación';
      center(g, line, 400, 1012, fit(g, line, '800', 34, DISPLAY, 560, 22), '#5b2a1a');
      g.fillStyle = '#2e1065'; var pw = 330; g.beginPath(); g.roundRect ? g.roundRect(400 - pw / 2, 1040, pw, 64, 32) : g.rect(400 - pw / 2, 1040, pw, 64); g.fill();
      center(g, rk.icon + ' ' + rk.name.toUpperCase(), 400, 1084, '900 34px ' + DISPLAY, '#ede9fe', 3);
      center(g, 'KAIDONETA', 400, 1170, '900 30px ' + SERIF, '#6d28d9', 16);
      g.restore();
      // badges and footer
      if (badges.length) {
        center(g, badges.slice(0, 9).map(function (x) { return x.badge.icon; }).join(' '), 540, 1262, '54px "Apple Color Emoji", "Noto Color Emoji", sans-serif', '#fff');
      }
      center(g, (m.leader.name || 'Kaido') + (m.leader.set ? ' ' + m.leader.set : '') + '  ·  ' + (all ? 'Histórico' : ev.name + ' ' + ev.date.slice(0, 4)), 540, 1320, '800 32px ' + DISPLAY, '#c4b5fd', 2);
      if (imgs[2]) { g.save(); g.beginPath(); g.arc(960, 1230, 86, 0, Math.PI * 2); g.clip(); g.drawImage(imgs[2], 874, 1144, 172, 172); g.restore(); }
      return new Promise(function (res) { cv.toBlob(function (b) { res({ blob: b, url: cv.toDataURL('image/png') }); }, 'image/png'); });
    });
  };

  U.sharePoster = function (id) {
    var m = U.member(id);
    X.toast('Pintando el cartel…');
    U.posterImage(id).then(function (out) {
      var file = out.blob ? new File([out.blob], 'se-busca-' + m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png', { type: 'image/png' }) : null;
      var sh = U.sheet(U.head('Cartel de SE BUSCA') + '<img src="' + out.url + '" alt="Cartel de SE BUSCA de ' + esc(m.name) + '" style="width:100%;border-radius:14px;border:1px solid var(--line2)">' +
        '<div class="small muted" style="margin:10px 0">En iPhone también puedes mantener pulsada la imagen para guardarla.</div>' +
        '<div class="row"><button class="btn gold grow" data-go>📤 Compartir</button><a class="btn grow" download="' + (file ? file.name : 'se-busca.png') + '" href="' + out.url + '">⬇️ Descargar</a></div>');
      sh.querySelector('[data-go]').onclick = function () {
        var nav = root.navigator;
        if (file && nav.canShare && nav.canShare({ files: [file] })) {
          nav.share({ files: [file], title: 'SE BUSCA: ' + m.name, text: m.name + ' · Kaidoneta ⚡' }).then(null, function () { /* cancelled */ });
        } else {
          X.toast('Aquí no se pueden compartir imágenes: usa Descargar.');
        }
      };
    }, function () { X.toast('No se ha podido pintar el cartel en este móvil.', 'bad'); });
  };
})(window);
