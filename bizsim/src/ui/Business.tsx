import { ArrowLeft, FastForward, Pause, Play, SlidersHorizontal, Tag, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { effectiveSmall } from '../cloud/merge';
import { sliderDefs, type SliderDef } from '../engine/params';
import { isoDate } from '../engine/table';
import type { Filters, Recipe } from '../engine/types';
import type { Key } from '../i18n';
import { pendingChanges, useStore } from '../store';
import { sim } from '../worker/client';
import type { DashResult, ProductInfo } from '../worker/protocol';
import { Chart } from './Chart';
import * as ch from './charts';
import { Card, ICON, Kpi, Modal, Progress, Seg, Slider, accentStyle, go, useCtx, useT } from './components';
import { DataView } from './DataView';
import { ExportView } from './ExportView';
import { INK, SERIES, compact, dateLong, int, money, moneyC, num, pct } from './fmt';

const TABS = ['overview', 'sales', 'customers', 'inventory', 'staff', 'forecast', 'data', 'export'] as const;
const TAB_KEY: Record<string, Key> = { overview: 'overview', sales: 'sales', customers: 'customers', inventory: 'inventory', staff: 'staffCosts', forecast: 'forecast', data: 'data', export: 'export' };
type Preset = '30' | '90' | '365' | 'all' | 'custom';

export function Business({ id, tab }: { id: string; tab: string }) {
  const t = useT(), r = useStore(s => s.get(id)), rt = useStore(s => s.runtime[id]), version = useStore(s => s.version[id] ?? 0), playing = useStore(s => !!s.playing[id]), speed = useStore(s => s.speed);
  const { open, advance, setPlaying, setSpeed } = useStore.getState(), ctx = useCtx(r?.big.type);
  const [preset, setPreset] = useState<Preset>('90'), [custom, setCustom] = useState<[number, number]>([0, 0]), [category, setCategory] = useState(-1), [channel, setChannel] = useState<-1 | 0 | 1>(-1);
  const [dash, setDash] = useState<DashResult | null>(null), [showCtl, setShowCtl] = useState(false), seq = useRef(0);
  useEffect(() => { if (!r) go(''); else void open(id); }, [id, !!r]);
  const ready = !!rt && rt.progress === null && !rt.error && !!r && rt.day === r.day;
  const filters: Filters | null = useMemo(() => {
    if (!r) return null;
    const to = r.day - 1;
    if (preset === 'custom') return { from: custom[0], to: Math.min(custom[1], to), category, channel };
    return { from: preset === 'all' ? 0 : Math.max(0, to - +preset + 1), to, category, channel };
  }, [r?.day, preset, custom, category, channel]);
  useEffect(() => {
    if (!ready || !filters || !r) return;
    const mine = ++seq.current;
    sim.call('dash', { id, filters, pending: r }).then(d => { if (mine === seq.current) setDash(d); }).catch(() => { });
  }, [ready, version, filters]);
  if (!r) return null;
  const Icon = ICON[r.big.type], lang = ctx.lang, isDash = !['data', 'export'].includes(tab);

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto" style={accentStyle(ctx.accent)}>
      <header className="flex flex-wrap items-center gap-3 mb-4">
        <button className="btn ghost !px-2.5" aria-label={t('back')} onClick={() => go('')}><ArrowLeft size={18} /></button>
        <span className="w-10 h-10 rounded-2xl grid place-items-center text-white shrink-0" style={{ background: ctx.accent }}><Icon size={20} /></span>
        <div className="min-w-0 flex-1"><h1 className="text-xl font-bold truncate">{r.big.name}</h1><p className="text-xs text-muted truncate">{t(`t_${r.big.type}`)} · {r.big.sizeM2} m² · {t(`loc${r.big.locationTier}` as Key)} · {t(`pos${r.big.pricePos}` as Key)}</p></div>
        <div className="card flex items-center gap-2 p-1.5 pl-3 flex-wrap">
          <div className="mr-1"><div className="text-sm font-semibold num leading-tight">{dateLong(r.big.startDate, r.day - 1, lang)}</div><div className="text-[11px] text-muted leading-tight">{t('dayN', { n: r.day })}</div></div>
          <button className="btn primary !px-3" disabled={!ready} aria-label={playing ? t('pause') : t('play')} onClick={() => setPlaying(id, !playing)}>{playing ? <Pause size={16} /> : <Play size={16} />}<span className="hidden sm:inline">{playing ? t('pause') : t('play')}</span></button>
          <Seg label={t('speed')} value={speed} options={[[1, '1×'], [7, '7×'], [30, '30×']]} onChange={setSpeed} />
          {[30, 90].map(n => <button key={n} className="btn !px-2.5" disabled={!ready || playing} title={`${t('skip')} +${n}`} onClick={() => advance(id, n)}><FastForward size={14} />+{n}</button>)}
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto pb-2 mb-3 -mx-4 px-4 sm:mx-0 sm:px-0" aria-label={r.big.name}>
        {TABS.map(k => <button key={k} onClick={() => go(`b/${id}/${k}`)} aria-current={tab === k ? 'page' : undefined} className={`px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === k ? 'bg-accent text-white' : 'text-ink2 hover:bg-surface'}`}>{t(TAB_KEY[k])}</button>)}
      </nav>

      {rt?.error ? <Card><p className="text-bad text-sm">{rt.error}</p></Card> : !ready && !dash ? <Progress value={rt?.progress ?? 0} label={t('generating', { n: int(r.day, lang) })} /> : tab === 'data' ? <DataView recipe={r} /> : tab === 'export' ? <ExportView recipe={r} /> : (
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5 items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Seg label={t('range')} value={preset} options={[['30', t('r30')], ['90', t('r90')], ['365', t('r365')], ['all', t('rAll')]]} onChange={setPreset} />
              <input type="date" aria-label={t('from')} className="field !w-auto !min-h-9 !py-1" min={r.big.startDate} max={isoDate(r.big.startDate, r.day - 1)} value={filters ? isoDate(r.big.startDate, filters.from) : ''} onChange={e => { const d = dayOf(r, e.target.value); if (d != null && filters) { setCustom([Math.min(d, filters.to), filters.to]); setPreset('custom'); } }} />
              <input type="date" aria-label={t('to')} className="field !w-auto !min-h-9 !py-1" min={r.big.startDate} max={isoDate(r.big.startDate, r.day - 1)} value={filters ? isoDate(r.big.startDate, filters.to) : ''} onChange={e => { const d = dayOf(r, e.target.value); if (d != null && filters) { setCustom([Math.min(filters.from, d), d]); setPreset('custom'); } }} />
              <select aria-label={t('category')} className="field !w-auto !min-h-9 !py-1 max-w-44" value={category} onChange={e => setCategory(+e.target.value)}><option value={-1}>{t('category')}: {t('all')}</option>{dash?.catNames.map((n, i) => <option key={i} value={i}>{n}</option>)}</select>
              {r.big.online && <select aria-label={t('channel')} className="field !w-auto !min-h-9 !py-1" value={channel} onChange={e => setChannel(+e.target.value as -1 | 0 | 1)}><option value={-1}>{t('channel')}: {t('all')}</option><option value={0}>{t('store')}</option><option value={1}>{t('onlineCh')}</option></select>}
              <button className="btn xl:hidden ml-auto" onClick={() => setShowCtl(true)}><SlidersHorizontal size={16} />{t('controls')}{pendingChanges(r).length > 0 && <span className="w-2 h-2 rounded-full bg-accent" />}</button>
            </div>
            {dash && isDash && <Tabs tab={tab} d={dash} c={ctx} r={r} filtered={category >= 0 || channel >= 0} />}
          </div>
          <aside className="hidden xl:block sticky top-4 max-h-[calc(100vh-2rem)] overflow-auto card p-4"><Controls r={r} /></aside>
          {showCtl && <Modal title={t('controls')} onClose={() => setShowCtl(false)}><Controls r={r} /></Modal>}
        </div>
      )}
    </div>
  );
}
const dayOf = (r: Recipe, iso: string) => { if (!iso) return null; const d = Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(r.big.startDate + 'T00:00:00Z')) / 86400000); return d >= 0 && d < r.day ? d : null; };

function Tabs({ tab, d, c, r, filtered }: { tab: string; d: DashResult; c: ch.Ctx; r: Recipe; filtered: boolean }) {
  const { t, lang } = c, k = d.kpis, p = k.prev, dl = (a: number, b: number | undefined) => (b ? (a - b) / Math.abs(b) : null), s = SERIES[c.theme], ink = INK[c.theme];
  const eur = (v: number) => moneyC(v, lang), eurAxis = (v: number) => `${compact(v, lang)} €`;
  const grid = 'grid gap-3 grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 mb-4', two = 'grid gap-4 lg:grid-cols-2 mb-4';
  const o = useMemo(() => {
    switch (tab) {
      case 'overview': return { a: ch.revenue(d, c, true), b: ch.hbars(d.categories.map(x => x.name), d.categories.map(x => x.rev), c, eur), c: ch.heat(d, c), d: ch.pnl(d, c) };
      case 'sales': { const top = d.products.slice(0, 12), pa = ch.pareto(d, c); return { a: ch.hbars(top.map(x => x.name), top.map(x => x.rev), c, eur), b: pa.option, pa, c: ch.priceQty(d, c), d: ch.vbars([0, 1, 2, 3, 4, 5, 6].map(i => t(`wd${i}` as Key)), d.weekday.map(w => w.rev), c, eurAxis), e: ch.hbars(d.channels.map(x => t(x.name === 'store' ? 'store' : 'onlineCh')), d.channels.map(x => x.rev), c, eur), f: ch.hbars(d.payments.map(x => t(`pay_${x.name}` as Key)), d.payments.map(x => x.tx), c, v => int(v, lang)) }; }
      case 'customers': return { a: ch.newReturning(d, c), b: ch.cohorts(d, c), c: ch.hbars(d.rfm.map(x => t(`seg_${x.segment}` as Key)), d.rfm.map(x => x.customers), c, v => int(v, lang)) };
      case 'inventory': return { a: ch.series1(d, c, d.daily.inventory, eurAxis), b: ch.series1(d, c, d.daily.stockouts, v => int(v, lang), 'bar', ink.neg), c: ch.series1(d, c, d.daily.lost, eurAxis, 'bar', ink.neg) };
      case 'staff': return { a: ch.vbars([0, 1, 2, 3, 4, 5, 6].map(i => t(`wd${i}` as Key)), d.weekday.map(w => w.walkouts), c, v => num(v, lang), ink.neg), b: ch.vbars(d.monthly.map(m => m.month), d.monthly.map(m => Math.round(m.labourPct * 1000) / 10), c, v => `${v} %`), c: ch.series1(d, c, d.daily.cash, eurAxis), d: ch.pnl(d, c) };
      default: return { a: ch.forecast(d, c), b: ch.revenue(d, c, true) };
    }
  }, [tab, d, c]) as Record<string, object> & { pa?: { a80: number; n: number } };
  const note = filtered && <p className="text-xs text-muted mb-3">{t('filteredNote')}</p>;

  if (tab === 'overview') return (
    <div className="fade-in">
      <div className={grid}>
        <Kpi label={t('k_revenue')} value={eur(k.revenue)} delta={dl(k.revenue, p?.revenue)} sub={p ? t('vsPrev') : undefined} />
        <Kpi label={t('k_margin')} value={pct(k.marginPct, lang)} sub={eur(k.grossMargin)} delta={dl(k.grossMargin, p?.grossMargin)} />
        <Kpi label={t('k_profit')} value={eur(k.netProfit)} sub={`${pct(k.profitPct, lang)} ${t('ofRevenue')}`} delta={dl(k.netProfit, p?.netProfit)} />
        <Kpi label={t('k_ticket')} value={money(k.avgTicket, lang, 2)} delta={dl(k.avgTicket, p?.avgTicket)} />
        <Kpi label={t('k_tx')} value={int(k.transactions, lang)} delta={dl(k.transactions, p?.transactions)} />
        <Kpi label={t('k_conv')} value={pct(k.conversion, lang)} delta={dl(k.conversion, p?.conversion)} hint={t('h_conv')} sub={`${compact(k.visitors, lang)} ${t('k_visitors').toLowerCase()}`} />
      </div>
      {note}
      <Card title={t('c_revenue')} sub={d.to === d.day - 1 ? t('c_projNote') : undefined} className="mb-4"><Chart option={o.a} height={320} label={t('c_revenue')} /></Card>
      <div className={two}>
        <Card title={t('c_byCategory')}><Chart option={o.b} height={Math.max(180, d.categories.length * 30)} label={t('c_byCategory')} /></Card>
        <Card title={t('c_heat')} sub={t('c_heatSub')}><Chart option={o.c} height={270} label={t('c_heat')} /></Card>
      </div>
      <Card title={t('c_pnl')}><Chart option={o.d} height={300} label={t('c_pnl')} /></Card>
    </div>
  );
  if (tab === 'sales') return (
    <div className="fade-in">
      <div className={two}>
        <Card title={t('c_top')}><Chart option={o.a} height={380} label={t('c_top')} /></Card>
        <Card title={t('c_pareto')} sub={`${t('c_paretoSub')}. ${t('c_paretoA', { a: o.pa!.a80, n: o.pa!.n })}.`}><Chart option={o.b} height={340} label={t('c_pareto')} /></Card>
      </div>
      <div className={two}>
        <Card title={t('c_priceQty')} sub={t('c_priceQtySub')}><Chart option={o.c} height={320} label={t('c_priceQty')} /></Card>
        <Card title={t('c_weekday')}><Chart option={o.d} height={320} label={t('c_weekday')} /></Card>
      </div>
      <div className={two}>
        {r.big.online && <Card title={t('c_channels')}><Chart option={o.e} height={110} label={t('c_channels')} /></Card>}
        <Card title={t('c_payments')}><Chart option={o.f} height={40 + d.payments.length * 32} label={t('c_payments')} /></Card>
      </div>
      <Card title={t('c_monthly')}><MiniTable head={[t('month'), t('revenue'), t('margin'), t('profit')]} rows={d.monthly.map(m => [m.month, money(m.rev, lang), money(m.margin, lang), money(m.profit, lang)])} /></Card>
    </div>
  );
  if (tab === 'customers') return (
    <div className="fade-in">
      <div className={grid}>
        <Kpi label={t('k_new')} value={int(k.newCustomers, lang)} /><Kpi label={t('k_ret')} value={int(k.returningCustomers, lang)} />
        <Kpi label={t('k_retention')} value={k.retention == null ? '–' : pct(k.retention, lang)} hint={t('h_retention')} sub={t('vsPrev')} /><Kpi label={t('k_churn')} value={k.churn == null ? '–' : pct(k.churn, lang)} />
        <Kpi label={t('k_clv')} value={money(k.clv, lang, 2)} hint={t('h_clv')} /><Kpi label={t('k_cac')} value={k.cac == null ? '–' : money(k.cac, lang, 2)} hint={t('h_cac')} />
      </div>
      <Card title={t('c_newRet')} className="mb-4"><Chart option={o.a} height={280} label={t('c_newRet')} /></Card>
      <Card title={t('c_cohort')} sub={t('c_cohortSub')} className="mb-4"><Chart option={o.b} height={Math.max(200, 60 + d.cohorts.length * 30)} label={t('c_cohort')} /></Card>
      <div className={two}>
        <Card title={t('c_rfm')} sub={t('c_rfmSub')}><Chart option={o.c} height={230} label={t('c_rfm')} /></Card>
        <Card title={t('c_rfm')}><MiniTable head={['', t('customers'), t('recency'), t('frequency'), t('monetary')]} rows={d.rfm.map(x => [t(`seg_${x.segment}` as Key), int(x.customers, lang), String(x.recency), num(x.frequency, lang), money(x.monetary, lang, 2)])} /></Card>
      </div>
    </div>
  );
  if (tab === 'inventory') {
    const empty = d.products.filter(x => x.stock <= 0).slice(0, 12);
    return (
      <div className="fade-in">
        <div className={grid.replace('2xl:grid-cols-6', '2xl:grid-cols-5')}>
          <Kpi label={t('k_turnover')} value={num(k.inventoryTurnover, lang)} sub={t('perYear')} /><Kpi label={t('k_stockout')} value={pct(k.stockoutRate, lang)} />
          <Kpi label={t('k_lost')} value={eur(k.lostSales)} /><Kpi label={t('k_waste')} value={pct(k.wastePct, lang)} sub={t('ofCogs')} /><Kpi label={t('k_returns')} value={pct(k.returnRate, lang, 2)} />
        </div>
        <Card title={t('c_invValue')} className="mb-4"><Chart option={o.a} height={260} label={t('c_invValue')} /></Card>
        <div className={two}>
          <Card title={t('c_stockouts')}><Chart option={o.b} height={240} label={t('c_stockouts')} /></Card>
          <Card title={t('c_lost')}><Chart option={o.c} height={240} label={t('c_lost')} /></Card>
        </div>
        {empty.length > 0 && <Card title={t('c_emptyStock')}><MiniTable head={[t('product'), t('units'), t('revenue')]} rows={empty.map(x => [x.name, int(x.units, lang), money(x.rev, lang)])} /></Card>}
      </div>
    );
  }
  if (tab === 'staff') return (
    <div className="fade-in">
      <div className={grid}>
        <Kpi label={t('k_labour')} value={pct(k.labourPct, lang)} sub={t('ofRevenue')} /><Kpi label={t('k_m2')} value={money(k.salesPerM2, lang)} />
        <Kpi label={t('k_breakeven')} value={eur(k.breakEvenPerDay)} sub={t('timesBE', { v: num(k.breakEvenRatio, lang, 2) })} hint={t('h_breakeven')} /><Kpi label={t('k_walkouts')} value={int(k.walkouts, lang)} hint={t('h_walkouts')} />
        <Kpi label={t('k_cash')} value={eur(k.cash)} />
        {k.foodCostPct != null ? <Kpi label={t('k_food')} value={pct(k.foodCostPct, lang)} sub={t('ofRevenue')} /> : <Kpi label={t('k_profit')} value={eur(k.netProfit)} />}
        {k.tableTurnover != null && <Kpi label={t('k_tables')} value={num(k.tableTurnover, lang, 2)} sub={t('perTableDay')} />}
      </div>
      <div className={two}>
        <Card title={t('c_walkWeekday')} sub={t('c_walkSub')}><Chart option={o.a} height={250} label={t('c_walkWeekday')} /></Card>
        <Card title={t('c_labourMonth')}><Chart option={o.b} height={250} label={t('c_labourMonth')} /></Card>
      </div>
      <Card title={t('c_cash')} className="mb-4"><Chart option={o.c} height={250} label={t('c_cash')} /></Card>
      <Card title={t('c_pnl')}><Chart option={o.d} height={300} label={t('c_pnl')} /></Card>
    </div>
  );
  return (
    <div className="fade-in">
      <Card title={t('c_forecast')} sub={t('c_forecastSub')} right={d.forecast.mape != null ? <span className="chip num">{t('mape', { v: pct(d.forecast.mape, lang) })}</span> : undefined} className="mb-4"><Chart option={o.a} height={320} label={t('c_forecast')} /></Card>
      <Card title={t('c_revenue')} sub={t('c_projNote')}><Chart option={o.b} height={300} label={t('c_revenue')} /></Card>
      <span className="hidden" style={{ color: s[0] }} />
    </div>
  );
}

function MiniTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-auto max-h-80"><table className="w-full text-sm num">
      <thead><tr>{head.map((h, i) => <th key={i} className={`label py-2 px-2 sticky top-0 bg-surface ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((v, j) => <td key={j} className={`py-1.5 px-2 ${j ? 'text-right' : 'text-left'}`}>{v}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

function Controls({ r }: { r: Recipe }) {
  const t = useT(), lang = useStore(s => s.settings.lang), { logChange, undoPending } = useStore.getState();
  const now = effectiveSmall(r), applied = effectiveSmall(r, r.day - 1), defs = useMemo(() => sliderDefs(r.big), [r.big]), pend = pendingChanges(r);
  const [prices, setPrices] = useState(false);
  const fmt = (d: SliderDef) => (v: number) => (d.unit === '€' ? money(v, lang) : d.unit === 'd' ? t('days', { n: v }) : d.unit === '%' ? `${v > 0 && (d.key === 'priceLevel' || d.key === 'supplierCost') ? '+' : ''}${v} %` : int(v, lang));
  const log = [...r.changes].sort((a, b) => b.day - a.day).slice(0, 40);
  return (
    <div>
      <h2 className="font-semibold">{t('ctlTitle')}</h2>
      <p className="text-xs text-muted mt-1 leading-snug">{t('ctlHint', { date: dateLong(r.big.startDate, r.day, lang) })}</p>
      {pend.length > 0 && <div className="flex items-center justify-between gap-2 mt-3 p-2 pl-3 rounded-xl bg-surface2 text-sm"><span className="font-semibold">{pend.length === 1 ? t('pending') : t('pendingN', { n: pend.length })}</span><button className="btn ghost !min-h-8" onClick={() => undoPending(r.id)}><Undo2 size={14} />{t('undo')}</button></div>}
      <div className="mt-2 divide-y divide-line">
        {defs.map(d => <Slider key={d.key} label={t(`p_${d.key}` as Key)} hint={t(`ph_${d.key}` as Key)} value={Math.min(d.max, Math.max(d.min, now[d.key]))} min={d.min} max={d.max} step={d.step} format={fmt(d)} mark={now[d.key] !== applied[d.key]} onChange={v => logChange(r.id, d.key, v, applied[d.key])} />)}
      </div>
      <button className="btn w-full mt-3" onClick={() => setPrices(true)}><Tag size={16} />{t('prices')}</button>
      <h3 className="label mt-5 mb-2">{t('changeLog')}</h3>
      {log.length === 0 ? <p className="text-xs text-muted">{t('noChanges')}</p> : (
        <ul className="text-xs space-y-1.5">{log.map(c => (
          <li key={c.id} className="flex justify-between gap-2"><span className="text-ink2 truncate">{dateLong(r.big.startDate, c.day, lang)} · {c.param.startsWith('price:') ? `${t('price')} #${c.param.slice(6)}` : t(`p_${c.param}` as Key)}</span><span className="num font-semibold whitespace-nowrap">{c.old} → {c.value}{c.day >= r.day && <span className="ml-1 text-accent">●</span>}</span></li>
        ))}</ul>
      )}
      {prices && <Prices r={r} onClose={() => setPrices(false)} />}
    </div>
  );
}

function Prices({ r, onClose }: { r: Recipe; onClose: () => void }) {
  const t = useT(), lang = useStore(s => s.settings.lang), version = useStore(s => s.version[r.id] ?? 0), [list, setList] = useState<ProductInfo[]>([]), [q, setQ] = useState('');
  useEffect(() => { sim.call('products', { id: r.id }).then(setList).catch(() => { }); }, [r.id, r.day]);
  const pending = useMemo(() => { const m = new Map<number, number>(); for (const c of pendingChanges(r)) if (c.param.startsWith('price:')) m.set(+c.param.slice(6), c.value); return m; }, [r, version]);
  const shown = list.filter(p => p.active && (!q || p.name.toLowerCase().includes(q.toLowerCase()))).slice(0, 60);
  return (
    <Modal title={t('prices')} onClose={onClose} wide>
      <p className="text-xs text-muted mb-3">{t('pricesHint')}</p>
      <input className="field mb-3" placeholder={t('search')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('search')} />
      <table className="w-full text-sm num"><thead><tr><th className="label text-left py-1">{t('product')}</th><th className="label text-right">{t('cost')}</th><th className="label text-right">{t('stock')}</th><th className="label text-right w-28">{t('price')}</th></tr></thead>
        <tbody>{shown.map(p => (
          <tr key={p.id} className="border-t border-line"><td className="py-1.5 pr-2">{p.name}</td><td className="text-right text-ink2">{money(p.cost, lang, 2)}</td><td className="text-right text-ink2">{p.stock}</td>
            <td className="text-right"><input className="field !min-h-8 !py-1 text-right" inputMode="decimal" aria-label={`${t('price')} ${p.name}`} defaultValue={(pending.get(p.id) || p.price).toFixed(2)} key={`${p.id}-${pending.get(p.id) ?? p.price}`}
              onBlur={e => { const v = Math.round(parseFloat(e.target.value.replace(',', '.')) * 100) / 100, shownNow = pending.get(p.id) || p.price; if (v === shownNow || (!(v > 0) && !p.override && !pending.has(p.id))) return; useStore.getState().logChange(r.id, `price:${p.id}`, Number.isFinite(v) && v > 0 ? v : 0, p.override ? p.price : 0); }} /></td></tr>
        ))}</tbody></table>
    </Modal>
  );
}
