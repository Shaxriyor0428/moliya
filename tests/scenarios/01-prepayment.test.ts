import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import { recognizeRevenue, recordPayment } from '../../src/events/student.js';
import { balance } from '../../src/reports/balance.js';
import { cashFlow } from '../../src/reports/cashflow.js';
import { pnl } from '../../src/reports/pnl.js';
import { utcDate } from '../../src/shared/period.js';
import { useTestDb } from '../helpers/db.js';
import { expectAllEqualitiesHold } from '../helpers/equalities.js';

/**
 * TZ §5.1 — Oldindan to'lov.
 *
 * O'quvchi 2026-01-10 da 1 800 000 to'ladi: yanvar, fevral va mart uchun,
 * oyiga 600 000. Pul birdaniga keladi, daromad esa uch oyga bo'linib tan
 * olinadi — bu modelning asosiy nuqtasi.
 */

useTestDb();

const studentId = new Types.ObjectId();
const student = { _id: studentId, monthlyFee: 600_000, discountPercent: 0 };

beforeEach(async () => {
  await recordPayment({
    studentId,
    date: utcDate(2026, 1, 10),
    amount: 1_800_000,
    method: 'bank',
    arBalance: 0,
  });

  // Har oy oxirida 600 000 tan olinadi; qoldiq shunga yarasha kamayadi.
  let deferredBalance = 1_800_000;
  for (const period of ['2026-01', '2026-02', '2026-03']) {
    await recognizeRevenue({ student, period, deferredBalance });
    deferredBalance -= 600_000;
  }
});

describe("TZ §5.1 — oldindan to'lov", () => {
  it('Yanvar P&L: daromad 600 000', async () => {
    expect((await pnl('2026-01')).revenue).toBe(600_000);
  });

  it("31-yanvar balans: oldindan to'langan darslar 1 200 000", async () => {
    expect((await balance(utcDate(2026, 1, 31))).liabilities['deferred_revenue']).toBe(1_200_000);
  });

  it('Yanvar pul oqimi: operatsion kirim 1 800 000', async () => {
    // TO'LIQ summa pul oqimiga tushadi, P&L ga esa faqat 600 000.
    expect((await cashFlow('2026-01')).operating).toBe(1_800_000);
  });

  it("31-mart balans: oldindan to'langan darslar 0", async () => {
    expect((await balance(utcDate(2026, 3, 31))).liabilities['deferred_revenue']).toBe(0);
  });

  it('Yanvar–mart jami daromad 1 800 000', async () => {
    const months = await Promise.all(['2026-01', '2026-02', '2026-03'].map((p) => pnl(p)));
    expect(months.reduce((s, m) => s + m.revenue, 0)).toBe(1_800_000);
  });

  it('uchala tenglik bajariladi', expectAllEqualitiesHold);
});
