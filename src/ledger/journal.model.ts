import { Schema, model, type Types } from 'mongoose';
import {
  ACCOUNT_CODES,
  CASH_ACCOUNTS,
  CASH_FLOW_CATEGORIES,
  isAccountCode,
  type AccountCode,
  type CashFlowCategory,
} from './accounts.js';

/**
 * Jurnal — butun tizimning yagona birlamchi manbasi. Uchala hisobot (P&L,
 * pul oqimi, balans) shu kolleksiyadan HISOBLANADI; alohida "balans jadvali"
 * yoki "oylik natija" jadvali yo'q.
 *
 * Yagona invariant: sum(lines[].amount) === 0.
 *
 * Qatorlar hujjat ICHIDA saqlanadi (embedded), alohida kolleksiya emas. Sababi:
 * MongoDB standalone rejimida tranzaksiya yo'q. Har bir qator alohida hujjat
 * bo'lsa, yozuv o'rtasida jarayon uzilganda bazada balanslashmagan yarim yozuv
 * qolardi. Bitta hujjatga yozuv esa atomar — balanslashmagan holat printsipial
 * jihatdan yuzaga kelmaydi (docs/02-model.md).
 */

export const ENTRY_KINDS = [
  'opening_balance',
  'student_payment',
  'revenue_recognition',
  'student_dropout',
  'salary_accrual',
  'salary_payment',
  'operating_expense',
  'capital_injection',
  'loan_received',
  'loan_payment',
  'equipment_purchase',
  'cash_collection',
] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

export interface JournalLine {
  account: AccountCode;
  /** Butun son so'm, ishorali. ASSET/EXPENSE o'sishi +, LIABILITY/EQUITY/REVENUE o'sishi −. */
  amount: number;
  /**
   * FAQAT pul hisoblarida bo'lishi mumkin va u yerda MAJBURIY.
   * `null` — ataylab qo'yilgan qiymat: "bu ko'chirish (inkassatsiya), oqim emas".
   * `undefined` — unutilgan, xato.
   */
  cashFlow?: CashFlowCategory | null;
}

/** Faqat seed va debugging uchun. Hisobot raqamlari bunga bog'liq emas. */
export interface JournalRef {
  studentId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  loanId?: Types.ObjectId;
}

export interface JournalEntry {
  date: Date;
  /** "YYYY-MM" — `date` dan hosila, yozuv paytida UTC da hisoblanadi. */
  period: string;
  kind: EntryKind;
  description: string;
  ref?: JournalRef;
  lines: JournalLine[];
}

const lineSchema = new Schema<JournalLine>(
  {
    account: { type: String, required: true, enum: ACCOUNT_CODES },
    amount: { type: Number, required: true },
    // enum ro'yxatiga `null` ataylab qo'shilgan — u yaroqli qiymat (inkassatsiya).
    cashFlow: { type: String, enum: [...CASH_FLOW_CATEGORIES, null] },
  },
  { _id: false },
);

const refSchema = new Schema<JournalRef>(
  {
    studentId: { type: Schema.Types.ObjectId },
    employeeId: { type: Schema.Types.ObjectId },
    loanId: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const entrySchema = new Schema<JournalEntry>(
  {
    date: { type: Date, required: true },
    period: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    kind: { type: String, required: true, enum: ENTRY_KINDS },
    description: { type: String, required: true },
    ref: { type: refSchema, required: false },
    lines: { type: [lineSchema], required: true },
  },
  { versionKey: false },
);

/**
 * Qator qiymatini "berilmagan" va "ataylab null" holatlarini ajratib o'qiydi.
 *
 * Mongoose subdocument da `'cashFlow' in line` HAR DOIM true qaytaradi — sxema
 * yo'llari prototipda getter sifatida aniqlangan. Shuning uchun `in` operatori
 * bu farqni ajrata olmaydi; `doc.get(path)` esa ajratadi: berilmagan yo'l
 * `undefined`, ataylab qo'yilgan null esa `null` qaytaradi.
 * Oddiy (hali hujjatga aylanmagan) obyekt uchun to'g'ridan-to'g'ri xossa yetarli.
 */
export function readCashFlow(line: JournalLine): CashFlowCategory | null | undefined {
  const doc = line as { get?: (path: string) => unknown };
  if (typeof doc.get === 'function') {
    return doc.get('cashFlow') as CashFlowCategory | null | undefined;
  }
  return line.cashFlow;
}

/**
 * Balans invarianti — yagona joyda majburlanadi. Bu funksiya sxemadan mustaqil,
 * shuning uchun postEntry() uni bazaga tegmasdan ham chaqira oladi.
 */
export function assertBalanced(lines: readonly JournalLine[], context = 'Yozuv'): void {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error(`${context}: kamida 2 ta qator bo'lishi kerak (hozir ${lines?.length ?? 0})`);
  }

  let sum = 0;
  for (const line of lines) {
    if (!isAccountCode(line.account)) {
      throw new Error(`${context}: noma'lum hisob "${String(line.account)}"`);
    }
    if (!Number.isInteger(line.amount)) {
      throw new Error(`${context}: ${line.account} — amount butun son bo'lishi kerak (${line.amount})`);
    }
    if (line.amount === 0) {
      throw new Error(`${context}: ${line.account} — nol summali qator yozilmaydi`);
    }

    const cashFlow = readCashFlow(line);
    const isCashAccount = CASH_ACCOUNTS.has(line.account);

    if (!isCashAccount && cashFlow !== undefined) {
      throw new Error(`${context}: ${line.account} pul hisobi emas, cashFlow bo'lmasligi kerak`);
    }
    if (isCashAccount && cashFlow === undefined) {
      // null ham ruxsat: "bu ko'chirish, oqim emas". Lekin u ATAYLAB yozilishi kerak.
      throw new Error(`${context}: ${line.account} pul hisobi — cashFlow aniq berilishi shart (null ham bo'ladi)`);
    }

    sum += line.amount;
  }

  if (sum !== 0) {
    throw new Error(`${context}: balanslashmagan, qatorlar yig'indisi ${sum} (0 bo'lishi kerak)`);
  }
}

entrySchema.pre('validate', function () {
  assertBalanced(this.lines, `Yozuv ${this.kind ?? '?'} @${this.period ?? '?'}`);
});

export const JournalEntryModel = model<JournalEntry>('JournalEntry', entrySchema);
