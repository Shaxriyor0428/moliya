# Sessiya 1 — Fundament va ledger yadrosi

**Vaqt: 60–75 daqiqa**

**Maqsad:** `postEntry()` funksiyasi ishlaydi va balanslashmagan yozuvni rad etadi. Bu butun loyihaning yagona yozuv nuqtasi.

---

## 1.1. Loyiha skeleti (15 daq)

- [ ] `npm init -y`, `tsconfig.json` (`strict: true`, `target: ES2022`, `module: NodeNext`)
- [ ] Bog'liqliklar:
      `mongoose express zod` / dev: `typescript tsx vitest @types/express @types/node`
- [ ] `package.json` skriptlari — TZ §13.1 talab qilgan **to'rttasi ham** bo'lishi shart:
      `dev`, `seed`, `reconcile`, `test` (+ `bench`)
- [ ] `.env.example` + `src/config/env.ts` (zod bilan validatsiya, startda fail-fast)
      `MONGO_URI=mongodb://127.0.0.1:27017/moliya`
      `MONGO_URI_TEST=mongodb://127.0.0.1:27017/moliya_test`
      `PORT=3000`
- [ ] Mahalliy Mongo ishlab turganini tekshiring: `mongosh --eval "db.runCommand({ping:1})"`
- [ ] `.gitignore` — `node_modules`, `.env`, `dist`
- [ ] `git init`, birinchi commit

> ⚠️ `.env` ni **hech qachon** commit qilmang. Yuklagan `simple-nestjs.zip` ichida `.env` bor edi — o'sha xatoni takrorlamang.

**Commit:** `chore: project skeleton, ts config, env validation`

---

## 1.2. Hisoblar rejasi (10 daq)

`src/ledger/accounts.ts` — [`docs/02-model.md`](../docs/02-model.md#hisoblar-rejasi-chart-of-accounts) dagi jadval.

- [ ] `AccountCode` union tipi (14 ta hisob)
- [ ] `ACCOUNT_TYPE: Record<AccountCode, AccountType>`
- [ ] `CASH_ACCOUNTS: Set<AccountCode>` — `cash.register`, `cash.bank`
- [ ] Yordamchilar: `isCash()`, `isPnl()`, `typeOf()`

**Commit:** `feat: chart of accounts`

---

## 1.3. Jurnal sxemasi va invariant (20 daq) ⭐

`src/ledger/journal.model.ts`

- [ ] `JournalLine` subdocument: `account`, `amount`, `cashFlow`
- [ ] `JournalEntry`: `date`, `period`, `kind`, `description`, `ref`, `lines[]`
- [ ] `pre('validate')` hook — [`docs/02-model.md`](../docs/02-model.md#invariant-qayerda-majburlanadi):
  - `sum(lines) === 0`
  - `lines.length >= 2`
  - har bir `amount` butun son va `!== 0`
  - pul bo'lmagan hisobda `cashFlow` bo'lmasligi
  - pul hisobida `cashFlow` **aniq berilgan** (`null` ham ruxsat, `undefined` yo'q)

`src/ledger/post.ts`

- [ ] `postEntry({ date, kind, description, ref, lines })`
- [ ] `period` ni `date` dan hisoblaydi (UTC!) va yozuvga qo'yadi
- [ ] Yagona eksport qilingan yozuv yo'li — boshqa modullar `JournalEntry.create()` ni chaqirmaydi

`src/shared/period.ts`, `src/shared/money.ts`

- [ ] `toPeriod(date)` → `"YYYY-MM"` (UTC)
- [ ] `splitAmount(total, n)` → qoldiq oxirgi elementga ([`docs/05-decisions.md`](../docs/05-decisions.md) §D6)

**Commit:** `feat: journal entry schema with balance invariant`

---

## 1.4. Birinchi testlar (15 daq)

`tests/ledger.test.ts` — bu testlar keyinchalik hamma narsani ushlab turadi:

- [ ] Balanslashgan yozuv qabul qilinadi
- [ ] Balanslashmagan yozuv **rad etiladi** (throw)
- [ ] Bitta qatorli yozuv rad etiladi
- [ ] Float `amount` rad etiladi
- [ ] Pul bo'lmagan hisobda `cashFlow` rad etiladi
- [ ] `toPeriod(Date.UTC(2026, 0, 31))` → `"2026-01"` (timezone testi, §D10)
- [ ] `splitAmount(1_000_000, 3)` → `[333333, 333333, 333334]`, yig'indi aniq `1 000 000`

`tests/helpers/db.ts` — har test bo'sh bazadan boshlanadi (TZ §5 talabi):

- [ ] `beforeEach` da kolleksiyalarni tozalash
- [ ] Alohida test DB nomi (`moliya_test`) — seed ma'lumotini o'chirib yubormaslik uchun

**Commit:** `test: ledger invariants`

---

## Tugash mezoni

- [ ] `npm test` yashil
- [ ] `npm run dev` xatosiz ko'tariladi (hozircha bo'sh server)
- [ ] Mahalliy Mongo ga ulanish ishlaydi
- [ ] Balanslashmagan yozuvni yozib ko'rdingiz va u **rad etildi** — buni ko'z bilan ko'ring

---

## Xavflar

| Xavf | Oldini olish |
|---|---|
| Mongoose sub-schema da `null` ni `undefined` ga aylantiradi | `cashFlow` uchun `default: undefined` bermang; hook da `'cashFlow' in line` bilan tekshiring |
| `tsx` + ESM/CJS chalkashligi | `tsconfig` da `module: NodeNext`, `package.json` da `"type": "module"` |
| Mahalliy vaqt kirib qolishi | `new Date('2026-01-31')` ISO sana sifatida UTC da parse bo'ladi — lekin `new Date(2026, 0, 31)` **mahalliy**. Faqat `Date.UTC` ishlating |
| Skelet ustida ortiqcha vaqt ketishi | 15 daqiqadan oshsa — to'xtang, keyingi bosqichga o'ting. Struktura baholanmaydi (§15) |
