'use strict';
// Language support (English and Spanish).
// The app is written in English. When Spanish is selected, every piece of text that reaches the page is translated on the way in,
// using the dictionaries in es-ui.js, es-food.js and data/es-exercises.json. Text without a translation stays in English.

const LANGS = { en: 'English', es: 'Español' };
const LANG = (() => {
  try { const s = JSON.parse(localStorage.getItem('fc.lang')); if (LANGS[s]) return s; } catch { /* no saved choice */ }
  return /^es/i.test(navigator.language || '') ? 'es' : 'en';
})();
document.documentElement.lang = LANG;

const I18N = { words: Object.create(null), pats: [] };
const i18nAdd = obj => Object.assign(I18N.words, obj);            // exact English text -> Spanish text. {n} stands for a number.
const i18nPat = (re, fn) => I18N.pats.push([re, fn]);              // pattern -> function building the Spanish text

// Translates one string. Tries: exact match, the same with numbers factored out, patterns, then each " · " part on its own.
function tr(s, depth = 0) {
  if (LANG === 'en' || !s || depth > 4) return s;
  if (!/[A-Za-z]{2}/.test(s)) return s;
  // try the text as it is, then without a " · " left at either end (it belongs to the next piece of text)
  for (const re of [/^(\s*)([\s\S]*?)(\s*)$/, /^([\s·]*)([\s\S]*?)([\s·]*)$/]) {
    const m = s.match(re), core = m[2], hit = trCore(core, depth);
    if (hit !== core) return m[1] + singular(hit) + m[3];
  }
  return s;
}
// "1 ejercicios" -> "1 ejercicio"
const SING = { ejercicios: 'ejercicio', series: 'serie', veces: 'vez', días: 'día', minutos: 'minuto', monedas: 'moneda', selecciones: 'selección', apuestas: 'apuesta', horas: 'hora', semanas: 'semana', vasos: 'vaso', recetas: 'receta', comidas: 'comida', insignias: 'insignia', mazmorras: 'mazmorra', entrenamientos: 'entrenamiento', récords: 'récord', cofres: 'cofre', tiradas: 'tirada', noches: 'noche', repeticiones: 'repetición' };
const singular = t => t.replace(/(^|[^\d.,])1 (\p{L}+)/gu, (x, a, w) => SING[w] ? `${a}1 ${SING[w]}` : x);
function trCore(c, depth) {
  const W = I18N.words;
  if (W[c] !== undefined) return W[c];
  const nums = [], key = c.replace(/[+−-]?\d+(?:[.,]\d+)?/g, x => (nums.push(x), '{n}'));
  if (nums.length && W[key] !== undefined) { let i = 0; return W[key].replace(/\{n\}/g, () => nums[i++] ?? ''); }
  for (const [re, fn] of I18N.pats) { const mm = c.match(re); if (mm) return fn(...mm.slice(1)); }
  const pm = c.match(/^([^\p{L}\p{N}"']+)([\p{L}\p{N}][\s\S]*)$/u);   // leading emoji or symbol: translate the text after it
  if (pm) { const rest = trCore(pm[2], depth + 1); if (rest !== pm[2]) return pm[1] + rest; }
  for (const sep of [' · ', ' + ', ', ', ' and ', ': ']) {
    if (c.includes(sep)) { const parts = c.split(sep), out = parts.map(p => tr(p, depth + 1)); if (out.some((p, i) => p !== parts[i])) return out.join(sep === ' and ' ? ' y ' : sep); }
  }
  return c;
}
const T = (s, ...a) => { const t = tr(s); return a.length ? t.replace(/\{(\d)\}/g, (_, i) => a[i]) : t; };

// ---------- Money ----------
// Each interface has its own money: credits in the Sci-fi HUD, points in the arcade, yen in Japan...
// The app's text says "coins" ("monedas" in Spanish); the word is swapped for the current interface's money on the way to the page.
// English singular, plural, Spanish singular, plural.
const CUR = {
  hud: ['credit', 'credits', 'crédito', 'créditos'], chinese: ['yuan', 'yuan', 'yuan', 'yuanes'], japanese: ['yen', 'yen', 'yen', 'yenes'],
  fairy: ['acorn', 'acorns', 'bellota', 'bellotas'], medieval: ['crown', 'crowns', 'corona', 'coronas'], steampunk: ['cog', 'cogs', 'engranaje', 'engranajes'],
  greek: ['drachma', 'drachmas', 'dracma', 'dracmas'], egypt: ['scarab', 'scarabs', 'escarabajo', 'escarabajos'], viking: ['rune', 'runes', 'runa', 'runas'],
  pirate: ['doubloon', 'doubloons', 'doblón', 'doblones'], outrun: ['chip', 'chips', 'ficha', 'fichas'], arcade: ['point', 'points', 'punto', 'puntos'],
  classical: ['florin', 'florins', 'florín', 'florines'], artdeco: ['dollar', 'dollars', 'dólar', 'dólares'], gothic: ['soul', 'souls', 'alma', 'almas'],
  baroque: ['ducat', 'ducats', 'ducado', 'ducados'], mythical: ['gem', 'gems', 'gema', 'gemas'], cosmic: ['star', 'stars', 'estrella', 'estrellas'],
};
const CUR_M = new Set(['hud', 'chinese', 'japanese', 'steampunk', 'egypt', 'pirate', 'arcade', 'classical', 'artdeco', 'baroque'].map(k => CUR[k])); // masculine in Spanish
const curSet = () => CUR[document.documentElement.dataset.skin] || CUR.hud;
const capLike = (w, x) => w.length > 1 && w === w.toUpperCase() ? x.toUpperCase() : w[0] === w[0].toUpperCase() ? x[0].toUpperCase() + x.slice(1) : x;
// "Coins" -> "Credits", "1 moneda" -> "1 crédito"
function cur(s) {
  if (!s || !/coin|moneda/i.test(s)) return s;
  const c = curSet();
  if (CUR_M.has(c) && /moneda/i.test(s)) {   // Spanish words that agree with a masculine money: "las monedas" -> "los créditos"
    const M = { la: 'el', las: 'los', una: 'un', unas: 'unos' };
    s = s.replace(/\b([Ll]as?|[Uu]nas?) (monedas?)\b/g, (w, a, m) => `${capLike(a, M[a.toLowerCase()])} ${m}`)
      .replace(/\b(monedas?) apostada(s?)\b/g, '$1 apostado$2').replace(/Consíguelas/g, 'Consíguelos');
  }
  return s.replace(/\b(coin|moneda)(s?)\b/gi, (w, b, pl) => capLike(w, c[(/^m/i.test(b) ? 2 : 0) + (pl ? 1 : 0)]));
}

// ---------- DOM ----------
// Text reaching the page is translated (Spanish) and gets the interface's money name. The text as written is kept on the node
// so a change of interface can redo it.
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
function trAttr(el, a) {
  const v = el.getAttribute(a);
  if (!v) return;
  const m = el.__a || (el.__a = {});
  if (m[a] && m[a][1] === v) return;
  const t = cur(tr(v));
  m[a] = [v, t];
  if (t !== v) el.setAttribute(a, t);
}
function trText(n, again) {
  const v = n.nodeValue;
  if (!again && n.__out === v) return;
  if (!/[A-Za-z]{2}/.test(v) || n.parentElement?.closest('[translate="no"]')) return; // names such as song titles stay as they are
  const src = again ? n.__src : v, t = cur(tr(src));
  n.__src = src; n.__out = t;
  if (t !== v) n.nodeValue = t;
}
// after a change of interface: put the new money's name in the text already on the page
function curRefresh() {
  if (!document.body) return;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (n.__src !== undefined) trText(n, true);
  document.body.querySelectorAll(ATTRS.map(a => `[${a}]`).join(',')).forEach(el => ATTRS.forEach(a => {
    const o = el.__a?.[a];
    if (o && el.getAttribute(a) === o[1]) { const t = cur(tr(o[0])); o[1] = t; el.setAttribute(a, t); }
  }));
}
function trTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { trText(root); return; }
  if (root.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(root.tagName)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) trText(n);
  const els = [root, ...root.querySelectorAll(ATTRS.map(a => `[${a}]`).join(','))];
  els.forEach(el => ATTRS.forEach(a => { if (el.hasAttribute?.(a)) trAttr(el, a); }));
}
{
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'childList') m.addedNodes.forEach(trTree);
      else if (m.type === 'characterData') trText(m.target);
      else if (m.type === 'attributes') trAttr(m.target, m.attributeName);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener('DOMContentLoaded', () => trTree(document.body));
}

// Exercise names and instructions live in a separate file, loaded only for Spanish.
async function langReady() {
  if (LANG === 'en') return;
  try { const d = await (await fetch('data/es-exercises.json')).json(); i18nAdd(d.names); i18nAdd(d.text); } catch { /* offline first run: English fallback */ }
}
function setLang(l) {
  if (!LANGS[l] || l === LANG) return;
  try { localStorage.setItem('fc.lang', JSON.stringify(l)); } catch { /* storage blocked */ }
  location.reload();
}
const langChips = () => `<div class="chips">${Object.entries(LANGS).map(([k, v]) => `<button type="button" class="chip ${k === LANG ? 'on' : ''}" onclick="setLang('${k}')">${v}</button>`).join('')}</div>`;
const dateLocale = () => LANG === 'es' ? 'es-ES' : undefined;
