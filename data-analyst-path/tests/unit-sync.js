'use strict';
const assert = require('assert');
const { DA, setDay, test } = require('./harness');
const ui = DA.ui, G = DA.game, Y = DA.sync;
const clone = (o) => JSON.parse(JSON.stringify(o));

// Two devices that worked on different things, on overlapping days.
function twoDevices() {
  const phone = ui.sanitize({ v: 2, profile: { bg: 'sport', dailyGoal: 20, theme: 'dark' } });
  phone.done['l0-1'] = true; phone.done['l1-1'] = true; phone.sql.r1 = true;
  phone.xp['lesson:l0-1'] = { d: '2026-11-07', n: 30 }; phone.xp['lesson:l1-1'] = { d: '2026-11-08', n: 60 }; phone.xp['sql:r1'] = { d: '2026-11-08', n: 15 };
  phone.met['2026-11-07'] = true; phone.met['2026-11-08'] = true;
  phone.quests['2026-11-08'] = { lesson: true, sql: true };
  phone.srs.x01 = { box: 2, due: '2026-11-11', t: 1000 }; phone.srs.x02 = { box: 1, due: '2026-11-09', t: 5000 };
  phone.notes['l0-1'] = 'short note about this lesson'; phone.stats.drills = 3; phone.stats.bestCombo = 4;
  phone.badges['first-lesson'] = '2026-11-07'; phone.quiz['l0-1'] = { sel: 0, ok: false };
  const laptop = ui.sanitize({ v: 2, profile: { bg: 'finance', dailyGoal: 80 } });
  laptop.done['l0-1'] = true; laptop.done['l2-1'] = true;
  laptop.xp['lesson:l0-1'] = { d: '2026-11-07', n: 30 }; laptop.xp['lesson:l2-1'] = { d: '2026-11-09', n: 50 };
  laptop.met['2026-11-08'] = true; laptop.met['2026-11-09'] = true;
  laptop.quests['2026-11-08'] = { drill: true, chest: 22 };
  laptop.srs.x01 = { box: 3, due: '2026-11-16', t: 3000 }; laptop.srs.x02 = { box: 4, due: '2026-11-30', t: 2000 };
  laptop.notes['l0-1'] = 'a longer note written on the laptop about this lesson'; laptop.stats.drills = 7; laptop.stats.bestCombo = 2;
  laptop.badges['first-lesson'] = '2026-11-06'; laptop.quiz['l0-1'] = { sel: 1, ok: true };
  return { phone, laptop };
}

test('merge keeps everything from both devices and never double-counts XP', () => {
  const { phone, laptop } = twoDevices();
  const m = Y.merge(phone, laptop);
  assert.deepStrictEqual(Object.keys(m.done).sort(), ['l0-1', 'l1-1', 'l2-1']);
  assert.deepStrictEqual(Object.keys(m.sql), ['r1']);
  // the shared lesson counts once: 30 + 60 + 15 + 50
  const total = Object.values(m.xp).reduce((t, e) => t + e.n, 0);
  assert.strictEqual(total, 155);
  assert.deepStrictEqual(Object.keys(m.met).sort(), ['2026-11-07', '2026-11-08', '2026-11-09']);
  assert.deepStrictEqual(m.quests['2026-11-08'], { lesson: true, sql: true, drill: true, chest: 22 });
  assert.strictEqual(m.srs.x01.box, 3, 'review state from the device that reviewed last (t=3000)');
  assert.strictEqual(m.srs.x02.box, 1, 'phone reviewed x02 later (t=5000)');
  assert.ok(m.notes['l0-1'].includes('laptop'), 'the longer note wins');
  assert.strictEqual(m.stats.drills, 7); assert.strictEqual(m.stats.bestCombo, 4);
  assert.strictEqual(m.badges['first-lesson'], '2026-11-06', 'earliest date wins');
  assert.strictEqual(m.quiz['l0-1'].ok, true, 'a correct answer beats a wrong one');
  assert.strictEqual(m.profile.bg, 'sport', 'this device keeps its own profile');
  assert.strictEqual(m.profile.dailyGoal, 20);
});

test('merge is idempotent and commutative (for the progress data)', () => {
  const { phone, laptop } = twoDevices();
  laptop.profile = clone(phone.profile); // same profile so the comparison covers everything
  const ab = Y.merge(phone, laptop), ba = Y.merge(laptop, phone), aa = Y.merge(ab, ab);
  assert.deepStrictEqual(ab, ba);
  assert.deepStrictEqual(aa, ab);
  assert.deepStrictEqual(Y.merge(ab, phone), ab, 'merging old data back in changes nothing');
});

test('a fresh device adopts the other device\'s profile', () => {
  const { phone } = twoDevices();
  const m = Y.merge(ui.sanitize({ v: 2 }), phone);
  assert.strictEqual(m.profile.bg, 'sport'); assert.strictEqual(m.profile.dailyGoal, 20); assert.strictEqual(m.profile.theme, 'dark');
});

test('streaks come out right after a merge (derived from the merged days)', () => {
  const { phone, laptop } = twoDevices();
  ui.state = Y.merge(phone, laptop);
  assert.strictEqual(G.streak().count, 3); // 7, 8, 9 Nov, today is the 9th
});

test('transfer code round-trips, and compresses when the platform can', async () => {
  const { phone, laptop } = twoDevices();
  const state = Y.merge(phone, laptop);
  const code = await Y.encode(state);
  assert.ok(/^DAP[12]\.[A-Za-z0-9_-]+$/.test(code), code.slice(0, 20));
  const back = await Y.decode(code);
  assert.deepStrictEqual(ui.sanitize(back), state);
  assert.deepStrictEqual(ui.sanitize(await Y.decode(code.replace(/(.{40})/g, '$1\n  '))), state, 'whitespace and line breaks are ignored');
  if (Y.canCompress()) {
    const plain = JSON.stringify({ app: 'data-analyst-path', v: 2, state }).length;
    assert.ok(code.length < plain * 0.9, 'compressed code (' + code.length + ') is shorter than the JSON (' + plain + ')');
  }
});

test('a big state still makes a code that can be pasted (under 40 KB)', async () => {
  const s = ui.sanitize({ v: 2 });
  for (let i = 0; i < 600; i++) s.xp['drill:' + (1700000000000 + i * 86400)] = { d: ui.addDays('2025-01-01', i % 365), n: 40 + (i % 20) };
  DA.lessons.forEach((l) => { s.notes[l.id] = 'My notes about ' + l.title + '. '.repeat(30); s.done[l.id] = true; });
  DA.bank = null; DA.drill.bank().forEach((q) => { s.srs[q.id] = { box: 3, due: '2026-12-01', t: 1700000000000 }; });
  const code = await Y.encode(s);
  assert.ok(code.length < 40000, 'code length ' + code.length);
  assert.deepStrictEqual(ui.sanitize(await Y.decode(code)), s);
});

test('bad codes are rejected with a helpful message', async () => {
  for (const bad of ['', 'hello', 'DAP2.', 'DAP3.abc', 'DAP1.!!!', 'DAP1.' + Buffer.from('{"not":"ours"}').toString('base64url'), 'DAP2.' + Buffer.from('not gzip').toString('base64url')]) {
    await assert.rejects(() => Y.decode(bad), /transfer code|damaged|cannot read/i, JSON.stringify(bad));
  }
});

test('apply merges into this device and reports what was gained', async () => {
  const { phone, laptop } = twoDevices();
  ui.state = clone(phone);
  const r = Y.apply(laptop);
  assert.strictEqual(r.lessons, 1); assert.strictEqual(r.xp, 50);
  assert.ok(ui.state.done['l2-1'] && ui.state.done['l1-1']);
});

test('calendar reminder is a valid daily-repeating event', () => {
  setDay('2026-11-09'); // 12:00 local
  const ics = Y.ics('19:00', 'https://example.com/torchnep/analyst/index.html');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY') && ics.includes('BEGIN:VALARM'));
  assert.ok(ics.includes('DTSTART:20261109T190000'), 'later today');
  assert.ok(Y.ics('08:30').includes('DTSTART:20261110T083000'), 'time already passed: starts tomorrow');
  ics.split('\r\n').forEach((line) => assert.ok(Buffer.byteLength(line) <= 75, 'line too long: ' + line));
  assert.ok(!/[^\r]\n/.test(ics), 'CRLF line endings only');
  assert.ok(ics.replace(/\r\n /g, '').includes('URL:https://example.com/torchnep/analyst/index.html'), 'folded URL unfolds correctly');
  assert.ok(Y.ics('7:5x').includes('T190000'), 'invalid time falls back to 19:00');
});
