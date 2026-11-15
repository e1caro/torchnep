import { isoDate } from '../engine/table';
import type { BizType, Lang } from '../engine/types';
import type { Theme } from '../store';

const loc = (l: Lang) => (l === 'es' ? 'es-ES' : 'en-GB');
export const money = (v: number, l: Lang, digits = 0) => new Intl.NumberFormat(loc(l), { style: 'currency', currency: 'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
export const compact = (v: number, l: Lang) => new Intl.NumberFormat(loc(l), { notation: 'compact', maximumFractionDigits: Math.abs(v) >= 100000 ? 0 : 1 }).format(v);
export const moneyC = (v: number, l: Lang) => (Math.abs(v) >= 10000 ? `${compact(v, l)} €` : money(v, l, Math.abs(v) < 100 ? 2 : 0));
export const int = (v: number, l: Lang) => new Intl.NumberFormat(loc(l), { maximumFractionDigits: 0 }).format(v);
export const num = (v: number, l: Lang, d = 1) => new Intl.NumberFormat(loc(l), { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
export const pct = (v: number, l: Lang, d = 1) => new Intl.NumberFormat(loc(l), { style: 'percent', maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
export const dateLong = (start: string, day: number, l: Lang) => new Date(isoDate(start, day) + 'T00:00:00Z').toLocaleDateString(loc(l), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const dateShort = (iso: string, l: Lang) => new Date(iso + 'T00:00:00Z').toLocaleDateString(loc(l), { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const todayIso = () => { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10); };
export const addDays = (iso: string, n: number) => isoDate(iso, n);

// Categorical slots in their fixed, validated order (dataviz reference palette); light and dark steps of the same hues.
export const SERIES: Record<Theme, string[]> = {
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'],
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
};
const ACCENT_SLOT: Record<BizType, number> = { supermarket: 0, restaurant: 1, pharmacy: 2, cafe: 3, clothing: 4, bookshop: 6 };
export const accent = (type: BizType, theme: Theme) => SERIES[theme][ACCENT_SLOT[type]];
/** Sequential blue ramp, from "near zero" (close to the surface) to the strongest step. */
export const SEQ: Record<Theme, string[]> = {
  dark: ['#1a1a19', '#0d366b', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'],
  light: ['#fcfcfb', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#1c5cab', '#0d366b'],
};
export const INK: Record<Theme, { surface: string; ink: string; ink2: string; muted: string; grid: string; axis: string; pos: string; neg: string }> = {
  dark: { surface: '#1a1a19', ink: '#f0efec', ink2: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835', pos: '#3987e5', neg: '#e66767' },
  light: { surface: '#fcfcfb', ink: '#0b0b0b', ink2: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7', pos: '#2a78d6', neg: '#e34948' },
};
