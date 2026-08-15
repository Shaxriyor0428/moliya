import { accountsOfType, type AccountCode, type AccountType } from '../ledger/accounts.js';
import { JournalEntryModel } from '../ledger/journal.model.js';
import { stripNegativeZero } from '../shared/money.js';

/**
 * Balans — docs/04-reports.md §3.
 *
 * Berilgan sanaga qadar barcha qatorlarning kümülativ yig'indisi.
 *
 * `assets === liabilitiesAndEquity` KONSTRUKSIYA BO'YICHA bajariladi, chunki
 * har bir yozuv nolga yig'iladi. `check.difference` ni chiqishga ataylab
 * qo'shamiz — tekshirish uchun eng oson joy shu.
 */

export interface BalanceSection {
  total: number;
}

export interface BalanceReport {
  asOf: string;
  assets: Partial<Record<AccountCode, number>> & BalanceSection;
  liabilities: Partial<Record<AccountCode, number>> & BalanceSection;
  equity: {
    capital: number;
    /** Hisob sifatida SAQLANMAYDI — barcha REVENUE + EXPENSE qatorlaridan hisoblanadi. */
    retainedEarnings: number;
    total: number;
  };
  check: {
    assets: number;
    liabilitiesAndEquity: number;
    difference: number;
  };
}

/**
 * `asOf` ni kunning oxiriga suradi. Yozuvlar kun boshida (00:00:00Z)
 * yaratiladi, lekin sana kun ichida berilsa ham o'sha kun to'liq kirishi kerak.
 */
export function endOfDay(asOf: Date): Date {
  const d = new Date(asOf);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export async function balance(asOf: Date): Promise<BalanceReport> {
  const rows = await JournalEntryModel.aggregate<{ _id: AccountCode; total: number }>([
    { $match: { date: { $lte: endOfDay(asOf) } } },
    { $unwind: '$lines' },
    { $group: { _id: '$lines.account', total: { $sum: '$lines.amount' } } },
  ]);

  const byAccount = new Map<AccountCode, number>(rows.map((r) => [r._id, r.total]));
  const sumOf = (type: AccountType): number =>
    accountsOfType(type).reduce((s, code) => s + (byAccount.get(code) ?? 0), 0);

  // ASSET o'sishi +, LIABILITY/EQUITY/REVENUE o'sishi − (docs/02-model.md).
  const assetsTotal = sumOf('ASSET');
  const liabilitiesTotal = -sumOf('LIABILITY');
  const capital = -(byAccount.get('capital') ?? 0);
  const retainedEarnings = -(sumOf('REVENUE') + sumOf('EXPENSE'));
  const equityTotal = capital + retainedEarnings;
  const liabilitiesAndEquity = liabilitiesTotal + equityTotal;

  return {
    asOf: asOf.toISOString().slice(0, 10),
    assets: { ...section('ASSET', byAccount, 1), total: stripNegativeZero(assetsTotal) },
    liabilities: { ...section('LIABILITY', byAccount, -1), total: stripNegativeZero(liabilitiesTotal) },
    equity: {
      capital: stripNegativeZero(capital),
      retainedEarnings: stripNegativeZero(retainedEarnings),
      total: stripNegativeZero(equityTotal),
    },
    check: {
      assets: stripNegativeZero(assetsTotal),
      liabilitiesAndEquity: stripNegativeZero(liabilitiesAndEquity),
      difference: stripNegativeZero(assetsTotal - liabilitiesAndEquity),
    },
  };
}

/** Turdagi har bir hisobni chiqishga qo'yadi — ko'rsatish ishorasiga keltirib. */
function section(
  type: AccountType,
  byAccount: Map<AccountCode, number>,
  sign: 1 | -1,
): Partial<Record<AccountCode, number>> {
  const out: Partial<Record<AccountCode, number>> = {};
  for (const code of accountsOfType(type)) {
    out[code] = stripNegativeZero(sign * (byAccount.get(code) ?? 0));
  }
  return out;
}
