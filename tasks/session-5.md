# Sessiya 5 — Frontend, hujjatlar, topshirish

**Vaqt: 60 daqiqa** (+ 30 daqiqa ekran yozuvi)

**Maqsad:** repo topshirishga tayyor. Bu sessiyaning og'irligi ikkita hujjatda — ekran yozuvi va ochiq savol javobi. Ikkalasi ham qilingan ishni tushuntiradi; frontend esa faqat raqamlarni ko'rsatadi. Vaqtni shunga qarab taqsimlang.

---

## 5.1. Frontend (30 daqiqa — qat'iy chegara) — TZ §8

> TZ §8: *"Dizayn baholanmaydi. Oddiy jadval yetarli, UI kutubxona kerak emas.
> Bunga 30 daqiqadan ko'p vaqt sarflamang."*

Vazifasi bitta: hisobot raqamlari brauzerda ko'rinsin. Undan ortig'i shu vaqtda
DECISIONS.md va ekran yozuvidan olinadi.

`frontend/` — Vite + React + TS, alohida `package.json`.

- [ ] `GET /api/periods` → oy tanlash `<select>`
- [ ] Oy tanlanganda uchala hisobotni parallel yuklash (`Promise.all`)
- [ ] Uchta oddiy `<table>`: P&L, Pul oqimi, Balans
- [ ] Raqamlarni bo'sh joy bilan formatlash (`1 800 000`)
- [ ] Balansda `difference` ni ko'rsating — 0 ekani ko'rinib tursin
- [ ] Loading / error holati — bir qator, yetarli

**CSS yozmang. Komponentlarga bo'lmang. Kutubxona qo'shmang.** Bitta `App.tsx` yetarli.

⏱ Taymer qo'ying. 30 daqiqada tugamasa — bor holida qoldiring va keyingi bosqichga o'ting.

**Commit:** `feat: minimal React report viewer`

---

## 5.2. `DECISIONS.md` (20 daq) ⭐ — TZ §11

Investor talabi: *"Har oyda foydadan menga tegishli ulushni hisoblab, hisobotda ko'rsatinglar."* Boshqa tafsilot yo'q, investor aloqada emas.

> TZ: *"Bu savolning to'g'ri javobi yo'q. Biz qanday savol berishingizni ko'ramiz."*

Maksimum 1 sahifa. To'rtta bo'lim:

### 1. Qaysi savollarni kimga berasiz — **aniq**, umumiy emas

Yomon: "Investor nimani nazarda tutganini so'rayman."
Yaxshi (namuna yo'nalishlar — o'z so'zingiz bilan yozing):

- Ulush **sof foydadan**mi yoki **taqsimlangan dividenddan**mi? Ular butunlay boshqa raqam — birinchisi qog'ozdagi foyda, ikkinchisi haqiqatan to'lanadigan pul.
- Foiz **qanday bazadan** hisoblanadi — kiritgan kapitali umumiy kapitaldagi ulushi bo'yichami, yoki shartnomada qat'iy foiz bormi?
- Ikkinchi investor bor. Ikkalasining ulushi **qanday taqsimlanadi** va kapital turli vaqtlarda kiritilgan bo'lsa, ulush **vaqt bo'yicha o'zgaradimi**?
- **Zarar ko'rilgan oyda** nima bo'ladi? Manfiy ulush keyingi oylardan ushlab qolinadimi yoki nolga tenglashtiriladimi?
- Bu raqam **hisobotda ko'rsatiladigan ma'lumot**mi, yoki haqiqiy **to'lov majburiyati**mi? Ikkinchisi bo'lsa — balansda majburiyat paydo bo'ladi, bu butunlay boshqa ish hajmi.
- Kimga beriladi: direktorga (biznes shartlari) va investorning o'ziga (kutgan natijasi). Shartnoma bo'lsa — moliyachiga.

### 2. Javob kutmasdan qabul qiladigan qarorlaringiz va sabablari

Masalan: hisobot ma'lumoti sifatida boshlash (majburiyat sifatida emas), chunki majburiyat balansni o'zgartiradi va noto'g'ri taxmin qilinsa uchala tenglikni buzadi.

### 3. Ma'lumotlar modeliga ta'siri

- `Investor` kolleksiyasiga ulush foizi va uning **amal qilish davri** kerak bo'ladi
- Majburiyat sifatida hisoblansa — yangi hisob (`investor_payable`, LIABILITY) va yangi hodisa turi
- Ulush foizi vaqt bo'yicha o'zgarsa — tarixiy hisobotlar **qayta hisoblanadi**, bu esa "hisobot o'zgarmas" tamoyilini buzadi

### 4. Birinchi versiyaga nimani kiritmaysiz

Va nega.

> Bu fayl mazmun jihatidan ekran yozuvi bilan bir xil narsani ko'rsatadi: qanday o'ylashingizni. Shoshilmang.

**Commit:** `docs: DECISIONS.md — investor profit share open question`

---

## 5.3. `README.md` (10 daq) — TZ §13.1

Majburiy bo'limlar:

- [ ] O'rnatish va ishga tushirish (Mongo talabi + `npm i`, `npm run seed`, `npm run dev`). Baholovchida Mongo bo'lmasligi mumkin — bir qatorlik `docker run` variantini ham yozing
- [ ] To'rtta skript ham ishlashi ko'rsatilgan
- [ ] ⭐ **Ma'lumotlar modeli tanlovi va sababi** — TZ: *"Bu baholashda muhim o'rin tutadi"*. [`docs/02-model.md`](docs/02-model.md) dan qisqartirib ko'chiring: nega double-entry, nega ishorali summa, nega qatorlar hujjat ichida (tranzaksiya kerak emasligi), qaysi variantlar rad etilgani
- [ ] ⭐ **O'lchovlar** (§9): ma'lumot hajmi, har bir hisobotning vaqti, optimallashtirish qilingan bo'lsa — nima va nega
- [ ] Endpointlar jadvali
- [ ] Uchta tenglik va `reconcile` nima qilishi

**Commit:** `docs: README with model rationale and measurements`

---

## 5.4. `ai-log.md` (5 daq) — TZ §12

- [ ] Qaysi vositalardan foydalandingiz
- [ ] Eng foydali bo'lgan **3–5 ta prompt** (haqiqiy, to'qilgan emas)
- [ ] Qayerda AI xato qildi va siz tuzatdingiz — bu bo'lim ishonchni oshiradi

> Sessiyalar davomida yozib boring. Oxirida eslashga urinmang.

**Commit:** `docs: ai-log.md`

---

## 5.5. Yakuniy tekshiruv (5 daq)

Bo'sh papkaga klon qilib, noldan:

```bash
mongosh --eval "db.runCommand({ping:1})"   # Mongo ishlab turibdimi
cp .env.example .env
npm i
npm run seed
npm run reconcile      # exit 0 bo'lishi SHART
npm test               # hammasi yashil
npm run dev            # ko'tariladi
```

- [ ] `.env` commit qilinmaganini tekshiring
- [ ] `git log --oneline` — 15+ commit, bitta katta commit emas (§13.1)
- [ ] Repo **public** qilinganini tekshiring (§13.1)

---

## 5.6. Ekran yozuvi (30 daq) ⭐ — TZ §13.2

> Kod nima qilishini ko'rsatadi, yozuv esa **nega shunday qilinganini**. Ikkinchisi
> koddan o'qib bo'lmaydi — shuning uchun u alohida talab qilinadi.

Bitta dubl, montaj kerak emas, sifat muhim emas. O'zbek/rus/ingliz — erkin gapiradiganingizda.

Reja (TZ aynan shu beshtasini so'raydi):

1. **Modelni qanday tanladingiz** — qaysi variantlarni ko'rdingiz, nimadan voz kechdingiz, nega.
   → [`docs/02-model.md`](docs/02-model.md) dagi "rad etilgan variantlar" jadvali. Eng kuchli nuqta: *uchala tenglik konstruksiya bo'yicha bajariladi, tekshirib tuzatish orqali emas* — va *qatorlar hujjat ichida bo'lgani uchun tranzaksiya kerak emas*.
2. **`npm run reconcile` ni jonli ishga tushiring.** Keyin ataylab buzilgan yozuv qo'shib, uni **ushlaganini** ko'rsating — ishonchni eng ko'p oshiradigan 30 soniya.
3. **Kamida bitta test stsenariysini jonli ishga tushiring.** Kredit to'lovi (§5.4) eng ta'sirlisi — pul qatorining ikkiga bo'linishini tushuntiring.
4. **Yo'lda nima ishlamadi** — birinchi urinishingiz nimasi bilan xato edi. Halol javob bering; TZ bu savolni ataylab so'ragan.
5. **Nimaga ustuvorlik berdingiz, nimani tugatmadingiz** — [`docs/01-stack.md`](docs/01-stack.md) dagi "ataylab ishlatilmaydigan narsalar" ro'yxati, `docs/05-decisions.md` dagi "birinchi versiyaga kirmaydi".

- [ ] YouTube (ochiq havola) yoki Telegram orqali
- [ ] Repo havolasi bilan birga **@zafarbek_unical** ga Telegramda yuboring

---

## Yakuniy tekshiruv ro'yxati

| | Element | TZ |
|---|---|---|
| ☐ | Public repo, 15+ commit — ish qanday olib borilgani ko'rinsin | §13.1 |
| ☐ | `README.md` — model izohi + o'lchovlar | §13.1, §9 |
| ☐ | `DECISIONS.md` | §11 |
| ☐ | `ai-log.md` | §12 |
| ☐ | `npm run seed` | §13.1 |
| ☐ | `npm run reconcile` → exit 0 | §4 ⭐ usiz raqamlarga ishonib bo'lmaydi |
| ☐ | `npm test` — 5 stsenariy | §5 |
| ☐ | `npm run dev` | §13.1 |
| ☐ | Frontend mavjud | §8 |
| ☐ | Ekran yozuvi ≤30 daq | §13.2 ⭐ qarorlarni tushuntiradi |
| ☐ | Telegram orqali yuborildi | §13 |
