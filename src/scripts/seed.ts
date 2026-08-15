import type { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../db/connection.js';
import { ensureIndexes } from '../db/indexes.js';
import { buyEquipment, collectCash } from '../events/asset.js';
import { recordExpense } from '../events/expense.js';
import { injectCapital, openingBalance, payLoan, takeLoan } from '../events/finance.js';
import { accrueSalary, paySalary } from '../events/payroll.js';
import {
  dropStudent,
  monthlyFeeAfterDiscount,
  recognizeRevenue,
  recordPayment,
} from '../events/student.js';
import { JournalEntryModel } from '../ledger/journal.model.js';
import { EmployeeModel } from '../models/employee.model.js';
import { InvestorModel } from '../models/investor.model.js';
import { LoanModel } from '../models/loan.model.js';
import { StudentModel } from '../models/student.model.js';
import { splitAmount } from '../shared/money.js';
import { addMonths, endOfMonth, parsePeriod, toPeriod, utcDate, type Period } from '../shared/period.js';
import { createRng } from '../shared/random.js';

/**
 * `npm run seed` — TZ §6: 3 yillik realistik ma'lumot.
 *
 * Tasodifiylik QAT'IY URUG' bilan: seed har safar bir xil bazani yaratadi,
 * shuning uchun reconcile yiqilsa uni takrorlab ko'rish mumkin.
 *
 * Oylik sikl tartibi docs/03-events.md oxiridagi jadvaldan. `revenue_recognition`
 * to'lovlardan KEYIN bajariladi — aks holda to'lagan o'quvchida ham debitor
 * qarz paydo bo'ladi.
 */

const SEED = 2026_08_15;
const FIRST_PERIOD: Period = '2024-01';
const MONTHS = 36;

const STUDENT_COUNT = 520;
const EMPLOYEE_COUNT = 22;

const OPENING_CASH = 120_000_000;
const EQUIPMENT_COST = 240_000_000;
const LOAN_PRINCIPAL = 200_000_000;
const LOAN_ANNUAL_RATE = 18;
const RENT_PER_MONTH = 15_000_000;

const rng = createRng(SEED);

// ------------------------------------------------------------ ma'lumotnoma

interface SeedStudent {
  _id: Types.ObjectId;
  monthlyFee: number;
  discountPercent: number;
  droppedAt?: Date | null;
  /** Qaysi oydan o'qiy boshlaydi. */
  enrolledPeriod: Period;
  /** Bir to'lovda nechta oyni qoplaydi: 1 yoki 3. */
  prepayMonths: number;
  /** To'lov qilish ehtimoli. 1 dan kichigi — debitor qarz manbai (D1). */
  reliability: number;
  prefersCash: boolean;
  // Xotiradagi qoldiqlar — har chaqiruvda bazadan so'ralmaydi.
  ar: number;
  deferred: number;
  dropped: boolean;
}

interface SeedEmployee {
  _id: Types.ObjectId;
  monthlySalary: number;
  hiredPeriod: Period;
}

const FIRST_NAMES = ['Ali', 'Zilola', 'Bekzod', 'Malika', 'Jasur', 'Nilufar', 'Sardor', 'Dilnoza', 'Aziz', 'Kamola', 'Otabek', 'Sevara'];
const LAST_NAMES = ['Valiyev', 'Karimova', 'To\'rayev', 'Yusupova', 'Rahimov', 'Ergasheva', 'Sobirov', 'Nazarova'];

const fullName = (): string => `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;

/** Oy indeksidan (0..35) period. */
const periodAt = (index: number): Period => addMonths(FIRST_PERIOD, index);

function makeStudents(): SeedStudent[] {
  const students: SeedStudent[] = [];

  for (let i = 0; i < STUDENT_COUNT; i += 1) {
    // Markaz o'sib boradi: bir qismi boshidan, qolganlari birinchi 24 oy ichida.
    const enrolledIndex = i < 200 ? 0 : rng.int(1, 24);

    // Chegirmalilar ~30%.
    const discountPercent = rng.chance(0.3) ? rng.pick([10, 15, 20]) : 0;
    // Har beshinchisi 3 oylik oldindan to'lov qiladi.
    const prepayMonths = rng.chance(0.2) ? 3 : 1;
    // Har sakkizinchisi ba'zi oylarda to'lamaydi -> debitor qarz.
    const reliability = rng.chance(0.125) ? 0.7 : 1;

    students.push({
      _id: new StudentModel()._id,
      monthlyFee: rng.int(4, 9) * 100_000,
      discountPercent,
      enrolledPeriod: periodAt(enrolledIndex),
      prepayMonths,
      reliability,
      prefersCash: rng.chance(0.3),
      ar: 0,
      deferred: 0,
      dropped: false,
      droppedAt: null,
    });
  }

  // Chiqib ketuvchilar — FAQAT ishonchli to'lovchilardan. Qarzdor o'quvchi
  // chiqarilmaydi, chunki umidsiz qarzni hisobdan chiqarish (expense.bad_debt)
  // bu versiyada yo'q (D3).
  const candidates = students.filter((s) => s.reliability === 1 && s.enrolledPeriod === FIRST_PERIOD);
  for (const student of candidates) {
    if (!rng.chance(0.18)) continue;
    const { year, month } = parsePeriod(periodAt(rng.int(6, MONTHS - 2)));
    student.droppedAt = utcDate(year, month, 2);
  }

  return students;
}

function makeEmployees(): SeedEmployee[] {
  return Array.from({ length: EMPLOYEE_COUNT }, (_, i) => ({
    _id: new EmployeeModel()._id,
    monthlySalary: rng.int(30, 90) * 100_000,
    hiredPeriod: periodAt(i < 14 ? 0 : rng.int(1, 18)),
  }));
}

// ------------------------------------------------------------------- seed

async function seed(): Promise<void> {
  const startedAt = Date.now();

  console.log('Baza tozalanmoqda…');
  await Promise.all([
    JournalEntryModel.deleteMany({}),
    StudentModel.deleteMany({}),
    EmployeeModel.deleteMany({}),
    LoanModel.deleteMany({}),
    InvestorModel.deleteMany({}),
  ]);
  await ensureIndexes();

  const students = makeStudents();
  const employees = makeEmployees();

  await StudentModel.insertMany(
    students.map((s) => ({
      _id: s._id,
      name: fullName(),
      monthlyFee: s.monthlyFee,
      discountPercent: s.discountPercent,
      enrolledFrom: monthStart(s.enrolledPeriod),
      droppedAt: s.droppedAt ?? null,
    })),
  );
  await EmployeeModel.insertMany(
    employees.map((e) => ({
      _id: e._id,
      name: fullName(),
      monthlySalary: e.monthlySalary,
      hiredFrom: monthStart(e.hiredPeriod),
    })),
  );

  const investors = await InvestorModel.insertMany([
    { name: 'Rustam Aliyev' },
    { name: 'Nodira Ismoilova' },
  ]);
  const loan = await LoanModel.create({
    principal: LOAN_PRINCIPAL,
    annualRatePercent: LOAN_ANNUAL_RATE,
    takenAt: utcDate(2024, 1, 15),
    termMonths: MONTHS - 1,
  });

  // --- Boshlanish: qoldiq, kapital, jihoz, kredit -------------------------
  console.log('Boshlang\'ich yozuvlar…');
  await openingBalance({ date: utcDate(2024, 1, 1), amount: OPENING_CASH });
  await injectCapital({ investorId: investors[0]!._id, date: utcDate(2024, 1, 2), amount: 400_000_000 });
  await injectCapital({ investorId: investors[1]!._id, date: utcDate(2024, 1, 2), amount: 200_000_000 });
  await buyEquipment({ date: utcDate(2024, 1, 8), amount: EQUIPMENT_COST });
  await takeLoan({ loanId: loan._id, date: utcDate(2024, 1, 15), principal: LOAN_PRINCIPAL });

  // Kredit: asosiy qarz teng bo'laklarda, qoldiq oxirgi to'lovga (D6/D8).
  const principalSchedule = splitAmount(LOAN_PRINCIPAL, MONTHS - 1);
  let loanOutstanding = LOAN_PRINCIPAL;

  // Kassadagi naqd pul — inkassatsiya uni manfiyga tushirmasligi uchun kuzatiladi.
  let cashRegister = 0;

  const pendingSalaries = new Map<Period, Array<{ employeeId: Types.ObjectId; salary: number }>>();

  // --- Oylik sikl ---------------------------------------------------------
  for (let index = 0; index < MONTHS; index += 1) {
    const period = periodAt(index);
    const { year, month } = parsePeriod(period);
    const monthEnd = endOfMonth(year, month);
    const day = (d: number) => utcDate(year, month, d);

    if (index % 6 === 0) console.log(`  ${period} …`);

    // 2-kun: chiqib ketuvchilar. Qolgan oldindan to'lov qaytariladi (D2).
    for (const student of students) {
      if (student.dropped || !student.droppedAt) continue;
      if (student.droppedAt > monthEnd) continue;
      if (student.ar !== 0) continue; // qarzdor o'quvchi chiqarilmaydi (D3)

      await dropStudent({
        studentId: student._id,
        date: student.droppedAt,
        deferredBalance: student.deferred,
      });
      student.deferred = 0;
      student.dropped = true;
    }

    // 1–5 kunlar: o'quvchi to'lovlari.
    for (const student of students) {
      if (!isActive(student, period)) continue;

      const fee = monthlyFeeAfterDiscount(student.monthlyFee, student.discountPercent);
      if (student.deferred >= fee) continue; // shu oy allaqachon qoplangan
      if (!rng.chance(student.reliability)) continue; // to'lamadi -> debitor qarz

      const amount = student.ar + fee * student.prepayMonths;
      const method = student.prefersCash ? 'cash' : 'bank';

      await recordPayment({
        studentId: student._id,
        date: day(rng.int(1, 5)),
        amount,
        method,
        arBalance: student.ar,
      });

      student.deferred += amount - student.ar;
      student.ar = 0;
      if (method === 'cash') cashRegister += amount;
    }

    // 5-kun: o'tgan oyning ish haqi to'lanadi.
    for (const { employeeId, salary } of pendingSalaries.get(period) ?? []) {
      await paySalary({ employeeId, forPeriod: addMonths(period, -1), date: day(5), salary });
    }
    pendingSalaries.delete(period);

    // 5-kun: ijara. Oy ichida: kommunal va marketing.
    await recordExpense({ kind: 'rent', date: day(5), amount: RENT_PER_MONTH, source: 'bank' });
    await recordExpense({
      kind: 'utilities',
      date: day(12),
      amount: rng.int(30, 65) * 100_000,
      source: 'bank',
    });
    await recordExpense({
      kind: 'marketing',
      date: day(18),
      amount: rng.int(50, 150) * 100_000,
      source: 'bank',
    });

    // Ikkinchi investor 2025-06 da qo'shimcha kapital kiritadi.
    if (period === '2025-06') {
      await injectCapital({ investorId: investors[0]!._id, date: day(10), amount: 150_000_000 });
    }

    // 20-kun: kredit to'lovi (birinchi to'lov kredit olingandan keyingi oyda).
    if (index >= 1) {
      const principalDue = principalSchedule[index - 1]!;
      const interestDue = Math.floor((loanOutstanding * LOAN_ANNUAL_RATE) / 100 / 12);
      await payLoan({
        loanId: loan._id,
        date: day(20),
        interest: interestDue,
        principal: principalDue,
      });
      loanOutstanding -= principalDue;
    }

    // 28-kun: inkassatsiya — kassadagi naqd bankka o'tkaziladi.
    if (cashRegister > 0) {
      await collectCash({ date: day(28), amount: cashRegister });
      cashRegister = 0;
    }

    // Oy oxiri: daromad tan olish — TO'LOVLARDAN KEYIN.
    for (const student of students) {
      if (!isActive(student, period)) continue;

      const fee = monthlyFeeAfterDiscount(student.monthlyFee, student.discountPercent);
      const covered = Math.min(fee, student.deferred);

      await recognizeRevenue({
        student: {
          _id: student._id,
          monthlyFee: student.monthlyFee,
          discountPercent: student.discountPercent,
          droppedAt: student.droppedAt,
        },
        period,
        deferredBalance: student.deferred,
      });

      student.deferred -= covered;
      student.ar += fee - covered;
    }

    // Oy oxiri: ish haqi hisoblanadi, keyingi oyning 5-sanasida to'lanadi.
    const nextPeriod = addMonths(period, 1);
    for (const employee of employees) {
      if (employee.hiredPeriod > period) continue;

      await accrueSalary({ employeeId: employee._id, period, salary: employee.monthlySalary });

      // Oxirgi oy uchun to'lov ma'lumot oralig'idan tashqariga chiqadi —
      // u to'lanmagan majburiyat bo'lib qoladi (bu normal, tz.md §2.3 kabi).
      if (index < MONTHS - 1) {
        const queue = pendingSalaries.get(nextPeriod) ?? [];
        queue.push({ employeeId: employee._id, salary: employee.monthlySalary });
        pendingSalaries.set(nextPeriod, queue);
      }
    }
  }

  // --- Xulosa -------------------------------------------------------------
  const [entryCount, lineAgg] = await Promise.all([
    JournalEntryModel.countDocuments(),
    JournalEntryModel.aggregate<{ lines: number }>([
      { $group: { _id: null, lines: { $sum: { $size: '$lines' } } } },
    ]),
  ]);

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    [
      '',
      `Seed tayyor (${seconds}s, urug': ${SEED})`,
      `  Oylar:      ${MONTHS}  (${FIRST_PERIOD} … ${periodAt(MONTHS - 1)})`,
      `  O'quvchi:   ${students.length}  (chiqib ketgan: ${students.filter((s) => s.dropped).length})`,
      `  Xodim:      ${employees.length}`,
      `  Yozuvlar:   ${entryCount.toLocaleString('en-US')}`,
      `  Qatorlar:   ${(lineAgg[0]?.lines ?? 0).toLocaleString('en-US')}`,
      '',
      'Endi: npm run reconcile',
    ].join('\n'),
  );
}

/** O'quvchi shu oyda faolmi: yozilgan, hali chiqib ketmagan. */
function isActive(student: SeedStudent, period: Period): boolean {
  if (student.dropped) return false;
  if (student.enrolledPeriod > period) return false;
  // Chiqib ketish oyida ham hisoblamaymiz — recognizeRevenue baribir null qaytaradi.
  if (student.droppedAt && toPeriod(student.droppedAt) <= period) return false;
  return true;
}

function monthStart(period: Period): Date {
  const { year, month } = parsePeriod(period);
  return utcDate(year, month, 1);
}

await connectDb();
try {
  await seed();
} finally {
  await disconnectDb();
}
