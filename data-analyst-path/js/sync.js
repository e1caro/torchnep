/* Moving progress between devices, with no server.
 *
 * "Transfer code": the progress as a short text (gzip + base64url when the browser supports it).
 * Copy it on one device, paste it on the other. Importing always MERGES (it never overwrites), so
 * progress made on both devices is kept: lessons and SQL are unioned, XP is a ledger of uniquely
 * keyed awards (union), the daily goals and quests are unioned, and the review schedule keeps
 * whichever device reviewed a question last. Streaks are derived from the merged days.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui;
  var Y = (DA.sync = {});

  /* ================================================================ merge */

  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  Y.merge = function (a, b) {
    a = ui.sanitize(a); b = ui.sanitize(b);
    var out = copy(a);

    // Profile: keep this device's choices once it has a background; a fresh device takes the other one's.
    if (!a.profile.bg && b.profile.bg) out.profile = copy(b.profile);

    Object.keys(b.done).forEach(function (id) { out.done[id] = true; });
    Object.keys(b.sheets || {}).forEach(function (id) { out.sheets = out.sheets || {}; out.sheets[id] = true; });
    Object.keys(b.sql).forEach(function (id) { out.sql[id] = true; });
    Object.keys(b.quiz).forEach(function (id) {
      if (!out.quiz[id] || (b.quiz[id].ok && !out.quiz[id].ok)) out.quiz[id] = copy(b.quiz[id]);
    });
    Object.keys(b.notes).forEach(function (id) {
      var n = out.notes[id], m = b.notes[id]; // the longer note wins; a fixed tie-break keeps both devices in agreement
      if (!n || m.length > n.length || (m.length === n.length && m > n)) out.notes[id] = m;
    });
    Object.keys(b.xp).forEach(function (k) {
      if (!out.xp[k] || b.xp[k].n > out.xp[k].n) out.xp[k] = copy(b.xp[k]);
    });
    Object.keys(b.met).forEach(function (d) { out.met[d] = true; });
    Object.keys(b.quests).forEach(function (d) {
      var o = out.quests[d] || (out.quests[d] = {}), q = b.quests[d];
      ['lesson', 'drill', 'sql'].forEach(function (n) { if (q[n]) o[n] = true; });
      if (q.chest && (!o.chest || q.chest > o.chest)) o.chest = q.chest;
    });
    Object.keys(b.srs).forEach(function (id) {
      if (!out.srs[id] || b.srs[id].t > out.srs[id].t) out.srs[id] = copy(b.srs[id]);
    });
    Object.keys(b.badges).forEach(function (id) {
      if (!out.badges[id] || b.badges[id] < out.badges[id]) out.badges[id] = b.badges[id];
    });
    Object.keys(out.stats).forEach(function (k) { out.stats[k] = Math.max(out.stats[k], b.stats[k]); });
    Object.keys(b.seen).forEach(function (k) { out.seen[k] = true; });
    Object.keys(b.cards).forEach(function (id) { if (!out.cards[id] || b.cards[id] < out.cards[id]) out.cards[id] = b.cards[id]; });
    Object.keys(b.saved).forEach(function (id) { out.saved[id] = true; });
    Object.keys(b.blocks).forEach(function (id) { out.blocks[id] = Math.max(out.blocks[id] || 0, b.blocks[id]); });
    Object.keys(b.repaired).forEach(function (d) { out.repaired[d] = true; });
    out.boost = Math.max(a.boost, b.boost);
    out.v = 2;
    return ui.sanitize(out);
  };

  /* ================================================================ transfer code */

  function toB64Url(bytes) {
    var s = '', i, CH = 0x8000;
    for (i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64Url(text) {
    var b = text.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var s = atob(b), out = new Uint8Array(s.length), i;
    for (i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function pipe(bytes, stream) {
    var w = stream.writable.getWriter(), ignore = function () { /* the failure is reported through the readable side */ };
    w.write(bytes).catch(ignore); w.close().catch(ignore);
    return new Response(stream.readable).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }

  Y.canCompress = function () { return typeof CompressionStream !== 'undefined' && typeof Response !== 'undefined'; };

  // Returns a promise of a text such as "DAP2.H4sIA…".
  Y.encode = function (state) {
    var bytes = new TextEncoder().encode(JSON.stringify({ app: 'data-analyst-path', v: 2, state: state || ui.state }));
    if (Y.canCompress()) return pipe(bytes, new CompressionStream('gzip')).then(function (z) { return 'DAP2.' + toB64Url(z); });
    return Promise.resolve('DAP1.' + toB64Url(bytes));
  };

  // Returns a promise of the decoded state object, or rejects with an Error that explains what is wrong.
  Y.decode = function (text) {
    return new Promise(function (resolve, reject) {
      var t = String(text || '').replace(/\s+/g, ''), m = t.match(/^DAP([12])\.([A-Za-z0-9_-]+)$/);
      if (!m) { reject(new Error('That does not look like a transfer code. It should start with DAP2.')); return; }
      var bytes;
      try { bytes = fromB64Url(m[2]); } catch (e) { reject(new Error('The code is damaged: copy it again, in full.')); return; }
      function parse(b) {
        try {
          var obj = JSON.parse(new TextDecoder().decode(b));
          if (!obj || obj.app !== 'data-analyst-path' || !obj.state) throw new Error('x');
          resolve(obj.state);
        } catch (e) { reject(new Error('The code is damaged: copy it again, in full.')); }
      }
      if (m[1] === '1') parse(bytes);
      else if (!Y.canCompress() || typeof DecompressionStream === 'undefined') reject(new Error('This browser cannot read compressed codes. Use the file export instead.'));
      else pipe(bytes, new DecompressionStream('gzip')).then(parse, function () { reject(new Error('The code is damaged: copy it again, in full.')); });
    });
  };

  // Merges a decoded state into this device, saves, and returns a short summary for the user.
  Y.apply = function (remote) {
    var before = { lessons: Object.keys(ui.state.done).length, xp: DA.game.totalXp() };
    ui.state = Y.merge(ui.state, remote);
    ui.save();
    return { lessons: Object.keys(ui.state.done).length - before.lessons, xp: DA.game.totalXp() - before.xp };
  };

  /* ================================================================ daily reminder (calendar file) */

  function fold(line) {
    var out = [], i = 0;
    while (line.length - i > 73) { out.push(line.substr(i, i ? 72 : 73)); i += i ? 72 : 73; }
    out.push(line.substr(i));
    return out.join('\r\n ');
  }
  function esc(t) { return t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }

  // A repeating daily event with an alarm, as an .ics file that phone and desktop calendars understand.
  Y.ics = function (hhmm, url) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '19:00'), hh = m ? Math.min(23, +m[1]) : 19, mm = m ? Math.min(59, +m[2]) : 0;
    var now = ui.now(), day = ui.today();
    if (now.getHours() * 60 + now.getMinutes() >= hh * 60 + mm) day = ui.addDays(day, 1);
    var stamp = now.getUTCFullYear() + p2(now.getUTCMonth() + 1) + p2(now.getUTCDate()) + 'T' + p2(now.getUTCHours()) + p2(now.getUTCMinutes()) + '00Z';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Data Analyst Path//Daily reminder//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:daily-reminder@data-analyst-path', 'DTSTAMP:' + stamp,
      'DTSTART:' + day.replace(/-/g, '') + 'T' + p2(hh) + p2(mm) + '00', 'DURATION:PT15M', 'RRULE:FREQ=DAILY',
      'SUMMARY:' + esc('Data Analyst Path: your daily session'),
      'DESCRIPTION:' + esc('Ten minutes keeps the streak: one lesson, one practice round or one SQL challenge.'),
      url ? 'URL:' + url : '',
      'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc('Time for your daily data session'), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].filter(Boolean);
    return lines.map(fold).join('\r\n') + '\r\n';
  };
})();
