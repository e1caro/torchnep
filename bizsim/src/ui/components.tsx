import { ArrowDownRight, ArrowUpRight, BookOpen, Coffee, Minus, Pill, Plus, Shirt, ShoppingCart, UtensilsCrossed, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { BizType } from '../engine/types';
import { tr, type Key } from '../i18n';
import { useStore } from '../store';
import type { Ctx } from './charts';
import { accent } from './fmt';

export const ICON: Record<BizType, typeof Shirt> = { clothing: Shirt, restaurant: UtensilsCrossed, bookshop: BookOpen, cafe: Coffee, pharmacy: Pill, supermarket: ShoppingCart };

export function useT() {
  const lang = useStore(s => s.settings.lang);
  return useCallback((k: Key, v?: Record<string, string | number>) => tr(lang, k, v), [lang]);
}
export function useNarrow(limit = 820) {
  const [n, setN] = useState(() => window.innerWidth < limit);
  useEffect(() => { const f = () => setN(window.innerWidth < limit); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [limit]);
  return n;
}
export function useCtx(type?: BizType): Ctx {
  const { lang, theme } = useStore(s => s.settings), t = useT(), narrow = useNarrow();
  return useMemo(() => ({ lang, theme, t, narrow, accent: type ? accent(type, theme) : accent('supermarket', theme) }), [lang, theme, t, narrow, type]);
}
export const accentStyle = (color: string) => ({ '--accent': color }) as CSSProperties;

export function useRoute(): string[] {
  const [h, setH] = useState(() => location.hash);
  useEffect(() => { const f = () => setH(location.hash); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return h.replace(/^#\/?/, '').split('/').filter(Boolean);
}
export const go = (path: string) => { location.hash = '#/' + path; };

export function Card({ title, sub, right, children, className = '', glow = false }: { title?: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <section className={`card ${glow ? 'glow' : ''} p-4 sm:p-5 min-w-0 ${className}`}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0"><h3 className="font-semibold text-[15px] leading-tight">{title}</h3>{sub && <p className="text-xs text-muted mt-1 leading-snug">{sub}</p>}</div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

/** A stat tile: label, value, and the change against the previous period with an arrow so it never relies on colour alone. */
export function Kpi({ label, value, sub, delta, goodUp = true, hint }: { label: string; value: string; sub?: string; delta?: number | null; goodUp?: boolean; hint?: string }) {
  const up = (delta ?? 0) >= 0, good = up === goodUp, flat = delta != null && Math.abs(delta) < 0.0005;
  return (
    <div className="card glow p-4 min-w-0" title={hint}>
      <div className="label truncate">{label}</div>
      <div className="text-[22px] sm:text-2xl font-semibold mt-1.5 leading-none truncate">{value}</div>
      <div className="mt-2 text-xs text-muted flex items-center gap-1.5 min-h-4">
        {delta != null && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-0.5 font-semibold num whitespace-nowrap ${flat ? '' : good ? 'text-good' : 'text-bad'}`}>
            {flat ? <Minus size={13} /> : up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{(Math.abs(delta) * 100).toFixed(1)} %
          </span>
        )}
        {sub && <span className="truncate">{sub}</span>}
      </div>
    </div>
  );
}

export function Slider({ label, hint, value, min, max, step, format, onChange, mark }: { label: string; hint?: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void; mark?: boolean }) {
  const p = max > min ? ((value - min) / (max - min)) * 100 : 0, clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium">{label}{mark && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-accent align-middle" />}</label>
        <span className="text-sm font-semibold num">{format(value)}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <button className="btn ghost !min-h-8 !px-2" aria-label={`${label} −`} onClick={() => onChange(clamp(value - step))}><Minus size={14} /></button>
        <input className="slider" type="range" min={min} max={max} step={step} value={value} aria-label={label} style={{ '--p': `${p}%` } as CSSProperties} onChange={e => onChange(+e.target.value)} />
        <button className="btn ghost !min-h-8 !px-2" aria-label={`${label} +`} onClick={() => onChange(clamp(value + step))}><Plus size={14} /></button>
      </div>
      {hint && <p className="text-xs text-muted mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  return <div className="seg" role="group" aria-label={label}>{options.map(([v, l]) => <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>)}</div>;
}
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer">
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="shrink-0 mt-0.5 w-11 h-6 rounded-full border border-line relative transition-colors" style={{ background: checked ? 'var(--accent)' : 'var(--surface-2)' }}>
        <span className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all" style={{ left: checked ? 22 : 3 }} />
      </button>
      <span className="min-w-0"><span className="text-sm font-medium block">{label}</span>{hint && <span className="text-xs text-muted leading-snug block mt-0.5">{hint}</span>}</span>
    </label>
  );
}
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const t = useT();
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 fade-in" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[88vh] flex flex-col !rounded-b-none sm:!rounded-b-[18px] safe-b`} onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-line"><h2 className="font-semibold">{title}</h2><button className="btn ghost !px-2" aria-label={t('close')} onClick={onClose}><X size={18} /></button></header>
        <div className="p-4 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
export function Spark({ data, color, height = 36 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data, 1), min = Math.min(...data), w = 200, pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - 3 - ((v - min) / Math.max(1, max - min)) * (height - 6)}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></svg>;
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="py-10 text-center fade-in">
      <div className="text-sm text-ink2 mb-3 pulse">{label}</div>
      <div className="mx-auto max-w-xs h-1.5 rounded-full bg-surface2 overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  );
}
