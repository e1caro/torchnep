/* Bloomdoku friends: the account form, the Friends tab (your card, friend code, requests, ranking, today's
 * bouquet), a friend's page (level, garden, conversation with flowers and garden challenges) and the account part of
 * Settings. Everything a friend typed is shown as text, never as HTML. */
(function () {
  'use strict';
  var BD = window.BD, W = BD.worlds, A = BD.art, C = BD.cloud, Shop = BD.shop, h = BD.h, t = BD.t;
  var F = (BD.friends = {});
  var poll = null, pending = '';   // the chat poll of the open friend page; a friend code that arrived by link

  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, BD.state.lang === 'es' ? '.' : ','); }
  function err(e) { BD.toast(t(e && e.message ? e.message : String(e))); }
  // What another player wears comes from their profile: anything that is not a known thing falls back to the plain one.
  function known(kind, value, plain) { return typeof value === 'string' && Shop.find(kind, value) ? value : plain; }
  function avatarOf(name, av, ring) {
    var v = av >= 1 && av <= 9 ? av : (BD.engine.hash(String(name || '')) % 9) + 1;
    return h('span.avatar.ring-' + known('ring', ring, 'none'), { style: { '--ac': A.colors[v - 1] }, html: A.token(v, 'critters') });
  }
  function levelLine(pub) { return t('Level {0}', pub.lvl || 1) + ' · ' + t(W.title(pub.lvl || 1)); }
  F.stop = function () { clearInterval(poll); poll = null; };
  F.invite = function (code) { pending = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); };

  /* ---------- account ---------- */
  function accountForm(after) {
    var user = h('input', { type: 'text', id: 'acc-user', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: 20, placeholder: t('Username'), 'aria-label': t('Username') });
    var pass = h('input', { type: 'password', id: 'acc-pass', autocomplete: 'current-password', maxlength: 72, placeholder: t('Password'), 'aria-label': t('Password') });
    var msg = h('p.form-msg', { role: 'alert' });
    var up = h('button.btn.primary', { type: 'button', onclick: function () { go(C.signUp); } }, t('Create account'));
    var inn = h('button.btn', { type: 'button', onclick: function () { go(C.signIn); } }, t('Sign in'));
    function go(fn) {
      msg.textContent = ''; up.disabled = inn.disabled = true;
      fn(user.value, pass.value).then(function () { BD.toast(t('Hello, {0}!', C.user())); after(); }, function (e) { up.disabled = inn.disabled = false; msg.textContent = t(e.message); });
    }
    pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(C.signIn); });
    return h('form.account', { onsubmit: function (e) { e.preventDefault(); } }, user, pass, msg, h('div.row', up, inn),
      h('p.muted.small', t('Only a username and a password: no e-mail. Your stars also follow you to your other phones and computers.')));
  }

  // The account section of Settings.
  F.settingsCard = function (redraw) {
    if (!C.signedIn()) return h('section.card', h('h2', t('Account')), h('p.muted.small', t('Sign in to keep your gardens on all your devices and to play with friends.')), accountForm(redraw));
    var when = C.lastSync() ? new Date(C.lastSync()).toLocaleTimeString(BD.state.lang === 'es' ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    return h('section.card', h('h2', t('Account')),
      h('p', h('b', C.user()), when ? h('span.muted.small', ' · ' + t('synced at {0}', when)) : null),
      h('div.row',
        h('button.btn', { type: 'button', onclick: function () { C.sync().then(function () { return C.friendsOff() ? null : C.loadFriends(); }).then(function () { BD.toast(t('Everything is up to date.')); redraw(); }, err); } }, t('Sync now')),
        h('button.btn.ghost', { type: 'button', onclick: function () { C.signOut(); redraw(); } }, t('Sign out'))),
      h('button.btn.ghost.danger', { type: 'button', onclick: function () {
        BD.confirm(t('Delete your account?'), t('Your profile, friends, messages and the progress kept online are deleted for good. What is on this phone stays.'), t('Delete account'),
          function () { C.deleteAccount().then(function () { BD.toast(t('Account deleted.')); redraw(); }, err); });
      } }, t('Delete account')));
  };

  /* ---------- the Friends tab ---------- */
  F.page = function (view) {
    F.stop();
    var head = h('header.hero.small', h('div.hero-pua', { html: A.pua('happy', 64) }), h('div.hero-text', h('h1', t('Friends')), h('p', t('See their levels and gardens, send flowers and challenges.'))));
    var page = h('div.page.friendsp', head);
    BD.clear(view).appendChild(page);
    function redraw() { if (location.hash.indexOf('#/friends') === 0 || location.hash.indexOf('#/add') === 0) F.page(view); }

    if (!C.signedIn()) {
      page.appendChild(h('section.card', h('h2', t('Play with friends')),
        h('ul.perks', h('li', '🏅 ' + t('A ranking of you and your friends by level')), h('li', '🌷 ' + t('Visit their gardens')), h('li', '💌 ' + t('Messages, flowers and garden challenges')), h('li', '📱 ' + t('Your progress on all your devices'))),
        accountForm(redraw)));
      return;
    }
    if (C.friendsOff()) {
      page.appendChild(h('section.card', h('h2', t('Friends are not switched on yet.')),
        h('p.muted', t('Your account works and your progress is syncing. Friends and messages open as soon as the app\'s database is ready.')),
        h('button.btn', { type: 'button', onclick: function () { C.refresh().then(redraw); } }, t('Try again'))));
      return;
    }

    var data = C.friends(), me = { id: C.uid(), username: C.user(), public: W.publicProfile(BD.state), me: true };
    // my card: avatar, level, code
    var p = W.player(BD.state);
    var codeBox = h('div.code', h('span', t('Your friend code')), h('b', { translate: 'no' }, C.code() || '······'),
      h('button.btn.small', { type: 'button', onclick: copyCode }, t('Copy')),
      h('button.btn.small.primary', { type: 'button', onclick: shareCode }, t('Invite')));
    page.appendChild(h('section.card.mecard',
      h('button.avatar-btn', { type: 'button', 'aria-label': t('Change your critter'), onclick: function () { pickAvatar(redraw); } }, avatarOf(me.username, BD.state.avatar, Shop.wearing(BD.state, 'ring'))),
      h('div.grow', h('b.name', { translate: 'no' }, me.username), h('span.muted', levelLine(me.public)),
        h('div.xpbar', { role: 'img', 'aria-label': t('{0} of {1} XP', p.xp - p.from, p.to - p.from) }, h('span', { style: { width: Math.round(100 * (p.xp - p.from) / (p.to - p.from)) + '%' } }))),
      codeBox));

    // add a friend
    var codeIn = h('input', { type: 'text', id: 'fr-code', maxlength: 6, autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', placeholder: t('Friend\'s code'), 'aria-label': t('Friend\'s code'), value: pending || null });
    var addBtn = h('button.btn.primary.small', { type: 'button', onclick: add }, t('Add'));
    function add() {
      addBtn.disabled = true;
      C.addFriend(codeIn.value).then(function (r) { pending = ''; BD.toast(r.friends ? t('{0} is now your friend!', r.username) : t('Request sent to {0}.', r.username)); redraw(); }, function (e) { addBtn.disabled = false; err(e); });
    }
    codeIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
    page.appendChild(h('section.card', h('h2', t('Add a friend')), h('div.row', codeIn, addBtn),
      h('p.muted.small', t('Ask for their code, or send yours with Invite. They accept, and you are friends.'))));

    // requests
    if (data.incoming.length || data.outgoing.length) {
      page.appendChild(h('section.card', h('h2', t('Requests')),
        data.incoming.map(function (f) {
          return h('div.frow', avatarOf(f.username, f.public.av), h('span.grow', h('b', { translate: 'no' }, f.username), h('small.muted', t('wants to be your friend'))),
            h('button.btn.small.primary', { type: 'button', onclick: function () { C.accept(f.id).then(function () { BD.toast(t('{0} is now your friend!', f.username)); redraw(); }, err); } }, t('Accept')),
            h('button.btn.small.ghost', { type: 'button', 'aria-label': t('Decline'), onclick: function () { C.remove(f.id).then(redraw, err); } }, '✕'));
        }),
        data.outgoing.map(function (f) {
          return h('div.frow', avatarOf(f.username, f.public.av), h('span.grow', h('b', { translate: 'no' }, f.username), h('small.muted', t('has not answered yet'))),
            h('button.btn.small.ghost', { type: 'button', onclick: function () { C.remove(f.id).then(redraw, err); } }, t('Cancel')));
        })));
    }

    // ranking
    var all = [me].concat(data.friends).sort(function (x, y) { return (y.public.lvl || 1) - (x.public.lvl || 1) || (y.public.xp || 0) - (x.public.xp || 0) || (x.username < y.username ? -1 : 1); });
    var today = W.dayKey();
    page.appendChild(h('section.card', h('h2', t('Ranking')),
      !data.loaded ? h('p.muted', '…') : null,
      all.map(function (f, i) {
        var pub = f.public, day = pub.day && pub.day.d === today ? pub.day : null, unread = data.unread[f.id] || 0;
        return h((f.me ? 'div' : 'a') + '.frow.rank' + (f.me ? '.me' : ''), { href: f.me ? null : '#/friend/' + f.id, 'data-friend': f.me ? null : f.username },
          h('span.place' + (i < 3 ? '.p' + (i + 1) : ''), String(i + 1)),
          avatarOf(f.username, pub.av, f.me ? Shop.wearing(BD.state, 'ring') : pub.ring),
          h('span.grow', h('b', { translate: 'no' }, f.username + (f.me ? ' (' + t('you') + ')' : '')), h('small.muted', levelLine(pub)),
            h('small.muted', '★ ' + (pub.stars || 0) + ' · 🌷 ' + num(pub.solved || 0) + (pub.streak ? ' · 🔥 ' + pub.streak : ''))),
          h('span.today' + (day ? '.got' : ''), { 'aria-label': t('Daily bouquet') + ': ' + (day ? t('{0} of 3 stars', day.stars) : t('not yet today')) }, '💐', h('small', day ? BD.stars(day.stars) : '···')),
          unread ? h('span.badge-n', { 'aria-label': t('{0} new messages', unread) }, String(unread)) : null);
      }),
      data.loaded && !data.friends.length ? h('p.muted.small', t('No friends here yet. Send your code to someone and the ranking fills up.')) : null));

    function copyCode() {
      var done = function () { BD.toast(t('Code copied.')); };
      if (BD.native && BD.native.copy) { BD.native.copy(C.code()); done(); }
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(C.code()).then(done, function () { BD.toast(C.code()); });
      else BD.toast(C.code());
    }
    function shareCode() {
      BD.shareText(t('Play Bloomdoku with me! My friend code is {0}.', C.code()), BD.SITE + '#/add/' + C.code());
    }
    if (C.now() - data.at > 15000) C.loadFriends().then(redraw, function () { /* shown as it was */ });
  };

  function pickAvatar(after) {
    var close = BD.sheet(h('div.menu', h('h2', t('Your critter')),
      h('div.avatars', [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (v) {
        return h('button' + ((BD.state.avatar || 0) === v ? '.on' : ''), { type: 'button', 'aria-label': t(A.critterNames[v - 1]), onclick: function () { BD.state.avatar = v; BD.save(); close(); after(); } }, avatarOf('', v));
      }))));
  }

  /* ---------- a friend's page ---------- */
  function fmtTime(iso) { return new Date(iso).toLocaleTimeString(BD.state.lang === 'es' ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit' }); }
  function fmtDay(iso) { return new Date(iso).toLocaleDateString(BD.state.lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }

  // A garden challenge inside a message: { key, garden, stars, slips, time }, or null if it is not a real garden.
  F.parseGarden = function (body) {
    var g = null;
    try { g = JSON.parse(body); } catch (e) { return null; }
    if (!g || typeof g !== 'object' || !W.level(String(g.key)) || !(g.garden >= 0 && g.garden < W.GARDENS) || g.garden % 1) return null;
    return { key: String(g.key), garden: g.garden | 0, stars: Math.max(1, Math.min(3, g.stars | 0)), slips: Math.max(0, g.slips | 0), time: Math.max(0, g.time | 0) };
  };

  function bubble(m, friend, redraw) {
    var mine = m.from_id === C.uid(), inner;
    if (m.kind === 'sticker' && /^(flowers|critters)-[1-9]$/.test(m.body)) {
      inner = h('span.sticker', { html: A.token(+m.body.slice(-1), m.body.split('-')[0]) });
    } else if (m.kind === 'garden' && F.parseGarden(m.body)) {
      var g = F.parseGarden(m.body), lv = W.level(g.key), own = W.gardenStars(BD.state, g.key, g.garden);
      inner = h('span.challenge', { style: { '--wc': lv.world.color } },
        h('b', lv.world.icon + ' ' + t(lv.name)), h('small', t(lv.world.name) + ' · ' + t('Garden {0}', g.garden + 1)),
        h('span.who', (mine ? t('You') : friend.username) + ': ' + BD.stars(g.stars) + (g.slips ? ' · 🥀 ' + g.slips : '') + (g.time ? ' · ' + BD.game.clock(g.time) : '')),
        own ? h('span.who', (mine ? friend.username : t('You')) + ': ' + (mine ? '…' : BD.stars(own))) : null,
        mine ? null : h('button.btn.small.primary', { type: 'button', onclick: function () {
          BD.state.invites[g.key] = 1; BD.save();
          location.hash = '#/play/' + g.key + '/' + (g.garden + 1);
        } }, own ? t('Play it again') : t('Play this garden')));
    } else inner = h('span.text', m.body);
    return h('div.msg' + (mine ? '.mine' : '') + (m.kind !== 'text' ? '.' + m.kind : ''), { 'data-id': m.id },
      inner, h('small', fmtTime(m.created_at) + (mine && m.read_at ? ' · ' + t('seen') : '')),
      mine ? h('button.unsend', { type: 'button', 'aria-label': t('Take this message back'), onclick: function () { C.unsend(m.id).then(redraw, err); } }, '✕') : null);
  }

  F.friendPage = function (view, id) {
    F.stop();
    var f = C.friend(id);
    if (!C.signedIn()) { location.hash = '#/friends'; return; }
    if (!f) { // opened directly: load the friends first
      BD.clear(view).appendChild(h('div.page', h('p.muted', '…')));
      C.loadFriends().then(function () { if (C.friend(id)) F.friendPage(view, id); else location.hash = '#/friends'; }, function () { location.hash = '#/friends'; });
      return;
    }
    var pub = f.public, mine = W.player(BD.state), diff = (pub.lvl || 1) - mine.level;
    var compare = diff > 0 ? (diff === 1 ? t('{0} is one level ahead of you.', f.username) : t('{0} is {1} levels ahead of you.', f.username, diff))
      : diff < 0 ? (diff === -1 ? t('You are one level ahead of {0}.', f.username) : t('You are {1} levels ahead of {0}.', f.username, -diff))
      : t('You and {0} are on the same level.', f.username);
    var list = h('div.thread', { 'aria-live': 'polite' }), shown = '';
    var input = h('input', { type: 'text', id: 'msg-text', maxlength: C.MAX_MSG, autocomplete: 'off', placeholder: t('Write to {0}', f.username), 'aria-label': t('Message') });
    var sendBtn = h('button.btn.primary.small', { type: 'button', 'aria-label': t('Send'), onclick: function () { say('text', input.value); } },
      h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-5 16-3.500-6.500z"/><path d="M11.500 13.500 20 4"/></svg>' }));
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') say('text', input.value); });
    function say(kind, body) {
      if (kind === 'text' && !String(body).trim()) return;
      sendBtn.disabled = true;
      C.send(id, kind, body).then(function () { sendBtn.disabled = false; if (kind === 'text') input.value = ''; BD.sound.soft(); load(true); }, function (e) { sendBtn.disabled = false; err(e); });
    }
    function draw(msgs, toEnd) {
      var key = msgs.map(function (m) { return m.id + (m.read_at ? 'r' : ''); }).join(',');
      if (key === shown) return;
      shown = key;
      BD.clear(list);
      var lastDay = '';
      if (!msgs.length) list.appendChild(h('p.muted.small.center', t('Say hello with a flower.')));
      msgs.forEach(function (m) {
        var d = fmtDay(m.created_at);
        if (d !== lastDay) { lastDay = d; list.appendChild(h('div.daysep', d)); }
        list.appendChild(bubble(m, f, function () { load(false); }));
      });
      if (toEnd !== false) list.scrollTop = list.scrollHeight;
    }
    function load(toEnd) {
      return C.thread(id).then(function (msgs) {
        if (!list.isConnected) return F.stop();
        draw(msgs, toEnd);
        if (msgs.some(function (m) { return m.to_id === C.uid() && !m.read_at; })) { C.friends().unread[id] = 1; C.markRead(id).then(null, function () { /* next time */ }); }
      }, function (e) { if (e.code === 'nofriends' || e.code === 'signedout') { F.stop(); location.hash = '#/friends'; } });
    }
    var stickers = h('div.stickers', { role: 'group', 'aria-label': t('Send a flower or a critter') },
      [['flowers', 1], ['flowers', 3], ['flowers', 5], ['flowers', 6], ['flowers', 8], ['flowers', 9], ['critters', 3], ['critters', 4], ['critters', 5], ['critters', 6], ['critters', 7], ['critters', 9]].map(function (s) {
        return h('button', { type: 'button', 'aria-label': t(s[0] === 'flowers' ? A.flowerNames[s[1] - 1] : A.critterNames[s[1] - 1]), onclick: function () { say('sticker', s[0] + '-' + s[1]); }, html: A.token(s[1], s[0]) });
      }));

    var page = h('div.page.friendp',
      h('header.play-top',
        h('a.round', { href: '#/friends', 'aria-label': t('Back to friends') }, h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.500 5.500 8 12l6.500 6.500"/></svg>' })),
        h('div.play-title', h('b', { translate: 'no' }, f.username), h('span', levelLine(pub))),
        h('button.round', { type: 'button', 'aria-label': t('Friend menu'), onclick: function () { friendMenu(f); } }, h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.500" cy="12" r="1.400"/><circle cx="12" cy="12" r="1.400"/><circle cx="18.500" cy="12" r="1.400"/></svg>' }))),
      h('section.card.fhead', h('span.fpua', { 'aria-label': t('{0}\'s Pua', f.username), html: A.pua('happy', 66, known('hat', pub.hat, 'flower'), known('coat', pub.coat, 'classic')) }), avatarOf(f.username, pub.av, pub.ring),
        h('div.grow', h('p.compare', compare),
          h('div.fstats', h('span', h('b', num(pub.solved || 0)), t('gardens')), h('span', h('b', String(pub.stars || 0)), t('stars')), h('span', h('b', String(pub.streak || 0)), t('days in a row')), h('span', h('b', String(pub.stamps || 0)), t('stamps'))))),
      h('details.card.fgarden', h('summary', t('{0}\'s garden', f.username)),
        BD.gardenBeds(function (lv) { return +String(pub.lv || '').charAt(lv.index) || 0; }, function (w) { return w.levels.every(function (lv) { return +String(pub.lv || '').charAt(lv.index) > 0; }); })),
      h('section.card.chat', list, stickers, h('div.row.composer', input, sendBtn)));
    BD.clear(view).appendChild(page);
    load(true);
    poll = setInterval(function () { if (!document.hidden) load(false); }, 8000);
  };

  function friendMenu(f) {
    var close = BD.sheet(h('div.menu', h('h2', { translate: 'no' }, f.username),
      h('button.btn', { type: 'button', onclick: function () {
        close();
        BD.confirm(t('Report {0}?', f.username), t('We look at reports of rude or unwanted messages. Removing a friend also stops their messages at once.'), t('Report'),
          function () { C.report(f.id, null, 'reported from the friend page').then(function () { BD.toast(t('Thank you. The report was sent.')); }, err); });
      } }, t('Report')),
      h('button.btn.ghost.danger', { type: 'button', onclick: function () {
        close();
        BD.confirm(t('Remove {0}?', f.username), t('You stop seeing each other\'s gardens and cannot write to each other.'), t('Remove friend'),
          function () { C.remove(f.id).then(function () { location.hash = '#/friends'; }, err); });
      } }, t('Remove friend'))));
  }

  /* ---------- challenges ---------- */
  // After a garden: pick a friend to send it to, with your result.
  F.canChallenge = function () { return C.signedIn() && !C.friendsOff() && C.friends().friends.length > 0; };
  F.challenge = function (key, garden, result) {
    var lv = W.level(key);
    var close = BD.sheet(h('div.menu', h('h2', t('Challenge a friend')),
      h('p.muted', lv.world.icon + ' ' + t(lv.name) + ' · ' + t('Garden {0}', garden + 1) + ' · ' + BD.stars(W.starsFor(result))),
      C.friends().friends.map(function (f) {
        return h('button.helper', { type: 'button', onclick: function () {
          close();
          C.send(f.id, 'garden', { key: key, garden: garden, stars: W.starsFor(result), slips: result.slips || 0, time: result.time || 0 })
            .then(function () { BD.toast(t('Sent to {0}.', f.username)); }, err);
        } }, avatarOf(f.username, f.public.av), h('span.grow', h('b', { translate: 'no' }, f.username), h('span', levelLine(f.public))));
      })));
  };
})();
