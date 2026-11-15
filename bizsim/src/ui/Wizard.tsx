import { ArrowLeft, ArrowRight, Check, Dices } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ROW_BUDGET, defaultBig, defaultSmall, estimate, maxHistoryDays, recommendedInvestment, recommendedStaff } from '../engine/params';
import { TEMPLATES } from '../engine/templates';
import { BIZ_TYPES, type BigParams, type BizType } from '../engine/types';
import type { Key } from '../i18n';
import { isPhone, useStore } from '../store';
import { Card, ICON, Seg, Slider, Toggle, accentStyle, go, useT } from './components';
import { accent, addDays, int, money, todayIso } from './fmt';

export function Wizard() {
  const t = useT(), { lang, theme } = useStore(s => s.settings), create = useStore(s => s.createBusiness), count = useStore(s => s.list().length);
  const [step, setStep] = useState(0), [big, setBig] = useState<BigParams | null>(null), [dirty, setDirty] = useState(false), [years, setYears] = useState(365);
  const pick = (type: BizType) => { const b = defaultBig(type, lang, todayIso(), Math.floor(Math.random() * 1e6)); b.name = `${t(`t_${type}`)} ${count + 1}`; setBig(b); setStep(1); };
  const up = (p: Partial<BigParams>) => setBig(b => {
    const n = { ...b!, ...p };
    if ('sizeM2' in p) { n.investment = recommendedInvestment(n); }
    if ('sizeM2' in p || 'locationTier' in p || 'openHour' in p || 'closeHour' in p || 'closedDay' in p || 'pricePos' in p) n.staff = recommendedStaff(n);
    return n;
  });
  const tpl = big ? TEMPLATES[big.type] : null, small = useMemo(() => (big ? defaultSmall(big) : null), [big]);
  const cap = big && small ? maxHistoryDays(big, small, isPhone() ? ROW_BUDGET.phone : ROW_BUDGET.desktop) : 1095, days = Math.min(years, cap);
  const est = big && small ? estimate({ ...big, historyDays: days }, small) : null;
  const finish = () => {
    const b = { ...big!, historyDays: days, startDate: addDays(todayIso(), -days), name: big!.name.trim() || t(`t_${big!.type}`) };
    go(`b/${create(b, defaultSmall(b), dirty)}`);
  };
  const col = big ? accent(big.type, theme) : undefined;
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto fade-in" style={col ? accentStyle(col) : undefined}>
      <header className="flex items-center gap-3 mb-5">
        <button className="btn ghost !px-2.5" aria-label={t('back')} onClick={() => (step === 0 ? go('') : setStep(step - 1))}><ArrowLeft size={18} /></button>
        <div className="flex-1"><h1 className="text-xl font-bold">{[t('wizType'), t('wizBig'), t('wizData')][step]}</h1><p className="text-sm text-muted">{['', t('wizBigHint'), t('wizDataHint')][step]}</p></div>
        <div className="flex gap-1.5" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-6 bg-accent' : 'w-3 bg-surface2'}`} />)}</div>
      </header>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {BIZ_TYPES.map(type => {
            const Icon = ICON[type], c = accent(type, theme);
            return (
              <button key={type} className="card hero p-5 text-left flex gap-4 items-start hover:border-accent transition-colors" style={accentStyle(c)} onClick={() => pick(type)}>
                <span className="w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0" style={{ background: c }}><Icon size={24} /></span>
                <span><span className="font-semibold block">{t(`t_${type}`)}</span><span className="text-sm text-ink2 block mt-1 leading-snug">{t(`d_${type}`)}</span></span>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && big && tpl && (
        <div className="grid gap-4">
          <Card>
            <label className="text-sm font-medium block mb-1.5" htmlFor="bn">{t('name')}</label>
            <input id="bn" className="field" value={big.name} maxLength={40} placeholder={t('namePh')} onChange={e => up({ name: e.target.value })} />
            <Slider label={t('size')} value={big.sizeM2} min={tpl.size[0]} max={tpl.size[1]} step={5} format={v => `${v} m²`} onChange={v => up({ sizeM2: v })} />
            <div className="py-2.5"><div className="text-sm font-medium mb-1.5">{t('location')}</div><Seg label={t('location')} value={big.locationTier} options={[[1, t('loc1')], [2, t('loc2')], [3, t('loc3')]]} onChange={v => up({ locationTier: v })} /><p className="text-xs text-muted mt-1.5">{t('locHint')}</p></div>
            <div className="py-2.5"><div className="text-sm font-medium mb-1.5">{t('pricePos')}</div><Seg label={t('pricePos')} value={big.pricePos} options={[[0, t('pos0')], [1, t('pos1')], [2, t('pos2')]]} onChange={v => up({ pricePos: v })} /><p className="text-xs text-muted mt-1.5">{t('posHint')}</p></div>
          </Card>
          <Card title={t('hours')}>
            <Slider label={t('opens')} value={big.openHour} min={5} max={Math.min(16, big.closeHour - 4)} step={1} format={v => `${v}:00`} onChange={v => up({ openHour: v })} />
            <Slider label={t('closes')} value={big.closeHour} min={Math.max(13, big.openHour + 4)} max={24} step={1} format={v => `${v}:00`} onChange={v => up({ closeHour: v })} />
            <label className="text-sm font-medium block mt-2 mb-1.5" htmlFor="cd">{t('closedDay')}</label>
            <select id="cd" className="field" value={big.closedDay} onChange={e => up({ closedDay: +e.target.value })}>
              <option value={-1}>{t('never')}</option>{[0, 1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>{t(`wd${d}` as Key)}</option>)}
            </select>
          </Card>
          <Card>
            <Slider label={t('investment')} value={big.investment} min={Math.round((recommendedInvestment(big) * 0.4) / 1000) * 1000} max={Math.round((recommendedInvestment(big) * 2.5) / 1000) * 1000} step={1000} format={v => money(v, lang)} hint={t('investHint', { v: money(recommendedInvestment(big), lang) })} onChange={v => up({ investment: v })} />
            <Slider label={t('staff')} value={big.staff} min={1} max={Math.max(40, recommendedStaff(big) * 2)} step={1} format={v => String(v)} hint={t('staffHint', { v: recommendedStaff(big) })} onChange={v => setBig(b => ({ ...b!, staff: v }))} />
            <Toggle checked={big.online} onChange={v => up({ online: v })} label={t('online')} hint={t('onlineHint')} />
          </Card>
          <button className="btn primary self-end" onClick={() => setStep(2)}>{t('next')}<ArrowRight size={16} /></button>
        </div>
      )}

      {step === 2 && big && est && (
        <div className="grid gap-4">
          <Card>
            <Slider label={t('history')} value={days} min={180} max={cap} step={5} format={v => (v % 365 === 0 ? t('years', { n: v / 365 }) : t('days', { n: v }))} hint={t('historyHint', { tx: int(est.tx, lang), lines: int(est.lines, lang) }) + (cap < 1095 ? ' ' + t('historyCapped', { d: cap }) : '')} onChange={setYears} />
            <div className="flex flex-wrap gap-2 mt-1">{[365, 730, 1095].filter(d => d <= cap).map(d => <button key={d} className="chip" onClick={() => setYears(d)}>{t('years', { n: d / 365 })}</button>)}</div>
          </Card>
          <Card>
            <label className="text-sm font-medium block mb-1.5" htmlFor="seed">{t('seed')}</label>
            <div className="flex gap-2"><input id="seed" className="field num" inputMode="numeric" value={big.seed} onChange={e => up({ seed: Math.abs(parseInt(e.target.value.replace(/\D/g, '') || '0', 10)) % 2147483647 })} /><button className="btn" aria-label={t('seed')} onClick={() => up({ seed: Math.floor(Math.random() * 1e6) })}><Dices size={16} /></button></div>
            <p className="text-xs text-muted mt-1.5">{t('seedHint')}</p>
            <div className="py-3"><div className="text-sm font-medium mb-1.5">{t('dataLang')}</div><Seg label={t('dataLang')} value={big.lang} options={[['es', 'Español'], ['en', 'English']]} onChange={v => up({ lang: v })} /></div>
            <Toggle checked={dirty} onChange={setDirty} label={t('dirty')} hint={t('dirtyHint')} />
          </Card>
          <Card title={t('summary')} glow>
            <p className="text-sm text-ink2 leading-relaxed">
              <b className="text-ink">{big.name}</b> · {t(`t_${big.type}`)} · {big.sizeM2} m² · {t(`loc${big.locationTier}` as Key)} · {t(`pos${big.pricePos}` as Key)} · {big.openHour}:00–{big.closeHour}:00 · {money(big.investment, lang)} · {big.staff} {t('staff').toLowerCase()}
            </p>
          </Card>
          <button className="btn primary self-end" onClick={finish}><Check size={16} />{t('createBusiness')}</button>
        </div>
      )}
    </div>
  );
}
