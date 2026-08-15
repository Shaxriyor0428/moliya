import type { AccountCode } from '../ledger/accounts.js';
import { postEntry } from '../ledger/post.js';
import type { PaymentMethod } from './student.js';

/**
 * Operatsion xarajatlar — docs/03-events.md §6.
 *
 * Ijara, kommunal va marketing TO'LOV PAYTIDA yoziladi: bitta hodisada ham
 * xarajat, ham pul chiqimi. Ish haqi kabi ikki bosqichli (hisoblash → to'lash)
 * qilinmadi — TZ §2.2 jadvali bu qatorni aynan shunday ko'rsatadi va boshqacha
 * qilish modelni murakkablashtirib, hech qanday tekshiruvni yaxshilamaydi (D4).
 */

export type OperatingExpenseKind = 'rent' | 'utilities' | 'marketing';

const EXPENSE_ACCOUNT: Record<OperatingExpenseKind, AccountCode> = {
  rent: 'expense.rent',
  utilities: 'expense.utilities',
  marketing: 'expense.marketing',
};

const EXPENSE_LABEL: Record<OperatingExpenseKind, string> = {
  rent: 'Ijara',
  utilities: 'Kommunal',
  marketing: 'Marketing',
};

const CASH_ACCOUNT_BY_METHOD: Record<PaymentMethod, AccountCode> = {
  cash: 'cash.register',
  bank: 'cash.bank',
};

export interface RecordExpenseInput {
  kind: OperatingExpenseKind;
  date: Date;
  amount: number;
  /** Qayerdan to'landi: kassadan (`cash`) yoki bankdan (`bank`). */
  source: PaymentMethod;
}

export async function recordExpense(input: RecordExpenseInput) {
  const { kind, date, amount, source } = input;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`recordExpense: summa musbat butun son bo'lishi kerak (${amount})`);
  }

  return postEntry({
    date,
    kind: 'operating_expense',
    description: `${EXPENSE_LABEL[kind]} to'landi`,
    lines: [
      { account: EXPENSE_ACCOUNT[kind], amount },
      { account: CASH_ACCOUNT_BY_METHOD[source], amount: -amount, cashFlow: 'operating' },
    ],
  });
}
