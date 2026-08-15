# EduTizim.uz — Moliya moduli

O'quv markaz CRM tizimining moliya moduli: **Foyda va zarar (P&L)**, **Pul oqimi (Cash Flow)**, **Balans (Balance Sheet)**.

Topshiriq: [`tz.md`](tz.md)

> Model bazasiz prototipda tasdiqlangan: `node docs/model-prototype.js` → **44/44 tekshiruv o'tadi**.
> Implementatsiya aynan shu mantiqni takrorlaydi.

---

## Stack

Node.js 22 · TypeScript 7 · MongoDB 8.3 · Mongoose 9 · Express 5 · zod 4 · Vitest 4 · Vite 7 + React 19 (frontend)

Sabablar va rad etilgan variantlar: [`docs/01-stack.md`](docs/01-stack.md)

---

## Ishga tushirish

Talab: **Node.js 20+** va ishlab turgan **MongoDB 6+** (standalone — replica set
kerak emas, sababi pastda "Ma'lumotlar modeli" bo'limida).

```bash
# Mongo mahalliy ishlab turgan bo'lsa — hech narsa kerak emas.
# Bo'lmasa, bir qatorda:  docker run -d -p 27017:27017 --name mongo mongo:8

cp .env.example .env          # MONGO_URI=mongodb://127.0.0.1:27017/moliya
npm i

npm run seed                  # 3 yillik ma'lumot (~26 s)
npm run reconcile             # uchta tenglikni tekshirish → exit 0
npm test                      # 76 test, shu jumladan TZ §5 dagi 5 ta stsenariy
npm run dev                   # API :3000
```

Qo'shimcha skriptlar: `npm run bench` (§9 o'lchovi), `npm run typecheck`.

### Frontend

Alohida `package.json`, o'z `npm i` si bilan. Backend ishlab turishi kerak.

```bash
npm run dev                              # 1-terminal: API :3000

cd frontend && npm i && npm run dev      # 2-terminal: UI  :5173
```

Keyin brauzerda `http://localhost:5173` — yuqoridagi `<select>` dan oyni tanlang.
Backend CORS ni ochiq qoldiradi, shuning uchun Vite proxy sozlanmagan.

---

## Ma'lumotlar modeli

> To'liq asoslash va rad etilgan variantlar: [`docs/02-model.md`](docs/02-model.md).
> Kod: [`src/ledger/`](src/ledger) — hisoblar rejasi, sxema, `postEntry()`.

**Ikki tomonlama yozuv (double-entry), ishorali summa bilan.**

Har bir biznes hodisasi bitta `JournalEntry` hujjatiga aylanadi, ichida balanslashgan `lines[]`. Yagona invariant:

```
sum(lines[].amount) === 0
```

Ishoralar balans tenglamasidan kelib chiqadi (`Aktivlar − Majburiyatlar − Kapital = 0`):

| Hisob turi | O'sish |
|---|---|
| ASSET | `+` |
| LIABILITY, EQUITY, REVENUE | `−` |
| EXPENSE | `+` |

Uchala hisobot shu bitta jurnaldan hisoblanadi. Oldindan hisoblangan qoldiq jadvallari yo'q.

### Nega shunday

**1. Uchala tenglik konstruksiya bo'yicha bajariladi, tekshirib tuzatish orqali emas.**
`retained_earnings` (taqsimlanmagan foyda) hisob sifatida umuman **saqlanmaydi** — u barcha REVENUE + EXPENSE qatorlarining kümülativ yig'indisidan hisoblanadi. Shu sababli balansga "moslashtiruvchi" qator qo'shish imkoniyatining o'zi yo'q (TZ §4 ogohlantirishi).

**2. Qatorlar hujjat ichida (embedded) — shuning uchun tranzaksiya kerak emas.**
MongoDB standalone rejimida tranzaksiya yo'q. Agar har bir qator alohida hujjat bo'lsa, yozuv o'rtasida uzilish bazada balanslashmagan holat qoldirardi. Bitta hujjatga yozuv Mongo da atomar — balanslashmagan holat printsipial jihatdan yuzaga kelmaydi. Replica set, `session`, `withTransaction` — hech biri kerak emas.

**3. Pul oqimi to'g'ridan-to'g'ri usulda.**
Har bir pul qatori `cashFlow: operating | investing | financing | null` bilan belgilanadi. Bu kredit to'lovini ikki toifaga bo'lish imkonini beradi (foiz → operatsion, asosiy qarz → moliyaviy) — bilvosita usulda bu mumkin emas. Inkassatsiya `null` bilan belgilanadi: pul ko'chishi, oqim emas.

**4. Jurnal o'zgarmas.**
Tuzatish = teskari yozuv. Shuning uchun soft-delete, `deletedAt`, `withDeleted` — hech biri kerak emas.

### Rad etilgan variantlar

| Variant | Nega yo'q |
|---|---|
| Har hisobot uchun alohida kolleksiya | Bitta hodisa uch joyga yoziladi → tenglik faqat omad bilan bajariladi |
| Tranzaksiyalar ro'yxati (`type` + `amount`) | Oy oxiridagi pulsiz hodisalar (daromad tan olish, ish haqi hisoblash) modelga sig'maydi |
| Oldindan hisoblangan oylik qoldiqlar birlamchi manba sifatida | Tarixiy tuzatishda hammasi yaroqsiz bo'ladi. Snapshot — faqat kesh |
| Klassik `debit`/`credit` juftligi | Ishlaydi, lekin invariant ikkita shartga bo'linadi va har agregatsiyada `debit − credit` yozish kerak |

---

## Hisoblar rejasi

| Kod | Turi | Izoh |
|---|---|---|
| `cash.register` | ASSET | Kassa (naqd) |
| `cash.bank` | ASSET | Bank hisobi |
| `ar.students` | ASSET | O'quvchilardan debitor qarz |
| `fixed_assets` | ASSET | Jihoz, mebel |
| `deferred_revenue` | LIABILITY | Oldindan to'langan darslar |
| `salary_payable` | LIABILITY | To'lanmagan ish haqi |
| `loan_principal` | LIABILITY | Kredit asosiy qarzi |
| `capital` | EQUITY | Investor kapitali |
| `revenue.tuition` | REVENUE | Dars daromadi |
| `expense.*` | EXPENSE | salary, rent, utilities, marketing, interest |

---

## API

| Metod | Yo'l | Parametr |
|---|---|---|
| GET | `/api/reports/pnl` | `period=2026-01` |
| GET | `/api/reports/cash-flow` | `period=2026-01` |
| GET | `/api/reports/balance` | `asOf=2026-01-31` |
| GET | `/api/periods` | — |

Autentifikatsiya yo'q — TZ §10 bo'yicha doiradan tashqarida.

---

## `npm run reconcile`

Bazadagi **har bir oy** uchun uchta tenglikni tekshiradi:

```
1) Aktivlar = Majburiyatlar + Kapital
2) Oy boshidagi pul + (operatsion + investitsion + moliyaviy) = Oy oxiridagi pul
3) Oyning sof foydasi = Taqsimlanmagan foydaning o'sha oydagi o'zgarishi
```

Har biri uchun: tekshirilgan oylar soni, mos kelmagan oylar soni, farqlar yig'indisi. Hammasi to'g'ri bo'lsa `exit 0`, aks holda `exit 1`.

**Reconcile hisobot funksiyalarini chaqirmaydi** — xom `lines` ustidan mustaqil
hisoblaydi. Agar u `pnl()` va `balance()` natijalarini solishtirsa, ikkalasidagi
bir xil xato tekshiruvdan o'tib ketardi. Shu sababli reconcile da agregatsiya
pipeline'i ham ishlatilmaydi: yozuvlar `lean()` bilan xom o'qiladi va oddiy sikl
bilan yig'iladi — hisobot kodi bilan umumiy kodi yo'q.

Qo'shimcha yaxlitlik tekshiruvlari: har yozuvda `sum(lines) === 0`, qator soni ≥ 2,
butun sonlik, pul qatorlarida `cashFlow` mavjudligi va pul bo'lmaganda yo'qligi,
`period === toPeriod(date)` (timezone), hisob kodlarining haqiqiyligi,
`deferred_revenue ≥ 0`, `salary_payable ≥ 0`.

### Chiqish

`npm run seed` dan keyin (36 oy, 28 170 yozuv):

```
Tekshirilgan oylar: 36  (2024-01 … 2026-12)

  1) Balans tenglamasi         36/36 mos    farq: 0
  2) Pul oqimi bog'lanishi     36/36 mos    farq: 0
  3) Foyda bog'lanishi         36/36 mos    farq: 0

  Yaxlitlik: 28 170 yozuv, 56 653 qator — hammasi balanslashgan

RECONCILE: OK
```

Buzilgan ma'lumotda (o'sha bazaga ataylab ikkita nosoz yozuv qo'shildi:
biri balanslashmagan, ikkinchisining pul qatorida `cashFlow` yo'q — ikkalasi ham
`2026-01` da). Chiqish `exit 1` bilan tugaydi:

```
Tekshirilgan oylar: 36  (2024-01 … 2026-12)

  1) Balans tenglamasi         24/36 mos    farq: 1 200 000
       2026-01            100 000
       2026-02            100 000
       …
       2026-12            100 000
  2) Pul oqimi bog'lanishi     35/36 mos    farq: -2 000 000
       2026-01         -2 000 000
  3) Foyda bog'lanishi         36/36 mos    farq: 0

  Yaxlitlik: 2 ta muammo
       2026-01 operating_expense: yozuv balanslashmagan
       2026-01 student_payment: cash.bank pul hisobi, lekin cashFlow yo'q

RECONCILE: FAILED
```

Ikkita tafsilot diqqatga loyiq:

- **Balans tenglamasi 12 oyda yiqildi, bittada emas.** U kümülativ: yanvarda
  paydo bo'lgan og'ish keyingi har bir oyda ham ko'rinadi. Pul oqimi esa oylik —
  faqat buzilgan oyni ko'rsatadi. Ikkalasi birga buzilish **qachon** boshlanganini
  aniq ko'rsatadi.
- **Foyda bog'lanishi buzilmadi.** Bu ham to'g'ri: qo'shilgan xarajat o'sha oyning
  P&L iga ham, taqsimlanmagan foydasiga ham bir xil tushdi. Uchta tenglik uch xil
  narsani ushlaydi — biri yiqilmagani qolganlarini oqlamaydi.

Bu holat `tests/reports.test.ts` da yettita turli buzilish uchun avtomatlashtirilgan.

---

## Unumdorlik

TZ §9: 3 yillik ma'lumotda har bir hisobot < 1 soniya. O'lchov — `npm run bench`
(har hisobot 10 marta, bitta isitish yugurishidan keyin).

| | |
|---|---|
| Ma'lumot | 36 oy (2024-01 … 2026-12), 520 o'quvchi, 22 xodim |
| Yozuvlar soni | 28 170 |
| Qatorlar soni | 56 653 |
| P&L — oxirgi oy (median / p95) | **7.0 ms** / 16.2 ms |
| Pul oqimi — oxirgi oy (median / p95) | **181.3 ms** / 217.1 ms |
| Balans — oxirgi sana (median / p95) | **172.1 ms** / 219.6 ms |
| Oylar ro'yxati (median / p95) | 2.5 ms / 3.7 ms |
| Indekslar | `{ period: 1 }`, `{ date: 1 }` |
| Optimallashtirish | **qilinmadi** — pastdagi izohga qarang |

Muhit: Windows 11, Node.js 22, mahalliy MongoDB 8.3 (standalone).

**Pul oqimi va balans ataylab oxirgi oyda o'lchangan.** Pul oqimining oy boshidagi
qoldig'i o'zidan oldingi 35 oyni skanerlaydi, balans esa `date <= asOf` bo'yicha
butun tarixni — ya'ni ikkalasining eng qimmat holati shu. Birinchi oyni o'lchash
yolg'on tasalli bo'lardi (P&L ning 7 ms i shundan: u faqat bitta oyga tegadi).

**Nima uchun optimallashtirilmadi.** Eng sekin so'rov p95 da 220 ms — talabdan
4.5 barobar tez. `{ period: 1, 'lines.account': 1 }` qo'shma indeksi, `$unwind` dan
oldingi `$project`, `monthly_balances` snapshot keshi — uchalasi ham rejada bor edi,
lekin o'lchov ularni asoslamadi. O'lchov ko'rsatmagan optimizatsiya — bu qo'shimcha
kod, qo'shimcha xato manbai va tushuntirib bo'lmaydigan murakkablik.

Agar ma'lumot 10 barobar o'ssa, birinchi qadam qo'shma indeks bo'ladi — u
`src/db/indexes.ts` da bir qator bilan qo'shiladi.

---

## Loyiha strukturasi

```
src/
  ledger/     hisoblar rejasi, jurnal sxemasi, postEntry()   ← yadro
  events/     biznes hodisa → jurnal yozuvi (12 ta hodisa)
  reports/    P&L, pul oqimi, balans, oylar ro'yxati
  scripts/    seed, reconcile, bench
  models/     Student, Employee, Loan, Investor — faqat seed uchun
  http/       4 ta endpoint
  db/         ulanish va indekslar
  shared/     money, period, seeded random
tests/
  ledger.test.ts     invariant: balanslashmagan yozuv rad etiladi
  events.test.ts     12 ta hodisa, barcha qatorlar yig'indisi 0
  reports.test.ts    tz.md §2.3 misoli + reconcile buzilishlarni ushlashi
  scenarios/         TZ §5 dagi 5 ta majburiy stsenariy
frontend/            Vite + React, bitta sahifa
docs/                model va qarorlar hujjatlari
tasks/               5 sessiyaga bo'lingan ish rejasi
```

---

## Hujjatlar

| Fayl | Mazmun |
|---|---|
| [`docs/model-prototype.js`](docs/model-prototype.js) | Bazasiz model prototipi — 44 ta tekshiruv, TZ §5 va §2.3 raqamlari |
| [`docs/01-stack.md`](docs/01-stack.md) | Stack, struktura, ataylab ishlatilmagan narsalar |
| [`docs/02-model.md`](docs/02-model.md) | Ma'lumotlar modeli — to'liq asoslash |
| [`docs/03-events.md`](docs/03-events.md) | Hodisa → jurnal yozuvi xaritasi (12 ta hodisa) |
| [`docs/04-reports.md`](docs/04-reports.md) | Hisobot algoritmlari va reconcile spetsifikatsiyasi |
| [`docs/05-decisions.md`](docs/05-decisions.md) | Modellashtirish qarorlari (D1–D10) |
| [`tasks/`](tasks/README.md) | 5 sessiyaga bo'lingan ish rejasi |
| [`DECISIONS.md`](DECISIONS.md) | TZ §11 — investor ulushi bo'yicha ochiq savol |
| [`ai-log.md`](ai-log.md) | TZ §12 — AI bilan ishlash jurnali |
| [`CLAUDE.md`](CLAUDE.md) | Loyihaning qat'iy qoidalari (AI sessiyalari uchun) |
