import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import { injectCapital } from '../../src/events/finance.js';
import { balance } from '../../src/reports/balance.js';
import { cashFlow } from '../../src/reports/cashflow.js';
import { pnl } from '../../src/reports/pnl.js';
import { utcDate } from '../../src/shared/period.js';
import { useTestDb } from '../helpers/db.js';
import { expectAllEqualitiesHold } from '../helpers/equalities.js';

/**
 * TZ §5.3 — Investor kapitali.
 *
 * 2026-01-05 da 500 000 000 kiritildi. Bu DAROMAD EMAS: P&L ga umuman
 * tegmaydi, pul oqimida esa moliyaviy kirim.
 */

useTestDb();

const investorId = new Types.ObjectId();
const AMOUNT = 500_000_000;

beforeEach(async () => {
  await injectCapital({ investorId, date: utcDate(2026, 1, 5), amount: AMOUNT });
});

describe('TZ §5.3 — investor kapitali', () => {
  it('Yanvar P&L: daromad 0', async () => {
    expect((await pnl('2026-01')).revenue).toBe(0);
  });

  it('Yanvar P&L: sof foyda 0', async () => {
    expect((await pnl('2026-01')).netProfit).toBe(0);
  });

  it('31-yanvar balans: kapital 500 000 000', async () => {
    expect((await balance(utcDate(2026, 1, 31))).equity.capital).toBe(AMOUNT);
  });

  it('Yanvar pul oqimi: moliyaviy kirim 500 000 000', async () => {
    expect((await cashFlow('2026-01')).financing).toBe(AMOUNT);
  });

  it('Yanvar pul oqimi: operatsion 0', async () => {
    expect((await cashFlow('2026-01')).operating).toBe(0);
  });

  it('uchala tenglik bajariladi', expectAllEqualitiesHold);
});
