import type { Types } from 'mongoose';
import { postEntry } from '../ledger/post.js';
import { endOfMonth, parsePeriod, type Period } from '../shared/period.js';

/**
 * Ish haqi — docs/03-events.md §4–5.
 *
 * Hisoblash va to'lash BUTUNLAY ALOHIDA ikkita yozuv. `paySalary` da
 * `expense.salary` umuman yo'q — TZ §5.2 dagi "Fevral P&L: shu ish haqidan
 * xarajat 0" aynan shu bilan ta'minlanadi.
 */

export interface AccrueSalaryInput {
  employeeId: Types.ObjectId;
  period: Period;
  salary: number;
}

/** §4. Oy oxiri: ish haqi hisoblandi. PUL HARAKATLANMAYDI. */
export async function accrueSalary(input: AccrueSalaryInput) {
  const { employeeId, period, salary } = input;

  if (!Number.isInteger(salary) || salary <= 0) {
    throw new Error(`accrueSalary: salary musbat butun son bo'lishi kerak (${salary})`);
  }

  const { year, month } = parsePeriod(period);

  return postEntry({
    date: endOfMonth(year, month),
    kind: 'salary_accrual',
    description: `Ish haqi hisoblandi — ${period}`,
    ref: { employeeId },
    lines: [
      { account: 'expense.salary', amount: salary },
      { account: 'salary_payable', amount: -salary },
    ],
  });
}

export interface PaySalaryInput {
  employeeId: Types.ObjectId;
  /** Qaysi oy uchun to'lanayotgani — faqat izoh uchun, hisobotga ta'sir qilmaydi. */
  forPeriod: Period;
  /** To'lov sanasi (odatda keyingi oyning 5-sanasi), UTC. */
  date: Date;
  salary: number;
}

/**
 * §5. Keyingi oyning 5-sanasi: ish haqi to'landi. Majburiyat yopiladi,
 * P&L ga TEGMAYDI.
 */
export async function paySalary(input: PaySalaryInput) {
  const { employeeId, forPeriod, date, salary } = input;

  if (!Number.isInteger(salary) || salary <= 0) {
    throw new Error(`paySalary: salary musbat butun son bo'lishi kerak (${salary})`);
  }

  return postEntry({
    date,
    kind: 'salary_payment',
    description: `Ish haqi to'landi — ${forPeriod} uchun`,
    ref: { employeeId },
    lines: [
      { account: 'salary_payable', amount: salary },
      { account: 'cash.bank', amount: -salary, cashFlow: 'operating' },
    ],
  });
}
