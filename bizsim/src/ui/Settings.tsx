import { CloudOff, GraduationCap, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { BUSINESS_CHALLENGES, analystUrl } from '../cloud/analyst';
import type { CloudError } from '../cloud/supabase';
import { hasKey, type Key } from '../i18n';
import { useStore } from '../store';
import { Card, Seg, useT } from './components';

export function Settings() {
  const t = useT(), s = useStore(), [user, setUser] = useState(''), [pass, setPass] = useState(''), [err, setErr] = useState('');
  const explain = (code: string) => { const k = `e_${code}`; return hasKey(k) ? t(k as Key) : t('e_other', { m: code }); };
  const submit = async (isNew: boolean) => { setErr(''); try { await s.signIn(user, pass, isNew); setPass(''); } catch (e) { setErr(explain(String((e as CloudError).code ?? (e as Error).message))); } };
  const [apUser, setApUser] = useState(''), [apPass, setApPass] = useState(''), [apErr, setApErr] = useState(''), [apBusy, setApBusy] = useState(false);
  const linkAp = async () => { setApErr(''); setApBusy(true); try { await s.linkAnalyst(apUser, apPass); setApPass(''); } catch (e) { setApErr(explain(String((e as CloudError).code ?? (e as Error).message))); } finally { setApBusy(false); } };
  const when = s.cloud.syncAt ? new Date(s.cloud.syncAt).toLocaleString(s.settings.lang === 'es' ? 'es-ES' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto fade-in grid gap-4">
      <h1 className="text-2xl font-bold">{t('settings')}</h1>
      <Card>
        <div className="flex items-center justify-between gap-3 py-1.5"><span className="text-sm font-medium">{t('language')}</span><Seg label={t('language')} value={s.settings.lang} options={[['es', 'Español'], ['en', 'English']]} onChange={s.setLang} /></div>
        <div className="flex items-center justify-between gap-3 py-1.5"><span className="text-sm font-medium">{t('theme')}</span><Seg label={t('theme')} value={s.settings.theme} options={[['dark', t('dark')], ['light', t('light')]]} onChange={s.setTheme} /></div>
      </Card>
      <Card title={t('account')} sub={t('accountHint')}>
        {s.cloud.user ? (
          <div className="grid gap-3">
            <p className="text-sm font-semibold">{t('signedInAs', { u: s.cloud.user })}</p>
            <p className="text-xs text-muted">{s.cloud.busy ? t('syncing') : when ? t('lastSync', { t: when }) : t('neverSynced')}</p>
            {s.cloud.error && <p className="text-xs text-bad flex items-center gap-1.5"><CloudOff size={14} />{explain(s.cloud.error)}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn" disabled={s.cloud.busy} onClick={() => s.syncNow()}><RefreshCw size={16} className={s.cloud.busy ? 'animate-spin' : ''} />{t('syncNow')}</button>
              <button className="btn" onClick={s.signOut}><LogOut size={16} />{t('signOut')}</button>
              <button className="btn ghost danger" onClick={() => { if (confirm(t('deleteAccountConfirm'))) void s.deleteAccount(); }}>{t('deleteAccount')}</button>
            </div>
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={e => { e.preventDefault(); void submit(false); }}>
            <label className="text-sm font-medium grid gap-1.5">{t('username')}<input className="field" autoComplete="username" autoCapitalize="none" value={user} onChange={e => setUser(e.target.value)} /></label>
            <label className="text-sm font-medium grid gap-1.5">{t('password')}<input className="field" type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} /></label>
            {err && <p className="text-sm text-bad" role="alert">{err}</p>}
            <div className="flex flex-wrap gap-2"><button className="btn primary" type="submit" disabled={s.cloud.busy}>{t('signIn')}</button><button className="btn" type="button" disabled={s.cloud.busy} onClick={() => submit(true)}>{t('signUp')}</button></div>
          </form>
        )}
      </Card>
      <Card title={t('apTitle')} sub={t('apHint')}>
        {s.analyst ? (
          <div className="grid gap-3">
            <p className="text-sm font-semibold flex items-center gap-2"><GraduationCap size={16} />{t('apLinked', { u: s.analyst.user })}</p>
            <p className="text-sm text-ink2 num">{t('apSolved', { n: s.analyst.solved, t: BUSINESS_CHALLENGES })}</p>
            <div className="h-1.5 rounded-full bg-surface2 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${Math.round((100 * s.analyst.solved) / BUSINESS_CHALLENGES)}%` }} /></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => s.refreshAnalyst()}><RefreshCw size={16} />{t('apRefresh')}</button>
              <a className="btn" href={`${analystUrl()}#/biz`} target="_blank" rel="noopener">{t('apOpen')}</a>
              <button className="btn ghost" onClick={s.unlinkAnalyst}>{t('apUnlink')}</button>
            </div>
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={e => { e.preventDefault(); void linkAp(); }}>
            <label className="text-sm font-medium grid gap-1.5">{t('apUser')}<input className="field" autoComplete="off" autoCapitalize="none" value={apUser} onChange={e => setApUser(e.target.value)} /></label>
            <label className="text-sm font-medium grid gap-1.5">{t('apPass')}<input className="field" type="password" autoComplete="off" value={apPass} onChange={e => setApPass(e.target.value)} /></label>
            {apErr && <p className="text-sm text-bad" role="alert">{apErr}</p>}
            <div className="flex flex-wrap gap-2"><button className="btn primary" type="submit" disabled={apBusy}><GraduationCap size={16} />{t('apLink')}</button><a className="btn" href={`${analystUrl()}#/biz`} target="_blank" rel="noopener">{t('apOpen')}</a></div>
          </form>
        )}
      </Card>
      <Card title={t('about')}><p className="text-sm text-ink2 leading-relaxed">{t('aboutText')}</p></Card>
    </div>
  );
}
