# Sessiya 4 — Seed, majburiy testlar, o'lchov

**Vaqt: 75–90 daqiqa**

**Maqsad:** 3 yillik realistik ma'lumot, beshala test yashil, har bir hisobot `< 1s`.

---

## 4.1. Beshta majburiy test (35 daq) ⭐ 20% ball

**Seeddan OLDIN yozing.** Ular kichik, aniq, va modelni tasdiqlaydi. Seed kattaroq va shovqinliroq — u yiqilsa, testlar qaerda xato ekanini ko'rsatadi.

Har biri **alohida, bo'sh bazadan** boshlanadi (TZ §5).

`tests/scenarios/`

### `01-prepayment.test.ts` (TZ §5.1)
O'quvchi `2026-01-10` da 1 800 000 to'ladi (yanvar/fevral/mart, oyiga 600 000).

| Tekshiruv | Kutilgan |
|---|---|
| Yanvar P&L: daromad | 600 000 |
| 31-yanvar balans: oldindan to'langan darslar | 1 200 000 |
| Yanvar pul oqimi: operatsion kirim | 1 800 000 |
| 31-mart balans: oldindan to'langan darslar | 0 |
| Yanvar–mart jami daromad | 1 800 000 |

### `02-payroll.test.ts` (TZ §5.2)
Oylik 8 000 000, yanvar uchun `2026-02-05` da to'lanadi.

| Tekshiruv | Kutilgan |
|---|---|
| Yanvar P&L: ish haqi xarajati | 8 000 000 |
| 31-yanvar balans: to'lanmagan ish haqi | 8 000 000 |
| Yanvar pul oqimi: jami o'zgarish | 0 |
| Fevral P&L: shu ish haqidan xarajat | 0 |
| Fevral pul oqimi: operatsion chiqim | 8 000 000 |
| 28-fevral balans: to'lanmagan ish haqi | 0 |

### `03-capital.test.ts` (TZ §5.3)
Investor `2026-01-05` da 500 000 000.

| Tekshiruv | Kutilgan |
|---|---|
| Yanvar P&L: daromad | 0 |
| Yanvar P&L: sof foyda | 0 |
| 31-yanvar balans: kapital | 500 000 000 |
| Yanvar pul oqimi: moliyaviy kirim | 500 000 000 |
| Yanvar pul oqimi: operatsion | 0 |

### `04-loan.test.ts` (TZ §5.4)
`2026-02-01` kredit 200 000 000 (18%/yil). `2026-02-20` to'lov 12 000 000 = foiz 3 000 000 + asosiy 9 000 000.

| Tekshiruv | Kutilgan |
|---|---|
| Fevral P&L: shu kreditdan xarajat | 3 000 000 |
| 28-fevral balans: kredit qarzi | 191 000 000 |
| Fevral pul oqimi: moliyaviy | +191 000 000 |
| Fevral pul oqimi: operatsion chiqim (foiz) | 3 000 000 |

### `05-equipment.test.ts` (TZ §5.5)
`2026-01-08` da 240 000 000 lik jihoz.

| Tekshiruv | Kutilgan |
|---|---|
| Yanvar P&L: xarajat | 0 |
| 31-yanvar balans: asosiy vositalar | 240 000 000 |
| Yanvar pul oqimi: investitsion chiqim | 240 000 000 |

> Bu raqamlarning hammasi model prototipida oldindan tekshirilgan — beshala stsenariy ham o'tgan. Agar testingiz yiqilsa, muammo modelda emas, implementatsiyada.

- [ ] Har test oxirida **uchala tenglikni ham** tekshiring — arzon va kuchli

**Commit:** `test: five mandatory scenarios from TZ section 5`

---

## 4.2. Seed (30 daq)

`src/scripts/seed.ts` — TZ §6 talablari:

- [ ] **3 yillik tarix** (masalan `2024-01` … `2026-12`)
- [ ] **500+ o'quvchi**: bir qismi chegirmali, bir qismi 3 oylik oldindan to'lov, bir qismi ba'zi oylarda to'lamaydi (→ debitor qarz, §D1)
- [ ] **20+ xodim**, ish haqi keyingi oyning 5-sanasida
- [ ] Har oy: ijara, kommunal, marketing
- [ ] **2+ investor**, biri keyinroq qo'shimcha kapital kiritgan
- [ ] Bitta bank krediti, har oy to'lov
- [ ] Boshlanishida jihoz xaridi
- [ ] Naqd va bank aralash, oy oxirida inkassatsiya
- [ ] Chiqib ketuvchi o'quvchilar (§D2 — qarzsiz holatda, §D3)

### Oylik sikl — tartib qat'iy

[`docs/03-events.md`](../docs/03-events.md) oxiridagi jadval:

```
1–5      student_payment
5        salary_payment (M−1 uchun)
5        operating_expense (ijara)
oy ichi  operating_expense (kommunal, marketing)
~20      loan_payment
~28      cash_collection
oy oxiri revenue_recognition   ← to'lovlardan KEYIN
oy oxiri salary_accrual
```

- [ ] Boshlang'ich qoldiq — `opening_balance` yozuvi (§D9)
- [ ] Tasodifiylik uchun **qat'iy urug'** (seeded random) — takrorlanadigan bo'lsin, debug qilish uchun
- [ ] Barcha sanalar `Date.UTC` bilan (§D10)
- [ ] Seed boshida bazani tozalash
- [ ] `insertMany` bilan paketlab yozish — 40 000 ta alohida `create()` sekin

**Commit:** `feat: seed script with 3 years of data`

---

## 4.3. Reconcile toza o'tishi (10 daq) ⭐ qattiq to'siq

```bash
npm run seed && npm run reconcile
```

- [ ] `exit 0`, uchala tenglikda `36/36 mos`, farq `0`

Yiqilsa — **modelni tuzatmang, seedni tekshiring.** Model prototipda tasdiqlangan. Odatiy sabablar:

| Belgi | Sabab |
|---|---|
| Tenglik 2 yiqildi | Biror pul qatorida `cashFlow` yozilmagan |
| Tenglik 3 yiqildi | `revenue_recognition` yoki `salary_accrual` noto'g'ri oyga tushgan (timezone) |
| `deferred_revenue < 0` | `revenue_recognition` to'lovlardan oldin ishlagan |
| Tenglik 1 yiqildi | Bu deyarli imkonsiz — invariant hook ni chetlab o'tgansiz |

---

## 4.4. Unumdorlik o'lchovi (10 daq) — TZ §9

`src/scripts/bench.ts`

- [ ] Har bir hisobotni 10 marta ishga tushiring, **median va p95** ni chiqaring
- [ ] ⚠️ **Oxirgi oyni** o'lchang, birinchisini emas — pul oqimining `opening` qismi oldingi 35 oyni skanerlaydi, eng qimmat holat shu
- [ ] Ma'lumot hajmini chiqaring: yozuvlar soni, qatorlar soni
- [ ] `< 1s` bo'lmasa: `$project` bilan `$unwind` dan oldin maydonlarni qisqartiring → qo'shma indeks → oxirgi chora sifatida snapshot kolleksiyasi

- [ ] Natijalarni **README.md ga yozing** — TZ §9 buni aniq talab qiladi

> `< 1s` bo'lsa va siz hech narsa optimallashtirmagan bo'lsangiz — README da shunday yozing: *"o'lchov 1s dan tez ko'rsatdi, optimallashtirish qilinmadi"*. Bu ham to'liq javob. Kerak bo'lmagan optimizatsiya qilib, uni asoslay olmaslikdan yaxshiroq.

**Commit:** `feat: benchmark script, perf measurements in README`

---

## Tugash mezoni

- [ ] `npm test` — beshala stsenariy + 1-sessiya testlari yashil
- [ ] `npm run seed` xatosiz tugaydi
- [ ] `npm run reconcile` — `exit 0`, farq `0`
- [ ] Har bir hisobot `< 1s`, raqamlar README da

---

## Xavflar

| Xavf | Oldini olish |
|---|---|
| Testlar seed bazasini ishlatishi | Alohida test DB, `beforeEach` da tozalash |
| Seed sekin ishlashi (40k yozuv) | `insertMany` paketlab. Har chaqiruvda `await create()` — bir necha daqiqa ketadi |
| Fevral 30-kun (`Date.UTC(2026, 1, 30)`) | Oy oxirini `Date.UTC(y, m + 1, 0)` bilan oling |
| Tasodifiylik har safar boshqa natija berishi | Qat'iy urug'li random. Debug qilib bo'lmaydigan seed — vaqt yeyuvchi |
| Seedda o'quvchi qarzdor holda chiqib ketishi | §D3 — bunday holatni yaratmang |
