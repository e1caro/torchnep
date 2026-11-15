// The date dimension: calendar parts, Spanish national holidays, commercial events and a synthetic
// Mediterranean-type weather series. Days are generated in order because the weather remembers yesterday.

import { Rng, hash32 } from './rng';

export interface DayInfo {
  day: number; y: number; m: number; dom: number; dow: number; // dow 0 = Monday
  isoWeek: number; holiday: string | null; event: string | null; temp: number; rain: number;
}

function easter(y: number): [number, number] {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, mm = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * mm + 114) / 31), dayOfMonth = ((h + l - 7 * mm + 114) % 31) + 1;
  return [month, dayOfMonth];
}
const FIXED: Record<string, [string, string]> = {
  '1-1': ['New Year', 'Año Nuevo'], '1-6': ['Epiphany', 'Reyes'], '5-1': ['Labour Day', 'Día del Trabajo'],
  '8-15': ['Assumption', 'Asunción'], '10-12': ['National Day', 'Fiesta Nacional'], '11-1': ['All Saints', 'Todos los Santos'],
  '12-6': ['Constitution Day', 'Día de la Constitución'], '12-8': ['Immaculate Conception', 'Inmaculada'], '12-25': ['Christmas Day', 'Navidad'],
};

export class Calendar {
  readonly days: DayInfo[] = [];
  private t0: number; private rng: Rng; private tempDev = 0;
  constructor(readonly start: string, seed: number, private lang: 'en' | 'es') {
    this.t0 = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10));
    this.rng = new Rng(hash32(seed, 0xca1));
  }
  get(day: number): DayInfo {
    while (this.days.length <= day) this.days.push(this.make(this.days.length));
    return this.days[day];
  }
  private make(day: number): DayInfo {
    const dt = new Date(this.t0 + day * 86400000);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, dom = dt.getUTCDate(), dow = (dt.getUTCDay() + 6) % 7;
    const doy = Math.round((Date.UTC(y, m - 1, dom) - Date.UTC(y, 0, 1)) / 86400000);
    // ISO week: the week of the Thursday
    const thu = new Date(Date.UTC(y, m - 1, dom + 3 - dow)), isoWeek = 1 + Math.floor((thu.getTime() - Date.UTC(thu.getUTCFullYear(), 0, 1)) / 604800000);
    const li = this.lang === 'es' ? 1 : 0;
    let holiday: string | null = FIXED[`${m}-${dom}`]?.[li] ?? null;
    const [em, ed] = easter(y), gf = new Date(Date.UTC(y, em - 1, ed - 2));
    if (gf.getUTCMonth() + 1 === m && gf.getUTCDate() === dom) holiday = li ? 'Viernes Santo' : 'Good Friday';

    let event: string | null = null;
    const nov1 = (new Date(Date.UTC(y, 10, 1)).getUTCDay() + 6) % 7, bf = ((4 - nov1 + 7) % 7) + 22; // fourth Friday of November
    if (m === 11 && dom >= bf && dom <= bf + 2) event = 'black_friday';
    else if (m === 2 && dom === 14) event = 'valentines';
    else if (m === 4 && dom === 23) event = 'book_day';
    else if (m === 5 && dow === 6 && dom <= 7) event = 'mothers_day';
    else if ((m === 12 && dom >= 1) || (m === 1 && dom <= 5)) event = 'christmas_season';
    else if ((m === 1 && dom >= 7) || m === 2) event = 'winter_sales';
    else if (m === 7 || m === 8) event = 'summer_sales';
    else if (m === 9 && dom <= 15) event = 'back_to_school';

    // weather: seasonal curve plus a deviation that carries over from the day before
    const season = 16.5 - 8.5 * Math.cos((2 * Math.PI * (doy - 24)) / 365);
    this.tempDev = 0.72 * this.tempDev + 1.9 * this.rng.normal();
    const wet = 0.2 + 0.11 * Math.cos((2 * Math.PI * (doy - 320)) / 365);
    const rain = this.rng.chance(wet) ? Math.round(-Math.log(1 - this.rng.next() * 0.999) * 60) / 10 : 0;
    const temp = Math.round((season + this.tempDev - (rain > 0 ? 1.5 : 0)) * 10) / 10;
    return { day, y, m, dom, dow, isoWeek, holiday, event, temp, rain };
  }
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
