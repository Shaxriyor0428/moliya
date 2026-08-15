import { pathToFileURL } from 'node:url';
import { connectDb, disconnectDb } from '../db/connection.js';
import {
  ACCOUNT_TYPE,
  CASH_ACCOUNTS,
  isAccountCode,
  type AccountCode,
  type CashFlowCategory,
} from '../ledger/accounts.js';
import { JournalEntryModel } from '../ledger/journal.model.js';
import { toPeriod, type Period } from '../shared/period.js';

/**
 * `npm run reconcile` — TZ §4.
 *
 * ⚠️ QAT'IY QOIDA: bu skript `pnl()`, `cashFlow()`, `balance()` funksiyalarini
 * CHAQIRMAYDI. U jurnalning xom `lines` massivi ustidan hammasini o'zi
 * hisoblaydi — shu sabab hisobotlar bilan hech qanday umumiy kodi yo'q.
 *
 * Sabab: agar reconcile hisobot funksiyalarini ishlatsa, hisobot kodidagi xato
 * o'sha xato bilan tekshirilardi va hech qachon ko'rinmasdi — tekshiruv o'zini
 * o'zi tasdiqlagan bo'lardi. Ikkinchi, mustaqil hisoblash yo'li kerak.
 *
 * Shu sababli bu yerda agregatsiya pipeline'i ham ishlatilmaydi: yozuvlar xom
 * holda o'qiladi va oddiy sikl bilan yig'iladi.
 */

// ---------------------------------------------------------------- xom o'qish

export interface RawLine {
  account: string;
  amount: number;
  cashFlow?: CashFlowCategory | null;
}

export interface RawEntry {
  _id?: unknown;
  date: Date;
  period: string;
  kind: string;
  lines: RawLine[];
}

export async function loadJournal(): Promise<RawEntry[]> {
  const entries = await JournalEntryModel.find({}, { date: 1, period: 1, kind: 1, lines: 1 })
    .sort({ date: 1 })
    .lean();
  return entries as unknown as RawEntry[];
}

// -------------------------------------------------------------------- natija

export interface EqualityResult {
  checked: number;
  mismatched: number;
  totalDifference: number;
  offenders: Array<{ period: Period; difference: number }>;
}

export interface ReconcileReport {
  periods: Period[];
  balanceEquation: EqualityResult;
  cashFlowLink: EqualityResult;
  profitLink: EqualityResult;
  integrity: string[];
  entryCount: number;
  lineCount: number;
  ok: boolean;
}

const emptyResult = (): EqualityResult => ({
  checked: 0,
  mismatched: 0,
  totalDifference: 0,
  offenders: [],
});

function record(result: EqualityResult, period: Period, difference: number): void {
  result.checked += 1;
  if (difference !== 0) {
    result.mismatched += 1;
    result.totalDifference += difference;
    result.offenders.push({ period, difference });
  }
}

// ---------------------------------------------------------------- hisoblash

type EntryFilter = (entry: RawEntry) => boolean;
type LineFilter = (line: RawLine) => boolean;

/** Xom qatorlar ustidan yig'indi. Bu — reconcile ning yagona hisoblash vositasi. */
function sumLines(entries: RawEntry[], keepEntry: EntryFilter, keepLine: LineFilter): number {
  let sum = 0;
  for (const entry of entries) {
    if (!keepEntry(entry)) continue;
    for (const line of entry.lines) {
      if (keepLine(line)) sum += line.amount;
    }
  }
  return sum;
}

const typeOfLine = (line: RawLine) => ACCOUNT_TYPE[line.account as AccountCode];
const isCashLine = (line: RawLine): boolean => CASH_ACCOUNTS.has(line.account as AccountCode);
const isPnlLine = (line: RawLine): boolean => {
  const type = typeOfLine(line);
  return type === 'REVENUE' || type === 'EXPENSE';
};

export function reconcileJournal(entries: RawEntry[]): ReconcileReport {
  const periods = [...new Set(entries.map((e) => e.period))].sort();

  const balanceEquation = emptyResult();
  const cashFlowLink = emptyResult();
  const profitLink = emptyResult();

  let previousRetained = 0;

  for (const period of periods) {
    const upTo: EntryFilter = (e) => e.period <= period;
    const inside: EntryFilter = (e) => e.period === period;
    const before: EntryFilter = (e) => e.period < period;

    // 1) Aktivlar = Majburiyatlar + Kapital (oy oxiriga, kümülativ).
    //    Ishora konvensiyasi bo'yicha LIABILITY/EQUITY/REVENUE manfiy
    //    saqlanadi, shuning uchun ko'rsatish ishorasiga keltiramiz.
    const assets = sumLines(entries, upTo, (l) => typeOfLine(l) === 'ASSET');
    const liabilities = -sumLines(entries, upTo, (l) => typeOfLine(l) === 'LIABILITY');
    const capital = -sumLines(entries, upTo, (l) => typeOfLine(l) === 'EQUITY');
    const retained = -sumLines(entries, upTo, isPnlLine);
    record(balanceEquation, period, assets - (liabilities + capital + retained));

    // 2) Oy boshi + oqimlar = Oy oxiri.
    //    `opening`/`closing` pul qatorlaridan, oqimlar esa TOIFALARDAN alohida
    //    yig'iladi. Toifasi yozilmagan pul qatori ikkalasidan biriga ham
    //    tushmaydi va farq bo'lib ko'rinadi.
    const opening = sumLines(entries, before, isCashLine);
    const closing = sumLines(entries, upTo, isCashLine);
    const flows = sumLines(entries, inside, (l) => isCashLine(l) && Boolean(l.cashFlow));
    // Inkassatsiya: cashFlow ATAYLAB null. Toifa emas, lekin pul harakati —
    // shuning uchun tenglikda alohida hadda hisobga olinadi (o'zaro netlashadi).
    const transfers = sumLines(entries, inside, (l) => isCashLine(l) && l.cashFlow === null);
    record(cashFlowLink, period, opening + flows + transfers - closing);

    // 3) Sof foyda = taqsimlanmagan foydaning o'zgarishi.
    const netProfit = -sumLines(entries, inside, isPnlLine);
    record(profitLink, period, netProfit - (retained - previousRetained));
    previousRetained = retained;
  }

  const integrity = checkIntegrity(entries);

  return {
    periods,
    balanceEquation,
    cashFlowLink,
    profitLink,
    integrity,
    entryCount: entries.length,
    lineCount: entries.reduce((s, e) => s + e.lines.length, 0),
    ok:
      balanceEquation.mismatched === 0 &&
      cashFlowLink.mismatched === 0 &&
      profitLink.mismatched === 0 &&
      integrity.length === 0,
  };
}

// ---------------------------------------------------- yaxlitlik tekshiruvlari

/**
 * docs/04-reports.md dagi qo'shimcha tekshiruvlar jadvali. TZ talab qilmaydi,
 * lekin arzon va uchala tenglik ushlamaydigan xatolarni ushlaydi.
 */
function checkIntegrity(entries: RawEntry[]): string[] {
  const problems: string[] = [];
  const MAX = 20;
  const say = (msg: string) => {
    if (problems.length < MAX) problems.push(msg);
  };

  for (const entry of entries) {
    const where = `${entry.period} ${entry.kind}`;

    if (entry.lines.reduce((s, l) => s + l.amount, 0) !== 0) {
      say(`${where}: yozuv balanslashmagan`);
    }
    if (entry.lines.length < 2) {
      say(`${where}: qatorlar soni 2 dan kam`);
    }
    if (entry.period !== toPeriod(entry.date)) {
      say(`${where}: period sanadan farq qiladi (${entry.period} vs ${toPeriod(entry.date)}) — timezone xatosi`);
    }

    for (const line of entry.lines) {
      if (!isAccountCode(line.account)) {
        say(`${where}: noma'lum hisob "${line.account}"`);
        continue;
      }
      if (!Number.isInteger(line.amount)) {
        say(`${where}: ${line.account} — amount butun son emas (${line.amount})`);
      }
      const cash = CASH_ACCOUNTS.has(line.account);
      if (cash && line.cashFlow === undefined) {
        say(`${where}: ${line.account} pul hisobi, lekin cashFlow yo'q`);
      }
      if (!cash && line.cashFlow !== undefined) {
        say(`${where}: ${line.account} pul hisobi emas, lekin cashFlow bor`);
      }
    }
  }

  // Majburiyat manfiyga tushib ketgani — mantiq xatosining belgisi.
  for (const account of ['deferred_revenue', 'salary_payable'] as const) {
    const balance = -sumLines(entries, () => true, (l) => l.account === account);
    if (balance < 0) {
      say(`${account} manfiy: ${fmt(balance)} — majburiyat kerak bo'lganidan ko'proq yopilgan`);
    }
  }

  if (problems.length === MAX) problems.push('… (ro\'yxat qisqartirildi)');
  return problems;
}

// -------------------------------------------------------------------- chiqish

/** `-0` chiqishda ko'rinmasin. */
const nz = (n: number): number => (n === 0 ? 0 : n);
const fmt = (n: number): string => nz(n).toLocaleString('en-US').replace(/,/g, ' ');

export function formatReport(report: ReconcileReport): string {
  const { periods } = report;
  const out: string[] = [];

  const range = periods.length ? `  (${periods[0]} … ${periods[periods.length - 1]})` : '';
  out.push(`Tekshirilgan oylar: ${periods.length}${range}`, '');

  const rows: Array<[string, EqualityResult]> = [
    ['1) Balans tenglamasi', report.balanceEquation],
    ["2) Pul oqimi bog'lanishi", report.cashFlowLink],
    ["3) Foyda bog'lanishi", report.profitLink],
  ];

  for (const [label, result] of rows) {
    const matched = result.checked - result.mismatched;
    out.push(
      `  ${label.padEnd(26)} ${`${matched}/${result.checked}`.padStart(7)} mos    farq: ${fmt(result.totalDifference)}`,
    );
    for (const offender of result.offenders) {
      out.push(`       ${offender.period}   ${fmt(offender.difference).padStart(16)}`);
    }
  }

  out.push('');
  if (report.integrity.length === 0) {
    out.push(
      `  Yaxlitlik: ${fmt(report.entryCount)} yozuv, ${fmt(report.lineCount)} qator — hammasi balanslashgan`,
    );
  } else {
    out.push(`  Yaxlitlik: ${report.integrity.length} ta muammo`);
    for (const problem of report.integrity) out.push(`       ${problem}`);
  }

  out.push('', report.ok ? 'RECONCILE: OK' : 'RECONCILE: FAILED');
  return out.join('\n');
}

// ---------------------------------------------------------------------- main

export async function runReconcile(): Promise<ReconcileReport> {
  const report = reconcileJournal(await loadJournal());
  console.log(formatReport(report));
  return report;
}

// Faqat to'g'ridan-to'g'ri ishga tushirilganda ulanadi — testlar bu moduldan
// funksiyalarni import qila oladi va yon ta'sir bo'lmaydi.
const isEntryPoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  await connectDb();
  try {
    const report = await runReconcile();
    process.exitCode = report.ok ? 0 : 1;
  } finally {
    await disconnectDb();
  }
}
