# ai-log.md — AI bilan ishlash jurnali

TZ §12.

## Vositalar

| Vosita | Nima uchun |
|---|---|
| **Claude Code (Opus 5)** — terminal agenti | Asosiy vosita. Reja hujjatlarini o'qib, kodni yozdi, testlarni ishga tushirdi, commit qildi |
| `docs/model-prototype.js` — bazasiz prototip | Kod yozishdan **oldin** yozilgan ~280 qatorlik fayl. Modelni bazasiz tekshiradi: TZ §5 ning beshala stsenariysi, §2.3 misoli, uchala tenglik — 44 ta tekshiruv. Implementatsiya davomida "raqam nega bunday chiqdi?" degan savolning javobi shu faylda bo'ldi |
| `docs/` va `tasks/` — oldindan yozilgan reja | Ma'lumotlar modeli, hodisa xaritasi, hisobot algoritmlari va 5 sessiyaga bo'lingan ish rejasi. AI ga har safar "nima qilish kerak" emas, "shu hujjatdan ol" deyildi |

Asosiy yondashuv: **avval model, keyin reja, keyin kod.** Prototip va hujjatlar
tayyor bo'lgani uchun implementatsiya bosqichida model haqida bahs bo'lmadi —
faqat "hujjatdagi narsa kodda to'g'ri takrorlanyaptimi" degan savol qoldi.

---

## Eng foydali promptlar

Quyidagilar haqiqiy promptlar — sessiya boshlarida berilgan.

### 1. Etalonni ko'rsatish (1-sessiya)

> «Boshlashdan oldin shu tartibda o'qi: 1. `node docs/model-prototype.js` — ishga
> tushir va chiqishni o'qi. Bu tasdiqlangan model prototipi, 44/44 tekshiruv
> o'tadi. Implementatsiya aynan shu mantiqni takrorlaydi. **Model bo'yicha savol
> tug'ilsa, javob shu faylda.**»

Eng ko'p foyda bergan prompt. AI ga modelni qayta o'ylab topishga ruxsat
berilmadi — ishlab turgan etalon berildi. Natijada TZ §5 dagi beshala test
birinchi urinishda o'tdi, hech qanday raqam "moslashtirilmadi".

### 2. Tekshiruvning mustaqilligini majburlash (3-sessiya)

> «ENG MUHIM QOIDA: `reconcile.ts` `pnl()`, `cashFlow()`, `balance()`
> funksiyalarini CHAQIRMAYDI. U xom `lines` ustidan mustaqil hisoblaydi. Sabab:
> hisobot kodida xato bo'lsa, o'sha kod bilan tekshirish uni ko'rsatmaydi —
> ikkinchi mustaqil yo'l kerak. Buni buzsang butun reconcile ma'nosini yo'qotadi.»

AI ning tabiiy moyilligi — kodni qayta ishlatish. Bu yerda qayta ishlatish
aynan xato bo'lardi. Sababi tushuntirilgani uchun AI reconcile da agregatsiya
pipeline'ini ham ishlatmadi: yozuvlarni `lean()` bilan o'qib, oddiy sikl bilan
hisobladi. Ya'ni hisobotlar bilan umumiy kodi qolmadi.

### 3. Optimizatsiyani o'lchovga bog'lash (4-sessiya)

> «Seed tezligi: avval ODDIY yoz — har hodisa uchun `await postEntry()`. Tugagach
> vaqtini o'lchab ayt. 60 soniyadan oshsa — mendan so'ra, o'shanda `postEntries()`
> + `insertMany` qo'shamiz. **Oldindan optimizatsiya qilma.**»

Reja faylining o'zida `insertMany` tavsiya qilingan edi. O'lchov uni rad etdi:
seed 26.3 soniyada tugadi. Xuddi shu qoida hisobotlarga ham qo'llandi — eng
sekin so'rov p95 da 220 ms chiqdi va qo'shma indeks qo'shilmadi. README da
"o'lchov 1s dan tez ko'rsatdi, optimallashtirish qilinmadi" deb yozildi.

### 4. Xato qayerdaligini oldindan aytish (4-sessiya)

> «`npm run seed && npm run reconcile` → exit 0. Yiqilsa **MODELNI TUZATMA** —
> seedni tekshir. Model prototipda va 5 ta testda allaqachon tasdiqlangan.»

Bu prompt eng xavfli stsenariyni oldini oldi: reconcile yiqilganda AI ning
"tuzatish" yo'li odatda tenglikni moslashtirish tomon boradi — TZ §4 buni
avtomatik rad etish sababi deb ataydi. Xato qidiriladigan joy oldindan
belgilangani uchun bunday urinish umuman bo'lmadi.

### 5. AI ga nimani yozMASLIK kerakligini aytish (5-sessiya)

> «`DECISIONS.md`: sen faqat QORALAMA yozasan, yakuniy matnni men o'zim yozaman.
> Sabab: TZ "biz qanday savol berishingizni ko'ramiz" deydi va ekran yozuvida men
> buni himoya qilishim kerak. **O'zim yozmagan savollarni himoya qila olmayman.**»

Shuningdek har sessiyada: «Rejada yo'q narsani qo'shma. Qo'shish kerak deb
hisoblasang — avval mendan so'ra.» Bu qoida tufayli AI bir necha marta kod
yozish o'rniga to'xtab savol berdi (masalan `injectCapital` dagi `investorId` ni
sxemaga qo'shish kerakmi degan savol).

---

## AI qayerda xato qildi

Bu bo'lim eng muhimi — quyidagilarning hammasi haqiqiy holatlar.

### 1. Reja faylidagi noto'g'ri tavsiyani ko'r-ko'rona bajarishga tayyor edi

`tasks/session-1.md` ning xavflar jadvalida `cashFlow` ning `null` va `undefined`
holatlarini ajratish uchun `'cashFlow' in line` tavsiya qilingan edi.

Amalda bu **ishlamaydi**: Mongoose subdocument da sxema yo'llari prototipda
getter sifatida aniqlanadi, shuning uchun `'cashFlow' in line` har doim `true`
qaytaradi. Agar shu tavsiya bajarilganda edi, "pul qatorida `cashFlow` unutilgan"
tekshiruvi hech qachon ishlamasdi — va bu jimgina buziladigan xato bo'lardi.

Aniqlash usuli: kod yozishdan oldin 20 qatorlik probe skripti yozilib, Mongoose 9
ning haqiqiy xatti-harakati tekshirildi. `doc.get('cashFlow')` esa farqni to'g'ri
ajratdi (`undefined` vs `null`).

**Xulosa:** kutubxonaning xatti-harakati haqidagi taxminni tekshirmasdan kodga
kiritmaslik kerak — reja hujjatida yozilgan bo'lsa ham.

### 2. `recognizeRevenue` signaturasi — noto'g'ri qulaylik

`tasks/session-2.md` `recognizeRevenue(studentId, period)` deb yozgan edi.
Birinchi variant `fee` ni parametr qilib oldi — chunki qoldiqlar parametr
sifatida berilishi kerak edi.

Muammo: bunda "chiqib ketgan (`droppedAt`) o'quvchi uchun ishlamaydi" qoidasi
kodda umuman qolmasdi — u chaqiruvchining esiga bog'liq bo'lardi. Seed 18 000
marta chaqiradigan funksiyada bunday "eslab qolish" qoidasi ertami-kechmi
buziladi.

Tuzatildi: `student` obyekti parametr sifatida beriladi (`_id`, `monthlyFee`,
`discountPercent`, `droppedAt`), `fee` funksiya ichida hisoblanadi.
Bazaga so'rov baribir yo'q.

`enrolledFrom` tekshiruvi esa **ataylab qo'shilmadi** — hali o'qishni
boshlamagan o'quvchi uchun funksiyani umuman chaqirmaslik seedning mas'uliyati.
Bu qaror ochiq yozilgan, aks holda keyingi o'quvchi kodni o'qib "bu yerda
tekshiruv tushib qolgan" deb o'ylardi.

### 3. Test kutilgan raqamini noto'g'ri "hisoblab" qo'ydi

3-sessiyada reconcile ning buzilgan yozuvni ushlashini tekshiradigan testda
kutilgan farq `-100 000` deb yozildi. Amalda `+100 000` chiqdi.

Kod to'g'ri edi: buzilgan yozuvda aktiv 900 000 ga kamaygan, xarajat esa
1 000 000 ga o'sgan — tenglama +100 000 ga og'adi.

Bu eng xavfli holat turi: agar "test yiqilyapti" degan xulosa bilan **kod**
tuzatilganda edi, reconcile ning ishorasi buzilardi. Shuning uchun raqam
qo'lda qayta chiqarildi va tuzatilgan joy test bo'ldi, kod emas.

### 4. Import paytida bazaga ulanadigan skript yozdi

`reconcile.ts` ning birinchi varianti modul darajasida `await main()` chaqirardi.
Test fayli undan `reconcileJournal` ni import qilishi bilan skript bazaga
ulanib, hisobotni chiqarib, uzilardi.

Tuzatildi: `import.meta.url === pathToFileURL(process.argv[1]).href` bilan
kirish nuqtasi tekshiriladi. Endi modul import qilinsa yon ta'sir bo'lmaydi.

### 5. Ishlatilmaydigan "o'tish" kodini yozdi

`injectCapital` da `investorId` ni yozuvga qo'shish uchun `refOf()` degan,
har doim bo'sh obyekt qaytaradigan funksiya yozildi. Sababi — `ref` sxemasida
`investorId` maydoni yo'q edi.

Bu o'lik kod. O'chirildi, o'rniga izoh yozildi: `investorId` `ref` ga tushmaydi,
chunki sxemada faqat `studentId`/`employeeId`/`loanId` bor va hisobot raqamlari
bunga bog'liq emas. Sxemaga yangi maydon qo'shish esa reja hujjatidan chetlanish
bo'lardi — bu savol foydalanuvchiga berildi.

### 6. Reja hujjatidagi versiyalar eskirgan edi

`docs/01-stack.md` Mongoose 8 va MongoDB 7 ni ko'zda tutgan; `npm i` amalda
Mongoose 9, TypeScript 7, zod 4 o'rnatdi, mahalliy server esa MongoDB 8.3.
Farq kod yozilgandan keyin emas, **birinchi kunda** aniqlandi va hujjatlar
haqiqiy versiyalarga keltirildi.

---

## Nima yaxshi ishladi

- **Har sessiyadan keyin `npm test` va `npm run typecheck`.** Regressiya bir
  necha marta shu yerda ushlandi.
- **Commit nuqtalari oldindan belgilangani.** 20 dan ortiq commit chiqdi, har
  biri bitta tugallangan fikr. AI ga "hammasini bitta commitga yig'" degan
  imkoniyat berilmadi.
- **`CLAUDE.md`.** Loyihaning qat'iy qoidalari (butun son so'm, faqat `Date.UTC`,
  faqat `postEntry()`, reconcile mustaqilligi) bir joyda yozilgani uchun har
  sessiyada qaytadan tushuntirish kerak bo'lmadi.
