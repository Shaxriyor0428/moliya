# Sessiya 3 — Uchta hisobot va `reconcile`

**Vaqt: 75–90 daqiqa**

**Maqsad:** `npm run reconcile` toza o'tadi. Bu — model to'g'riligining yagona avtomatik dalili. O'tmaguncha hisobot raqamlariga ishonish uchun asos yo'q.

Ma'lumotnoma: [`docs/04-reports.md`](../docs/04-reports.md) — agregatsiya pipeline'lari yozilgan.

---

## 3.1. Foyda va zarar (15 daq)

`src/reports/pnl.ts` — `pnl(period)`

- [ ] `$match period` → `$unwind lines` → `$match REVENUE|EXPENSE` → `$group by account`
- [ ] `revenue = −sum(REVENUE)`
- [ ] `expenses` — hisob bo'yicha, musbat
- [ ] `netProfit = revenue − totalExpense`
- [ ] Bo'sh oy uchun nol qaytarsin, throw qilmasin

**Commit:** `feat: P&L report`

---

## 3.2. Pul oqimi (20 daq)

`src/reports/cashflow.ts` — `cashFlow(period)`

- [ ] `opening` — `period < X` bo'yicha barcha pul qatorlari yig'indisi
- [ ] Toifalar — `$group by lines.cashFlow`, faqat pul hisoblari
- [ ] `netChange` — **barcha** pul qatorlari yig'indisi (toifalar yig'indisi emas)
- [ ] `closing = opening + netChange`
- [ ] `null` toifa (inkassatsiya) alohida ko'rsatilmaydi, lekin `netChange` ga tabiiy tushadi

> `netChange` ni toifalar yig'indisidan **hisoblamang**. Mustaqil hisoblansa, `cashFlow` yozilmagan qator darhol ko'rinadi.

**Commit:** `feat: cash flow report (direct method)`

---

## 3.3. Balans (20 daq)

`src/reports/balance.ts` — `balance(asOf)`

- [ ] `$match date <= asOf` → `$unwind` → `$group by account`
- [ ] `assets = sum(ASSET)`
- [ ] `liabilities = −sum(LIABILITY)`
- [ ] `capital = −total('capital')`
- [ ] `retainedEarnings = −sum(REVENUE + EXPENSE)` — kümülativ, saqlanmaydi
- [ ] Chiqishga `check: { assets, liabilitiesAndEquity, difference }` qo'shing

`src/reports/periods.ts`

- [ ] `listPeriods()` — `distinct('period')`, sortlangan (frontend selecti uchun)

**Commit:** `feat: balance sheet report`

---

## 3.4. HTTP endpointlar (10 daq)

`src/http/server.ts`, `src/http/routes.ts`

- [ ] `GET /api/reports/pnl?period=YYYY-MM`
- [ ] `GET /api/reports/cash-flow?period=YYYY-MM`
- [ ] `GET /api/reports/balance?asOf=YYYY-MM-DD`
- [ ] `GET /api/periods`
- [ ] Parametr validatsiyasi (zod yoki qo'lda regex) → noto'g'ri format `400`
- [ ] CORS — frontend boshqa portda ishlaydi

Autentifikatsiya **yo'q** (TZ §10).

**Commit:** `feat: report endpoints`

---

## 3.5. `npm run reconcile` (25 daq) ⭐ eng muhim

`src/scripts/reconcile.ts`

### Qat'iy qoida

Reconcile **`pnl()`, `cashFlow()`, `balance()` funksiyalarini chaqirmaydi.** Xom `lines` ustidan mustaqil hisoblaydi.

Sabab: hisobot kodida xato bo'lsa, o'sha kod bilan tekshirish uni ko'rsatmaydi. Ikkinchi mustaqil yo'l kerak. **Buni ekran yozuvida ayting.**

### Uchta tenglik

- [ ] **1) Balans:** har oy oxiriga `sum(hamma qatorlar) === 0`
- [ ] **2) Pul oqimi:** `opening + oqimlar − closing === 0`
- [ ] **3) Foyda:** `netProfit(oy) − (retained(oy oxiri) − retained(oldingi oy oxiri)) === 0`

### Qo'shimcha tekshiruvlar

[`docs/04-reports.md`](../docs/04-reports.md#qoshimcha-tekshiruvlar) jadvali:

- [ ] Har yozuvda `sum(lines) === 0`
- [ ] Barcha `amount` butun son
- [ ] Pul qatorlarida `cashFlow` mavjud
- [ ] Pul bo'lmagan qatorlarda `cashFlow` yo'q
- [ ] `period === toPeriod(date)` — timezone tekshiruvi
- [ ] Barcha `account` hisoblar rejasida bor
- [ ] `deferred_revenue >= 0`, `salary_payable >= 0`

### Chiqish

- [ ] Har tenglik uchun: **nechta oy tekshirildi / nechtasi mos kelmadi / farqlar yig'indisi** (TZ §4 aynan shu uchtasini so'raydi)
- [ ] Mos kelmagan oylar farqi bilan ro'yxatlanadi
- [ ] `exit 0` / `exit 1`
- [ ] `-0` ko'rinmasin — chiqarishdan oldin `n === 0 ? 0 : n`

**Commit:** `feat: reconcile command with three equality checks`

---

## Tugash mezoni

- [ ] Qo'lda kiritilgan bir necha yozuvda uchala hisobot to'g'ri raqam qaytaradi
- [ ] `npm run reconcile` **toza o'tadi**, `exit 0`
- [ ] Ataylab buzilgan yozuv kiritsangiz — reconcile uni **ushlaydi** va `exit 1` qaytaradi (bu tekshiruvni albatta qiling, aks holda reconcile ishlayotganini bilmaysiz)
- [ ] Endpointlar `curl` bilan javob beradi

---

## Xavflar

| Xavf | Oldini olish |
|---|---|
| Reconcile hisobot kodini qayta ishlatishi | Mustaqil yozing. Aks holda hech narsani tekshirmaydi |
| `opening` da `$lt: period` string solishtiruvi | `"2026-01" < "2026-02"` leksikografik jihatdan to'g'ri ishlaydi — `YYYY-MM` formati shuning uchun tanlangan |
| Birinchi oyda `retained(oldingi)` mavjud emas | `0` deb oling |
| Balans `asOf` sanasi kun ichida kesib qolishi | `asOf` ni kun oxiriga qo'ying (`23:59:59.999Z`) yoki `$lte` bilan kun boshini bering va yozuvlarni kun boshida yarating |
| `$unwind` sekinligi | Hozircha e'tibor bermang — o'lchov 4-sessiyada |
