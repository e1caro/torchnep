import { describe, expect, it } from 'vitest';
import { dashboard } from '../src/engine/analytics';
import { BIZ_TYPES, type BizType } from '../src/engine/types';
import { make } from './engine.test';

// Benchmarks for a small independent business of each kind (typical published ranges, widened a little because
// one simulated year of one business is noisy). [low, high] for: gross margin, net margin, labour / revenue,
// rent / revenue, average ticket in euros (net of VAT), conversion, inventory turns per year, waste / cost of
// sales, units returned / units sold.
type Range = [number, number];
export const BENCH: Record<BizType, { gm: Range; net: Range; labour: Range; rent: Range; ticket: Range; conv: Range; turns: Range; waste: Range; returns: Range }> = {
  clothing: { gm: [0.46, 0.6], net: [0.03, 0.14], labour: [0.11, 0.2], rent: [0.06, 0.14], ticket: [35, 75], conv: [0.1, 0.25], turns: [2.5, 6], waste: [0, 0.001], returns: [0.05, 0.14] },
  restaurant: { gm: [0.62, 0.74], net: [0.02, 0.12], labour: [0.27, 0.38], rent: [0.05, 0.11], ticket: [30, 60], conv: [0.6, 0.97], turns: [25, 180], waste: [0.03, 0.12], returns: [0, 0.01] },
  bookshop: { gm: [0.33, 0.43], net: [0.005, 0.08], labour: [0.13, 0.22], rent: [0.05, 0.11], ticket: [16, 32], conv: [0.18, 0.35], turns: [3, 9], waste: [0, 0.001], returns: [0.005, 0.04] },
  cafe: { gm: [0.64, 0.78], net: [0.03, 0.15], labour: [0.24, 0.36], rent: [0.06, 0.12], ticket: [3, 7], conv: [0.75, 0.97], turns: [30, 260], waste: [0.03, 0.14], returns: [0, 0.01] },
  pharmacy: { gm: [0.27, 0.36], net: [0.04, 0.12], labour: [0.09, 0.16], rent: [0.02, 0.06], ticket: [14, 28], conv: [0.7, 0.92], turns: [7, 16], waste: [0, 0.001], returns: [0, 0.01] },
  supermarket: { gm: [0.22, 0.3], net: [0.005, 0.05], labour: [0.08, 0.14], rent: [0.03, 0.07], ticket: [14, 30], conv: [0.85, 0.97], turns: [14, 45], waste: [0.01, 0.05], returns: [0, 0.01] },
};

describe('realism', () => {
  for (const type of BIZ_TYPES) {
    it(`${type}: a default business lands inside the benchmark ranges`, () => {
      // the second year, so the opening ramp-up does not count; averaged over two seeds
      const acc: Record<string, number> = {};
      for (const seed of [21, 22]) {
        const sim = make(type, 730, seed), d = dashboard(sim, { from: 365, to: 729, category: -1, channel: -1 }), k = d.kpis, rev = d.pnl[0].value;
        const m = { gm: (rev + d.pnl[1].value) / rev, net: k.profitPct, labour: k.labourPct, rent: -d.pnl.find(p => p.key === 'rent')!.value / rev, ticket: k.avgTicket, conv: k.conversion, turns: k.inventoryTurnover, waste: k.wastePct, returns: k.returnRate };
        for (const key in m) acc[key] = (acc[key] ?? 0) + m[key as keyof typeof m] / 2;
        acc.rev = (acc.rev ?? 0) + rev / 24;
      }
      console.log(type.padEnd(11), Object.entries(acc).map(([key, v]) => `${key} ${v >= 10 ? Math.round(v) : v.toFixed(3)}`).join('  '));
      const bad = Object.entries(BENCH[type]).filter(([key, [lo, hi]]) => acc[key] < lo || acc[key] > hi).map(([key, r]) => `${key}=${acc[key].toFixed(3)} not in [${r}]`);
      expect(bad).toEqual([]);
    });
  }
});
