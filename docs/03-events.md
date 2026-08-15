# 03 — Hodisa → jurnal yozuvi xaritasi

TZ §2.2 jadvalining bajariladigan shakli. Har bir qator `docs/02-model.md` dagi ishora konvensiyasiga amal qiladi.

Barcha misollar `outputs/verify-model.js` prototipida ishga tushirilib tekshirilgan — TZ §5 dagi kutilgan raqamlarning hammasi chiqdi.

Belgilar: `+` summa qo'shiladi, `−` ayiriladi. Har bir blokning yig'indisi **aniq 0**.

---

## 1. `student_payment` — o'quvchi to'lov qildi

Pul kirdi, lekin darslar hali o'tilmagan → **daromad emas, majburiyat**.

To'lov taqsimlanish tartibi (muhim, debitor qarz modeli tufayli):

1. Avval o'quvchining mavjud **debitor qarzi** yopiladi
2. Qolgani **oldindan to'lov**ga tushadi

```
applied  = min(payment, ar_balance(student))
deferred = payment − applied

cash.bank | cash.register   + payment    cashFlow: operating
ar.students                 − applied     (agar > 0)
deferred_revenue            − deferred    (agar > 0)
```

Naqd bo'lsa `cash.register`, karta/Payme/Click bo'lsa `cash.bank`.

> `cashFlow: 'operating'` — **to'liq summa**, oldindan to'lov qismi ham. TZ §5.1: "Yanvar pul oqimi: operatsion kirim 1 800 000". Bu eng ko'p xato qilinadigan nuqtalardan biri: P&L ga faqat 600 000 tushadi, pul oqimiga esa 1 800 000.

---

## 2. `revenue_recognition` — oy oxiri: darslar o'tildi

Oyning oxirgi kunida, har bir faol o'quvchi uchun. **Pul harakatlanmaydi.**

```
fee      = o'quvchining shu oygi to'lovi (chegirma hisobga olingan)
covered  = min(fee, deferred_balance(student))
uncovered = fee − covered

deferred_revenue    + covered     (agar > 0)   majburiyat kamayadi
ar.students         + uncovered   (agar > 0)   debitor qarz paydo bo'ladi
revenue.tuition     − fee                       daromad tan olinadi
```

`covered + uncovered − fee = 0` ✓

`uncovered > 0` = o'quvchi shu oy uchun to'lamagan, lekin dars o'tilgan → daromad baribir tan olinadi, qarshisiga aktiv (debitor qarz) qo'yiladi. Bu hisoblash usuli (accrual) mantig'i.

---

## 3. `student_dropout` — o'quvchi kursni tashlab ketdi

Qolgan oldindan to'lov qaytariladi (qaror asosi: `docs/05-decisions.md` §D2).

```
deferred_revenue    + remaining              majburiyat yopiladi
cash.bank           − remaining   cashFlow: operating
```

Chiqib ketgan o'quvchi uchun keyingi oylarda `revenue_recognition` ishlamaydi.

Agar chiqib ketishda debitor qarz qolsa — u umidsiz qarz sifatida hisobdan chiqariladi:

```
expense.bad_debt    + ar_balance      (agar bu hisob qo'shilsa)
ar.students         − ar_balance
```

> Seed da soddalik uchun chiqib ketuvchilar qarzsiz holda chiqariladi — `expense.bad_debt` hisobini qo'shmaslik uchun. `docs/05-decisions.md` §D3 ga qarang.

---

## 4. `salary_accrual` — oy oxiri: ish haqi hisoblandi

Oyning oxirgi kunida. **Pul harakatlanmaydi.**

```
expense.salary      + salary
salary_payable      − salary
```

TZ §5.2: yanvar P&L da 8 000 000 xarajat, yanvar pul oqimida 0.

---

## 5. `salary_payment` — keyingi oyning 5-sanasi: ish haqi to'landi

```
salary_payable      + salary                    majburiyat yopiladi
cash.bank           − salary   cashFlow: operating
```

Fevral P&L ga **ta'sir qilmaydi** — `expense.salary` bu yozuvda umuman yo'q. TZ §5.2 dagi "Fevral P&L: 0" shu bilan ta'minlanadi.

---

## 6. `operating_expense` — ijara, kommunal, marketing

To'langan paytda P&L va pul oqimiga birga tushadi (bu xarajatlarda hisoblash/to'lash farqi yo'q deb qabul qilingan — `docs/05-decisions.md` §D4).

```
expense.rent | expense.utilities | expense.marketing   + amount
cash.bank | cash.register                              − amount   cashFlow: operating
```

---

## 7. `capital_injection` — investor kapital kiritdi

```
cash.bank      + amount   cashFlow: financing
capital        − amount
```

**Daromad emas.** P&L ga umuman tegmaydi. TZ §5.3: "Yanvar P&L: sof foyda 0".

---

## 8. `loan_received` — bankdan kredit olindi

```
cash.bank         + principal   cashFlow: financing
loan_principal    − principal
```

---

## 9. `loan_payment` — kredit to'lovi ⚠️ eng murakkab yozuv

Bitta to'lov **ikkita pul oqimi toifasiga** bo'linadi: foiz — operatsion, asosiy qarz — moliyaviy.

Shuning uchun pul qatori **ikkiga bo'linadi**:

```
expense.interest    + interest
loan_principal      + principal                         qarz kamayadi
cash.bank           − interest    cashFlow: operating
cash.bank           − principal   cashFlow: financing
```

Yig'indi: `interest + principal − interest − principal = 0` ✓

> Agar pul qatorini bitta qilib (`−12 000 000`) yozsangiz, unga bitta toifa berishga majbur bo'lasiz va TZ §5.4 dagi ikkala tekshiruvdan biri albatta yiqiladi. Bitta hisobga bir yozuvda bir nechta qator yozish mumkin va normal — buni sxema taqiqlamasligi kerak.

Tekshirildi: fevral moliyaviy = `+200 000 000 − 9 000 000 = +191 000 000` ✓, operatsion chiqim = `3 000 000` ✓, balansda qarz `191 000 000` ✓.

---

## 10. `equipment_purchase` — jihoz sotib olindi

```
fixed_assets    + amount
cash.bank       − amount   cashFlow: investing
```

**Xarajat emas.** Pul aktivdan aktivga o'tdi. Amortizatsiya TZ §3 bo'yicha doiradan tashqarida.

---

## 11. `cash_collection` — inkassatsiya (kassadan bankka)

```
cash.bank        + amount   cashFlow: null
cash.register    − amount   cashFlow: null
```

`cashFlow: null` — **ataylab yozilgan qiymat**, "bu ko'chirish, oqim emas" degani. Uchala toifaga ham tushmaydi.

> Ikkalasini `operating` deb belgilash ham raqamlarni buzmaydi (ular netlashadi), lekin hisobotda operatsion aylanmani sun'iy shishiradi va o'qiyotgan odamni chalg'itadi. `null` — to'g'ri javob.

Sof o'zgarishga ta'sir qilmaydi, chunki ikkala qator ham pul hisobi va yig'indisi 0.

---

## 12. `opening_balance` — boshlang'ich qoldiq (faqat seed)

Seed ning eng birinchi kuni. Boshlang'ich pul kapital sifatida kiritiladi:

```
cash.bank      + amount   cashFlow: financing
capital        − amount
```

---

## Yozuvlarni yaratish tartibi (oylik sikl)

Seed va real ish uchun bir xil ketma-ketlik. **Tartib muhim** — daromad tan olish o'quvchining oldindan to'lov qoldig'iga bog'liq.

```
Oy M uchun:

  1–5      student_payment        (to'lovlar)
  5        salary_payment         (M−1 oyining ish haqi)
  5        operating_expense      (ijara)
  oy ichi  operating_expense      (kommunal, marketing)
  ~20      loan_payment
  ~28      cash_collection        (inkassatsiya)
  oy oxiri revenue_recognition    ← to'lovlardan KEYIN
  oy oxiri salary_accrual
```

`revenue_recognition` majburiy ravishda oyning barcha to'lovlaridan keyin bajariladi — aks holda to'lagan o'quvchida ham debitor qarz paydo bo'ladi.

## Umumiy tekshiruv jadvali

| Hodisa | P&L | Pul oqimi | Balans |
|---|---|---|---|
| O'quvchi oldindan to'ladi | — | operatsion kirim (to'liq) | pul ↑, majburiyat ↑ |
| Oy oxiri: darslar o'tildi | daromad ↑ (shu oy ulushi) | — | majburiyat ↓ (yoki debitor ↑), foyda ↑ |
| Oy oxiri: ish haqi hisoblandi | xarajat ↑ | — | majburiyat ↑, foyda ↓ |
| Keyingi oy: ish haqi to'landi | — | operatsion chiqim | pul ↓, majburiyat ↓ |
| Ijara / kommunal / marketing | xarajat ↑ | operatsion chiqim | pul ↓, foyda ↓ |
| Inkassatsiya | — | — | aktivdan aktivga |
| Investor kapitali | — | moliyaviy kirim | pul ↑, kapital ↑ |
| Kredit olindi | — | moliyaviy kirim | pul ↑, qarz ↑ |
| Kredit: asosiy qarz | — | moliyaviy chiqim | pul ↓, qarz ↓ |
| Kredit: foiz | xarajat ↑ | operatsion chiqim | pul ↓, foyda ↓ |
| Jihoz xaridi | — | investitsion chiqim | pul ↓, aktiv ↑ |

TZ §2.2 jadvali bilan qator-ma-qator mos.
