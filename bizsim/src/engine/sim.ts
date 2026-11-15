// The simulation of one business, one day at a time. The same recipe (big parameters, opening sliders and the
// change log) always produces the same tables, on any device, however the days are batched.

import { Calendar, daysInMonth, type DayInfo } from './calendar';
import { hoursOpen, openDaysPerWeek, shiftsPerDay } from './params';
import { Rng, hash32, hashUnit, searchCum } from './rng';
import { schemaFor } from './schema';
import { Table, type TableDef } from './table';
import { TEMPLATES } from './templates';
import { POS_CONV, POS_COST, POS_PRICE, curve, nicePrice, personName, type ProductSpec, type Template } from './templates/common';
import type { BigParams, Change, SmallKey, SmallParams } from './types';

const ONLINE_HOURS = curve([[0, 2], [2, 0.5], [7, 1], [10, 4], [13, 5], [16, 4], [19, 7], [22, 10], [23, 6]]);
const SOCIAL = 1.32;          // company cost of a euro of gross wage
const CARD_FEE = 0.007;
const MAX_LIFT = 0.38;        // most extra visitors marketing can bring
interface Anomaly { start: number; end: number; type: number; mag: number; logged: boolean; }

export class Sim {
  readonly tpl: Template;
  readonly defs: TableDef[];
  readonly T: Record<string, Table> = {};
  readonly cal: Calendar;
  day = 0;
  small: SmallParams;
  private changes: Change[] = [];
  private chIdx = 0;

  // catalogue: products are activated in the order of `specs`, so the active ones are always a prefix
  readonly specs: ProductSpec[];
  everN = 0; activeN = 0;
  readonly price: Int32Array; readonly cost: Int32Array; readonly ref: Float64Array; readonly override: Float64Array;
  readonly vat: Float64Array; readonly catOf: Int32Array; readonly supOf: Int32Array;
  readonly stock: Int32Array; private onOrder: Int32Array; private ewma: Float64Array;
  private sold: Int32Array; private lostU: Int32Array; private w: Float64Array; private cum: Float64Array; private promo: Uint8Array;

  private cProp: number[] = []; private cPos: number[] = []; private cLast: number[] = []; private alive: number[] = [];
  private staff: number[] = []; private staffPtr = 0;
  private arrivals = new Map<number, number[]>();
  private retQueue = new Map<number, number[]>(); // item row, quantity pairs
  private anomalies: Anomaly[] = [];
  private mtd = [0, 0, 0, 0, 0, 0];
  private cash = 0;
  private campRows: number[] = []; private campMonth = -1;
  private seats: number[] = [];
  private appeal = 1; private drift = 0; private supLead: number[] = []; private supOnTime: number[] = [];
  private li: 0 | 1;

  constructor(readonly big: BigParams, small0: SmallParams, changes: Change[] = []) {
    this.tpl = TEMPLATES[big.type];
    this.li = big.lang === 'es' ? 1 : 0;
    this.defs = schemaFor(big.type);
    for (const d of this.defs) this.T[d.name] = new Table(d, d.name === 'transaction_items' ? 65536 : d.name === 'transactions' ? 16384 : 256);
    this.cal = new Calendar(big.startDate, big.seed, big.lang);
    this.small = { ...small0 };
    this.setChanges(changes);
    this.specs = (this.tpl.catalogue ?? (() => []))(this.tpl, big, this.tpl.items[1]);
    const n = this.specs.length;
    this.price = new Int32Array(n); this.cost = new Int32Array(n); this.ref = new Float64Array(n); this.override = new Float64Array(n).fill(NaN);
    this.vat = new Float64Array(n); this.catOf = new Int32Array(n); this.supOf = new Int32Array(n);
    this.stock = new Int32Array(n); this.onOrder = new Int32Array(n); this.ewma = new Float64Array(n);
    this.sold = new Int32Array(n); this.lostU = new Int32Array(n); this.w = new Float64Array(n); this.cum = new Float64Array(n); this.promo = new Uint8Array(n);
    this.init();
  }

  /** Replaces the change log. Changes dated before the current day must already have been applied. */
  setChanges(changes: Change[]) {
    this.changes = [...changes].sort((a, b) => a.day - b.day);
    this.chIdx = 0;
    while (this.chIdx < this.changes.length && this.changes[this.chIdx].day < this.day) this.chIdx++;
  }
  /** Ids of the changes that have already taken effect. */
  appliedIds(): string[] { return this.changes.slice(0, this.chIdx).map(c => c.id); }
  /** The sliders as they will be once every logged change has applied. */
  pendingSmall(): SmallParams {
    const s = { ...this.small };
    for (let i = this.chIdx; i < this.changes.length; i++) { const c = this.changes[i]; if (!c.param.startsWith('price:')) s[c.param as SmallKey] = c.value; }
    return s;
  }

  private init() {
    const { tpl, big, T, li } = this, rng = new Rng(hash32(big.seed, 0x1417));
    tpl.cats.forEach((c, i) => T.categories.add(i + 1, c.name[li], c.vat, c.spoil ? 1 : 0));
    tpl.suppliers.forEach((s, i) => {
      const lead = tpl.leadTime[0] + rng.int(tpl.leadTime[1] - tpl.leadTime[0] + 1), onTime = Math.round((0.78 + 0.19 * rng.next()) * 100) / 100;
      this.supLead.push(lead); this.supOnTime.push(onTime); T.suppliers.add(i + 1, s[li], lead, onTime);
    });
    const ex = tpl.extras?.(big);
    ex?.authors?.forEach((a, i) => T.authors.add(i + 1, a[0], a[1]));
    ex?.publishers?.forEach((p, i) => T.publishers.add(i + 1, p));
    if (big.type === 'restaurant') {
      const target = Math.round(big.sizeM2 * 0.5); let total = 0;
      while (total < target) {
        const s = [2, 2, 4, 4, 4, 6][rng.int(6)], z = rng.next();
        this.seats.push(s); total += s; T.tables.add(this.seats.length, s, z < 0.65 ? 0 : z < 0.9 ? 1 : 2);
      }
    }
    const nSup = tpl.suppliers.length;
    this.specs.forEach((s, p) => {
      this.catOf[p] = s.cat; this.vat[p] = tpl.cats[s.cat].vat;
      this.supOf[p] = (s.cat + (hashUnit(big.seed, 0x5a, p) < 0.25 ? 1 : 0)) % nSup;
      this.ref[p] = nicePrice(s.price * POS_PRICE[big.pricePos], tpl.menuPrices);
    });
    const recommended = big.sizeM2 * tpl.fitoutM2 * 1.3;
    this.appeal = Math.min(1.12, Math.max(0.8, Math.pow(big.investment / recommended, 0.22)));
    this.drift = -0.04 + 0.13 * hashUnit(big.seed, 0xd41f);
    this.cash = Math.round((big.investment - 0.75 * Math.min(big.investment, recommended)) * 100);
    this.computePrices();
    this.syncCatalogue(0);
    for (let i = 0; i < big.staff; i++) this.hire(0, rng, i === 0 && big.staff >= 3 ? 1 : i % 4 === 3 ? Math.min(2, tpl.roles.length - 1) : 0);

    // opening stock, bought on day 0
    const u0 = this.small.traffic * tpl.conv * POS_CONV[big.pricePos] * tpl.basket; let popSum = 0;
    for (let p = 0; p < this.activeN; p++) popSum += this.specs[p].pop;
    for (let p = 0; p < this.activeN; p++) { this.ewma[p] = (u0 * this.specs[p].pop) / popSum; this.order(p, 0, 0, true); }

    // unusual events, drawn once for ten years
    const ar = new Rng(hash32(big.seed, 0xa40));
    for (let y = 0; y < 10; y++) {
      const k = 4 + ar.int(3);
      for (let i = 0; i < k; i++) {
        const type = ar.int(5), start = y * 365 + 30 + ar.int(335);
        const len = [1 + ar.int(3), 10 + ar.int(11), 1, 14 + ar.int(15), 2 + ar.int(3)][type];
        const mag = [1.8 + 0.8 * ar.next(), 2 + ar.int(3), 0.45, 0.62 + 0.1 * ar.next(), 0.45 + 0.15 * ar.next()][type];
        this.anomalies.push({ start, end: start + len - 1, type, mag, logged: false });
      }
    }
    this.anomalies.sort((a, b) => a.start - b.start);
  }

  private hire(d: number, rng: Rng, role = 0) {
    const [name, wage] = this.tpl.roles[Math.min(role, this.tpl.roles.length - 1)];
    const pay = Math.round(wage * (1 + 0.04 * (this.small.quality - 3)) * (0.97 + 0.08 * rng.next()) * 100);
    this.staff.push(this.T.employees.add(this.T.employees.n + 1, personName(rng), name[this.li], d, null, pay));
  }

  private computePrices() {
    const { small, tpl, big } = this, pl = 1 + small.priceLevel / 100, cm = POS_COST[big.pricePos] * (1 + small.supplierCost / 100) * (1 + 0.05 * (small.quality - 3));
    const lp = this.T.products.ints('list_price'), uc = this.T.products.ints('unit_cost');
    for (let p = 0; p < this.specs.length; p++) {
      const s = this.specs[p], o = this.override[p];
      this.price[p] = Math.round((o > 0 ? o : nicePrice(this.ref[p] * pl, tpl.menuPrices)) * 100);
      this.cost[p] = Math.max(1, Math.round((s.price / (1 + this.vat[p])) * s.costRatio * cm * 100));
      if (p < this.everN) { lp[p] = this.price[p]; uc[p] = this.cost[p]; }
    }
  }

  private syncCatalogue(d: number) {
    const target = Math.max(1, Math.min(this.specs.length, Math.round(this.small.items))), P = this.T.products;
    if (target > this.activeN) {
      let e = 0, pop = 0;
      for (let p = 0; p < this.activeN; p++) { e += this.ewma[p]; pop += this.specs[p].pop; }
      for (let p = this.activeN; p < target; p++) {
        if (p >= this.everN) {
          const s = this.specs[p];
          P.add(p + 1, s.sku, s.name, s.cat + 1, this.supOf[p] + 1, this.cost[p], this.price[p], d, null, 1, ...(s.extra ?? []));
          this.everN++;
          if (pop > 0) this.ewma[p] = (e / pop) * s.pop;
        } else { P.set('discontinued_date', p, null); P.set('active', p, 1); }
      }
    } else for (let p = target; p < this.activeN; p++) { P.set('discontinued_date', p, d); P.set('active', p, 0); }
    this.activeN = target;
  }

  /** Places a purchase order; `opening` stock arrives at once. */
  private order(p: number, d: number, extraDelay: number, opening = false) {
    const { small, tpl } = this, sup = this.supOf[p], spoil = tpl.cats[this.catOf[p]].spoil ?? 0, perish = spoil > 0;
    // very perishable goods are made or delivered daily
    const lead = opening ? 0 : spoil >= 0.15 ? 1 : this.supLead[sup];
    const e = Math.max(this.ewma[p], 0.02) * 1.35, cycle = Math.max(perish ? 1 : 2, lead);
    const low = Math.max(1, small.reorderDays * e * (spoil >= 0.15 ? 0.5 : 1)), high = Math.max(perish ? 2 : 3, low + cycle * e);
    if (!opening && this.stock[p] + this.onOrder[p] > low) return;
    const qty = Math.max(1, Math.ceil(high - this.stock[p] - this.onOrder[p]));
    const late = opening || hashUnit(this.big.seed, 0x1a7e, d, p) < this.supOnTime[sup] ? 0 : 1 + Math.floor(hashUnit(this.big.seed, 0x1a7f, d, p) * 4);
    const row = this.T.purchase_orders.add(this.T.purchase_orders.n + 1, sup + 1, p + 1, d, d + lead, null, qty, this.cost[p], qty * this.cost[p], 0);
    this.onOrder[p] += qty;
    if (opening) this.receive(row, d);
    else { const due = d + lead + late + extraDelay, q = this.arrivals.get(due); if (q) q.push(row); else this.arrivals.set(due, [row]); }
  }
  private receive(row: number, d: number) {
    const PO = this.T.purchase_orders, p = PO.ints('product_id')[row] - 1, qty = PO.ints('quantity')[row];
    PO.set('received_date', row, d); PO.set('status', row, 1);
    this.stock[p] += qty; this.onOrder[p] -= qty; this.cash -= PO.ints('total_cost')[row];
    this.T.inventory_movements.add(this.T.inventory_movements.n + 1, d, p + 1, 0, qty, this.stock[p]);
  }

  private apply(c: Change, d: number) {
    if (c.param.startsWith('price:')) this.override[+c.param.slice(6) - 1] = c.value;
    else this.small[c.param as SmallKey] = c.value;
    this.T.parameter_changes.add(this.T.parameter_changes.n + 1, d, c.param, c.old, c.value);
  }

  // ---- demand model: the expected values the day's random draws are centred on ----

  private anomalyAt(d: number, type: number): Anomaly | undefined {
    for (const a of this.anomalies) { if (a.start > d) break; if (a.end >= d && a.type === type) return a; }
    return undefined;
  }
  private lift(): number { return MAX_LIFT * (1 - Math.exp(-this.small.marketing / this.tpl.marketingScale)); }
  private isClosed(info: DayInfo): boolean { return info.dow === this.big.closedDay || (!!info.holiday && this.tpl.holiday === 0); }

  private visitorsMean(info: DayInfo): number {
    const { tpl, big, small } = this, d = info.day;
    let inHours = 0, ref = 0;
    const c = info.dow >= 5 ? tpl.hoursWe : tpl.hours;
    for (let h = 0; h < 24; h++) { if (h >= big.openHour && h < big.closeHour) inHours += c[h]; if (h >= tpl.hoursDefault[0] && h < tpl.hoursDefault[1]) ref += c[h]; }
    const hours = Math.min(1.15, inHours / Math.max(ref, 1e-9));
    const weather = Math.max(0.4, 1 + tpl.rain * Math.min(info.rain / 10, 1.5) + (tpl.heat * (info.temp - 16)) / 10);
    const ramp = 0.55 + 0.45 * (1 - Math.exp(-d / 75)), drift = 1 + (this.drift * d) / 365;
    let anomaly = 1;
    for (const t of [0, 3, 4]) { const a = this.anomalyAt(d, t); if (a) anomaly *= a.mag; }
    return small.traffic * tpl.dow[info.dow] * tpl.month[info.m - 1] * (info.event ? tpl.events[info.event] ?? 1 : 1) * (info.holiday ? tpl.holiday || 1 : 1)
      * weather * ramp * drift * (1 + this.lift()) * anomaly * hours;
  }

  /** Fills the demand weight of every sellable product for the day and returns their total and the price index. */
  private weights(info: DayInfo, ignoreStock = false): { total: number; priceIdx: number; unitNet: number; outShare: number } {
    const { tpl, small } = this, eps = tpl.elasticity, depth = small.promoDepth / 100, share = depth > 0 ? small.promoShare / 100 : 0, week = Math.floor(info.day / 7);
    const catF = tpl.cats.map(c => Math.max(0.15, (c.season ? c.season[info.m - 1] : 1) * (1 + ((c.heat ?? 0) * (info.temp - 16)) / 10) * (info.event ? c.events?.[info.event] ?? 1 : 1)));
    const promoBoost = Math.pow(1 / (1 - Math.min(depth, 0.9)), eps * 1.5);
    let total = 0, base = 0, idx = 0, net = 0, out = 0;
    const n = Math.max(this.everN, this.activeN);
    for (let p = 0; p < n; p++) {
      if (p >= this.activeN && (ignoreStock || this.stock[p] <= 0)) { this.w[p] = 0; this.promo[p] = 0; this.cum[p] = total; continue; }
      const w0 = this.specs[p].pop * catF[this.catOf[p]], rel = this.price[p] / 100 / this.ref[p];
      const pr = share > 0 && hashUnit(this.big.seed, 0x77, week, p) < share ? 1 : 0;
      const w = w0 * Math.pow(rel, -eps) * (pr ? promoBoost : 1);
      this.promo[p] = pr; this.w[p] = w; total += w; this.cum[p] = total;
      base += w0; idx += w0 * rel; net += (w * (this.price[p] * (pr ? 1 - depth : 1))) / (1 + this.vat[p]);
      if (!ignoreStock && this.stock[p] <= 0) out += w0;
    }
    return { total, priceIdx: base > 0 ? idx / base : 1, unitNet: total > 0 ? net / total / 100 : 0, outShare: base > 0 ? out / base : 0 };
  }

  private conversion(priceIdx: number, outShare: number): number {
    const { tpl, big, small } = this;
    const v = tpl.conv * POS_CONV[big.pricePos] * Math.pow(priceIdx, -0.5 * tpl.elasticity) * (1 + 0.06 * (small.quality - 3))
      * Math.pow(this.activeN / tpl.items[2], 0.12) * this.appeal * (1 - 0.6 * outShare) * (1 + 1.2 * (small.promoDepth / 100) * (small.promoShare / 100));
    return Math.min(0.97, Math.max(0.01, v));
  }
  private capacity(d: number): number {
    const { tpl, big, small } = this;
    let cap = small.staffPerShift * hoursOpen(big) * tpl.txPerStaffHour * (1 + 0.03 * (small.quality - 3));
    if (this.seats.length) cap = Math.min(cap, (this.seats.reduce((a, b) => a + b, 0) * (hoursOpen(big) / 2.75) * 0.7) / (tpl.party ?? 2.6));
    if (this.anomalyAt(d, 2)) cap *= 0.45;
    return Math.max(1, Math.round(cap));
  }
  private onlineMean(info: DayInfo): number {
    if (!this.big.online) return 0;
    const { tpl, small, big } = this, d = info.day;
    return small.traffic * tpl.conv * POS_CONV[big.pricePos] * tpl.onlineShare * Math.min(2, 1 + (0.25 * d) / 365) * (0.55 + 0.45 * (1 - Math.exp(-d / 75)))
      * tpl.month[info.m - 1] * (info.event ? tpl.events[info.event] ?? 1 : 1) * (1 + 0.15 * Math.min(info.rain / 10, 1)) * (1 + this.lift());
  }

  /**
   * Expected net revenue (without VAT) for each of the next `days` days with the sliders in `alt`, without
   * simulating or changing anything. Used for the what-if projection.
   */
  project(alt: SmallParams, days: number, startDay = this.day): number[] {
    const keep = this.small, keepN = this.activeN, out: number[] = [];
    this.small = alt; this.activeN = Math.max(1, Math.min(this.specs.length, Math.round(alt.items))); this.computePricesQuiet();
    for (let i = 0; i < days; i++) {
      const info = this.cal.get(startDay + i), w = this.weights(info, true), closed = this.isClosed(info);
      const units = this.tpl.basket * (1 + 0.5 * (alt.promoDepth / 100) * (alt.promoShare / 100));
      const store = closed ? 0 : Math.min(this.visitorsMean(info) * this.conversion(w.priceIdx, w.outShare), this.capacity(info.day));
      out.push(Math.round((store + this.onlineMean(info) * Math.pow(w.priceIdx, -0.5 * this.tpl.elasticity)) * units * w.unitNet));
    }
    this.small = keep; this.activeN = keepN; this.computePricesQuiet();
    return out;
  }
  private computePricesQuiet() {
    const pl = 1 + this.small.priceLevel / 100;
    for (let p = 0; p < this.specs.length; p++) { const o = this.override[p]; this.price[p] = Math.round((o > 0 ? o : nicePrice(this.ref[p] * pl, this.tpl.menuPrices)) * 100); }
  }

  // ---- one day ----

  step() {
    const { tpl, big, T, li } = this, d = this.day, info = this.cal.get(d), rng = new Rng(hash32(big.seed, d, 0x5eed));
    let dirty = d === 0;
    while (this.chIdx < this.changes.length && this.changes[this.chIdx].day <= d) { this.apply(this.changes[this.chIdx++], d); dirty = true; }
    if (dirty) { this.computePrices(); this.syncCatalogue(d); }
    const small = this.small, dim = daysInMonth(info.y, info.m), closed = this.isClosed(info);
    for (const a of this.anomalies) { if (a.start > d) break; if (!a.logged) { a.logged = true; T.anomalies_key.add(T.anomalies_key.n + 1, a.start, a.end, a.type); } }

    // marketing: one or two campaigns a month while there is a budget
    const monthKey = info.y * 12 + info.m;
    if (small.marketing > 0 && this.campMonth !== monthKey) {
      this.campMonth = monthKey; this.campRows = [];
      const k = small.marketing > tpl.marketingScale ? 2 : 1, first = Math.floor(hashUnit(big.seed, 0xc4, monthKey) * 4);
      const names = [['Social ads', 'Anuncios en redes'], ['Search ads', 'Anuncios en buscadores'], ['Flyers', 'Buzoneo'], ['Newsletter', 'Boletín']];
      for (let i = 0; i < k; i++) {
        const ch = (first + i) % 4;
        this.campRows.push(T.marketing_campaigns.add(T.marketing_campaigns.n + 1, `${names[ch][li]} ${info.y}-${String(info.m).padStart(2, '0')}`, ch, d, d + dim - info.dom, 0, 0));
      }
    }
    const mktToday = small.marketing > 0 ? Math.round((small.marketing * 100) / dim) : 0;
    if (mktToday && this.campRows.length) {
      const sp = T.marketing_campaigns.ints('spend');
      this.campRows.forEach((r, i) => { sp[r] += i === 0 ? mktToday - Math.floor(mktToday / this.campRows.length) * (this.campRows.length - 1) : Math.floor(mktToday / this.campRows.length); });
    }
    const lift = this.lift(), attrib = this.campRows.length && small.marketing > 0 ? lift / (1 + lift) : 0;

    // deliveries and returns arrive before opening
    const due = this.arrivals.get(d);
    if (due) { for (const r of due) this.receive(r, d); this.arrivals.delete(d); }
    let refundsNet = 0, refundsGross = 0;
    const rq = this.retQueue.get(d);
    if (rq) {
      const I = T.transaction_items, ip = I.ints('product_id'), iq = I.ints('quantity'), il = I.ints('line_total'), itx = I.ints('transaction_id'), ch = T.transactions.ints('channel');
      for (let i = 0; i < rq.length; i += 2) {
        const row = rq[i], q = rq[i + 1], p = ip[row] - 1, refund = Math.round((il[row] * q) / iq[row]), online = ch[itx[row] - 1] === 1;
        const u = rng.next();
        const reason = big.type === 'restaurant' || big.type === 'cafe' ? 5 : online && u < 0.15 ? 4 : big.type === 'clothing' ? (u < 0.5 ? 0 : u < 0.78 ? 1 : u < 0.92 ? 2 : 3) : u < 0.45 ? 1 : u < 0.8 ? 2 : 3;
        const restock = reason !== 2 && rng.chance(tpl.restock) ? 1 : 0;
        T.returns.add(T.returns.n + 1, row + 1, d, q, refund, reason, restock);
        if (restock) { this.stock[p] += q; T.inventory_movements.add(T.inventory_movements.n + 1, d, p + 1, 2, q, this.stock[p]); }
        refundsGross += refund; refundsNet += Math.round(refund / (1 + this.vat[p]));
      }
      this.retQueue.delete(d);
    }

    // staff: keep enough people for the rota, then write today's shifts
    const shifts = shiftsPerDay(big), need = Math.ceil((small.staffPerShift * shifts * openDaysPerWeek(big)) / 5);
    for (let i = this.staff.length - 1; i >= 0; i--) if (rng.chance(0.0009)) { T.employees.set('end_date', this.staff[i], d); this.staff.splice(i, 1); }
    while (this.staff.length < need) this.hire(d, rng);
    while (this.staff.length > need + 1 && this.staff.length > 1) T.employees.set('end_date', this.staff.pop()!, d);
    const duty: number[][] = []; let labour = 0, staffHours = 0;
    if (!closed) {
      const wage = T.employees.ints('hourly_wage'), hrs = Math.round((hoursOpen(big) / shifts + 0.5) * 100) / 100;
      for (let s = 0; s < shifts; s++) {
        const on: number[] = [];
        for (let i = 0; i < small.staffPerShift; i++) {
          const e = this.staff[this.staffPtr++ % this.staff.length], cost = Math.round(hrs * wage[e] * SOCIAL);
          on.push(e + 1); labour += cost; staffHours += hrs;
          T.shifts.add(T.shifts.n + 1, e + 1, d, shifts === 1 ? 2 : s, hrs, cost);
        }
        duty.push(on);
      }
    }

    // demand
    const wt = this.weights(info), nW = Math.max(this.everN, this.activeN);
    const conv = this.conversion(wt.priceIdx, wt.outShare), cap = this.capacity(d);
    const visitorsStore = closed ? 0 : Math.max(0, Math.round(this.visitorsMean(info) * rng.logn(0.07)));
    const wanted = rng.binomial(visitorsStore, conv), served = Math.min(wanted, cap), walkouts = wanted - served;
    const load = wanted / cap, strain = load > 0.85 ? Math.min(1.6, 1 + (load - 0.85) * 2) : 1;
    const nOnline = rng.poisson(this.onlineMean(info) * Math.pow(wt.priceIdx, -0.5 * tpl.elasticity));
    const visitorsOnline = nOnline ? Math.round(nOnline / (0.025 + 0.02 * rng.next())) : 0;

    // ticket times, in order
    const hc = info.dow >= 5 || info.holiday ? tpl.hoursWe : tpl.hours, storeHours: number[] = [];
    for (let h = 0; h < 24; h++) storeHours.push(h >= big.openHour && h < big.closeHour ? hc[h] + 0.05 : 0);
    const times = new Int32Array(served + nOnline);
    for (let i = 0; i < served; i++) times[i] = (rng.weighted(storeHours) * 3600 + rng.int(3600)) * 2;
    for (let i = 0; i < nOnline; i++) times[served + i] = (rng.weighted(ONLINE_HOURS) * 3600 + rng.int(3600)) * 2 + 1;
    times.sort();

    const TX = T.transactions, IT = T.transaction_items, C = T.customers, RES = T.reservations;
    const depth = small.promoDepth / 100, isRest = big.type === 'restaurant', party = tpl.party ?? 1;
    const basketMean = tpl.basket * (1 + 0.5 * depth * (small.promoShare / 100));
    const cashShare = Math.max(0.15, 0.34 - (0.05 * d) / 365), mobileShare = Math.min(0.3, 0.1 + (0.05 * d) / 365), tillDown = !!this.anomalyAt(d, 2);
    const churn = tpl.churn * (1 - 0.12 * (small.quality - 3)) * strain, retMult = 1 - 0.1 * (small.quality - 3);
    const K = tpl.custK * (1 + 2 * lift), mid = (big.openHour + hoursOpen(big) / 2) * 3600;
    let gross = 0, disc = 0, net = 0, tax = 0, cogs = 0, units = 0, nTx = 0, newC = 0, retC = 0, lostSales = 0, cardSales = 0, takings = 0, reserved = 0;
    const lp: number[] = [], lq: number[] = [];

    for (let t = 0; t < times.length; t++) {
      const online = times[t] & 1, sec = times[t] >> 1;
      // what
      const booked = isRest && !online && rng.chance(0.42);
      const guests = isRest && !online ? Math.min(10, 1 + rng.poisson(party - 1)) : 1;
      let want = isRest ? (online ? 2 + rng.poisson(basketMean * 0.5) : guests + rng.poisson(guests * (basketMean / party - 1))) : 1 + rng.poisson(basketMean - 1);
      lp.length = 0; lq.length = 0;
      let missed = false;
      while (want > 0) {
        let p = searchCum(this.cum, nW, rng.next()), q = 1;
        if (want > 1 && rng.chance(tpl.multiQty)) q = Math.min(want, 2 + (rng.chance(0.25) ? 1 : 0));
        want -= q;
        let have = this.stock[p] - (lq[lp.indexOf(p)] ?? 0);
        if (have <= 0) {
          this.lostU[p] += q; lostSales += q * this.price[p]; missed = true;
          let sub = -1;
          if (rng.chance(0.55)) for (let k = 0; k < 4 && sub < 0; k++) { const c = searchCum(this.cum, nW, rng.next()); if (this.catOf[c] === this.catOf[p] && this.stock[c] - (lq[lp.indexOf(c)] ?? 0) > 0) sub = c; }
          if (sub < 0) continue;
          p = sub; have = this.stock[p] - (lq[lp.indexOf(p)] ?? 0);
        }
        if (q > have) { this.lostU[p] += q - have; lostSales += (q - have) * this.price[p]; q = have; }
        const at = lp.indexOf(p);
        if (at >= 0) lq[at] += q; else { lp.push(p); lq.push(q); }
      }
      if (!lp.length) continue;
      // who
      let cust = -1, isNew = false;
      const known = online === 1 || rng.chance(tpl.identified);
      if (known || booked) {
        if (rng.chance(this.alive.length / (this.alive.length + K))) {
          for (let k = 0; k < 6 && cust < 0; k++) { const c = this.alive[rng.int(this.alive.length)]; if (rng.next() < this.cProp[c] || k === 5) cust = c; }
        } else {
          isNew = true;
          const viaCampaign = rng.chance(attrib), camp = viaCampaign ? this.campRows[rng.int(this.campRows.length)] : -1;
          const segW = tpl.segments.map((s, i) => s[1] * (i === tpl.segments.length - 1 && big.locationTier === 3 ? 2 : 1));
          const zu = Math.pow(rng.next(), online ? 0.7 : big.locationTier === 1 ? 2.2 : 1.4);
          const acq = viaCampaign ? [2, 3, 4, 5][T.marketing_campaigns.ints('channel')[camp]] : online ? (rng.chance(0.6) ? 6 : 3) : rng.chance(0.18) ? 1 : 0;
          cust = C.add(C.n + 1, d, tpl.segments[rng.weighted(segW)][0][li], rng.weighted([0.14, 0.24, 0.22, 0.18, 0.13, 0.09]), rng.weighted([0.52, 0.46, 0.02]),
            Math.min(4, Math.floor(zu * 5)), acq, viaCampaign ? camp + 1 : null, rng.chance(0.55) ? 1 : 0, rng.chance(0.42) ? 1 : 0);
          if (viaCampaign) T.marketing_campaigns.ints('attributed_new_customers')[camp]++;
          this.cProp[cust] = Math.min(1, 0.12 + -Math.log(1 - rng.next() * 0.999) * 0.28); this.cPos[cust] = this.alive.length; this.alive.push(cust);
        }
      }
      if (isNew) newC++; else if (cust >= 0) retC++;
      // the ticket
      const txRow = TX.n; let sub = 0, dsc = 0, tx = 0, n = 0;
      for (let i = 0; i < lp.length; i++) {
        const p = lp[i], q = lq[i], pr = this.price[p], off = this.promo[p] ? Math.round(pr * depth) : 0, line = q * (pr - off), itemRow = IT.n;
        IT.add(itemRow + 1, txRow + 1, p + 1, q, pr, q * off, line, this.cost[p], this.promo[p]);
        sub += q * pr; dsc += q * off; tx += Math.round((line * this.vat[p]) / (1 + this.vat[p])); n += q;
        cogs += q * this.cost[p]; this.stock[p] -= q; this.sold[p] += q;
        if (rng.chance((online ? tpl.returnOnline : tpl.returnRate) * retMult)) {
          const when = d + 1 + rng.int(big.type === 'clothing' ? 20 : 7), list = this.retQueue.get(when), rqn = 1 + (q > 1 && rng.chance(0.3) ? 1 : 0);
          if (list) list.push(itemRow, rqn); else this.retQueue.set(when, [itemRow, rqn]);
        }
      }
      const total = sub - dsc, u = rng.next();
      const pay = online ? (u < 0.72 ? 0 : 3) : tillDown ? 1 : u < cashShare ? 1 : u < cashShare + mobileShare ? 2 : 0;
      const emp = online ? null : duty[duty.length > 1 && sec >= mid ? 1 : 0][rng.int(small.staffPerShift)];
      if (isRest) {
        let table: number | null = null;
        if (!online) { for (let k = 0; k < 8 && table === null; k++) { const c = rng.int(this.seats.length); if (this.seats[c] >= guests || k === 7) table = c + 1; } }
        TX.add(txRow + 1, d, d * 86400 + sec, cust >= 0 ? cust + 1 : null, emp, online, pay, n, sub, dsc, tx, total, table, online ? null : guests);
        if (booked) { reserved++; RES.add(RES.n + 1, d, d * 86400 + Math.floor(sec / 1800) * 1800, cust >= 0 ? cust + 1 : null, table, guests, rng.int(12), 0, txRow + 1); }
      } else TX.add(txRow + 1, d, d * 86400 + sec, cust >= 0 ? cust + 1 : null, emp, online, pay, n, sub, dsc, tx, total);
      gross += sub; disc += dsc; tax += tx; net += total - tx; units += n; nTx++; takings += total;
      if (pay !== 1) cardSales += total;
      if (cust >= 0) {
        this.cLast[cust] = d;
        if (rng.chance(churn * (missed ? 1.5 : 1))) { const pos = this.cPos[cust], last = this.alive.pop()!; if (last !== cust) { this.alive[pos] = last; this.cPos[last] = pos; } this.cPos[cust] = -1; }
      }
    }
    if (isRest && reserved) {
      const miss = rng.binomial(reserved, 0.1);
      for (let i = 0; i < miss; i++) {
        const c = this.alive.length && rng.chance(0.6) ? this.alive[rng.int(this.alive.length)] + 1 : null, hour = rng.weighted(storeHours);
        RES.add(RES.n + 1, d, d * 86400 + hour * 3600 + rng.int(2) * 1800, c, 1 + rng.int(this.seats.length), 1 + rng.poisson(party - 1), rng.int(12), rng.chance(0.4) ? 1 : 2, null);
      }
    }
    // customers who have not been seen for months stop counting as regulars
    if (info.dom === 1) for (let i = this.alive.length - 1; i >= 0; i--) {
      const c = this.alive[i];
      if (d - this.cLast[c] > 150 && rng.chance(0.5)) { const last = this.alive.pop()!; if (last !== c) { this.alive[i] = last; this.cPos[last] = i; } this.cPos[c] = -1; }
    }

    // stock: sales, spoilage, reorders
    const IM = T.inventory_movements, late = this.anomalyAt(d, 1), lateSup = late ? late.start % tpl.suppliers.length : -1;
    let waste = 0, outs = 0, invValue = 0;
    for (let p = 0; p < this.everN; p++) {
      if (this.sold[p]) IM.add(IM.n + 1, d, p + 1, 1, -this.sold[p], this.stock[p]);
      const spoil = tpl.cats[this.catOf[p]].spoil;
      if (spoil && this.stock[p] > 0) {
        const wq = rng.binomial(this.stock[p], spoil);
        if (wq) { this.stock[p] -= wq; waste += wq * this.cost[p]; IM.add(IM.n + 1, d, p + 1, 3, -wq, this.stock[p]); }
      }
      if (!closed) this.ewma[p] = 0.85 * this.ewma[p] + 0.15 * (this.sold[p] + this.lostU[p]);
      this.sold[p] = 0; this.lostU[p] = 0;
      if (p < this.activeN) { if (this.stock[p] <= 0) outs++; this.order(p, d, this.supOf[p] === lateSup ? late!.mag : 0); }
      invValue += this.stock[p] * this.cost[p];
    }

    // costs
    const rent = Math.round((big.sizeM2 * tpl.rentM2[big.locationTier - 1] * 100) / dim);
    const util = Math.round(((big.sizeM2 * tpl.utilitiesM2 * (0.85 + 0.02 * Math.abs(info.temp - 18)) * (closed ? 0.5 : 1)) / dim) * 100);
    const fees = Math.round(cardSales * CARD_FEE), other = Math.round(net * 0.004) + (rng.chance(1 / 90) ? Math.round(big.sizeM2 * rng.range(3, 9) * 100) : 0);
    const add = [rent, labour, util, mktToday, fees, other];
    for (let i = 0; i < 6; i++) this.mtd[i] += add[i];
    const opex = rent + util + mktToday + fees + other, gm = net - cogs, profit = gm - refundsNet - waste - labour - opex;
    this.cash += takings - tax - refundsGross - labour - opex;
    if (info.dom === dim) for (let i = 0; i < 6; i++) { if (this.mtd[i] > 0) T.expenses.add(T.expenses.n + 1, d, i, this.mtd[i]); this.mtd[i] = 0; }

    T.calendar.add(d, info.y, Math.ceil(info.m / 3), info.m, info.isoWeek, info.dow + 1, info.dow, info.dow >= 5 ? 1 : 0, info.holiday ? 1 : 0, info.holiday, info.event, info.temp, info.rain, closed ? 0 : 1);
    T.daily_summary.add(d, closed ? 0 : 1, visitorsStore, visitorsOnline, walkouts, nTx, units, gross, disc, net, tax, cogs, gm, refundsNet, waste, labour, rent, util, mktToday, fees, other, profit,
      newC, retC, outs, lostSales, invValue, staffHours, this.cash);
    this.day++;
  }

  run(days: number, onProgress?: (done: number) => void) {
    for (let i = 0; i < days; i++) { this.step(); if (onProgress && i % 30 === 29) onProgress(i + 1); }
  }
}
