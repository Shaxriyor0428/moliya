import { expect } from 'vitest';
import { loadJournal, reconcileJournal } from '../../src/scripts/reconcile.js';

/**
 * Har bir stsenariy testining oxirida uchala tenglikni ham tekshiradi.
 * Arzon (bazada bir necha yozuv bor) va kuchli: stsenariy raqamlari to'g'ri
 * chiqib, tenglik buzilgan holat darhol ko'rinadi.
 */
export async function expectAllEqualitiesHold(): Promise<void> {
  const report = reconcileJournal(await loadJournal());

  expect(report.integrity).toEqual([]);
  expect(report.balanceEquation.totalDifference).toBe(0);
  expect(report.cashFlowLink.totalDifference).toBe(0);
  expect(report.profitLink.totalDifference).toBe(0);
  expect(report.ok).toBe(true);
}
