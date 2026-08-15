import type { HydratedDocument } from 'mongoose';
import { toPeriod } from '../shared/period.js';
import {
  JournalEntryModel,
  assertBalanced,
  type EntryKind,
  type JournalEntry,
  type JournalLine,
  type JournalRef,
} from './journal.model.js';

export interface PostEntryInput {
  /** UTC sana. `new Date(2026, 0, 31)` mahalliy vaqt — ishlatilmaydi (D10). */
  date: Date;
  kind: EntryKind;
  description: string;
  ref?: JournalRef;
  lines: JournalLine[];
}

/**
 * Jurnalga yozishning YAGONA yo'li. Hech qaysi modul `JournalEntryModel.create()`
 * ni to'g'ridan-to'g'ri chaqirmaydi — invariant bitta joyda majburlanadi.
 *
 * `period` bu yerda `date` dan UTC da hisoblanadi va hujjatga yoziladi
 * (denormalizatsiya): agregatsiyada `$dateToString` chaqirmaslik va `period`
 * indeksidan foydalanish uchun.
 */
export async function postEntry(input: PostEntryInput): Promise<HydratedDocument<JournalEntry>> {
  const { date, kind, description, ref, lines } = input;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error(`Yozuv ${kind}: sana yaroqsiz (${String(date)})`);
  }
  if (!description) {
    throw new Error(`Yozuv ${kind}: description bo'sh bo'lmasligi kerak`);
  }

  const period = toPeriod(date);

  // Bazaga tegmasdan oldin tekshiramiz: xato xabari aniqroq va yozuv urinishi bo'lmaydi.
  // Sxemadagi pre('validate') hook ham shu funksiyani chaqiradi — u oxirgi to'siq.
  assertBalanced(lines, `Yozuv ${kind} @${period}`);

  return JournalEntryModel.create({ date, period, kind, description, ref, lines });
}
