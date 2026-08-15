import { postEntry } from '../ledger/post.js';

/** Aktiv hodisalari — docs/03-events.md §10–11. */

export interface BuyEquipmentInput {
  date: Date;
  amount: number;
}

/**
 * §10. Jihoz sotib olindi. XARAJAT EMAS — pul aktivdan aktivga o'tdi.
 * Pul oqimida investitsion chiqim, P&L da hech narsa yo'q (TZ §5.5).
 * Amortizatsiya TZ §3 bo'yicha doiradan tashqarida.
 */
export async function buyEquipment(input: BuyEquipmentInput) {
  const { date, amount } = input;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`buyEquipment: summa musbat butun son bo'lishi kerak (${amount})`);
  }

  return postEntry({
    date,
    kind: 'equipment_purchase',
    description: 'Jihoz sotib olindi',
    lines: [
      { account: 'fixed_assets', amount },
      { account: 'cash.bank', amount: -amount, cashFlow: 'investing' },
    ],
  });
}

export interface CollectCashInput {
  date: Date;
  amount: number;
}

/**
 * §11. Inkassatsiya: kassadan bankka. Uchala hisobotga ham ta'sir qilmaydi.
 *
 * IKKALA qatorda ham `cashFlow: null` — bu ataylab yozilgan qiymat, "bu
 * ko'chirish, oqim emas" degani. `undefined` bo'lsa sxema rad etadi.
 *
 * Ikkalasini `operating` deb belgilash raqamlarni buzmasdi (ular netlashadi),
 * lekin hisobotda operatsion aylanmani sun'iy shishirardi.
 */
export async function collectCash(input: CollectCashInput) {
  const { date, amount } = input;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`collectCash: summa musbat butun son bo'lishi kerak (${amount})`);
  }

  return postEntry({
    date,
    kind: 'cash_collection',
    description: 'Inkassatsiya: kassadan bankka',
    lines: [
      { account: 'cash.bank', amount, cashFlow: null },
      { account: 'cash.register', amount: -amount, cashFlow: null },
    ],
  });
}
