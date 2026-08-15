import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import { payLoan, takeLoan } from '../../src/events/finance.js';
import { JournalEntryModel } from '../../src/ledger/journal.model.js';
import { balance } from '../../src/reports/balance.js';
import { cashFlow } from '../../src/reports/cashflow.js';
import { pnl } from '../../src/reports/pnl.js';
import { utcDate } from '../../src/shared/period.js';
import { useTestDb } from '../helpers/db.js';
import { expectAllEqualitiesHold } from '../helpers/equalities.js';

/**
 * TZ §5.4 — Kredit to'lovi. Eng ta'sirli stsenariy.
 *
 * 2026-02-01: 200 000 000 kredit, yillik 18%.
 * 2026-02-20: 12 000 000 to'lov = 3 000 000 foiz + 9 000 000 asosiy qarz.
 *
 * BITTA to'lov IKKITA pul oqimi toifasiga bo'linadi: foiz operatsion,
 * asosiy qarz moliyaviy. Shuning uchun yozuvda pul qatori ikkiga bo'linadi.
 * Bitta qator qilib yozilsa, unga bitta toifa berishga majbur bo'lardik va
 * quyidagi to'rtta tekshiruvdan biri albatta yiqilardi.
 */

useTestDb();

const loanId = new Types.ObjectId();
const PRINCIPAL = 200_000_000;
const INTEREST_PAYMENT = 3_000_000;
const PRINCIPAL_PAYMENT = 9_000_000;

beforeEach(async () => {
  await takeLoan({ loanId, date: utcDate(2026, 2, 1), principal: PRINCIPAL });
  await payLoan({
    loanId,
    date: utcDate(2026, 2, 20),
    interest: INTEREST_PAYMENT,
    principal: PRINCIPAL_PAYMENT,
  });
});

describe("TZ §5.4 — kredit to'lovi", () => {
  it('Fevral P&L: shu kreditdan xarajat 3 000 000 (faqat foiz)', async () => {
    const report = await pnl('2026-02');
    expect(report.expenses['expense.interest']).toBe(INTEREST_PAYMENT);
    // Asosiy qarz xarajat emas — u majburiyatning kamayishi.
    expect(report.totalExpense).toBe(INTEREST_PAYMENT);
  });

  it('28-fevral balans: kredit qarzi 191 000 000', async () => {
    expect((await balance(utcDate(2026, 2, 28))).liabilities['loan_principal']).toBe(191_000_000);
  });

  it('Fevral pul oqimi: moliyaviy +191 000 000', async () => {
    // +200 000 000 (kredit olindi) − 9 000 000 (asosiy qarz to'landi)
    expect((await cashFlow('2026-02')).financing).toBe(191_000_000);
  });

  it('Fevral pul oqimi: operatsion chiqim 3 000 000 (foiz)', async () => {
    expect(-(await cashFlow('2026-02')).operating).toBe(INTEREST_PAYMENT);
  });

  it("to'lov yozuvi TO'RT qatorli: pul ikkita toifaga bo'lingan", async () => {
    const entry = await JournalEntryModel.findOne({ kind: 'loan_payment' }).lean();

    expect(entry!.lines).toHaveLength(4);
    expect(entry!.lines.filter((l) => l.account === 'cash.bank')).toEqual([
      expect.objectContaining({ amount: -INTEREST_PAYMENT, cashFlow: 'operating' }),
      expect.objectContaining({ amount: -PRINCIPAL_PAYMENT, cashFlow: 'financing' }),
    ]);
    expect(entry!.lines.reduce((s, l) => s + l.amount, 0)).toBe(0);
  });

  it('uchala tenglik bajariladi', expectAllEqualitiesHold);
});
