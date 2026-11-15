// Seeded random numbers. Only integer arithmetic decides the stream, so the same seed gives the same data everywhere.

export function hash32(a: number, b = 0, c = 0, d = 0): number {
  let h = 0x9e3779b9 ^ (a | 0);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h ^= b | 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= c | 0;
  h = Math.imul(h ^ (h >>> 16), 0x27d4eb2f); h ^= d | 0;
  h = Math.imul(h ^ (h >>> 15), 0x165667b1);
  return (h ^ (h >>> 16)) >>> 0;
}
/** A number in [0, 1) that depends only on the arguments. */
export const hashUnit = (a: number, b = 0, c = 0, d = 0) => hash32(a, b, c, d) / 4294967296;

export class Rng {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0; }
  /** mulberry32 */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number): number { return Math.floor(this.next() * n); }
  range(lo: number, hi: number): number { return lo + this.next() * (hi - lo); }
  chance(p: number): boolean { return this.next() < p; }
  normal(): number {
    const u = Math.max(this.next(), 1e-12), v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /** Multiplicative noise with median 1. */
  logn(sigma: number): number { return Math.exp(sigma * this.normal()); }
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * this.normal()));
    const L = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= this.next(); } while (p > L);
    return k - 1;
  }
  binomial(n: number, p: number): number {
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    if (n > 40) return Math.min(n, Math.max(0, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * this.normal())));
    let k = 0; for (let i = 0; i < n; i++) if (this.next() < p) k++;
    return k;
  }
  pick<T>(arr: readonly T[]): T { return arr[this.int(arr.length)]; }
  /** Index drawn with the given weights (they need not sum to 1). */
  weighted(w: readonly number[]): number {
    let tot = 0; for (let i = 0; i < w.length; i++) tot += w[i];
    let r = this.next() * tot;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
    return w.length - 1;
  }
}

/** Index in a cumulative-weights array for a uniform draw u in [0, 1). */
export function searchCum(cum: Float64Array, n: number, u: number): number {
  const target = u * cum[n - 1];
  let lo = 0, hi = n - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] > target) hi = mid; else lo = mid + 1; }
  return lo;
}
