import { BarChart3, Download, GitCompareArrows, LayoutGrid, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { startLoops, useStore } from '../store';
import { Business } from './Business';
import { Compare } from './Compare';
import { go, useRoute, useT } from './components';
import { Portfolio } from './Portfolio';
import { Settings } from './Settings';
import { Wizard } from './Wizard';

let started = false;
export function App() {
  const route = useRoute(), t = useT(), { theme, lang } = useStore(s => s.settings), update = useStore(s => s.update), applyUp = useStore(s => s.applyUpdate);
  const [later, setLater] = useState(false);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.lang = lang; document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0d0d0d' : '#f4f4f1'); }, [theme, lang]);
  useEffect(() => { if (!started) { started = true; startLoops(); } }, []);
  const page = route[0] ?? '';
  const nav: [string, string, typeof LayoutGrid][] = [['', t('portfolio'), LayoutGrid], ['compare', t('compare'), GitCompareArrows], ['settings', t('settings'), SettingsIcon]];
  const active = (p: string) => (p === '' ? page === '' || page === 'b' || page === 'new' : page === p);
  return (
    <div className="min-h-full lg:flex">
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-line p-4 gap-1 sticky top-0 h-screen">
        <button className="flex items-center gap-2.5 px-2 py-3 mb-3 text-left" onClick={() => go('')}>
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-accent text-white"><BarChart3 size={20} /></span>
          <span><span className="font-bold text-lg leading-none block">BizSim</span><span className="text-[11px] text-muted leading-tight block mt-0.5">{t('appTagline')}</span></span>
        </button>
        {nav.map(([p, label, Icon]) => (
          <button key={p} onClick={() => go(p)} aria-current={active(p) ? 'page' : undefined} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left ${active(p) ? 'bg-surface2 text-ink' : 'text-ink2 hover:bg-surface'}`}><Icon size={18} />{label}</button>
        ))}
      </aside>
      <main className="flex-1 min-w-0 pb-24 lg:pb-8 safe-t">
        {update.status === 'ready' && !later && (
          <div className="m-4 mb-0 card glow p-3 pl-4 flex flex-wrap items-center gap-3" role="status">
            <div className="flex-1 min-w-48"><p className="text-sm font-semibold">{t('upReady', { n: update.version ?? 0 })}</p><p className="text-xs text-muted">{t('upReadyHint')}</p></div>
            <button className="btn ghost" onClick={() => setLater(true)}>{t('upLater')}</button>
            <button className="btn primary" onClick={() => applyUp()}><Download size={16} />{t('upApply')}</button>
          </div>
        )}
        {page === 'new' ? <Wizard /> : page === 'b' && route[1] ? <Business id={route[1]} tab={route[2] ?? 'overview'} /> : page === 'compare' ? <Compare /> : page === 'settings' ? <Settings /> : <Portfolio />}
      </main>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line flex safe-b">
        {nav.map(([p, label, Icon]) => (
          <button key={p} onClick={() => go(p)} aria-current={active(p) ? 'page' : undefined} className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${active(p) ? 'text-accent' : 'text-muted'}`}><Icon size={20} />{label}</button>
        ))}
      </nav>
    </div>
  );
}
