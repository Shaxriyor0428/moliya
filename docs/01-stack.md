# 01 — Stack, struktura va konvensiyalar

## Stack

| Qatlam | Tanlov | Sabab |
|---|---|---|
| Runtime | Node.js 20+ | TZ §0 talabi |
| Til | TypeScript (strict) | TZ §0 talabi |
| DB | MongoDB 7 | TZ §0 talabi (majburiy) |
| ODM | Mongoose 8 | Sxema validatsiyasi kerak — `sum(lines) === 0` invariantini yozuv paytida majburlash uchun |
| HTTP | Express 5 | Minimal. TZ §15: "kutubxona tanlovi baholanmaydi". Auth yo'q, middleware zanjiri kerak emas |
| Test | Vitest | Tez, TS ni tabiiy o'qiydi, `tsx` bilan bir xil transform |
| Skript ishga tushirish | tsx | `ts-node` + config ovorasi yo'q |
| Frontend | Vite + React 19 + TS | TZ §8: React+TS, UI kutubxona kerak emas, ≤30 daqiqa |
| Validatsiya | zod | Env va API query parametrlari uchun. Ixtiyoriy — vaqt yetmasa qo'lda tekshirув |

**MongoDB — mahalliy o'rnatilgan server** (Docker ishlatilmaydi). Standalone rejim, replica set shart emas — sababi `docs/02-model.md` da: qatorlar hujjat ichida bo'lgani uchun tranzaksiya kerak emas.

Ulanish: `mongodb://127.0.0.1:27017/moliya` (parolsiz, mahalliy). `.env` orqali beriladi — kodda qattiq yozilmaydi.

> Baholovchida Docker bo'lishi mumkin. README da **ikkala variant** ham ko'rsatiladi: mahalliy Mongo va bir qatorlik `docker run`. `docker-compose.yml` yozilmaydi — sinovdan o'tkazolmagan faylni repoga qo'yish kerak emas.

## Struktura

```
moliya-crm/
├─ package.json              # TZ §13.1 talab qilgan skriptlar shu yerda
├─ tsconfig.json
├─ .env.example
├─ README.md                 # o'rnatish, model tanlovi izohi, o'lchovlar
├─ DECISIONS.md              # TZ §11
├─ ai-log.md                 # TZ §12
├─ tz.md                     # asl topshiriq
├─ docs/                     # ushbu ishchi hujjatlar
├─ tasks/                    # 5 sessiyaga bo'lingan reja
├─ src/
│  ├─ config/env.ts          # env o'qish + validatsiya, startda fail-fast
│  ├─ db/
│  │  ├─ connection.ts
│  │  └─ indexes.ts          # indekslar kod bilan boshqariladi (migration yo'q)
│  ├─ ledger/                # YADRO — 30% ball shu yerda
│  │  ├─ accounts.ts         # hisoblar rejasi + turlari + pul hisoblari
│  │  ├─ journal.model.ts    # Mongoose sxema + balans invarianti
│  │  └─ post.ts             # postEntry() — yagona yozuv nuqtasi
│  ├─ events/                # biznes hodisa -> jurnal yozuvi
│  │  ├─ student.ts          # to'lov, daromad tan olish, chiqib ketish
│  │  ├─ payroll.ts          # hisoblash, to'lash
│  │  ├─ expense.ts          # ijara, kommunal, marketing
│  │  ├─ finance.ts          # kapital, kredit olish/to'lash
│  │  └─ asset.ts            # jihoz xaridi, inkassatsiya
│  ├─ reports/
│  │  ├─ pnl.ts
│  │  ├─ cashflow.ts
│  │  ├─ balance.ts
│  │  └─ periods.ts          # bazadagi barcha oylar ro'yxati
│  ├─ http/
│  │  ├─ server.ts
│  │  └─ routes.ts           # 3 ta endpoint
│  ├─ scripts/
│  │  ├─ seed.ts             # npm run seed
│  │  └─ reconcile.ts        # npm run reconcile
│  └─ shared/
│     ├─ money.ts            # butun son arifmetikasi + qoldiq taqsimlash
│     └─ period.ts           # Date -> "YYYY-MM" (UTC)
├─ tests/
│  ├─ helpers/db.ts          # har test bo'sh bazadan boshlanadi (TZ §5)
│  └─ scenarios/*.test.ts    # 5 ta majburiy stsenariy
└─ frontend/                 # alohida Vite app, o'z package.json i
   └─ src/App.tsx
```

### Nega `src/` root da, `backend/` emas

TZ §13.1: `package.json` da `npm run seed`, `npm run reconcile`, `npm test`, `npm run dev` ishlashi kerak. Root da bitta package.json bo'lsa — hech qanday workspace uzatish qatlami kerak emas, baholovchi `npm i && npm run seed` deb yozadi va ishlaydi. `frontend/` alohida kichik app, o'z `npm i` si bilan.

## Skriptlar (TZ §13.1 majburiy)

```jsonc
{
  "dev":       "tsx watch src/http/server.ts",
  "seed":      "tsx src/scripts/seed.ts",
  "reconcile": "tsx src/scripts/reconcile.ts",
  "test":      "vitest run",
  "bench":     "tsx src/scripts/bench.ts",     // §9 o'lchovlari uchun
  "fe:dev":    "npm --prefix frontend run dev"
}
```

## Konvensiyalar

- **Jurnal yozuvlari o'zgarmas.** `update`/`delete` yo'q. Tuzatish = teskari yozuv. Shuning uchun soft-delete, `deletedAt`, `withDeleted` — hech biri kerak emas.
- **Yagona yozuv nuqtasi.** Hech qaysi modul `JournalEntry.create()` ni to'g'ridan-to'g'ri chaqirmaydi — faqat `postEntry()`. Invariant bitta joyda majburlanadi.
- **Hisobotlar hech narsa yozmaydi.** Faqat o'qish. Hisobot chaqirilishi bazani o'zgartirmasligi kerak.
- **`reconcile` hisobot kodini qayta ishlatmaydi.** Xom `lines` ustidan mustaqil hisoblaydi — aks holda u hech narsani tekshirmaydi, o'zini o'zi tasdiqlaydi.
- Pul — **butun son so'm**. `float` yo'q, `parseFloat` yo'q. Batafsil §02.
- Sana — **UTC**. `Asia/Tashkent` (UTC+5) `2026-01-31T23:00Z` ni `2026-02` ga surib yuborishi mumkin.

## Ataylab ishlatilmaydigan narsalar

TZ §10 "Doiradan tashqarida" va §15 "Baholanmaydi" ga asosan:

| Narsa | Sabab |
|---|---|
| Autentifikatsiya, JWT, sessiya, rollar | TZ §10 birinchi qatori. 0 ball |
| Redis | Kesh kerak emas — §9 ni indeks bilan yopamiz, o'lchov bilan isbotlaymiz |
| Admin/client panel ajratish | Foydalanuvchi yo'q. 3 ta endpoint yetarli |
| i18n / Accept-Language | Hisobot raqamlari tilga bog'liq emas |
| Soft-delete | Jurnal o'zgarmas |
| Swagger | 3 ta endpoint README da bir jadvalga sig'adi |
| Amortizatsiya, soliq, valyuta, multi-tenant | TZ §10 |
| Deploy / CI | TZ §10 |

> Bu ro'yxatning o'zi baholanadigan narsa: §14 da "kod sifati va struktura" 10%, va nimani **qilmaganingizni** asoslash — ekran yozuvidagi (25%) eng kuchli argumentlardan biri.

## Commit intizomi

TZ §13.1: "Commit tarixi ko'rinib tursin — bitta katta commit emas."

Har sessiya ichida commit nuqtalari `tasks/session-*.md` da belgilangan. Taxminan 15–20 ta commit kutiladi.
