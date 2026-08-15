import { JournalEntryModel } from '../ledger/journal.model.js';
import type { Period } from '../shared/period.js';

/**
 * Bazadagi barcha oylar, o'sish tartibida. Frontend selecti va reconcile uchun.
 * "YYYY-MM" formatida leksikografik tartib xronologik tartib bilan bir xil.
 */
export async function listPeriods(): Promise<Period[]> {
  const periods = (await JournalEntryModel.distinct('period')) as Period[];
  return periods.sort();
}
