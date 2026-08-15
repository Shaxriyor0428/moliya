# 05 — Ochiq modellashtirish qarorlari

TZ da aniq belgilanmagan nuqtalar. Har biri uchun: **tanlangan javob**, sabab, va rad etilgan alternativa.

Bu ro'yxat ekran yozuvi (25%) uchun tayyorgarlik — TZ §13.2 aynan shuni so'raydi: *"qaysi variantlarni ko'rdingiz, nimadan voz kechdingiz va nega"*.

> Diqqat: bu fayl `DECISIONS.md` **emas**. `DECISIONS.md` faqat TZ §11 dagi investor savoliga bag'ishlanadi.

---

## D1. To'lamagan o'quvchi — debitor qarz

**Tanlandi: debitor qarz (`ar.students`).** Dars o'tildi → daromad tan olinadi, qarshisiga aktiv qo'yiladi.

Sabab: hisoblash usuli (accrual) mantig'i shuni talab qiladi — TZ §3 dagi "Daromad ≠ pul" qoidasi ikki tomonga ham ishlaydi. Pul kelmasdan daromad bo'lishi mumkin, xuddi pul kelib daromad bo'lmasligi mumkinligi kabi.

**Rad etildi:** "to'lamagan oy = o'qimagan oy, daromad yo'q". Soddaroq, TZ testlari buni tekshirmaydi, lekin model sayozlashadi va §14 dagi 30% aynan model chuqurligiga beriladi.

**Narxi:** to'lovni taqsimlash qoidasi kerak bo'ladi (avval qarz, keyin oldindan to'lov) va har bir o'quvchining ikkita qoldig'ini kuzatish kerak. `docs/03-events.md` §1–2 ga qarang.

---

## D2. Kursni tashlab ketgan o'quvchining oldindan to'lovi

**Tanlandi: qaytariladi (refund).** `deferred_revenue` yopiladi, `cash.bank` dan chiqim, operatsion.

Sabab: majburiyat qandaydir yo'l bilan yopilishi **shart**. Aks holda `deferred_revenue` abadiy osilib qoladi va balansda o'sib boradi — bu ko'rinib turgan xato bo'lardi.

**Rad etildi:**
- *Kuyib ketadi (forfeit) → daromadga o'tkaziladi.* Ham to'g'ri javob, ko'p markazlarda shunday. Lekin "o'tilmagan dars uchun daromad" TZ §3 ning ruhiga zid ko'rinadi va tushuntirish uzunroq bo'ladi.
- *Majburiyat qoldiriladi.* Xato — hech qachon yopilmaydi.

Bu haqiqiy biznes qarori bo'lgani uchun README da bir jumla bilan eslatiladi.

---

## D3. Chiqib ketgan o'quvchining debitor qarzi

**Tanlandi: seed da bunday holat yaratilmaydi** — chiqib ketuvchilar faqat qarzsiz holatda chiqariladi.

Sabab: umidsiz qarzni hisobdan chiqarish (`expense.bad_debt`) yangi hisob, yangi hodisa turi va yangi test talab qiladi. TZ uni so'ramaydi. 5–6 soatlik byudjetda bu sof qo'shimcha risk.

**Agar vaqt qolsa:** `expense.bad_debt` qo'shish 10 daqiqalik ish — `docs/03-events.md` §3 da yozuv tayyor.

---

## D4. Ijara/kommunal/marketing — hisoblash yoki to'lov paytida?

**Tanlandi: to'lov paytida** (bir vaqtning o'zida xarajat va pul chiqimi).

Sabab: TZ §2.2 jadvalida bu qator aynan shunday — "Ijara, kommunal, marketing to'landi → Xarajat ↑ / Operatsion chiqim / Pul ↓, foyda ↓". Bitta hodisa, ikkala ta'sir birga.

**Rad etildi:** ish haqi kabi ikki bosqichli qilish (hisoblash → to'lash). TZ buni faqat ish haqi uchun talab qiladi. Boshqa xarajatlarni ham shunday qilish modelni murakkablashtiradi va hech qanday tekshiruvni yaxshilamaydi.

---

## D5. Chegirma qanday ishlaydi?

**Tanlandi: chegirma o'quvchining oylik to'loviga qo'llaniladi** (`monthlyFee × (100 − discount) / 100`), alohida "chegirma xarajati" hisobi yo'q.

Sabab: chegirma — daromadning kamayishi, xarajat emas. Alohida kontr-daromad hisobi (`revenue.discount`) hisobotni boyitardi, lekin TZ hisobotlarda chegirmani ko'rsatishni so'ramaydi.

Yaxlitlash: `Math.floor` — markaz foydasiga emas, o'quvchi foydasiga bir tiyin farq muhim emas, lekin **qoida barqaror bo'lishi shart**, aks holda qoldiq to'planadi.

---

## D6. Qoldiqni taqsimlash

**Tanlandi: `floor` har oyga, qoldiq oxirgi oyga.**

```
1 000 000 / 3  →  333 333 | 333 333 | 333 334
```

Sabab: yig'indi aniq `total` ga teng bo'lishi **shart**. Aks holda `deferred_revenue` nolga tushmaydi va TZ §5.1 dagi "31-mart: 0" tekshiruvi yiqiladi.

**Rad etildi:** har oyga yaxlitlash (`Math.round`) — yig'indi asl summadan farq qilishi mumkin.

Bu funksiya `src/shared/money.ts` da alohida turadi va o'z birlik testiga ega. Kichik, lekin butun modelni buzishi mumkin bo'lgan joy.

---

## D7. Kassa va bank — ikkita alohida hisob

**Tanlandi: `cash.register` va `cash.bank` alohida.**

Sabab: TZ §2.1 inkassatsiyani alohida hodisa sifatida ta'kidlaydi va §2.2 da unga alohida qator ajratgan ("Bir aktivdan ikkinchisiga"). Bitta `cash` hisobi bo'lsa, inkassatsiya modelda umuman ko'rinmaydi — ya'ni TZ ning bir talabi bajarilmaydi.

Ikkalasi ham "pul hisobi" deb belgilanadi va pul oqimi ikkalasining yig'indisi bo'yicha hisoblanadi.

---

## D8. Kredit — amortizatsiya jadvali yoki qat'iy summalar?

**Tanlandi: har oy foiz = `qoldiq × yillik_stavka / 12`, asosiy qarz = qat'iy summa.**

Sabab: TZ §5.4 da foiz va asosiy qarz **berilgan** (3 mln / 9 mln), ya'ni test uchun jadval hisoblash kerak emas. Seed uchun esa sodda sxema yetarli — annuitet formulasi hech qanday tekshiruvni yaxshilamaydi.

Tekshiruv: `200 000 000 × 18% / 12 = 3 000 000` — TZ raqami bilan mos, ya'ni ular ham shu sodda sxemani ko'zda tutgan.

---

## D9. Boshlang'ich qoldiq qayerdan keladi?

**Tanlandi: seed ning birinchi kuni investor kapitali sifatida** (`opening_balance` yozuvi).

Sabab: har qanday boshlang'ich aktiv kapital yoki majburiyat bilan muvozanatlanishi shart. "Shunchaki pul bor edi" degan yozuv balansni buzadi.

**Rad etildi:** noldan boshlash — birinchi oyda jihoz xaridi va ish haqi to'lovi uchun pul yetmaydi, kassa manfiyga tushadi. Bu texnik jihatdan reconcile ni buzmaydi, lekin ma'lumot norealistik bo'ladi (TZ §6: "realistik hajmdagi ma'lumot").

---

## D10. Timezone

**Tanlandi: hamma sana UTC da yaratiladi.** `new Date(Date.UTC(y, m, d))`.

Sabab: oy oxiri hodisalari (daromad tan olish, ish haqi hisoblash) juda ko'p, va `Asia/Tashkent` UTC+5 da mahalliy `2026-02-01 00:00` → `2026-01-31T19:00Z` bo'lib **yanvarga tushadi**. Bu jimgina buziladigan xato: reconcile o'tadi (jurnal baribir balanslashgan), lekin oylik raqamlar surilib ketadi.

Reconcile da alohida tekshiruv: `period === toPeriod(date)`.

---

## Keyinchalik qaralishi mumkin (birinchi versiyaga kirmaydi)

- `expense.bad_debt` — umidsiz qarzni hisobdan chiqarish
- `revenue.discount` — kontr-daromad hisobi
- Amortizatsiya (TZ §3 bo'yicha aniq doiradan tashqarida)
- Yil yakunidagi yopish yozuvlari — kerak emas, `retained_earnings` hisoblanadi
- Ko'p filial / multi-tenant (TZ §10)
