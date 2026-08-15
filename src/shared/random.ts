/**
 * Qat'iy urug'li tasodifiy sonlar generatori (mulberry32).
 *
 * `Math.random()` ATAYLAB ishlatilmaydi: har ishga tushirishda boshqa
 * ma'lumot bersa, reconcile yiqilganda uni takrorlab ko'rib bo'lmaydi.
 * Urug' qat'iy bo'lgani uchun `npm run seed` har safar bir xil bazani
 * yaratadi va xatoni qayta-qayta ko'rish mumkin.
 */
export interface Rng {
  /** [0, 1) oralig'ida. */
  next(): number;
  /** [min, max] oralig'ida butun son. */
  int(min: number, max: number): number;
  /** `probability` ehtimollik bilan `true`. */
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
  };
}
