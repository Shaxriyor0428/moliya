import { CASH_ACCOUNT_CODES, type CashFlowCategory } from '../ledger/accounts.js';
import { JournalEntryModel } from '../ledger/journal.model.js';
import { stripNegativeZero } from '../shared/money.js';
import type { Period } from '../shared/period.js';

/**
 * Pul oqimi — to'g'ridan-to'g'ri usul (docs/04-reports.md §2).
 *
 * Har bir pul qatori o'zi toifalangan (`cashFlow`). Bilvosita usul (sof
 * foydadan boshlab tuzatishlar qo'shish) rad etildi: u P&L ga bog'lanib qolardi
 * va kredit to'lovini ikki toifaga bo'lish imkoni yo'qolardi (TZ §5.4).
 */

export interface CashFlowReport {
  period: Period;
  opening: number;
  operating: number;
  investing: number;
  financing: number;
  /**
   * BARCHA pul qatorlarining yig'indisi — toifalar yig'indisidan MUSTAQIL
   * hisoblanadi. Ikkalasi farq qilsa, demak biror pul qatorida `cashFlow`
   * yozilmagan. Reconcile aynan shu farqni ushlaydi.
   */
  netChange: number;
  closing: number;
}

export async function cashFlow(period: Period): Promise<CashFlowReport> {
  const [opening, flows] = await Promise.all([
    openingBalanceOf(period),
    flowsIn(period),
  ]);

  return {
    period,
    opening: stripNegativeZero(opening),
    operating: stripNegativeZero(flows.operating),
    investing: stripNegativeZero(flows.investing),
    financing: stripNegativeZero(flows.financing),
    netChange: stripNegativeZero(flows.netChange),
    closing: stripNegativeZero(opening + flows.netChange),
  };
}

/**
 * Oy boshidagi qoldiq — shu oygacha bo'lgan barcha pul qatorlarining yig'indisi.
 * `period` "YYYY-MM" formatida bo'lgani uchun leksikografik `$lt` xronologik
 * solishtiruv bilan mos tushadi — format shuning uchun tanlangan.
 */
async function openingBalanceOf(period: Period): Promise<number> {
  const [row] = await JournalEntryModel.aggregate<{ total: number }>([
    { $match: { period: { $lt: period } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: CASH_ACCOUNT_CODES } } },
    { $group: { _id: null, total: { $sum: '$lines.amount' } } },
  ]);
  return row?.total ?? 0;
}

interface Flows {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
}

async function flowsIn(period: Period): Promise<Flows> {
  const rows = await JournalEntryModel.aggregate<{
    _id: CashFlowCategory | null;
    total: number;
  }>([
    { $match: { period } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': { $in: CASH_ACCOUNT_CODES } } },
    { $group: { _id: '$lines.cashFlow', total: { $sum: '$lines.amount' } } },
  ]);

  const flows: Flows = { operating: 0, investing: 0, financing: 0, netChange: 0 };

  for (const row of rows) {
    // netChange HAMMA pul qatoridan yig'iladi — toifasi bor-yo'qligidan qat'i nazar.
    flows.netChange += row.total;
    // `null` — inkassatsiya: ko'chirish, oqim emas. Toifalarga tushmaydi, lekin
    // netChange ga tabiiy ravishda kiradi (va u yerda o'zaro netlashadi).
    if (row._id !== null) flows[row._id] += row.total;
  }

  return flows;
}
