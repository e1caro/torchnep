// KPIs and chart data computed from the generated tables. Money leaves this module in euros.

import { hoursOpen } from './params';
import type { Sim } from './sim';
import { NULL_INT, isoDate } from './table';
import type { Filters, Snapshot } from './types';

export interface Kpis {
  revenue: number; cogs: number; grossMargin: number; marginPct: number; transactions: number; avgTicket: number; units: number;
  netProfit: number; profitPct: number; visitors: number; conversion: number; walkouts: number;
  newCustomers: number; returningCustomers: number; retention: number | null; churn: number | null; clv: number; cac: number | null;
  inventoryTurnover: number; stockoutRate: number; salesPerM2: number; labourPct: number; breakEvenPerDay: number; breakEvenRatio: number;
  lostSales: number; wastePct: number; returnRate: number; cash: number; foodCostPct?: number; tableTurnover?: number;
  prev: { revenue: number; grossMargin: number; transactions: number; avgTicket: number; netProfit: number; conversion: number } | null;
}
export interface Dash {
  from: number; to: number; start: string; kpis: Kpis;
  daily: { rev: number[]; ma7: number[]; tx: number[]; profit: number[]; visitors: number[]; walkouts: number[]; stockouts: number[]; inventory: number[]; lost: number[]; waste: number[]; labour: number[]; cash: number[] };
  categories: { id: number; name: string; rev: number; margin: number; units: number }[];
  products: { id: number; name: string; cat: number; rev: number; units: number; margin: number; price: number; stock: number }[]; // sorted by revenue
  heat: number[][];          // 7 weekdays x 24 hours, tickets per open day
  monthly: { month: string; rev: number; margin: number; profit: number; newC: number; retC: number; labourPct: number }[];
  cohorts: { cohort: string; size: number; rate: number[] }[];
  rfm: { segment: string; customers: number; revenue: number; recency: number; frequency: number; monetary: number }[];
  pnl: { key: string; value: number }[];
  forecast: { day0: number; actual: (number | null)[]; forecast: (number | null)[]; mape: number | null };
  changes: { day: number; param: string; old: number; value: number }[];
  weekday: { rev: number; tx: number; walkouts: number }[];
  payments: { name: string; tx: number }[];
  channels: { name: string; rev: number; tx: number }[];
}

function txRange(sim: Sim, from: number, to: number): [number, number] {
  const date = sim.T.transactions.ints('date'), n = sim.T.transactions.n;
  const lower = (d: number) => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (date[m] < d) lo = m + 1; else hi = m; } return lo; };
  return [lower(from), lower(to + 1)];
}
function itemStart(sim: Sim, txRow: number): number {
  const tx = sim.T.transaction_items.ints('transaction_id'), n = sim.T.transaction_items.n;
  let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (tx[m] < txRow + 1) lo = m + 1; else hi = m; } return lo;
}
const sumRange = (a: Int32Array, from: number, to: number) => { let s = 0; for (let i = from; i <= to; i++) s += a[i]; return s; };
const E = (cents: number) => Math.round(cents) / 100;
const pct = (a: number, b: number) => (b ? a / b : 0);

interface Agg { rev: number; cogs: number; tx: number; units: number; storeTx: number }
/** Totals for a period with the category and channel filters applied (cents). */
function aggregate(sim: Sim, f: Filters, from: number, to: number, perDay?: { rev: Float64Array; tx: Int32Array }, each?: (txRow: number, itemRow: number, net: number, margin: number) => void): Agg {
  const TX = sim.T.transactions, IT = sim.T.transaction_items, [t0, t1] = txRange(sim, from, to);
  const ch = TX.ints('channel'), date = TX.ints('date');
  const itx = IT.ints('transaction_id'), ip = IT.ints('product_id'), iq = IT.ints('quantity'), il = IT.ints('line_total'), ic = IT.ints('unit_cost');
  const a: Agg = { rev: 0, cogs: 0, tx: 0, units: 0, storeTx: 0 };
  let i = itemStart(sim, t0);
  for (let t = t0; t < t1; t++) {
    const skip = f.channel >= 0 && ch[t] !== f.channel;
    let hit = false;
    for (; i < IT.n && itx[i] === t + 1; i++) {
      if (skip) continue;
      const p = ip[i] - 1;
      if (f.category >= 0 && sim.catOf[p] !== f.category) continue;
      const net = il[i] - Math.round((il[i] * sim.vat[p]) / (1 + sim.vat[p])), cost = iq[i] * ic[i];
      a.rev += net; a.cogs += cost; a.units += iq[i]; hit = true;
      if (perDay) perDay.rev[date[t] - from] += net;
      if (each) each(t, i, net, net - cost);
    }
    if (hit) { a.tx++; if (ch[t] === 0) a.storeTx++; if (perDay) perDay.tx[date[t] - from]++; }
  }
  return a;
}

const monthKey = (iso: string) => iso.slice(0, 7);

export function dashboard(sim: Sim, filters: Filters): Dash {
  const last = sim.day - 1, to = Math.max(0, Math.min(filters.to, last)), from = Math.max(0, Math.min(filters.from, to));
  const f = { ...filters, from, to }, L = to - from + 1, start = sim.big.startDate, T = sim.T, DS = T.daily_summary;
  const ds = (name: string) => DS.ints(name);
  const filtered = f.category >= 0 || f.channel >= 0;

  // per product, per weekday-hour, per payment, per channel
  const nP = sim.everN, pRev = new Float64Array(nP), pUnits = new Float64Array(nP), pMargin = new Float64Array(nP), pGross = new Float64Array(nP);
  const heatN = Array.from({ length: 7 }, () => new Array(24).fill(0)), pay = [0, 0, 0, 0], chRev = [0, 0], chTx = [0, 0];
  const TX = T.transactions, IT = T.transaction_items, ts = TX.ints('timestamp'), txDate = TX.ints('date'), txCh = TX.ints('channel'), txPay = TX.ints('payment_method'), txCust = TX.ints('customer_id');
  const ip = IT.ints('product_id'), iq = IT.ints('quantity'), il = IT.ints('line_total');
  const perDay = { rev: new Float64Array(L), tx: new Int32Array(L) };
  let lastTx = -1;
  const cur = aggregate(sim, f, from, to, perDay, (t, i, net, margin) => {
    const p = ip[i] - 1; pRev[p] += net; pUnits[p] += iq[i]; pMargin[p] += margin; pGross[p] += il[i];
    chRev[txCh[t]] += net;
    if (t !== lastTx) {
      lastTx = t; chTx[txCh[t]]++; pay[txPay[t]]++;
      const info = sim.cal.get(txDate[t]); heatN[info.dow][Math.floor((ts[t] % 86400) / 3600)]++;
    }
  });
  const prevFrom = from - L, hasPrev = prevFrom >= 0;
  const prev = hasPrev ? aggregate(sim, f, prevFrom, from - 1) : null;

  // business-level numbers from the daily summary
  const S = (name: string, a = from, b = to) => sumRange(ds(name), a, b);
  const visitors = S('visitors'), walkouts = S('walkouts'), labour = S('labour_cost'), waste = S('waste_cost'), refunds = S('refunds'), profit = S('net_profit');
  const rent = S('rent_cost'), util = S('utilities_cost'), mkt = S('marketing_cost'), fees = S('card_fees'), other = S('other_costs');
  const revAll = S('revenue_net'), cogsAll = S('cogs'), openDays = S('is_open');
  const opexFixed = labour + rent + util + mkt + other;

  // customers
  const C = T.customers, firstSeen = C.ints('first_seen'), camp = C.ints('campaign_id'), [t0, t1] = txRange(sim, from, to);
  const seen = new Uint8Array(C.n); let newC = 0, retC = 0;
  for (let t = t0; t < t1; t++) { const c = txCust[t]; if (c === NULL_INT || seen[c - 1]) continue; seen[c - 1] = 1; if (firstSeen[c - 1] >= from) newC++; else retC++; }
  let retention: number | null = null;
  if (hasPrev) {
    const [p0, p1] = txRange(sim, prevFrom, from - 1), was = new Uint8Array(C.n); let active = 0, kept = 0;
    for (let t = p0; t < p1; t++) { const c = txCust[t]; if (c !== NULL_INT && !was[c - 1]) { was[c - 1] = 1; active++; if (seen[c - 1]) kept++; } }
    retention = active ? kept / active : null;
  }
  let attributed = 0;
  for (let c = 0; c < C.n; c++) if (firstSeen[c] >= from && firstSeen[c] <= to && camp[c] !== NULL_INT) attributed++;
  // lifetime value to date: margin earned from identified customers divided by how many there are
  const custRev = new Float64Array(C.n), custN = new Int32Array(C.n), custLast = new Int32Array(C.n).fill(-1);
  { const [, e] = txRange(sim, 0, to), tot = TX.ints('total'), tax = TX.ints('tax'); for (let t = 0; t < e; t++) { const c = txCust[t]; if (c !== NULL_INT) { custRev[c - 1] += tot[t] - tax[t]; custN[c - 1]++; custLast[c - 1] = txDate[t]; } } }
  let idRev = 0, idN = 0; for (let c = 0; c < C.n; c++) if (custN[c]) { idRev += custRev[c]; idN++; }
  const allMargin = pct(S('gross_margin', 0, to), S('revenue_net', 0, to));

  const invAvg = S('inventory_value') / L, contrib = pct(revAll - cogsAll - waste - refunds - fees, revAll), fixedPerDay = opexFixed / L;
  const nTables = T.tables?.n ?? 0;
  const R = T.returns; let retUnits = 0; { const rd = R.ints('date'), rq = R.ints('quantity'); for (let r = 0; r < R.n; r++) if (rd[r] >= from && rd[r] <= to) retUnits += rq[r]; }
  const kpis: Kpis = {
    revenue: E(cur.rev), cogs: E(cur.cogs), grossMargin: E(cur.rev - cur.cogs), marginPct: pct(cur.rev - cur.cogs, cur.rev), transactions: cur.tx, avgTicket: E(pct(cur.rev, cur.tx)), units: cur.units,
    netProfit: E(profit), profitPct: pct(profit, revAll), visitors, conversion: pct(filtered ? cur.storeTx : chTx[0], visitors), walkouts,
    newCustomers: newC, returningCustomers: retC, retention, churn: retention === null ? null : 1 - retention,
    clv: E(idN ? (idRev * allMargin) / idN : 0), cac: attributed ? E(mkt / attributed) : null,
    inventoryTurnover: invAvg ? ((cogsAll / L) * 365) / invAvg : 0, stockoutRate: pct(S('stockout_products'), sim.activeN * L),
    salesPerM2: E(((revAll / L) * 30) / sim.big.sizeM2), labourPct: pct(labour, revAll),
    breakEvenPerDay: contrib > 0 ? E(fixedPerDay / contrib) : 0, breakEvenRatio: contrib > 0 && fixedPerDay > 0 ? revAll / L / (fixedPerDay / contrib) : 0,
    lostSales: E(S('lost_sales_est')), wastePct: pct(waste, cogsAll), returnRate: pct(retUnits, S('units')), cash: E(ds('cash_balance')[to]),
    ...(sim.big.type === 'restaurant' ? { foodCostPct: pct(cogsAll + waste, revAll), tableTurnover: nTables && openDays ? chTx[0] / nTables / openDays : 0 } : {}),
    prev: prev && hasPrev ? {
      revenue: E(prev.rev), grossMargin: E(prev.rev - prev.cogs), transactions: prev.tx, avgTicket: E(pct(prev.rev, prev.tx)),
      netProfit: E(S('net_profit', prevFrom, from - 1)), conversion: pct(prev.storeTx, S('visitors', prevFrom, from - 1)),
    } : null,
  };

  // daily series
  const col = (name: string) => Array.from(ds(name).subarray(from, to + 1), v => v / 100), raw = (name: string) => Array.from(ds(name).subarray(from, to + 1));
  const rev = Array.from(perDay.rev, v => Math.round(v) / 100), ma7 = rev.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - 6); k <= i; k++) { s += rev[k]; n++; } return Math.round((s / n) * 100) / 100; });
  const daily = { rev, ma7, tx: Array.from(perDay.tx), profit: col('net_profit'), visitors: raw('visitors'), walkouts: raw('walkouts'), stockouts: raw('stockout_products'), inventory: col('inventory_value'), lost: col('lost_sales_est'), waste: col('waste_cost'), labour: col('labour_cost'), cash: col('cash_balance') };

  // categories and products
  const catNames = T.categories.col('name') as string[], names = T.products.col('name') as string[];
  const categories = sim.tpl.cats.map((_, i) => ({ id: i, name: catNames[i], rev: 0, margin: 0, units: 0 }));
  const products: Dash['products'] = [];
  for (let p = 0; p < nP; p++) {
    const c = categories[sim.catOf[p]]; c.rev += pRev[p] / 100; c.margin += pMargin[p] / 100; c.units += pUnits[p];
    if (pUnits[p] > 0 || p < sim.activeN) products.push({ id: p + 1, name: names[p], cat: sim.catOf[p], rev: Math.round(pRev[p]) / 100, units: pUnits[p], margin: Math.round(pMargin[p]) / 100, price: pUnits[p] ? Math.round(pGross[p] / pUnits[p]) / 100 : sim.price[p] / 100, stock: sim.stock[p] });
  }
  products.sort((a, b) => b.rev - a.rev);
  categories.forEach(c => { c.rev = Math.round(c.rev * 100) / 100; c.margin = Math.round(c.margin * 100) / 100; });

  // weekday profile and heatmap, per open day of that weekday
  const dowDays = new Array(7).fill(0), weekday = Array.from({ length: 7 }, () => ({ rev: 0, tx: 0, walkouts: 0 }));
  const isOpen = ds('is_open'), wo = ds('walkouts');
  for (let d = from; d <= to; d++) { const w = sim.cal.get(d).dow; dowDays[w]++; weekday[w].rev += rev[d - from]; weekday[w].tx += perDay.tx[d - from]; weekday[w].walkouts += wo[d]; }
  weekday.forEach((w, i) => { const n = Math.max(1, dowDays[i]); w.rev = Math.round((w.rev / n) * 100) / 100; w.tx = Math.round((w.tx / n) * 10) / 10; w.walkouts = Math.round((w.walkouts / n) * 10) / 10; });
  const heat = heatN.map((row, i) => row.map(v => Math.round((v / Math.max(1, dowDays[i])) * 10) / 10));

  // months (whole business)
  const monthly: Dash['monthly'] = []; let curM = '';
  for (let d = from; d <= to; d++) {
    const k = monthKey(isoDate(start, d));
    if (k !== curM) { curM = k; monthly.push({ month: k, rev: 0, margin: 0, profit: 0, newC: 0, retC: 0, labourPct: 0 }); }
    const m = monthly[monthly.length - 1];
    m.rev += ds('revenue_net')[d] / 100; m.margin += ds('gross_margin')[d] / 100; m.profit += ds('net_profit')[d] / 100; m.newC += ds('new_customers')[d]; m.retC += ds('returning_customers')[d]; m.labourPct += ds('labour_cost')[d] / 100;
  }
  monthly.forEach(m => { m.labourPct = pct(m.labourPct, m.rev); m.rev = Math.round(m.rev); m.margin = Math.round(m.margin); m.profit = Math.round(m.profit); });

  // cohorts: share of each month's new customers who bought again k months later (whole history up to `to`)
  const cohorts: Dash['cohorts'] = [];
  {
    const monthIdx = new Map<string, number>(), labels: string[] = [], mOf = (d: number) => { const k = monthKey(isoDate(start, d)); let i = monthIdx.get(k); if (i === undefined) { i = labels.length; monthIdx.set(k, i); labels.push(k); } return i; };
    for (let d = 0; d <= to; d += 1) mOf(d);
    const nM = labels.length, size = new Int32Array(nM), act = Array.from({ length: nM }, () => new Int32Array(nM)), mark = new Int32Array(C.n).fill(-1), cm = new Int32Array(C.n);
    for (let c = 0; c < C.n; c++) if (firstSeen[c] <= to && custN[c]) { cm[c] = mOf(firstSeen[c]); size[cm[c]]++; }
    const [, e] = txRange(sim, 0, to);
    for (let t = 0; t < e; t++) { const c = txCust[t]; if (c === NULL_INT) continue; const m = mOf(txDate[t]); if (mark[c - 1] !== m) { mark[c - 1] = m; act[cm[c - 1]][m - cm[c - 1]]++; } }
    for (let m = Math.max(0, nM - 12); m < nM; m++) if (size[m] && nM - m > 1) cohorts.push({ cohort: labels[m], size: size[m], rate: Array.from(act[m].subarray(0, nM - m), v => v / size[m]) });
  }

  // RFM at the end of the period
  const rfm: Dash['rfm'] = [];
  {
    const ids: number[] = []; for (let c = 0; c < C.n; c++) if (custN[c]) ids.push(c);
    const score = (get: (c: number) => number, asc: boolean) => {
      const sorted = ids.slice().sort((a, b) => (asc ? get(a) - get(b) : get(b) - get(a))), out = new Uint8Array(C.n);
      sorted.forEach((c, i) => { out[c] = 1 + Math.min(4, Math.floor((i * 5) / sorted.length)); }); return out;
    };
    const rs = score(c => to - custLast[c], false), fs = score(c => custN[c], true), ms = score(c => custRev[c], true);
    const seg = ['Champions', 'Loyal', 'Promising', 'New', 'At risk', 'Hibernating'].map(s => ({ segment: s, customers: 0, revenue: 0, recency: 0, frequency: 0, monetary: 0 }));
    for (const c of ids) {
      const r = rs[c], fm = (fs[c] + ms[c]) / 2;
      const k = r >= 4 && fm >= 4 ? 0 : r >= 3 && fm >= 3 ? 1 : r >= 4 && custN[c] === 1 ? 3 : r >= 3 ? 2 : fm >= 3 ? 4 : 5, s = seg[k];
      s.customers++; s.revenue += custRev[c] / 100; s.recency += to - custLast[c]; s.frequency += custN[c]; s.monetary += custRev[c] / 100;
    }
    for (const s of seg) { const n = Math.max(1, s.customers); rfm.push({ ...s, revenue: Math.round(s.revenue), recency: Math.round(s.recency / n), frequency: Math.round((s.frequency / n) * 10) / 10, monetary: Math.round((s.monetary / n) * 100) / 100 }); }
  }

  const pnl = [['revenue', revAll], ['cogs', -cogsAll], ['refunds', -refunds], ['waste', -waste], ['labour', -labour], ['rent', -rent], ['utilities', -util], ['marketing', -mkt], ['fees', -(fees + other)], ['profit', profit]]
    .map(([key, v]) => ({ key: key as string, value: E(v as number) }));

  // forecast: the average of the same weekday over the four weeks before; the last 28 days are held out to test it
  const H = Math.min(28, Math.max(0, L - 28)), actual: (number | null)[] = [], forecast: (number | null)[] = []; let ape = 0, apeN = 0;
  const show = Math.min(L, 84), day0 = to - show + 1;
  const naive = (cut: number, d: number) => { let s = 0, n = 0; for (let k = d - 7 * Math.ceil((d - cut + 1) / 7); k >= from && n < 4; k -= 7) { s += rev[k - from]; n++; } return n ? s / n : 0; };
  for (let d = day0; d <= to + 28; d++) {
    actual.push(d <= to ? rev[d - from] : null);
    const cut = d > to ? to + 1 : to - H + 1;
    if (d >= cut && H > 0) { const v = Math.round(naive(cut, d) * 100) / 100; forecast.push(v); if (d <= to && rev[d - from] > 0) { ape += Math.abs(v - rev[d - from]) / rev[d - from]; apeN++; } } else forecast.push(null);
  }

  const PC = T.parameter_changes, pcd = PC.ints('date'), changes: Dash['changes'] = [];
  for (let r = 0; r < PC.n; r++) if (pcd[r] >= from && pcd[r] <= to) changes.push({ day: pcd[r], param: PC.col('parameter')[r] as string, old: (PC.col('old_value') as Float64Array)[r], value: (PC.col('new_value') as Float64Array)[r] });

  return {
    from, to, start, kpis, daily, categories, products: products.slice(0, 400), heat, monthly, cohorts, rfm, pnl,
    forecast: { day0, actual, forecast, mape: apeN ? ape / apeN : null }, changes, weekday,
    payments: ['card', 'cash', 'mobile', 'paypal'].map((name, i) => ({ name, tx: pay[i] })).filter(p => p.tx),
    channels: ['store', 'online'].map((name, i) => ({ name, rev: Math.round(chRev[i]) / 100, tx: chTx[i] })),
  };
}

/** Headline numbers of the last 30 days, kept in the recipe so the portfolio can show them without the tables. */
export function snapshot(sim: Sim): Snapshot {
  const to = sim.day - 1, from = Math.max(0, to - 29), DS = sim.T.daily_summary, s = (n: string, a = from) => sumRange(DS.ints(n), a, to) / 100;
  const rev = DS.ints('revenue_net'), spark: number[] = [];
  for (let d = Math.max(0, to - 89); d <= to; d += 3) spark.push(Math.round((rev[d] + (rev[d + 1] ?? 0) + (rev[d + 2] ?? 0)) / 100));
  const r = s('revenue_net');
  return { rev30: Math.round(r), margin30: r ? s('gross_margin') / r : 0, profit30: Math.round(s('net_profit')), tx30: Math.round(s('transactions') * 100), spark, day: sim.day };
}

/** Weekly net revenue for the comparison screen. */
export function weeklyRevenue(sim: Sim): { start: string; days: number; weeks: number[]; kpis: Kpis } {
  const DS = sim.T.daily_summary, rev = DS.ints('revenue_net'), weeks: number[] = [];
  for (let d = 0; d + 6 < sim.day; d += 7) { let s = 0; for (let k = 0; k < 7; k++) s += rev[d + k]; weeks.push(Math.round(s / 100)); }
  return { start: sim.big.startDate, days: sim.day, weeks, kpis: dashboard(sim, { from: Math.max(0, sim.day - 90), to: sim.day - 1, category: -1, channel: -1 }).kpis };
}
export const openHours = hoursOpen;
