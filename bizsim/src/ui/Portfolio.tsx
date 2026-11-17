import { Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { ICON, Spark, accentStyle, go, useT } from './components';
import { accent, dateLong, moneyC, pct } from './fmt';

export function Portfolio() {
  const t = useT(), s = useStore(), list = s.list(), { lang, theme } = s.settings;
  const anyPlaying = list.some(r => s.playing[r.id]);
  const playAll = async (on: boolean) => { for (const r of list) { if (on) await s.open(r.id); s.setPlaying(r.id, on); } };
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-bold">{t('portfolio')}</h1><p className="text-sm text-muted lg:hidden">{t('appTagline')}</p></div>
        <div className="flex gap-2">
          {list.length > 0 && <button className="btn" onClick={() => playAll(!anyPlaying)}>{anyPlaying ? <Pause size={16} /> : <Play size={16} />}{anyPlaying ? t('pauseAll') : t('playAll')}</button>}
          <button className="btn primary" onClick={() => go('new')}><Plus size={16} />{t('newBusiness')}</button>
        </div>
      </header>
      {list.length === 0 ? (
        <div className="card hero p-10 text-center">
          <h2 className="text-xl font-semibold">{t('noBusinesses')}</h2><p className="text-ink2 mt-2 max-w-md mx-auto">{t('noBusinessesHint')}</p>
          <button className="btn primary mt-6" onClick={() => go('new')}><Plus size={16} />{t('newBusiness')}</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(r => {
            const Icon = ICON[r.big.type], col = accent(r.big.type, theme), rt = s.runtime[r.id], on = !!s.playing[r.id], snap = r.snap;
            return (
              <article key={r.id} className="card hero p-5 flex flex-col gap-4 cursor-pointer hover:border-accent transition-colors" style={accentStyle(col)} onClick={() => go(`b/${r.id}`)}>
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-2xl grid place-items-center text-white shrink-0" style={{ background: col }}><Icon size={22} /></span>
                  <div className="min-w-0 flex-1"><h2 className="font-semibold truncate">{r.big.name}</h2><p className="text-xs text-muted truncate">{t(`t_${r.big.type}`)} · {r.big.sizeM2} m²</p><p className="text-xs text-ink2 num whitespace-nowrap">{dateLong(r.big.startDate, r.day - 1, lang)}</p></div>
                  <span className="chip shrink-0 whitespace-nowrap">{rt?.progress != null ? t('loading') : on ? <><span className="w-1.5 h-1.5 rounded-full bg-good pulse" />{t('running')}</> : rt ? t('paused') : t('notLoaded')}</span>
                </div>
                <Spark data={snap?.spark ?? []} color={col} />
                <div className="grid grid-cols-3 gap-2">
                  <div><div className="label">{t('revenue')}</div><div className="font-semibold mt-0.5 num whitespace-nowrap">{snap ? moneyC(snap.rev30, lang) : '–'}</div></div>
                  <div><div className="label">{t('margin')}</div><div className="font-semibold mt-0.5">{snap ? pct(snap.margin30, lang, 0) : '–'}</div></div>
                  <div><div className="label">{t('profit')}</div><div className={`font-semibold mt-0.5 ${snap && snap.profit30 < 0 ? 'text-bad' : ''}`}>{snap ? moneyC(snap.profit30, lang) : '–'}</div></div>
                </div>
                <div className="flex items-center justify-between -mb-1" onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-muted">{t('last30')}</span>
                  <div className="flex gap-1">
                    <button className="btn ghost !px-2.5" aria-label={on ? t('pause') : t('play')} onClick={async () => { if (!on) await s.open(r.id); s.setPlaying(r.id, !on); }}>{on ? <Pause size={16} /> : <Play size={16} />}</button>
                    <button className="btn ghost danger !px-2.5" aria-label={t('delete')} onClick={() => { if (confirm(t('deleteBizConfirm', { n: r.big.name }))) s.removeBusiness(r.id); }}><Trash2 size={16} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
