EduTizim.uz — Texnik topshiriq
Moliya moduli: Balans, Pul oqimi, Foyda va zarar
Muddat: boshlaganingizdan 24 soatTaxminiy hajm: 5–6 soat
Stack: Node.js + TypeScript + MongoDB (majburiy), React (kichik qism)
Bo'sh papkadan boshlaysiz. Tayyor kod, shablon yoki starter repo berilmaydi —
loyihani o'zingiz quryapsiz.
1. Kontekst
O'quv markaz uchun CRM tizimining moliya modulini qilyapsiz.
Direktor har oy uchta savolga javob olishi kerak:
Foyda va zarar (P&L) — bu oy ishlab foyda qildikmi?
Pul oqimi (Cash Flow) — pul qayerdan keldi va qayerga ketdi?
Balans (Balance Sheet) — bugun bizda nima bor va kimga qancha qarzmiz?
Sizning vazifangiz — shu uchta hisobotni chiqaradigan tizimni qurish.
2. Biznes jarayoni: markazda pul qanday harakat qiladi
Bu bo'lim topshiriqning eng muhim qismi. Uni diqqat bilan o'qing — modelni
to'g'ri qurish uchun avval jarayonni tushunish kerak.
2.1. Bir oy: hodisalar ketma-ketligi
Oy boshi (1–5-sanalar)
O'quvchilar to'lov qiladi. Ba'zilari naqd — pul kassaga tushadi.
Ba'zilari karta yoki Payme/Click orqali — pul bank hisobiga tushadi.
Ba'zilari faqat shu oy uchun to'laydi, ba'zilari 3 oyga oldindan to'laydi.
Ba'zi o'quvchilarda chegirma bor.
5-sanada o'tgan oyning ish haqi xodimlarga to'lanadi. Ya'ni yanvarda
qilingan ish uchun pul 5-fevralda chiqadi.
Shu kunlarda ijara ham to'lanadi.
Oy davomida
Kommunal to'lovlar, reklama va marketing xarajatlari chiqadi. Kassadagi naqd
pulning katta qismi bankka topshiriladi (inkassatsiya) — bu pulning bir
joydan ikkinchi joyga ko'chishi, xarajat emas.
Oyning 20-sanasi atrofida bankka kredit to'lovi qilinadi.
Oy oxiri (oxirgi kun)
Ikkita muhim hodisa sodir bo'ladi, garchi bu kunda hech qanday pul
harakatlanmasa ham:
Birinchidan, oy davomida darslar o'tib bo'lindi. Demak o'quvchilardan
olingan pulning shu oyga tegishli qismi endi haqiqiy daromadga aylanadi.
Oldindan to'langan qolgan qismi hali ham majburiyat bo'lib turadi.
Ikkinchidan, xodimlar shu oy ishlab bo'lishdi. Demak ish haqi xarajati
shu oyga tegishli — garchi pul keyingi oyning 5-sanasida chiqsa ham. Oy
oxirida bu summa "to'lanmagan ish haqi" majburiyati bo'lib turadi.
Vaqti-vaqti bilan
Investor biznesga kapital kiritadi. Jihoz, mebel, kompyuter sotib olinadi.
O'quvchi kursni tashlab ketishi ham mumkin.
2.2. Har bir hodisa uchta hisobotga qanday tushadi
Bu jadval — topshiriqning talablari. Tizimingiz shu mantiqni bajarishi kerak.
Hodisa
Foyda va zarar
Pul oqimi
Balans
O'quvchi 3 oyga oldindan to'ladi
Ta'sir yo'q
Operatsion kirim (to'liq summa)
Pul ↑, majburiyat ↑
Oy oxiri: darslar o'tildi
Daromad ↑ (faqat shu oy ulushi)
Ta'sir yo'q
Majburiyat ↓, foyda ↑
Oy oxiri: ish haqi hisoblandi
Xarajat ↑
Ta'sir yo'q
Majburiyat ↑, foyda ↓
Keyingi oy 5-sanasi: ish haqi to'landi
Ta'sir yo'q
Operatsion chiqim
Pul ↓, majburiyat ↓
Ijara, kommunal, marketing to'landi
Xarajat ↑
Operatsion chiqim
Pul ↓, foyda ↓
Kassadan bankka inkassatsiya
Ta'sir yo'q
Ta'sir yo'q
Bir aktivdan ikkinchisiga
Investor kapital kiritdi
Ta'sir yo'q
Moliyaviy kirim
Pul ↑, kapital ↑
Bankdan kredit olindi
Ta'sir yo'q
Moliyaviy kirim
Pul ↑, qarz ↑
Kredit to'lovi: asosiy qarz qismi
Ta'sir yo'q
Moliyaviy chiqim
Pul ↓, qarz ↓
Kredit to'lovi: foiz qismi
Xarajat ↑
Operatsion chiqim
Pul ↓, foyda ↓
Jihoz sotib olindi
Ta'sir yo'q
Investitsion chiqim
Pul ↓, aktiv ↑
Qalin yozilgan joylar — eng ko'p xato qilinadigan nuqtalar.
2.3. Nima uchun foyda va pul bir xil emas
Bu tushunchani o'zlashtirmasdan to'g'ri model qurib bo'lmaydi. Aniq misol.
Yanvar oyi. Oy boshida markazda 50 000 000 so'm bor edi.
Sana
Hodisa
Summa
3-yanvar
O'quvchilardan to'lov (60 mln yanvar uchun, 40 mln oldindan)
+100 000 000
5-yanvar
Dekabr oyining ish haqi to'landi
−30 000 000
5-yanvar
Yanvar ijarasi to'landi
−10 000 000
15-yanvar
Marketing xarajati
−5 000 000
31-yanvar
Yanvar darslari o'tildi → daromad tan olindi
60 000 000
31-yanvar
Yanvar ish haqi hisoblandi (5-fevralda to'lanadi)
32 000 000
Foyda va zarar (yanvar):
Daromad                              60 000 000
Ish haqi (yanvarda hisoblangan)     −32 000 000
Ijara                               −10 000 000
Marketing                            −5 000 000
                                    ────────────
Sof foyda                            13 000 000
​
Pul oqimi (yanvar):
Oy boshidagi pul                     50 000 000
O'quvchi to'lovlari                +100 000 000
Dekabr ish haqi to'lovi             −30 000 000
Ijara                               −10 000 000
Marketing                            −5 000 000
                                    ────────────
Sof o'zgarish                       +55 000 000
Oy oxiridagi pul                    105 000 000
​
Foyda 13 mln, lekin pul 55 mln ga oshdi. Farq qayerdan?
Sof foyda                                             13 000 000
+ Oldindan to'lov (pul keldi, daromad emas)           40 000 000
+ Hisoblangan ish haqi (xarajat, pul chiqmadi)        32 000 000
− Dekabr ish haqi (pul chiqdi, yanvar xarajati emas) −30 000 000
                                                     ────────────
= Pulning o'zgarishi                                  55 000 000
​
31-yanvar balansida shular ko'rinadi: pul 105 mln, oldindan to'langan
darslar majburiyati 40 mln, to'lanmagan ish haqi majburiyati 32 mln.
Ana shu ikkita majburiyat — foyda bilan pul o'rtasidagi ko'prik. Modelingiz
ularni saqlay olmasa, uchta hisobot hech qachon bir-biriga mos kelmaydi.
3. Kerakli buxgalteriya qoidalari
Buxgalteriya bilishingiz shart emas. Kerakli qoidalar shu yerda — boshqa
hech narsa kerak emas. Bu bilim testi emas, mantiq testi.
Daromad ≠ pul. O'quvchi 3 oyga oldindan to'lasa, bu hali daromad emas —
siz hali darslarni o'tmagansiz. Daromad har oy bo'lib-bo'lib tan olinadi.
Xarajat ≠ to'lov. Yanvar ishi uchun ish haqi 5-fevralda to'lansa ham,
xarajat yanvarga tegishli.
Investor kapitali daromad emas. Siz uni ishlab topmadingiz. Foydaga
ta'sir qilmaydi.
Kredit to'lovi ikki qismdan iborat. Asosiy qarz — qarzning kamayishi,
xarajat emas. Faqat foiz xarajat hisoblanadi.
Jihoz xaridi xarajat emas. Pul chiqadi, o'rniga aktiv keladi.
(Amortizatsiya bu topshiriq doirasidan tashqarida — hisoblamang.)
Pul oqimi uch toifaga bo'linadi:
Toifa
Nima kiradi
Operatsion
O'quvchi to'lovlari, ish haqi, ijara, kommunal, marketing, kredit foizi
Investitsion
Jihoz va mebel xaridi
Moliyaviy
Investor kapitali, kredit olish, kredit asosiy qarzini qaytarish
4. Uchta tenglik — o'zingizni tekshirish
Bu topshiriqning markazi. Tizimingiz to'g'ri bo'lsa, quyidagi uchta tenglik
har bir oy uchun, farqsiz (aniq nol) bajariladi:
1) Balans tenglamasi
Aktivlar = Majburiyatlar + Kapital
​
2) Pul oqimi bog'lanishi
Oy boshidagi pul + (operatsion + investitsion + moliyaviy) = Oy oxiridagi pul
​
3) Foyda bog'lanishi
Oyning sof foydasi = Taqsimlanmagan foydaning o'sha oydagi o'zgarishi
​
Talab
npm run reconcile buyrug'ini yozing. U:
Bazadagi hamma oy bo'yicha uchala tenglikni tekshiradi
Har bir tenglik uchun: nechta oy tekshirildi, nechtasi mos kelmadi va mos
kelmagan oylardagi farq summasini ko'rsatadi
Hammasi to'g'ri bo'lsa exit 0, aks holda exit 1 qaytaradi
Topshirishdan oldin bu buyruq toza o'tishi kerak.
Diqqat: farqni sun'iy ravishda yopib qo'yish (balansga "moslashtiruvchi"
qator qo'shish) — avtomatik rad etish sababi.
5. Majburiy test stsenariylari
Quyidagi beshta stsenariyni avtomatlashtirilgan test sifatida yozing.
Har biri alohida, bo'sh bazadan boshlanadi.
5.1. Oldindan to'lov
O'quvchi 2026-01-10 kuni 1 800 000 so'm to'ladi — yanvar, fevral va mart
uchun (oyiga 600 000).
Tekshiruv
Kutilgan qiymat
Yanvar P&L: daromad
600 000
31-yanvar balans: oldindan to'langan darslar
1 200 000
Yanvar pul oqimi: operatsion kirim
1 800 000
31-mart balans: oldindan to'langan darslar
0
Yanvar–mart jami daromad
1 800 000
5.2. Ish haqi
Xodimning oyligi 8 000 000 so'm. Yanvar oyi uchun ish haqi 2026-02-05
kuni to'lanadi.
Tekshiruv
Kutilgan qiymat
Yanvar P&L: ish haqi xarajati
8 000 000
31-yanvar balans: to'lanmagan ish haqi
8 000 000
Yanvar pul oqimi: jami o'zgarish
0
Fevral P&L: shu ish haqidan kelib chiqqan xarajat
0
Fevral pul oqimi: operatsion chiqim
8 000 000
28-fevral balans: to'lanmagan ish haqi
0
5.3. Investor kapitali
Investor 2026-01-05 kuni 500 000 000 so'm kiritdi.
Tekshiruv
Kutilgan qiymat
Yanvar P&L: daromad
0
Yanvar P&L: sof foyda
0
31-yanvar balans: kapital
500 000 000
Yanvar pul oqimi: moliyaviy kirim
500 000 000
Yanvar pul oqimi: operatsion
0
5.4. Kredit to'lovi
2026-02-01 kuni bankdan 200 000 000 so'm kredit olindi, yillik 18%.
2026-02-20 kuni birinchi to'lov: jami 12 000 000, shundan foiz
3 000 000, asosiy qarz 9 000 000.
Tekshiruv
Kutilgan qiymat
Fevral P&L: shu kreditdan kelib chiqqan xarajat
3 000 000
28-fevral balans: kredit qarzi
191 000 000
Fevral pul oqimi: moliyaviy
+191 000 000
Fevral pul oqimi: operatsion chiqim (foiz)
3 000 000
5.5. Jihoz xaridi
2026-01-08 kuni 240 000 000 so'mlik jihoz sotib olindi.
Tekshiruv
Kutilgan qiymat
Yanvar P&L: xarajat
0
31-yanvar balans: asosiy vositalar
240 000 000
Yanvar pul oqimi: investitsion chiqim
240 000 000
6. Ma'lumotlar
Tizimni realistik hajmdagi ma'lumot bilan to'ldiradigan npm run seed
buyrug'ini yozing. 2-bo'limdagi jarayonni takrorlashi kerak:
Kamida 3 yillik tarix
Kamida 500 o'quvchi — bir qismi chegirmali, bir qismi 3 oylik oldindan
to'lov qiladi, bir qismi ba'zi oylarda to'lamaydi
Kamida 20 xodim, ish haqi keyingi oyning 5-sanasida to'lanadi
Har oy: ijara, kommunal, marketing
Kamida 2 investor, biri keyinroq qo'shimcha kapital kiritgan
Bitta bank krediti, har oy to'lov
Boshlanishida jihoz xaridi
Naqd va bank orqali to'lovlar aralash, oy oxirida inkassatsiya
Ma'lumot tasodifiy generatsiya qilinsa ham bo'ladi, lekin npm run reconcile
o'sha ma'lumotda toza o'tishi shart.
7. Talab qilinadigan hisobotlar
Uchta endpoint (nomlarini o'zingiz tanlang):
Foyda va zarar — oy bo'yicha. Daromad, xarajatlar turlar bo'yicha, jami
xarajat, sof foyda.
Pul oqimi — oy bo'yicha. Oy boshidagi qoldiq, operatsion / investitsion /
moliyaviy oqimlar, sof o'zgarish, oy oxiridagi qoldiq.
Balans — berilgan sanaga. Aktivlar, majburiyatlar, kapital (taqsimlanmagan
foyda bilan birga) va uchala jami.
8. Frontend
Bitta sahifa. Oy tanlanadi, uchala hisobot ko'rsatiladi.
React + TypeScript. Dizayn baholanmaydi. Oddiy jadval yetarli, UI
kutubxona kerak emas. Bunga 30 daqiqadan ko'p vaqt sarflamang.
9. Unumdorlik
3 yillik ma'lumot bilan har bir hisobot 1 soniyadan tez qaytishi kerak.
README.md da yozing: ma'lumot hajmi, har bir hisobotning o'lchangan vaqti,
va optimallashtirish qilgan bo'lsangiz — nima qildingiz va nima uchun.
10. Doiradan tashqarida
Bularga vaqt sarflamang: autentifikatsiya va rollar, amortizatsiya, soliqlar,
valyuta konvertatsiyasi, multi-tenant arxitektura, deploy va CI/CD, UI
dizayni, Excel/PDF eksport.
11. Ochiq savol (kod yozilmaydi)
Investordan talab keldi:
"Har oyda foydadan menga tegishli ulushni hisoblab, hisobotda ko'rsatinglar."
Boshqa tafsilot yo'q. Investor hozir aloqada emas.
DECISIONS.md faylida yozing (maksimum 1 sahifa):
Qaysi savollarni kimga berasiz? Aniq savollar bo'lsin, umumiy emas
Qaysi qarorlarni javob kutmasdan o'zingiz qabul qilasiz va nega
Bu ma'lumotlar modeli va mavjud hisobotlarga qanday ta'sir qiladi
Nimani birinchi versiyaga kiritmaysiz
Bu savolning to'g'ri javobi yo'q. Biz qanday savol berishingizni ko'ramiz.
12. AI ishlatish
AI ishlatish ruxsat etilgan va kutiladi. Biz AI-First jamoamiz va bu
lavozimda kundalik ish shunday olib boriladi.
Ikkita shart:
ai-log.md faylida qaysi vositalardan foydalanganingizni va eng foydali
bo'lgan 3–5 ta promptingizni yozib qoldiring
Yozgan har bir qator kodni tushuntira olishingiz kerak
13. Topshirish
Boshlaganingizdan 24 soat ichida ikkita narsa yuboring.
13.1. Repository
Private GitHub/GitLab repo, ni telegram orqali yuboring public qilib
Ichida bo'lishi kerak:
README.md         # o'rnatish, ishga tushirish, model tanlovi izohi, o'lchovlar
DECISIONS.md      # 11-bo'lim
ai-log.md         # AI workflow
​
package.json da ishlashi kerak: npm run seed, npm run reconcile,
npm test, npm run dev.
README.md da alohida yozing: qanday ma'lumotlar modelini tanladingiz va
nima uchun. Bu baholashda muhim o'rin tutadi.
Commit tarixi ko'rinib tursin — bitta katta commit emas.
13.2. Ekran yozuvi (maksimum 30 daqiqa)
Ekraningizni yozib ko'rsating:
Modelni qanday tanladingiz — qaysi variantlarni ko'rdingiz, nimadan voz
kechdingiz va nega
npm run reconcile ni jonli ishga tushiring
Test stsenariylaridan kamida bittasini jonli ishga tushiring
Yo'lda nima ishlamadi — birinchi urinishingiz nimasi bilan xato edi
Nimaga ustuvorlik berdingiz va nimani tugatolmadingiz
Sifat muhim emas, montaj kerak emas, bitta dubl yetarli. O'zbek, rus yoki
ingliz tilida — qaysi birida erkin gapirsangiz.
Hamma qismni mukammal qilolmasligingiz normal va kutilgan.
14. Baholash
Qism
Vazn
Ma'lumotlar modeli — uchala tenglik bajarilishi va model asoslanishi
30%
Test stsenariylari — beshtasi o'tishi
20%
Ekran yozuvi — mulohaza aniqligi va o'z kodini egallaganlik
25%
Ochiq savol — savollar sifati
15%
Kod sifati, struktura, commitlar, README
10%
Frontend alohida baholanmaydi — faqat borligi tekshiriladi.
Ekran yozuvisiz yoki npm run reconcile toza o'tmagan topshiriq ko'rib
chiqilmaydi. Ekran yozuvini istasangiz youtubega qoyib linkini yuboring yoki telegram orqali yuboring quyida telegram account ko’rsatilgan!
15. Nimani baholamaymiz
UI dizayni, test qamrovi foizi, papka strukturasi, kommentariyalar soni,
README uzunligi, kutubxona tanlovi.
Bizni bitta narsa qiziqtiradi: raqamlar to'g'rimi va nima uchun shundayligini
tushuntira olasizmi.
Topshiriqda tushunarsiz joy bo'lsa — yozing. Savol berish minus emas, plyus.
Topshiriqni yuborish!
telegram orqali @zafarbek_unical ga yuboring savollaringiz bo’lsa ham shu profilga murojat qilishingiz mumkin 
