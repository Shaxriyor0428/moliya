/**
 * Model prototipi — TZ §5.1-5.5 va §2.3 misolini tekshirish uchun.
 * Bu ishlab chiqarish kodi emas, faqat modelni tasdiqlash uchun.
 *
 * Konvensiya: har bir yozuv lines[] dan iborat, sum(amount) === 0.
 *   ASSET      -> o'sish +
 *   LIABILITY  -> o'sish -
 *   EQUITY     -> o'sish -
 *   REVENUE    -> o'sish -
 *   EXPENSE    -> o'sish +
 */

const TYPE = {
  'cash.register': 'ASSET',
  'cash.bank': 'ASSET',
  'ar.students': 'ASSET',
  'fixed_assets': 'ASSET',
  'deferred_revenue': 'LIABILITY',
  'salary_payable': 'LIABILITY',
  'loan_principal': 'LIABILITY',
  'capital': 'EQUITY',
  'revenue.tuition': 'REVENUE',
  'expense.salary': 'EXPENSE',
  'expense.rent': 'EXPENSE',
  'expense.utilities': 'EXPENSE',
  'expense.marketing': 'EXPENSE',
  'expense.interest': 'EXPENSE',
};
const CASH = new Set(['cash.register', 'cash.bank']);

const journal = [];

function post(date, kind, lines) {
  const sum = lines.reduce((s, l) => s + l.amount, 0);
  if (sum !== 0) throw new Error(`UNBALANCED ${kind} @${date}: ${sum}`);
  for (const l of lines) {
    if (!TYPE[l.account]) throw new Error(`unknown account ${l.account}`);
    if (l.cf && !CASH.has(l.account)) throw new Error(`cashFlow on non-cash ${l.account}`);
    if (CASH.has(l.account) && l.cf === undefined) throw new Error(`cash line without cf tag: ${l.account}`);
  }
  journal.push({ date, period: date.slice(0, 7), kind, lines });
}

// ---------- hisobotlar ----------
const linesUpTo = (d) => journal.filter((e) => e.date <= d).flatMap((e) => e.lines);
const linesIn = (p) => journal.filter((e) => e.period === p).flatMap((e) => e.lines);
const linesBefore = (p) => journal.filter((e) => e.period < p).flatMap((e) => e.lines);
const sum = (ls, f) => ls.filter(f).reduce((s, l) => s + l.amount, 0);

function pnl(period) {
  const ls = linesIn(period);
  const revenue = -sum(ls, (l) => TYPE[l.account] === 'REVENUE');
  const expenses = {};
  for (const l of ls) if (TYPE[l.account] === 'EXPENSE') expenses[l.account] = (expenses[l.account] || 0) + l.amount;
  const totalExpense = Object.values(expenses).reduce((a, b) => a + b, 0);
  return { revenue, expenses, totalExpense, netProfit: revenue - totalExpense };
}

function cashFlow(period) {
  const opening = sum(linesBefore(period), (l) => CASH.has(l.account));
  const ls = linesIn(period);
  const by = { operating: 0, investing: 0, financing: 0 };
  for (const l of ls) if (CASH.has(l.account) && l.cf) by[l.cf] += l.amount;
  const netChange = sum(ls, (l) => CASH.has(l.account));
  return { opening, ...by, netChange, closing: opening + netChange };
}

function balance(asOf) {
  const ls = linesUpTo(asOf);
  const acc = {};
  for (const l of ls) acc[l.account] = (acc[l.account] || 0) + l.amount;
  const assets = sum(ls, (l) => TYPE[l.account] === 'ASSET');
  const liabilities = -sum(ls, (l) => TYPE[l.account] === 'LIABILITY');
  const capital = -(acc['capital'] || 0);
  const retained = -sum(ls, (l) => TYPE[l.account] === 'REVENUE' || TYPE[l.account] === 'EXPENSE');
  return { acc, assets, liabilities, capital, retained, equity: capital + retained };
}

// ---------- tekshiruv yordamchisi ----------
let fails = 0;
const fmt = (n) => n.toLocaleString('en-US').replace(/,/g, ' ');
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) fails++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(52)} ${fmt(actual).padStart(15)}${ok ? '' : `  (kutilgan ${fmt(expected)})`}`);
}
function reset() { journal.length = 0; }

// =========================================================
console.log('\n5.1. Oldindan to\'lov');
reset();
post('2026-01-10', 'student_payment', [
  { account: 'cash.bank', amount: 1_800_000, cf: 'operating' },
  { account: 'deferred_revenue', amount: -1_800_000 },
]);
for (const [d, p] of [['2026-01-31', '01'], ['2026-02-28', '02'], ['2026-03-31', '03']]) {
  post(d, 'revenue_recognition', [
    { account: 'deferred_revenue', amount: 600_000 },
    { account: 'revenue.tuition', amount: -600_000 },
  ]);
}
check('Yanvar P&L: daromad', pnl('2026-01').revenue, 600_000);
check('31-yanvar balans: oldindan to\'langan darslar', -(balance('2026-01-31').acc['deferred_revenue'] || 0), 1_200_000);
check('Yanvar pul oqimi: operatsion kirim', cashFlow('2026-01').operating, 1_800_000);
check('31-mart balans: oldindan to\'langan darslar', -(balance('2026-03-31').acc['deferred_revenue'] || 0), 0);
check('Yanvar-mart jami daromad', ['2026-01', '2026-02', '2026-03'].reduce((s, p) => s + pnl(p).revenue, 0), 1_800_000);

// =========================================================
console.log('\n5.2. Ish haqi');
reset();
post('2026-01-31', 'salary_accrual', [
  { account: 'expense.salary', amount: 8_000_000 },
  { account: 'salary_payable', amount: -8_000_000 },
]);
post('2026-02-05', 'salary_payment', [
  { account: 'salary_payable', amount: 8_000_000 },
  { account: 'cash.bank', amount: -8_000_000, cf: 'operating' },
]);
check('Yanvar P&L: ish haqi xarajati', pnl('2026-01').expenses['expense.salary'], 8_000_000);
check('31-yanvar balans: to\'lanmagan ish haqi', -(balance('2026-01-31').acc['salary_payable'] || 0), 8_000_000);
check('Yanvar pul oqimi: jami o\'zgarish', cashFlow('2026-01').netChange, 0);
check('Fevral P&L: shu ish haqidan xarajat', pnl('2026-02').expenses['expense.salary'] || 0, 0);
check('Fevral pul oqimi: operatsion chiqim', -cashFlow('2026-02').operating, 8_000_000);
check('28-fevral balans: to\'lanmagan ish haqi', -(balance('2026-02-28').acc['salary_payable'] || 0), 0);

// =========================================================
console.log('\n5.3. Investor kapitali');
reset();
post('2026-01-05', 'capital_injection', [
  { account: 'cash.bank', amount: 500_000_000, cf: 'financing' },
  { account: 'capital', amount: -500_000_000 },
]);
check('Yanvar P&L: daromad', pnl('2026-01').revenue, 0);
check('Yanvar P&L: sof foyda', pnl('2026-01').netProfit, 0);
check('31-yanvar balans: kapital', balance('2026-01-31').capital, 500_000_000);
check('Yanvar pul oqimi: moliyaviy kirim', cashFlow('2026-01').financing, 500_000_000);
check('Yanvar pul oqimi: operatsion', cashFlow('2026-01').operating, 0);

// =========================================================
console.log('\n5.4. Kredit to\'lovi');
reset();
post('2026-02-01', 'loan_received', [
  { account: 'cash.bank', amount: 200_000_000, cf: 'financing' },
  { account: 'loan_principal', amount: -200_000_000 },
]);
// DIQQAT: bitta to'lov ikkita pul qatoriga bo'linadi - foiz operatsion, asosiy qarz moliyaviy
post('2026-02-20', 'loan_payment', [
  { account: 'expense.interest', amount: 3_000_000 },
  { account: 'loan_principal', amount: 9_000_000 },
  { account: 'cash.bank', amount: -3_000_000, cf: 'operating' },
  { account: 'cash.bank', amount: -9_000_000, cf: 'financing' },
]);
check('Fevral P&L: shu kreditdan xarajat', pnl('2026-02').expenses['expense.interest'], 3_000_000);
check('28-fevral balans: kredit qarzi', -(balance('2026-02-28').acc['loan_principal'] || 0), 191_000_000);
check('Fevral pul oqimi: moliyaviy', cashFlow('2026-02').financing, 191_000_000);
check('Fevral pul oqimi: operatsion chiqim (foiz)', -cashFlow('2026-02').operating, 3_000_000);

// =========================================================
console.log('\n5.5. Jihoz xaridi');
reset();
post('2026-01-08', 'equipment_purchase', [
  { account: 'fixed_assets', amount: 240_000_000 },
  { account: 'cash.bank', amount: -240_000_000, cf: 'investing' },
]);
check('Yanvar P&L: xarajat', pnl('2026-01').totalExpense, 0);
check('31-yanvar balans: asosiy vositalar', balance('2026-01-31').acc['fixed_assets'], 240_000_000);
check('Yanvar pul oqimi: investitsion chiqim', -cashFlow('2026-01').investing, 240_000_000);

// =========================================================
console.log('\n§2.3 Yanvar misoli (foyda != pul)');
reset();
post('2025-12-31', 'opening_cash', [
  { account: 'cash.bank', amount: 50_000_000, cf: 'financing' },
  { account: 'capital', amount: -50_000_000 },
]);
post('2026-01-03', 'student_payment', [
  { account: 'cash.bank', amount: 100_000_000, cf: 'operating' },
  { account: 'deferred_revenue', amount: -100_000_000 },
]);
post('2025-12-31', 'salary_accrual_dec', [
  { account: 'expense.salary', amount: 30_000_000 },
  { account: 'salary_payable', amount: -30_000_000 },
]);
post('2026-01-05', 'salary_payment_dec', [
  { account: 'salary_payable', amount: 30_000_000 },
  { account: 'cash.bank', amount: -30_000_000, cf: 'operating' },
]);
post('2026-01-05', 'rent', [
  { account: 'expense.rent', amount: 10_000_000 },
  { account: 'cash.bank', amount: -10_000_000, cf: 'operating' },
]);
post('2026-01-15', 'marketing', [
  { account: 'expense.marketing', amount: 5_000_000 },
  { account: 'cash.bank', amount: -5_000_000, cf: 'operating' },
]);
post('2026-01-31', 'revenue_recognition', [
  { account: 'deferred_revenue', amount: 60_000_000 },
  { account: 'revenue.tuition', amount: -60_000_000 },
]);
post('2026-01-31', 'salary_accrual_jan', [
  { account: 'expense.salary', amount: 32_000_000 },
  { account: 'salary_payable', amount: -32_000_000 },
]);
const p = pnl('2026-01'), c = cashFlow('2026-01'), b = balance('2026-01-31');
check('Yanvar sof foyda', p.netProfit, 13_000_000);
check('Yanvar pul: oy boshi', c.opening, 50_000_000);
check('Yanvar pul: sof o\'zgarish', c.netChange, 55_000_000);
check('Yanvar pul: oy oxiri', c.closing, 105_000_000);
check('31-yanvar: oldindan to\'langan darslar', -(b.acc['deferred_revenue'] || 0), 40_000_000);
check('31-yanvar: to\'lanmagan ish haqi', -(b.acc['salary_payable'] || 0), 32_000_000);

// =========================================================
console.log('\nDebitor qarz (TZ da test yo\'q, o\'z stsenariyimiz)');
reset();
// Talaba yanvar uchun to'lamadi, dars o'tildi -> daromad + debitor qarz
post('2026-01-31', 'revenue_recognition_uncovered', [
  { account: 'deferred_revenue', amount: 0 },
  { account: 'ar.students', amount: 600_000 },
  { account: 'revenue.tuition', amount: -600_000 },
]);
// Fevralda 1 500 000 to'ladi: 600k qarzga, 900k oldindan
post('2026-02-10', 'student_payment_mixed', [
  { account: 'cash.bank', amount: 1_500_000, cf: 'operating' },
  { account: 'ar.students', amount: -600_000 },
  { account: 'deferred_revenue', amount: -900_000 },
]);
check('Yanvar P&L: daromad', pnl('2026-01').revenue, 600_000);
check('Yanvar pul oqimi: jami o\'zgarish', cashFlow('2026-01').netChange, 0);
check('31-yanvar balans: debitor qarz', balance('2026-01-31').acc['ar.students'], 600_000);
check('28-fevral balans: debitor qarz', balance('2026-02-28').acc['ar.students'], 0);
check('28-fevral balans: oldindan to\'langan', -(balance('2026-02-28').acc['deferred_revenue'] || 0), 900_000);

// =========================================================
console.log('\nInkassatsiya (kassa -> bank, uchala hisobotga ta\'sir qilmasligi kerak)');
reset();
post('2026-01-03', 'cash_payment', [
  { account: 'cash.register', amount: 20_000_000, cf: 'operating' },
  { account: 'deferred_revenue', amount: -20_000_000 },
]);
post('2026-01-28', 'collection', [
  { account: 'cash.bank', amount: 15_000_000, cf: null },
  { account: 'cash.register', amount: -15_000_000, cf: null },
]);
const ci = cashFlow('2026-01');
check('Operatsion (faqat to\'lov)', ci.operating, 20_000_000);
check('Investitsion', ci.investing, 0);
check('Moliyaviy', ci.financing, 0);
check('Sof o\'zgarish (inkassatsiya netlashadi)', ci.netChange, 20_000_000);
check('Kassa qoldig\'i', balance('2026-01-31').acc['cash.register'], 5_000_000);
check('Bank qoldig\'i', balance('2026-01-31').acc['cash.bank'], 15_000_000);

// =========================================================
console.log('\nUchta tenglik — §2.3 ma\'lumotida');
reset();
post('2025-12-31', 'opening', [{ account: 'cash.bank', amount: 50_000_000, cf: 'financing' }, { account: 'capital', amount: -50_000_000 }]);
post('2025-12-31', 'sal_dec', [{ account: 'expense.salary', amount: 30_000_000 }, { account: 'salary_payable', amount: -30_000_000 }]);
post('2026-01-03', 'pay', [{ account: 'cash.bank', amount: 100_000_000, cf: 'operating' }, { account: 'deferred_revenue', amount: -100_000_000 }]);
post('2026-01-05', 'sal_paid', [{ account: 'salary_payable', amount: 30_000_000 }, { account: 'cash.bank', amount: -30_000_000, cf: 'operating' }]);
post('2026-01-05', 'rent', [{ account: 'expense.rent', amount: 10_000_000 }, { account: 'cash.bank', amount: -10_000_000, cf: 'operating' }]);
post('2026-01-15', 'mkt', [{ account: 'expense.marketing', amount: 5_000_000 }, { account: 'cash.bank', amount: -5_000_000, cf: 'operating' }]);
post('2026-01-31', 'rev', [{ account: 'deferred_revenue', amount: 60_000_000 }, { account: 'revenue.tuition', amount: -60_000_000 }]);
post('2026-01-31', 'sal_jan', [{ account: 'expense.salary', amount: 32_000_000 }, { account: 'salary_payable', amount: -32_000_000 }]);

const monthEnd = { '2025-12': '2025-12-31', '2026-01': '2026-01-31' };
for (const period of ['2025-12', '2026-01']) {
  const b2 = balance(monthEnd[period]);
  const c2 = cashFlow(period);
  const p2 = pnl(period);
  const prevEnd = period === '2025-12' ? '2025-11-30' : '2025-12-31';
  const retainedPrev = balance(prevEnd).retained;
  console.log(`  ${period}:`);
  check('   1) Aktivlar - (Majburiyat + Kapital)', b2.assets - (b2.liabilities + b2.equity), 0);
  check('   2) Boshi + oqimlar - Oxiri', c2.opening + c2.netChange - c2.closing, 0);
  check('   3) Sof foyda - Taqsimlanmagan foyda o\'zgarishi', p2.netProfit - (b2.retained - retainedPrev), 0);
}

console.log(`\n${fails === 0 ? 'HAMMASI O\'TDI' : fails + ' TA TEKSHIRUV YIQILDI'}\n`);
process.exit(fails === 0 ? 0 : 1);
