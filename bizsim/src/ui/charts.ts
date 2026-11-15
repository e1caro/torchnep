// ECharts options for every chart. One axis per chart, thin marks, a legend whenever there are two or more
// series, tooltips everywhere, and colours taken from the validated palette in fmt.ts.

import { isoDate } from '../engine/table';
import type { Lang } from '../engine/types';
import type { Key } from '../i18n';
import type { Theme } from '../store';
import type { DashResult } from '../worker/protocol';
import { INK, SEQ, SERIES, compact, dateShort, int, money, moneyC, pct } from './fmt';

export interface Ctx { theme: Theme; lang: Lang; accent: string; t: (k: Key, v?: Record<string, string | number>) => string; narrow: boolean }

const base = (c: Ctx, legend = false) => {
  const k = INK[c.theme];
  return {
    animationDuration: 350, animationDurationUpdate: 350, textStyle: { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', color: k.ink2 },
    grid: { left: 8, right: 14, top: legend ? (c.narrow ? 58 : 34) : 14, bottom: 4, containLabel: true },
    legend: legend ? { top: 0, left: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 4, itemGap: 16, textStyle: { color: k.ink2, fontSize: 12 } } : undefined,
    tooltip: { trigger: 'axis', backgroundColor: k.surface, borderColor: k.axis, borderWidth: 1, padding: [8, 10], textStyle: { color: k.ink, fontSize: 12 }, axisPointer: { type: 'line', lineStyle: { color: k.muted, width: 1 } }, confine: true },
  };
};
const catAxis = (c: Ctx, data: (string | number)[], extra: object = {}) => ({ type: 'category', data, axisLine: { lineStyle: { color: INK[c.theme].axis } }, axisTick: { show: false }, axisLabel: { color: INK[c.theme].muted, fontSize: 11, hideOverlap: true }, ...extra });
const valAxis = (c: Ctx, fmt: (v: number) => string, extra: object = {}) => ({ type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: INK[c.theme].grid } }, axisLabel: { color: INK[c.theme].muted, fontSize: 11, formatter: fmt }, splitNumber: 4, ...extra });
const eur = (c: Ctx) => (v: number) => `${compact(v, c.lang)} €`;
const line = (name: string, data: unknown[], color: string, o: object = {}) => ({ name, type: 'line', data, showSymbol: false, lineStyle: { width: 2, color }, itemStyle: { color }, emphasis: { disabled: true }, ...o });
const bar = (data: unknown[], color: string, horizontal = false, o: object = {}) => ({ type: 'bar', data, barMaxWidth: 22, itemStyle: { color, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] }, ...o });
const other = (c: Ctx) => (c.accent === SERIES[c.theme][1] ? SERIES[c.theme][0] : SERIES[c.theme][1]);

export function revenue(d: DashResult, c: Ctx, withProjection: boolean) {
  const n = d.daily.rev.length, proj = withProjection && d.to === d.day - 1 ? d.projection : null, extra = proj ? proj.base.length : 0;
  const dates = Array.from({ length: n + extra }, (_, i) => isoDate(d.start, d.from + i)), pad = new Array(n - 1).fill(null);
  const k = INK[c.theme], last = d.daily.ma7[n - 1];
  const series: object[] = [
    line(c.t('c_daily'), d.daily.rev, c.accent, { lineStyle: { width: 1, color: c.accent, opacity: 0.4 } }),
    line(c.t('c_ma7'), d.daily.ma7, c.accent, {
      markLine: d.changes.length ? { symbol: 'none', silent: true, label: { show: !c.narrow, formatter: (p: { name: string }) => p.name, color: k.muted, fontSize: 10 }, lineStyle: { color: k.muted, type: 'dashed', width: 1 }, data: dedupe(d.changes.map(ch => ({ name: paramName(ch.param, c), xAxis: isoDate(d.start, ch.day) }))) } : undefined,
    }),
  ];
  if (proj) {
    series.push(line(c.t('c_projNow'), [...pad, last, ...proj.base], k.muted, { lineStyle: { width: 2, type: 'dashed', color: k.muted } }));
    if (proj.alt) series.push(line(c.t('c_projNew'), [...pad, last, ...proj.alt], other(c), { lineStyle: { width: 2, type: 'dashed', color: other(c) } }));
  }
  return { ...base(c, true), xAxis: catAxis(c, dates, { axisLabel: { color: k.muted, fontSize: 11, formatter: (v: string) => dateShort(v, c.lang), hideOverlap: true }, boundaryGap: false }), yAxis: valAxis(c, eur(c)), series, tooltip: { ...base(c).tooltip, valueFormatter: (v: number) => (v == null ? '–' : money(v, c.lang)) } };
}
const paramName = (p: string, c: Ctx) => (p.startsWith('price:') ? c.t('price') : c.t(`p_${p}` as Key));
const dedupe = (a: { name: string; xAxis: string }[]) => { const seen = new Map<string, { name: string; xAxis: string }>(); for (const x of a) { const e = seen.get(x.xAxis); if (e) e.name = e.name.includes(x.name) ? e.name : `${e.name}, ${x.name}`; else seen.set(x.xAxis, { ...x }); } return [...seen.values()]; };

export function hbars(names: string[], values: number[], c: Ctx, fmt: (v: number) => string, color = c.accent) {
  const k = INK[c.theme], maxLen = c.narrow ? 40 : 26, cut = (v: string) => (v.length > maxLen ? v.slice(0, maxLen - 1) + '…' : v);
  return {
    ...base(c), grid: c.narrow ? { left: 4, right: 64, top: 16, bottom: 0 } : { left: 8, right: 56, top: 4, bottom: 4, containLabel: true },
    xAxis: valAxis(c, () => '', { splitLine: { show: false }, axisLabel: { show: false } }),
    yAxis: catAxis(c, names, { inverse: true, axisLine: { show: false }, z: 3, axisLabel: c.narrow ? { inside: true, margin: 0, verticalAlign: 'bottom', padding: [0, 0, 8, 0], color: k.ink2, fontSize: 12, formatter: cut } : { color: k.ink2, fontSize: 12, formatter: cut } }),
    series: [bar(values, color, true, { ...(c.narrow ? { barWidth: 10 } : {}), label: { show: true, position: 'right', color: k.ink2, fontSize: 11, formatter: (p: { value: number }) => fmt(p.value) } })],
    tooltip: { ...base(c).tooltip, trigger: 'item', formatter: (p: { name: string; value: number }) => `${p.name}<br><b>${fmt(p.value)}</b>` },
  };
}
/** Height for a horizontal bar chart of n rows. */
export const hbarH = (n: number, c: Ctx) => 16 + n * (c.narrow ? 40 : 30);
export function vbars(names: string[], values: number[], c: Ctx, fmt: (v: number) => string, color = c.accent) {
  return { ...base(c), xAxis: catAxis(c, names), yAxis: valAxis(c, fmt), series: [bar(values, color)], tooltip: { ...base(c).tooltip, axisPointer: { type: 'shadow' }, valueFormatter: fmt } };
}

export function heat(d: DashResult, c: Ctx) {
  const k = INK[c.theme], hours: number[] = []; let max = 0;
  for (let h = 0; h < 24; h++) if (d.heat.some(r => r[h] > 0)) hours.push(h);
  const data: [number, number, number][] = [];
  d.heat.forEach((row, w) => hours.forEach((h, i) => { data.push([i, w, row[h]]); max = Math.max(max, row[h]); }));
  return {
    ...base(c), grid: { left: 8, right: 8, top: 4, bottom: 34, containLabel: true },
    xAxis: catAxis(c, hours.map(h => `${h}h`), { splitArea: { show: false }, axisLine: { show: false } }),
    yAxis: catAxis(c, [0, 1, 2, 3, 4, 5, 6].map(i => c.t(`wd${i}` as Key)), { inverse: true, axisLine: { show: false } }),
    visualMap: { min: 0, max: Math.max(1, max), calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, itemWidth: 10, inRange: { color: SEQ[c.theme] }, textStyle: { color: k.muted, fontSize: 11 } },
    series: [{ type: 'heatmap', data, itemStyle: { borderColor: k.surface, borderWidth: 2, borderRadius: 4 }, emphasis: { itemStyle: { borderColor: k.ink, borderWidth: 1 } } }],
    tooltip: { ...base(c).tooltip, trigger: 'item', formatter: (p: { value: [number, number, number] }) => `${c.t(`wd${p.value[1]}` as Key)} ${hours[p.value[0]]}:00<br><b>${p.value[2]}</b> ${c.t('tickets').toLowerCase()}` },
  };
}

export function pnl(d: DashResult, c: Ctx) {
  const k = INK[c.theme], names = d.pnl.map(p => c.t(`pnl_${p.key}` as Key)), help: (number | string)[] = [], vals: object[] = [];
  let run = 0;
  d.pnl.forEach((p, i) => {
    const isTotal = i === 0 || i === d.pnl.length - 1, v = p.value;
    const lo = isTotal ? Math.min(0, v) : Math.min(run, run + v);
    help.push(lo); vals.push({ value: Math.abs(v), raw: v, itemStyle: { color: isTotal ? (v >= 0 ? k.pos : k.neg) : k.neg, opacity: isTotal ? 1 : 0.75, borderRadius: 4 } });
    if (!isTotal) run += v; else if (i === 0) run = v;
  });
  return {
    ...base(c), xAxis: catAxis(c, names, { axisLabel: { color: k.muted, fontSize: 11, interval: 0, rotate: c.narrow ? 50 : 0 } }), yAxis: valAxis(c, eur(c)),
    series: [{ type: 'bar', stack: 'w', data: help, itemStyle: { color: 'transparent' }, emphasis: { disabled: true }, silent: true, tooltip: { show: false } },
    { type: 'bar', stack: 'w', data: vals, barMaxWidth: 34, label: { show: !c.narrow, position: 'top', color: k.ink2, fontSize: 10, formatter: (p: { data: { raw: number } }) => moneyC(p.data.raw, c.lang) } }],
    tooltip: { ...base(c).tooltip, trigger: 'item', formatter: (p: { name: string; data: { raw: number } }) => `${p.name}<br><b>${money(p.data.raw, c.lang)}</b><br>${pct(d.pnl[0].value ? Math.abs(p.data.raw) / d.pnl[0].value : 0, c.lang)} ${c.t('ofRevenue')}` },
  };
}

export function pareto(d: DashResult, c: Ctx) {
  const k = INK[c.theme], sold = d.products.filter(p => p.rev > 0), total = sold.reduce((a, p) => a + p.rev, 0) || 1, data: [number, number][] = [[0, 0]];
  let cum = 0, a80 = sold.length;
  sold.forEach((p, i) => { cum += p.rev; data.push([((i + 1) / sold.length) * 100, (cum / total) * 100]); if (a80 === sold.length && cum / total >= 0.8) a80 = i + 1; });
  const xA = (a80 / Math.max(1, sold.length)) * 100;
  return {
    option: {
      ...base(c), xAxis: { ...valAxis(c, v => `${v} %`), max: 100, name: '', splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: k.axis } } }, yAxis: { ...valAxis(c, v => `${v} %`), max: 100 },
      series: [line(c.t('cumShare'), data, c.accent, {
        areaStyle: { color: c.accent, opacity: 0.1 },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: k.muted, type: 'dashed', width: 1 }, label: { color: k.muted, fontSize: 10 }, data: [{ yAxis: 80, label: { formatter: '80 %' } }, { xAxis: xA, label: { formatter: 'A' } }] },
      })],
      tooltip: { ...base(c).tooltip, formatter: (p: { value: [number, number] }[]) => `${Math.round((p[0].value[0] / 100) * sold.length)} ${c.t('product').toLowerCase()}<br><b>${p[0].value[1].toFixed(1)} %</b> ${c.t('ofRevenue')}` },
    }, a80, n: sold.length,
  };
}

export function priceQty(d: DashResult, c: Ctx) {
  const k = INK[c.theme], ps = d.products.filter(p => p.units > 0).slice(0, 300), maxRev = Math.max(1, ...ps.map(p => p.rev));
  return {
    ...base(c), xAxis: { ...valAxis(c, v => `${v} €`), type: 'log', name: '', axisLine: { show: true, lineStyle: { color: k.axis } }, splitLine: { show: false } }, yAxis: { ...valAxis(c, v => compact(v, c.lang)), type: 'log' },
    series: [{ type: 'scatter', data: ps.map(p => ({ value: [p.price, p.units], name: p.name, rev: p.rev, cat: p.cat })), symbolSize: (_: unknown, p: { data: { rev: number } }) => 8 + 22 * Math.sqrt(p.data.rev / maxRev), itemStyle: { color: c.accent, opacity: 0.55, borderColor: k.surface, borderWidth: 2 } }],
    tooltip: { ...base(c).tooltip, trigger: 'item', formatter: (p: { data: { name: string; value: [number, number]; rev: number; cat: number } }) => `<b>${p.data.name}</b><br>${d.catNames[p.data.cat]}<br>${c.t('price')}: ${money(p.data.value[0], c.lang, 2)}<br>${c.t('units')}: ${int(p.data.value[1], c.lang)}<br>${c.t('revenue')}: ${money(p.data.rev, c.lang)}` },
  };
}

export function newReturning(d: DashResult, c: Ctx) {
  const s = SERIES[c.theme], k = INK[c.theme];
  const st = (name: string, data: number[], color: string, top: boolean) => ({ name, type: 'bar', stack: 'c', data, barMaxWidth: 26, itemStyle: { color, borderColor: k.surface, borderWidth: 1, borderRadius: top ? [4, 4, 0, 0] : 0 } });
  return { ...base(c, true), xAxis: catAxis(c, d.monthly.map(m => m.month)), yAxis: valAxis(c, v => compact(v, c.lang)), series: [st(c.t('k_ret'), d.monthly.map(m => m.retC), s[0], false), st(c.t('k_new'), d.monthly.map(m => m.newC), s[1], true)], tooltip: { ...base(c).tooltip, axisPointer: { type: 'shadow' } } };
}

export function cohorts(d: DashResult, c: Ctx) {
  const k = INK[c.theme], rows = d.cohorts, maxK = Math.max(1, ...rows.map(r => r.rate.length)), data: [number, number, number][] = [];
  let max = 0.05;
  rows.forEach((r, y) => r.rate.forEach((v, x) => { if (x > 0) { data.push([x - 1, y, Math.round(v * 1000) / 10]); max = Math.max(max, v); } }));
  return {
    ...base(c), grid: { left: 8, right: 8, top: 4, bottom: 4, containLabel: true },
    xAxis: catAxis(c, Array.from({ length: maxK - 1 }, (_, i) => `+${i + 1}`), { axisLine: { show: false }, position: 'top' }), yAxis: catAxis(c, rows.map(r => r.cohort), { inverse: true, axisLine: { show: false } }),
    visualMap: { show: false, min: 0, max: Math.ceil(max * 100), inRange: { color: SEQ[c.theme] } },
    series: [{ type: 'heatmap', data, label: { show: !c.narrow || maxK <= 8, fontSize: 10, color: k.ink, formatter: (p: { value: number[] }) => `${Math.round(p.value[2])}` }, itemStyle: { borderColor: k.surface, borderWidth: 2, borderRadius: 4 } }],
    tooltip: { ...base(c).tooltip, trigger: 'item', formatter: (p: { value: number[] }) => `${c.t('cohort')} ${rows[p.value[1]].cohort} · ${c.t('customersN', { n: rows[p.value[1]].size })}<br>+${p.value[0] + 1}: <b>${p.value[2]} %</b>` },
  };
}

export function forecast(d: DashResult, c: Ctx) {
  const f = d.forecast, dates = f.actual.map((_, i) => isoDate(d.start, f.day0 + i)), k = INK[c.theme];
  return {
    ...base(c, true), xAxis: catAxis(c, dates, { boundaryGap: false, axisLabel: { color: k.muted, fontSize: 11, formatter: (v: string) => dateShort(v, c.lang), hideOverlap: true } }), yAxis: valAxis(c, eur(c)),
    series: [line(c.t('c_actual'), f.actual, c.accent), line(c.t('c_forecastS'), f.forecast, other(c), { lineStyle: { width: 2, type: 'dashed', color: other(c) } })],
    tooltip: { ...base(c).tooltip, valueFormatter: (v: number) => (v == null ? '–' : money(v, c.lang)) },
  };
}

export function series1(d: DashResult, c: Ctx, values: number[], fmt: (v: number) => string, kind: 'line' | 'bar' = 'line', color = c.accent) {
  const dates = values.map((_, i) => isoDate(d.start, d.from + i)), k = INK[c.theme];
  return {
    ...base(c), xAxis: catAxis(c, dates, { boundaryGap: kind === 'bar', axisLabel: { color: k.muted, fontSize: 11, formatter: (v: string) => dateShort(v, c.lang), hideOverlap: true } }), yAxis: valAxis(c, fmt),
    series: [kind === 'line' ? line('', values, color, { areaStyle: { color, opacity: 0.08 } }) : { type: 'bar', data: values, itemStyle: { color, borderRadius: [2, 2, 0, 0] }, barCategoryGap: '20%' }],
    tooltip: { ...base(c).tooltip, valueFormatter: fmt },
  };
}

export function compareChart(items: { name: string; color: string; start: string; weeks: number[] }[], c: Ctx, indexed: boolean) {
  // align on the calendar: weeks are labelled by their first day
  const all = new Set<string>(); const maps = items.map(it => { const m = new Map<string, number>(); it.weeks.forEach((v, i) => { const k = isoDate(it.start, i * 7); m.set(k, v); all.add(k); }); return m; });
  const dates = [...all].sort(), k = INK[c.theme];
  // businesses start on different weekdays, so each value goes to the nearest label at or before its date
  const series = items.map((it, i) => {
    const first = it.weeks.find(v => v > 0) || 1, byIdx = new Map<number, number>();
    maps[i].forEach((v, key) => byIdx.set(dates.indexOf(key), indexed ? Math.round((v / first) * 1000) / 10 : v));
    return line(it.name, dates.map((_, x) => byIdx.get(x) ?? null), it.color, { connectNulls: true, endLabel: items.length <= 4 && !c.narrow ? { show: true, formatter: '{a}', color: k.ink2, fontSize: 11 } : undefined });
  });
  return { ...base(c, true), grid: { left: 8, right: items.length <= 4 && !c.narrow ? 110 : 14, top: 34, bottom: 4, containLabel: true }, xAxis: catAxis(c, dates, { boundaryGap: false, axisLabel: { color: k.muted, fontSize: 11, formatter: (v: string) => dateShort(v, c.lang), hideOverlap: true } }), yAxis: valAxis(c, indexed ? v => `${v}` : eur(c)), series, tooltip: { ...base(c).tooltip, valueFormatter: (v: number) => (v == null ? '–' : indexed ? v.toFixed(1) : money(v, c.lang)) } };
}
