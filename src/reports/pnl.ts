import { PNL_ACCOUNTS, REVENUE_ACCOUNTS, type AccountCode } from '../ledger/accounts.js';
import { JournalEntryModel } from '../ledger/journal.model.js';
import { stripNegativeZero } from '../shared/money.js';
import type { Period } from '../shared/period.js';

/**
 * Foyda va zarar (P&L) — docs/04-reports.md §1.
 *
 * Faqat REVENUE va EXPENSE turidagi qatorlar, berilgan oy ichida.
 * Hisobot hech narsa yozmaydi — faqat o'qish.
 */

export interface PnlReport {
  period: Period;
  revenue: number;
  /** Hisob kodi -> summa, musbat. */
  expenses: Partial<Record<AccountCode, number>>;
  totalExpense: number;
  netProfit: number;
}

interface AccountTotal {
  _id: AccountCode;
  total: number;
}

export async function pnl(period: Period): Promise<PnlReport> {
  const rows = await JournalEntryModel.aggregate<AccountTotal>([
    { $match: { period } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: PNL_ACCOUNTS } } },
    { $group: { _id: '$lines.account', total: { $sum: '$lines.amount' } } },
  ]);

  let revenue = 0;
  const expenses: Partial<Record<AccountCode, number>> = {};

  for (const row of rows) {
    if (REVENUE_ACCOUNTS.includes(row._id)) {
      // REVENUE manfiy saqlanadi (kapital bilan bir ishorada) -> ishorani teskarilaymiz.
      revenue += -row.total;
    } else {
      expenses[row._id] = stripNegativeZero(row.total);
    }
  }

  const totalExpense = Object.values(expenses).reduce((a, b) => a + b, 0);

  // Bo'sh oy: rows bo'sh bo'ladi va hammasi nol chiqadi — throw qilinmaydi.
  return {
    period,
    revenue: stripNegativeZero(revenue),
    expenses,
    totalExpense: stripNegativeZero(totalExpense),
    netProfit: stripNegativeZero(revenue - totalExpense),
  };
}
