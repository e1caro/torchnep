'use strict';
// The Guild (El Gremio): exercises players share. Anyone signed in can browse them (muscle map, name, author and how
// many players use them), filter by muscle and equipment, and add one to their own exercises to use in routines.
// Moderation, as Google Play asks for user content: report button (an exercise with 3 reports is hidden until an
// admin looks at it), admins can delete or restore, players can block an author, and names pass a bad-words filter
// (here and in the database). Tables and rules: tools/supabase-play.sql.

const GUILD = { list: null, admin: false, at: 0, f: { m: '', e: '' } };
const GLD = load('guild', { added: [], blocked: [], reported: [] }); // exercises you added, authors you blocked, what you reported
const gldSave = () => save('guild', GLD);
const gldEx = r => ({ ...myxEx({ ...r.data, id: 'g_' + r.id }), cid: r.id, by: r.author_name, guild: true });
// exercises added from the Guild work like your own (offline too): kept with your data
function guildLoad() { return (GLD.added || []).map(r => gldEx(r)); }
async function guildFetch() {
  const rows = await sbFetch('/rest/v1/community_ex?select=id,author,author_name,data,uses,reports,hidden,created_at&order=uses.desc,created_at.desc&limit=300');
  GUILD.list = rows; GUILD.at = Date.now();
  try { GUILD.admin = !!(await sbFetch('/rest/v1/rpc/is_admin', { method: 'POST', body: '{}' })); } catch { GUILD.admin = false; }
  // your shared exercises' uses, for the Guild master badge
  G.guildUses = rows.filter(r => r.author === CL.uid).reduce((a, r) => a + (r.uses || 0), 0); commit();
}
function guildCard(r) {
  const e = gldEx(r), mine = r.author === CL.uid, added = GLD.added.some(a => a.id === r.id);
  return `<section class="card gcard ${r.hidden ? 'hidden' : ''}"><div class="row"><span class="gmap">${bodyMap(e.m, e.s, 'both')}</span>
    <div class="grow"><b>${esc(e.n)}</b><div class="mut">${esc(tr(e.e))} · ${esc(tr(e.l))}</div><div class="mut">by <span translate="no">${esc(r.author_name || '?')}</span>${mine ? ' (you)' : ''}</div>
      <div class="chips static">${e.m.map(m => `<span class="chip on">${tr(m)}</span>`).join('')}${e.s.map(m => `<span class="chip">${tr(m)}</span>`).join('')}</div></div>
    <div class="guses" title="${esc(tr('Players using it'))}"><b>${r.uses || 0}</b><span>use it</span></div></div>
    ${e.i.length ? `<details><summary>How to</summary><ol class="how">${e.i.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>` : ''}
    ${r.hidden ? `<div class="mut">Hidden after ${r.reports} reports.</div>` : ''}
    <div class="row gact">${mine ? '<span class="mut">Your exercise</span>' : added ? `<span class="mut">${ic('check', 14)} In your exercises</span>` : `<button class="btn sm" onclick="guildAdd('${r.id}')">${ic('plus', 14)} Add to my routines</button>`}
      <span class="grow"></span>${mine ? '' : `<button class="icon" aria-label="Report" title="${esc(tr('Report'))}" onclick="guildReport('${r.id}')">⚑</button><button class="icon" aria-label="Block author" title="${esc(tr('Block author'))}" onclick="guildBlock('${r.author}')">⦸</button>`}
      ${GUILD.admin ? `${r.hidden ? `<button class="btn sm ghost" onclick="guildAdmin('${r.id}','restore')">Restore</button>` : ''}<button class="btn sm ghost danger" onclick="guildAdmin('${r.id}','delete')">Delete</button>` : ''}</div></section>`;
}
function guildView() {
  if (needProfile()) return;
  const back = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>`;
  if (!CL.uid) { view.innerHTML = `${back}<h1>The Guild</h1><div class="mut">Community exercises. Sign in to see them and share yours.</div><button class="btn" onclick="location.hash='#/account'">Sign in</button>`; return; }
  if (!GUILD.list || Date.now() - GUILD.at > 60e3) {
    if (!GUILD.list) view.innerHTML = `${back}<h1>The Guild</h1><div class="mut">…</div>`;
    guildFetch().then(() => { if (location.hash === '#/guild') guildView(); }).catch(e => { if (location.hash === '#/guild') view.innerHTML = `${back}<h1>The Guild</h1><div class="mut">${esc(e.message)}</div>`; });
    if (!GUILD.list) return;
  }
  const f = GUILD.f, groups = MGROUPS.filter(([, , ms]) => GUILD.list.some(r => r.data.m.some(m => ms.includes(m))));
  const list = GUILD.list.filter(r => !GLD.blocked.includes(r.author) && (!r.hidden || GUILD.admin || r.author === CL.uid)
    && (!f.m || r.data.m.some(m => (MGROUPS.find(g => g[0] === f.m)?.[2] || []).includes(m))) && (!f.e || r.data.e === f.e));
  view.innerHTML = `${back}<h1>The Guild</h1><div class="mut">Exercises shared by the community. Add the ones you like to your routines, and share yours from My exercises.</div>
  <div class="row gtop"><button class="btn sm" onclick="location.hash='#/myex'">${ic('plus', 16)} My exercises</button></div>
  <div class="two"><select onchange="GUILD.f.m=this.value;guildView()"><option value="">All muscles</option>${groups.map(([k, n]) => `<option value="${k}" ${f.m === k ? 'selected' : ''}>${tr(n)}</option>`).join('')}</select>
  <select onchange="GUILD.f.e=this.value;guildView()"><option value="">All equipment</option>${[...new Set(GUILD.list.map(r => r.data.e))].map(e => `<option value="${e}" ${f.e === e ? 'selected' : ''}>${tr(e)}</option>`).join('')}</select></div>
  ${list.length ? list.map(guildCard).join('') : '<div class="mut" style="margin-top:12px">No exercises here yet. Be the first to share one!</div>'}
  ${GLD.blocked.length ? `<button class="btn ghost sm" onclick="guildUnblockAll()">Unblock ${GLD.blocked.length} author(s)</button>` : ''}
  <div class="mut gnote">Report anything offensive with ⚑: with 3 reports it is hidden and reviewed.</div>`;
}
// sharing (from My exercises)
window.guildShare = async (id, quiet) => {
  if (!CL.uid) { toast(tr('Sign in to share')); location.hash = '#/account'; return; }
  const x = MYX.find(o => o.id === id); if (!x) return;
  if (badWord(x.n) || badWord(x.d)) { toast(tr('Please use respectful words.')); return; }
  const data = { n: x.n, d: x.d, e: x.e, l: x.l, m: x.m, s: x.s };
  try {
    if (x.cid) await sbFetch(`/rest/v1/community_ex?id=eq.${x.cid}`, { method: 'PATCH', body: JSON.stringify({ data, updated_at: new Date().toISOString() }) });
    else { const [r] = await sbFetch('/rest/v1/community_ex', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ author: CL.uid, author_name: S.profile?.name || CL.user, data }) }); x.cid = r.id; myxSave(); }
    GUILD.at = 0; if (!quiet) { toast(tr('Shared in the Guild')); sfx('claim'); route(); }
  } catch (e) { toast(/check|violat/i.test(e.message) ? tr('Please use respectful words.') : e.message); }
};
window.guildUnshare = async (id, quiet) => {
  const x = MYX.find(o => o.id === id); if (!x?.cid) return;
  try { await sbFetch(`/rest/v1/community_ex?id=eq.${x.cid}`, { method: 'DELETE' }); delete x.cid; myxSave(); GUILD.at = 0; if (!quiet) { toast(tr('No longer shared')); route(); } } catch (e) { toast(e.message); }
};
// adding one to your routines: a copy kept with your data, and one more "uses it"
window.guildAdd = async id => {
  const r = GUILD.list?.find(o => o.id === id); if (!r || GLD.added.some(a => a.id === id)) return;
  GLD.added.push({ id: r.id, author_name: r.author_name, data: r.data }); gldSave();
  const e = gldEx(r); EX.push(e); BY[e.id] = e;
  try { await sbFetch('/rest/v1/community_uses', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ ex_id: id, user_id: CL.uid }) }); r.uses = (r.uses || 0) + 1; } catch { /* counted next time */ }
  sfx('claim');
  if (typeof RT !== 'undefined' && RT.length) rtPick(e.id); else toast(tr('Added to your exercises: find it in the library and in routines'));
  guildView();
};
window.guildReport = id => {
  if (GLD.reported.includes(id)) { toast(tr('You already reported it')); return; }
  modal(`<h2>Report this exercise?</h2><div class="mut">Tell us what is wrong. With 3 reports it is hidden until it is reviewed.</div>
    <select id="rp-r"><option value="offensive">Offensive or hateful</option><option value="dangerous">Dangerous</option><option value="spam">Spam or nonsense</option><option value="other">Other</option></select>
    <button class="btn danger" id="rp-go">Report</button><button class="btn ghost" data-close>Cancel</button>`);
  $('#rp-go').onclick = async () => {
    try { await sbFetch('/rest/v1/community_reports', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ ex_id: id, user_id: CL.uid, reason: $('#rp-r').value }) }); } catch (e) { toast(e.message); return; }
    GLD.reported.push(id); gldSave(); $('#modal').hidden = true; toast(tr('Thanks, we will review it')); GUILD.at = 0; guildView();
  };
};
window.guildBlock = author => {
  if (!confirm(tr('Block this author? You will not see their exercises any more.'))) return;
  GLD.blocked.push(author); gldSave(); toast(tr('Author blocked')); guildView();
};
window.guildUnblockAll = () => { GLD.blocked = []; gldSave(); guildView(); };
window.guildAdmin = async (id, what) => {
  try {
    if (what === 'delete') { if (!confirm('Delete for everyone?')) return; await sbFetch(`/rest/v1/community_ex?id=eq.${id}`, { method: 'DELETE' }); }
    else await sbFetch('/rest/v1/rpc/community_restore', { method: 'POST', body: JSON.stringify({ ex: id }) });
    GUILD.at = 0; guildView();
  } catch (e) { toast(e.message); }
};

// Guild master: your shared exercises were added by players 5 times
ACH.push({ id: 'guild', n: 'Guild Master', d: 'Your shared exercises were added by players 5 times', i: 'scroll', xp: 100, ok: () => (G.guildUses || 0) >= 5 });
routes.guild = guildView;

if (typeof i18nAdd === 'function') {
  i18nAdd({
    'Community exercises. Sign in to see them and share yours.': 'Ejercicios de la comunidad. Entra para verlos y compartir los tuyos.',
    'Exercises shared by the community. Add the ones you like to your routines, and share yours from My exercises.': 'Ejercicios compartidos por la comunidad. Añade a tus rutinas los que te gusten y comparte los tuyos desde Mis ejercicios.',
    'All muscles': 'Todos los músculos', 'use it': 'lo usan', 'Players using it': 'Jugadores que lo usan', 'How to': 'Cómo se hace', by: 'de', '(you)': '(tú)', 'Your exercise': 'Tu ejercicio',
    'In your exercises': 'En tus ejercicios', 'Add to my routines': 'Añadir a mis rutinas', Report: 'Reportar', 'Block author': 'Bloquear autor', Restore: 'Restaurar',
    'No exercises here yet. Be the first to share one!': 'Aún no hay ejercicios aquí. ¡Sé el primero en compartir uno!', 'Unblock {n} author(s)': 'Desbloquear {n} autor(es)',
    'Report anything offensive with ⚑: with 3 reports it is hidden and reviewed.': 'Reporta lo ofensivo con ⚑: con 3 reportes se oculta y se revisa.',
    'Sign in to share': 'Entra para compartir', 'Shared in the Guild': 'Compartido en el Gremio', 'No longer shared': 'Ya no se comparte',
    'Added to your exercises: find it in the library and in routines': 'Añadido a tus ejercicios: lo tienes en la biblioteca y en las rutinas', 'You already reported it': 'Ya lo has reportado',
    'Report this exercise?': '¿Reportar este ejercicio?', 'Tell us what is wrong. With 3 reports it is hidden until it is reviewed.': 'Dinos qué pasa. Con 3 reportes se oculta hasta que se revise.',
    'Offensive or hateful': 'Ofensivo o de odio', Dangerous: 'Peligroso', 'Spam or nonsense': 'Spam o sin sentido', Other: 'Otro', 'Thanks, we will review it': 'Gracias, lo revisaremos',
    'Block this author? You will not see their exercises any more.': '¿Bloquear a este autor? Ya no verás sus ejercicios.', 'Author blocked': 'Autor bloqueado',
    'Hidden after {n} reports.': 'Oculto tras {n} reportes.', 'Guild Master': 'Maestro del Gremio', 'Your shared exercises were added by players 5 times': 'Tus ejercicios compartidos se han añadido 5 veces',
  });
}
