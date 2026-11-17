import { Rng, hash32, hashUnit } from '../rng';
import type { BigParams } from '../types';
import { FIRST, LAST, curve, interleave, type L, type ProductSpec, type Template } from './common';

// Fiction titles are "A of B"; every pair is used once.
const A: L[] = [['The House', 'La casa'], ['The Garden', 'El jardín'], ['The Daughter', 'La hija'], ['The Shadow', 'La sombra'], ['The Last Summer', 'El último verano'], ['The Secret', 'El secreto'], ['The Map', 'El mapa'], ['The Island', 'La isla'], ['The Silence', 'El silencio'], ['The Winter', 'El invierno'], ['The Letters', 'Las cartas'], ['The Night', 'La noche'], ['The Keeper', 'El guardián'], ['The Songs', 'Las canciones'], ['The Promise', 'La promesa'], ['The City', 'La ciudad'], ['The Echo', 'El eco'], ['The Journey', 'El viaje'], ['The Heirs', 'Los herederos'], ['The Memory', 'La memoria'], ['The Edge', 'El filo'], ['The Bridge', 'El puente'], ['The Hour', 'La hora'], ['The Voice', 'La voz'], ['The Return', 'El regreso'], ['The Library', 'La biblioteca'], ['The Kingdom', 'El reino'], ['The Crime', 'El crimen'], ['The Colour', 'El color'], ['The Name', 'El nombre']];
const B: L[] = [['of the Wind', 'del viento'], ['of Salt', 'de sal'], ['of the Clockmaker', 'del relojero'], ['of the North', 'del norte'], ['of Ashes', 'de ceniza'], ['of the Moon', 'de la luna'], ['of the Forgotten', 'de los olvidados'], ['of Glass', 'de cristal'], ['of the River', 'del río'], ['of Fire', 'de fuego'], ['of the Sea', 'del mar'], ['of Paper', 'de papel'], ['of the Mountain', 'de la montaña'], ['of Thieves', 'de los ladrones'], ['of the Orchard', 'del huerto'], ['of Dust', 'de polvo'], ['of the Lighthouse', 'del faro'], ['of Honey', 'de miel'], ['of the Stars', 'de las estrellas'], ['of Stone', 'de piedra'], ['of the Storm', 'de la tormenta'], ['of Iron', 'de hierro'], ['of the Birds', 'de los pájaros'], ['of Snow', 'de nieve'], ['of the Harbour', 'del puerto'], ['of Smoke', 'de humo'], ['of the Desert', 'del desierto'], ['of Water', 'de agua'], ['of the Wolves', 'de los lobos'], ['of Light', 'de luz']];
const PUBLISHERS = ['Ediciones Alborada', 'Faro Azul', 'Tinta Norte', 'Libros del Ciervo', 'Editorial Meridiano', 'Páginas de Sal', 'Brújula Editorial', 'La Encina', 'Nube de Papel', 'Editorial Vértice', 'Cuatro Vientos', 'Mar Adentro', 'Editorial Lumen Sur', 'Hoja Verde'];
const COUNTRIES = ['Spain', 'Spain', 'Spain', 'Mexico', 'Argentina', 'United Kingdom', 'United States', 'France', 'Italy', 'Colombia', 'Chile', 'Ireland'];
const N_AUTHORS = 220;

const nf = (bases: L[], variants: L[]) => ({ bases, variants });
const EDITIONS: L[] = [['', ''], ['(Illustrated edition)', '(Edición ilustrada)'], ['(Pocket)', '(Bolsillo)'], ['(Updated edition)', '(Edición actualizada)'], ['Vol. 2', 'Vol. 2'], ['(Anniversary edition)', '(Edición aniversario)']];

function catalogue(tpl: Template, big: BigParams, max: number): ProductSpec[] {
  const li = big.lang === 'es' ? 1 : 0, combos = A.length * B.length, step = 577; // 577 is coprime with 900
  const counts = tpl.cats.map(c => (c.bases ? c.bases.length * c.variants!.length : Math.floor(combos / 5)));
  const order = interleave(counts, tpl.cats.map(c => c.share), max), used = tpl.cats.map(() => 0), out: ProductSpec[] = [];
  let fic = Math.floor(hashUnit(big.seed, 0xb0) * combos);
  for (const ci of order) {
    const cat = tpl.cats[ci], k = used[ci]++;
    let name: string;
    if (cat.bases) { const b = cat.bases[k % cat.bases.length], v = cat.variants![Math.floor(k / cat.bases.length)]; name = [b[li], v[li]].filter(Boolean).join(' '); }
    else { fic = (fic + step) % combos; name = `${A[fic % A.length][li]} ${B[Math.floor(fic / A.length)][li]}`; }
    const u = hashUnit(big.seed, 0xb1, ci, k), fmt = u < 0.55 ? 0 : u < 0.8 ? 1 : 2;
    const price = cat.price[0] * Math.pow(cat.price[1] / cat.price[0], hashUnit(big.seed, 0xb2, ci, k)) * (fmt === 1 ? 1.25 : fmt === 2 ? 0.7 : 1);
    // a few authors write most of the bestsellers
    const author = 1 + Math.floor(Math.pow(hashUnit(big.seed, 0xb3, ci, k), 1.8) * N_AUTHORS);
    out.push({
      name, sku: `978-84-${String(10000 + (hash32(big.seed, ci, k) % 89999))}-${String(ci)}${String(k % 10)}`, cat: ci, price,
      costRatio: cat.costRatio, pop: cat.pop * Math.pow(k + 1, -0.75) * (0.5 + hashUnit(big.seed, 0xb4, ci, k)),
      extra: [author, 1 + Math.floor(hashUnit(big.seed, 0xb5, ci, k) * PUBLISHERS.length), fmt, 2026 - Math.floor(Math.pow(hashUnit(big.seed, 0xb6, ci, k), 2.5) * 30)],
    });
  }
  return out;
}

const xmas = { christmas_season: 1.5, book_day: 2.2 };
export const bookshop: Template = {
  type: 'bookshop',
  cats: [
    { name: ['Literary fiction', 'Narrativa'], share: 0.2, pop: 1.2, price: [12, 23], costRatio: 0.63, vat: 0.04, events: xmas },
    { name: ['Crime & thriller', 'Novela negra'], share: 0.13, pop: 1.3, price: [11, 22], costRatio: 0.63, vat: 0.04, events: xmas, season: [0.9, 0.9, 0.9, 1, 1, 1.2, 1.4, 1.4, 1, 0.9, 0.9, 1] },
    { name: ['Fantasy & sci-fi', 'Fantasía y ciencia ficción'], share: 0.1, pop: 1, price: [12, 25], costRatio: 0.63, vat: 0.04, events: xmas },
    { name: ['Romance', 'Romántica'], share: 0.08, pop: 1, price: [10, 20], costRatio: 0.63, vat: 0.04, events: { ...xmas, valentines: 1.8 } },
    { name: ['Historical fiction', 'Novela histórica'], share: 0.07, pop: 0.9, price: [13, 24], costRatio: 0.63, vat: 0.04, events: xmas },
    {
      name: ['Children', 'Infantil'], share: 0.12, pop: 1.1, price: [7, 19], costRatio: 0.6, vat: 0.04, events: { christmas_season: 2, book_day: 1.8 },
      ...nf([['The Sleepy Bear', 'El oso dormilón'], ['Counting with Lola', 'Cuenta con Lola'], ['The Little Dragon', 'El pequeño dragón'], ['Animals of the Farm', 'Animales de la granja'], ['The Moon Rabbit', 'El conejo de la luna'], ['Pirate School', 'Escuela de piratas'], ['My First Words', 'Mis primeras palabras'], ['The Rainbow Fish Pond', 'El estanque arcoíris'], ['Detective Nico', 'Detective Nico'], ['The Giant Who Sneezed', 'El gigante que estornudó'], ['Space Explorers', 'Exploradores del espacio'], ['The Brave Snail', 'El caracol valiente']], EDITIONS),
    },
    {
      name: ['Comics & manga', 'Cómic y manga'], share: 0.08, pop: 0.9, price: [8, 22], costRatio: 0.6, vat: 0.04,
      ...nf([['Neon Ronin', 'Neon Ronin'], ['The Lighthouse Club', 'El club del faro'], ['Stardust Academy', 'Academia Stardust'], ['Iron Petals', 'Pétalos de hierro'], ['Captain Meridian', 'Capitán Meridiano'], ['Ghost Courier', 'Mensajero fantasma'], ['Kitsune Diner', 'Kitsune Diner'], ['The Paper Knights', 'Los caballeros de papel']], [['Vol. 1', 'Vol. 1'], ['Vol. 2', 'Vol. 2'], ['Vol. 3', 'Vol. 3'], ['Vol. 4', 'Vol. 4'], ['Vol. 5', 'Vol. 5'], ['Vol. 6', 'Vol. 6'], ['Vol. 7', 'Vol. 7'], ['Vol. 8', 'Vol. 8']]),
    },
    {
      name: ['Non-fiction & essays', 'Ensayo y divulgación'], share: 0.08, pop: 0.8, price: [14, 26], costRatio: 0.62, vat: 0.04, events: xmas,
      ...nf([['A Brief History of the Sea', 'Breve historia del mar'], ['How Cities Think', 'Cómo piensan las ciudades'], ['The Hidden Life of Numbers', 'La vida oculta de los números'], ['Sleep and the Brain', 'El sueño y el cerebro'], ['The Economy Explained', 'La economía explicada'], ['Climate: A User Guide', 'Clima: manual de uso'], ['Thinking with Data', 'Pensar con datos'], ['The Roman Roads', 'Las calzadas romanas'], ['A Walk Through Physics', 'Un paseo por la física'], ['The Art of Listening', 'El arte de escuchar']], EDITIONS),
    },
    {
      name: ['Self-help & wellbeing', 'Autoayuda y bienestar'], share: 0.05, pop: 0.9, price: [12, 21], costRatio: 0.62, vat: 0.04, season: [1.6, 1.1, 1, 1, 1, 1, 0.9, 0.9, 1.3, 1, 1, 1],
      ...nf([['Small Habits, Big Days', 'Hábitos pequeños, días grandes'], ['Calm in Ten Minutes', 'Calma en diez minutos'], ['The Focused Mind', 'La mente enfocada'], ['Saying No Kindly', 'Decir no con amabilidad'], ['Money Without Stress', 'Dinero sin estrés'], ['Better Mornings', 'Mejores mañanas'], ['Start Again', 'Volver a empezar'], ['The Quiet Leader', 'El líder tranquilo']], EDITIONS),
    },
    {
      name: ['Cooking & travel', 'Cocina y viajes'], share: 0.05, pop: 0.7, price: [15, 32], costRatio: 0.6, vat: 0.04, events: { christmas_season: 1.8 },
      ...nf([['Weeknight Mediterranean', 'Mediterránea entre semana'], ['Bread at Home', 'Pan en casa'], ['Tapas for Friends', 'Tapas para amigos'], ['Lisbon in Four Days', 'Lisboa en cuatro días'], ['The Pyrenees on Foot', 'Los Pirineos a pie'], ['Vegetables First', 'Las verduras primero'], ['Rome Pocket Guide', 'Guía de bolsillo de Roma'], ['Rice: 60 Recipes', 'Arroces: 60 recetas']], EDITIONS),
    },
    {
      name: ['Stationery & gifts', 'Papelería y regalos'], share: 0.04, pop: 1.2, price: [2.5, 24], costRatio: 0.45, vat: 0.21, events: { back_to_school: 2.4, christmas_season: 1.6 },
      ...nf([['Notebook A5', 'Cuaderno A5'], ['Gel pen', 'Bolígrafo de gel'], ['Bookmark', 'Marcapáginas'], ['Tote bag', 'Bolsa de tela'], ['Weekly planner', 'Agenda semanal'], ['Greeting card', 'Tarjeta de felicitación'], ['Jigsaw puzzle', 'Puzle'], ['Reading light', 'Luz de lectura']], [['', ''], ['Kraft', 'Kraft'], ['Botanical', 'Botánico'], ['Classic', 'Clásico'], ['Colour', 'Color']]),
    },
  ],
  baseTraffic: 220, size: [30, 500, 110], conv: 0.26, basket: 1.6, multiQty: 0.05, elasticity: 1,
  dow: [0.8, 0.8, 0.85, 0.95, 1.2, 1.7, 0.7], month: [1.05, 0.85, 0.9, 1.15, 0.95, 1, 1, 0.8, 1.2, 0.95, 1.05, 1.9],
  events: { book_day: 3.2, christmas_season: 1.2, back_to_school: 1.2, black_friday: 1.4, mothers_day: 1.2 },
  holiday: 0, rain: -0.1, heat: -0.04,
  hours: curve([[9, 0], [10, 3], [12, 8], [14, 5], [17, 6], [19, 10], [20, 7], [21, 1], [22, 0]]),
  hoursWe: curve([[9, 0], [10, 4], [12, 10], [14, 8], [17, 8], [19, 9], [21, 2], [22, 0]]),
  identified: 0.55, custK: 700, churn: 0.14,
  segments: [[['Avid reader', 'Lector habitual'], 0.3], [['Student', 'Estudiante'], 0.2], [['Parent', 'Padre o madre'], 0.22], [['Gift buyer', 'Comprador de regalos'], 0.2], [['Tourist', 'Turista'], 0.08]],
  returnRate: 0.015, returnOnline: 0.04, restock: 0.95, onlineShare: 0.12, txPerStaffHour: 5,
  roles: [[['Bookseller', 'Librero'], 10.4], [['Shop manager', 'Encargado'], 14.8]],
  items: [150, 1200, 800], leadTime: [2, 6], reorderDefault: 7,
  suppliers: [['Distribuidora Letras', 'Distribuidora Letras'], ['Logística del Libro', 'Logística del Libro'], ['Atlántida Distribución', 'Atlántida Distribución'], ['Papelería Mayorista Sol', 'Papelería Mayorista Sol']],
  rentM2: [15, 32, 70], fitoutM2: 420, utilitiesM2: 1.8, overheadM2: 5, overheadPct: 0.03, minStock: 8, marketingScale: 900, hoursDefault: [10, 21], closedDefault: 6,
  catalogue,
  extras: big => {
    const rng = new Rng(hash32(big.seed, 0xa07));
    return { authors: Array.from({ length: N_AUTHORS }, () => [`${rng.pick(FIRST)} ${rng.pick(LAST)} ${rng.pick(LAST)}`, rng.pick(COUNTRIES)] as [string, string]), publishers: PUBLISHERS };
  },
};
