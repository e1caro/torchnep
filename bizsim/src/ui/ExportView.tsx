import { Check, Database, Download, FileCode2, FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isoDate } from '../engine/table';
import type { Recipe } from '../engine/types';
import type { Format } from '../export';
import type { Key } from '../i18n';
import { saveFile } from '../native/save';
import { useStore } from '../store';
import { sim } from '../worker/client';
import type { TableInfo } from '../worker/protocol';
import { Card, Toggle, useT } from './components';
import { int } from './fmt';

const FORMATS: [Format, typeof FileText][] = [['csv', FileText], ['xlsx', FileSpreadsheet], ['sqlite', Database], ['sql', FileCode2]];

export function ExportView({ recipe: r }: { recipe: Recipe }) {
  const t = useT(), lang = useStore(s => s.settings.lang), li = lang === 'es' ? 1 : 0, setDirty = useStore(s => s.setDirty);
  const [tables, setTables] = useState<TableInfo[]>([]), [off, setOff] = useState<Set<string>>(new Set()), [format, setFormat] = useState<Format>('xlsx'), [keys, setKeys] = useState(false);
  const [from, setFrom] = useState(0), [to, setTo] = useState(r.day - 1), [state, setState] = useState<'idle' | 'busy' | string>('idle'), [error, setError] = useState('');
  useEffect(() => { sim.call('tables', { id: r.id, dirty: r.dirty, lang }).then(setTables).catch(() => { }); }, [r.id, r.day, r.dirty, lang]);
  useEffect(() => { setTo(r.day - 1); }, [r.day]);
  const offered = tables.filter(x => keys || !x.key), chosen = offered.filter(x => !off.has(x.name) || x.name === 'data_dictionary');
  const dayOf = (iso: string) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(r.big.startDate + 'T00:00:00Z')) / 86400000);
  const run = async () => {
    setState('busy'); setError('');
    try {
      const f = await sim.call('export', { id: r.id, opts: { tables: chosen.map(x => x.name), format, from, to, dirty: r.dirty, keys, lang } });
      await saveFile(f.name, f.mime, f.parts); setState(f.name);
    } catch (e) { setError((e as Error).message); setState('idle'); }
  };
  const iso = (d: number) => isoDate(r.big.startDate, d), max = iso(r.day - 1);
  return (
    <div className="fade-in grid gap-4 max-w-4xl">
      <Card title={t('format')}>
        <div className="grid gap-2 sm:grid-cols-2">
          {FORMATS.map(([f, Icon]) => (
            <button key={f} aria-pressed={format === f} onClick={() => setFormat(f)} className={`text-left p-3 rounded-xl border flex gap-3 items-start ${format === f ? 'border-accent bg-surface2' : 'border-line'}`}>
              <Icon size={20} className={format === f ? 'text-accent' : 'text-muted'} /><span><span className="font-semibold text-sm block">{t(`f_${f}` as Key)}</span><span className="text-xs text-muted">{t(`f_${f}D` as Key)}</span></span>
            </button>
          ))}
        </div>
      </Card>
      <Card title={t('whichTables')} sub={t('dictIncluded')} right={<div className="flex gap-1"><button className="btn ghost !min-h-8" onClick={() => setOff(new Set())}>{t('selectAll')}</button><button className="btn ghost !min-h-8" onClick={() => setOff(new Set(offered.map(x => x.name)))}>{t('selectNone')}</button></div>}>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {offered.map(x => {
            const on = chosen.includes(x), locked = x.name === 'data_dictionary';
            return (
              <label key={x.name} className="flex items-center gap-2.5 py-1.5 cursor-pointer" title={x.d[li]}>
                <input type="checkbox" className="sr-only" checked={on} disabled={locked} onChange={() => setOff(s => { const n = new Set(s); if (on) n.add(x.name); else n.delete(x.name); return n; })} />
                <span className={`w-5 h-5 rounded-md border grid place-items-center shrink-0 ${on ? 'bg-accent border-transparent text-white' : 'border-line'}`}>{on && <Check size={14} />}</span>
                <span className="text-sm num truncate">{x.name}</span><span className="text-xs text-muted num ml-auto">{int(x.rows, lang)}</span>
              </label>
            );
          })}
        </div>
      </Card>
      <Card title={t('dateRange')} sub={t('dateRangeHint')}>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm flex items-center gap-2">{t('from')}<input type="date" className="field !w-auto" min={r.big.startDate} max={max} value={iso(from)} onChange={e => { const d = dayOf(e.target.value); if (d >= 0 && d <= to) setFrom(d); }} /></label>
          <label className="text-sm flex items-center gap-2">{t('to')}<input type="date" className="field !w-auto" min={r.big.startDate} max={max} value={iso(to)} onChange={e => { const d = dayOf(e.target.value); if (d >= from && d < r.day) setTo(d); }} /></label>
          <button className="btn ghost" onClick={() => { setFrom(0); setTo(r.day - 1); }}>{t('rAll')}</button>
        </div>
      </Card>
      <Card>
        <Toggle checked={r.dirty} onChange={x => setDirty(r.id, x)} label={t('dirty')} hint={t('dirtyHint')} />
        {r.dirty && (format === 'sqlite' || format === 'sql') && <p className="text-xs text-muted ml-14 -mt-1 mb-1">{t('dirtyKeysNote')}</p>}
        <Toggle checked={keys} onChange={setKeys} label={t('includeKeys')} hint={t('includeKeysHint')} />
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn primary !min-h-12 !px-6" disabled={state === 'busy' || chosen.length === 0} onClick={run}><Download size={18} />{state === 'busy' ? t('preparing') : t('download')}</button>
        {state !== 'idle' && state !== 'busy' && <span className="text-sm text-good flex items-center gap-1.5"><Check size={16} />{t('downloaded', { name: state })}</span>}
        {error && <span className="text-sm text-bad">{error}</span>}
      </div>
    </div>
  );
}
