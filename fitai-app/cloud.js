'use strict';
// Accounts and friends (Supabase). With an account, your data is saved online and syncs between the web app and the
// Android app; friends are added with their code and their profile can be opened.
// Everything talks to Supabase's REST endpoints with fetch (no library). Without SB_URL/SB_KEY the feature stays hidden.
// The tables and their access rules are in tools/supabase.sql.

const SB_URL = 'https://fghbrevlqmrugbnqshoj.supabase.co';
const SB_KEY = 'sb_publishable_22MWQyEpsR2OyZv9RXkswg_FdGjA2i9'; // the publishable key: public by design, access is limited by the rules in the database
const SB_ON = !!(SB_URL && SB_KEY);

// ---------- session ----------
// Kept outside the synced data (fc.cloud is never uploaded).
const CL = load('cloud', {}); // { at, rt, exp, uid, user, code, syncAt, dirtyAt }
const clSave = () => save('cloud', CL);
const userEmail = u => `${u.toLowerCase()}@users.fitquest.app`; // usernames sign in as an e-mail nobody receives
const USER_RE = /^[a-z0-9_]{3,20}$/i;

async function sbFetch(path, opts = {}, auth = true) {
  const h = { apikey: SB_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (auth && CL.at) {
    if (CL.exp && Date.now() > CL.exp - 60e3) await sbRefresh();
    h.Authorization = `Bearer ${CL.at}`;
  }
  const r = await fetch(SB_URL + path, { ...opts, headers: h });
  if (r.status === 401 && auth && CL.rt && !opts.retried) { await sbRefresh(); return sbFetch(path, { ...opts, retried: true }, auth); }
  const txt = await r.text(), body = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error(body?.msg || body?.error_description || body?.message || `HTTP ${r.status}`);
  return body;
}
function sbSession(s) { CL.at = s.access_token; CL.rt = s.refresh_token; CL.exp = Date.now() + (s.expires_in || 3600) * 1000; CL.uid = s.user?.id || CL.uid; clSave(); }
async function sbRefresh() {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: CL.rt }) });
  if (!r.ok) { cloudSignOut(true); throw new Error('signed out'); }
  sbSession(await r.json());
}

// ---------- your data ----------
const SYNC_SKIP = ['fc.cloud', 'fc.session'];
const localData = () => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('fc.') && !SYNC_SKIP.includes(k)).map(k => [k, localStorage.getItem(k)]));
function applyData(d) {
  Object.keys(localStorage).filter(k => k.startsWith('fc.') && !SYNC_SKIP.includes(k)).forEach(k => localStorage.removeItem(k));
  Object.entries(d || {}).forEach(([k, v]) => { if (k.startsWith('fc.') && !SYNC_SKIP.includes(k)) localStorage.setItem(k, v); });
}
// what friends see: a summary of your profile, never your body data or history
function publicProfile() {
  const sp = typeof SP === 'object' && SP.cur && typeof roleOf === 'function' ? (r => r && { sport: SP.cur, ovr: ovrOf(r), pos: r.name, club: clubName() })(roleOf(SP.cur)) : null;
  return { name: S.profile?.name || '', lvl: lvl(), title: title(), avatar: G.avatar, frame: G.frame, banner: G.banner, skin: G.skin,
    workouts: S.history.length, minutes: S.history.reduce((a, h) => a + (h.dur || 0), 0), kg: Math.round(totalVol()), streak: streak(), badges: G.ach.length, sp };
}
let pushT = null;
window.cloudDirty = () => {
  if (!SB_ON || !CL.uid) return;
  CL.dirtyAt = Date.now(); clSave();
  clearTimeout(pushT); pushT = setTimeout(() => cloudPush().catch(() => { }), 4000);
};
async function cloudPush() {
  if (!SB_ON || !CL.uid) return;
  const now = new Date().toISOString();
  await sbFetch('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ id: CL.uid, data: localData(), updated_at: now }) });
  await sbFetch(`/rest/v1/profiles?id=eq.${CL.uid}`, { method: 'PATCH', body: JSON.stringify({ public: publicProfile(), updated_at: now }) });
  CL.syncAt = now; CL.dirtyAt = 0; clSave();
}
// When the app opens: if the account has newer data from another device and nothing changed here since the last sync,
// take it (the app reloads once with it).
async function cloudPull() {
  if (!SB_ON || !CL.uid) return;
  try {
    const [row] = await sbFetch(`/rest/v1/saves?id=eq.${CL.uid}&select=data,updated_at`);
    if (!row) return cloudPush();
    if (CL.syncAt && row.updated_at <= CL.syncAt) { if (CL.dirtyAt) cloudPush(); return; }
    if (CL.dirtyAt) return askWhich(row); // both changed
    applyData(row.data); CL.syncAt = row.updated_at; clSave(); location.reload();
  } catch { /* offline: try next time */ }
}
function askWhich(row) {
  const b = $('#rest'); b.hidden = false;
  b.innerHTML = `<h2>Which data do you keep?</h2><div class="mut">This device and your account both changed.</div>
    <div class="row"><button class="btn ghost" id="cl-dev">This device</button><button class="btn" id="cl-acc">Account</button></div>`;
  $('#cl-dev').onclick = () => { b.hidden = true; cloudPush().then(() => toast('Synced')).catch(e => toast(e.message)); };
  $('#cl-acc').onclick = () => { applyData(row.data); CL.syncAt = row.updated_at; CL.dirtyAt = 0; clSave(); location.reload(); };
}

// ---------- sign up, sign in, sign out ----------
const randCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
async function cloudSignUp(user, pass) {
  const s = await sbFetch('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: userEmail(user), password: pass }) }, false);
  if (!s.access_token) throw new Error('Turn off e-mail confirmation in Supabase (see tools/supabase.sql)');
  sbSession(s);
  let code = randCode();
  for (let i = 0; i < 4; i++) {
    try { await sbFetch('/rest/v1/profiles', { method: 'POST', body: JSON.stringify({ id: CL.uid, username: user.toLowerCase(), code, public: publicProfile() }) }); break; }
    catch (e) { if (i === 3) throw e; code = randCode(); }
  }
  CL.user = user.toLowerCase(); CL.code = code; clSave();
  await cloudPush();
}
async function cloudSignIn(user, pass) {
  sbSession(await sbFetch('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: userEmail(user), password: pass }) }, false));
  const [me] = await sbFetch(`/rest/v1/profiles?id=eq.${CL.uid}&select=username,code`);
  CL.user = me?.username || user.toLowerCase(); CL.code = me?.code || ''; clSave();
  const [row] = await sbFetch(`/rest/v1/saves?id=eq.${CL.uid}&select=data,updated_at`);
  const hasLocal = !!localStorage.getItem('fc.profile');
  if (!row) return cloudPush();
  if (!hasLocal) { applyData(row.data); CL.syncAt = row.updated_at; clSave(); location.hash = '#/home'; location.reload(); return; }
  askWhich(row);
}
function cloudSignOut(quiet) {
  Object.keys(CL).forEach(k => delete CL[k]); clSave();
  if (!quiet) { toast('Signed out'); route(); }
}

// ---------- screens ----------
function accountView() {
  const back = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>`;
  if (!SB_ON) { view.innerHTML = `${back}<h1>Account</h1><div class="mut">Accounts aren't set up yet.</div>`; return; }
  if (CL.uid) {
    view.innerHTML = `${back}<h1>Account</h1>
    <section class="card"><div class="row between"><b translate="no">${esc(CL.user || '')}</b><span class="chip" translate="no">${esc(CL.code || '')}</span></div>
      <div class="mut">${CL.syncAt ? `Synced ${new Date(CL.syncAt).toLocaleString(dateLocale(), { dateStyle: 'short', timeStyle: 'short' })}` : 'Not synced yet'}</div></section>
    <div class="row"><button class="btn" onclick="cloudSyncNow()">Sync now</button><button class="btn ghost" onclick="cloudSignOut()">Sign out</button></div>`;
    return;
  }
  view.innerHTML = `${back}<h1>Account</h1>
  <label class="fld"><span>Username</span><div class="inp"><input id="cl-u" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20"></div></label>
  <label class="fld"><span>Password</span><div class="inp"><input id="cl-p" type="password" autocomplete="current-password" minlength="6"></div></label>
  <div id="cl-err" class="err"></div>
  <div class="row"><button class="btn ghost" id="cl-up">Create account</button><button class="btn" id="cl-in">Sign in</button></div>`;
  const go = async signUp => {
    const u = $('#cl-u').value.trim(), p = $('#cl-p').value, err = m => { $('#cl-err').textContent = tr(m); };
    if (!USER_RE.test(u)) return err('Username: 3 to 20 letters, numbers or _');
    if (p.length < 6) return err('Password: at least 6 characters');
    view.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try { await (signUp ? cloudSignUp(u, p) : cloudSignIn(u, p)); if (!$('#rest').hidden) return; toast(signUp ? 'Account created' : 'Signed in'); route(); }
    catch (e) { err(/already registered|exists/i.test(e.message) ? 'That username is taken' : /invalid login/i.test(e.message) ? 'Wrong username or password' : e.message); view.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  };
  $('#cl-up').onclick = () => go(true); $('#cl-in').onclick = () => go(false);
}
window.cloudSyncNow = () => cloudPush().then(() => { toast('Synced'); route(); }).catch(e => toast(e.message));

// friends: a section on Hero, and each friend's profile
let FRIENDS = null;
async function loadFriends() {
  const rows = await sbFetch(`/rest/v1/friends?user_id=eq.${CL.uid}&select=friend_id,profiles(id,username,public)`);
  FRIENDS = rows.map(r => r.profiles).filter(Boolean);
}
function friendsBlock() {
  if (!SB_ON) return '';
  if (!CL.uid) return `<h2 class="sec">Friends</h2><button class="btn ghost" onclick="location.hash='#/account'">Sign in to add friends</button>`;
  const row = f => { const p = f.public || {}; return `<button class="lookt frow" onclick="location.hash='#/friend/${f.id}'"><div class="av fr-${esc(p.frame || 'none')}" style="--p:1;width:40px;height:40px"><span>${gi(p.avatar || 'user', 'hero')}</span></div>
    <span class="grow"><b translate="no">${esc(p.name || f.username)}</b><small>Level ${p.lvl || 1}</small></span></button>`; };
  return `<h2 class="sec">Friends</h2>
  <div class="row"><input id="fr-code" placeholder="Friend's code" maxlength="6" autocapitalize="characters" spellcheck="false"><button class="btn sm" onclick="addFriend()">Add</button></div>
  <div class="mut">Your code: <b translate="no">${esc(CL.code || '')}</b></div>
  <div class="friends">${FRIENDS === null ? '' : FRIENDS.length ? FRIENDS.map(row).join('') : ''}</div>`;
}
window.addFriend = async () => {
  const code = ($('#fr-code')?.value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) { toast('Codes have 6 letters and numbers'); return; }
  if (code === CL.code) { toast("That's your own code"); return; }
  try {
    const [p] = await sbFetch(`/rest/v1/profiles?code=eq.${code}&select=id`);
    if (!p) { toast('No player with that code'); return; }
    await sbFetch('/rest/v1/friends', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ user_id: CL.uid, friend_id: p.id }) });
    await loadFriends(); toast('Friend added'); sfx('claim'); route();
  } catch (e) { toast(e.message); }
};
window.removeFriend = async id => {
  try { await sbFetch(`/rest/v1/friends?user_id=eq.${CL.uid}&friend_id=eq.${id}`, { method: 'DELETE' }); await loadFriends(); location.hash = '#/me'; } catch (e) { toast(e.message); }
};
async function friendView(id) {
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button><div class="mut">…</div>`;
  let f;
  try { [f] = await sbFetch(`/rest/v1/profiles?id=eq.${id}&select=id,username,public`); } catch (e) { toast(e.message); return; }
  if (!f || location.hash !== `#/friend/${id}`) return;
  const p = f.public || {};
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>
  <section class="pcard pmini bn-${esc(p.banner || 'plain')}"><div class="av fr-${esc(p.frame || 'none')}" style="--p:1"><span>${gi(p.avatar || 'user', 'hero')}</span><i class="lv">${p.lvl || 1}</i></div>
    <div class="grow"><div class="hn" translate="no">${esc(p.name || f.username)}</div><div class="mut">${esc(p.title || '')}</div></div></section>
  <div class="grid3"><div class="stat"><b>${p.workouts || 0}</b><span>workouts</span></div><div class="stat"><b>${p.minutes || 0}</b><span>minutes</span></div><div class="stat"><b>${p.streak || 0}</b><span>day streak</span></div></div>
  <div class="grid3"><div class="stat"><b>${(p.kg || 0).toLocaleString()}</b><span>kg lifted</span></div><div class="stat"><b>${p.badges || 0}</b><span>badges</span></div><div class="stat"><b>${p.sp ? p.sp.ovr : '–'}</b><span>OVR</span></div></div>
  ${p.sp ? `<section class="card"><b translate="no">${esc(p.sp.club || '')}</b><div class="mut">${esc(p.sp.pos || '')}</div></section>` : ''}
  <button class="btn ghost" onclick="removeFriend('${f.id}')">Remove friend</button>`;
}

if (SB_ON) {
  const _clMe = routes.me;
  routes.me = function () {
    _clMe();
    const set = [...view.querySelectorAll(':scope > button.btn')].find(b => b.getAttribute('onclick')?.includes('#/settings'));
    set?.insertAdjacentHTML('beforebegin', friendsBlock());
    if (CL.uid && FRIENDS === null) loadFriends().then(() => { if (location.hash === '#/me') route(); }).catch(() => { FRIENDS = []; });
  };
  Object.assign(routes, { account: accountView, friend: friendView });
  window.addEventListener('pagehide', () => { if (CL.dirtyAt) cloudPush().catch(() => { }); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && CL.dirtyAt) cloudPush().catch(() => { }); });
  setTimeout(cloudPull, 1500);
}

if (typeof i18nAdd === 'function') {
  i18nAdd({
    Account: 'Cuenta', "Accounts aren't set up yet.": 'Las cuentas aún no están configuradas.', Username: 'Usuario', Password: 'Contraseña', 'Create account': 'Crear cuenta', 'Sign in': 'Entrar',
    'Sign out': 'Salir', 'Signed out': 'Sesión cerrada', 'Sync now': 'Sincronizar', Synced: 'Sincronizado', 'Synced {n}': 'Sincronizado {n}', 'Not synced yet': 'Aún sin sincronizar',
    'Account created': 'Cuenta creada', 'Signed in': 'Sesión iniciada', 'Username: 3 to 20 letters, numbers or _': 'Usuario: de 3 a 20 letras, números o _',
    'Password: at least 6 characters': 'Contraseña: al menos 6 caracteres', 'That username is taken': 'Ese usuario ya existe', 'Wrong username or password': 'Usuario o contraseña incorrectos',
    'Which data do you keep?': '¿Qué datos te quedas?', 'This device and your account both changed.': 'Este dispositivo y tu cuenta han cambiado los dos.', 'This device': 'Este dispositivo',
    Friends: 'Amigos', 'Sign in to add friends': 'Entra para añadir amigos', "Friend's code": 'Código de tu amigo', Add: 'Añadir', 'Your code:': 'Tu código:',
    'Codes have 6 letters and numbers': 'Los códigos tienen 6 letras y números', "That's your own code": 'Ese es tu propio código', 'No player with that code': 'No hay ningún jugador con ese código',
    'Friend added': 'Amigo añadido', 'Remove friend': 'Quitar amigo', 'day streak': 'días de racha', badges: 'insignias', 'I already have an account': 'Ya tengo cuenta',
    'Turn off e-mail confirmation in Supabase (see tools/supabase.sql)': 'Desactiva la confirmación por e-mail en Supabase (mira tools/supabase.sql)',
  });
}
if (typeof i18nAdd === 'function') i18nAdd({ 'Sign in to sync and add friends': 'Entra para sincronizar y añadir amigos' });
