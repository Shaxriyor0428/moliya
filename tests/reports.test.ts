import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import { collectCash } from '../src/events/asset.js';
import { recordExpense } from '../src/events/expense.js';
import { openingBalance } from '../src/events/finance.js';
import { accrueSalary, paySalary } from '../src/events/payroll.js';
import { recognizeRevenue, recordPayment } from '../src/events/student.js';
import { JournalEntryModel } from '../src/ledger/journal.model.js';
import { balance } from '../src/reports/balance.js';
import { cashFlow } from '../src/reports/cashflow.js';
import { listPeriods } from '../src/reports/periods.js';
import { pnl } from '../src/reports/pnl.js';
import { loadJournal, reconcileJournal } from '../src/scripts/reconcile.js';
import { utcDate } from '../src/shared/period.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

const studentId = new Types.ObjectId();
const employeeId = new Types.ObjectId();

/**
 * tz.md §2.3 dagi yanvar misoli — "foyda ≠ pul" ni ko'rsatuvchi asosiy stsenariy.
 * Yozuvlar ketma-ketligi docs/model-prototype.js dan olingan (o'sha yerda
 * kutilgan raqamlar tasdiqlangan).
 */
async function januaryExample(): Promise<void> {
  // Dekabr: boshlang'ich pul va dekabr ish haqi hisoblandi (yanvarda to'lanadi).
  await openingBalance({ date: utcDate(2025, 12, 31), amount: 50_000_000 });
  await accrueSalary({ employeeId, period: '2025-12', salary: 30_000_000 });

  // Yanvar
  await recordPayment({
    studentId, date: utcDate(2026, 1, 3), amount: 100_000_000, method: 'bank', arBalance: 0,
  });
  await paySalary({ employeeId, forPeriod: '2025-12', date: utcDate(2026, 1, 5), salary: 30_000_000 });
  await recordExpense({ kind: 'rent', date: utcDate(2026, 1, 5), amount: 10_000_000, source: 'bank' });
  await recordExpense({ kind: 'marketing', date: utcDate(2026, 1, 15), amount: 5_000_000, source: 'bank' });
  await recognizeRevenue({
    student: { _id: studentId, monthlyFee: 60_000_000, discountPercent: 0 },
    period: '2026-01',
    deferredBalance: 100_000_000,
  });
  await accrueSalary({ employeeId, period: '2026-01', salary: 32_000_000 });
}

describe('tz.md §2.3 — yanvar misoli (foyda ≠ pul)', () => {
  beforeEach(januaryExample);

  it('Yanvar P&L: sof foyda 13 000 000', async () => {
    const report = await pnl('2026-01');

    expect(report.revenue).toBe(60_000_000);
    expect(report.expenses).toEqual({
      'expense.salary': 32_000_000,
      'expense.rent': 10_000_000,
      'expense.marketing': 5_000_000,
    });
    expect(report.totalExpense).toBe(47_000_000);
    expect(report.netProfit).toBe(13_000_000);
  });

  it('Yanvar pul oqimi: 50 000 000 + 55 000 000 = 105 000 000', async () => {
    const report = await cashFlow('2026-01');

    expect(report.opening).toBe(50_000_000);
    expect(report.netChange).toBe(55_000_000);
    expect(report.closing).toBe(105_000_000);
    // Yanvarda faqat operatsion harakat bor: +100 −30 −10 −5.
    expect(report.operating).toBe(55_000_000);
    expect(report.investing).toBe(0);
    expect(report.financing).toBe(0);
  });

  it('31-yanvar balansi: oldindan to\'langan 40 mln, to\'lanmagan ish haqi 32 mln', async () => {
    const report = await balance(utcDate(2026, 1, 31));

    expect(report.liabilities['deferred_revenue']).toBe(40_000_000);
    expect(report.liabilities['salary_payable']).toBe(32_000_000);
    expect(report.assets['cash.bank']).toBe(105_000_000);
    expect(report.check.difference).toBe(0);
    expect(report.check.assets).toBe(report.check.liabilitiesAndEquity);
  });

  it('foyda va pul BIR XIL EMAS — modelning asosiy nuqtasi', async () => {
    const p = await pnl('2026-01');
    const c = await cashFlow('2026-01');

    expect(p.netProfit).toBe(13_000_000);
    expect(c.netChange).toBe(55_000_000);
    expect(p.netProfit).not.toBe(c.netChange);
  });

  it('dekabr ham to\'g\'ri: ish haqi hisoblangan, lekin to\'lanmagan', async () => {
    const p = await pnl('2025-12');
    const c = await cashFlow('2025-12');

    expect(p.netProfit).toBe(-30_000_000);
    expect(c.opening).toBe(0);
    expect(c.financing).toBe(50_000_000);
    expect(c.closing).toBe(50_000_000);
  });

  it('listPeriods bazadagi oylarni tartib bilan qaytaradi', async () => {
    expect(await listPeriods()).toEqual(['2025-12', '2026-01']);
  });
});

describe('Hisobotlarning chekka holatlari', () => {
  it('bo\'sh oy uchun nol qaytaradi, throw qilmaydi', async () => {
    expect(await pnl('2030-05')).toEqual({
      period: '2030-05',
      revenue: 0,
      expenses: {},
      totalExpense: 0,
      netProfit: 0,
    });

    const c = await cashFlow('2030-05');
    expect([c.opening, c.operating, c.investing, c.financing, c.netChange, c.closing]).toEqual([
      0, 0, 0, 0, 0, 0,
    ]);

    const b = await balance(utcDate(2030, 5, 31));
    expect(b.check).toEqual({ assets: 0, liabilitiesAndEquity: 0, difference: 0 });
  });

  it('chiqishda -0 ko\'rinmaydi', async () => {
    await januaryExample();
    const b = await balance(utcDate(2026, 1, 31));

    const allNumbers = [
      ...Object.values(b.assets),
      ...Object.values(b.liabilities),
      ...Object.values(b.equity),
      ...Object.values(b.check),
    ];
    expect(allNumbers.some((n) => Object.is(n, -0))).toBe(false);
  });

  it('inkassatsiya toifalarni shishirmaydi, netChange ga tegmaydi', async () => {
    await recordPayment({
      studentId, date: utcDate(2026, 1, 3), amount: 20_000_000, method: 'cash', arBalance: 0,
    });
    await collectCash({ date: utcDate(2026, 1, 28), amount: 15_000_000 });

    const c = await cashFlow('2026-01');
    expect(c.operating).toBe(20_000_000);
    expect(c.investing).toBe(0);
    expect(c.financing).toBe(0);
    expect(c.netChange).toBe(20_000_000);

    const b = await balance(utcDate(2026, 1, 31));
    expect(b.assets['cash.register']).toBe(5_000_000);
    expect(b.assets['cash.bank']).toBe(15_000_000);
  });
});

describe('reconcile — uchta tenglik', () => {
  it('toza ma\'lumotda o\'tadi', async () => {
    await januaryExample();

    const report = reconcileJournal(await loadJournal());

    expect(report.periods).toEqual(['2025-12', '2026-01']);
    expect(report.balanceEquation).toMatchObject({ checked: 2, mismatched: 0, totalDifference: 0 });
    expect(report.cashFlowLink).toMatchObject({ checked: 2, mismatched: 0, totalDifference: 0 });
    expect(report.profitLink).toMatchObject({ checked: 2, mismatched: 0, totalDifference: 0 });
    expect(report.integrity).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('bo\'sh bazada ham o\'tadi', async () => {
    const report = reconcileJournal(await loadJournal());
    expect(report.periods).toEqual([]);
    expect(report.ok).toBe(true);
  });
});

/**
 * Ataylab buzilgan ma'lumot. Yozuvlar drayver orqali to'g'ridan-to'g'ri
 * qo'yiladi — `postEntry()` ham, sxema hook ham ularni o'tkazmasdi. Aynan shu
 * holatni reconcile ushlashi kerak: agar u hisobot funksiyalarini chaqirganda,
 * bu buzilishlarning ko'pchiligi ko'rinmay qolardi.
 */
async function insertRaw(doc: Record<string, unknown>): Promise<void> {
  await JournalEntryModel.collection.insertOne(doc);
}

describe('reconcile — buzilgan ma\'lumotni ushlaydi', () => {
  it('balanslashmagan yozuv: FAILED, balans tenglamasi va yaxlitlik', async () => {
    await januaryExample();
    await insertRaw({
      date: utcDate(2026, 1, 20),
      period: '2026-01',
      kind: 'operating_expense',
      description: 'buzilgan yozuv',
      lines: [
        { account: 'expense.rent', amount: 1_000_000 },
        { account: 'cash.bank', amount: -900_000, cashFlow: 'operating' },
      ],
    });

    const report = reconcileJournal(await loadJournal());

    expect(report.ok).toBe(false);
    expect(report.balanceEquation.mismatched).toBe(1);
    // Aktiv 900 000 ga kamaydi, xarajat esa 1 000 000 ga o'sdi (taqsimlanmagan
    // foydani shuncha kamaytirdi) -> tenglama 100 000 ga og'di.
    expect(report.balanceEquation.totalDifference).toBe(100_000);
    expect(report.balanceEquation.offenders).toEqual([{ period: '2026-01', difference: 100_000 }]);
    expect(report.integrity.join('\n')).toMatch(/balanslashmagan/);
  });

  it('pul qatorida cashFlow yo\'q: pul oqimi bog\'lanishi yiqiladi', async () => {
    await insertRaw({
      date: utcDate(2026, 1, 10),
      period: '2026-01',
      kind: 'student_payment',
      description: 'cashFlow unutilgan',
      lines: [
        { account: 'cash.bank', amount: 1_000_000 },
        { account: 'deferred_revenue', amount: -1_000_000 },
      ],
    });

    const report = reconcileJournal(await loadJournal());

    expect(report.ok).toBe(false);
    expect(report.cashFlowLink.mismatched).toBe(1);
    expect(report.cashFlowLink.totalDifference).toBe(-1_000_000);
    expect(report.integrity.join('\n')).toMatch(/cashFlow yo'q/);
  });

  it('period sanadan farq qilsa (timezone xatosi) ushlanadi', async () => {
    await insertRaw({
      date: utcDate(2026, 2, 1),
      period: '2026-01', // noto'g'ri: sana fevralda
      kind: 'operating_expense',
      description: 'timezone xatosi',
      lines: [
        { account: 'expense.rent', amount: 1_000_000 },
        { account: 'cash.bank', amount: -1_000_000, cashFlow: 'operating' },
      ],
    });

    const report = reconcileJournal(await loadJournal());

    expect(report.ok).toBe(false);
    expect(report.integrity.join('\n')).toMatch(/timezone xatosi/);
  });

  it('float amount va noma\'lum hisob ushlanadi', async () => {
    await insertRaw({
      date: utcDate(2026, 1, 10),
      period: '2026-01',
      kind: 'operating_expense',
      description: 'float va noma\'lum hisob',
      lines: [
        { account: 'expense.bad_debt', amount: 100.5 },
        { account: 'cash.bank', amount: -100.5, cashFlow: 'operating' },
      ],
    });

    const report = reconcileJournal(await loadJournal());

    expect(report.ok).toBe(false);
    const integrity = report.integrity.join('\n');
    expect(integrity).toMatch(/noma'lum hisob/);
    expect(integrity).toMatch(/butun son emas/);
  });

  it('pul bo\'lmagan hisobda cashFlow ushlanadi', async () => {
    await insertRaw({
      date: utcDate(2026, 1, 10),
      period: '2026-01',
      kind: 'student_payment',
      description: 'cashFlow noto\'g\'ri joyda',
      lines: [
        { account: 'cash.bank', amount: 1_000_000, cashFlow: 'operating' },
        { account: 'deferred_revenue', amount: -1_000_000, cashFlow: 'operating' },
      ],
    });

    const report = reconcileJournal(await loadJournal());

    expect(report.ok).toBe(false);
    expect(report.integrity.join('\n')).toMatch(/pul hisobi emas, lekin cashFlow bor/);
  });

  it('majburiyat manfiyga tushsa ushlanadi', async () => {
    // Hech qanday to'lov bo'lmagan holda oldindan to'lov yopilmoqda.
    await insertRaw({
      date: utcDate(2026, 1, 10),
      period: '2026-01',
      kind: 'student_dropout',
      description: 'yo\'q majburiyatni yopish',
      lines: [
        { account: 'deferred_revenue', amount: 5_000_000 },
        { account: 'cash.bank', amount: -5_000_000, cashFlow: 'operating' },
      ],
    });

    const report = reconcileJournal(await loadJournal());

    expect(report.ok).toBe(false);
    expect(report.integrity.join('\n')).toMatch(/deferred_revenue manfiy/);
  });

  it('foyda bog\'lanishi buzilsa ushlanadi (P&L qatorlari bir-birini yopmasa)', async () => {
    // Daromad tan olingan, lekin qarshisiga hech narsa qo'yilmagan:
    // yozuv balanslashmagan, shu sabab foyda va balans tengliklari ham yiqiladi.
    await insertRaw({
      date: utcDate(2026, 1, 31),
      period: '2026-01',
      kind: 'revenue_recognition',
      description: 'yolg\'iz daromad qatori',
      lines: [{ account: 'revenue.tuition', amount: -600_000 }],
    });

    const report = reconcileJournal(await loadJournal());

    expect(report.ok).toBe(false);
    expect(report.balanceEquation.mismatched).toBe(1);
    expect(report.integrity.join('\n')).toMatch(/qatorlar soni 2 dan kam/);
  });
});
