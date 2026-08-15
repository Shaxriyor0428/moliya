import { describe, expect, it } from 'vitest';
import { JournalEntryModel } from '../src/ledger/journal.model.js';
import { postEntry, type PostEntryInput } from '../src/ledger/post.js';
import { splitAmount } from '../src/shared/money.js';
import { toPeriod, utcDate } from '../src/shared/period.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

/** Har testda takrorlanmaslik uchun: faqat `lines` ni almashtiramiz. */
function entry(lines: PostEntryInput['lines']): PostEntryInput {
  return {
    date: utcDate(2026, 1, 10),
    kind: 'student_payment',
    description: 'test',
    lines,
  };
}

describe('postEntry — balans invarianti', () => {
  it('balanslashgan yozuvni qabul qiladi va period ni date dan hisoblaydi', async () => {
    const doc = await postEntry(
      entry([
        { account: 'cash.bank', amount: 1_800_000, cashFlow: 'operating' },
        { account: 'deferred_revenue', amount: -1_800_000 },
      ]),
    );

    expect(doc.period).toBe('2026-01');
    expect(await JournalEntryModel.countDocuments()).toBe(1);

    const saved = await JournalEntryModel.findById(doc._id).lean();
    expect(saved!.lines.reduce((s, l) => s + l.amount, 0)).toBe(0);
  });

  it('balanslashmagan yozuvni RAD ETADI', async () => {
    await expect(
      postEntry(
        entry([
          { account: 'cash.bank', amount: 1_800_000, cashFlow: 'operating' },
          { account: 'deferred_revenue', amount: -1_700_000 },
        ]),
      ),
    ).rejects.toThrow(/balanslashmagan/i);

    expect(await JournalEntryModel.countDocuments()).toBe(0);
  });

  it('bitta qatorli yozuvni rad etadi', async () => {
    await expect(
      postEntry(entry([{ account: 'cash.bank', amount: 0, cashFlow: 'operating' }])),
    ).rejects.toThrow(/kamida 2 ta qator/i);
  });

  it('float amount ni rad etadi', async () => {
    await expect(
      postEntry(
        entry([
          { account: 'cash.bank', amount: 1_000_000.5, cashFlow: 'operating' },
          { account: 'deferred_revenue', amount: -1_000_000.5 },
        ]),
      ),
    ).rejects.toThrow(/butun son/i);
  });

  it('nol summali qatorni rad etadi', async () => {
    await expect(
      postEntry(
        entry([
          { account: 'cash.bank', amount: 1_000_000, cashFlow: 'operating' },
          { account: 'ar.students', amount: 0 },
          { account: 'deferred_revenue', amount: -1_000_000 },
        ]),
      ),
    ).rejects.toThrow(/nol summali/i);
  });

  it('pul bo\'lmagan hisobda cashFlow ni rad etadi', async () => {
    await expect(
      postEntry(
        entry([
          { account: 'cash.bank', amount: 1_800_000, cashFlow: 'operating' },
          { account: 'deferred_revenue', amount: -1_800_000, cashFlow: 'operating' },
        ]),
      ),
    ).rejects.toThrow(/pul hisobi emas/i);
  });

  it('pul hisobida cashFlow berilmasa rad etadi (undefined = unutilgan)', async () => {
    await expect(
      postEntry(
        entry([
          { account: 'cash.bank', amount: 1_800_000 },
          { account: 'deferred_revenue', amount: -1_800_000 },
        ]),
      ),
    ).rejects.toThrow(/cashFlow aniq berilishi shart/i);
  });

  it('cashFlow: null ni qabul qiladi va null holida saqlaydi (inkassatsiya)', async () => {
    const doc = await postEntry({
      date: utcDate(2026, 1, 28),
      kind: 'cash_collection',
      description: 'inkassatsiya',
      lines: [
        { account: 'cash.bank', amount: 15_000_000, cashFlow: null },
        { account: 'cash.register', amount: -15_000_000, cashFlow: null },
      ],
    });

    const saved = await JournalEntryModel.findById(doc._id).lean();
    expect(saved!.lines.map((l) => l.cashFlow)).toEqual([null, null]);
  });

  it('noma\'lum hisobni rad etadi', async () => {
    await expect(
      postEntry(
        entry([
          { account: 'cash.bank', amount: 100, cashFlow: 'operating' },
          // @ts-expect-error — sxemada yo'q hisob, runtime da rad etilishi kerak
          { account: 'expense.bad_debt', amount: -100 },
        ]),
      ),
    ).rejects.toThrow(/noma'lum hisob/i);
  });

  it('sxema darajasida ham himoyalangan — model.create() ni chetlab o\'tib bo\'lmaydi', async () => {
    await expect(
      JournalEntryModel.create({
        date: utcDate(2026, 1, 10),
        period: '2026-01',
        kind: 'student_payment',
        description: 'postEntry ni chetlab o\'tish urinishi',
        lines: [
          { account: 'cash.bank', amount: 500, cashFlow: 'operating' },
          { account: 'deferred_revenue', amount: -400 },
        ],
      }),
    ).rejects.toThrow(/balanslashmagan/i);
  });
});

describe('toPeriod — UTC (D10)', () => {
  it('toPeriod(Date.UTC(2026, 0, 31)) -> "2026-01"', () => {
    expect(toPeriod(new Date(Date.UTC(2026, 0, 31)))).toBe('2026-01');
  });

  it('oy chegarasi UTC bo\'yicha kesiladi, mahalliy vaqt bo\'yicha emas', () => {
    // Asia/Tashkent (UTC+5) da bu 2026-02-01 04:00 — mahalliy vaqt ishlatilsa
    // fevralga tushib ketardi.
    expect(toPeriod(new Date('2026-01-31T23:00:00.000Z'))).toBe('2026-01');
    expect(toPeriod(new Date('2026-02-01T00:00:00.000Z'))).toBe('2026-02');
  });

  it('utcDate mahalliy timezone dan qat\'i nazar bir xil natija beradi', () => {
    expect(utcDate(2026, 1, 31).toISOString()).toBe('2026-01-31T00:00:00.000Z');
    expect(toPeriod(utcDate(2026, 12, 31))).toBe('2026-12');
  });
});

describe('splitAmount — qoldiq taqsimlash (D6)', () => {
  it('splitAmount(1 000 000, 3) -> [333333, 333333, 333334]', () => {
    expect(splitAmount(1_000_000, 3)).toEqual([333_333, 333_333, 333_334]);
  });

  it('yig\'indi har doim aniq total ga teng', () => {
    for (const total of [1_000_000, 999_999, 7, 0, 250_000, 123_456_789]) {
      for (const n of [1, 2, 3, 4, 7, 12]) {
        const parts = splitAmount(total, n);
        expect(parts).toHaveLength(n);
        expect(parts.every(Number.isInteger)).toBe(true);
        expect(parts.reduce((s, p) => s + p, 0)).toBe(total);
      }
    }
  });

  it('float total ni rad etadi', () => {
    expect(() => splitAmount(1_000_000.5, 3)).toThrow(/butun son/i);
  });
});
