// What a business template is, and the generic catalogue builder shared by most of them.

import { Rng, hashUnit } from '../rng';
import type { BigParams, BizType } from '../types';

export type L = [string, string]; // [English, Spanish]

export interface CatDef {
  name: L;
  share: number;            // share of the catalogue
  pop: number;              // demand weight of a product in this category, relative to the others
  price: [number, number];  // price range at mid positioning, VAT included
  costRatio: number;        // unit cost / price without VAT
  vat: number;
  spoil?: number;           // daily share of stock that spoils (perishables)
  season?: number[];        // 12 monthly demand multipliers
  heat?: number;            // extra demand per 10 °C above 16 °C (negative for hot drinks…)
  events?: Record<string, number>;
  bases?: L[];              // product name = base + variant
  variants?: (L | [string, string, number])[]; // optional third value multiplies the price
}

export interface ProductSpec {
  name: string; sku: string; cat: number; price: number; costRatio: number; pop: number;
  extra?: (number | string | null)[]; // template-specific product columns, in schema order
}

export interface Template {
  type: BizType;
  cats: CatDef[];
  baseTraffic: number;               // visitors a day on the high street at the reference size
  size: [number, number, number];    // m²: min, max, default (the default is the reference size)
  conv: number;                      // share of visitors who buy
  basket: number;                    // mean units per ticket
  multiQty: number;                  // chance that a line has more than one unit
  elasticity: number;
  dow: number[];                     // 7 traffic multipliers, Monday first
  month: number[];                   // 12 traffic multipliers
  events: Record<string, number>;    // traffic multipliers for calendar events
  holiday: number;                   // traffic multiplier on public holidays; 0 = closed
  rain: number; heat: number;        // traffic change per 10 mm of rain / per 10 °C above 16 °C
  hours: number[]; hoursWe: number[]; // 24 hourly weights, weekdays and weekends
  identified: number;                // share of tickets with a known customer
  custK: number;                     // size of the regular base at which half of the identified buyers are returning
  churn: number;                     // chance a customer never comes back after a purchase
  segments: [L, number][];
  returnRate: number; returnOnline: number; restock: number;
  onlineShare: number;
  txPerStaffHour: number;
  roles: [L, number][];              // job and gross hourly wage; the first is the main one
  items: [number, number, number];   // catalogue size: min, max, default
  leadTime: [number, number]; reorderDefault: number; suppliers: L[];
  rentM2: [number, number, number];  // euros per m² and month by location tier
  fitoutM2: number;                  // recommended investment per m²
  utilitiesM2: number;               // euros per m² and month
  marketingScale: number;            // monthly spend that gets about two thirds of the maximum lift
  hoursDefault: [number, number]; closedDefault: number;
  menuPrices?: boolean;              // prices end in .00/.50 instead of .95/.99
  party?: number;                    // restaurant: mean guests per party
  catalogue?: (tpl: Template, big: BigParams, max: number) => ProductSpec[];
  extras?: (big: BigParams) => { authors?: [string, string][]; publishers?: string[] };
}

export const POS_PRICE = [0.78, 1, 1.38];
export const POS_CONV = [1.14, 1, 0.82];
export const POS_COST = [0.86, 1, 1.12]; // cost ratio multiplier: cheap shops run thinner margins per euro
export const TIER_TRAFFIC = [0.62, 1, 1.65];

export function nicePrice(p: number, menu = false): number {
  if (menu) return p < 6 ? Math.max(0.5, Math.round(p * 10) / 10) : Math.round(p * 2) / 2;
  if (p < 4) return Math.max(0.25, Math.round(p * 20) / 20);
  if (p < 25) return Math.max(0.95, Math.round(p * 2) / 2 - 0.05);
  return Math.round(p) - 0.01;
}

/** Catalogue order that keeps every prefix balanced across categories according to their shares. */
export function interleave(counts: number[], shares: number[], max: number): number[] {
  const tot = shares.reduce((a, b) => a + b, 0), used = counts.map(() => 0), out: number[] = [];
  while (out.length < max) {
    let best = -1, bestGap = -Infinity;
    for (let i = 0; i < counts.length; i++) {
      if (used[i] >= counts[i]) continue;
      const gap = (shares[i] / tot) * (out.length + 1) - used[i];
      if (gap > bestGap) { bestGap = gap; best = i; }
    }
    if (best < 0) break;
    used[best]++; out.push(best);
  }
  return out;
}

/** Products named base + variant, priced inside the category range, most popular first within each category. */
export function genericCatalogue(tpl: Template, big: BigParams, max: number): ProductSpec[] {
  const li = big.lang === 'es' ? 1 : 0;
  const perCat = tpl.cats.map(cat => (cat.bases?.length ?? 0) * Math.max(1, cat.variants?.length ?? 1));
  const order = interleave(perCat, tpl.cats.map(c => c.share), max), used = tpl.cats.map(() => 0), out: ProductSpec[] = [];
  for (const ci of order) {
    const cat = tpl.cats[ci], k = used[ci]++, bases = cat.bases!, vars = cat.variants?.length ? cat.variants : [['', '', 1] as [string, string, number]];
    const b = bases[k % bases.length], v = vars[Math.floor(k / bases.length)];
    const u = hashUnit(big.seed, 0x9d, ci, k), mult = (v[2] as number | undefined) ?? 1;
    const basePos = (k % bases.length) / Math.max(1, bases.length - 1); // later bases sit higher in the range
    const price = cat.price[0] * Math.pow(cat.price[1] / cat.price[0], 0.65 * basePos + 0.35 * u) * mult;
    const name = [b[li], v[li]].filter(Boolean).join(' ');
    out.push({
      name, sku: `${tpl.type.slice(0, 3).toUpperCase()}-${String(ci + 1).padStart(2, '0')}-${String(k + 1).padStart(4, '0')}`,
      cat: ci, price, costRatio: cat.costRatio * (0.9 + 0.2 * hashUnit(big.seed, 0x9e, ci, k)),
      pop: cat.pop * Math.pow(k + 1, -0.55) * (0.6 + 0.8 * hashUnit(big.seed, 0x9f, ci, k)),
    });
  }
  return out;
}

export const FIRST = ['Lucía', 'Hugo', 'Martina', 'Mateo', 'Sofía', 'Leo', 'Julia', 'Daniel', 'Paula', 'Pablo', 'Emma', 'Álvaro', 'Valeria', 'Adrián', 'Carmen', 'Diego', 'Alba', 'Mario', 'Noa', 'Javier', 'Sara', 'Marcos', 'Elena', 'Iván', 'Laura', 'Sergio', 'Irene', 'Rubén', 'Nuria', 'Óscar', 'Aitana', 'Marc', 'Olivia', 'Nil', 'Ane', 'Iker', 'Carla', 'Bruno', 'Inés', 'Samuel'];
export const LAST = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández', 'Ruiz', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco', 'Molina', 'Castro', 'Ortega', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina', 'Cortés', 'Garrido', 'Santos', 'Lozano', 'Cano', 'Prieto', 'Méndez', 'Cruz', 'Herrera', 'Vidal'];
export const personName = (rng: Rng) => `${rng.pick(FIRST)} ${rng.pick(LAST)}`;

export const flat = (v: number) => Array.from({ length: 12 }, () => v);
/** 24 hourly weights from [hour, weight] knots, linearly interpolated. */
export function curve(knots: [number, number][]): number[] {
  const out = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    for (let i = 0; i < knots.length - 1; i++) {
      const [h0, w0] = knots[i], [h1, w1] = knots[i + 1];
      if (h >= h0 && h <= h1) out[h] = w0 + ((w1 - w0) * (h - h0)) / Math.max(1, h1 - h0);
    }
  }
  return out;
}
