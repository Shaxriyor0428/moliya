import type { Types } from 'mongoose';
import type { JournalLine } from '../ledger/journal.model.js';
import { postEntry } from '../ledger/post.js';
import type { Student } from '../models/student.model.js';
import { endOfMonth, parsePeriod, type Period } from '../shared/period.js';

/**
 * O'quvchi hodisalari — docs/03-events.md §1–3.
 *
 * QOLDIQLAR PARAMETR SIFATIDA BERILADI (`arBalance`, `deferredBalance`), bu
 * funksiyalar ichida bazadan so'ralmaydi. Sababi: seed bu funksiyalarni
 * 500 × 36 ≈ 18 000 marta chaqiradi va har chaqiruvda agregatsiya qilish
 * qabul qilib bo'lmas darajada sekin. Seed qoldiqni xotirada kuzatadi,
 * testlar esa jurnaldan hisoblab beradi — funksiyaning o'zi toza va tez qoladi
 * (tasks/session-2.md §2.2).
 */

export type PaymentMethod = 'cash' | 'bank';

const CASH_ACCOUNT_BY_METHOD = {
  cash: 'cash.register',
  bank: 'cash.bank',
} as const;

export interface RecordPaymentInput {
  studentId: Types.ObjectId;
  date: Date;
  amount: number;
  method: PaymentMethod;
  /** O'quvchining shu paytdagi debitor qarzi (musbat yoki 0). */
  arBalance: number;
}

/**
 * §1. O'quvchi to'lov qildi. Pul kirdi, lekin darslar hali o'tilmagan →
 * daromad emas, majburiyat.
 *
 * To'lov avval mavjud debitor qarzni yopadi, qolgani oldindan to'lovga tushadi.
 *
 * `cashFlow: 'operating'` — TO'LIQ summaga, oldindan to'lov qismiga ham.
 * TZ §5.1: pul oqimida 1 800 000, P&L da esa faqat 600 000. Bu eng ko'p xato
 * qilinadigan nuqtalardan biri.
 */
export async function recordPayment(input: RecordPaymentInput) {
  const { studentId, date, amount, method, arBalance } = input;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`recordPayment: summa musbat butun son bo'lishi kerak (${amount})`);
  }
  if (!Number.isInteger(arBalance) || arBalance < 0) {
    throw new Error(`recordPayment: arBalance manfiy bo'lmagan butun son bo'lishi kerak (${arBalance})`);
  }

  const applied = Math.min(amount, arBalance);
  const deferred = amount - applied;

  const lines: JournalLine[] = [
    { account: CASH_ACCOUNT_BY_METHOD[method], amount, cashFlow: 'operating' },
  ];
  // Nol summali qator yozilmaydi — assertBalanced uni rad etadi.
  if (applied > 0) lines.push({ account: 'ar.students', amount: -applied });
  if (deferred > 0) lines.push({ account: 'deferred_revenue', amount: -deferred });

  return postEntry({
    date,
    kind: 'student_payment',
    description: `O'quvchi to'lovi (${method === 'cash' ? 'naqd' : 'bank'})`,
    ref: { studentId },
    lines,
  });
}

/**
 * `recognizeRevenue` ga kerak bo'ladigan o'quvchi maydonlari. To'liq hujjat ham
 * bu shaklga tushadi — funksiya bazadan hech narsa o'qimaydi.
 */
export type StudentFeeProfile = Pick<Student, 'monthlyFee' | 'discountPercent' | 'droppedAt'> & {
  _id: Types.ObjectId;
};

export interface RecognizeRevenueInput {
  student: StudentFeeProfile;
  period: Period;
  /** O'quvchining shu paytdagi oldindan to'lov qoldig'i (musbat yoki 0). */
  deferredBalance: number;
}

/**
 * §2. Oy oxiri: darslar o'tildi. PUL HARAKATLANMAYDI.
 *
 * Oldindan to'lov yetgan qismi majburiyatdan yopiladi, yetmagan qismi debitor
 * qarzga aylanadi — dars o'tilgan, demak daromad baribir tan olinadi. Bu
 * hisoblash usuli (accrual) mantig'i, D1.
 *
 * Yozuv oyning oxirgi kunida (UTC) yaratiladi. Chiqib ketgan o'quvchi uchun
 * yozuv yaratilmaydi (`null` qaytadi).
 */
export async function recognizeRevenue(input: RecognizeRevenueInput) {
  const { student, period, deferredBalance } = input;

  if (!Number.isInteger(deferredBalance) || deferredBalance < 0) {
    throw new Error(`recognizeRevenue: deferredBalance manfiy bo'lmasligi kerak (${deferredBalance})`);
  }

  const { year, month } = parsePeriod(period);
  const date = endOfMonth(year, month);

  // Chiqib ketgan o'quvchi uchun keyingi oylarda dars o'tilmaydi — daromad ham yo'q.
  if (student.droppedAt && student.droppedAt <= date) return null;

  const fee = monthlyFeeAfterDiscount(student.monthlyFee, student.discountPercent);
  if (fee === 0) return null; // to'liq chegirma — tan oladigan daromad yo'q

  const covered = Math.min(fee, deferredBalance);
  const uncovered = fee - covered;

  const lines: JournalLine[] = [];
  if (covered > 0) lines.push({ account: 'deferred_revenue', amount: covered });
  if (uncovered > 0) lines.push({ account: 'ar.students', amount: uncovered });
  lines.push({ account: 'revenue.tuition', amount: -fee });

  return postEntry({
    date,
    kind: 'revenue_recognition',
    description: `Daromad tan olindi — ${period}`,
    ref: { studentId: student._id },
    lines,
  });
}

export interface DropStudentInput {
  studentId: Types.ObjectId;
  date: Date;
  /** Qaytariladigan oldindan to'lov qoldig'i. 0 bo'lsa yozuv yaratilmaydi. */
  deferredBalance: number;
}

/**
 * §3. O'quvchi kursni tashlab ketdi: qolgan oldindan to'lov qaytariladi (D2).
 *
 * Majburiyat qandaydir yo'l bilan yopilishi SHART, aks holda `deferred_revenue`
 * balansda abadiy osilib qoladi.
 *
 * Qoldiq 0 bo'lsa — yozadigan narsa yo'q, `null` qaytaradi. Debitor qarzi bor
 * o'quvchi chiqarilmaydi: umidsiz qarzni hisobdan chiqarish (`expense.bad_debt`)
 * bu versiyaga kirmaydi (D3).
 */
export async function dropStudent(input: DropStudentInput) {
  const { studentId, date, deferredBalance } = input;

  if (!Number.isInteger(deferredBalance) || deferredBalance < 0) {
    throw new Error(`dropStudent: deferredBalance manfiy bo'lmasligi kerak (${deferredBalance})`);
  }
  if (deferredBalance === 0) return null;

  return postEntry({
    date,
    kind: 'student_dropout',
    description: "O'quvchi chiqib ketdi — oldindan to'lov qaytarildi",
    ref: { studentId },
    lines: [
      { account: 'deferred_revenue', amount: deferredBalance },
      { account: 'cash.bank', amount: -deferredBalance, cashFlow: 'operating' },
    ],
  });
}

/**
 * Chegirma o'quvchining oylik to'loviga qo'llaniladi; alohida "chegirma xarajati"
 * hisobi yo'q, chunki chegirma — daromadning kamayishi, xarajat emas (D5).
 * Yaxlitlash `Math.floor` — qoida barqaror bo'lishi shart, aks holda qoldiq to'planadi.
 */
export function monthlyFeeAfterDiscount(monthlyFee: number, discountPercent: number): number {
  if (!Number.isInteger(monthlyFee) || monthlyFee < 0) {
    throw new Error(`monthlyFee manfiy bo'lmagan butun son bo'lishi kerak (${monthlyFee})`);
  }
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error(`discountPercent 0..100 oralig'ida bo'lishi kerak (${discountPercent})`);
  }
  return Math.floor((monthlyFee * (100 - discountPercent)) / 100);
}
