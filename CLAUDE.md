# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

EduTizim.uz CRM ning moliya moduli: uchta hisobot — P&L, pul oqimi, balans. Topshiriq `tz.md` da.
Hujjatlar va kod izohlari o'zbek tilida — shu tilda davom ettiring.

## Buyruqlar

```bash
node docs/model-prototype.js   # bazasiz model prototipi, 44/44 tekshiruv — modelning etaloni
npm test                       # vitest run
npm test -- tests/ledger.test.ts          # bitta fayl
npm test -- -t "balanslashmagan"          # bitta test (nom bo'yicha)
npm run typecheck              # tsc --noEmit (npm test buni tekshirmaydi — alohida ishga tushiring)
npm run dev                    # API :3000
npm run seed                   # 3 yillik ma'lumot        (4-sessiyada yoziladi)
npm run reconcile              # uchta tenglik, exit 0/1  (3-sessiyada yoziladi)
npm run bench                  # hisobot vaqtlari         (4-sessiyada yoziladi)
```

Talab: mahalliy MongoDB `mongodb://127.0.0.1:27017` (standalone, parolsiz, **Docker yo'q**) va `.env`
(`cp .env.example .env`). `src/config/env.ts` startda fail-fast qiladi.

## Qat'iy qoidalar

- **Pul — butun son so'm.** `float`, `parseFloat`, `Decimal128` taqiqlangan. Bo'lish kerak bo'lsa —
  `splitAmount()` (qoldiq oxirgi bo'lakka), aks holda yig'indi asl summaga teng chiqmaydi.
- **Sana — faqat `Date.UTC`.** `new Date(y, m, d)` taqiqlangan: `Asia/Tashkent` (UTC+5) da oy oxiri
  hodisalari qo'shni oyga surilib ketadi va buni hech qanday tenglik ushlamaydi. `utcDate()`,
  `endOfMonth()` ishlating.
- **Jurnalga yozish faqat `postEntry()` orqali.** `JournalEntryModel.create()` ni chaqirmang
  (yagona istisno — `tests/ledger.test.ts` dagi negativ test: sxema to'sig'ini chetlab o'tib
  bo'lmasligini isbotlaydi).
- **Jurnal o'zgarmas.** `update`/`delete` yo'q; tuzatish = teskari yozuv. Shuning uchun soft-delete
  ham kerak emas.
- **`reconcile` hisobot funksiyalarini chaqirmaydi** — xom `lines` ustidan mustaqil hisoblaydi.
  Aks holda hisobotdagi xato o'sha xato bilan tekshirilib, aniqlanmay qoladi.
- **Rejada yo'q narsani qo'shishdan oldin so'rang.** Ish `tasks/session-1..5.md` bo'yicha boradi;
  har fayldagi commit nuqtalarida alohida commit qilinadi.

## Arxitektura

**Yagona birlamchi manba — `journal_entries` kolleksiyasi.** Har bir biznes hodisasi bitta
`JournalEntry` hujjati; ichida balanslashgan `lines[]`. Yagona invariant `sum(lines[].amount) === 0`.
Uchala hisobot ham shu jurnaldan **hisoblanadi** — oldindan hisoblangan qoldiq jadvali yo'q.

**Ishorali summa** (klassik debit/credit juftligi emas). Ishoralar `Aktivlar − Majburiyatlar −
Kapital = 0` dan kelib chiqadi: `ASSET`/`EXPENSE` o'sishi `+`, `LIABILITY`/`EQUITY`/`REVENUE` o'sishi
`−`. Natijada uchala tenglik **konstruksiya bo'yicha** bajariladi — "moslashtiruvchi qator"
tushunchasining o'zi yo'q. `retained_earnings` hisob sifatida saqlanmaydi, u
`−sum(REVENUE + EXPENSE)` dan hisoblanadi; yopish yozuvi (closing entry) kerak emas.

**Qatorlar hujjat ichida (embedded), alohida kolleksiya emas.** Sabab arxitekturaviy: standalone
MongoDB da tranzaksiya yo'q, bitta hujjatga yozuv esa atomar — balanslashmagan yarim yozuv
printsipial jihatdan yuzaga kelmaydi. Shu sabab replica set, `session`, `withTransaction` kerak
emas. Narxi: hisobotlarda `$unwind`.

**`cashFlow` — pul oqimining to'g'ridan-to'g'ri usuli.** Faqat pul hisoblari
(`cash.register`, `cash.bank`) qatorlarida bo'ladi va u yerda majburiy:
- `'operating' | 'investing' | 'financing'` — oqim toifasi
- `null` — **ataylab qo'yilgan qiymat**: "bu ko'chirish (inkassatsiya), oqim emas"
- `undefined` — unutilgan, xato; sxema rad etadi

Bitta yozuvda bir hisobga bir nechta qator bo'lishi normal — kredit to'lovi aynan shunday ishlaydi
(foiz → `operating`, asosiy qarz → `financing`, ikkalasi ham `cash.bank`).

Qatlamlar: `ledger/` (hisoblar rejasi, sxema, `postEntry`) → `events/` (biznes hodisa → yozuv,
`docs/03-events.md` dagi 12 ta xarita) → `reports/` (faqat o'qish, hech narsa yozmaydi) →
`http/` (4 ta endpoint, auth yo'q). `scripts/` — seed, reconcile, bench.

## Bilib qo'yish kerak bo'lgan nozikliklar

- **Mongoose subdocument da `'cashFlow' in line` har doim `true`** — sxema yo'llari prototipda
  getter sifatida aniqlangan. Berilmagan va ataylab `null` qo'yilgan holatni faqat
  `doc.get('cashFlow')` ajratadi (`readCashFlow()` shuni qiladi). `enum` ro'yxatiga `null` ataylab
  qo'shilgan.
- **Invariant `assertBalanced()` da**, sxemadan mustaqil funksiya sifatida. `postEntry()` uni
  bazaga tegishdan oldin chaqiradi (aniq xato xabari uchun), `pre('validate')` hook esa oxirgi to'siq
  sifatida — ikkalasi bir xil kod.
- **`period` (`"YYYY-MM"`) `date` dan hosila va hujjatda saqlanadi** (denormalizatsiya) — agregatsiyada
  `$dateToString` chaqirmaslik uchun. Uni faqat `postEntry()` yozadi. `reconcile` da
  `period === toPeriod(date)` alohida tekshiriladi.
- **Testlar alohida bazada** (`MONGO_URI_TEST` → `moliya_test`) va har testdan oldin kolleksiyalarni
  tozalaydi (`useTestDb()`). Shu sababli `vitest.config.ts` da `fileParallelism: false` — parallel
  fayllar bir-birining ma'lumotini o'chirib yuborardi.
- **Nol summali qator rad etiladi.** `docs/03-events.md` dagi "(agar > 0)" shartlari shundan:
  qator qo'shishdan oldin summa nolga teng emasligini tekshiring.
- **O'rnatilgan versiyalar hujjatdagidan yangiroq**: mongoose 9 (hujjatda 8), zod 4, typescript 7.
  Ishlayapti, lekin `docs/01-stack.md` bilan farq qiladi.

## Ataylab yo'q (`docs/01-stack.md`)

Autentifikatsiya/JWT/rollar, Redis, i18n, Swagger, soft-delete, Docker va `docker-compose.yml`,
amortizatsiya, soliq, valyuta, multi-tenant, CI/deploy. Bularni **qo'shmang** — nimani
qilmaganlikning asosi baholanadigan narsa (TZ §10, §15).

## Hujjatlar xaritasi

| Fayl | Nima uchun ochiladi |
|---|---|
| `docs/model-prototype.js` | Model bo'yicha har qanday savolning javobi. Raqam chiqmasa — muammo kodda |
| `docs/02-model.md` | Ma'lumotlar modeli va rad etilgan variantlar (baholashning 30%) |
| `docs/03-events.md` | 12 ta hodisa → jurnal yozuvi xaritasi, oylik sikl tartibi |
| `docs/04-reports.md` | Hisobot agregatsiyalari, `reconcile` algoritmi va chiqish formati |
| `docs/05-decisions.md` | Ochiq modellashtirish qarorlari D1–D10 |
| `tasks/session-*.md` | Bosqichma-bosqich ish rejasi va commit nuqtalari |
