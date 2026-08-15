# Ish rejasi — 5 sessiya

Umumiy byudjet: **~6 soat** kod + **30 daqiqa** ekran yozuvi. Muddat: boshlaganingizdan 24 soat.

| # | Sessiya | Vaqt | Natija |
|---|---|---|---|
| [1](session-1.md) | Fundament va ledger yadrosi | 60–75 daq | `postEntry()` ishlaydi, balanslashmagan yozuv rad etiladi |
| [2](session-2.md) | Biznes hodisalari | 60–75 daq | 12 ta hodisa turi jurnal yozuviga aylanadi |
| [3](session-3.md) | Uchta hisobot + `reconcile` | 75–90 daq | `npm run reconcile` toza o'tadi |
| [4](session-4.md) | Seed + 5 majburiy test + o'lchov | 75–90 daq | 3 yillik ma'lumot, `npm test` yashil, `< 1s` |
| [5](session-5.md) | Frontend + hujjatlar + topshirish | 60 daq | React sahifa, README/DECISIONS/ai-log, repo tayyor |

## Tartib majburiy

Sessiyalar bir-biriga bog'liq — 2 sessiya 1 siz, 3 sessiya 2 siz ishlamaydi. **3-sessiyadan keyin** loyiha allaqachon ishlaydigan holatda bo'ladi: `reconcile` toza o'tadi, ya'ni model to'g'riligi isbotlangan. Vaqt tugab qolsa, 4 va 5 dan qisqartiring, 1–3 dan emas.

## Ustuvorlik

Nima nimaga tayanadi:

| Qism | Nega shu tartibda |
|---|---|
| Ma'lumotlar modeli, uchala tenglik | Loyihaning o'zi shu. Model noto'g'ri bo'lsa, ustidagi hamma narsa noto'g'ri raqam ko'rsatadi |
| `npm run reconcile` toza o'tishi | Modelning to'g'riligini isbotlaydigan yagona avtomatik dalil. O'tmasa — hisobotlarga ishonish uchun asos yo'q |
| 5 test stsenariysi | TZ §5 dagi raqamlar. Kichik, aniq, va model buzilganini eng tez ko'rsatadi |
| `DECISIONS.md` (ochiq savol) | Noaniq talab bilan qanday ishlashni ko'rsatadi — koddan alohida ko'nikma |
| Kod sifati, struktura, commitlar, README | Boshqa odam kodni o'qib tushunishi va ishga tushira olishi uchun |
| Frontend | Raqamlar ko'rinishi uchun. Dizayn talab qilinmagan — bitta jadval yetarli |

Ikkita narsa qolganlarining hammasini ma'nosiz qiladi: **`reconcile` toza o'tmasligi** (hisobot raqamlariga ishonib bo'lmaydi) va **ishni tushuntirib bera olmaslik** (nima uchun shunday qilinganini ko'rsatolmasangiz, to'g'ri kod ham tasodif bo'lib ko'rinadi).

## Har sessiya oxirida

1. `npm run reconcile` (3-sessiyadan boshlab) — toza o'tishi shart
2. `npm test` (4-sessiyadan boshlab)
3. Commit — sessiya ichidagi commit nuqtalari har bir faylda belgilangan
4. `ai-log.md` ga qo'shish — **oxiriga qoldirmang**, eslab qololmaysiz

## Boshlashdan oldin

```bash
node docs/model-prototype.js
```

Bazasiz prototip — modelni 44 ta tekshiruvda tasdiqlaydi (TZ §5 ning beshala stsenariysi, §2.3 misoli, uchala tenglik). Kod yozishdan oldin bir marta ishga tushiring va chiqishni o'qing: implementatsiya aynan shu mantiqni takrorlaydi.

## Ma'lumotnoma

- [`docs/model-prototype.js`](../docs/model-prototype.js) — tekshirilgan model prototipi ⭐
- [`docs/01-stack.md`](../docs/01-stack.md) — stack, struktura, nima ishlatilmaydi
- [`docs/02-model.md`](../docs/02-model.md) — ma'lumotlar modeli ⭐ butun loyihaning asosi
- [`docs/03-events.md`](../docs/03-events.md) — hodisa → yozuv xaritasi
- [`docs/04-reports.md`](../docs/04-reports.md) — hisobotlar + reconcile
- [`docs/05-decisions.md`](../docs/05-decisions.md) — modellashtirish qarorlari (ekran yozuvi uchun)
- [`tz.md`](../tz.md) — asl topshiriq
