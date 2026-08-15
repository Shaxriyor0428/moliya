# EduTizim.uz — Moliya moduli

O'quv markaz CRM tizimining moliya moduli: **Foyda va zarar (P&L)**, **Pul oqimi (Cash Flow)**, **Balans (Balance Sheet)**.

Topshiriq: [`tz.md`](tz.md)

> **Holat:** reja tayyor, implementatsiya boshlanmagan. Ish rejasi — [`tasks/`](tasks/README.md).
> Bu README implementatsiya davomida to'ldiriladi; ⬜ belgisi hali yozilmagan bo'limlarni ko'rsatadi.
>
> Model bazasiz prototipda tasdiqlangan: `node docs/model-prototype.js` → **44/44 tekshiruv o'tadi**.

---

## Stack

Node.js 20+ · TypeScript · MongoDB 7 · Mongoose · Express · Vitest · React + Vite (frontend)

Sabablar va rad etilgan variantlar: [`docs/01-stack.md`](docs/01-stack.md)

---

## Ishga tushirish

Talab: **Node.js 20+** va ishlab turgan **MongoDB 6/7** (standalone — replica set kerak emas).

```bash
# Mongo mahalliy ishlab turgan bo'lsa — hech narsa kerak emas.
# Bo'lmasa:  docker run -d -p 27017:27017 --name mongo mongo:7

cp .env.example .env          # MONGO_URI=mongodb://127.0.0.1:27017/moliya
npm i

npm run seed                  # 3 yillik ma'lumot
npm run reconcile             # uchta tenglikni tekshirish → exit 0
npm test                      # TZ §5 dagi 5 ta stsenariy
npm run dev                   # API :3000

cd frontend && npm i && npm run dev   # :5173
```

---

## Ma'lumotlar modeli ⬜

> To'liq versiya: [`docs/02-model.md`](docs/02-model.md). Quyidagi qisqartma implementatsiyadan keyin yakunlanadi.

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

**Reconcile hisobot funksiyalarini chaqirmaydi** — xom `lines` ustidan mustaqil hisoblaydi. Aks holda hisobotdagi xato o'sha xato bilan tekshirilib, aniqlanmay qolardi.

Qo'shimcha yaxlitlik tekshiruvlari: har yozuvda `sum(lines) === 0`, butun sonlik, pul qatorlarida `cashFlow` mavjudligi, `period === toPeriod(date)` (timezone), hisob kodlarining haqiqiyligi.

⬜ *Chiqish namunasi implementatsiyadan keyin qo'shiladi.*

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
  events/     biznes hodisa → jurnal yozuvi
  reports/    P&L, pul oqimi, balans
  scripts/    seed, reconcile, bench
  http/       3 ta endpoint
tests/scenarios/   TZ §5 dagi 5 ta majburiy stsenariy
frontend/          Vite + React, bitta sahifa
docs/              model va qarorlar hujjatlari
tasks/             5 sessiyaga bo'lingan ish rejasi
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
| `DECISIONS.md` ⬜ | TZ §11 — investor ulushi bo'yicha ochiq savol |
| `ai-log.md` ⬜ | TZ §12 — AI workflow |
