import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Kpis } from '../engine/analytics';
import { useStore } from '../store';
import { sim } from '../worker/client';
import { Chart } from './Chart';
import { compareChart } from './charts';
import { Card, Progress, Seg, useCtx, useT } from './components';
import { SERIES, int, money, moneyC, num, pct } from './fmt';

type Item = { start: string; days: number; weeks: number[]; kpis: Kpis };

export function Compare() {
  const t = useT(), c = useCtx(), recipes = useStore(s => s.recipes), list = useMemo(() => recipes.filter(r => !r.deleted), [recipes]), runtime = useStore(s => s.runtime), versions = useStore(s => s.version), open = useStore(s => s.open);
  const [sel, setSel] = useState<string[]>(() => list.slice(0, 4).map(r => r.id)), [indexed, setIndexed] = useState(false), [data, setData] = useState<Record<string, Item>>({});
  const chosen = list.filter(r => sel.includes(r.id)).slice(0, 8);
  const loading = chosen.filter(r => !runtime[r.id] || runtime[r.id].progress !== null || runtime[r.id].day !== r.day);
  useEffect(() => { for (const r of chosen) void open(r.id); }, [sel.join()]);
  const vKey = chosen.map(r => `${r.id}:${versions[r.id] ?? 0}:${runtime[r.id]?.day}`).join();
  useEffect(() => { if (!loading.length && chosen.length) sim.call('compare', { ids: chosen.map(r => r.id) }).then(setData).catch(() => { }); }, [vKey, loading.length]);
  // colour follows the business: its slot is its position in the portfolio, whatever is selected
  const color = (id: string) => SERIES[c.theme][list.findIndex(r => r.id === id) % 8];
  const items = chosen.filter(r => data[r.id]).map(r => ({ name: r.big.name, color: color(r.id), ...data[r.id] }));
  const option = useMemo(() => compareChart(items, c, indexed), [JSON.stringify(items.map(i => [i.name, i.weeks.length, i.weeks[i.weeks.length - 1]])), c, indexed]);
  const rows: [string, (k: Kpis) => string][] = [
    [t('k_revenue'), k => moneyC(k.revenue, c.lang)], [t('k_margin'), k => pct(k.marginPct, c.lang)], [t('k_profit'), k => `${moneyC(k.netProfit, c.lang)} (${pct(k.profitPct, c.lang)})`], [t('k_ticket'), k => money(k.avgTicket, c.lang, 2)],
    [t('k_tx'), k => int(k.transactions, c.lang)], [t('k_conv'), k => pct(k.conversion, c.lang)], [t('k_labour'), k => pct(k.labourPct, c.lang)], [t('k_m2'), k => money(k.salesPerM2, c.lang)],
    [t('k_retention'), k => (k.retention == null ? '–' : pct(k.retention, c.lang))], [t('k_stockout'), k => pct(k.stockoutRate, c.lang)], [t('k_turnover'), k => num(k.inventoryTurnover, c.lang)], [t('k_breakeven'), k => `${num(k.breakEvenRatio, c.lang, 2)}×`],
  ];
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto fade-in">
      <h1 className="text-2xl font-bold">{t('compareTitle')}</h1><p className="text-sm text-muted mb-4">{t('compareHint')}</p>
      {list.length === 0 ? <Card><p className="text-sm text-ink2">{t('noBusinesses')}</p></Card> : <>
        <div className="flex flex-wrap gap-2 mb-4">
          {list.map(r => { const on = sel.includes(r.id); return <button key={r.id} aria-pressed={on} className="chip !py-1.5 !px-3" onClick={() => setSel(s => (on ? s.filter(x => x !== r.id) : [...s, r.id]))}><span className="w-3 h-3 rounded-sm grid place-items-center" style={{ background: on ? color(r.id) : 'transparent', border: `1px solid ${color(r.id)}` }}>{on && <Check size={10} color="#fff" />}</span>{r.big.name}</button>; })}
        </div>
        {loading.length > 0 ? <Progress value={(loading.reduce((a, r) => a + (runtime[r.id]?.progress ?? 0), 0)) / loading.length} label={t('loading')} /> : items.length > 0 && <>
          <Card title={t('weeklyRev')} right={<Seg value={indexed ? 1 : 0} options={[[0, t('absolute')], [1, t('indexed')]]} onChange={v => setIndexed(!!v)} />} className="mb-4"><Chart option={option} height={340} label={t('weeklyRev')} /></Card>
          <Card title={t('last90')}>
            <div className="overflow-auto"><table className="w-full text-sm num">
              <thead><tr><th className="label text-left py-2">{t('metric')}</th>{items.map(i => <th key={i.name} className="text-right py-2 px-2 font-semibold"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: i.color }} />{i.name}</th>)}</tr></thead>
              <tbody>{rows.map(([label, f]) => <tr key={label} className="border-t border-line"><td className="py-1.5 text-ink2">{label}</td>{items.map(i => <td key={i.name} className="text-right px-2">{f(i.kpis)}</td>)}</tr>)}</tbody>
            </table></div>
          </Card>
        </>}
      </>}
    </div>
  );
}
