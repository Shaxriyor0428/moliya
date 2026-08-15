# 02 — Ma'lumotlar modeli

> Baholashning **30%** i shu hujjatda. README.md ga bu bo'limning qisqartmasi ko'chiriladi (TZ §13.1: "qanday ma'lumotlar modelini tanladingiz va nima uchun").

> **Model tekshirilgan.** [`model-prototype.js`](model-prototype.js) — bazasiz, ~200 qatorlik prototip. `node docs/model-prototype.js` bilan ishga tushiring: TZ §5 dagi beshala stsenariy, §2.3 dagi yanvar misoli, debitor qarz, inkassatsiya va uchala tenglik — **44/44 tekshiruv o'tadi**. Implementatsiyada raqam chiqmasa, muammo modelda emas, kodda.

## Asosiy qaror: ikki tomonlama yozuv (double-entry)

Har bir biznes hodisasi **bitta `JournalEntry` hujjati**ga aylanadi. Hujjat ichida `lines[]` — balanslashgan qatorlar. Yagona invariant:

```
sum(lines[].amount) === 0
```

Uchala hisobot — P&L, Pul oqimi, Balans — shu bitta jurnaldan **hisoblanadi**. Alohida "balans jadvali" yoki "oylik natija" jadvali yo'q.

### Ko'rib chiqilgan va rad etilgan variantlar

| Variant | Nega rad etildi |
|---|---|
| Har hisobot uchun alohida kolleksiya (`pnl_rows`, `cash_rows`, `balance_rows`) | Bitta hodisa uch joyga yoziladi → uch marta xato qilish imkoni. Tenglik faqat omad bilan bajariladi. TZ §4 aynan shuni sinaydi |
| Tranzaksiyalar ro'yxati (`transactions` + `type` + `amount`) | Faqat pul harakatini ushlaydi. Oy oxiridagi ikkita hodisa (daromad tan olish, ish haqi hisoblash) pul harakatlantirmaydi — modelga umuman sig'maydi. §2.3 dagi 13 mln / 55 mln farqi chiqmaydi |
| Har oy uchun oldindan hisoblangan qoldiqlar (snapshot birlamchi manba sifatida) | Tarixiy tuzatish qilinsa hamma snapshot yaroqsiz bo'ladi. Snapshot — faqat kesh, birlamchi manba emas (§9 ga qarang) |
| Debit/Kredit ustunlari (klassik `debit`/`credit` juftligi) | Ishlaydi, lekin tekshiruv ikkita shart bo'ladi (`sum(debit) === sum(credit)`) va hisobotlarda har safar `debit - credit` yozish kerak. Ishorali bitta `amount` bilan invariant bitta va agregatsiya `$sum` ga tushadi |

**Tanlangan: ishorali summali ikki tomonlama yozuv.**

## Ishora konvensiyasi

Balans tenglamasidan kelib chiqadi:

```
Aktivlar = Majburiyatlar + Kapital
Aktivlar − Majburiyatlar − Kapital = 0
```

Shuning uchun:

| Hisob turi | O'sish ishorasi | Izoh |
|---|---|---|
| `ASSET` | `+` | Pul, debitor qarz, asosiy vositalar |
| `LIABILITY` | `−` | Oldindan to'lov, to'lanmagan ish haqi, kredit |
| `EQUITY` | `−` | Investor kapitali |
| `REVENUE` | `−` | Kapitalni oshiradi → kapital bilan bir ishorada |
| `EXPENSE` | `+` | Kapitalni kamaytiradi → teskari ishorada |

**Natija:** har bir balanslashgan yozuv nolga yig'iladi, va **uchala tenglik konstruksiya bo'yicha bajariladi** — hisoblab "moslashtirish" kerak emas. TZ §4 dagi ogohlantirish ("moslashtiruvchi qator qo'shish — avtomatik rad etish sababi") shu bilan chetlab o'tiladi: bizda moslashtirish tushunchasining o'zi yo'q.

Bu argument ekran yozuvida (25%) aytilishi kerak.

## Hisoblar rejasi (Chart of Accounts)

`src/ledger/accounts.ts` — yagona manba.

| Kod | Turi | Pul? | Izoh |
|---|---|---|---|
| `cash.register` | ASSET | ha | Kassa (naqd) |
| `cash.bank` | ASSET | ha | Bank hisobi |
| `ar.students` | ASSET | — | O'quvchilardan debitor qarz |
| `fixed_assets` | ASSET | — | Jihoz, mebel, kompyuter |
| `deferred_revenue` | LIABILITY | — | Oldindan to'langan darslar |
| `salary_payable` | LIABILITY | — | To'lanmagan ish haqi |
| `loan_principal` | LIABILITY | — | Bank kreditining asosiy qarzi |
| `capital` | EQUITY | — | Investor kapitali |
| `revenue.tuition` | REVENUE | — | Dars daromadi |
| `expense.salary` | EXPENSE | — | Ish haqi (hisoblangan) |
| `expense.rent` | EXPENSE | — | Ijara |
| `expense.utilities` | EXPENSE | — | Kommunal |
| `expense.marketing` | EXPENSE | — | Reklama va marketing |
| `expense.interest` | EXPENSE | — | Kredit foizi |

`retained_earnings` (taqsimlanmagan foyda) **hisob sifatida saqlanmaydi** — u barcha `REVENUE` + `EXPENSE` qatorlarining kümülativ yig'indisidan hisoblanadi. Shu sabab 3-tenglik ("sof foyda = taqsimlanmagan foydaning o'zgarishi") avtomatik bajariladi. Yil yakunida "yopish yozuvi" (closing entry) qilish shart emas — TZ bunday talab qo'ymaydi va u faqat xato manbai bo'lardi.

## Sxema

```ts
type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
type CashFlowCategory = 'operating' | 'investing' | 'financing';

interface JournalLine {
  account: AccountCode;
  amount: number;                    // butun son so'm, ishorali
  cashFlow?: CashFlowCategory | null; // FAQAT pul hisoblarida
}

interface JournalEntry {
  _id: ObjectId;
  date: Date;              // UTC
  period: string;          // "YYYY-MM" — date dan hosila, yozuv paytida hisoblanadi
  kind: EntryKind;         // 'student_payment' | 'revenue_recognition' | ...
  description: string;
  ref?: {                  // faqat seed va debugging uchun; hisobotlarda ishlatilmaydi
    studentId?: ObjectId;
    employeeId?: ObjectId;
    loanId?: ObjectId;
  };
  lines: JournalLine[];
}
```

### Nega `lines` ichkariga joylashtirilgan (embedded), alohida kolleksiya emas

MongoDB standalone rejimida tranzaksiya yo'q (faqat replica set da). Agar har bir qator alohida hujjat bo'lsa, yozuv o'rtasida jarayon uzilsa — bazada balanslashmagan yarim yozuv qoladi va uchala tenglik buziladi.

Qatorlar bitta hujjat ichida bo'lsa, **Mongo ning bitta hujjatga yozuvi atomar** — balanslashmagan holat printsipial jihatdan yuzaga kelmaydi. Ya'ni replica set, `session`, `withTransaction` — hech biri kerak emas.

Bu README uchun eng kuchli texnik argument: *tranzaksiya kerak emasligi tasodif emas, model shunga qarab tanlangan.*

Narxi: hisobotlarda `$unwind` kerak. 3 yillik ma'lumotda ~90 000 qator — o'lchov §9 da.

### Invariant qayerda majburlanadi

`journal.model.ts` da Mongoose `pre('validate')` hook:

```ts
schema.pre('validate', function () {
  const sum = this.lines.reduce((s, l) => s + l.amount, 0);
  if (sum !== 0) throw new Error(`Unbalanced entry: ${sum}`);
  if (this.lines.length < 2) throw new Error('Entry needs >= 2 lines');
  for (const l of this.lines) {
    if (!Number.isInteger(l.amount)) throw new Error('amount must be integer');
    if (l.amount === 0) throw new Error('zero-amount line');
    const isCash = CASH_ACCOUNTS.has(l.account);
    if (!isCash && l.cashFlow) throw new Error('cashFlow on non-cash account');
  }
});
```

Pul qatorida `cashFlow` **majburiy** (inkassatsiya bundan mustasno — u `null`, va bu ataylab yozilgan qiymat, `undefined` emas). Bu farq muhim: `undefined` = unutildi, `null` = "bu ko'chirish, oqim emas".

## Pul birligi

**Butun son so'm.** `float` ishlatilmaydi.

- O'zbekistonda tiyin muomalada yo'q — TZ dagi barcha raqamlar butun so'm.
- JS `Number` xavfsiz butun son chegarasi 2^53 ≈ 9·10^15. 3 yillik kümülativ aylanma ~10^11 so'm — 4 ta kattalik tartibi zaxira bor.
- Mongo da `Number` `Double` bo'lib saqlanadi, lekin butun qiymatlar aniq saqlanadi. `Decimal128` kerak emas va agregatsiyani sekinlashtiradi.

### Qoldiqni taqsimlash

3 oylik to'lovni bo'lishda yoki chegirma hisoblashda qoldiq chiqishi mumkin (masalan `1 000 000 / 3`).

**Qoida:** har oyga `floor(total / n)`, qoldiq **oxirgi oyga**.

```
1 000 000 / 3  →  333 333 | 333 333 | 333 334
```

Sabab: yig'indi har doim aniq `total` ga teng bo'lishi shart, aks holda `deferred_revenue` nolga tushmaydi va TZ §5.1 dagi "31-mart: 0" tekshiruvi yiqiladi. Bu funksiya `src/shared/money.ts` da alohida turadi va o'z testiga ega.

## Period hisoblash

```ts
const toPeriod = (d: Date) => d.toISOString().slice(0, 7); // "2026-01"
```

`period` yozuv paytida hisoblanadi va hujjatda saqlanadi (denormalizatsiya) — agregatsiyada `$dateToString` chaqirmaslik va `period` bo'yicha indeksdan foydalanish uchun.

**Diqqat:** hamma sanalar UTC da yaratiladi (`new Date(Date.UTC(y, m, d))`). Mahalliy vaqt ishlatilsa, `Asia/Tashkent` (UTC+5) da `2026-01-31` `2026-01-30T19:00Z` bo'lib ketadi — bu holda oy chegarasi hali to'g'ri, lekin `2026-02-01 00:00` mahalliy → `2026-01-31T19:00Z` **yanvarga tushadi**. Oy oxiri hodisalari juda ko'p bo'lgani uchun bu jimgina buziladigan xato. Testda alohida tekshiriladi.

## Indekslar

`src/db/indexes.ts` da kod bilan yaratiladi (Mongo da migration tushunchasi yo'q):

```ts
{ period: 1 }                 // P&L, oylik pul oqimi
{ date: 1 }                   // balans "sanaga qadar"
{ period: 1, 'lines.account': 1 }  // faqat o'lchov talab qilsa
```

Uchinchisini **oldindan qo'shmang**. Avval o'lchang (§9), keyin kerak bo'lsa qo'shing va README da "nima uchun" ni yozing — TZ §9 aynan shuni so'raydi.

## Boshqa kolleksiyalar

Faqat seed va hisobotdagi izohlar uchun. **Hisobot raqamlari bularga bog'liq emas** — hammasi jurnaldan chiqadi.

```ts
Student   { _id, name, monthlyFee, discountPercent, enrolledFrom, droppedAt? }
Employee  { _id, name, monthlySalary, hiredFrom, firedAt? }
Loan      { _id, principal, annualRatePercent, takenAt, termMonths }
Investor  { _id, name }
```

Bular bo'lmasa ham uchala hisobot ishlaydi. Shuning uchun ular ustida ko'p vaqt sarflamang — indeks, unique constraint, validatsiya kerak emas.
