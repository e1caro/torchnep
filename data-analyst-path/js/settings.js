/* Settings: daily goal, appearance, feedback, install, reminder, moving progress between devices, reset. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, G = DA.game, Y = DA.sync;
  var V = (DA.views = DA.views || {});

  function section(heading, intro, body) {
    return h('section', { class: 'card settings-card' }, h('h2', { text: heading }), intro ? h('p', { class: 'muted', text: intro }) : null, body);
  }

  // A group of radio cards: options = [[value, label, description]]
  function choice(name, label, options, current, onPick) {
    return h('fieldset', { class: 'choice' }, h('legend', { class: 'sr-only', text: label }),
      options.map(function (o) {
        return h('label', { class: 'choice-card' },
          h('input', { type: 'radio', name: name, value: String(o[0]), checked: String(o[0]) === String(current), onchange: function () { onPick(o[0]); } }),
          h('strong', { text: o[1] }), h('span', { class: 'muted small', text: o[2] }));
      }));
  }

  function toggle(label, desc, on, onChange) {
    var input = h('input', { type: 'checkbox', checked: on, onchange: function (e) { onChange(e.target.checked); } });
    return h('label', { class: 'toggle' }, input, h('span', null, h('strong', { text: label }), h('span', { class: 'muted small', text: desc })));
  }

  /* The Android app's daily notification (see android-analyst/). The text never mentions a streak length:
   * it is written today for tomorrow, and must still be true then. */
  var R = (DA.reminder = {});
  R.available = function () { var n = ui.native(); return !!(n && n.setReminder); };
  R.sync = function () {
    if (!R.available()) return;
    var p = ui.state.profile, t = p.remindAt.split(':');
    try { ui.native().setReminder(!!p.remind, Number(t[0]), Number(t[1]), 'Data Analyst Path', DA.t('Your daily round is ready. Two minutes keeps the habit going.')); } catch (e) { /* older app version */ }
  };

  /* Automatic sync with an account (js/cloud.js). */
  function when(ms) {
    if (!ms) return 'not yet';
    var d = new Date(ms), now = ui.now(), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return ui.dateStr(d) === ui.dateStr(now) ? 'today at ' + hm : d.toLocaleDateString() + ' ' + hm;
  }
  function syncCard() {
    var C = DA.cloud, box = h('div', { id: 'syncBox' }), msg = h('p', { class: 'status-line', role: 'status', 'aria-live': 'polite' });
    var card = section('Sync phone and computer', null, h('div', null, box, msg));
    card.id = 'sync';
    function busy(btns, on) { btns.forEach(function (b) { b.disabled = on; }); }
    var shown = null;
    function paint() {
      ui.clear(box);
      shown = C.signedIn();
      if (C.signedIn()) {
        var err = C.lastError();
        box.appendChild(h('p', { class: 'sync-ok' }, h('strong', { text: '☁️ Signed in as ' + C.user() }), h('br'),
          h('span', { class: 'muted small', text: 'Progress syncs by itself on every device where you sign in with this account: here, the web and the Android app.' })));
        box.appendChild(h('p', { class: 'muted small', id: 'syncWhen', text: err ? err : 'Last synced ' + when(C.lastSync()) + '.' }));
        var now = h('button', { class: 'btn accent', type: 'button', onclick: function () {
          busy([now, out], true); msg.textContent = 'Syncing…';
          C.sync().then(function (r) { msg.textContent = r && r.got ? 'Synced: new progress arrived from your other device.' : 'Synced. Everything is up to date.'; },
            function (e) { msg.textContent = e.message; }).then(function () { busy([now, out], false); });
        } }, 'Sync now');
        var out = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
          C.signOut(); msg.textContent = 'Signed out. Your progress stays on this device and in your account.';
        } }, 'Sign out');
        box.appendChild(h('div', { class: 'row' }, now, out));
        box.appendChild(h('details', { class: 'muted small' }, h('summary', { text: 'Delete my account' }),
          h('p', { text: 'Deletes the online copy of your progress and the account. This device keeps its progress.' }),
          h('button', { class: 'btn ghost danger', type: 'button', onclick: function () {
            if (!window.confirm('Delete your account and its online copy? Your other devices keep what they have, but stop syncing.')) return;
            C.deleteAccount().then(function () { msg.textContent = 'Account deleted. Your progress is still on this device.'; }, function (e) { msg.textContent = e.message; });
          } }, 'Delete account')));
        return;
      }
      var user = h('input', { type: 'text', id: 'syncUser', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: '20', placeholder: 'username', 'aria-label': 'Username' });
      var pass = h('input', { type: 'password', id: 'syncPass', autocomplete: 'current-password', placeholder: 'password (6+ characters)', 'aria-label': 'Password' });
      function go(fn, btns, okText) {
        busy(btns, true); msg.textContent = 'Connecting…';
        fn(user.value, pass.value).then(function (r) {
          pass.value = '';
          ui.refreshChrome();
          msg.textContent = okText + (r && r.got ? ' Progress from your other device was merged in.' : '');
          ui.toast('☁️ Sync is on.');
        }, function (e) { msg.textContent = e.message; busy(btns, false); });
      }
      var inBtn = h('button', { class: 'btn accent', type: 'submit' }, 'Sign in');
      var upBtn = h('button', { class: 'btn ghost', type: 'button', onclick: function () { go(C.signUp, [inBtn, upBtn], 'Account created. Now sign in with it on your other device.'); } }, 'Create account');
      box.appendChild(h('p', { class: 'muted', text: 'Create an account here, then sign in with the same username and password on your other device (web or Android app). From then on your progress syncs by itself, and merging never deletes anything.' }));
      box.appendChild(h('form', { class: 'sync-form', onsubmit: function (e) { e.preventDefault(); go(C.signIn, [inBtn, upBtn], 'Signed in. Sync is on.'); } },
        h('label', { for: 'syncUser', class: 'sr-only', text: 'Username' }), user,
        h('label', { for: 'syncPass', class: 'sr-only', text: 'Password' }), pass,
        h('div', { class: 'row' }, inBtn, upBtn)));
      box.appendChild(h('p', { class: 'muted small', text: 'Stored online: only your progress (no e-mail, no name). The password is never saved on this device.' }));
    }
    paint();
    document.addEventListener('cloud-status', function onStatus() {
      if (!card.isConnected) { document.removeEventListener('cloud-status', onStatus); return; }
      if (C.signedIn() !== shown) { paint(); return; }
      var w = document.getElementById('syncWhen');
      if (w) w.textContent = C.lastError() || 'Last synced ' + when(C.lastSync()) + '.';
    });
    return card;
  }

  V.settings = function () {
    var p = ui.state.profile, root = h('div', { class: 'view settings' });
    root.appendChild(h('h1', { id: 'view-title', tabindex: '-1', text: 'Settings' }));
    root.appendChild(h('p', { class: 'lead' }, 'Your background, study hours and language are in ', h('a', { href: '#/profile', text: 'Profile' }), '.'));

    root.appendChild(section('Language', null, ui.appLangChoice(true)));
    if (DA.tour) root.appendChild(section('Tour with Dot', 'A two-minute guided walk through every part of the app.', DA.tour.button('btn')));

    root.appendChild(syncCard());

    root.appendChild(section('Daily goal', 'The XP you aim for each day. Reaching it keeps your streak alive. Pick something you can do on a busy day.',
      choice('goal', 'Daily XP goal', [[20, 'Easy · 20 XP', 'A quiz and a note, about 5 minutes'], [40, 'Regular · 40 XP', 'One practice round, about 10 minutes'], [80, 'Serious · 80 XP', 'A lesson and a round, about 30 minutes']],
        p.dailyGoal, function (v) { p.dailyGoal = Number(v); ui.save(); G.touch(); ui.toast('Daily goal: ' + v + ' XP'); })));

    root.appendChild(section('Look and feel', null, h('div', null,
      choice('theme', 'Theme', [['auto', 'Auto', 'Follow my device'], ['light', 'Light', 'Always light'], ['dark', 'Dark', 'Always dark']], p.theme, function (v) { p.theme = v; ui.save(); ui.applyTheme(); }),
      toggle('Sound effects', 'Short sounds in practice rounds and celebrations', p.sound, function (v) { p.sound = v; ui.save(); if (v) G.sound('ok'); }),
      toggle('Vibration', 'A light buzz on phones when you answer or level up', p.haptics, function (v) { p.haptics = v; ui.save(); if (v) G.buzz(30); }))));

    // install and offline
    var offline = h('p', { class: 'status-line' });
    function paintOffline() {
      offline.textContent = ui.native() ? '✓ This is the Android app: everything is inside it, so it works offline.' : DA.pwa.offlineReady ? '✓ Works offline: everything is saved on this device.' : /^https?:$/.test(location.protocol) ? 'Preparing offline mode…' : 'Offline mode needs the site to be opened from a web address (not a file).';
    }
    paintOffline();
    document.addEventListener('pwa-ready', function () { if (offline.isConnected) paintOffline(); });
    var inst = DA.pwa.installCard(true);
    root.appendChild(section('Phone and computer', 'Install it like an app, on as many devices as you like.', h('div', null, offline,
      inst || h('p', { class: 'muted small', text: DA.pwa.standalone() ? 'You are using the installed app.' : 'Your browser offers an install option in its menu ("Install app" or "Add to Home Screen").' }))));

    // reminder: a real notification inside the Android app, a calendar event on the web
    if (DA.reminder.available()) {
      var nat = ui.native(), remMsg = h('p', { class: 'status-line', role: 'status', 'aria-live': 'polite' });
      var remTime = h('input', { type: 'time', id: 'remTime', value: p.remindAt, 'aria-label': 'Reminder time', onchange: function () {
        if (/^\d\d:\d\d$/.test(remTime.value)) { p.remindAt = remTime.value; ui.save(); DA.reminder.sync(); if (p.remind) remMsg.textContent = 'Reminder set for ' + p.remindAt + ' every day.'; }
      } });
      window.onNativePermission = function (ok) {
        if (!ok) { p.remind = false; ui.save(); DA.reminder.sync(); remMsg.textContent = 'Notifications are not allowed for this app. You can allow them in your phone\'s settings.'; if (location.hash === '#/settings') location.reload(); }
        else remMsg.textContent = 'Reminder set for ' + p.remindAt + ' every day.';
      };
      root.appendChild(section('Daily reminder', 'One gentle notification a day at the time you choose. No nagging: it never repeats or counts what you missed.', h('div', null,
        toggle('Remind me every day', 'A notification from this app on this phone', p.remind, function (v) {
          p.remind = v; ui.save(); DA.reminder.sync();
          if (!v) { remMsg.textContent = 'Reminder off.'; return; }
          var perm = nat.notificationPermission ? nat.notificationPermission() : 'granted';
          if (perm === 'ask') nat.requestNotificationPermission();
          else if (perm === 'denied') window.onNativePermission(false);
          else remMsg.textContent = 'Reminder set for ' + p.remindAt + ' every day.';
        }),
        h('div', { class: 'row' }, h('label', { for: 'remTime', class: 'muted', text: 'At' }), remTime,
          h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (nat.testReminder) nat.testReminder(); } }, 'Send a test')),
        remMsg)));
    } else {
      var time = h('input', { type: 'time', id: 'remTime', value: p.remindAt, 'aria-label': 'Reminder time' });
      root.appendChild(section('Daily reminder', 'Websites cannot send reliable notifications without a server, so use your own calendar: this adds a repeating 15-minute event with an alarm. (The Android app has a built-in daily notification.)',
        h('div', { class: 'row' }, h('label', { for: 'remTime', class: 'muted', text: 'Remind me at' }), time,
          h('button', { class: 'btn', type: 'button', onclick: function () {
            var url = ui.native() ? '' : location.href.split('#')[0]; // inside the app the address means nothing to a calendar
            ui.download('data-analyst-path-daily.ics', Y.ics(time.value || '19:00', url), 'text/calendar;charset=utf-8');
            ui.toast('Open the downloaded file to add it to your calendar.');
          } }, '📅 Add to my calendar'))));
    }

    // move progress
    var out = h('textarea', { class: 'code-box', rows: '3', readonly: true, 'aria-label': 'Your transfer code', placeholder: 'Press "Create code" and it appears here.' });
    var inp = h('textarea', { class: 'code-box', rows: '3', 'aria-label': 'Paste a transfer code here', placeholder: 'Paste the code from your other device here (it starts with DAP2.)' });
    var made = null;
    var copyBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: function () { ui.copy(made, 'Code copied. Paste it on your other device.'); } }, 'Copy');
    var shareBtn = navigator.share || (ui.native() && ui.native().share) ? h('button', { class: 'btn ghost', type: 'button', disabled: true, onclick: function () {
      if (ui.native() && ui.native().share) ui.native().share(made);
      else navigator.share({ title: 'Data Analyst Path progress', text: made }).catch(function () { /* cancelled */ });
    } }, 'Share…') : null;
    var result = h('p', { class: 'status-line transfer-result', role: 'status', 'aria-live': 'polite' });
    function merged(r) {
      ui.refreshChrome();
      result.textContent = 'Merged. ' + (r.lessons > 0 ? r.lessons + ' new lesson' + (r.lessons === 1 ? '' : 's') + ', ' : '') + (r.xp > 0 ? '+' + r.xp + ' XP' : 'no new XP') + '. Nothing was overwritten.';
      ui.toast('Progress merged.');
    }
    var fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var obj = JSON.parse(r.result);
          if (!obj || obj.app !== 'data-analyst-path' || !obj.state) throw new Error('x');
          merged(Y.apply(obj.state));
        } catch (err) { result.textContent = 'That file is not a progress export from this app.'; }
      };
      r.readAsText(f);
      e.target.value = '';
    } });
    root.appendChild(section('Move progress without an account', 'Prefer no account? Create a code here, paste it on the other device, and merge. Merging keeps the best of both and never deletes anything, so you can do it in either direction, any time.',
      h('div', null,
        h('div', { class: 'sync-step' }, h('h3', { text: '1 · On this device' }),
          h('div', { class: 'row' }, h('button', { class: 'btn accent', type: 'button', onclick: function () {
            Y.encode(ui.state).then(function (c) { made = c; out.value = c; copyBtn.disabled = false; if (shareBtn) shareBtn.disabled = false; ui.copy(c, 'Code created and copied.'); });
          } }, 'Create code'), copyBtn, shareBtn), out),
        h('div', { class: 'sync-step' }, h('h3', { text: '2 · On the other device' }), inp,
          h('div', { class: 'row' }, h('button', { class: 'btn accent', type: 'button', onclick: function () {
            Y.decode(inp.value).then(function (state) { merged(Y.apply(state)); inp.value = ''; }, function (e) { result.textContent = e.message; });
          } }, 'Merge into this device'))),
        result,
        h('p', { class: 'muted small', text: 'Prefer a file? Download a backup, then import it on the other device.' }),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onclick: function () {
            ui.download('data-analyst-path-progress.json', JSON.stringify({ app: 'data-analyst-path', v: 2, exportedAt: new Date().toISOString(), state: ui.state }, null, 2), 'application/json');
          } }, 'Download backup'),
          h('button', { class: 'btn ghost', type: 'button', onclick: function () { fileInput.click(); } }, 'Import backup (merge)'), fileInput))));

    root.appendChild(section('Reset', 'Deletes your profile, progress, XP, notes and review schedule from this device only.',
      h('button', { class: 'btn ghost danger', type: 'button', onclick: function () {
        if (window.confirm('Delete everything on this device? This cannot be undone. (Export a backup first if you might want it back.)')) {
          ui.reset(); ui.applyTheme(); ui.refreshChrome(); ui.toast('Everything was reset.'); location.hash = '#/';
        }
      } }, 'Reset everything')));
    return root;
  };
})();
