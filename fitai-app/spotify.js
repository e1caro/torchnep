'use strict';
// Spotify: link your account and get a fresh playlist for each workout, built from energetic songs you like
// plus a few new ones from the same artists. It runs in the browser with Spotify's PKCE sign-in (no server, no secret).
// It needs the Client ID of a Spotify app: set SPOTIFY_CLIENT_ID below, or paste one in Settings > Music.
const SPOTIFY_CLIENT_ID = '';
const SP_SCOPES = 'user-read-private playlist-read-private playlist-modify-private playlist-modify-public user-library-modify';
const SPF = Object.assign({ cid: '', tok: '', exp: 0, refresh: '', user: null, used: [], lists: {}, genres: [], mine: [], rot: 0 }, load('spotify', {}));
const spoSave = () => save('spotify', SPF);
const spCid = () => SPF.cid || SPOTIFY_CLIENT_ID;
const spOn = () => !!(spCid() && SPF.refresh);
const SP_WEB = 'https://e1caro.github.io/torchnep/fitcoach/';
// the APK can't receive a web address, so it uses the web app's one and the APK catches it on the way back
const spRedirect = () => (/FitQuestApp\//.test(navigator.userAgent) ? SP_WEB : location.origin + location.pathname.replace(/index\.html$/, ''));
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let SP_BUSY = false;

// ---------- sign-in ----------
window.spConnect = async () => {
  if (!spCid()) { location.hash = '#/settings'; toast('Add your Spotify Client ID first.'); return; }
  const ver = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const chal = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ver)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
  save('spPkce', { ver, state, back: location.hash || '#/home' });
  location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    client_id: spCid(), response_type: 'code', redirect_uri: spRedirect(), code_challenge_method: 'S256', code_challenge: chal, state, scope: SP_SCOPES,
  });
};
window.spDisconnect = () => { Object.assign(SPF, { tok: '', exp: 0, refresh: '', user: null, lists: {} }); spoSave(); spRefreshView(); };
window.spSetCid = () => {
  const v = (document.querySelector('#spcid')?.value || '').trim();
  if (!/^[0-9a-f]{32}$/i.test(v)) { toast('That does not look like a Client ID (32 letters and numbers).'); return; }
  SPF.cid = v; spoSave(); spRefreshView();
};
window.spEditCid = () => { SPF.cid = ''; SPF.refresh = ''; SPF.tok = ''; spoSave(); spRefreshView(); };

async function spTokenCall(params) {
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: spCid(), ...params }),
  });
  if (!r.ok) throw new Error('auth');
  const j = await r.json();
  SPF.tok = j.access_token; SPF.exp = Date.now() + j.expires_in * 1000; if (j.refresh_token) SPF.refresh = j.refresh_token;
  spoSave();
}
async function spToken() {
  if (SPF.tok && Date.now() < SPF.exp - 60000) return SPF.tok;
  if (!SPF.refresh) throw new Error('auth');
  try { await spTokenCall({ grant_type: 'refresh_token', refresh_token: SPF.refresh }); } catch (e) { spDisconnect(); throw e; }
  return SPF.tok;
}
async function spApi(path, opt = {}, tries = 2) {
  const r = await fetch(path.startsWith('http') ? path : 'https://api.spotify.com/v1' + path, { ...opt, headers: { Authorization: 'Bearer ' + await spToken(), 'Content-Type': 'application/json' } });
  if (r.status === 429 && tries > 0) { await new Promise(ok => setTimeout(ok, 1000 * Math.min(5, +r.headers.get('Retry-After') || 1))); return spApi(path, opt, tries - 1); }
  if (r.status === 401 && tries > 0) { SPF.exp = 0; return spApi(path, opt, tries - 1); }
  if (!r.ok) throw new Error('spotify ' + r.status);
  const txt = await r.text(); // some answers are empty
  return txt ? JSON.parse(txt) : null;
}

// coming back from Spotify's sign-in page with ?code=...
(async () => {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error')) return;
  const pk = load('spPkce', null);
  localStorage.removeItem('fc.spPkce');
  history.replaceState(null, '', location.pathname + (pk?.back || '#/home'));
  if (q.get('error') || !pk || q.get('state') !== pk.state) { toast('Spotify was not linked.'); route(); return; }
  try {
    await spTokenCall({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: spRedirect(), code_verifier: pk.ver });
    const me = await spApi('/me');
    SPF.user = { id: me.id, name: me.display_name || me.id, country: me.country || '' }; spoSave();
    toast('Spotify linked'); sfx('claim');
  } catch { toast('Spotify was not linked.'); }
  route();
})();

// ---------- the workout playlist ----------
// A random playlist from the song list (data/songs.txt) of the genre you pick, as long as the workout. It always has the
// same name, and the previous one is removed when a new one is made, so your library never fills up with them.
const SP_TITLE = 'FitQuest · Workout';
SPF.durs = SPF.durs || {};
// a song's Spotify id and length, from Spotify's search (kept, so each song is looked up once)
async function spFind(t, a) {
  const key = `${t}|${a}`;
  if (SPF.ids[key] && SPF.durs[key]) return { id: SPF.ids[key], ms: SPF.durs[key] };
  const who = a.split(/ & |, | feat\. /)[0];
  const tk = (await spApi(`/search?type=track&limit=1&q=${encodeURIComponent(`track:${t} artist:${who}`)}`)).tracks?.items?.[0];
  if (!tk) return null;
  SPF.ids[key] = tk.id; SPF.durs[key] = tk.duration_ms || 200000;
  return { id: tk.id, ms: SPF.durs[key] };
}
async function spUnfollow(id) {
  await spApi(`/playlists/${id}/followers`, { method: 'DELETE' }).catch(() => spApi(`/me/library?uris=${encodeURIComponent('spotify:playlist:' + id)}`, { method: 'DELETE' })).catch(() => {});
}
const spPlGenre = () => SPF.plGenre || SPF.genres[0] || 'rock';
window.spSetPlGenre = g => { SPF.plGenre = g; spoSave(); sfx('tick'); spRefreshView(); };

window.spMakePlaylist = async () => {
  if (SP_BUSY || !spOn()) return;
  const di = nextDayIdx(), minutes = dayMinutes(di), g = spPlGenre();
  const pool = [...(SP_SONGS[g] || SP_SONGS.rock)].sort(() => Math.random() - .5);
  SP_BUSY = true; spRefreshView();
  try {
    const picks = [], goal = minutes * 60000;
    let ms = 0, k = 0;
    while (ms < goal && k < pool.length) { // a few searches at a time until the workout is covered
      const found = await Promise.all(pool.slice(k, k + 4).map(([t, a]) => spFind(t, a).then(f => f && { t, a, ...f }).catch(() => null)));
      k += 4;
      for (const f of found) if (f && ms < goal) { picks.push(f); ms += f.ms; }
    }
    spoSave();
    if (picks.length < 3) throw new Error('few');
    // the previous one goes (and any other left with this name)
    if (SPF.pl?.id) await spUnfollow(SPF.pl.id);
    try { for (const x of (await spApi('/me/playlists?limit=50')).items || []) if (x?.name === SP_TITLE && x.id !== SPF.pl?.id) await spUnfollow(x.id); } catch { /* fine */ }
    const pl = await spApi('/me/playlists', { method: 'POST', body: JSON.stringify({ name: SP_TITLE, public: false, description: `${(SP_GENRES.find(([x]) => x === g) || [, g])[1]} · ${Math.round(ms / 60000)} min` }) });
    await spApi(`/playlists/${pl.id}/items`, { method: 'POST', body: JSON.stringify({ uris: picks.map(x => 'spotify:track:' + x.id) }) });
    SPF.pl = { id: pl.id, url: pl.external_urls?.spotify || `https://open.spotify.com/playlist/${pl.id}`, g, min: Math.round(ms / 60000), songs: picks.map(x => [x.t, x.a]), t: Date.now() };
    spoSave(); sfx('claim');
  } catch (e) {
    toast(e.message === 'few' ? 'Spotify did not find enough songs. Try another genre.' : e.message === 'auth' ? 'Link Spotify again.' : 'Spotify did not answer. Try again in a moment.');
  }
  SP_BUSY = false; spRefreshView();
};

// ---------- on screen ----------
function spRefreshView() {
  const name = (location.hash || '#/home').split('/')[1] || 'home';
  if (name === 'home') home(); else if (name === 'settings') routes.settings();
}
const spLogo = '<svg class="splogo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1ed760"/><path d="M6 9.2c4-1.2 8.6-.8 12 1.2M6.6 12.4c3.3-1 7-.6 9.8 1M7.2 15.4c2.7-.7 5.4-.4 7.6.8" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round"/></svg>';

// ---------- music without linking an account ----------
// Spotify only lets a handful of hand-picked accounts link to an app, so everyone else gets music through plain links:
// their own playlists (pasted once) and workout playlists of the genres they like, a different one each workout.
const SP_GENRES = [['rock', 'Rock'], ['metal', 'Metal'], ['reggaeton', 'Reggaeton'], ['hiphop', 'Hip hop'], ['trap', 'Trap'], ['edm', 'EDM'],
  ['techno', 'Techno'], ['house', 'House'], ['pop', 'Pop'], ['latin', 'Latin'], ['phonk', 'Phonk'], ['kpop', 'K-pop'], ['punk', 'Punk'], ['dnb', 'Drum and bass']];
const SP_SUFFIX = ['workout', 'gym', 'training', 'cardio', 'beast mode'];
const spParse = u => { const m = String(u).match(/(playlist|album|artist)[/:]([A-Za-z0-9]{22})/); return m && { type: m[1], id: m[2] }; };
const spUrl = x => `https://open.spotify.com/${x.type}/${x.id}`;
function spPick() {
  const opts = [...SPF.mine.map(x => ({ kind: 'mine', x })), ...SPF.genres.map(g => ({ kind: 'genre', g }))];
  if (!opts.length) return null;
  const k = S.history.length + (SPF.rot || 0), o = opts[k % opts.length];
  if (o.kind === 'genre') {
    const name = (SP_GENRES.find(([g]) => g === o.g) || [, o.g])[1], q = `${name} ${SP_SUFFIX[k % SP_SUFFIX.length]}`;
    return { ...o, name, q, url: `https://open.spotify.com/search/${encodeURIComponent(q)}/playlists` };
  }
  return o;
}
window.spGenre = g => { SPF.genres = SPF.genres.includes(g) ? SPF.genres.filter(x => x !== g) : [...SPF.genres, g]; spoSave(); spRefreshView(); };
window.spNext = () => { SPF.rot = (SPF.rot || 0) + 1; spoSave(); sfx('tick'); spRefreshView(); };
window.spAddMine = async () => {
  const inp = document.querySelector('.music .spadd input'), x = spParse(inp?.value || '');
  if (!x) { toast('Paste a Spotify playlist, album or artist link.'); return; }
  if (SPF.mine.some(m => m.id === x.id)) { toast('That one is already in your list.'); return; }
  SPF.mine.push(x); spoSave(); toast('Added'); spRefreshView();
  try { // its name, from Spotify's public oEmbed (no account needed)
    const j = await (await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(spUrl(x)))).json();
    if (j.title) { x.name = j.title; spoSave(); spRefreshView(); }
  } catch { /* the link works without a name */ }
};
window.spDelMine = i => { SPF.mine.splice(i, 1); spoSave(); spRefreshView(); };
function musicPrefs() {
  return `<div class="lbl">Genres you like to train to</div>
    <div class="chips">${SP_GENRES.map(([g, n]) => `<button class="chip ${SPF.genres.includes(g) ? 'on' : ''}" onclick="spGenre('${g}')">${n}</button>`).join('')}</div>
    <div class="lbl">Your playlists</div>
    ${SPF.mine.map((x, i) => `<div class="row between spmine"><a href="${spUrl(x)}" target="_blank" rel="noopener" translate="no">${esc(x.name || `${x.type} ${x.id.slice(0, 6)}…`)}</a><button class="icon" aria-label="Remove" onclick="spDelMine(${i})">✕</button></div>`).join('')}
    <div class="row spadd"><input placeholder="Paste a Spotify playlist link" autocomplete="off" spellcheck="false"><button class="btn sm" onclick="spAddMine()">Add</button></div>`;
}
function musicFree() {
  const pick = spPick(), link = spCid() ? `<button class="btn ghost sm" onclick="spConnect()">${spLogo} Link Spotify for playlists made from your own songs</button>` : '';
  if (!pick) {
    return `<section class="card music"><h3>${spLogo} Workout music</h3>
      <div class="mut">Pick the music you train to, or paste your Spotify playlists. Each workout gets a different one.</div>${musicPrefs()}${link}</section>`;
  }
  const play = pick.kind === 'mine'
    ? `<iframe class="spembed" src="https://open.spotify.com/embed/${pick.x.type}/${pick.x.id}?theme=0" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" title="Spotify"></iframe>
      <a class="btn spbtn" href="${spUrl(pick.x)}" target="_blank" rel="noopener">${spLogo} Play in Spotify</a>`
    : `<div class="spgenre"><b translate="no">${esc(pick.q)}</b><span class="mut">Workout playlists on Spotify</span></div>
      <a class="btn spbtn" href="${pick.url}" target="_blank" rel="noopener">${spLogo} Open in Spotify</a>`;
  return `<section class="card music"><div class="row between"><h3>${spLogo} Workout music</h3><span class="mut">For this workout</span></div>
    ${play}<button class="btn ghost sm" onclick="spNext()">Something else</button>
    <details class="spprefs"><summary>Change my music</summary>${musicPrefs()}</details>${link}</section>`;
}

// ---------- song of the day ----------
// A well-known energetic song from one of your genres each day, with links to play it and to its song radio on Spotify.
// Spotify only shares song ids with signed-in apps, so the links open Spotify's own search for the song and its "Radio".
const SP_SONGS = {
  rock: [['Thunderstruck', 'AC/DC'], ['Eye of the Tiger', 'Survivor'], ['We Will Rock You', 'Queen'], ['Seven Nation Army', 'The White Stripes'], ['Back in Black', 'AC/DC'],
    ["Welcome to the Jungle", "Guns N' Roses"], ['Smells Like Teen Spirit', 'Nirvana'], ["Can't Stop", 'Red Hot Chili Peppers'], ['The Pretender', 'Foo Fighters'], ['Highway to Hell', 'AC/DC'],
    ['Mr. Brightside', 'The Killers'], ['Uprising', 'Muse'], ["Livin' on a Prayer", 'Bon Jovi'], ['Kickstart My Heart', 'Mötley Crüe']],
  metal: [['Enter Sandman', 'Metallica'], ['Master of Puppets', 'Metallica'], ['Duality', 'Slipknot'], ['Down with the Sickness', 'Disturbed'], ['Chop Suey!', 'System of a Down'],
    ['Walk', 'Pantera'], ['Bodies', 'Drowning Pool'], ['The Trooper', 'Iron Maiden'], ['Raining Blood', 'Slayer'], ['Du hast', 'Rammstein'], ['Psychosocial', 'Slipknot'],
    ['Freak on a Leash', 'Korn'], ['Last Resort', 'Papa Roach'], ['Indestructible', 'Disturbed']],
  reggaeton: [['Gasolina', 'Daddy Yankee'], ['Dákiti', 'Bad Bunny'], ['Tití Me Preguntó', 'Bad Bunny'], ['Danza Kuduro', 'Don Omar'], ['Safaera', 'Bad Bunny'], ['Con Calma', 'Daddy Yankee'],
    ['Tusa', 'KAROL G'], ['Provenza', 'KAROL G'], ['Hawái', 'Maluma'], ['Pepas', 'Farruko'], ['Callaíta', 'Bad Bunny'], ['Mayores', 'Becky G']],
  hiphop: [['Lose Yourself', 'Eminem'], ["Till I Collapse", 'Eminem'], ['Stronger', 'Kanye West'], ['POWER', 'Kanye West'], ['HUMBLE.', 'Kendrick Lamar'], ['Remember the Name', 'Fort Minor'],
    ["X Gon' Give It to Ya", 'DMX'], ["Can't Hold Us", 'Macklemore & Ryan Lewis'], ['SICKO MODE', 'Travis Scott'], ['Not Afraid', 'Eminem'], ['In Da Club', '50 Cent'], ['DNA.', 'Kendrick Lamar'], ['Berzerk', 'Eminem']],
  trap: [['Mask Off', 'Future'], ['goosebumps', 'Travis Scott'], ['Bad and Boujee', 'Migos'], ['rockstar', 'Post Malone'], ['XO Tour Llif3', 'Lil Uzi Vert'], ['Mo Bamba', 'Sheck Wes'],
    ['Panda', 'Desiigner'], ['FE!N', 'Travis Scott'], ['Rich Flex', 'Drake & 21 Savage'], ['Magnolia', 'Playboi Carti'], ['Look at Me!', 'XXXTENTACION']],
  edm: [['Levels', 'Avicii'], ['Titanium', 'David Guetta'], ['Animals', 'Martin Garrix'], ["Don't You Worry Child", 'Swedish House Mafia'], ['Wake Me Up', 'Avicii'], ['Clarity', 'Zedd'],
    ['Lean On', 'Major Lazer & DJ Snake'], ['Turn Down for What', 'DJ Snake & Lil Jon'], ['Bangarang', 'Skrillex'], ['Summer', 'Calvin Harris'], ['Tremor', 'Dimitri Vegas & Like Mike'], ['One More Time', 'Daft Punk']],
  techno: [['Sandstorm', 'Darude'], ['Born Slippy (Nuxx)', 'Underworld'], ['The Bells', 'Jeff Mills'], ['Energy Flash', 'Joey Beltram'], ['Spastik', 'Plastikman'], ['Your Mind', 'Adam Beyer & Bart Skils'],
    ['Opus', 'Eric Prydz'], ['Strobe', 'deadmau5'], ["Ghosts 'n' Stuff", 'deadmau5'], ['Children', 'Robert Miles']],
  house: [['Losing It', 'FISHER'], ['Cola', 'CamelPhat & Elderbrook'], ['Pjanoo', 'Eric Prydz'], ['Finally', 'Kings of Tomorrow'], ['Music Sounds Better with You', 'Stardust'], ['Show Me Love', 'Robin S'],
    ['Lady (Hear Me Tonight)', 'Modjo'], ['Gecko (Overdrive)', 'Oliver Heldens'], ['One Kiss', 'Calvin Harris & Dua Lipa'], ['Where You Are', 'John Summit'], ['Freed from Desire', 'Gala']],
  pop: [['Blinding Lights', 'The Weeknd'], ['Levitating', 'Dua Lipa'], ['Uptown Funk', 'Mark Ronson & Bruno Mars'], ["Can't Stop the Feeling!", 'Justin Timberlake'], ['Shake It Off', 'Taylor Swift'],
    ["Don't Start Now", 'Dua Lipa'], ['Bad Romance', 'Lady Gaga'], ['Toxic', 'Britney Spears'], ['Roar', 'Katy Perry'], ['Physical', 'Dua Lipa'], ["Stronger (What Doesn't Kill You)", 'Kelly Clarkson'],
    ['Firework', 'Katy Perry'], ['Run the World (Girls)', 'Beyoncé'], ['Flowers', 'Miley Cyrus']],
  latin: [['Vivir Mi Vida', 'Marc Anthony'], ['La Bicicleta', 'Carlos Vives & Shakira'], ["Hips Don't Lie", 'Shakira'], ['Bailando', 'Enrique Iglesias'], ['La Gozadera', 'Gente de Zona'], ['Waka Waka', 'Shakira'],
    ['Échame la Culpa', 'Luis Fonsi & Demi Lovato'], ['Suavemente', 'Elvis Crespo'], ['DESPECHÁ', 'ROSALÍA'], ['Mi Gente', 'J Balvin & Willy William'], ['Taki Taki', 'DJ Snake'], ['La Vida Es Un Carnaval', 'Celia Cruz']],
  phonk: [['Murder In My Mind', 'Kordhell'], ['Close Eyes', 'DVRST'], ['Metamorphosis', 'INTERWORLD'], ['Sahara', 'Hensonn'], ['Neon Blade', 'MoonDeity'], ['Live Another Day', 'Kordhell'],
    ['Memory Reboot', 'VØJ & Narvent'], ['Phonky Town', 'PlayaPhonk'], ['Lovely Bastards', 'ZWE1HVNDXR'], ['RAVE', 'Dxrk ダーク']],
  kpop: [['Kill This Love', 'BLACKPINK'], ['DDU-DU DDU-DU', 'BLACKPINK'], ['FIRE', 'BTS'], ['MIC Drop', 'BTS'], ["God's Menu", 'Stray Kids'], ['MANIAC', 'Stray Kids'], ['FANCY', 'TWICE'],
    ['I AM', 'IVE'], ['Hype Boy', 'NewJeans'], ['ANTIFRAGILE', 'LE SSERAFIM'], ['Pink Venom', 'BLACKPINK'], ['Gangnam Style', 'PSY']],
  punk: [['Basket Case', 'Green Day'], ['All the Small Things', 'blink-182'], ['American Idiot', 'Green Day'], ['Blitzkrieg Bop', 'Ramones'], ['Fat Lip', 'Sum 41'], ['Misery Business', 'Paramore'],
    ["The Kids Aren't Alright", 'The Offspring'], ['Self Esteem', 'The Offspring'], ['In Too Deep', 'Sum 41'], ['Holiday', 'Green Day'], ['London Calling', 'The Clash']],
  dnb: [['Watercolour', 'Pendulum'], ['Tarantula', 'Pendulum'], ['Witchcraft', 'Pendulum'], ['Propane Nightmares', 'Pendulum'], ['Hold Your Colour', 'Pendulum'], ['Waiting All Night', 'Rudimental'],
    ['Gold Dust', 'DJ Fresh'], ['Louder', 'DJ Fresh'], ['Shake Ur Body', 'Shy FX'], ['Baddadan', 'Chase & Status'], ['Blind Faith', 'Chase & Status']],
};
// the full list (about 1000 songs) lives in data/songs.txt; the short list above covers the first moments offline
fetch('data/songs.txt').then(r => r.text()).then(txt => {
  const all = {}; let g = null;
  txt.split('\n').forEach(l => { l = l.trim(); if (l.startsWith('## ')) g = l.slice(3); else if (g && l && !l.startsWith('#') && l.includes('|')) (all[g] = all[g] || []).push(l.split('|').map(x => x.trim())); });
  if (Object.keys(all).length) Object.assign(SP_SONGS, all);
}).catch(() => { /* offline on first run: the short list */ });
function songOfDay() {
  const gs = SPF.genres.length ? SPF.genres : Object.keys(SP_SONGS), n = Math.floor(Date.now() / 864e5) + (SPF.songRot || 0), key = `${dayId()}:${SPF.songRot || 0}:${gs.join()}`;
  if (SPF.sod?.key === key) return SPF.sod; // the same song all day, until you ask for another
  const g = gs[n % gs.length], list = SP_SONGS[g] || SP_SONGS.rock, k = Math.floor(n / gs.length);
  const [t, a] = list[(k * 2654435761 >>> 0) % list.length]; // a scrambled walk through the list, so neighbours differ
  SPF.sod = { key, g, t, a, name: (SP_GENRES.find(([x]) => x === g) || [, g])[1] }; spoSave();
  return SPF.sod;
}
window.spSongNext = () => { SPF.songRot = (SPF.songRot || 0) + 1; spoSave(); sfx('tick'); spRefreshView(); };
const spSearch = (q, tab = '') => `https://open.spotify.com/search/${encodeURIComponent(q)}${tab}`;
// ---------- the song itself on Spotify ----------
// To open the song (not a search) its Spotify id is needed. With a linked account Spotify's own search gives it;
// otherwise MusicBrainz (open music data) finds the recording and its link to Spotify.
// Found ids are kept, so each song is looked up once. If anything fails, the button falls back to Spotify's search.
SPF.ids = SPF.ids || {};
// ids found ahead of time for the whole song list (data/song_ids.json, made by tools/resolve_song_ids.py)
let SONG_IDS = {};
fetch('data/song_ids.json').then(r => r.json()).then(j => {
  SONG_IDS = j || {};
  const s = songOfDay(), id = SONG_IDS[`${s.t}|${s.a}`];
  if (id) document.querySelectorAll('.songday a.spplay').forEach(a => { a.href = spTrackUrl(id); });
}).catch(() => { /* not made yet, or offline */ });
const knownId = (t, a) => SPF.ids[`${t}|${a}`] || SONG_IDS[`${t}|${a}`];
const SP_LOOKING = {};
async function spTrackId(t, a) {
  const key = `${t}|${a}`;
  if (knownId(t, a)) return knownId(t, a);
  if (SP_LOOKING[key]) return SP_LOOKING[key];
  return (SP_LOOKING[key] = (async () => {
    const who = a.split(/ & |, | feat\. /)[0];
    let id = null;
    if (spOn()) { // linked account: Spotify's own search
      try { id = (await spApi(`/search?type=track&limit=1&q=${encodeURIComponent(`track:${t} artist:${who}`)}`)).tracks.items[0]?.id; } catch { /* try the other way */ }
    }
    if (!id) { // MusicBrainz: the recording, then its links
      const mb = 'https://musicbrainz.org/ws/2', q = `recording:"${t.replace(/"/g, '')}" AND artist:"${who.replace(/"/g, '')}"`;
      const recs = ((await (await fetch(`${mb}/recording?fmt=json&limit=5&query=${encodeURIComponent(q)}`)).json()).recordings || []).filter(r => r.score >= 85);
      for (const r of recs.slice(0, 3)) {
        const d = await (await fetch(`${mb}/recording/${r.id}?inc=url-rels&fmt=json`)).json();
        id = (d.relations || []).map(x => (x.url?.resource || '').match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/)?.[1]).find(Boolean) || null;
        if (id) break;
      }
    }
    if (id) { SPF.ids[key] = id; spoSave(); }
    delete SP_LOOKING[key];
    return id;
  })().catch(() => { delete SP_LOOKING[key]; return null; }));
}
const spTrackUrl = id => `https://open.spotify.com/track/${id}`;
// tapping Play: straight to the song when its id is known, otherwise look it up first (search as the last resort)
window.spPlaySong = async ev => {
  const s = songOfDay(), id = knownId(s.t, s.a);
  if (id) { ev.currentTarget.href = spTrackUrl(id); return; } // the link points at the song
  ev.preventDefault();
  const a = ev.currentTarget; a.classList.add('sppulse');
  const found = await spTrackId(s.t, s.a);
  a.classList.remove('sppulse');
  location.href = found ? spTrackUrl(found) : spSearch(`${s.t} ${s.a}`);
};

function songCard() {
  const s = songOfDay(), id = knownId(s.t, s.a);
  // find the song's own link in the background, so the button opens it directly
  if (!id) spTrackId(s.t, s.a).then(found => { if (found) document.querySelectorAll('.songday a.spplay').forEach(a => { a.href = spTrackUrl(found); }); });
  return `<section class="card songday"><div class="row between"><h3>${spLogo} Song of the day</h3><span class="chip on" translate="no">${esc(s.name)}</span></div>
    <div class="spsong"><span class="spdisc"></span><div class="grow"><b translate="no">${esc(s.t)}</b><span translate="no">${esc(s.a)}</span></div></div>
    <a class="btn spbtn spplay" href="${id ? spTrackUrl(id) : spSearch(`${s.t} ${s.a}`)}" target="_blank" rel="noopener" onclick="spPlaySong(event)">▶ Play in Spotify</a>
    <button class="btn ghost sm" onclick="spSongNext()">Another song</button>
    <details class="spprefs"><summary>Change genres</summary><div class="chips">${SP_GENRES.map(([g, n]) => `<button class="chip ${SPF.genres.includes(g) ? 'on' : ''}" onclick="spGenre('${g}')">${n}</button>`).join('')}</div></details></section>`;
}

// Without a linked account: the same random pick of songs for the workout, as a list to play song by song.
window.spFreeList = () => {
  const g = spPlGenre(), goal = dayMinutes(nextDayIdx()) * 60, pool = [...(SP_SONGS[g] || SP_SONGS.rock)].sort(() => Math.random() - .5);
  const songs = []; let t = 0;
  for (const [n, a] of pool) { if (t >= goal) break; songs.push([n, a]); t += (SPF.durs[`${n}|${a}`] || 210000) / 1000; }
  SPF.free = { g, songs, min: Math.round(t / 60) }; spoSave(); sfx('tick'); spRefreshView();
};
// the songs' own links once known (search otherwise)
const spSongLink = (n, a) => (knownId(n, a) ? spTrackUrl(knownId(n, a)) : spSearch(`${n} ${a}`));
// linking your own Spotify: Spotify lets one developer app link only 5 accounts, so each person makes their own (free)
const spSetup = () => `<details class="spprefs"${spCid() ? '' : ''}><summary>Link my Spotify</summary>
  <ol class="how spsteps"><li>Open <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> and sign in.</li>
    <li>Create app: any name, choose Web API, and add this Redirect URI:<div class="spuri" translate="no">${esc(SP_WEB)}</div></li>
    <li>Copy its Client ID and paste it here.</li></ol>
  <input id="spcid" placeholder="Client ID" autocomplete="off" spellcheck="false" translate="no" value="${esc(SPF.cid)}">
  <button class="btn" onclick="spSetCid()">Save</button>
  <div class="mut">Spotify asks for Premium for this.</div></details>`;

function musicCard() {
  const pl = SPF.pl, g = spPlGenre(), mins = dayMinutes(nextDayIdx());
  const chips = `<div class="chips spgen">${SP_GENRES.map(([k, n]) => `<button class="chip ${k === g ? 'on' : ''}" onclick="spSetPlGenre('${k}')">${n}</button>`).join('')}</div>`;
  if (SP_BUSY) return `<section class="card music"><h3>${spLogo} Workout playlist</h3><div class="mut sppulse">Making your playlist…</div></section>`;
  if (!spOn()) {
    const fr = SPF.free && SPF.free.g === g ? SPF.free : null;
    return `<section class="card music"><div class="row between"><h3>${spLogo} Workout playlist</h3>${fr ? `<span class="mut">${fr.songs.length} songs · ${fr.min} min</span>` : ''}</div>
    ${chips}
    ${fr ? `<ol class="splist" translate="no">${fr.songs.map(([n, a]) => `<li><a href="${spSongLink(n, a)}" target="_blank" rel="noopener"><b>${esc(n)}</b><span>${esc(a)}</span></a></li>`).join('')}</ol>` : ''}
    <button class="btn ${fr ? 'ghost sm' : 'spbtn'}" onclick="spFreeList()">${fr ? 'New list' : `${spLogo} Make a ${mins} min list`}</button>
    ${spCid() ? `<button class="btn spbtn" onclick="spConnect()">${spLogo} Link Spotify</button>` : spSetup()}</section>`;
  }
  return `<section class="card music"><div class="row between"><h3>${spLogo} Workout playlist</h3>${pl ? `<span class="mut">${pl.songs.length} songs · ${pl.min} min</span>` : ''}</div>
    ${chips}
    ${pl ? `<a class="btn spbtn" href="${esc(pl.url)}" target="_blank" rel="noopener">${spLogo} Play in Spotify</a>` : ''}
    <button class="btn ${pl ? 'ghost sm' : 'spbtn'}" onclick="spMakePlaylist()">${pl ? 'New playlist' : `${spLogo} Make a ${mins} min playlist`}</button></section>`;
}

function musicSettings() {
  const acct = !spCid()
    ? spSetup()
    : spOn() ? `<div class="mut">Linked as <b translate="no">${esc(SPF.user?.name || '')}</b>. Each workout gets its own playlist on Today › Train.</div>
      <button class="btn ghost" onclick="spDisconnect()">Unlink Spotify</button>`
    : `<button class="btn spbtn" onclick="spConnect()">${spLogo} Link Spotify</button>`;
  return `<details class="fold"><summary><h2 class="sec">Music</h2></summary><section class="card music"><div class="row between"><h3>${spLogo} Spotify</h3>${spOn() ? '<span class="mut">Linked</span>' : ''}</div>
    ${spOn() ? '' : musicPrefs()}${acct}
    ${spCid() && !SPOTIFY_CLIENT_ID ? '<button class="btn ghost sm" onclick="spEditCid()">Change Client ID</button>' : ''}</section></details>`;
}

const _spoHome = home;
home = function () { _spoHome(); view.querySelector(':scope > .card.next')?.insertAdjacentHTML('afterend', songCard() + musicCard()); }; // the song of the day, and the workout playlist once Spotify is linked
const _spoSet = settings;
settings = function () { _spoSet(); const m = view.querySelector('#setmusic'); if (m) m.outerHTML = musicSettings(); };
Object.assign(routes, { home, settings });

if (typeof i18nAdd === 'function') i18nAdd({
  'Workout music': 'Música para entrenar', 'A new playlist for every workout, with energetic songs you like.': 'Una lista nueva para cada entrenamiento, con canciones enérgicas que te gustan.',
  'Link Spotify': 'Vincular Spotify', 'Unlink Spotify': 'Desvincular Spotify', 'Picking energetic songs…': 'Eligiendo canciones con energía…',
  'Get a playlist for this workout: energetic songs you like, plus a few new ones.': 'Consigue una lista para este entrenamiento: canciones enérgicas que te gustan y algunas nuevas.',
  'Make my workout playlist': 'Crear mi lista para entrenar', 'Play in Spotify': 'Escuchar en Spotify', 'Another playlist': 'Otra lista',
  '{n} songs · {n} min': '{n} canciones · {n} min', '{n} more · {n} new to you': '{n} más · {n} nuevas para ti', '{n} more': '{n} más',
  'Song of the day': 'Canción del día', Play: 'Escuchar', 'Song radio': 'Radio de la canción', 'Another song': 'Otra canción', 'Change genres': 'Cambiar géneros',
  Music: 'Música', Linked: 'Vinculado', Latin: 'Latino', 'Drum and bass': 'Drum and bass',
  'Genres you like to train to': 'Géneros con los que te gusta entrenar', 'Your playlists': 'Tus listas', 'Paste a Spotify playlist link': 'Pega un enlace de una lista de Spotify',
  Add: 'Añadir', Added: 'Añadida', Remove: 'Quitar', 'Paste a Spotify playlist, album or artist link.': 'Pega un enlace de Spotify a una lista, un álbum o un artista.',
  'That one is already in your list.': 'Esa ya está en tu lista.', 'Link Spotify for playlists made from your own songs': 'Vincula Spotify para listas hechas con tus canciones',
  'Pick the music you train to, or paste your Spotify playlists. Each workout gets a different one.': 'Elige la música con la que entrenas o pega tus listas de Spotify. Cada entrenamiento tendrá una distinta.',
  'For this workout': 'Para este entrenamiento', 'Workout playlists on Spotify': 'Listas para entrenar en Spotify', 'Open in Spotify': 'Abrir en Spotify',
  'Something else': 'Otra cosa', 'Change my music': 'Cambiar mi música', 'Link your Spotify account (advanced)': 'Vincular tu cuenta de Spotify (avanzado)',
  'For playlists made from your own songs. Spotify lets an app link only up to 5 accounts, chosen by its owner. Create a free app at developer.spotify.com (choose Web API, needs Premium), add this redirect URI, add your account under User Management, and paste the app\'s Client ID here.':
    'Para listas hechas con tus propias canciones. Spotify solo deja vincular hasta 5 cuentas a una app, elegidas por su dueño. Crea una app gratis en developer.spotify.com (elige Web API, necesita Premium), añade esta URI de redirección, añade tu cuenta en User Management y pega aquí el Client ID de la app.', 'Linked as': 'Vinculado como', 'Change Client ID': 'Cambiar Client ID',
  'Each workout gets its own playlist on Today › Train.': 'Cada entrenamiento tiene su propia lista en Hoy › Entrenar.',
  'To link Spotify, create a free app at developer.spotify.com (choose Web API), add this redirect URI, and paste the app\'s Client ID here.':
    'Para vincular Spotify, crea una app gratis en developer.spotify.com (elige Web API), añade esta URI de redirección y pega aquí el Client ID de la app.',
  'Add your Spotify Client ID first.': 'Primero añade tu Client ID de Spotify.', 'That does not look like a Client ID (32 letters and numbers).': 'Eso no parece un Client ID (32 letras y números).',
  'Spotify linked': 'Spotify vinculado', 'Spotify was not linked.': 'No se ha vinculado Spotify.', 'Link Spotify again.': 'Vuelve a vincular Spotify.',
  'Not enough energetic songs yet. Like a few more on Spotify and try again.': 'Aún no hay suficientes canciones con energía. Dale a "me gusta" a algunas más en Spotify y vuelve a probar.',
  'Spotify did not answer. Try again in a moment.': 'Spotify no responde. Vuelve a probar en un momento.',
  'Energetic songs you like, picked by FitQuest for your workout.': 'Canciones enérgicas que te gustan, elegidas por FitQuest para tu entrenamiento.',
});
