/* Kaidoneta: log (or edit) a round in a few taps. Then lightning, a bounty that grows, and new badges. */
(function (root) {
  'use strict';
  var K = root.K, C = K.core, U = K.ui, X = K.fx;
  var esc = U.esc;

  function facedLeaders(evId) {
    var seen = {}, out = [];
    C.live(U.book, 'matches').filter(function (m) { return m.ev === evId && !m.oppMem && m.opp && m.opp.name; })
      .sort(function (a, b) { return (b.t || b.at) - (a.t || a.at); })
      .forEach(function (m) { var k = C.leaderKey(m.opp); if (!seen[k]) { seen[k] = 1; out.push(m.opp); } });
    return out;
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function nameOf(id) { var m = U.member(id); return m ? m.name : '?'; }
  function slotLabel(key) { return key.charAt(0) === 'T' ? key.slice(1) : key; }
  // A round as the given pirate saw it: "ganó a Enel" / "perdió contra Javi", and who logged it.
  function said(m, memId) {
    var mine = m.mem === memId, res = mine ? m.res : m.res === 'W' ? 'L' : m.res === 'L' ? 'W' : 'D';
    var opp = mine ? (m.oppMem ? nameOf(m.oppMem) : (m.opp && m.opp.name) || 'Desconocido') : nameOf(m.mem);
    var by = m.by || m.mem;
    return (res === 'W' ? 'ganó a ' : res === 'L' ? 'perdió contra ' : 'empató con ') + opp + (by !== memId && U.member(by) ? ' (lo registró ' + nameOf(by) + ')' : '');
  }
  // Swiss never pairs the same two pirates twice: an earlier Swiss round between them in this event.
  function pairedBefore(evId, a, b, key, exceptId) {
    return C.live(U.book, 'matches').filter(function (m) {
      return m.id !== exceptId && m.ev === evId && !m.top && C.slot(m) !== key && U.member(m.mem) &&
        ((m.mem === a && m.oppMem === b) || (m.mem === b && m.oppMem === a));
    })[0] || null;
  }
  function taken(memId, evId, key, exceptId) {
    if (C.slotTaken) return C.slotTaken(U.book, memId, evId, key, exceptId);
    return C.live(U.book, 'matches').filter(function (m) {
      return m.id !== exceptId && m.ev === evId && C.slot(m) === key && (m.mem === memId || m.oppMem === memId) && U.member(m.mem);
    })[0] || null;
  }

  U.logSheet = function (matchId, memId) {
    var members = C.members(U.book);
    if (!members.length) { U.memberSheet(null, { me: true }); return; }
    var old = matchId ? C.get(U.book, 'matches', matchId) : null;
    if (matchId && !old) { X.toast('Esa ronda ya se ha borrado.'); return; }
    var evId = old ? old.ev : U.ev().id, ev = C.get(U.book, 'events', evId);
    var me = U.me();
    // a friendly-fire round whose crewmate has since been removed is edited as a round against their leader
    var lostMate = !!(old && old.oppMem && !U.member(old.oppMem));
    var f = old ? {
      mem: U.member(old.mem) ? old.mem : '', round: old.round || 1, top: old.top, kind: old.oppMem && !lostMate ? 'crew' : 'leader', colors: old.opp.colors.slice(),
      oppMem: lostMate ? '' : old.oppMem, res: old.res, first: old.first, bo: old.bo, score: old.score,
    } : {
      // with no "me" on this phone nobody is preselected: a careless tap must not credit the first pirate on the list
      mem: memId && U.member(memId) ? memId : me ? me.id : '', round: 1, top: '', kind: 'leader', colors: [], oppMem: '', res: '', first: null, bo: 1, score: '',
    };
    if (!old && f.mem) f.round = C.nextRound(U.book, f.mem, evId);
    var asLeader = old && (!old.oppMem || lostMate);
    var faced = facedLeaders(evId);

    // the event goes under the title: "Registrar ronda" next to "Regional de Bristol" does not fit on a phone
    var html = U.head((old ? 'Editar ronda' : 'Registrar ronda') + '<span class="ellip" style="display:block;margin-top:4px;font:600 13px var(--body);letter-spacing:0;text-transform:none;color:var(--muted)">' + esc(ev ? ev.name : '') + '</span>') +
      '<div class="field"><span class="lab">¿Quién ha jugado?</span><div class="chips" id="lg-mem"></div></div>' +
      '<div class="field"><span class="lab">Ronda</span><div id="lg-round"></div></div>' +
      '<div class="field"><span class="lab">Contra</span><div id="lg-kind" style="margin-bottom:12px"></div>' +
        '<div id="lg-leader">' +
          '<div class="chips" id="lg-colors" aria-label="Colores del líder"></div>' +
          '<input class="inp" id="lg-name" list="lg-dl" maxlength="40" autocomplete="off" placeholder="Líder (p. ej. Enel, Luffy, Lucci…)" style="margin-top:10px" value="' + esc(asLeader ? old.opp.name : '') + '">' +
          '<datalist id="lg-dl">' + faced.map(function (l) { return l.name; }).concat(C.LEADERS).filter(function (n, i, a) { return a.indexOf(n) === i; }).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
          (faced.length ? '<div class="small dim" style="margin-top:10px">Enfrentados aquí</div><div class="suggest" id="lg-quick">' + faced.slice(0, 10).map(function (l, i) { return '<button class="chip" data-g="quick" data-v="' + i + '">' + U.lchip(l) + '</button>'; }).join('') + '</div>' : '') +
        '</div>' +
        '<div id="lg-crew" class="chips"></div>' +
      '</div>' +
      '<div class="field"><span class="lab">Resultado</span><div class="result-btns" id="lg-res"></div></div>' +
      '<div class="field"><span class="lab">Turno</span><div id="lg-first"></div></div>' +
      '<details class="more"' + (old && (old.bo === 3 || old.mvp || old.notes || old.oppName || old.opp.set) ? ' open' : '') + '><summary>Más: rival, Bo3, carta MVP, notas</summary>' +
        '<div class="row"><div class="field grow"><label for="lg-oppname">Nombre del rival</label><input class="inp" id="lg-oppname" maxlength="30" value="' + esc(old ? old.oppName : '') + '" placeholder="Opcional"></div>' +
        '<div class="field" style="width:30%"><label for="lg-set">Set</label><input class="inp" id="lg-set" maxlength="12" value="' + esc(asLeader ? old.opp.set : '') + '" placeholder="OP17"></div></div>' +
        '<div class="field"><span class="lab">Formato</span><div id="lg-bo"></div></div>' +
        '<div class="field"><label for="lg-mvp">Carta MVP</label><input class="inp" id="lg-mvp" maxlength="40" value="' + esc(old ? old.mvp : '') + '" placeholder="La carta que te dio la partida"></div>' +
        '<div class="field"><label for="lg-notes">Notas</label><textarea class="inp" id="lg-notes" maxlength="300" placeholder="¿Qué ha pasado? Fallos, top-decks, mosqueos…">' + esc(old ? old.notes : '') + '</textarea></div>' +
      '</details>' +
      '<div id="lg-warn"></div>' +
      '<div class="save-bar">' + (old ? '<button class="btn danger" data-del>Borrar</button>' : '') + '<button class="btn primary" data-save>' + K.art.bolt() + (old ? ' Guardar' : ' Registrar') + '</button></div>';
    var sh = U.sheet(html, { tall: true });
    var q = function (s) { return sh.querySelector(s); };

    if (lostMate) setTimeout(function () { X.toast('Ese compañero ya no está en la tripulación: la ronda queda contra su líder.'); }, 300);
    function chip(g, v, label, on, cls) { return '<button class="chip ' + (cls || '') + (on ? ' on' : '') + '" data-g="' + g + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '">' + label + '</button>'; }
    function paint() {
      q('#lg-mem').innerHTML = C.members(U.book).map(function (m) { return chip('mem', m.id, U.av(m) + esc(m.name), f.mem === m.id, 'av-chip'); }).join('');
      q('#lg-round').innerHTML = '<div class="row wrap" style="gap:12px">' +
        '<div class="stepper"' + (f.top ? ' style="opacity:.35"' : '') + '><button data-g="step" data-v="-1" aria-label="Ronda anterior">−</button><span class="num">R' + f.round + '</span><button data-g="step" data-v="1" aria-label="Ronda siguiente">＋</button></div>' +
        '<div class="chips">' + chip('top', '', 'Suizo', !f.top) + '</div></div>' +
        '<div class="chips" style="margin-top:10px">' + C.STAGES.map(function (s) { return chip('top', s, s, f.top === s); }).join('') + '</div>';
      q('#lg-kind').innerHTML = '<div class="seg full">' +
        '<button class="' + (f.kind === 'leader' ? 'on' : '') + '" data-g="kind" data-v="leader">Rival</button>' +
        '<button class="' + (f.kind === 'crew' ? 'on' : '') + '" data-g="kind" data-v="crew"' + (C.members(U.book).length < 2 ? ' disabled' : '') + '>🗡️ Compañero</button></div>';
      q('#lg-leader').hidden = f.kind !== 'leader';
      q('#lg-crew').hidden = f.kind !== 'crew';
      q('#lg-colors').innerHTML = C.COLORS.map(function (c) {
        return '<button class="chip color' + (f.colors.indexOf(c.id) >= 0 ? ' on' : '') + '" data-g="color" data-v="' + c.id + '" aria-label="' + c.name + '" aria-pressed="' + (f.colors.indexOf(c.id) >= 0) + '" style="background:' + c.hex + '"></button>';
      }).join('');
      q('#lg-crew').innerHTML = C.members(U.book).filter(function (m) { return m.id !== f.mem; }).map(function (m) { return chip('oppMem', m.id, U.av(m) + esc(m.name), f.oppMem === m.id, 'av-chip'); }).join('') ||
        '<span class="muted small">Primero añade más piratas a la tripulación.</span>';
      // Spanish result words are longer than WIN/LOSS/DRAW: the font scales with the screen so all three fit
      q('#lg-res').innerHTML =
        '<button class="rbtn W' + (f.res === 'W' ? ' on' : '') + '" style="font-size:clamp(14px,4.6vw,24px)" data-g="res" data-v="W">VICTORIA<small>¡Toma ya!</small></button>' +
        '<button class="rbtn L' + (f.res === 'L' ? ' on' : '') + '" style="font-size:clamp(14px,4.6vw,24px)" data-g="res" data-v="L">DERROTA<small>Qué palo</small></button>' +
        '<button class="rbtn D' + (f.res === 'D' ? ' on' : '') + '" style="font-size:clamp(14px,4.6vw,24px)" data-g="res" data-v="D">EMPATE<small>Tiempo</small></button>';
      q('#lg-first').innerHTML = '<div class="seg full">' +
        '<button class="' + (f.first === true ? 'on' : '') + '" data-g="first" data-v="1">Fui 1º</button>' +
        '<button class="' + (f.first === false ? 'on' : '') + '" data-g="first" data-v="0">Fui 2º</button>' +
        '<button class="' + (f.first === null ? 'on' : '') + '" data-g="first" data-v="">No sé</button></div>';
      q('#lg-bo').innerHTML = '<div class="seg"><button class="' + (f.bo === 1 ? 'on' : '') + '" data-g="bo" data-v="1">Bo1</button><button class="' + (f.bo === 3 ? 'on' : '') + '" data-g="bo" data-v="3">Bo3</button></div>' +
        (f.bo === 3 ? '<div class="chips" style="margin-top:10px">' + ['2-0', '2-1', '1-2', '0-2', '1-1', '1-0', '0-1'].map(function (s) { return chip('score', s, s, f.score === s); }).join('') + '</div>' : '');
      var w = clashes();
      q('#lg-warn').innerHTML = w.length ? '<div class="warn-box">' + w.map(function (x) { return '⚠️ ' + esc(x); }).join('<br>') + '</div>' : '';
    }
    // Rounds this one would repeat: the pirate (or, against a crewmate, the crewmate) already has this round, or the
    // two crewmates already met in the Swiss. Only a warning: two people can log the same game on bad signal.
    function clashes() {
      var out = [], key = f.top ? 'T' + f.top : 'R' + f.round, except = old ? old.id : '', seen = {};
      var who = [f.mem].concat(f.kind === 'crew' && f.oppMem ? [f.oppMem] : []);
      who.forEach(function (id) {
        if (!id || !U.member(id)) return;
        var t = taken(id, evId, key, except);
        if (!t || seen[t.id]) return;
        seen[t.id] = 1;
        out.push(nameOf(id) + ' ya tiene una partida en ' + slotLabel(key) + ': ' + said(t, id) + '. Si es la misma, no la registres otra vez.');
      });
      if (f.kind === 'crew' && f.oppMem && !f.top && U.member(f.mem) && U.member(f.oppMem)) {
        var p = pairedBefore(evId, f.mem, f.oppMem, key, except);
        if (p && !seen[p.id]) out.push(nameOf(f.mem) + ' y ' + nameOf(f.oppMem) + ' ya jugaron entre ellos en la ' + U.roundLabel(p) + '. En el suizo no te emparejan dos veces con la misma persona: ¿no será esa partida?');
      }
      return out;
    }
    paint();

    sh.addEventListener('click', function (e) {
      var b = e.target.closest('[data-g]');
      if (!b || b.disabled) return;
      var g = b.getAttribute('data-g'), v = b.getAttribute('data-v');
      if (g === 'mem') { f.mem = v; if (!old) f.round = C.nextRound(U.book, v, evId); if (f.oppMem === v) f.oppMem = ''; }
      else if (g === 'top') f.top = v;
      else if (g === 'step') { f.top = ''; f.round = Math.max(1, Math.min(20, f.round + Number(v))); }
      else if (g === 'kind') f.kind = v;
      else if (g === 'color') {
        var i = f.colors.indexOf(v);
        if (i >= 0) f.colors.splice(i, 1); else { f.colors.push(v); if (f.colors.length > 2) f.colors.shift(); }
      } else if (g === 'quick') {
        var l = faced[Number(v)];
        q('#lg-name').value = l.name; f.colors = l.colors.slice();
        if (l.set) q('#lg-set').value = l.set;
      } else if (g === 'oppMem') f.oppMem = v;
      else if (g === 'res') { f.res = v; X.buzz(12); }
      else if (g === 'first') f.first = v === '1' ? true : v === '0' ? false : null;
      else if (g === 'bo') { f.bo = Number(v); if (f.bo === 1) f.score = ''; }
      else if (g === 'score') f.score = v;
      paint();
    });
    // typing a leader the crew already met fills in its colours
    q('#lg-name').addEventListener('change', function () {
      var name = this.value.trim().toLowerCase();
      if (f.colors.length) return;
      var hit = faced.filter(function (l) { return l.name.toLowerCase() === name; })[0];
      if (hit) { f.colors = hit.colors.slice(); paint(); }
    });

    q('[data-save]').onclick = function () {
      if (!f.mem) { X.toast('Elige quién ha jugado.', 'bad'); q('#lg-mem').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      // a sync may have merged or removed a pirate while the sheet was open
      if (!U.member(f.mem)) {
        f.mem = (C.aliasOf && C.aliasOf(U.book, f.mem)) || '';
        if (f.oppMem === f.mem) f.oppMem = '';
        paint(); X.toast('Ese pirata se ha fusionado o borrado en otro móvil: comprueba quién ha jugado.', 'bad'); return;
      }
      if (f.kind === 'crew' && f.oppMem && !U.member(f.oppMem)) {
        f.oppMem = (C.aliasOf && C.aliasOf(U.book, f.oppMem)) || '';
        if (f.oppMem === f.mem) f.oppMem = '';
        paint(); X.toast('Ese compañero se ha fusionado o borrado en otro móvil: elige otra vez contra quién has jugado.', 'bad'); return;
      }
      if (!f.res) { X.toast('Primero elige VICTORIA, DERROTA o EMPATE.', 'bad'); q('#lg-res').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (f.kind === 'crew' && !f.oppMem) { X.toast('Elige contra qué compañero has jugado.', 'bad'); return; }
      var w = clashes();
      // editing a round without moving it (same pirate, round and opponent) is always fine: it adds nothing new
      var same = old && old.mem === f.mem && C.slot(old) === (f.top ? 'T' + f.top : 'R' + f.round) && (old.oppMem || '') === (f.kind === 'crew' ? f.oppMem : '');
      if (w.length && !same) {
        U.confirm(old ? '¿Guardar la ronda así?' : '¿Registrarla otra vez?', w.map(function (x) { return esc(x); }).join('<br><br>') + '<br><br>Si son dos partidas distintas, adelante. Si es la misma, en la clasificación solo cuenta la que se registró primero.', old ? 'Guardar igualmente' : 'Registrar igualmente', save);
        return;
      }
      save();
    };
    function save() {
      var mem = U.member(f.mem);
      if (!mem || (f.kind === 'crew' && !U.member(f.oppMem))) { X.toast('Ese pirata ya no está en la tripulación: elige otra vez.', 'bad'); paint(); return; }
      var rec = {
        id: old ? old.id : C.newId('g'), ev: evId, mem: f.mem, round: f.top ? 0 : f.round, top: f.top,
        opp: f.kind === 'crew' ? U.member(f.oppMem).leader : { name: q('#lg-name').value.trim() || 'Desconocido', colors: f.colors, set: q('#lg-set').value.trim() },
        oppName: f.kind === 'crew' ? '' : q('#lg-oppname').value.trim(), oppMem: f.kind === 'crew' ? f.oppMem : '',
        res: f.res, first: f.first, bo: f.bo, score: f.bo === 3 ? f.score : '',
        mvp: q('#lg-mvp').value.trim(), notes: q('#lg-notes').value.trim(),
        myLeader: old && old.mem === f.mem ? old.myLeader : mem.leader,
        by: old ? old.by : (U.local.me || f.mem), t: old ? old.t : Date.now(),
      };
      var before = C.games(U.book, f.mem, evId), bBefore = C.bounty(before);
      var allBefore = C.games(U.book, f.mem, null), had = {};
      C.badges(allBefore).forEach(function (x) { if (x.got) had[x.badge.id] = 1; });
      var rankBefore = C.rankOf(C.bounty(allBefore)).rank;
      C.put(U.book, 'matches', rec);
      U.close();
      U.save();
      if (old) { X.toast('Ronda actualizada', 'good'); return; }

      var after = C.games(U.book, f.mem, evId), bAfter = C.bounty(after), allAfter = C.games(U.book, f.mem, null);
      var rankAfter = C.rankOf(C.bounty(allAfter)).rank, st = C.streaks(after), rr = C.record(after);
      // the gain of this round as the feed shows it (a round logged late can change the streaks after it)
      var idx = -1;
      after.forEach(function (g, k) { if (g.m.id === rec.id && !g.mirror) idx = k; });
      var gain = idx >= 0 ? C.gain(after, idx) : Math.max(0, bAfter - bBefore);
      var info;
      if (rec.res === 'W') {
        var title = rec.top ? '¡AL TOP!' : st.len >= 3 ? '¡RAIMEI HAKKE!' : rec.first === false ? '¡BORO BREATH!' : rec.oppMem ? '¡FUEGO AMIGO!' : pick(['¡BRUTAL!', '¡VAMOS!', '¡TOMA YA!']);
        info = { title: title, line: '+฿' + U.berries(gain), sub: esc(mem.name) + ' · ' + U.recText(rr) + ' · recompensa ฿' + U.berries(bAfter), rankUp: rankAfter.id !== rankBefore.id ? '¡SUBES DE RANGO! · ' + rankAfter.icon + ' ' + rankAfter.name : '' };
      } else if (rec.res === 'L') {
        info = { title: '¡QUÉ PALO!', line: pick(['Sacúdetelo. A por la siguiente.', 'Hasta Kaido ha perdido alguna. ¡Siguiente!', 'Baraja y a por ellos. ¡Vamos!', 'Respira hondo. La siguiente es tuya.']), sub: esc(mem.name) + ' · ' + U.recText(rr) };
      } else {
        info = { title: '¡TABLAS!', line: '+฿' + U.berries(gain) + ' por sobrevivir', sub: esc(mem.name) + ' · ' + U.recText(rr) };
      }
      X.moment(rec.res, info);
      var fresh = C.badges(allAfter).filter(function (x) { return x.got && !had[x.badge.id]; });
      fresh.forEach(function (x, i) {
        setTimeout(function () { X.toast((x.badge.shame ? '😅 Insignia de la vergüenza: ' : '🏅 Nueva insignia: ') + x.badge.icon + ' ' + x.badge.name + ' (' + mem.name + ')', 'good'); }, 2700 + i * 900);
      });
    }
    var del = q('[data-del]');
    if (del) del.onclick = function () {
      U.confirm('¿Borrar esta ronda?', 'Desaparecerá de la actividad y de todas las clasificaciones, en los móviles de toda la tripulación.', 'Borrar', function () {
        C.remove(U.book, 'matches', old.id);
        C.live(U.book, 'reactions').forEach(function (x) { if (x.match === old.id) C.remove(U.book, 'reactions', x.id); });
        U.close();
        U.save();
        X.toast('Ronda borrada');
      }, true);
    };
  };
})(window);
