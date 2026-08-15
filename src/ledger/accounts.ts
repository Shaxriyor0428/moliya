/**
 * Hisoblar rejasi (Chart of Accounts) — docs/02-model.md dagi jadvalning yagona manbasi.
 *
 * Ishora konvensiyasi balans tenglamasidan kelib chiqadi:
 *   Aktivlar − Majburiyatlar − Kapital = 0
 * Shuning uchun har bir hisob turining "o'sish" ishorasi quyidagicha:
 *   ASSET      o'sish +
 *   LIABILITY  o'sish −
 *   EQUITY     o'sish −
 *   REVENUE    o'sish −   (kapitalni oshiradi -> kapital bilan bir ishorada)
 *   EXPENSE    o'sish +   (kapitalni kamaytiradi -> teskari ishorada)
 *
 * Natijada balanslashgan yozuv nolga yig'iladi va uchala tenglik konstruksiya
 * bo'yicha bajariladi — "moslashtiruvchi qator" tushunchasining o'zi yo'q.
 */

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type CashFlowCategory = 'operating' | 'investing' | 'financing';

export const CASH_FLOW_CATEGORIES = ['operating', 'investing', 'financing'] as const;

export const ACCOUNT_TYPE = {
  'cash.register': 'ASSET', // Kassa (naqd)
  'cash.bank': 'ASSET', // Bank hisobi
  'ar.students': 'ASSET', // O'quvchilardan debitor qarz
  fixed_assets: 'ASSET', // Jihoz, mebel, kompyuter
  deferred_revenue: 'LIABILITY', // Oldindan to'langan darslar
  salary_payable: 'LIABILITY', // To'lanmagan ish haqi
  loan_principal: 'LIABILITY', // Bank kreditining asosiy qarzi
  capital: 'EQUITY', // Investor kapitali
  'revenue.tuition': 'REVENUE', // Dars daromadi
  'expense.salary': 'EXPENSE', // Ish haqi (hisoblangan)
  'expense.rent': 'EXPENSE', // Ijara
  'expense.utilities': 'EXPENSE', // Kommunal
  'expense.marketing': 'EXPENSE', // Reklama va marketing
  'expense.interest': 'EXPENSE', // Kredit foizi
} as const satisfies Record<string, AccountType>;

export type AccountCode = keyof typeof ACCOUNT_TYPE;

export const ACCOUNT_CODES = Object.keys(ACCOUNT_TYPE) as AccountCode[];

/**
 * Pul hisoblari. Pul oqimi hisoboti faqat shu ikkitasining harakatidan quriladi;
 * `cashFlow` tegi ham faqat shu hisoblarning qatorlarida bo'lishi mumkin.
 * Kassa va bank ataylab ajratilgan — aks holda inkassatsiya modelda ko'rinmaydi
 * (docs/05-decisions.md D7).
 */
export const CASH_ACCOUNTS: ReadonlySet<AccountCode> = new Set<AccountCode>([
  'cash.register',
  'cash.bank',
]);

export function typeOf(account: AccountCode): AccountType {
  return ACCOUNT_TYPE[account];
}

export function isAccountCode(value: unknown): value is AccountCode {
  return typeof value === 'string' && Object.hasOwn(ACCOUNT_TYPE, value);
}

export function isCash(account: AccountCode): boolean {
  return CASH_ACCOUNTS.has(account);
}

/** P&L hisoboti hisobi: daromad yoki xarajat. Qolganlari balansga tushadi. */
export function isPnl(account: AccountCode): boolean {
  const type = ACCOUNT_TYPE[account];
  return type === 'REVENUE' || type === 'EXPENSE';
}

/**
 * `retained_earnings` hisob sifatida saqlanmaydi — u barcha REVENUE + EXPENSE
 * qatorlarining kümülativ yig'indisidan hisoblanadi. Shu sabab "sof foyda =
 * taqsimlanmagan foydaning o'zgarishi" tengligi avtomatik bajariladi va yil
 * yakunida yopish yozuvi (closing entry) kerak emas.
 */
