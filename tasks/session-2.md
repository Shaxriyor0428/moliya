# Sessiya 2 — Biznes hodisalari

**Vaqt: 60–75 daqiqa**

**Maqsad:** TZ §2.2 jadvalidagi har bir hodisa `postEntry()` chaqiruviga aylanadi. Hisobotlar hali yo'q, lekin jurnalga to'g'ri ma'lumot tushadi.

Ma'lumotnoma: [`docs/03-events.md`](../docs/03-events.md) — har bir yozuvning aniq qatorlari yozilgan, o'ylab topish shart emas.

---

## 2.1. Yordamchi kolleksiyalar (10 daq)

`src/models/` — sodda Mongoose sxemalari. **Indeks, unique, validatsiya kerak emas** — hisobot raqamlari bularga bog'liq emas.

- [ ] `Student { name, monthlyFee, discountPercent, enrolledFrom, droppedAt? }`
- [ ] `Employee { name, monthlySalary, hiredFrom, firedAt? }`
- [ ] `Loan { principal, annualRatePercent, takenAt, termMonths }`
- [ ] `Investor { name }`

10 daqiqadan oshmasin. Bu qism baholanmaydi.

**Commit:** `feat: reference collections`

---

## 2.2. O'quvchi hodisalari (25 daq) ⭐ eng murakkab qism

`src/events/student.ts`

### `recordPayment(studentId, date, amount, method)`

To'lovni taqsimlash — [`docs/03-events.md`](../docs/03-events.md) §1:

```
applied  = min(amount, arBalance)      → ar.students   −applied
deferred = amount − applied            → deferred_revenue −deferred
cash.{bank|register} +amount           cashFlow: 'operating'   ← TO'LIQ summa
```

- [ ] `method: 'cash' | 'bank'` → hisobni tanlaydi
- [ ] `applied === 0` bo'lsa o'sha qator **yozilmaydi** (nol summali qator taqiqlangan)

### `recognizeRevenue(studentId, period)`

Oy oxiri, [`docs/03-events.md`](../docs/03-events.md) §2:

```
covered   = min(fee, deferredBalance)  → deferred_revenue +covered
uncovered = fee − covered              → ar.students      +uncovered
                                          revenue.tuition −fee
```

- [ ] `fee` chegirma bilan: `floor(monthlyFee × (100 − discount) / 100)`
- [ ] Chiqib ketgan (`droppedAt`) o'quvchi uchun ishlamaydi
- [ ] Nol summali qatorlar tashlanadi

### `dropStudent(studentId, date)`

- [ ] Qolgan `deferred_revenue` qaytariladi (§D2)

### Qoldiqlarni qanday olish

Ikki variant:

| Variant | Qachon |
|---|---|
| Jurnaldan agregatsiya (`ref.studentId` bo'yicha) | To'g'riroq — yagona manba. Ammo har o'quvchi uchun so'rov |
| Seed davomida xotirada saqlash | Tez. Seed 500 × 36 = 18 000 marta chaqiradi |

**Tavsiya:** funksiya qoldiqni parametr sifatida qabul qilsin (`arBalance`, `deferredBalance`), chaqiruvchi uni beradi. Seed xotirada kuzatadi, testlar jurnaldan hisoblaydi. Shunda funksiya toza va tez.

**Commit:** `feat: student payment, revenue recognition, dropout`

---

## 2.3. Ish haqi (10 daq)

`src/events/payroll.ts` — [`docs/03-events.md`](../docs/03-events.md) §4–5

- [ ] `accrueSalary(employeeId, period)` — oy oxiri: `expense.salary +` / `salary_payable −`
- [ ] `paySalary(employeeId, forPeriod, date)` — 5-sana: `salary_payable +` / `cash.bank −` operating

> Ikkalasi **butunlay alohida** yozuv. `paySalary` da `expense.salary` umuman yo'q — TZ §5.2 dagi "Fevral P&L: 0" shu bilan ta'minlanadi.

**Commit:** `feat: payroll accrual and payment`

---

## 2.4. Xarajat, moliya, aktiv (15 daq)

`src/events/expense.ts`

- [ ] `recordExpense(kind, date, amount, source)` — ijara / kommunal / marketing (§D4: bir bosqichda)

`src/events/finance.ts`

- [ ] `injectCapital(investorId, date, amount)` — financing
- [ ] `takeLoan(loanId, date, principal)` — financing
- [ ] `payLoan(loanId, date, interest, principal)` — ⚠️ **to'rt qatorli yozuv**, pul ikkiga bo'linadi:
      `expense.interest +i` / `loan_principal +p` / `cash −i operating` / `cash −p financing`

`src/events/asset.ts`

- [ ] `buyEquipment(date, amount)` — `fixed_assets +` / `cash −` **investing**
- [ ] `collectCash(date, amount)` — kassa → bank, ikkala qatorda `cashFlow: null`

**Commit:** `feat: expenses, capital, loan, equipment, cash collection`

---

## 2.5. Aqlni tekshirish (5 daq)

Vaqtinchalik skript yoki test:

- [ ] Har bir hodisa turini bir marta chaqiring
- [ ] Bazadagi **barcha** qatorlarning yig'indisi `0` ekanini tekshiring
- [ ] `loan_payment` yozuvida `cash.bank` da ikkita qator borligini ko'z bilan ko'ring

---

## Tugash mezoni

- [ ] 12 ta hodisa turi ham yozuv yarata oladi
- [ ] Har bir yozuv invariantdan o'tadi (aks holda `postEntry` throw qiladi)
- [ ] Bazadagi barcha qatorlar yig'indisi = 0
- [ ] `npm test` hali yashil

---

## Xavflar

| Xavf | Oldini olish |
|---|---|
| Nol summali qator (`covered === 0`) | Qatorni yozmang. Invariant `amount !== 0` talab qiladi |
| `recognizeRevenue` to'lovlardan **oldin** chaqirilishi | Oylik sikl tartibi qat'iy — [`docs/03-events.md`](../docs/03-events.md) oxiridagi jadval |
| Kredit to'lovida pul bitta qator qilib yozilishi | TZ §5.4 ning ikkala tekshiruvidan biri albatta yiqiladi. To'rt qator |
| `cashFlow` unutilishi | Sxema hook majburlaydi — shuning uchun u 1-sessiyada yozildi |
| Chegirmada float | `Math.floor` va butun son. §D5 |
