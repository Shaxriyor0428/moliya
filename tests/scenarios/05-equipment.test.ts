import { beforeEach, describe, expect, it } from 'vitest';
import { buyEquipment } from '../../src/events/asset.js';
import { balance } from '../../src/reports/balance.js';
import { cashFlow } from '../../src/reports/cashflow.js';
import { pnl } from '../../src/reports/pnl.js';
import { utcDate } from '../../src/shared/period.js';
import { useTestDb } from '../helpers/db.js';
import { expectAllEqualitiesHold } from '../helpers/equalities.js';

/**
 * TZ §5.5 — Jihoz xaridi.
 *
 * 2026-01-08 da 240 000 000 lik jihoz. Bu XARAJAT EMAS: pul aktivdan
 * aktivga o'tdi. P&L ga tegmaydi, pul oqimida investitsion chiqim.
 * Amortizatsiya TZ §3 bo'yicha doiradan tashqarida.
 */

useTestDb();

const AMOUNT = 240_000_000;

beforeEach(async () => {
  await buyEquipment({ date: utcDate(2026, 1, 8), amount: AMOUNT });
});

describe('TZ §5.5 — jihoz xaridi', () => {
  it('Yanvar P&L: xarajat 0', async () => {
    const report = await pnl('2026-01');
    expect(report.totalExpense).toBe(0);
    expect(report.netProfit).toBe(0);
  });

  it('31-yanvar balans: asosiy vositalar 240 000 000', async () => {
    expect((await balance(utcDate(2026, 1, 31))).assets['fixed_assets']).toBe(AMOUNT);
  });

  it('Yanvar pul oqimi: investitsion chiqim 240 000 000', async () => {
    const report = await cashFlow('2026-01');
    expect(-report.investing).toBe(AMOUNT);
    expect(report.operating).toBe(0);
  });

  it('uchala tenglik bajariladi', expectAllEqualitiesHold);
});
