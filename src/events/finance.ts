import type { Types } from 'mongoose';
import type { JournalLine } from '../ledger/journal.model.js';
import { postEntry } from '../ledger/post.js';

/** Moliyaviy hodisalar — docs/03-events.md §7–9, §12. */

export interface InjectCapitalInput {
  investorId: Types.ObjectId;
  date: Date;
  amount: number;
}

/**
 * §7. Investor kapital kiritdi. DAROMAD EMAS — P&L ga umuman tegmaydi.
 * TZ §5.3: "Yanvar P&L: sof foyda 0", pul oqimi esa moliyaviy kirim.
 *
 * `investorId` yozuvning `ref` iga tushmaydi: `ref` sxemasida faqat
 * `studentId`/`employeeId`/`loanId` bor (docs/02-model.md). U izohda qoladi —
 * hisobot raqamlariga baribir ta'sir qilmaydi.
 */
export async function injectCapital(input: InjectCapitalInput) {
  const { investorId, date, amount } = input;
  assertPositive(amount, 'injectCapital');

  return postEntry({
    date,
    kind: 'capital_injection',
    description: `Investor kapital kiritdi (${investorId.toString()})`,
    lines: [
      { account: 'cash.bank', amount, cashFlow: 'financing' },
      { account: 'capital', amount: -amount },
    ],
  });
}

export interface OpeningBalanceInput {
  date: Date;
  amount: number;
}

/**
 * §12. Boshlang'ich qoldiq (faqat seed). Har qanday boshlang'ich aktiv kapital
 * yoki majburiyat bilan muvozanatlanishi shart — "shunchaki pul bor edi" degan
 * yozuv balansni buzadi (D9).
 */
export async function openingBalance(input: OpeningBalanceInput) {
  const { date, amount } = input;
  assertPositive(amount, 'openingBalance');

  return postEntry({
    date,
    kind: 'opening_balance',
    description: "Boshlang'ich qoldiq",
    lines: [
      { account: 'cash.bank', amount, cashFlow: 'financing' },
      { account: 'capital', amount: -amount },
    ],
  });
}

export interface TakeLoanInput {
  loanId: Types.ObjectId;
  date: Date;
  principal: number;
}

/** §8. Bankdan kredit olindi. Daromad emas — majburiyat va moliyaviy kirim. */
export async function takeLoan(input: TakeLoanInput) {
  const { loanId, date, principal } = input;
  assertPositive(principal, 'takeLoan');

  return postEntry({
    date,
    kind: 'loan_received',
    description: 'Bankdan kredit olindi',
    ref: { loanId },
    lines: [
      { account: 'cash.bank', amount: principal, cashFlow: 'financing' },
      { account: 'loan_principal', amount: -principal },
    ],
  });
}

export interface PayLoanInput {
  loanId: Types.ObjectId;
  date: Date;
  interest: number;
  principal: number;
}

/**
 * §9. Kredit to'lovi — eng murakkab yozuv, TO'RT QATOR.
 *
 * Bitta to'lov ikkita pul oqimi toifasiga bo'linadi: foiz — operatsion,
 * asosiy qarz — moliyaviy. Shuning uchun pul qatori IKKIGA bo'linadi.
 * Bitta qator qilib yozilsa, unga bitta toifa berishga majbur bo'lamiz va
 * TZ §5.4 dagi ikkala tekshiruvdan biri albatta yiqiladi.
 *
 * Bitta hisobga (cash.bank) bir yozuvda bir nechta qator yozish normal —
 * sxema buni taqiqlamaydi.
 */
export async function payLoan(input: PayLoanInput) {
  const { loanId, date, interest, principal } = input;

  for (const [label, value] of [['interest', interest], ['principal', principal]] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`payLoan: ${label} manfiy bo'lmagan butun son bo'lishi kerak (${value})`);
    }
  }
  if (interest + principal === 0) {
    throw new Error("payLoan: foiz ham, asosiy qarz ham 0 — yozadigan narsa yo'q");
  }

  const lines: JournalLine[] = [];
  // Nol summali qator yozilmaydi.
  if (interest > 0) {
    lines.push({ account: 'expense.interest', amount: interest });
    lines.push({ account: 'cash.bank', amount: -interest, cashFlow: 'operating' });
  }
  if (principal > 0) {
    lines.push({ account: 'loan_principal', amount: principal });
    lines.push({ account: 'cash.bank', amount: -principal, cashFlow: 'financing' });
  }

  return postEntry({
    date,
    kind: 'loan_payment',
    description: "Kredit to'lovi (foiz + asosiy qarz)",
    ref: { loanId },
    lines,
  });
}

function assertPositive(amount: number, fn: string): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`${fn}: summa musbat butun son bo'lishi kerak (${amount})`);
  }
}
