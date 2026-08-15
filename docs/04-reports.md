# 04 — Hisobotlar va `reconcile`

Uchala hisobot ham bitta manbadan — `journal_entries` kolleksiyasidan. Hech qanday oldindan hisoblangan jadval yo'q.

## Endpointlar (TZ §7)

| Metod | Yo'l | Parametr | Qaytaradi |
|---|---|---|---|
| GET | `/api/reports/pnl` | `period=2026-01` | Daromad, xarajatlar turlar bo'yicha, jami xarajat, sof foyda |
| GET | `/api/reports/cash-flow` | `period=2026-01` | Oy boshi qoldiq, operatsion/investitsion/moliyaviy, sof o'zgarish, oy oxiri qoldiq |
| GET | `/api/reports/balance` | `asOf=2026-01-31` | Aktivlar, majburiyatlar, kapital (taqsimlanmagan foyda bilan), uchala jami |
| GET | `/api/periods` | — | Bazadagi barcha oylar ro'yxati (frontend selecti uchun) |

---

## 1. Foyda va zarar (P&L)

Faqat `REVENUE` va `EXPENSE` turidagi qatorlar, berilgan oy ichida.

```js
[
  { $match: { period } },
  { $unwind: '$lines' },
  { $match: { 'lines.account': { $in: [...REVENUE_ACCOUNTS, ...EXPENSE_ACCOUNTS] } } },
  { $group: { _id: '$lines.account', total: { $sum: '$lines.amount' } } },
]
```

Chiqishga aylantirish (ishora konvensiyasi bo'yicha):

```
revenue      = −sum(REVENUE hisoblari)      // manfiy saqlanadi
expenses[a]  =  total(a)                    // musbat saqlanadi
totalExpense =  sum(expenses)
netProfit    =  revenue − totalExpense
```

```jsonc
{
  "period": "2026-01",
  "revenue": 600000,
  "expenses": { "expense.salary": 32000000, "expense.rent": 10000000 },
  "totalExpense": 42000000,
  "netProfit": -41400000
}
```

---

## 2. Pul oqimi (Cash Flow) — to'g'ridan-to'g'ri usul

Faqat **pul hisoblariga** tegadigan qatorlar.

**Oy boshidagi qoldiq** — shu oygacha bo'lgan barcha pul qatorlarining yig'indisi:

```js
[
  { $match: { period: { $lt: period } } },
  { $unwind: '$lines' },
  { $match: { 'lines.account': { $in: CASH_ACCOUNTS } } },
  { $group: { _id: null, total: { $sum: '$lines.amount' } } },
]
```

**Oy ichidagi oqimlar** — toifa bo'yicha guruhlash. `cashFlow: null` (inkassatsiya) tashlab yuboriladi:

```js
[
  { $match: { period } },
  { $unwind: '$lines' },
  { $match: { 'lines.account': { $in: CASH_ACCOUNTS } } },
  { $group: {
      _id: '$lines.cashFlow',              // operating | investing | financing | null
      total: { $sum: '$lines.amount' },
  } },
]
```

```
netChange = operating + investing + financing + transfer(=0)
closing   = opening + netChange
```

> `netChange` ni **alohida hisoblamang** — u barcha pul qatorlarining yig'indisi bo'lishi kerak. Toifalar yig'indisi bilan farq chiqsa, demak biror pul qatorida `cashFlow` yozilmagan. Reconcile aynan shuni ushlaydi.

To'g'ridan-to'g'ri usul (har qatorni toifaga belgilash) tanlandi, bilvosita usul (foydadan boshlab tuzatishlar qo'shish) emas — chunki bilvosita usul P&L ga bog'liq bo'lib qoladi va TZ §5.4 dagi kredit to'lovini ikki toifaga bo'lish imkoni yo'qoladi.

---

## 3. Balans (Balance Sheet)

Berilgan **sanaga qadar** barcha qatorlarning kümülativ yig'indisi.

```js
[
  { $match: { date: { $lte: asOf } } },
  { $unwind: '$lines' },
  { $group: { _id: '$lines.account', total: { $sum: '$lines.amount' } } },
]
```

```
assets            =  sum(ASSET hisoblari)
liabilities       = −sum(LIABILITY hisoblari)
capital           = −total('capital')
retainedEarnings  = −sum(REVENUE + EXPENSE hisoblari)     // kümülativ
equity            =  capital + retainedEarnings

totalLiabilitiesAndEquity = liabilities + equity
```

`assets === totalLiabilitiesAndEquity` — **konstruksiya bo'yicha**, chunki har bir yozuv nolga yig'iladi.

```jsonc
{
  "asOf": "2026-01-31",
  "assets": {
    "cash.register": 5000000,
    "cash.bank": 100000000,
    "ar.students": 600000,
    "fixed_assets": 240000000,
    "total": 345600000
  },
  "liabilities": { "deferred_revenue": 40000000, "salary_payable": 32000000, "loan_principal": 0, "total": 72000000 },
  "equity": { "capital": 260600000, "retainedEarnings": 13000000, "total": 273600000 },
  "check": { "assets": 345600000, "liabilitiesAndEquity": 345600000, "difference": 0 }
}
```

`difference` ni chiqishga **ataylab** qo'shing — baholovchi birinchi navbatda shuni qidiradi.

---

## `npm run reconcile` (TZ §4)

### Muhim tamoyil

Reconcile **hisobot funksiyalarini chaqirmaydi**. U xom `lines` ustidan mustaqil hisoblaydi.

Sabab: agar reconcile `pnl()` va `balance()` natijalarini solishtirsa, ikkalasida bir xil xato bo'lsa — tekshiruv o'tadi va hech narsa aniqlanmaydi. Mustaqil hisoblash bu ikki yo'lni kesishtiradi.

Bu ekran yozuvida aytilishi kerak bo'lgan nuqta.

### Algoritm

```
1. Bazadagi barcha period larni ol (distinct, sortlangan)
2. Har bir period uchun:
     a) Tenglik 1 — Balans
        Oy oxirigacha bo'lgan barcha qatorlar bo'yicha:
        diff = sum(ASSET) + sum(LIABILITY) + sum(EQUITY) + sum(REVENUE) + sum(EXPENSE)
        (ishora konvensiyasi bo'yicha bu aniq 0 bo'lishi kerak)

     b) Tenglik 2 — Pul oqimi
        opening + (operating + investing + financing + transfer) − closing

     c) Tenglik 3 — Foyda
        netProfit(period) − (retained(oy oxiri) − retained(oldingi oy oxiri))

3. Har bir tenglik uchun chiqar:
     tekshirilgan oylar soni, mos kelmagan oylar soni, farqlar yig'indisi
4. Barcha farq 0 bo'lsa exit 0, aks holda exit 1
```

### Qo'shimcha tekshiruvlar (arzon, lekin ko'p xatoni ushlaydi)

Bular TZ da talab qilinmagan, ammo `reconcile` ni ancha kuchliroq qiladi:

| Tekshiruv | Nimani ushlaydi |
|---|---|
| Har bir yozuvda `sum(lines) === 0` | Sxema hook chetlab o'tilgan holat |
| Har bir `amount` butun son | Float kirib qolgani |
| Pul qatorlarida `cashFlow !== undefined` | Yangi hodisa turi qo'shilib, toifa yozilmagani |
| Pul bo'lmagan qatorda `cashFlow` yo'q | Toifa noto'g'ri joyga yozilgani |
| `period === toPeriod(date)` | Denormalizatsiya buzilgani / timezone xatosi |
| Har bir `account` hisoblar rejasida bor | Nomda xato |
| `deferred_revenue >= 0`, `salary_payable >= 0` | Majburiyat manfiyga tushib ketgani (mantiq xatosi belgisi) |

### Chiqish formati

```
Tekshirilgan oylar: 36  (2024-01 … 2026-12)

  1) Balans tenglamasi          36/36 mos    farq: 0
  2) Pul oqimi bog'lanishi      36/36 mos    farq: 0
  3) Foyda bog'lanishi          36/36 mos    farq: 0

  Yaxlitlik: 42 318 yozuv, 91 204 qator — hammasi balanslashgan

RECONCILE: OK
```

Xato bo'lganda mos kelmagan oylarni farqi bilan ro'yxatlash:

```
  2) Pul oqimi bog'lanishi      34/36 mos    farq: 12 500 000
       2026-03   +12 000 000
       2026-07      +500 000

RECONCILE: FAILED
```

> TZ §4: "farqni sun'iy ravishda yopib qo'yish — avtomatik rad etish sababi". Bizda balansga "moslashtiruvchi" qator qo'shish imkoniyati printsipial jihatdan yo'q, chunki `retained_earnings` saqlanmaydi — u hisoblanadi.

---

## Unumdorlik (TZ §9)

Talab: 3 yillik ma'lumotda har bir hisobot **< 1 soniya**.

Kutilgan hajm: ~500 o'quvchi × 36 oy × 2 + 20 xodim × 36 × 2 + oylik xarajatlar ≈ **40 000 yozuv, ~90 000 qator**.

### Reja

1. **Avval o'lchang.** `npm run bench` — har bir hisobotni 10 marta ishga tushirib, median va p95 ni chiqaradi.
2. `{ period: 1 }` va `{ date: 1 }` indekslari bilan boshlang.
3. Sekin bo'lsa, shu tartibda:
   - `$project` bilan `$unwind` dan oldin keraksiz maydonlarni tashlash
   - `{ period: 1, 'lines.account': 1 }` qo'shma indeksi
   - **oxirgi chora:** `monthly_balances` snapshot kolleksiyasi (faqat kesh, birlamchi manba emas; `seed` oxirida va har yozuvdan keyin yangilanadi)

Eng qimmat so'rov — **oxirgi oyning pul oqimi**, chunki oy boshidagi qoldiq uchun oldingi 35 oyning hammasini skanerlaydi. Bench aynan shuni o'lchashi kerak, birinchi oyni emas.

README ga yozing (TZ §9 talabi): ma'lumot hajmi, har bir hisobotning o'lchangan vaqti, va optimallashtirish qilgan bo'lsangiz — nima va nima uchun. **Agar indekssiz ham 1 soniyadan tez bo'lsa, "optimallashtirish qilmadim, chunki o'lchov shuni ko'rsatdi" — bu ham to'liq javob** va oshirib yuborilgan optimizatsiyadan yaxshiroq.
