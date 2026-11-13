/* Dot & Co. datasets for the later worlds, generated from fixed seeds so every learner sees the same data:
 * "app" (ordering-app users and events, the Dot Club subscription and its invoices) and
 * "growth" (two email A/B tests and the support desk). Also the CSV files that DotPython and DotSheets load. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var U = DA.gen.util, cache = {};
  var CITIES = ['London', 'Madrid', 'Berlin', 'Lisbon', 'Paris'];
  var PLANS = [['basic', 4.99], ['plus', 8.99], ['family', 14.99]];
  function time(r, h0, h1) { var mins = Math.floor((h0 + r() * (h1 - h0)) * 60); return U.pad(Math.floor(mins / 60)) + ':' + U.pad(mins % 60); }
  function addMinutes(stamp, m) {
    var d = stamp.slice(0, 10), t = stamp.slice(11).split(':'), total = +t[0] * 60 + +t[1] + m, days = Math.floor(total / 1440);
    total -= days * 1440;
    return U.addDays(d, days) + ' ' + U.pad(Math.floor(total / 60)) + ':' + U.pad(total % 60);
  }
  function monthAdd(ym, n) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + U.pad(m + 1); }

  DA.gen.app = function () {
    if (cache.app) return cache.app;
    var r = U.rng(2025), users = [], events = [], members = [], invoices = [], sid = 0, eid = 0, mid = 0, iid = 0;
    for (var u = 1; u <= 1200; u++) {
      var platform = ['ios', 'android', 'web'][U.pickWeighted(r, [42, 38, 20])];
      users.push([u, U.addDays('2025-01-01', Math.floor(r() * 300)), platform, CITIES[U.pickWeighted(r, [30, 25, 20, 15, 10])], ['organic', 'friend', 'ads'][U.pickWeighted(r, [50, 20, 30])]]);
    }
    users.forEach(function (us) {
      var nSess = 1 + Math.floor(-Math.log(1 - r() * 0.98) * 2.2), web = us[2] === 'web';
      for (var k = 0; k < nSess; k++) {
        var day = U.addDays(us[1], Math.floor(r() * 60) + k * 3);
        if (day > '2025-12-31') break;
        sid++;
        var t = day + ' ' + time(r, 7, 21), steps = ['open_app'];
        if (r() < 0.86) { steps.push('view_menu'); if (r() < 0.55) { steps.push('add_to_cart'); if (r() < (web ? 0.55 : 0.72)) { steps.push('checkout'); if (r() < 0.88) steps.push('purchase'); } } }
        steps.forEach(function (name) { eid++; events.push([eid, us[0], sid, t, name]); t = addMinutes(t, 1 + Math.floor(r() * 4)); });
      }
      if (r() < 0.35 && us[1] < '2025-11-15') {
        mid++;
        var pi = U.pickWeighted(r, [50, 35, 15]), plan = PLANS[pi], start = U.addDays(us[1], 3 + Math.floor(r() * 40));
        if (start > '2025-11-30') start = '2025-11-30';
        var churn = [0.08, 0.05, 0.03][pi], ym = start.slice(0, 7), cancel = null;
        while (ym <= '2025-12') {
          iid++;
          invoices.push([iid, mid, ym, plan[1], r() < 0.97 ? 1 : 0]);
          if (r() < churn && ym < '2025-12') { cancel = monthAdd(ym, 1) + '-' + U.pad(1 + Math.floor(r() * 27)); break; }
          ym = monthAdd(ym, 1);
        }
        members.push([mid, us[0], plan[0], start, cancel, plan[1]]);
      }
    });
    return (cache.app = { users: users, events: events, members: members, plans: PLANS.map(function (p) { return p.slice(); }), invoices: invoices });
  };

  var AGENTS = ['Ada', 'Bruno', 'Chen', 'Dara', 'Elif', 'Femi', 'Greta', 'Hugo', 'Ines', 'Jonas', 'Kemi', 'Lucas'];
  DA.gen.growth = function () {
    if (cache.growth) return cache.growth;
    var r = U.rng(777), assignments = [], conversions = [], tickets = [];
    var campaigns = [[1, 'Welcome email test', 'email', '2025-09-01', '2025-09-30'], [2, 'Autumn menu push', 'push', '2025-10-01', '2025-10-21'],
      [3, 'Bring a friend', 'in_app', '2025-10-15', '2025-11-15'], [4, 'Black Friday subject line', 'email', '2025-11-24', '2025-11-30']];
    function test(cid, n, start, rates, first) {
      for (var u = first; u < first + n; u++) {
        var v = r() < 0.5 ? 'A' : 'B', day = U.addDays(start, Math.floor(r() * 6));
        assignments.push([u, cid, v, day]);
        if (r() < rates[v === 'A' ? 0 : 1]) conversions.push([u, cid, U.addDays(day, Math.floor(r() * 7)), U.round(Math.max(3, 12 + U.normal(r) * 3.5), 2)]);
      }
    }
    test(1, 4000, '2025-09-01', [0.080, 0.098], 1);
    test(4, 3000, '2025-11-24', [0.050, 0.053], 5001);
    var CH = [['email', 'Email', 'email ', ' EMAIL'], ['chat', 'Chat', ' chat', 'CHAT'], ['phone', 'Phone', 'phone ']];
    var CAT = ['billing', 'app bug', 'order issue', 'account', null];
    var HOURS = { low: 30, medium: 14, high: 5 };
    for (var t = 1; t <= 1200; t++) {
      var created = U.addDays('2025-07-01', Math.floor(r() * 168)) + ' ' + time(r, 8, 20);
      var pr = ['low', 'medium', 'high'][U.pickWeighted(r, [50, 35, 15])];
      var chi = U.pickWeighted(r, [45, 35, 20]), chv = CH[chi][U.pickWeighted(r, chi === 2 ? [60, 30, 10] : [55, 25, 12, 8])];
      var cat = CAT[U.pickWeighted(r, [30, 22, 28, 14, 6])];
      var hours = Math.max(0.2, HOURS[pr] * Math.exp(U.normal(r) * 0.6));
      var resolved = r() < 0.06 ? null : addMinutes(created, Math.round(hours * 60));
      var csat = resolved && r() < 0.7 ? Math.max(1, Math.min(5, Math.round(4.6 - hours / 18 + U.normal(r) * 0.8))) : null;
      tickets.push([t, created, resolved, chv, cat, r() < 0.04 ? pr.toUpperCase() : pr, csat, 1 + Math.floor(r() * 12)]);
    }
    var agents = AGENTS.map(function (n, i) { return [i + 1, n, i < 8 ? 'Tier 1' : 'Tier 2']; });
    return (cache.growth = { campaigns: campaigns, assignments: assignments, conversions: conversions, tickets: tickets, agents: agents });
  };

  DA.datasets.app = {
    id: 'app',
    title: 'Dot & Co. app and Dot Club',
    short: 'App and club',
    blurb: 'The ordering app: 1,200 users, every session as a funnel of events, and the Dot Club coffee subscription with its monthly invoices. Good for product, funnel and retention questions.',
    tables: [
      { name: 'users', note: 'one row per app user', cols: [['user_id', 'INTEGER', 'primary key'], ['signup_date', 'TEXT', 'YYYY-MM-DD'], ['platform', 'TEXT', 'ios, android, web'], ['city', 'TEXT'], ['referral', 'TEXT', 'organic, friend, ads']] },
      { name: 'events', note: 'one row per event in a session', cols: [['event_id', 'INTEGER', 'primary key'], ['user_id', 'INTEGER', '→ users'], ['session_id', 'INTEGER'], ['event_time', 'TEXT', 'YYYY-MM-DD HH:MM'], ['event_name', 'TEXT', 'open_app, view_menu, add_to_cart, checkout, purchase']] },
      { name: 'members', note: 'one row per Dot Club member', cols: [['member_id', 'INTEGER', 'primary key'], ['user_id', 'INTEGER', '→ users'], ['plan', 'TEXT', '→ plans'], ['start_date', 'TEXT', 'YYYY-MM-DD'], ['cancel_date', 'TEXT', 'NULL while active'], ['monthly_price', 'REAL']] },
      { name: 'plans', note: 'one row per plan', cols: [['plan', 'TEXT', 'primary key'], ['monthly_price', 'REAL']] },
      { name: 'invoices', note: 'one row per member per month', cols: [['invoice_id', 'INTEGER', 'primary key'], ['member_id', 'INTEGER', '→ members'], ['month', 'TEXT', 'YYYY-MM'], ['amount', 'REAL'], ['paid', 'INTEGER', '1 paid, 0 failed']] },
    ],
    data: function () { return DA.gen.app(); },
  };
  DA.datasets.growth = {
    id: 'growth',
    title: 'Dot & Co. growth and support',
    short: 'Growth and support',
    blurb: 'Marketing campaigns with two A/B tests (who saw which version, who bought), and 1,200 support tickets typed by busy people: inconsistent channels, missing categories, open tickets. Good for experiments and cleaning.',
    tables: [
      { name: 'campaigns', note: 'one row per campaign', cols: [['campaign_id', 'INTEGER', 'primary key'], ['name', 'TEXT'], ['channel', 'TEXT'], ['start_date', 'TEXT'], ['end_date', 'TEXT']] },
      { name: 'assignments', note: 'who saw which version of a test', cols: [['user_id', 'INTEGER'], ['campaign_id', 'INTEGER', '→ campaigns'], ['variant', 'TEXT', 'A or B'], ['assigned_date', 'TEXT']] },
      { name: 'conversions', note: 'one row per user who bought after a campaign', cols: [['user_id', 'INTEGER'], ['campaign_id', 'INTEGER', '→ campaigns'], ['converted_date', 'TEXT'], ['revenue', 'REAL']] },
      { name: 'tickets', note: 'one row per support ticket (messy)', cols: [['ticket_id', 'INTEGER', 'primary key'], ['created_at', 'TEXT', 'YYYY-MM-DD HH:MM'], ['resolved_at', 'TEXT', 'NULL while open'], ['channel', 'TEXT', 'typed by hand'], ['category', 'TEXT', 'sometimes NULL'], ['priority', 'TEXT', 'low, medium, high'], ['csat', 'INTEGER', '1 to 5, often NULL'], ['agent_id', 'INTEGER', '→ agents']] },
      { name: 'agents', note: 'one row per support agent', cols: [['agent_id', 'INTEGER', 'primary key'], ['name', 'TEXT'], ['team', 'TEXT']] },
    ],
    data: function () { return DA.gen.growth(); },
  };

  /* ---------- CSV files for DotPython and DotSheets ---------- */
  var csv = {};
  function once(name, fn) { return function () { return csv[name] || (csv[name] = fn()); }; }
  DA.gen.csv = {
    'users.csv': once('users', function () { return U.toCsv(['user_id', 'signup_date', 'platform', 'city', 'referral'], DA.gen.app().users); }),
    'events.csv': once('events', function () { return U.toCsv(['event_id', 'user_id', 'session_id', 'event_time', 'event_name'], DA.gen.app().events); }),
    'members.csv': once('members', function () { return U.toCsv(['member_id', 'user_id', 'plan', 'start_date', 'cancel_date', 'monthly_price'], DA.gen.app().members); }),
    'invoices.csv': once('invoices', function () { return U.toCsv(['invoice_id', 'member_id', 'month', 'amount', 'paid'], DA.gen.app().invoices); }),
    'ab_test.csv': once('ab', function () {
      var g = DA.gen.growth(), bought = {};
      g.conversions.forEach(function (c) { if (c[1] === 1) bought[c[0]] = c[3]; });
      return U.toCsv(['user_id', 'variant', 'assigned_date', 'converted', 'revenue'], g.assignments.filter(function (a) { return a[1] === 1; }).map(function (a) {
        return [a[0], a[2], a[3], bought[a[0]] !== undefined ? 1 : 0, bought[a[0]] !== undefined ? bought[a[0]] : 0];
      }));
    }),
    'tickets.csv': once('tickets', function () { return U.toCsv(['ticket_id', 'created_at', 'resolved_at', 'channel', 'category', 'priority', 'csat', 'agent_id'], DA.gen.growth().tickets); }),
    'funnel_sample.csv': once('funnel', function () {
      var a = DA.gen.app(), plat = {};
      a.users.forEach(function (u) { plat[u[0]] = u[2]; });
      return U.toCsv(['event_id', 'user_id', 'session_id', 'event_time', 'event_name', 'platform'], a.events.slice(0, 499).map(function (e) { return e.concat([plat[e[1]]]); }));
    }),
  };
})();
