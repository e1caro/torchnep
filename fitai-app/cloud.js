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
// notices already shown on this device stay shown when the account's data comes in (the weekly summary, the
// Halloween notice...), so syncing never brings them back
function applyData(d) {
  let seen = {}; try { const g = JSON.parse(localStorage.getItem('fc.game')) || {}; if (g.recapSeen === weekId()) seen.recapSeen = g.recapSeen; if (g.hwDay === dayId()) seen.hwDay = g.hwDay; if (g.coachDay === dayId()) seen.coachDay = g.coachDay; } catch { /* no game yet */ }
  Object.keys(localStorage).filter(k => k.startsWith('fc.') && !SYNC_SKIP.includes(k)).forEach(k => localStorage.removeItem(k));
  Object.entries(d || {}).forEach(([k, v]) => { if (k.startsWith('fc.') && !SYNC_SKIP.includes(k)) localStorage.setItem(k, v); });
  try { const g = JSON.parse(localStorage.getItem('fc.game')); if (g) { Object.assign(g, seen); localStorage.setItem('fc.game', JSON.stringify(g)); } } catch { /* fine */ }
}
// what friends see: the same profile summary as Hero (profile.js), never body data or history
const publicProfile = () => profileSummary();
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
// Adding a friend sends a request: it shows up in the other player's Friends tab, and once they accept, each is the
// other's friend. In the table a row (me, them) means "I want us to be friends"; both rows means friends.
let FRIENDS = null, FR_IN = [], FR_OUT = [];
async function loadFriends() {
  const rows = await sbFetch(`/rest/v1/friends?or=(user_id.eq.${CL.uid},friend_id.eq.${CL.uid})&select=user_id,friend_id`);
  const out = new Set(rows.filter(r => r.user_id === CL.uid).map(r => r.friend_id)), inc = new Set(rows.filter(r => r.friend_id === CL.uid).map(r => r.user_id));
  const ids = [...new Set([...out, ...inc])];
  const ps = ids.length ? await sbFetch(`/rest/v1/profiles?id=in.(${ids.join(',')})&select=id,username,public`) : [];
  const by = Object.fromEntries(ps.map(p => [p.id, p]));
  FRIENDS = [...out].filter(id => inc.has(id) && by[id]).map(id => by[id]);
  FR_IN = [...inc].filter(id => !out.has(id) && by[id]).map(id => by[id]);
  FR_OUT = [...out].filter(id => !inc.has(id) && by[id]).map(id => by[id]);
  frBadge();
}
// the number of requests waiting, on the Friends tab
function frBadge() {
  const a = document.querySelector('nav#tabs a[data-t="friends"]'); if (!a) return;
  let b = a.querySelector('.nbadge');
  if (!FR_IN.length) { b?.remove(); return; }
  if (!b) { b = document.createElement('i'); b.className = 'nbadge'; a.append(b); }
  b.textContent = FR_IN.length;
}
// look for new requests now and then while the app is open
if (SB_ON) {
  const poll = () => { if (CL.uid && document.visibilityState === 'visible') loadFriends().then(() => { if (location.hash === '#/friends' && FR_IN.length) route(); }).catch(() => { }); };
  setTimeout(poll, 2500); setInterval(poll, 60e3);
  document.addEventListener('visibilitychange', poll);
}
// The Friends tab: add a friend with their code, and a ranking of you and your friends by level (then XP).
let FR_AT = 0; // when the list was last fetched
function friendsView() {
  if (needProfile()) return;
  if (!CL.uid) {
    view.innerHTML = `<h1>Friends</h1><div class="mut">Sign in to add friends and see their profiles.</div><button class="btn" onclick="location.hash='#/account'">Sign in</button>`;
    return;
  }
  const me = { id: CL.uid, username: CL.user, public: publicProfile(), me: true };
  const all = [me, ...(FRIENDS || [])].sort((x, y) => (y.public?.lvl || 1) - (x.public?.lvl || 1) || (y.public?.xp || 0) - (x.public?.xp || 0));
  // each player as their own profile card: their banner, ring (laurels, halos...) and picture
  const row = (f, i) => { const p = f.public || {}; return `<div class="hud tap fcard bn-${esc(p.banner || 'plain')} ${f.me ? 'me' : ''}" role="button" ${f.me ? `onclick="location.hash='#/profile'"` : `onclick="location.hash='#/friend/${f.id}'"`}>
    <b class="rank">${i + 1}</b><div class="av fr-${esc(p.frame || 'none')}" style="--p:1"><span>${gi(p.avatar || 'user', 'hero')}</span><i class="lv">${p.lvl || 1}</i></div>
    <div class="grow"><div class="hn" translate="no">${esc(p.name || f.username || '')}</div><div class="mut">${f.me ? 'You' : esc(p.title || '')}</div></div></div>`; };
  const reqs = FR_IN.map(f => { const p = f.public || {}; return `<div class="card row freq"><div class="av fr-${esc(p.frame || 'none')}" style="--p:1;width:40px;height:40px"><span>${gi(p.avatar || 'user', 'hero')}</span></div>
    <span class="grow"><b translate="no">${esc(p.name || f.username || '')}</b><small class="mut">wants to be your friend</small></span>
    <button class="btn sm" onclick="acceptFriend('${f.id}')">Accept</button><button class="icon" aria-label="Decline" onclick="declineFriend('${f.id}')">✕</button></div>`; }).join('');
  const sent = FR_OUT.map(f => { const p = f.public || {}; return `<div class="card row freq"><div class="av fr-${esc(p.frame || 'none')}" style="--p:1;width:40px;height:40px"><span>${gi(p.avatar || 'user', 'hero')}</span></div>
    <span class="grow"><b translate="no">${esc(p.name || f.username || '')}</b><small class="mut">request sent</small></span>
    <button class="btn ghost sm" onclick="declineFriend('${f.id}')">Cancel</button></div>`; }).join('');
  view.innerHTML = `<h1>Friends</h1>${podium(all)}
  <div class="row"><input id="fr-code" placeholder="Friend's code" maxlength="6" autocapitalize="characters" spellcheck="false"><button class="btn sm" onclick="addFriend()">Add</button></div>
  <div class="mut">Your code: <b translate="no">${esc(CL.code || '')}</b></div>
  <h2 class="sec">Pending requests${FR_IN.length ? ` · ${FR_IN.length}` : ''}</h2>
  ${reqs || sent ? reqs + sent : `<div class="mut">${FRIENDS === null ? '…' : 'No pending requests.'}</div>`}
  <h2 class="sec">Ranking</h2><div class="friends">${all.map(row).join('')}</div>`;
  if (Date.now() - FR_AT > 30e3) { FR_AT = Date.now(); loadFriends().then(() => { if (location.hash === '#/friends') route(); }).catch(() => { FRIENDS = FRIENDS || []; }); }
}
// The podium: the three highest levels among you and your friends. When someone climbs onto it or overtakes someone on
// it, a toast says so and their step bounces once.
function podium(all) {
  const top = all.slice(0, 3), ids = top.map(f => f.id);
  let last = {}; try { last = JSON.parse(localStorage.getItem('fc.podium')) || {}; } catch { /* first time */ }
  const before = last.ids || [], same = last.n === all.length; // only levels count: adding or removing a friend says nothing
  const moved = new Set(same ? ids.filter((id, i) => before.length && (before.indexOf(id) < 0 || before.indexOf(id) > i)) : []);
  if (FRIENDS !== null && (ids.join() !== before.join() || !same)) {
    try { localStorage.setItem('fc.podium', JSON.stringify({ ids, n: all.length })); } catch { /* storage blocked */ }
    top.forEach((f, i) => { if (moved.has(f.id)) toast(T('{0} is now #{1}', f.public?.name || f.username || '', i + 1)); });
  }
  const shine = '<i class="shine"><i></i></i>', sparks = '<i class="spk s1">✦</i><i class="spk s2">✧</i><i class="spk s3">✦</i>';
  const step = (f, place) => { if (!f) return `<div class="pod p${place} empty"><div class="pav">?</div><div class="blk">${shine}<b>${place}</b></div></div>`;
    const p = f.public || {};
    return `<div class="pod p${place}${moved.has(f.id) ? ' up' : ''}${f.me ? ' me' : ''}" ${f.me ? '' : `onclick="location.hash='#/friend/${f.id}'"`}>
      <div class="pav av fr-${esc(p.frame || 'none')}" style="--p:1"><span>${gi(p.avatar || 'user', 'hero')}</span></div>
      ${place === 1 ? sparks : ''}<div class="pn" translate="no">${esc(p.name || f.username || '')}</div><div class="pl">Lv ${p.lvl || 1}</div><div class="blk">${shine}<b>${place}</b></div></div>`; };
  return `<div class="podium">${step(top[1], 2)}${step(top[0], 1)}${step(top[2], 3)}</div>`;
}
window.addFriend = async () => {
  const code = ($('#fr-code')?.value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) { toast('Codes have 6 letters and numbers'); return; }
  if (code === CL.code) { toast("That's your own code"); return; }
  try {
    const [p] = await sbFetch(`/rest/v1/profiles?code=eq.${code}&select=id`);
    if (!p) { toast('No player with that code'); return; }
    await sbFetch('/rest/v1/friends', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ user_id: CL.uid, friend_id: p.id }) });
    await loadFriends(); FR_AT = Date.now(); toast(FRIENDS.some(f => f.id === p.id) ? 'Friend added' : 'Request sent'); sfx('claim'); route();
  } catch (e) { toast(e.message); }
};
window.acceptFriend = async id => {
  try { await sbFetch('/rest/v1/friends', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ user_id: CL.uid, friend_id: id }) }); await loadFriends(); FR_AT = Date.now(); toast('Friend added'); sfx('claim'); route(); } catch (e) { toast(e.message); }
};
// declining or removing clears both directions
const unfriend = id => Promise.all([sbFetch(`/rest/v1/friends?user_id=eq.${CL.uid}&friend_id=eq.${id}`, { method: 'DELETE' }), sbFetch(`/rest/v1/friends?user_id=eq.${id}&friend_id=eq.${CL.uid}`, { method: 'DELETE' })]);
window.declineFriend = async id => { try { await unfriend(id); await loadFriends(); FR_AT = Date.now(); route(); } catch (e) { toast(e.message); } };
window.removeFriend = async id => {
  try { await unfriend(id); await loadFriends(); FR_AT = Date.now(); location.hash = '#/friends'; } catch (e) { toast(e.message); }
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
  ${profileShow(p, false)}
  <button class="btn ghost" onclick="removeFriend('${f.id}')">Remove friend</button>`;
}

if (SB_ON) {
  Object.assign(routes, { account: accountView, friend: friendView, friends: friendsView });
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
    'Friend added': 'Amigo añadido', '{0} is now #{1}': '{0} pasa al puesto {1}', 'Sign in to add friends and see their profiles.': 'Entra para añadir amigos y ver sus perfiles.', Ranking: 'Ranking', You: 'Tú', 'Lv {n}': 'Nv {n}', 'Remove friend': 'Quitar amigo', 'day streak': 'días de racha', badges: 'insignias', 'I already have an account': 'Ya tengo cuenta',
    Requests: 'Solicitudes', 'Pending requests': 'Peticiones pendientes', 'request sent': 'petición enviada', 'No pending requests.': 'No hay peticiones pendientes.', 'Pending requests · {n}': 'Peticiones pendientes · {n}', 'wants to be your friend': 'quiere ser tu amigo', Accept: 'Aceptar', Decline: 'Rechazar', 'Request sent': 'Solicitud enviada', 'Waiting for:': 'Esperando a:',
    'Turn off e-mail confirmation in Supabase (see tools/supabase.sql)': 'Desactiva la confirmación por e-mail en Supabase (mira tools/supabase.sql)',
  });
}
if (typeof i18nAdd === 'function') i18nAdd({ 'Sign in to sync and add friends': 'Entra para sincronizar y añadir amigos' });
