import { connectDb, disconnectDb } from '../db/connection.js';
import { JournalEntryModel } from '../ledger/journal.model.js';
import { balance } from '../reports/balance.js';
import { cashFlow } from '../reports/cashflow.js';
import { listPeriods } from '../reports/periods.js';
import { pnl } from '../reports/pnl.js';
import { endOfMonth, parsePeriod } from '../shared/period.js';

/**
 * `npm run bench` — TZ §9: 3 yillik ma'lumotda har bir hisobot < 1 soniya.
 *
 * ⚠️ OXIRGI oy o'lchanadi, birinchisi emas: pul oqimining `opening` qismi
 * o'zidan oldingi barcha oylarni skanerlaydi, shuning uchun eng qimmat holat
 * oxirgi oyda. Birinchi oyni o'lchash yolg'on tasalli bo'lardi.
 */

const RUNS = 10;

interface Timing {
  label: string;
  median: number;
  p95: number;
  min: number;
  max: number;
}

async function measure(label: string, fn: () => Promise<unknown>): Promise<Timing> {
  // Bir marta "isitib" olamiz — birinchi so'rovga ulanish va plan keshi kiradi.
  await fn();

  const samples: number[] = [];
  for (let i = 0; i < RUNS; i += 1) {
    const started = process.hrtime.bigint();
    await fn();
    samples.push(Number(process.hrtime.bigint() - started) / 1_000_000);
  }
  samples.sort((a, b) => a - b);

  return {
    label,
    median: percentile(samples, 50),
    p95: percentile(samples, 95),
    min: samples[0]!,
    max: samples[samples.length - 1]!,
  };
}

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)]!;
}

async function main(): Promise<void> {
  const periods = await listPeriods();
  if (periods.length === 0) {
    console.error("Baza bo'sh. Avval: npm run seed");
    process.exitCode = 1;
    return;
  }

  const lastPeriod = periods[periods.length - 1]!;
  const { year, month } = parsePeriod(lastPeriod);
  const lastDate = endOfMonth(year, month);

  const [entryCount, lineAgg] = await Promise.all([
    JournalEntryModel.countDocuments(),
    JournalEntryModel.aggregate<{ lines: number }>([
      { $group: { _id: null, lines: { $sum: { $size: '$lines' } } } },
    ]),
  ]);

  const indexes = await JournalEntryModel.collection.indexes();

  console.log(
    [
      "Ma'lumot hajmi",
      `  Oylar:     ${periods.length}  (${periods[0]} … ${lastPeriod})`,
      `  Yozuvlar:  ${entryCount.toLocaleString('en-US')}`,
      `  Qatorlar:  ${(lineAgg[0]?.lines ?? 0).toLocaleString('en-US')}`,
      `  Indekslar: ${indexes.map((i) => i.name).join(', ')}`,
      '',
      `Har biri ${RUNS} marta, oxirgi oy (${lastPeriod}) bo'yicha:`,
      '',
    ].join('\n'),
  );

  const timings = [
    await measure(`P&L (${lastPeriod})`, () => pnl(lastPeriod)),
    await measure(`Pul oqimi (${lastPeriod})`, () => cashFlow(lastPeriod)),
    await measure(`Balans (${lastDate.toISOString().slice(0, 10)})`, () => balance(lastDate)),
    await measure('Oylar ro\'yxati', () => listPeriods()),
  ];

  const ms = (n: number) => `${n.toFixed(1)} ms`;
  console.log(`  ${'Hisobot'.padEnd(24)} ${'median'.padStart(10)} ${'p95'.padStart(10)} ${'min'.padStart(10)} ${'max'.padStart(10)}`);
  for (const t of timings) {
    console.log(
      `  ${t.label.padEnd(24)} ${ms(t.median).padStart(10)} ${ms(t.p95).padStart(10)} ${ms(t.min).padStart(10)} ${ms(t.max).padStart(10)}`,
    );
  }

  const slowest = Math.max(...timings.map((t) => t.p95));
  console.log(
    `\n  Eng sekin p95: ${ms(slowest)} — talab: < 1000 ms  ${slowest < 1000 ? '✓' : '✗'}`,
  );
}

await connectDb();
try {
  await main();
} finally {
  await disconnectDb();
}
