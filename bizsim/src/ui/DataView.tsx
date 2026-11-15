import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, KeyRound, Link2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Value } from '../engine/rows';
import type { Recipe } from '../engine/types';
import { useStore } from '../store';
import { sim } from '../worker/client';
import type { TableInfo } from '../worker/protocol';
import { Card, Toggle, useT } from './components';
import { int } from './fmt';

const PAGE = 200;

export function DataView({ recipe: r }: { recipe: Recipe }) {
  const t = useT(), lang = useStore(s => s.settings.lang), li = lang === 'es' ? 1 : 0, setDirty = useStore(s => s.setDirty);
  const [tables, setTables] = useState<TableInfo[]>([]), [name, setName] = useState('transactions');
  const [sort, setSort] = useState<{ col: number; desc: boolean } | undefined>(), [filters, setFilters] = useState<Record<number, string>>({}), [search, setSearch] = useState('');
  const [total, setTotal] = useState(0), [pages, setPages] = useState<Record<number, Value[][]>>({}), gen = useRef(0), asked = useRef(new Set<number>());
  useEffect(() => { sim.call('tables', { id: r.id, dirty: r.dirty, lang }).then(setTables).catch(() => { }); }, [r.id, r.day, r.dirty, lang]);
  const info = tables.find(x => x.name === name) ?? tables[0];
  const qKey = JSON.stringify([info?.name, sort, filters, search, r.day, r.dirty, lang]);
  const [debounced, setDebounced] = useState(qKey);
  useEffect(() => { const h = setTimeout(() => setDebounced(qKey), 250); return () => clearTimeout(h); }, [qKey]);
  const load = (page: number, g: number) => {
    if (!info || asked.current.has(page)) return;
    asked.current.add(page);
    sim.call('rows', { id: r.id, table: info.name, dirty: r.dirty, lang, query: { offset: page * PAGE, limit: PAGE, sort, filters, search } })
      .then(res => { if (g !== gen.current) return; setTotal(res.total); setPages(p => ({ ...p, [page]: res.rows })); }).catch(() => { });
  };
  useEffect(() => { gen.current++; asked.current = new Set(); setPages({}); load(0, gen.current); }, [debounced]);
  const box = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: total, getScrollElement: () => box.current, estimateSize: () => 32, overscan: 12 });
  const items = v.getVirtualItems();
  useEffect(() => { const g = gen.current; for (const p of new Set([items[0], items[items.length - 1]].filter(Boolean).map(i => Math.floor(i.index / PAGE)))) load(p, g); }, [items[0]?.index, items[items.length - 1]?.index]);
  const widths = useMemo(() => info?.cols.map(c => (c.type === 'text' ? 220 : c.type === 'datetime' ? 170 : c.type === 'date' ? Math.max(112, c.name.length * 8.5 + 34) : Math.max(96, c.name.length * 8.5 + 34))) ?? [], [info?.name]);
  const width = widths.reduce((a, b) => a + b, 0);
  const pick = (n: string) => { setName(n); setSort(undefined); setFilters({}); setSearch(''); box.current?.scrollTo(0, 0); };
  if (!info) return <Card><p className="text-sm text-muted">{t('loading')}</p></Card>;
  const rels = tables.flatMap(tb => tb.cols.filter(c => c.ref && !(tb.name === 'calendar' && c.name === 'date') && tables.some(x => x.name === c.ref)).map(c => [tb.name, c.name, c.ref!] as const)).filter(x => x[0] === info.name || x[2] === info.name);
  return (
    <div className="fade-in grid gap-4">
      <Card>
        <div className="flex flex-wrap gap-1.5">
          {tables.map(tb => <button key={tb.name} onClick={() => pick(tb.name)} className={`chip ${tb.name === info.name ? '!bg-accent !text-white !border-transparent' : ''}`}>{tb.name}<span className="opacity-70 num font-normal">{int(tb.rows, lang)}</span></button>)}
        </div>
        <p className="text-sm text-ink2 mt-3">{info.d[li]}{info.key && <span className="chip ml-2">{t('answerKey')}</span>}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2">
          <input className="field !w-64 max-w-full" placeholder={t('search')} aria-label={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
          <span className="text-sm num text-ink2">{t('rowsN', { n: int(total, lang) })}</span>
          <Toggle checked={r.dirty} onChange={x => setDirty(r.id, x)} label={t('dirty')} />
        </div>
        <p className="text-xs text-muted mt-1">{t('filterHelp')}</p>
      </Card>
      <div className="card overflow-hidden">
        <div ref={box} className="overflow-auto num text-[13px]" style={{ height: 'min(62vh, 640px)' }}>
          <div style={{ width, minWidth: '100%' }}>
            <div className="sticky top-0 z-10 bg-surface border-b border-line">
              <div className="flex">{info.cols.map((c, i) => (
                <button key={c.name} title={c.d[li]} style={{ width: widths[i] }} className="shrink-0 px-2 py-2 text-left font-semibold flex items-center gap-1 hover:bg-surface2" onClick={() => setSort(s => (s?.col === i ? (s.desc ? undefined : { col: i, desc: true }) : { col: i, desc: false }))}>
                  {i === 0 && c.type !== 'text' ? <KeyRound size={12} className="text-accent shrink-0" aria-label={t('primaryKey')} /> : c.ref ? <Link2 size={12} className="text-muted shrink-0" /> : null}
                  <span className="truncate">{c.name}</span>{sort?.col === i && (sort.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                </button>
              ))}</div>
              <div className="flex pb-1.5">{info.cols.map((c, i) => <div key={c.name} style={{ width: widths[i] }} className="shrink-0 px-1"><input className="w-full bg-surface2 rounded-md px-1.5 py-1 text-xs border border-line" placeholder={t('filterPh')} aria-label={`${t('filterPh')} ${c.name}`} value={filters[i] ?? ''} onChange={e => setFilters(f => ({ ...f, [i]: e.target.value }))} /></div>)}</div>
            </div>
            <div style={{ height: v.getTotalSize(), position: 'relative' }}>
              {items.map(it => {
                const row = pages[Math.floor(it.index / PAGE)]?.[it.index % PAGE];
                return (
                  <div key={it.key} className="flex absolute left-0 border-b border-line hover:bg-surface2" style={{ top: it.start, height: 32, width }}>
                    {info.cols.map((c, i) => { const val = row?.[i]; return <div key={i} style={{ width: widths[i] }} className={`shrink-0 px-2 leading-8 truncate ${typeof val === 'number' ? 'text-right' : ''} ${val === null ? 'text-muted' : ''}`}>{row ? (val === null ? '∅' : c.type === 'money' && typeof val === 'number' ? val.toFixed(2) : String(val)) : '…'}</div>; })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {rels.length > 0 && <Card title={t('relations')}><ul className="text-sm num grid gap-1 sm:grid-cols-2">{rels.map(([a, c, b], i) => <li key={i} className="flex items-center gap-2"><Link2 size={13} className="text-muted shrink-0" /><span><b>{a}</b>.{c} → <b>{b}</b></span></li>)}</ul></Card>}
    </div>
  );
}
