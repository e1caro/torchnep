'use strict';
// The week on one picture, sized for an Instagram story (1080 × 1920): drawn on a canvas in the colours and fonts of
// your interface. It closes the weekly summary and opens from Progress. "Share" downloads it (in the Android app it is
// saved to the gallery, Pictures/FitQuest); "Send to…" opens the phone's share sheet.

const WC_W = 1080, WC_H = 1920;
const WC_GROUP = slug => Object.keys(MG).find(g => MG[g].includes(SLUG_MUS[slug]));

function wcTheme() {
  const probe = document.createElement('i'); document.body.append(probe);
  const get = (v, d) => { probe.style.color = d; probe.style.color = `var(${v}, ${d})`; return getComputedStyle(probe).color; };
  const c = { acc: get('--acc', '#7c9cff'), acc2: get('--acc2', '#b06bff'), bg: get('--bg', '#0e1014'), card: get('--card', '#171a21'), fg: get('--fg', '#eceef3'), mut: get('--mut', '#8a90a0') };
  probe.remove();
  for (const k in c) c[k] = `rgb(${wcRgb(c[k]).join(',')})`;
  const cs = getComputedStyle(document.documentElement);
  c.disp = cs.getPropertyValue('--disp').trim() || 'sans-serif'; c.body = cs.getPropertyValue('--body').trim() || 'sans-serif';
  return c;
}
// any CSS colour (color-mix and oklab included) as r, g, b, read back from a one-pixel canvas
const WC_PX = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const wcRgb = c => { WC_PX.clearRect(0, 0, 1, 1); WC_PX.fillStyle = '#000'; WC_PX.fillStyle = c; WC_PX.fillRect(0, 0, 1, 1); return [...WC_PX.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
const wcA = (c, a) => `rgba(${wcRgb(c).join(',')},${a})`;
const wcImg = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

// a game icon in one colour
async function wcIcon(name, color, size) {
  const img = await wcImg(`icons/gi/${name}.svg`);
  const c = document.createElement('canvas'); c.width = c.height = size;
  if (!img) return c;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, size, size); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, size, size);
  return c;
}
// the body, front or back, with each muscle group lit by how many sets it got
function wcBody(side, w, th) {
  if (typeof BODY !== 'object' || !BODY) return null;
  const g = bodyGender(), max = Math.max(1, ...Object.values(w.mus));
  const fill = slug => {
    if (SKIN_PARTS.has(slug)) return wcA(th.fg, .16);
    const grp = WC_GROUP(slug), v = grp ? w.mus[grp] / max : 0;
    return v > 0 ? wcA(th.acc, .35 + .65 * v) : wcA(th.fg, .1);
  };
  const [, , vw, vh] = BODY.view[g][side].split(' ').map(Number);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}" viewBox="${BODY.view[g][side]}">${BODY[g][side].map(([slug, ps]) => ps.map(d => `<path d="${d}" fill="${fill(slug)}" stroke="${wcA(th.bg, .55)}" stroke-width="1.2"/>`).join('')).join('')}</svg>`;
  return wcImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
}

async function weekCard(w, prev, goal) {
  const th = wcTheme(), es = LANG === 'es';
  try { await Promise.all([document.fonts.load(`800 120px ${th.disp}`), document.fonts.load(`700 40px ${th.body}`), document.fonts.load(`400 30px ${th.body}`)]); } catch { /* system fonts */ }
  const cv = document.createElement('canvas'); cv.width = WC_W; cv.height = WC_H;
  const x = cv.getContext('2d');
  const font = (wt, px, fam = th.body) => { x.font = `${wt} ${px}px ${fam}`; };
  const fit = (t, wt, px, maxW, fam) => { font(wt, px, fam); while (x.measureText(t).width > maxW && px > 20) { px -= 2; font(wt, px, fam); } return px; };
  const spaced = sp => { x.letterSpacing = `${sp}px`; return () => { x.letterSpacing = '0px'; }; };
  const grad = (x0, y0, x1, y1) => { const gr = x.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, th.acc); gr.addColorStop(1, th.acc2); return gr; };
  const glass = (gx, gy, gw, gh, r = 44) => {
    x.save(); x.beginPath(); x.roundRect(gx, gy, gw, gh, r);
    x.fillStyle = wcA(th.card, .62); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 40; x.shadowOffsetY = 16; x.fill();
    x.shadowColor = 'transparent';
    const st = x.createLinearGradient(gx, gy, gx + gw, gy + gh); st.addColorStop(0, wcA(th.acc, .7)); st.addColorStop(.5, wcA(th.fg, .08)); st.addColorStop(1, wcA(th.acc2, .5));
    x.lineWidth = 2.5; x.strokeStyle = st; x.stroke(); x.restore();
  };

  // background: the interface colour, three glowing blobs and a fine diagonal grain
  x.fillStyle = th.bg; x.fillRect(0, 0, WC_W, WC_H);
  [[170, 330, 640, th.acc, .5], [960, 960, 700, th.acc2, .38], [260, 1700, 620, th.acc, .32]].forEach(([bx, by, r, col, a]) => {
    const rg = x.createRadialGradient(bx, by, 0, bx, by, r); rg.addColorStop(0, wcA(col, a)); rg.addColorStop(1, wcA(col, 0)); x.fillStyle = rg; x.fillRect(0, 0, WC_W, WC_H);
  });
  x.save(); x.strokeStyle = wcA(th.fg, .035); x.lineWidth = 2;
  for (let i = -WC_H; i < WC_W; i += 46) { x.beginPath(); x.moveTo(i, WC_H); x.lineTo(i + WC_H, 0); x.stroke(); }
  x.restore();
  const vg = x.createRadialGradient(WC_W / 2, WC_H / 2, WC_H * .3, WC_W / 2, WC_H / 2, WC_H * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = vg; x.fillRect(0, 0, WC_W, WC_H);

  // the dates (drawn next to the player)
  const range = `${new Date(w.ws).toLocaleDateString(LANG, { day: 'numeric', month: 'short' })} – ${new Date(w.ws + 6 * 864e5).toLocaleDateString(LANG, { day: 'numeric', month: 'short' })}`;
  let un;

  // the title, in the interface's display font
  const title = es ? 'MI SEMANA' : 'MY WEEK';
  const tpx = fit(title, 800, 150, WC_W - 144, th.disp);
  x.save(); x.shadowColor = wcA(th.acc, .7); x.shadowBlur = 50; x.fillStyle = grad(72, 0, WC_W - 72, 0); x.fillText(title, 72, 196 + tpx * .78); x.restore();

  // the player
  const ay = 400;
  x.save(); x.beginPath(); x.arc(118, ay, 50, 0, Math.PI * 2); x.fillStyle = wcA(th.card, .9); x.fill(); x.lineWidth = 6; x.strokeStyle = grad(68, ay - 50, 168, ay + 50); x.shadowColor = th.acc; x.shadowBlur = 24; x.stroke(); x.restore();
  x.drawImage(await wcIcon(G.avatar, th.fg, 64), 86, ay - 32, 64, 64);
  x.fillStyle = th.fg; fit(S.profile?.name || 'FitQuest', 700, 44, 420); x.fillText(S.profile?.name || 'FitQuest', 194, ay - 4);
  x.fillStyle = th.mut; font(400, 28); x.fillText(`${es ? 'Nivel' : 'Level'} ${lvl()} · ${title_()}`, 194, ay + 38);
  font(700, 28); const rw = x.measureText(range).width + 48;
  x.beginPath(); x.roundRect(WC_W - 60 - rw, ay - 28, rw, 56, 28); x.fillStyle = wcA(th.fg, .1); x.fill(); x.strokeStyle = wcA(th.fg, .2); x.lineWidth = 2; x.stroke();
  x.fillStyle = th.fg; x.textAlign = 'center'; x.fillText(range, WC_W - 60 - rw / 2, ay + 10); x.textAlign = 'left';

  // hero: the grade in a ring that fills with the week's workouts, the count, and the days
  glass(60, 470, 960, 480);
  const cx = 250, cy = 650, R = 118, pr = Math.min(1, w.n / Math.max(1, goal)), gr = grade(w, goal, prev), gold = gr === 'S';
  x.lineCap = 'round'; x.lineWidth = 26;
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.strokeStyle = wcA(th.fg, .1); x.stroke();
  if (pr > 0) { x.save(); x.shadowColor = th.acc; x.shadowBlur = 30; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pr); x.strokeStyle = gold ? '#ffd34d' : grad(cx - R, cy - R, cx + R, cy + R); x.stroke(); x.restore(); }
  x.save(); x.textAlign = 'center'; x.fillStyle = gold ? '#ffd34d' : th.fg; x.shadowColor = gold ? 'rgba(255,211,77,.8)' : wcA(th.acc, .6); x.shadowBlur = 36;
  font(800, gr.length > 1 ? 92 : 120, th.disp); x.fillText(gr, cx, cy + (gr.length > 1 ? 32 : 42)); x.restore();
  x.fillStyle = th.fg; font(800, 190, th.disp); x.fillText(String(w.n), 430, 690);
  const nw = x.measureText(String(w.n)).width;
  x.fillStyle = th.mut; font(700, 70, th.disp); x.fillText(`/${goal}`, 440 + nw, 690);
  x.fillStyle = th.fg; font(700, 30); un = spaced(4); x.fillText(es ? 'ENTRENAMIENTOS' : 'WORKOUTS', 436, 742); un();
  if (prev.n) {
    const up = w.n >= prev.n, dn = Math.abs(w.n - prev.n);
    x.fillStyle = up ? '#3ecf8e' : '#f06a5d'; font(700, 28);
    x.fillText(`${up ? '▲' : '▼'} ${dn === 0 ? (es ? 'igual que la semana pasada' : 'same as last week') : es ? `${dn} ${up ? 'más' : 'menos'} que la semana pasada` : `${dn} ${up ? 'more' : 'fewer'} than last week`}`, 436, 790);
  }
  const wd = [...Array(7)].map((_, i) => new Date(w.ws + i * 864e5).toLocaleDateString(LANG, { weekday: 'narrow' }).toUpperCase());
  w.days.forEach((on, i) => {
    const dx = 132 + i * 136, dy = 874;
    x.beginPath(); x.arc(dx, dy, 36, 0, Math.PI * 2);
    if (on) { x.save(); x.fillStyle = grad(dx - 36, dy - 36, dx + 36, dy + 36); x.shadowColor = th.acc; x.shadowBlur = 22; x.fill(); x.restore();
      x.strokeStyle = th.bg; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(dx - 14, dy + 1); x.lineTo(dx - 3, dy + 12); x.lineTo(dx + 16, dy - 11); x.stroke(); }
    else { x.fillStyle = wcA(th.fg, .07); x.fill(); x.strokeStyle = wcA(th.fg, .18); x.lineWidth = 2; x.stroke(); x.fillStyle = th.mut; font(700, 26); x.textAlign = 'center'; x.fillText(wd[i], dx, dy + 9); x.textAlign = 'left'; }
  });

  // three numbers
  const tiles = [[fmtN(w.min), es ? 'minutos' : 'minutes'], [fmtN(w.kg), es ? 'kg levantados' : 'kg lifted'], [fmtN(w.xp ?? 0), es ? 'XP ganada' : 'XP earned']];
  tiles.forEach(([v, l], i) => {
    const tx = 60 + i * 328, ty = 980; glass(tx, ty, 304, 190, 36);
    x.textAlign = 'center'; x.fillStyle = th.fg; x.save(); x.shadowColor = wcA(th.acc, .5); x.shadowBlur = 20; fit(v, 800, 66, 260, th.disp); x.fillText(v, tx + 152, ty + 100); x.restore();
    x.fillStyle = th.mut; font(400, 27); x.fillText(l, tx + 152, ty + 148); x.textAlign = 'left';
  });

  // muscles: the body lit up, and the most trained groups
  glass(60, 1200, 960, 400);
  const [front, back] = await Promise.all([wcBody('front', w, th), wcBody('back', w, th)]);
  [[front, 86], [back, 262]].forEach(([im, bx]) => { if (!im) return; const h = 340, wd2 = h * im.width / im.height, s = Math.min(1, 170 / wd2); x.drawImage(im, bx + (170 - wd2 * s) / 2, 1230 + (h - h * s) / 2, wd2 * s, h * s); });
  x.fillStyle = th.mut; font(700, 24); un = spaced(5); x.fillText(es ? 'MÚSCULOS' : 'MUSCLES', 480, 1260); un();
  const top = Object.entries(w.mus).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4), mx = Math.max(1, ...top.map(t => t[1]));
  if (!top.length) { x.fillStyle = th.fg; font(400, 30); x.fillText(es ? 'Sin series esta semana' : 'No sets this week', 480, 1320); }
  top.forEach(([g, v], i) => {
    const ry = 1320 + i * 74;
    x.fillStyle = th.fg; font(700, 32); x.fillText(musName(g), 480, ry);
    x.fillStyle = th.mut; font(400, 26); x.textAlign = 'right'; x.fillText(`${v} ${es ? 'series' : 'sets'}`, 980, ry); x.textAlign = 'left';
    x.beginPath(); x.roundRect(480, ry + 14, 500, 14, 7); x.fillStyle = wcA(th.fg, .1); x.fill();
    x.save(); x.beginPath(); x.roundRect(480, ry + 14, Math.max(14, 500 * v / mx), 14, 7); x.fillStyle = grad(480, 0, 980, 0); x.shadowColor = th.acc; x.shadowBlur = 14; x.fill(); x.restore();
  });

  // the highlight: what the week's kilos weigh like, or the best record
  const thing = typeof liftedThing === 'function' ? liftedThing(w.kg, document.documentElement.dataset.skin || 'clean') : null, pr0 = w.prs[0];
  const hl = thing ? [thing.emo, es ? `Como levantar ${thing.name}` : `Like lifting ${thing.name}`, es ? `${fmtN(w.kg)} kg en total esta semana` : `${fmtN(w.kg)} kg in total this week`]
    : pr0 ? ['🏆', `${BY[pr0.id]?.n || ''}: ${pr0.w} kg`, es ? 'nuevo récord' : 'new record'] : ['🔥', es ? 'Cada semana cuenta' : 'Every week counts', es ? 'La próxima, a por todas' : 'Next week, go all in'];
  glass(60, 1630, 960, 132, 66);
  font(400, 66, 'sans-serif'); x.fillText(hl[0], 94, 1720);
  x.fillStyle = th.fg; fit(hl[1], 700, 36, 800); x.fillText(hl[1], 190, 1688);
  x.fillStyle = th.mut; font(400, 26); x.fillText(hl[2], 190, 1730);

  // the app's logo and name, small, at the bottom
  const logo = await wcImg('icons/icon-192.png');
  font(800, 30, th.disp); un = spaced(4); const lw = x.measureText('FITQUEST').width, bw = 48 + 14 + lw, bx = (WC_W - bw) / 2;
  x.globalAlpha = .9;
  if (logo) { x.save(); x.beginPath(); x.roundRect(bx, 1812, 48, 48, 12); x.clip(); x.drawImage(logo, bx, 1812, 48, 48); x.restore(); }
  x.fillStyle = th.fg; x.fillText('FITQUEST', bx + 62, 1847); un(); x.globalAlpha = 1;
  return cv;
}
const title_ = () => (typeof title === 'function' ? tr(title()) : '');

// ---------- download and send ----------
const WC_NATIVE = typeof window.FitQuestNative === 'object' && typeof window.FitQuestNative.saveImage === 'function';
const WC_APP = /FitQuestApp\//.test(navigator.userAgent);
let WC = null; // { blob, b64, name }
async function wcMake(which) {
  const ws = weekStart() - (which === 'last' ? WEEK : 0), w = weekStats(ws), prev = weekStats(ws - WEEK), goal = S.profile?.days || 3;
  const cv = await weekCard(w, prev, goal);
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
  const name = `fitquest-${LANG === 'es' ? 'semana' : 'week'}-${new Date(ws).toISOString().slice(0, 10)}.png`;
  WC = { blob, name, url: URL.createObjectURL(blob), b64: cv.toDataURL('image/png').split(',')[1] };
  return WC;
}
window.wcShare = e => {
  e?.stopPropagation();
  if (!WC) return;
  if (WC_NATIVE) {
    const r = FitQuestNative.saveImage(WC.b64, WC.name);
    toast(tr(r === 'ok' ? 'Saved to your gallery (Pictures › FitQuest). Post it to your story!' : r === 'shared' ? 'Choose where to save or share it.' : 'Could not save the picture.'));
  } else if (WC_APP) toast(tr('Update the app to download the picture (or take a screenshot).'));
  else { const a = document.createElement('a'); a.href = WC.url; a.download = WC.name; document.body.append(a); a.click(); a.remove(); toast(tr('Picture downloaded. Post it to your story!')); }
  sfx('claim');
};
window.wcSend = async e => {
  e?.stopPropagation();
  if (!WC) return;
  if (WC_NATIVE) { FitQuestNative.shareImage(WC.b64, WC.name); return; }
  const file = new File([WC.blob], WC.name, { type: 'image/png' });
  try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'FitQuest' }); else wcShare(); } catch { /* cancelled */ }
};
const wcButtons = () => `<button class="btn" onclick="wcShare(event)">${ic('down', 18)} Share</button>${WC_NATIVE || (!WC_APP && navigator.share) ? '<button class="btn ghost sm" onclick="wcSend(event)">Send to another app</button>' : ''}`;
// fills an <img> with the picture
async function wcShow(img, which) {
  img.classList.add('wcwait');
  try { await wcMake(which); img.src = WC.url; } catch { img.alt = tr('Could not draw the picture.'); }
  img.classList.remove('wcwait');
}
// from Progress
window.wcOpen = which => {
  modal(`<h2>Your week in one picture</h2><img class="wcimg" alt=""><div class="mut">Ready for your Instagram story.</div><div class="wcbtns">${wcButtons()}<button class="btn ghost" data-close>Close</button></div>`);
  wcShow($('#modal .wcimg'), which);
};

if (typeof i18nAdd === 'function') i18nAdd({
  'Your week in one picture': 'Tu semana en una imagen', 'See it in one picture': 'Verla en una imagen', 'Ready for your Instagram story.': 'Lista para tu historia de Instagram.', Share: 'Compartir',
  'Send to another app': 'Enviar a otra app', 'Share my week': 'Compartir mi semana', Close: 'Cerrar',
  'Saved to your gallery (Pictures › FitQuest). Post it to your story!': 'Guardada en tu galería (Imágenes › FitQuest). ¡Súbela a tu historia!',
  'Choose where to save or share it.': 'Elige dónde guardarla o compartirla.', 'Could not save the picture.': 'No se ha podido guardar la imagen.',
  'Update the app to download the picture (or take a screenshot).': 'Actualiza la app para descargar la imagen (o haz una captura).',
  'Picture downloaded. Post it to your story!': 'Imagen descargada. ¡Súbela a tu historia!', 'Could not draw the picture.': 'No se ha podido crear la imagen.',
});
