/* Writes the drawings of tools/packs/ that are made from a shared pose and a palette (ladybird, owl, frog, the
 * gems, sweets and sea sets, and Pua's newer hats):   node tools/draw-packs.js && node tools/build-packs.js
 * The bee and the caterpillar were drawn separately (helper-bee.json, helper-caterpillar.json). */
'use strict';
const fs = require('fs');
const path = require('path');
const out = (name, data) => fs.writeFileSync(path.join(__dirname, 'packs', name + '.json'), JSON.stringify(data, null, 1) + '\n');
const INK = '#3B2A4A';
const c = (x, y, r, f, more) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${more || ''}/>`;
const el = (x, y, rx, ry, f, more) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"${more || ''}/>`;
const p = (d, f, more) => `<path d="${d}" fill="${f}"${more || ''}/>`;
const line = (d, col, w) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const eye = (x, y, r) => c(x, y, r, INK) + c(x + r * 0.3, y - r * 0.35, r * 0.35, '#fff');
const blush = (x, y, r) => c(x, y, r, '#FF8FA8', ' opacity=".55"');

/* ---------- ladybird: seen from above, walking right ---------- */
function ladybird(shell, spot, kind) {
  const spots = [[17, 25], [30, 22], [41, 27], [17, 43], [30, 46], [41, 41]].map(([x, y]) =>
    kind === 'star' ? p(`M${x} ${y - 4.2}L${x + 1.3} ${y - 1.3}L${x + 4.2} ${y}L${x + 1.3} ${y + 1.3}L${x} ${y + 4.2}L${x - 1.3} ${y + 1.3}L${x - 4.2} ${y}L${x - 1.3} ${y - 1.3}Z`, spot)
    : kind === 'moon' ? (x === 30 ? p(`M${x} ${y - 3.6}L${x + 1} ${y - 1}L${x + 3.6} ${y}L${x + 1} ${y + 1}L${x} ${y + 3.6}L${x - 1} ${y + 1}L${x - 3.6} ${y}L${x - 1} ${y - 1}Z`, spot) : p(`M${x + 2} ${y - 4}A4.4 4.4 0 1 0 ${x + 2} ${y + 4}A3.4 3.4 0 1 1 ${x + 2} ${y - 4}Z`, spot))
    : kind === 'heart' ? p(`M${x} ${y + 3.8}L${x - 3.8} ${y - 0.4}Q${x - 4} ${y - 3.6} ${x - 1.6} ${y - 3.2}Q${x} ${y - 3} ${x} ${y - 1.4}Q${x} ${y - 3} ${x + 1.6} ${y - 3.2}Q${x + 4} ${y - 3.6} ${x + 3.8} ${y - 0.4}Z`, spot)
    : c(x, y, 3.4, spot)).join('');
  const leg = (x, up) => `<g class="hl">${line(`M${x} ${up ? 18 : 50}L${x + 3} ${up ? 9 : 59}`, INK, 2.6)}</g>`;
  return leg(16, true) + leg(28, true) + leg(40, true) + leg(16) + leg(28) + leg(40) +
    line('M52 27Q57 20 61 21M52 41Q57 48 61 47', INK, 2) + c(61, 21, 1.8, INK) + c(61, 47, 1.8, INK) +
    c(49, 34, 11, INK) +
    `<g class="he">${c(54, 29.5, 3.3, '#fff')}${c(54, 38.5, 3.3, '#fff')}${c(55, 29.5, 1.6, INK)}${c(55, 38.5, 1.6, INK)}</g>` +
    el(27, 34, 23, 20.5, shell) + el(21, 24, 9, 5, '#fff', ' opacity=".22"') + line('M5 34L49 34', INK, 1.8) + spots;
}
out('helper-ladybird', { kind: 'ladybird', skins: [
  { id: 'classic', name: 'Red ladybird', es: 'Mariquita roja', svg: ladybird('#E2574C', INK, 'dot') },
  { id: 'golden', name: 'Golden ladybird', es: 'Mariquita dorada', svg: ladybird('#F5C518', '#C97A06', 'star') },
  { id: 'night', name: 'Night ladybird', es: 'Mariquita nocturna', svg: ladybird('#3D4FA8', '#FFE98A', 'moon') },
  { id: 'hearts', name: 'Heart ladybird', es: 'Mariquita de corazones', svg: ladybird('#F58FB0', '#D43B66', 'heart') },
] });

/* ---------- owl: front view ---------- */
function owl(o) {
  const wing = (x) => `<g class="hw">${el(x, 39, 6.5, 12.5, o.wing)}</g>`;
  return wing(11.5) + wing(52.5) +
    el(24, 59, 5, 2.4, '#F28A2E') + el(40, 59, 5, 2.4, '#F28A2E') +
    (o.tufts === false ? '' : p('M15 22L15 7L27 16ZM49 22L49 7L37 16Z', o.body)) +
    el(32, 37, 19.5, 22, o.body) + el(32, 45, 12.5, 12.5, o.belly) +
    line('M27 43Q29 45.500 31 43M33 43Q35 45.500 37 43M30 49Q32 51.500 34 49', o.mark, 1.5) + (o.flecks || '') +
    `<g class="he">${c(23.5, 28, 8.6, o.eye)}${c(40.5, 28, 8.6, o.eye)}<g class="hp">${c(23.5, 28.5, 4, INK)}${c(40.5, 28.5, 4, INK)}${c(24.8, 27, 1.4, '#fff')}${c(41.8, 27, 1.4, '#fff')}</g></g>` +
    p('M29 33.500L35 33.500L32 38.500Z', '#F28A2E') + blush(14.5, 36, 2.6) + blush(49.5, 36, 2.6) + (o.top || '');
}
const stars = c(27, 11, 1.3, '#FFD86B') + c(35, 7, 1.5, '#FFD86B') + c(31.5, 14, 1, '#FFD86B');
out('helper-owl', { kind: 'owl', skins: [
  { id: 'classic', name: 'Brown owl', es: 'Búho pardo', svg: owl({ body: '#A9743B', belly: '#F3E2C4', wing: '#8A5A2B', mark: '#C9A26B', eye: '#fff' }) },
  { id: 'snowy', name: 'Snowy owl', es: 'Búho nival', svg: owl({ body: '#E9EDF4', belly: '#FFFFFF', wing: '#CBD3E0', mark: '#AAB4C6', eye: '#FFD86B',
    flecks: c(18, 44, 1.2, '#8E98AC') + c(46, 44, 1.2, '#8E98AC') + c(20, 51, 1.2, '#8E98AC') + c(44, 51, 1.2, '#8E98AC') + c(32, 17.5, 1.2, '#8E98AC') }) },
  { id: 'wizard', name: 'Wizard owl', es: 'Búho mago', svg: owl({ body: '#A9743B', belly: '#F3E2C4', wing: '#8C6FE0', mark: '#C9A26B', eye: '#fff', tufts: false,
    top: p('M19 18Q25 8 36 1Q36 9 45 18Q32 22 19 18Z', '#8C6FE0') + el(32, 18, 16, 3.6, '#7558CC') + stars }) },
  { id: 'detective', name: 'Detective owl', es: 'Búho detective', svg: owl({ body: '#A9743B', belly: '#F3E2C4', wing: '#8A5A2B', mark: '#C9A26B', eye: '#fff', tufts: false,
    top: p('M17 18Q18 5 32 5Q46 5 47 18Q32 21.500 17 18Z', '#D9B27A') + line('M25 7L24 19M32 5L32 20M39 7L40 19M19 12Q32 15 45 12', '#A9743B', 1.2) + el(32, 18.500, 18, 3, '#B98558') + c(32, 5, 2, '#A9743B') +
      line('M52 50L57 56', '#8A5A2B', 3) + c(49.5, 46.500, 5.6, '#CFE5FB', ' stroke="#8A5A2B" stroke-width="2.200"') }) },
] });

/* ---------- frog: sitting, three-quarter view, facing right ---------- */
function frog(o) {
  return `<g class="hl">${el(14, 48, 11, 7.5, o.dark, ' transform="rotate(-18 14 48)"')}${el(10, 57, 9, 3.2, o.foot)}</g>` +
    el(30, 43, 20, 15, o.body) + el(35, 47, 13, 9, o.belly) + (o.spots || '') +
    el(40, 57.500, 5, 2.6, o.foot) + el(50, 56.500, 5, 2.6, o.foot) +
    c(29, 17, 7.4, o.body) + c(46, 17, 7.4, o.body) + el(38, 29, 18, 13.5, o.body) + (o.band || '') +
    `<g class="he">${c(29, 16.500, 4.8, '#fff')}${c(46, 16.500, 4.8, '#fff')}${c(30, 17, 2.5, INK)}${c(47, 17, 2.5, INK)}${c(30.800, 16.200, .9, '#fff')}${c(47.800, 16.200, .9, '#fff')}</g>` +
    blush(26, 32, o.rosy ? 3.6 : 2.8) + blush(51, 32, o.rosy ? 3.6 : 2.8) + line('M29 33Q38.500 40.500 48 33', INK, 1.9) + (o.top || '');
}
const fspots = c(20, 38, 2.6, INK) + c(27, 45, 2.2, INK) + c(15, 44, 1.8, INK) + c(44, 23, 1.8, INK) + c(33, 23.500, 1.5, INK);
out('helper-frog', { kind: 'frog', skins: [
  { id: 'classic', name: 'Green frog', es: 'Rana verde', svg: frog({ body: '#6CC57F', dark: '#55B06A', belly: '#D8F2C4', foot: '#55B06A' }) },
  { id: 'prince', name: 'Frog prince', es: 'Príncipe rana', svg: frog({ body: '#6CC57F', dark: '#55B06A', belly: '#D8F2C4', foot: '#55B06A', rosy: true,
    top: p('M32 13L31 3L35.500 7.500L37.500 1.500L39.500 7.500L44 3L43 13Z', '#F5C518') + c(37.5, 9.500, 1.5, '#E2574C') }) },
  { id: 'ninja', name: 'Ninja frog', es: 'Rana ninja', svg: frog({ body: '#3E9A5B', dark: '#2E7D4F', belly: '#BFE6B0', foot: '#2E7D4F',
    band: p('M20.500 25Q38 20 55.500 25L55 29Q38 24 21 29Z', INK) + p('M21 25.500L8 21L11 26.500L6 30L21 29Z', INK) }) },
  { id: 'dart', name: 'Dart frog', es: 'Rana flecha', svg: frog({ body: '#4D9DE8', dark: '#2B78C2', belly: '#CFE5FB', foot: '#F5C518', spots: fspots }) },
] });

/* ---------- sets for the cells (40 x 40), value 1..9 in its colour ---------- */
const spark = (x, y) => c(x, y, 1.9, '#fff', ' opacity=".9"');
out('tokens-gems', { set: 'gems', name: 'Gems', es: 'Gemas', items: [
  { name: 'Rose heart', es: 'Corazón rosa', svg: p('M20 36L5.500 20Q2 11 10 8Q16 6.500 20 12.500Q24 6.500 30 8Q38 11 34.500 20Z', '#F2668B') + p('M20 12.500Q16 6.500 10 8Q5 10 5.500 17L14 16L20 21Z', '#F9A3BA') + p('M20 36L34.500 20L26 16L20 21Z', '#D43B66') + spark(12, 13) },
  { name: 'Sun stone', es: 'Piedra de sol', svg: c(20, 20, 15, '#F28A2E') + p('M20 8L28.500 11.500L32 20L28.500 28.500L20 32L11.500 28.500L8 20L11.500 11.500Z', '#F9B36B') + p('M20 20L32 20L28.500 28.500L20 32Z', '#D96F12') + spark(14.5, 14) },
  { name: 'Honey drop', es: 'Gota de miel', svg: p('M20 3Q32.500 19 32.500 26Q32.500 37 20 37Q7.500 37 7.500 26Q7.500 19 20 3Z', '#E3B008') + p('M20 3Q7.500 19 7.500 26Q7.500 31 11 34L20 22Z', '#F5D55C') + p('M20 37Q32.500 37 32.500 26L20 22Z', '#B88A00') + spark(14, 21) },
  { name: 'Emerald', es: 'Esmeralda', svg: p('M11 6L29 6L35 12L35 28L29 34L11 34L5 28L5 12Z', '#4FB06D') + p('M13 12L27 12L29 14L29 26L27 28L13 28L11 26L11 14Z', '#8AD3A0') + p('M29 34L35 28L35 12L29 14L29 26L27 28Z', '#2E8A4C') + spark(15, 16) },
  { name: 'Sea crystal', es: 'Cristal de mar', svg: p('M20 3L34.500 11.500L34.500 28.500L20 37L5.500 28.500L5.500 11.500Z', '#2FB5A6') + p('M20 3L34.500 11.500L20 20L5.500 11.500Z', '#7FDCD1') + p('M20 20L34.500 11.500L34.500 28.500L20 37Z', '#178A7E') + spark(13, 11) },
  { name: 'Blue diamond', es: 'Diamante azul', svg: p('M5 15L12 6L28 6L35 15L20 37Z', '#4D9DE8') + p('M5 15L12 6L28 6L35 15Z', '#9CC8F5') + p('M20 37L35 15L24 15Z', '#2B78C2') + p('M16 15L20 6L24 15Z', '#CFE5FB') + spark(11, 11) },
  { name: 'Violet spindle', es: 'Huso violeta', svg: p('M20 2Q34.500 20 20 38Q5.500 20 20 2Z', '#8C6FE0') + p('M20 2Q5.500 20 20 38L20 20Z', '#B5A2FA') + p('M20 20L27.500 20Q27 30 20 38Z', '#6A4BC9') + spark(15, 16) },
  { name: 'Orchid prism', es: 'Prisma orquídea', svg: p('M20 4L37 33.500Q20 38 3 33.500Z', '#D05FC2') + p('M20 4L20 22L3 33.500Z', '#EBA5E2') + p('M20 22L37 33.500Q20 38 3 33.500Z', '#AE3BA0') + spark(15, 20) },
  { name: 'Ruby', es: 'Rubí', svg: '<rect x="5" y="5" width="30" height="30" rx="9" fill="#E2574C"/><rect x="12" y="12" width="16" height="16" rx="4" fill="#F29088"/>' + p('M35 14L35 26Q35 35 26 35L14 35L28 28L28 12Z', '#C23A30') + spark(14, 13) },
] });
out('tokens-sweets', { set: 'sweets', name: 'Sweets', es: 'Dulces', items: [
  { name: 'Macaron', es: 'Macaron', svg: el(20, 27, 15, 8, '#EE7FA0') + el(20, 20.500, 14, 4, '#FFF3C4') + el(20, 13.500, 15, 8.500, '#F78FB0') + el(14, 10.500, 5, 2.200, '#fff', ' opacity=".5"') },
  { name: 'Toffee', es: 'Tofe', svg: p('M12 20L2 10L4 20L2 30ZM28 20L38 10L36 20L38 30Z', '#F9B36B') + el(20, 20, 10.5, 9, '#F28A2E') + line('M16 13Q13 20 16 27M24 13Q27 20 24 27', '#FFE3C2', 1.6) },
  { name: 'Lemon slice', es: 'Rodaja de limón', svg: p('M3 13A17 17 0 0 0 37 13Z', '#E3B008') + p('M7 14.500A13 13 0 0 0 33 14.500Z', '#FFF3B0') + line('M20 15L20 27M20 15L11 23.500M20 15L29 23.500', '#E3B008', 1.4) },
  { name: 'Apple lollipop', es: 'Piruleta de manzana', svg: '<rect x="18.700" y="22" width="2.600" height="17" rx="1.300" fill="#C9A26B"/>' + c(20, 14, 12, '#4FB06D') + line('M20 14Q24 10 20 7.500Q14 6 12.500 13Q12 21 20 21.500', '#B5E6C2', 2) },
  { name: 'Mint ice cream', es: 'Helado de menta', svg: p('M11 21L20 39L29 21Z', '#E0B070') + line('M15 23L22 34M25 23L18 34', '#C48F4A', 1) + c(20, 15, 11.5, '#2FB5A6') + c(15.5, 11, 2.6, '#7FDCD1') + c(24, 17, 1.2, '#178A7E') + c(18, 19, 1.2, '#178A7E') },
  { name: 'Ice lolly', es: 'Polo', svg: '<rect x="18.300" y="27" width="3.400" height="12" rx="1.700" fill="#C9A26B"/><rect x="10" y="2" width="20" height="27" rx="9" fill="#4D9DE8"/><rect x="13.500" y="7" width="3.400" height="13" rx="1.700" fill="#9CC8F5"/>' },
  { name: 'Gummy bear', es: 'Osito de goma', svg: c(13.5, 6, 3.6, '#8C6FE0') + c(26.5, 6, 3.6, '#8C6FE0') + c(9.5, 23, 4, '#8C6FE0') + c(30.5, 23, 4, '#8C6FE0') + c(14, 35, 4.2, '#8C6FE0') + c(26, 35, 4.2, '#8C6FE0') + el(20, 26, 9.5, 10.5, '#8C6FE0') + c(20, 12, 8, '#9C82EA') + c(17.2, 11, 1.2, INK) + c(22.8, 11, 1.2, INK) + el(20, 14.500, 2.2, 1.500, '#6A4BC9') + el(20, 27, 5, 6, '#B5A2FA') },
  { name: 'Doughnut', es: 'Dónut', svg: p('M20 4.500a15.500 15.500 0 1 0 .01 0ZM20 15a5 5 0 1 1 -.01 0Z', '#E0B070', ' fill-rule="evenodd"') + p('M20 6.500a13.500 13.500 0 1 0 .01 0ZM20 14.500a5.500 5.500 0 1 1 -.01 0Z', '#D05FC2', ' fill-rule="evenodd"') + line('M11 14L13 16M27 11L29 12.500M30 24L28 26M13 27L15 28.500M20 30L22 30.500', '#fff', 1.5) },
  { name: 'Cherry cupcake', es: 'Magdalena de cereza', svg: p('M9 23L31 23L28 38L12 38Z', '#F3D2B0') + line('M15 25L16 36M20 25L20 36M25 25L24 36', '#D9A878', 1.2) + p('M6 24Q5 9 20 8Q35 9 34 24Z', '#E2574C') + c(20, 6, 3.6, '#C23A30') + el(14, 14, 3.5, 2, '#F29088') },
] });
const dots = (a, b, y, r) => c(a, y, r, INK) + c(b, y, r, INK);
out('tokens-sea', { set: 'sea', name: 'Sea friends', es: 'Amigos del mar', items: [
  { name: 'Scallop', es: 'Vieira', svg: p('M20 36L3.500 18Q5 5 20 5Q35 5 36.500 18Z', '#F78FB0') + line('M20 35L20 6M20 35L11 8M20 35L29 8M20 35L5.500 14M20 35L34.500 14', '#D43B66', 1.3) + '<rect x="15" y="33" width="10" height="4.500" rx="2" fill="#EE7FA0"/>' },
  { name: 'Starfish', es: 'Estrella de mar', svg: p('M20 2.500L24.800 14L37 15L27.700 23L30.500 35L20 28.600L9.500 35L12.300 23L3 15L15.200 14Z', '#F28A2E', ' stroke="#F28A2E" stroke-width="3" stroke-linejoin="round"') + dots(17, 23, 18, 1.4) + line('M17.500 22Q20 24 22.500 22', INK, 1.3) },
  { name: 'Sunny fish', es: 'Pez sol', svg: p('M27 20L38 10L38 30Z', '#C99A00') + el(17, 20, 14, 10.5, '#E3B008') + p('M14 10Q19 3 24 11Z', '#C99A00') + el(13, 23, 5, 3, '#F5D55C') + c(10, 17, 2, INK) + c(10.6, 16.400, .7, '#fff') },
  { name: 'Turtle', es: 'Tortuga', svg: el(8, 12, 5, 3.4, '#8AD3A0', ' transform="rotate(-35 8 12)"') + el(32, 12, 5, 3.4, '#8AD3A0', ' transform="rotate(35 32 12)"') + el(8, 30, 5, 3.4, '#8AD3A0', ' transform="rotate(35 8 30)"') + el(32, 30, 5, 3.4, '#8AD3A0', ' transform="rotate(-35 32 30)"') + c(20, 6, 5, '#8AD3A0') + dots(18.200, 21.800, 5, .9) + c(20, 22, 12.5, '#4FB06D') + p('M20 15L26 18.500L26 25.500L20 29L14 25.500L14 18.500Z', '#2E8A4C') },
  { name: 'Seahorse', es: 'Caballito de mar', svg: line('M19 13Q9 22 17 29Q25 34 19 37Q14 37.500 15 33', '#2FB5A6', 7) + p('M11 20L5 23L11 26Z', '#7FDCD1') + c(21, 10, 7, '#2FB5A6') + '<rect x="25" y="9.500" width="10" height="4" rx="2" fill="#2FB5A6"/>' + p('M17 4L20 1L22 4.500Z', '#178A7E') + c(22.5, 9, 1.6, INK) },
  { name: 'Whale', es: 'Ballena', svg: line('M16 9Q14 3 10 4M16 9Q18 3 22 4', '#9CC8F5', 2) + p('M29 22L38 13L38 28Z', '#2B78C2') + p('M2 23Q2 11 17 11Q31 11 32 22Q33 32 18 32Q2 32 2 23Z', '#4D9DE8') + p('M4 26Q12 32 24 31Q14 34 8 31Z', '#CFE5FB') + c(9, 21, 1.8, INK) },
  { name: 'Jellyfish', es: 'Medusa', svg: line('M11 21Q9 27 12 31Q14 35 11 38M17 21Q16 28 18 32Q19 35 17 38M23 21Q24 28 22 32Q21 35 23 38M29 21Q31 27 28 31Q26 35 29 38', '#B5A2FA', 2.2) + p('M4 21Q4 4 20 4Q36 4 36 21Z', '#8C6FE0') + el(13, 11, 4.5, 2.4, '#B5A2FA') + dots(16, 24, 15, 1.5) },
  { name: 'Sea snail', es: 'Caracola', svg: p('M3 34Q2 26 11 27L31 27Q38 27 37 34Z', '#EBA5E2') + line('M33 27L35 20M30 27L30 20', '#EBA5E2', 2) + c(35, 19.500, 1.6, INK) + c(30, 19.500, 1.6, INK) + c(19, 17, 13, '#D05FC2') + line('M19 17Q23 13 19 10.500Q13 9 11.500 16Q11 24 19 24.500Q26 24 26.500 17', '#F0BCE8', 2.2) },
  { name: 'Crab', es: 'Cangrejo', svg: line('M10 22L7 15M30 22L33 15M9 28L4 31M31 28L36 31M11 31L7 36M29 31L33 36', '#C23A30', 2.4) + p('M7 15A5.500 5.500 0 1 1 7.500 4L7 9.500L12 8.500A5.500 5.500 0 0 1 7 15Z', '#E2574C') + p('M33 15A5.500 5.500 0 1 0 32.500 4L33 9.500L28 8.500A5.500 5.500 0 0 0 33 15Z', '#E2574C') + el(20, 26, 13, 9, '#E2574C') + c(16, 17, 2.6, '#fff') + c(24, 17, 2.6, '#fff') + dots(16, 24, 17, 1.3) + line('M16 28Q20 31 24 28', INK, 1.4) },
] });

/* ---------- more hats for Pua (in Pua's 64 x 64 box) ---------- */
const fl = (x, y, col) => c(x - 2.2, y, 2.3, col) + c(x + 2.2, y, 2.3, col) + c(x, y - 2.2, 2.3, col) + c(x, y + 2.2, 2.3, col) + c(x, y, 1.6, '#FFE08A');
out('hats', { hats: [
  { id: 'wizard', name: 'Wizard hat', es: 'Sombrero de mago', svg: p('M18 19Q23 8 38 1Q36 10 46 19Q32 23 18 19Z', '#8C6FE0') + el(32, 19, 18, 4, '#7558CC') + c(28, 13, 1.4, '#FFD86B') + c(35, 8, 1.6, '#FFD86B') + c(37, 15, 1.1, '#FFD86B') },
  { id: 'pirate', name: 'Pirate hat', es: 'Sombrero pirata', svg: p('M11 20Q16 8 32 4.500Q48 8 53 20Q42 14.500 32 15.500Q22 14.500 11 20Z', INK) + line('M11.500 20Q22 14.500 32 15.500Q42 14.500 52.500 20', '#FFF3C4', 2) + fl(32, 10, '#F78FB0') },
  { id: 'chef', name: 'Chef\'s hat', es: 'Gorro de chef', svg: c(24, 9, 7, '#fff', ' stroke="#DCD3E6" stroke-width="1"') + c(40, 9, 7, '#fff', ' stroke="#DCD3E6" stroke-width="1"') + c(32, 6.500, 8, '#fff', ' stroke="#DCD3E6" stroke-width="1"') + '<rect x="21" y="10" width="22" height="10" rx="2.500" fill="#fff" stroke="#DCD3E6" stroke-width="1"/>' + line('M21.500 15.500L42.500 15.500', '#DCD3E6', 1) },
  { id: 'beanie', name: 'Woolly hat', es: 'Gorro de lana', svg: p('M17 18Q17 5 32 5Q47 5 47 18Z', '#2FB5A6') + line('M25 7.500L24 15M32 6L32 15M39 7.500L40 15', '#7FDCD1', 1.6) + '<rect x="15" y="14.500" width="34" height="6.500" rx="3.200" fill="#178A7E"/>' + c(32, 4, 4.2, '#FFF3C4') },
  { id: 'headphones', name: 'Headphones', es: 'Auriculares', svg: line('M13.500 33Q13 7 32 7Q51 7 50.500 33', '#F2668B', 3.6) + c(13.5, 33, 6, '#D43B66') + c(50.5, 33, 6, '#D43B66') + c(13.5, 33, 3, '#F9A3BA') + c(50.5, 33, 3, '#F9A3BA') },
  { id: 'wreath', name: 'Flower crown', es: 'Corona de flores', svg: el(20, 15, 3.4, 1.8, '#4FB06D', ' transform="rotate(-30 20 15)"') + el(28, 11.500, 3.4, 1.8, '#4FB06D') + el(36, 11.500, 3.4, 1.8, '#4FB06D') + el(44, 15, 3.4, 1.8, '#4FB06D', ' transform="rotate(30 44 15)"') + fl(16, 19, '#F78FB0') + fl(24, 13, '#F5C518') + fl(32, 10.500, '#5AA9F0') + fl(40, 13, '#9C82EA') + fl(48, 19, '#F59A3C') },
  { id: 'bunny', name: 'Bunny ears', es: 'Orejas de conejo', svg: el(23, 9, 5, 10, '#F4F6FA', ' stroke="#DCD3E6" stroke-width="1" transform="rotate(-12 23 9)"') + el(41, 9, 5, 10, '#F4F6FA', ' stroke="#DCD3E6" stroke-width="1" transform="rotate(12 41 9)"') + el(23, 10, 2.2, 6.500, '#FFC2D1', ' transform="rotate(-12 23 10)"') + el(41, 10, 2.2, 6.500, '#FFC2D1', ' transform="rotate(12 41 10)"') + line('M17 20Q32 13.500 47 20', '#F2668B', 2.8) },
  { id: 'tophat', name: 'Top hat', es: 'Sombrero de copa', svg: '<g transform="rotate(-9 32 14)"><rect x="22" y="1" width="20" height="16" rx="2" fill="#3B2A4A"/><rect x="22" y="11.500" width="20" height="4.500" fill="#F2668B"/><ellipse cx="32" cy="18" rx="16.500" ry="3.600" fill="#3B2A4A"/></g>' },
] });
console.log('packs drawn');
