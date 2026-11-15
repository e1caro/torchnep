// Slider ranges and defaults for each business type, and the size estimate shown in the wizard.

import { POS_CONV, TIER_TRAFFIC } from './templates/common';
import { TEMPLATES } from './templates';
import type { BigParams, BizType, SmallKey, SmallParams } from './types';

export interface SliderDef { key: SmallKey; min: number; max: number; step: number; unit: '' | '%' | '€' | 'd'; }

export const hoursOpen = (big: BigParams) => Math.max(1, big.closeHour - big.openHour);
export const shiftsPerDay = (big: BigParams) => (hoursOpen(big) > 9 ? 2 : 1);
export const openDaysPerWeek = (big: BigParams) => (big.closedDay >= 0 ? 6 : 7);

export function maxItems(big: BigParams): number {
  const t = TEMPLATES[big.type];
  return Math.round(Math.min(t.items[1], Math.max(t.items[0] * 1.5, t.items[2] * (big.sizeM2 / t.size[2]) * 1.6)));
}
export function defaultTraffic(big: BigParams): number {
  const t = TEMPLATES[big.type];
  return Math.round((t.baseTraffic * TIER_TRAFFIC[big.locationTier - 1] * Math.pow(big.sizeM2 / t.size[2], 0.35)) / 5) * 5;
}
export const recommendedInvestment = (big: Pick<BigParams, 'type' | 'sizeM2'>) => Math.round((big.sizeM2 * TEMPLATES[big.type].fitoutM2 * 1.3) / 1000) * 1000;

/** Staff needed on the floor at once to serve the expected buyers with some slack. */
export function staffNeeded(big: BigParams, traffic: number): number {
  const t = TEMPLATES[big.type];
  return Math.max(1, Math.ceil((traffic * t.conv * POS_CONV[big.pricePos] * 1.5) / (hoursOpen(big) * t.txPerStaffHour)));
}
export function recommendedStaff(big: BigParams): number {
  return Math.max(2, Math.ceil((staffNeeded(big, defaultTraffic(big)) * shiftsPerDay(big) * openDaysPerWeek(big)) / 5));
}

export function sliderDefs(big: BigParams): SliderDef[] {
  const t = TEMPLATES[big.type], base = t.baseTraffic, r5 = (v: number) => Math.max(5, Math.round(v / 5) * 5);
  return [
    { key: 'traffic', min: r5(base * 0.25), max: r5(base * 3.2), step: 5, unit: '' },
    { key: 'items', min: t.items[0], max: maxItems(big), step: 1, unit: '' },
    { key: 'priceLevel', min: -30, max: 50, step: 1, unit: '%' },
    { key: 'promoDepth', min: 0, max: 50, step: 5, unit: '%' },
    { key: 'promoShare', min: 0, max: 40, step: 5, unit: '%' },
    { key: 'marketing', min: 0, max: t.marketingScale * 4, step: 50, unit: '€' },
    { key: 'staffPerShift', min: 1, max: Math.max(12, staffNeeded(big, base * 3.2) + 2), step: 1, unit: '' },
    { key: 'reorderDays', min: 1, max: 30, step: 1, unit: 'd' },
    { key: 'supplierCost', min: -20, max: 30, step: 1, unit: '%' },
    { key: 'quality', min: 1, max: 5, step: 1, unit: '' },
  ];
}

export function defaultSmall(big: BigParams): SmallParams {
  const t = TEMPLATES[big.type];
  const staffPerShift = Math.max(1, Math.round((big.staff * 5) / openDaysPerWeek(big) / shiftsPerDay(big)));
  return {
    traffic: defaultTraffic(big), items: Math.min(maxItems(big), Math.max(t.items[0], Math.round(t.items[2] * Math.pow(big.sizeM2 / t.size[2], 0.5)))),
    priceLevel: 0, promoDepth: 0, promoShare: 10, marketing: Math.round((t.marketingScale * 0.4) / 50) * 50,
    staffPerShift, reorderDays: t.reorderDefault, supplierCost: 0, quality: 3,
  };
}

export function defaultBig(type: BizType, lang: 'en' | 'es', today: string, seed: number): BigParams {
  const t = TEMPLATES[type];
  const big: BigParams = {
    type, name: '', sizeM2: t.size[2], locationTier: 2, pricePos: 1, openHour: t.hoursDefault[0], closeHour: t.hoursDefault[1], closedDay: t.closedDefault,
    investment: 0, staff: 0, online: type !== 'restaurant' && type !== 'cafe', historyDays: 365, startDate: today, seed, lang,
  };
  big.investment = recommendedInvestment(big); big.staff = recommendedStaff(big);
  return big;
}

/** Rough ticket and line counts, so the wizard can warn before generating too much for the device. */
export function estimate(big: BigParams, small: SmallParams) {
  const t = TEMPLATES[big.type];
  const tx = small.traffic * t.conv * POS_CONV[big.pricePos] * (big.online ? 1 + t.onlineShare : 1) * (openDaysPerWeek(big) / 7) * 0.92;
  const lines = tx * Math.min(t.basket, 0.75 * t.basket + 1);
  return { txPerDay: Math.round(tx), linesPerDay: Math.round(lines), lines: Math.round(lines * big.historyDays), tx: Math.round(tx * big.historyDays) };
}
export const ROW_BUDGET = { desktop: 1_600_000, phone: 700_000 };
/** Longest history, in days, that keeps the sale lines inside the budget. */
export function maxHistoryDays(big: BigParams, small: SmallParams, budget: number): number {
  const perDay = Math.max(1, estimate({ ...big, historyDays: 1 }, small).lines);
  return Math.max(180, Math.min(1095, Math.floor(budget / perDay / 5) * 5));
}
