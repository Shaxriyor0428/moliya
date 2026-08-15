import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { buyEquipment, collectCash } from '../src/events/asset.js';
import { recordExpense } from '../src/events/expense.js';
import { injectCapital, openingBalance, payLoan, takeLoan } from '../src/events/finance.js';
import { accrueSalary, paySalary } from '../src/events/payroll.js';
import { dropStudent, recognizeRevenue, recordPayment } from '../src/events/student.js';
import { ENTRY_KINDS, JournalEntryModel } from '../src/ledger/journal.model.js';
import { utcDate } from '../src/shared/period.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

const studentId = new Types.ObjectId();
const employeeId = new Types.ObjectId();
const loanId = new Types.ObjectId();
const investorId = new Types.ObjectId();

/** Har bir hodisa turini bir marta chaqiradi (tasks/session-2.md §2.5). */
async function runEveryEventOnce(): Promise<void> {
  await openingBalance({ date: utcDate(2025, 12, 31), amount: 50_000_000 });
  await injectCapital({ investorId, date: utcDate(2026, 1, 5), amount: 500_000_000 });
  await takeLoan({ loanId, date: utcDate(2026, 1, 5), principal: 200_000_000 });
  await buyEquipment({ date: utcDate(2026, 1, 8), amount: 240_000_000 });

  // Naqd to'lov — kassaga tushadi, keyin inkassatsiya qilinadi.
  await recordPayment({ studentId, date: utcDate(2026, 1, 10), amount: 1_800_000, method: 'cash', arBalance: 0 });
  await recordExpense({ kind: 'rent', date: utcDate(2026, 1, 5), amount: 10_000_000, source: 'bank' });
  await payLoan({ loanId, date: utcDate(2026, 1, 20), interest: 3_000_000, principal: 9_000_000 });
  await collectCash({ date: utcDate(2026, 1, 28), amount: 1_500_000 });

  await recognizeRevenue({
    student: { _id: studentId, monthlyFee: 600_000, discountPercent: 0 },
    period: '2026-01',
    deferredBalance: 1_800_000,
  });
  await accrueSalary({ employeeId, period: '2026-01', salary: 8_000_000 });
  await paySalary({ employeeId, forPeriod: '2026-01', date: utcDate(2026, 2, 5), salary: 8_000_000 });
  await dropStudent({ studentId, date: utcDate(2026, 2, 10), deferredBalance: 1_200_000 });
}

/** Bazadagi BARCHA qatorlarni bitta ro'yxatga yig'adi. */
async function allLines() {
  const entries = await JournalEntryModel.find().lean();
  return entries.flatMap((e) => e.lines);
}

describe('Hodisalar — aqlni tekshirish', () => {
  it("har bir hodisa turi yozuv yaratadi va 12 ta turning hammasi ishlatiladi", async () => {
    await runEveryEventOnce();

    const kinds = await JournalEntryModel.distinct('kind');
    expect([...kinds].sort()).toEqual([...ENTRY_KINDS].sort());
  });

  it('bazadagi barcha qatorlar yig\'indisi 0', async () => {
    await runEveryEventOnce();

    const lines = await allLines();
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(0);
  });

  it('har bir yozuv alohida ham balanslashgan va butun sonli', async () => {
    await runEveryEventOnce();

    for (const entry of await JournalEntryModel.find().lean()) {
      expect(entry.lines.length).toBeGreaterThanOrEqual(2);
      expect(entry.lines.every((l) => Number.isInteger(l.amount) && l.amount !== 0)).toBe(true);
      expect(entry.lines.reduce((s, l) => s + l.amount, 0)).toBe(0);
    }
  });
});

describe('payLoan — to\'rt qatorli yozuv (TZ §5.4)', () => {
  it('cash.bank da IKKITA qator: foiz operating, asosiy qarz financing', async () => {
    await payLoan({ loanId, date: utcDate(2026, 2, 20), interest: 3_000_000, principal: 9_000_000 });

    const entry = await JournalEntryModel.findOne({ kind: 'loan_payment' }).lean();
    expect(entry).not.toBeNull();
    expect(entry!.lines).toHaveLength(4);

    const cashLines = entry!.lines.filter((l) => l.account === 'cash.bank');
    expect(cashLines).toHaveLength(2);
    expect(cashLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amount: -3_000_000, cashFlow: 'operating' }),
        expect.objectContaining({ amount: -9_000_000, cashFlow: 'financing' }),
      ]),
    );

    expect(entry!.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ account: 'expense.interest', amount: 3_000_000 }),
        expect.objectContaining({ account: 'loan_principal', amount: 9_000_000 }),
      ]),
    );
  });
});

describe('Nol summali qatorlar tashlanadi', () => {
  it("recordPayment: qarz yo'q bo'lsa ar.students qatori yozilmaydi", async () => {
    const doc = await recordPayment({
      studentId, date: utcDate(2026, 1, 10), amount: 1_800_000, method: 'bank', arBalance: 0,
    });
    expect(doc.lines.map((l) => l.account)).toEqual(['cash.bank', 'deferred_revenue']);
  });

  it("recordPayment: to'lov to'liq qarzga ketsa deferred_revenue qatori yozilmaydi", async () => {
    const doc = await recordPayment({
      studentId, date: utcDate(2026, 2, 10), amount: 600_000, method: 'bank', arBalance: 600_000,
    });
    expect(doc.lines.map((l) => l.account)).toEqual(['cash.bank', 'ar.students']);
  });

  it('recognizeRevenue: oldindan to\'lov yetsa ar.students qatori yozilmaydi', async () => {
    const doc = await recognizeRevenue({
      student: { _id: studentId, monthlyFee: 600_000, discountPercent: 0 },
      period: '2026-01',
      deferredBalance: 1_800_000,
    });
    expect(doc!.lines.map((l) => l.account)).toEqual(['deferred_revenue', 'revenue.tuition']);
  });

  it('recognizeRevenue: oldindan to\'lov yo\'q bo\'lsa deferred_revenue qatori yozilmaydi', async () => {
    const doc = await recognizeRevenue({
      student: { _id: studentId, monthlyFee: 600_000, discountPercent: 0 },
      period: '2026-01',
      deferredBalance: 0,
    });
    expect(doc!.lines.map((l) => l.account)).toEqual(['ar.students', 'revenue.tuition']);
  });
});

describe('Alohida qoidalar', () => {
  it('collectCash ikkala qatorida ham cashFlow null (undefined emas)', async () => {
    const doc = await collectCash({ date: utcDate(2026, 1, 28), amount: 15_000_000 });
    const saved = await JournalEntryModel.findById(doc._id).lean();
    expect(saved!.lines.map((l) => l.cashFlow)).toEqual([null, null]);
  });

  it('recordPayment: cashFlow operating TO\'LIQ summaga (TZ §5.1)', async () => {
    const doc = await recordPayment({
      studentId, date: utcDate(2026, 1, 10), amount: 1_800_000, method: 'bank', arBalance: 0,
    });
    const cashLine = doc.lines.find((l) => l.account === 'cash.bank');
    expect(cashLine).toMatchObject({ amount: 1_800_000, cashFlow: 'operating' });
  });

  it('chiqib ketgan o\'quvchi uchun daromad tan olinmaydi', async () => {
    const doc = await recognizeRevenue({
      student: {
        _id: studentId,
        monthlyFee: 600_000,
        discountPercent: 0,
        droppedAt: utcDate(2026, 1, 15),
      },
      period: '2026-01',
      deferredBalance: 1_800_000,
    });
    expect(doc).toBeNull();
    expect(await JournalEntryModel.countDocuments()).toBe(0);
  });

  it('chegirma: floor(monthlyFee × (100 − discount) / 100)', async () => {
    const doc = await recognizeRevenue({
      student: { _id: studentId, monthlyFee: 1_000_000, discountPercent: 15 },
      period: '2026-01',
      deferredBalance: 0,
    });
    // 1 000 000 × 85 / 100 = 850 000
    expect(doc!.lines.find((l) => l.account === 'revenue.tuition')!.amount).toBe(-850_000);
  });

  it('oy oxiri yozuvlari UTC bo\'yicha to\'g\'ri oyga tushadi', async () => {
    const doc = await accrueSalary({ employeeId, period: '2026-01', salary: 8_000_000 });
    expect(doc.period).toBe('2026-01');
    expect(doc.date.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});
