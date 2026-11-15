import { hashUnit } from '../rng';
import type { BigParams } from '../types';
import { curve, type L, type ProductSpec, type Template } from './common';

// [garment, category, low price, high price]
const GARMENTS: [L, number, number, number][] = [
  [['T-shirt', 'Camiseta'], 0, 9, 25], [['Jeans', 'Vaqueros'], 1, 29, 70], [['Sweater', 'Jersey'], 0, 25, 60], [['Shirt', 'Camisa'], 0, 22, 55],
  [['Dress', 'Vestido'], 2, 29, 90], [['Hoodie', 'Sudadera'], 0, 25, 55], [['Trousers', 'Pantalón'], 1, 25, 60], [['Jacket', 'Chaqueta'], 3, 49, 140],
  [['Sneakers', 'Zapatillas'], 4, 39, 110], [['Skirt', 'Falda'], 2, 19, 50], [['Coat', 'Abrigo'], 3, 79, 220], [['Shorts', 'Bermudas'], 1, 17, 40],
  [['Blouse', 'Blusa'], 0, 22, 55], [['Scarf', 'Bufanda'], 5, 12, 35], [['Belt', 'Cinturón'], 5, 14, 40], [['Boots', 'Botas'], 4, 59, 150],
  [['Blazer', 'Americana'], 3, 59, 150], [['Socks 3-pack', 'Pack 3 calcetines'], 5, 7, 15], [['Swimsuit', 'Bañador'], 6, 19, 50], [['Cap', 'Gorra'], 5, 12, 28],
  [['Polo shirt', 'Polo'], 0, 19, 45], [['Leggings', 'Leggings'], 1, 15, 35], [['Cardigan', 'Cárdigan'], 0, 29, 65], [['Sandals', 'Sandalias'], 4, 25, 70],
  [['Puffer vest', 'Chaleco acolchado'], 3, 39, 90], [['Tote bag', 'Bolso tote'], 5, 19, 60], [['Pyjamas', 'Pijama'], 6, 22, 45], [['Gloves', 'Guantes'], 5, 12, 30],
];
const LINES: L[] = [['Basic', 'básico'], ['Essential', 'esencial'], ['Urban', 'urbano'], ['Classic', 'clásico'], ['Studio', 'studio']];
const COLOURS: L[] = [['Black', 'Negro'], ['White', 'Blanco'], ['Navy', 'Marino'], ['Grey', 'Gris'], ['Beige', 'Beige'], ['Green', 'Verde'], ['Burgundy', 'Burdeos'], ['Blue', 'Azul']];
const SIZES: Record<number, [string, number][]> = {
  0: [['XS', 0.5], ['S', 1], ['M', 1.4], ['L', 1.2], ['XL', 0.6]], 1: [['36', 0.5], ['38', 1], ['40', 1.3], ['42', 1.2], ['44', 0.7]],
  2: [['XS', 0.6], ['S', 1.2], ['M', 1.4], ['L', 0.9]], 3: [['S', 0.9], ['M', 1.4], ['L', 1.2], ['XL', 0.6]],
  4: [['37', 0.6], ['38', 1], ['39', 1.1], ['41', 1.1], ['42', 1], ['43', 0.7]], 5: [['One size', 2.2]], 6: [['S', 1], ['M', 1.3], ['L', 1]],
};
const summer = [0.5, 0.5, 0.8, 1.1, 1.4, 1.7, 1.8, 1.5, 0.9, 0.6, 0.5, 0.5];
const winter = [1.5, 1.3, 0.9, 0.6, 0.4, 0.3, 0.3, 0.4, 0.9, 1.4, 1.7, 1.8];

function catalogue(tpl: Template, big: BigParams, max: number): ProductSpec[] {
  const li = big.lang === 'es' ? 1 : 0, out: ProductSpec[] = [];
  for (let s = 0; out.length < max; s++) {
    const [g, cat, lo, hi] = GARMENTS[s % GARMENTS.length], line = LINES[Math.floor(s / GARMENTS.length) % LINES.length];
    const style = `${g[li]} ${line[li]}`, u = hashUnit(big.seed, 0x51, s), price = lo * Math.pow(hi / lo, u);
    const nCol = SIZES[cat].length === 1 ? 3 : 2 + (hashUnit(big.seed, 0x52, s) < 0.4 ? 1 : 0), c0 = Math.floor(hashUnit(big.seed, 0x53, s) * COLOURS.length);
    const stylePop = tpl.cats[cat].pop * Math.pow(s + 1, -0.35) * (0.6 + 0.8 * hashUnit(big.seed, 0x54, s));
    for (let c = 0; c < nCol && out.length < max; c++) {
      const col = COLOURS[c === 0 ? Math.min(c0, 3) : (c0 + c * 3) % COLOURS.length];
      for (const [size, w] of SIZES[cat]) {
        if (out.length >= max) break;
        out.push({
          name: `${style} ${col[li]} ${size}`.replace(' One size', ''), sku: `CLO-${String(s + 1).padStart(3, '0')}-${col[0].slice(0, 3).toUpperCase()}-${size.replace('One size', 'U')}`,
          cat, price, costRatio: tpl.cats[cat].costRatio * (0.92 + 0.16 * u), pop: stylePop * w * (c === 0 ? 1 : 0.6) / SIZES[cat].length,
          extra: [style, size === 'One size' ? (li ? 'Única' : 'One size') : size, col[li]],
        });
      }
    }
  }
  return out;
}

export const clothing: Template = {
  type: 'clothing',
  cats: [
    { name: ['Tops', 'Partes de arriba'], share: 1, pop: 1.3, price: [9, 60], costRatio: 0.47, vat: 0.21 },
    { name: ['Bottoms', 'Partes de abajo'], share: 1, pop: 1.1, price: [15, 70], costRatio: 0.47, vat: 0.21 },
    { name: ['Dresses & skirts', 'Vestidos y faldas'], share: 1, pop: 0.9, price: [19, 90], costRatio: 0.4, vat: 0.21, season: [0.6, 0.7, 1, 1.3, 1.5, 1.5, 1.3, 1.1, 0.9, 0.7, 0.7, 1] },
    { name: ['Outerwear', 'Abrigos y chaquetas'], share: 1, pop: 0.7, price: [39, 220], costRatio: 0.45, vat: 0.21, season: winter, heat: -0.35 },
    { name: ['Footwear', 'Calzado'], share: 1, pop: 0.7, price: [25, 150], costRatio: 0.48, vat: 0.21 },
    { name: ['Accessories', 'Complementos'], share: 1, pop: 0.9, price: [7, 60], costRatio: 0.36, vat: 0.21, events: { christmas_season: 1.5 } },
    { name: ['Swim & nightwear', 'Baño y pijamas'], share: 1, pop: 0.6, price: [19, 50], costRatio: 0.4, vat: 0.21, season: summer, heat: 0.4 },
  ],
  baseTraffic: 320, size: [40, 600, 150], conv: 0.12, basket: 1.9, multiQty: 0.04, elasticity: 1.8,
  dow: [0.8, 0.82, 0.88, 0.95, 1.25, 1.75, 0.55],
  month: [1.25, 0.9, 0.85, 0.95, 1, 0.95, 1.2, 0.85, 0.95, 1, 1.15, 1.5],
  events: { black_friday: 2.2, winter_sales: 1.15, summer_sales: 1.1, christmas_season: 1.25, back_to_school: 1.1 },
  holiday: 0, rain: -0.16, heat: -0.03,
  hours: curve([[9, 0], [10, 3], [12, 8], [14, 6], [16, 5], [18, 10], [20, 8], [21, 2], [22, 0]]),
  hoursWe: curve([[9, 0], [10, 4], [12, 10], [14, 8], [17, 9], [19, 10], [21, 3], [22, 0]]),
  identified: 0.5, custK: 900, churn: 0.2,
  segments: [[['Student', 'Estudiante'], 0.2], [['Young professional', 'Profesional joven'], 0.3], [['Family', 'Familia'], 0.25], [['Senior', 'Sénior'], 0.1], [['Tourist', 'Turista'], 0.15]],
  returnRate: 0.08, returnOnline: 0.24, restock: 0.85, onlineShare: 0.18, txPerStaffHour: 3.2,
  roles: [[['Sales assistant', 'Dependiente'], 10.2], [['Store manager', 'Encargado de tienda'], 15.5], [['Stockroom', 'Almacén'], 9.8]],
  items: [80, 800, 260], leadTime: [6, 16], reorderDefault: 10,
  suppliers: [['Textil Levante', 'Textil Levante'], ['Nordwear Supply', 'Nordwear Supply'], ['Atlas Garments', 'Atlas Garments'], ['Calzados Ribera', 'Calzados Ribera'], ['Mila Accessories', 'Mila Accessories']],
  rentM2: [14, 32, 78], fitoutM2: 520, utilitiesM2: 2.4, marketingScale: 1800, hoursDefault: [10, 21], closedDefault: 6,
  catalogue,
};
