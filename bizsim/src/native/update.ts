// In-app updates for the Android app. Every release (tag bizsim-N) carries web.zip, the whole web app, and a file
// shell-S naming the native version it needs. On start the app looks for a release newer than the web version it is
// showing, downloads web.zip into its own storage and serves the app from there (Capacitor's server base path), so
// nothing has to be downloaded or installed by hand. Saved businesses and the account are untouched: they live in
// the WebView's storage. Only a release that needs a newer native shell asks for a new APK; installing one makes
// Capacitor go back to the files packed inside it. In a browser none of this runs: the site is always current.

import { Capacitor, CapacitorHttp, WebView } from '@capacitor/core';
import { unzipSync } from 'fflate';

declare const __WEB_VERSION__: number;
/** The web version on screen: the release number it was built for (0 in a local build). */
export const WEB_VERSION: number = typeof __WEB_VERSION__ === 'number' ? __WEB_VERSION__ : 0;
/** The native version this code was written for. Raise it, and the shell-S file in the workflow, when a new plugin is needed. */
export const SHELL = 1;
const RELEASES = 'https://api.github.com/repos/e1caro/torchnep/releases?per_page=30';
const KEY = 'bizsim.update';

export interface Release { tag_name?: string; draft?: boolean; html_url?: string; assets?: { name?: string; browser_download_url?: string }[] }
export interface Pick { version: number; zip: string | null; needsApk: boolean; page: string }

/** The newest release above `current`: its web.zip when this shell can run it, or a note that it needs a new APK. */
export function pickUpdate(releases: Release[], current: number, shell: number): Pick | null {
  let best: Pick | null = null;
  for (const r of releases) {
    const m = /^bizsim-(\d+)$/.exec(r.tag_name ?? '');
    if (!m || r.draft) continue;
    const n = +m[1];
    if (n <= current || (best && n <= best.version)) continue;
    let zip: string | null = null, needs = 1;
    for (const a of r.assets ?? []) {
      if (a.name === 'web.zip') zip = a.browser_download_url ?? null;
      const s = /^shell-(\d+)$/.exec(a.name ?? '');
      if (s) needs = +s[1];
    }
    if (!zip) continue;
    best = { version: n, zip: needs <= shell ? zip : null, needsApk: needs > shell, page: r.html_url ?? '' };
  }
  return best;
}

/** Files of a downloaded web.zip, checked: no path may leave its folder and the app's entry page must be there. */
export function unpack(zip: Uint8Array): { path: string; data: Uint8Array }[] {
  const files = Object.entries(unzipSync(zip)).filter(([name]) => !name.endsWith('/')).map(([name, data]) => ({ path: name.replace(/^\.\//, ''), data }));
  if (files.some(f => f.path.startsWith('/') || f.path.split('/').includes('..') || f.path.includes('\\'))) throw new Error('bad entry');
  if (!files.some(f => f.path === 'index.html') || !files.some(f => /^assets\/index-.*\.js$/.test(f.path))) throw new Error('not a BizSim web build');
  return files;
}

function b64(bytes: Uint8Array): string { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(text: string): Uint8Array { const bin = atob(text.replace(/\s/g, '')), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

export type UpdateState = { status: 'idle' | 'checking' | 'current' | 'downloading' | 'ready' | 'needsApk' | 'error'; version?: number; page?: string };
const saved = (): { ready?: number; path?: string; checkedAt?: number } => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') || {}; } catch { return {}; } };
const keep = (v: object) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } };

/** Looks for a newer release and downloads it. `force` skips the ten-minute pause between checks. */
export async function checkForUpdate(onState: (s: UpdateState) => void, force = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) return onState({ status: 'current' });
  const st = saved();
  if (st.ready && st.ready > WEB_VERSION && st.path) return onState({ status: 'ready', version: st.ready });
  if (!force && st.checkedAt && Date.now() - st.checkedAt < 10 * 60e3) return;
  onState({ status: 'checking' });
  try {
    const res = await CapacitorHttp.get({ url: RELEASES, headers: { Accept: 'application/vnd.github+json' } });
    keep({ ...st, checkedAt: Date.now() });
    const pick = pickUpdate(Array.isArray(res.data) ? res.data : [], WEB_VERSION, SHELL);
    if (!pick) return onState({ status: 'current' });
    if (!pick.zip) return onState({ status: 'needsApk', version: pick.version, page: pick.page });
    onState({ status: 'downloading', version: pick.version });
    const dl = await CapacitorHttp.get({ url: pick.zip, responseType: 'arraybuffer' });
    const files = unpack(typeof dl.data === 'string' ? unb64(dl.data) : new Uint8Array(dl.data));
    const { Filesystem, Directory } = await import('@capacitor/filesystem'), dir = `web/${pick.version}`;
    await Filesystem.rmdir({ path: dir, directory: Directory.Data, recursive: true }).catch(() => { /* not there */ });
    for (const f of files) await Filesystem.writeFile({ path: `${dir}/${f.path}`, data: b64(f.data), directory: Directory.Data, recursive: true });
    const { uri } = await Filesystem.getUri({ path: dir, directory: Directory.Data });
    keep({ ready: pick.version, path: uri.replace(/^file:\/\//, ''), checkedAt: Date.now() });
    onState({ status: 'ready', version: pick.version });
  } catch { onState({ status: 'error' }); }
}

/** Switches to the downloaded version: the app reloads from it now and keeps using it on later starts. */
export async function applyUpdate(): Promise<void> {
  const st = saved();
  if (!Capacitor.isNativePlatform() || !st.path || !st.ready || st.ready <= WEB_VERSION) return;
  await WebView.setServerBasePath({ path: st.path });
  await WebView.persistServerBasePath();
}
