/**
 * Period — "YYYY-MM". Hamma sana hisobi UTC da.
 *
 * Nega bu muhim (docs/05-decisions.md D10): oy oxiri hodisalari (daromad tan
 * olish, ish haqi hisoblash) juda ko'p. Asia/Tashkent UTC+5 da mahalliy
 * `2026-02-01 00:00` -> `2026-01-31T19:00Z`, ya'ni fevral hodisasi yanvarga
 * tushadi. Jurnal baribir balanslashgan bo'lgani uchun reconcile buni ushlamaydi
 * — faqat oylik raqamlar jimgina surilib ketadi.
 */
export type Period = string;

export function toPeriod(date: Date): Period {
  return date.toISOString().slice(0, 7);
}

/** Sanani UTC da yaratish. `new Date(2026, 0, 31)` — mahalliy vaqt, ishlatilmaydi. */
export function utcDate(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

/** Oyning oxirgi kuni, UTC. Keyingi oyning 0-kuni = shu oyning oxirgi kuni. */
export function endOfMonth(year: number, month1to12: number): Date {
  return new Date(Date.UTC(year, month1to12, 0));
}

/** "2026-01" -> { year: 2026, month: 1 } */
export function parsePeriod(period: Period): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new Error(`Noto'g'ri period: ${period}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** Period ni n oyga suradi: addMonths("2026-01", 2) -> "2026-03" */
export function addMonths(period: Period, n: number): Period {
  const { year, month } = parsePeriod(period);
  return toPeriod(new Date(Date.UTC(year, month - 1 + n, 1)));
}
