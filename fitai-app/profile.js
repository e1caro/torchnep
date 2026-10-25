'use strict';
// The player's profile at a glance, on Hero and the same for friends (cloud.js shares it): a few big numbers that sum up
// the whole journey, this week's progress window, and the badges earned. Built from a summary object, so a friend's
// profile (their shared summary) draws exactly like yours.

// weeks in a row (counting back from last week, plus this one if already met) that hit the weekly workout goal
function weeksOnGoal() {
  const goal = S.profile?.days || 3;
  let n = weekStats(weekStart()).n >= goal ? 1 : 0;
  for (let ws = weekStart() - WEEK; ; ws -= WEEK) { if (weekStats(ws).n >= goal) n++; else break; if (n > 520) break; }
  return n;
}
function profileSummary() {
  const w = weekStats(weekStart()), goal = S.profile?.days || 3, prev = weekStats(weekStart() - WEEK, Date.now() - weekStart());
  const sp = typeof SP === 'object' && SP.cur && typeof roleOf === 'function' ? (r => r && { sport: SP.cur, ovr: ovrOf(r), pos: r.name, club: clubName() })(roleOf(SP.cur)) : null;
  return {
    name: S.profile?.name || '', lvl: lvl(), xp: G.xp, title: title(), avatar: G.avatar, frame: G.frame, banner: G.banner, skin: G.skin,
    workouts: S.history.length, minutes: S.history.reduce((a, h) => a + (h.dur || 0), 0), kg: Math.round(totalVol()), streak: streak(), weeks: weeksOnGoal(),
    badges: G.ach.length, ach: [...G.ach], sp,
    week: { ws: weekStart(), days: w.days, n: w.n, goal, min: w.min, kg: Math.round(w.kg), prs: w.prs.length, grade: grade(w, goal, prev) },
  };
}

function profileShow(p, own = true) {
  const hrs = (p.minutes || 0) / 60;
  const tile = (ico, v, l) => `<div class="pstat">${gi(ico, 'hero')}<b>${v}</b><span>${l}</span></div>`;
  // this week's window; a friend's summary from an earlier week shows an empty week
  const wk = p.week && p.week.ws === weekStart() ? p.week : { days: Array(7).fill(false), n: 0, goal: p.week?.goal || 3, min: 0, kg: 0, prs: 0, grade: '—' };
  const today = (new Date().getDay() + 6) % 7, wd = [...Array(7)].map((_, i) => new Date(weekStart() + i * 864e5).toLocaleDateString(LANG, { weekday: 'narrow' }));
  const got = (p.ach || []).map(id => ACH.find(a => a.id === id)).filter(Boolean);
  return `<div class="pstats">${tile('flame', p.streak || 0, 'day streak')}${tile('calendar', p.weeks || 0, 'weeks on goal')}${tile('lifter', p.workouts || 0, 'workouts')}${tile('stopwatch', hrs >= 10 ? Math.round(hrs) : hrs.toFixed(1), 'hours')}</div>
  <section class="card wkcard"><div class="row between"><h3>${gi('calendar', 'hero')} ${own ? 'Your week' : 'This week'}</h3><span class="wkgrade${wk.grade === 'S' ? ' s' : ''}">${wk.grade}</span></div>
    <div class="wkdays">${wk.days.map((x, i) => `<span class="${x ? 'on' : ''}${i === today ? ' now' : ''}"><i>${x ? '✓' : ''}</i><b>${wd[i]}</b></span>`).join('')}</div>
    <div class="wkstats"><div><b>${wk.n}<small>/${wk.goal}</small></b><span>workouts</span></div><div><b>${fmtN(wk.min)}</b><span>minutes</span></div>
      <div><b>${fmtN(wk.kg)}</b><span>kg lifted</span></div><div><b>${wk.prs}</b><span>records</span></div></div>
    <div class="qbar"><i style="width:${Math.min(100, wk.n / Math.max(1, wk.goal) * 100)}%"></i></div></section>
  <h2 class="sec">Badges · ${got.length}/${ACH.length}</h2>
  ${got.length ? `<div class="pbadges">${got.slice().reverse().map(a => `<div class="pbadge" title="${esc(a.d)}">${gi(a.i, 'hero')}<span>${a.n}</span></div>`).join('')}</div>` : '<div class="mut">No badges yet.</div>'}`;
}

if (typeof i18nAdd === 'function') {
  i18nAdd({ 'weeks on goal': 'semanas cumpliendo', hours: 'horas', 'No badges yet.': 'Aún no hay insignias.', 'This week': 'Esta semana', 'Badges · {n}/{n}': 'Insignias · {n}/{n}' });
}
