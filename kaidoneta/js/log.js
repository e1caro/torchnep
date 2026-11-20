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

  U.logSheet = function (matchId, memId) {
    var members = C.members(U.book);
    if (!members.length) { U.memberSheet(null, { me: true }); return; }
    var old = matchId ? C.get(U.book, 'matches', matchId) : null;
    if (matchId && !old) { X.toast('That round was deleted.'); return; }
    var evId = old ? old.ev : U.ev().id, ev = C.get(U.book, 'events', evId);
    var me = U.me();
    var f = old ? {
      mem: old.mem, round: old.round || 1, top: old.top, kind: old.oppMem ? 'crew' : 'leader', colors: old.opp.colors.slice(),
      oppMem: old.oppMem, res: old.res, first: old.first, bo: old.bo, score: old.score,
    } : {
      mem: memId && U.member(memId) ? memId : me ? me.id : members[0].id, round: 1, top: '', kind: 'leader', colors: [], oppMem: '', res: '', first: null, bo: 1, score: '',
    };
    if (!old) f.round = C.nextRound(U.book, f.mem, evId);
    var faced = facedLeaders(evId);

    var html = U.head(old ? 'Edit round' : 'Log a round', '<span class="small muted ellip" style="max-width:34%">' + esc(ev ? ev.name : '') + '</span>') +
      '<div class="field"><span class="lab">Who played</span><div class="chips" id="lg-mem"></div></div>' +
      '<div class="field"><span class="lab">Round</span><div id="lg-round"></div></div>' +
      '<div class="field"><span class="lab">Against</span><div id="lg-kind" style="margin-bottom:12px"></div>' +
        '<div id="lg-leader">' +
          '<div class="chips" id="lg-colors" aria-label="Leader colours"></div>' +
          '<input class="inp" id="lg-name" list="lg-dl" maxlength="40" autocomplete="off" placeholder="Leader (e.g. Enel, Luffy, Lucci…)" style="margin-top:10px" value="' + esc(old && !old.oppMem ? old.opp.name : '') + '">' +
          '<datalist id="lg-dl">' + faced.map(function (l) { return l.name; }).concat(C.LEADERS).filter(function (n, i, a) { return a.indexOf(n) === i; }).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
          (faced.length ? '<div class="small dim" style="margin-top:10px">Faced here</div><div class="suggest" id="lg-quick">' + faced.slice(0, 10).map(function (l, i) { return '<button class="chip" data-g="quick" data-v="' + i + '">' + U.lchip(l) + '</button>'; }).join('') + '</div>' : '') +
        '</div>' +
        '<div id="lg-crew" class="chips"></div>' +
      '</div>' +
      '<div class="field"><span class="lab">Result</span><div class="result-btns" id="lg-res"></div></div>' +
      '<div class="field"><span class="lab">Turn</span><div id="lg-first"></div></div>' +
      '<details class="more"' + (old && (old.bo === 3 || old.mvp || old.notes || old.oppName || old.opp.set) ? ' open' : '') + '><summary>More: opponent name, Bo3, MVP card, notes</summary>' +
        '<div class="row"><div class="field grow"><label for="lg-oppname">Opponent\'s name</label><input class="inp" id="lg-oppname" maxlength="30" value="' + esc(old ? old.oppName : '') + '" placeholder="Optional"></div>' +
        '<div class="field" style="width:30%"><label for="lg-set">Set</label><input class="inp" id="lg-set" maxlength="12" value="' + esc(old && !old.oppMem ? old.opp.set : '') + '" placeholder="OP17"></div></div>' +
        '<div class="field"><span class="lab">Format</span><div id="lg-bo"></div></div>' +
        '<div class="field"><label for="lg-mvp">MVP card</label><input class="inp" id="lg-mvp" maxlength="40" value="' + esc(old ? old.mvp : '') + '" placeholder="The card that won it"></div>' +
        '<div class="field"><label for="lg-notes">Notes</label><textarea class="inp" id="lg-notes" maxlength="300" placeholder="What happened? Misplays, top-decks, salt…">' + esc(old ? old.notes : '') + '</textarea></div>' +
      '</details>' +
      '<div id="lg-warn"></div>' +
      '<div class="save-bar">' + (old ? '<button class="btn danger" data-del>Delete</button>' : '') + '<button class="btn primary" data-save>' + K.art.bolt() + (old ? ' Save' : ' Log it') + '</button></div>';
    var sh = U.sheet(html, { tall: true });
    var q = function (s) { return sh.querySelector(s); };

    function chip(g, v, label, on, cls) { return '<button class="chip ' + (cls || '') + (on ? ' on' : '') + '" data-g="' + g + '" data-v="' + esc(v) + '" aria-pressed="' + !!on + '">' + label + '</button>'; }
    function paint() {
      q('#lg-mem').innerHTML = C.members(U.book).map(function (m) { return chip('mem', m.id, U.av(m) + esc(m.name), f.mem === m.id, 'av-chip'); }).join('');
      q('#lg-round').innerHTML = '<div class="row wrap" style="gap:12px">' +
        '<div class="stepper"' + (f.top ? ' style="opacity:.35"' : '') + '><button data-g="step" data-v="-1" aria-label="Previous round">−</button><span class="num">R' + f.round + '</span><button data-g="step" data-v="1" aria-label="Next round">＋</button></div>' +
        '<div class="chips">' + chip('top', '', 'Swiss', !f.top) + '</div></div>' +
        '<div class="chips" style="margin-top:10px">' + C.STAGES.map(function (s) { return chip('top', s, s, f.top === s); }).join('') + '</div>';
      q('#lg-kind').innerHTML = '<div class="seg full">' +
        '<button class="' + (f.kind === 'leader' ? 'on' : '') + '" data-g="kind" data-v="leader">Opponent</button>' +
        '<button class="' + (f.kind === 'crew' ? 'on' : '') + '" data-g="kind" data-v="crew"' + (C.members(U.book).length < 2 ? ' disabled' : '') + '>🗡️ Crewmate</button></div>';
      q('#lg-leader').hidden = f.kind !== 'leader';
      q('#lg-crew').hidden = f.kind !== 'crew';
      q('#lg-colors').innerHTML = C.COLORS.map(function (c) {
        return '<button class="chip color' + (f.colors.indexOf(c.id) >= 0 ? ' on' : '') + '" data-g="color" data-v="' + c.id + '" aria-label="' + c.name + '" aria-pressed="' + (f.colors.indexOf(c.id) >= 0) + '" style="background:' + c.hex + '"></button>';
      }).join('');
      q('#lg-crew').innerHTML = C.members(U.book).filter(function (m) { return m.id !== f.mem; }).map(function (m) { return chip('oppMem', m.id, U.av(m) + esc(m.name), f.oppMem === m.id, 'av-chip'); }).join('') ||
        '<span class="muted small">Add more pirates to the crew first.</span>';
      q('#lg-res').innerHTML =
        '<button class="rbtn W' + (f.res === 'W' ? ' on' : '') + '" data-g="res" data-v="W">WIN<small>Gert lush</small></button>' +
        '<button class="rbtn L' + (f.res === 'L' ? ' on' : '') + '" data-g="res" data-v="L">LOSS<small>Proper gutted</small></button>' +
        '<button class="rbtn D' + (f.res === 'D' ? ' on' : '') + '" data-g="res" data-v="D">DRAW<small>Time</small></button>';
      q('#lg-first').innerHTML = '<div class="seg full">' +
        '<button class="' + (f.first === true ? 'on' : '') + '" data-g="first" data-v="1">Went 1st</button>' +
        '<button class="' + (f.first === false ? 'on' : '') + '" data-g="first" data-v="0">Went 2nd</button>' +
        '<button class="' + (f.first === null ? 'on' : '') + '" data-g="first" data-v="">Not sure</button></div>';
      q('#lg-bo').innerHTML = '<div class="seg"><button class="' + (f.bo === 1 ? 'on' : '') + '" data-g="bo" data-v="1">Bo1</button><button class="' + (f.bo === 3 ? 'on' : '') + '" data-g="bo" data-v="3">Bo3</button></div>' +
        (f.bo === 3 ? '<div class="chips" style="margin-top:10px">' + ['2-0', '2-1', '1-2', '0-2', '1-1', '1-0', '0-1'].map(function (s) { return chip('score', s, s, f.score === s); }).join('') + '</div>' : '');
      var warn = '';
      if (f.kind === 'crew' && f.oppMem) {
        var dup = C.loggedBy(U.book, evId, f.round, f.top, f.mem, f.oppMem);
        if (dup && (!old || dup.id !== old.id)) warn = '<div class="warn-box">⚠️ ' + esc(U.member(f.oppMem).name) + ' already logged this round against ' + esc(U.member(f.mem).name) + ' (' + (dup.res === 'W' ? 'they won' : dup.res === 'L' ? 'they lost' : 'a draw') + '). It already counts for both of you.</div>';
      }
      q('#lg-warn').innerHTML = warn;
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
      if (!f.res) { X.toast('Pick WIN, LOSS or DRAW first.', 'bad'); q('#lg-res').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (f.kind === 'crew' && !f.oppMem) { X.toast('Pick the crewmate you played.', 'bad'); return; }
      if (f.kind === 'crew') {
        var dup = C.loggedBy(U.book, evId, f.round, f.top, f.mem, f.oppMem);
        if (dup && (!old || dup.id !== old.id)) { X.toast('Already logged by ' + U.member(f.oppMem).name + '. It counts for both of you.', 'bad'); return; }
      }
      var mem = U.member(f.mem);
      var rec = {
        id: old ? old.id : C.newId('g'), ev: evId, mem: f.mem, round: f.top ? 0 : f.round, top: f.top,
        opp: f.kind === 'crew' ? U.member(f.oppMem).leader : { name: q('#lg-name').value.trim() || 'Unknown', colors: f.colors, set: q('#lg-set').value.trim() },
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
      if (old) { X.toast('Round updated', 'good'); return; }

      var after = C.games(U.book, f.mem, evId), bAfter = C.bounty(after), allAfter = C.games(U.book, f.mem, null);
      var rankAfter = C.rankOf(C.bounty(allAfter)).rank, st = C.streaks(after), rr = C.record(after);
      var gain = bAfter - bBefore;
      var info;
      if (rec.res === 'W') {
        var title = rec.top ? 'CLIFTON CLIMB!' : st.len >= 3 ? 'THUNDER BAGUA!' : rec.first === false ? 'BORO BREATH!' : rec.oppMem ? 'FRIENDLY FIRE!' : pick(['GERT LUSH!', '¡VAMOS!', 'PROPER JOB!']);
        info = { title: title, line: '+฿' + U.berries(gain), sub: esc(mem.name) + ' · ' + U.recText(rr) + ' · bounty ฿' + U.berries(bAfter), rankUp: rankAfter.id !== rankBefore.id ? 'RANK UP · ' + rankAfter.icon + ' ' + rankAfter.name : '' };
      } else if (rec.res === 'L') {
        info = { title: 'PROPER GUTTED', line: pick(['Shake it off. Next round.', 'Even Kaido has lost a fight. Next!', 'Shuffle up. ¡Vamos!', 'Bounties never go down. Go again.']), sub: esc(mem.name) + ' · ' + U.recText(rr) };
      } else {
        info = { title: 'EVEN STEVENS', line: '+฿' + U.berries(gain) + ' for surviving', sub: esc(mem.name) + ' · ' + U.recText(rr) };
      }
      X.moment(rec.res, info);
      var fresh = C.badges(allAfter).filter(function (x) { return x.got && !had[x.badge.id]; });
      fresh.forEach(function (x, i) {
        setTimeout(function () { X.toast((x.badge.shame ? '😅 Badge of shame: ' : '🏅 New badge: ') + x.badge.icon + ' ' + x.badge.name + ' (' + mem.name + ')', 'good'); }, 2700 + i * 900);
      });
    };
    var del = q('[data-del]');
    if (del) del.onclick = function () {
      U.confirm('Delete this round?', 'It disappears from the feed and every ranking, on every phone of the crew.', 'Delete', function () {
        C.remove(U.book, 'matches', old.id);
        C.live(U.book, 'reactions').forEach(function (x) { if (x.match === old.id) C.remove(U.book, 'reactions', x.id); });
        U.close();
        U.save();
        X.toast('Round deleted');
      }, true);
    };
  };
})(window);
