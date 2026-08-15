import { JournalEntryModel } from '../ledger/journal.model.js';

/**
 * Indekslar kod bilan boshqariladi — Mongo da migration tushunchasi yo'q.
 *
 * Ikkitasi bilan boshlanadi:
 *   { period: 1 }  — P&L va oylik pul oqimi ($match period)
 *   { date: 1 }    — balans "sanaga qadar" ($match date <= asOf)
 *
 * Qo'shma indeks `{ period: 1, 'lines.account': 1 }` ATAYLAB QO'SHILMAGAN.
 * Avval o'lchash kerak (4-sessiya, `npm run bench`); o'lchovsiz qo'shilgan
 * indeks — asossiz optimizatsiya. Kerak bo'lsa, o'shanda qo'shiladi va
 * README ga "nima uchun" yoziladi (TZ §9 aynan shuni so'raydi).
 */
export async function ensureIndexes(): Promise<void> {
  await JournalEntryModel.collection.createIndexes([
    { key: { period: 1 }, name: 'period_1' },
    { key: { date: 1 }, name: 'date_1' },
  ]);
}
