import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import { accrueSalary, paySalary } from '../../src/events/payroll.js';
import { balance } from '../../src/reports/balance.js';
import { cashFlow } from '../../src/reports/cashflow.js';
import { pnl } from '../../src/reports/pnl.js';
import { utcDate } from '../../src/shared/period.js';
import { useTestDb } from '../helpers/db.js';
import { expectAllEqualitiesHold } from '../helpers/equalities.js';

/**
 * TZ §5.2 — Ish haqi.
 *
 * Yanvar oyligi 8 000 000, 2026-02-05 da to'lanadi. Xarajat YANVARDA
 * tan olinadi, pul esa FEVRALDA chiqadi — hisoblash usulining (accrual)
 * o'zagi.
 */

useTestDb();

const employeeId = new Types.ObjectId();
const SALARY = 8_000_000;

beforeEach(async () => {
  await accrueSalary({ employeeId, period: '2026-01', salary: SALARY });
  await paySalary({ employeeId, forPeriod: '2026-01', date: utcDate(2026, 2, 5), salary: SALARY });
});

describe('TZ §5.2 — ish haqi', () => {
  it('Yanvar P&L: ish haqi xarajati 8 000 000', async () => {
    expect((await pnl('2026-01')).expenses['expense.salary']).toBe(SALARY);
  });

  it("31-yanvar balans: to'lanmagan ish haqi 8 000 000", async () => {
    expect((await balance(utcDate(2026, 1, 31))).liabilities['salary_payable']).toBe(SALARY);
  });

  it("Yanvar pul oqimi: jami o'zgarish 0", async () => {
    expect((await cashFlow('2026-01')).netChange).toBe(0);
  });

  it('Fevral P&L: shu ish haqidan xarajat 0', async () => {
    // To'lov yozuvida expense.salary umuman yo'q.
    expect((await pnl('2026-02')).expenses['expense.salary'] ?? 0).toBe(0);
  });

  it('Fevral pul oqimi: operatsion chiqim 8 000 000', async () => {
    expect(-(await cashFlow('2026-02')).operating).toBe(SALARY);
  });

  it("28-fevral balans: to'lanmagan ish haqi 0", async () => {
    expect((await balance(utcDate(2026, 2, 28))).liabilities['salary_payable']).toBe(0);
  });

  it('uchala tenglik bajariladi', expectAllEqualitiesHold);
});
