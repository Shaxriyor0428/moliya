/**
 * Pul — butun son so'm. float, parseFloat, Decimal128 ishlatilmaydi.
 *
 * O'zbekistonda tiyin muomalada yo'q; JS ning xavfsiz butun son chegarasi
 * 2^53 ≈ 9·10^15, 3 yillik kümülativ aylanma esa ~10^11 so'm — 4 ta kattalik
 * tartibi zaxira bor (docs/02-model.md — "Pul birligi").
 */

/**
 * `-0` ni `0` ga aylantiradi. Ishorali summalarni yig'ishda manfiy nol tabiiy
 * paydo bo'ladi va JSON da `-0` bo'lib chiqadi — hisobotda buni ko'rsatmaymiz.
 */
export function stripNegativeZero(n: number): number {
  return n === 0 ? 0 : n;
}

export function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function assertMoney(value: unknown, label = 'summa'): asserts value is number {
  if (!isMoney(value)) throw new Error(`${label} butun son bo'lishi kerak: ${String(value)}`);
}

/**
 * Summani n ta bo'lakka bo'ladi: har biriga floor(total / n), qoldiq oxirgisiga.
 *
 *   splitAmount(1_000_000, 3) -> [333_333, 333_333, 333_334]
 *
 * Yig'indi har doim aniq `total` ga teng bo'lishi SHART: aks holda 3 oylik
 * to'lov to'liq tan olinmaydi va `deferred_revenue` nolga tushmaydi — TZ §5.1
 * dagi "31-mart: 0" tekshiruvi yiqiladi (docs/05-decisions.md D6).
 *
 * Math.round bilan har bo'lakni yaxlitlash rad etildi — yig'indi asl summadan
 * farq qilishi mumkin.
 */
export function splitAmount(total: number, n: number): number[] {
  assertMoney(total, 'total');
  if (!Number.isInteger(n) || n < 1) throw new Error(`n musbat butun son bo'lishi kerak: ${n}`);

  const base = Math.floor(total / n);
  const parts = new Array<number>(n).fill(base);
  parts[n - 1] = total - base * (n - 1);
  return parts;
}
