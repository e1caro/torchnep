'use strict';
// A photo of your meal, rated and explained by the coach: the photo goes to the Supabase function food-photo
// (tools/food-photo.ts), which asks Google's Gemini (free tier) and answers with the dish, calories, macros, a score
// from 1 to 10 for your goal and an explanation. Needs an account (5 photos a day). The photo is not kept anywhere;
// the answers are kept on this device. Adding one to "Today off the plan" works like the written food log (XP).

ICONS.camera = 'M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0';
ICONS.image = 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5a1 1 0 1 0 .01 0';
const FC = Object.assign({ ok: false, hist: [], left: null, leftDay: '' }, load('foodcam', {}));
const fcSave = () => save('foodcam', FC);
let FCS = { img: '', busy: false, res: null, err: '', note: '', added: false };
const FC_APP = /FitQuestApp\//.test(navigator.userAgent);

const fcCtx = () => {
  const h = new Date().getHours(), meal = h < 11 ? 'breakfast' : h < 13 ? 'mid-morning snack' : h < 17 ? 'lunch' : h < 20 ? 'afternoon snack' : 'dinner';
  let a = null; try { a = analyze({ ...S.profile, weight: curWeight() }); } catch { /* no profile yet */ }
  return { goal: S.profile?.goal || 'general', kcal: a?.kcal || 0, protein: a?.protein || 0, meal: LANG === 'es' ? { breakfast: 'desayuno', 'mid-morning snack': 'media mañana', lunch: 'comida', 'afternoon snack': 'merienda', dinner: 'cena' }[meal] : meal };
};
const fcScoreCls = s => (s >= 8 ? 's-hi' : s >= 6 ? 's-ok' : s >= 4 ? 's-mid' : 's-lo');
const fcTier = s => (s >= 9 ? 0 : s >= 7 ? 1 : s >= 5 ? 2 : s >= 3 ? 3 : 4);

// a phone photo is shrunk to 1024 px before it leaves the device
async function fcShrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', .82);
  } finally { URL.revokeObjectURL(url); }
}

window.fcPick = async inp => {
  const f = inp.files?.[0]; inp.value = '';
  if (!f) return;
  FCS = { img: '', busy: true, res: null, err: '', note: $('#fc-note')?.value.trim() || FCS.note, added: false };
  try { FCS.img = await fcShrink(f); } catch { FCS.busy = false; toast(tr('That picture could not be opened. Try another one.')); fcView(); return; }
  fcView();
  try {
    if (CL.exp && Date.now() > CL.exp - 60e3) await sbRefresh();
    const r = await fetch(`${SB_URL}/functions/v1/food-photo`, {
      method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${CL.at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: FCS.img.split(',')[1], lang: LANG, note: FCS.note, ctx: fcCtx() }),
    });
    let j = null; try { j = await r.json(); } catch { /* not JSON */ }
    if (r.ok && j) {
      FCS.res = { ...j, t: Date.now() };
      FC.left = j.left; FC.leftDay = dayId();
      FC.hist = [FCS.res, ...FC.hist].slice(0, 12); fcSave(); sfx('claim');
    } else if (r.status === 429) { FC.left = 0; FC.leftDay = dayId(); fcSave(); FCS.err = 'limit'; }
    else if (r.status === 401) FCS.err = 'auth';
    else if (r.status === 404 || j?.error === 'not_configured') FCS.err = 'off';
    else if (j?.error === 'busy') FCS.err = 'busy';
    else FCS.err = 'ai';
  } catch { FCS.err = 'net'; }
  FCS.busy = false;
  if (location.hash.startsWith('#/foodcam')) fcView();
};

// into "Today off the plan", with the same XP rules as the written food log
window.fcAdd = () => {
  const x = FCS.res; if (!x || FCS.added || !x.is_food) return;
  const tier = fcTier(x.score), day = flDay();
  const won = day.filter(e => e.xp > 0).reduce((a, e) => a + e.xp, 0), lost = day.filter(e => e.xp < 0).reduce((a, e) => a - e.xp, 0);
  const base = [20, 12, 0, -10, -20][tier];
  let xp = base > 0 ? Math.min(base, FL_CAP - won) : -Math.min(-base, FL_CAP - lost);
  if (xp < 0) xp = -Math.min(-xp, Math.max(0, G.xp - totalXp(lvl())));
  if (xp > 0) award(xp, 0); else if (xp < 0) G.xp += xp;
  day.unshift({ t: Date.now(), text: x.dish, xp, kcal: x.kcal, tier, photo: 1, items: x.items.map(i => [i.name, 2 - tier, i.kcal]) });
  FCS.added = true; commit(); sfx(xp >= 0 ? 'claim' : 'tick'); if (xp) toast(`${xp > 0 ? '+' : ''}${xp} XP`);
  flushLevelUp(); fcView();
};
window.fcAgain = () => { FCS = { img: '', busy: false, res: null, err: '', note: '', added: false }; fcView(); scrollTo(0, 0); };
window.fcOpen = t => { const x = FC.hist.find(h => h.t === t); if (!x) return; FCS = { img: '', busy: false, res: x, err: '', note: '', added: true }; fcView(); scrollTo(0, 0); };
window.fcConsent = () => { FC.ok = true; fcSave(); fcView(); };
window.fcReport = () => {
  const x = FCS.res; if (!x) return;
  const R = [['wrong', 'It got the food wrong'], ['kcal', 'The calories are way off'], ['bad', 'Offensive or inappropriate'], ['other', 'Something else']];
  modal(`<h2>Report this answer</h2><div class="mut">Tell us what's wrong so we can improve it. The photo is not sent.</div>
    <div class="fcreasons">${R.map(([k, n]) => `<button class="btn ghost" data-r="${k}">${n}</button>`).join('')}</div><button class="btn ghost" data-close>Cancel</button>`);
  document.querySelectorAll('.fcreasons [data-r]').forEach(b => { b.onclick = async () => {
    $('#modal').hidden = true;
    try { await sbFetch('/rest/v1/food_reports', { method: 'POST', body: JSON.stringify({ dish: x.dish.slice(0, 120), answer: `${x.verdict}\n\n${x.explanation}`.slice(0, 3000), reason: b.dataset.r }) }); toast(tr('Thanks, we will look at it.')); }
    catch { toast(tr('Could not send it. Try again later.')); }
  }; });
};

function fcResult(x) {
  if (!x.is_food) return `<section class="card fcres"><div class="fcverdict" translate="no">${esc(x.verdict || x.dish)}</div><div class="mut">That doesn't look like food. Try a photo of your plate from above.</div></section>`;
  const paras = String(x.explanation).split(/\n\s*\n/).map(p => `<p translate="no">${esc(p.trim())}</p>`).join('');
  return `<section class="card fcres">
    <div class="row fchead">${FCS.img ? `<img class="fcimg" src="${FCS.img}" alt="">` : ''}<div class="grow"><small class="mut">Coach's rating</small><h2 translate="no">${esc(x.dish)}</h2></div>
      <div class="fcscore ${fcScoreCls(x.score)}"><b>${x.score}</b><span>/10</span></div></div>
    <div class="fcverdict" translate="no">${esc(x.verdict)}</div>
    <div class="fcmac"><span><b>${fmtK(x.kcal)}</b> kcal</span><span><b>${x.protein}</b> g ${tr('protein')}</span><span><b>${x.carbs}</b> g ${tr('carbs')}</span><span><b>${x.fat}</b> g ${tr('fat')}</span></div>
    <div class="fctext">${paras}</div>
    ${x.good.length ? `<div class="lbl">What's good</div><ul class="fclist good" translate="no">${x.good.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
    ${x.improve.length ? `<div class="lbl">What I'd change</div><ul class="fclist imp" translate="no">${x.improve.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
    ${x.items.length ? `<details class="fcitems"><summary>What I see, piece by piece</summary>${x.items.map(i => `<div class="row between"><span translate="no">${esc(i.name)}</span><span class="mut">${i.grams ? `${i.grams} g · ` : ''}${i.kcal} kcal</span></div>`).join('')}</details>` : ''}
    ${x.confidence === 'low' ? '<div class="mut fcwarn">The photo leaves some doubts: take these numbers as a rough guide.</div>' : ''}
    ${FCS.added ? '' : `<button class="btn gold" onclick="fcAdd()">${ic('plus', 18)} Add to what I ate today</button>`}
    <div class="row fcact"><button class="btn ghost" onclick="fcAgain()">${ic('camera', 18)} Another photo</button><button class="btn ghost" onclick="fcReport()">⚑ Report</button></div>
    <div class="mut fcfoot">An estimate made by AI from a photo: it can be wrong, and it isn't medical advice.</div></section>`;
}

const FC_ERR = {
  limit: 'You have used today\'s 5 photos. Tomorrow you get 5 more.', auth: 'Your session has expired. Sign in again in Account.',
  off: 'Photo rating is not switched on yet.', busy: 'The coach is very busy right now (free plan). Try again in a few minutes.',
  ai: 'The coach could not rate this photo. Try again with the whole plate in view and good light.', net: 'No connection. Check your internet and try again.',
};
function fcView() {
  if (needProfile()) return;
  const left = FC.leftDay === dayId() ? FC.left : null;
  const pickers = `<div class="fcpick"><label class="btn">${ic('camera', 20)} Take a photo<input type="file" accept="image/*" capture="environment" onchange="fcPick(this)" hidden></label>
    <label class="btn ghost">${ic('image', 20)} From the gallery<input type="file" accept="image/*" onchange="fcPick(this)" hidden></label></div>`;
  let body;
  if (typeof SB_ON === 'undefined' || !SB_ON || !CL.uid) body = `<section class="card"><b>You need an account</b><div class="mut">The coach looks at your photo on our server, so it needs a free account.</div><button class="btn" onclick="location.hash='#/account'">${ic('user', 18)} Sign in or create an account</button></section>`;
  else if (FC_APP && APP_SHELL < 6) body = `<section class="card"><b>Update the app</b><div class="mut">To use the camera, install the new version of FitQuest: tap the bar at the bottom, or Settings › App.</div></section>`;
  else if (!FC.ok) body = `<section class="card fcconsent"><b>Before you start</b><ul class="how"><li>Your photo goes to Google's Gemini AI to be rated. FitQuest doesn't keep it, only the answer stays on this phone.</li><li>On Google's free plan, Google may use what it receives to improve its services: don't include people's faces or personal details in the photo.</li><li>You can rate 5 photos a day.</li></ul><button class="btn" onclick="fcConsent()">Got it</button></section>`;
  else if (FCS.busy) body = `<section class="card fcbusy">${FCS.img ? `<img class="fcbig" src="${FCS.img}" alt="">` : ''}<div class="fcscan"></div><b>The coach is looking at your plate…</b><div class="mut">It takes a few seconds.</div></section>`;
  else if (FCS.res) body = fcResult(FCS.res);
  else body = `${FCS.err ? `<section class="card fcerr">${FCS.img ? `<img class="fcimg" src="${FCS.img}" alt="">` : ''}<div>${tr(FC_ERR[FCS.err])}</div></section>` : ''}
    <section class="card fcstart"><b>Take a photo of your plate</b><div class="mut">From above, with the whole plate in view and good light. The coach tells you what it sees, the calories, a score for your goal and what it would change.</div>
    <label class="fld"><span>Anything it should know? (optional)</span><div class="inp"><input id="fc-note" maxlength="140" placeholder="${esc(tr('e.g. dinner, the sauce is yogurt'))}" value="${esc(FCS.note)}"></div></label>
    ${left === 0 ? `<div class="mut">${tr(FC_ERR.limit)}</div>` : pickers}${left > 0 ? `<div class="mut fcleft">${T('{0} photos left today', left)}</div>` : ''}</section>`;
  view.innerHTML = `<button class="btn sm ghost back" onclick="location.hash='#/home'">${ic('back', 18)} Back</button><h1>Photo of your meal</h1>
    ${body}
    ${FC.hist.length && !FCS.busy ? `<div class="lbl">Your latest ratings</div>${FC.hist.map(h => `<button class="card row li fchist" onclick="fcOpen(${h.t})"><span class="fcscore sm ${fcScoreCls(h.score)}"><b>${h.score}</b></span><span class="grow"><b translate="no">${esc(h.dish)}</b><span class="mut">${fmtK(h.kcal)} kcal · ${new Date(h.t).toLocaleDateString(LANG === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' })}</span></span></button>`).join('')}` : ''}`;
}
routes.foodcam = fcView;

// ways in: the "Ate something off the plan?" card and the Meals screen
const fcBtn = () => `<button class="btn fcbtn" onclick="location.hash='#/foodcam'">${ic('camera', 20)} Rate a photo of my meal</button>`;
const _fcCard = foodCard;
foodCard = function () { return _fcCard().replace('</h3>', `</h3>${fcBtn()}`); };
const _fcMeals = mealsView;
mealsView = function (arg) { _fcMeals(arg); if (!arg) view.querySelector('h1')?.insertAdjacentHTML('afterend', fcBtn()); };
if (MEALS_ON) routes.meals = mealsView;

if (typeof i18nAdd === 'function') i18nAdd({
  'Photo of your meal': 'Foto de tu comida', 'Rate a photo of my meal': 'Valorar una foto de mi comida', 'Take a photo': 'Hacer una foto', 'From the gallery': 'De la galería',
  'Take a photo of your plate': 'Haz una foto a tu plato',
  'From above, with the whole plate in view and good light. The coach tells you what it sees, the calories, a score for your goal and what it would change.':
    'Desde arriba, con todo el plato a la vista y buena luz. El entrenador te dice qué ve, las calorías, una nota según tu objetivo y qué cambiaría.',
  'Anything it should know? (optional)': '¿Algo que deba saber? (opcional)', 'e.g. dinner, the sauce is yogurt': 'p. ej. cena, la salsa es de yogur',
  '{0} photos left today': 'Te quedan {0} fotos hoy', 'The coach is looking at your plate…': 'El entrenador está mirando tu plato…', 'It takes a few seconds.': 'Tarda unos segundos.',
  "Coach's rating": 'Valoración del entrenador', protein: 'proteína', carbs: 'hidratos', fat: 'grasa', "What's good": 'Lo bueno', "What I'd change": 'Lo que cambiaría',
  'What I see, piece by piece': 'Lo que veo, pieza a pieza', 'The photo leaves some doubts: take these numbers as a rough guide.': 'La foto deja algunas dudas: toma estas cifras como orientativas.',
  'Add to what I ate today': 'Añadir a lo que he comido hoy', 'Another photo': 'Otra foto', '⚑ Report': '⚑ Reportar',
  "An estimate made by AI from a photo: it can be wrong, and it isn't medical advice.": 'Estimación hecha por IA a partir de una foto: puede equivocarse y no es un consejo médico.',
  "That doesn't look like food. Try a photo of your plate from above.": 'Eso no parece comida. Prueba con una foto de tu plato desde arriba.',
  'You need an account': 'Necesitas una cuenta', 'The coach looks at your photo on our server, so it needs a free account.': 'El entrenador mira tu foto en nuestro servidor, así que hace falta una cuenta gratuita.',
  'Sign in or create an account': 'Entrar o crear una cuenta', 'Update the app': 'Actualiza la app',
  'To use the camera, install the new version of FitQuest: tap the bar at the bottom, or Settings › App.': 'Para usar la cámara, instala la versión nueva de FitQuest: toca la barra de abajo o Ajustes › App.',
  'Before you start': 'Antes de empezar', 'Got it': 'Entendido', 'You can rate 5 photos a day.': 'Puedes valorar 5 fotos al día.',
  "Your photo goes to Google's Gemini AI to be rated. FitQuest doesn't keep it, only the answer stays on this phone.": 'Tu foto se envía a la IA Gemini de Google para valorarla. FitQuest no la guarda; solo la respuesta se queda en este móvil.',
  "On Google's free plan, Google may use what it receives to improve its services: don't include people's faces or personal details in the photo.": 'En el plan gratuito, Google puede usar lo que recibe para mejorar sus servicios: no saques caras ni datos personales en la foto.',
  "You have used today's 5 photos. Tomorrow you get 5 more.": 'Ya has usado las 5 fotos de hoy. Mañana tendrás 5 más.', 'Your session has expired. Sign in again in Account.': 'Tu sesión ha caducado. Vuelve a entrar en Cuenta.',
  'Photo rating is not switched on yet.': 'La valoración de fotos aún no está activada.', 'The coach is very busy right now (free plan). Try again in a few minutes.': 'El entrenador está muy ocupado ahora mismo (plan gratuito). Prueba de nuevo en unos minutos.',
  'The coach could not rate this photo. Try again with the whole plate in view and good light.': 'El entrenador no ha podido valorar esta foto. Prueba otra vez con todo el plato a la vista y buena luz.',
  'No connection. Check your internet and try again.': 'Sin conexión. Revisa internet y vuelve a probar.', 'That picture could not be opened. Try another one.': 'No se ha podido abrir esa imagen. Prueba con otra.',
  'Your latest ratings': 'Tus últimas valoraciones', 'Report this answer': 'Reportar esta respuesta', "Tell us what's wrong so we can improve it. The photo is not sent.": 'Dinos qué está mal para mejorarlo. La foto no se envía.',
  'It got the food wrong': 'Se ha equivocado de comida', 'The calories are way off': 'Las calorías no cuadran', 'Offensive or inappropriate': 'Ofensiva o inapropiada', 'Something else': 'Otra cosa',
  Cancel: 'Cancelar', 'Thanks, we will look at it.': 'Gracias, lo revisaremos.', 'Could not send it. Try again later.': 'No se ha podido enviar. Prueba más tarde.',
});
