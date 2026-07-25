# Loyiha qoidalari

- Bu MUSTAQIL "Ustoz" (o'qituvchi) ilovasi — multi-tenant CRM'ning o'qituvchi kabineti (React + Vite + Capacitor, appId `uz.ncrm.ustoz`). Admin/superadmin ilova alohida `crm-frontend` repoda yashaydi; bu repo undan nusxalab ajratilgan va faqat o'qituvchi qismini saqlaydi.
- Marshrutlar FAQAT `/login` + `/teacher/*` (App.jsx shunga qayta yozilgan). Admin/superadmin sahifalari, komponentlari va api modullari bu repodan olib tashlangan — ularni qayta qo'shma.
- Backend allaqachon tayyor va Railway'da ishlab turibdi: https://crm-backend-production-49b2.up.railway.app
- Mobil ilova (Capacitor) `server.url` orqali `https://ustoz.ncrm.uz`ni yuklaydi — UI o'zgarishlari serverga deploy qilinganda ilovaga yetib boradi.
- DIZAYN TIZIMI (juda muhim, hamma joyda izchil qo'llanilsin):
  - Sidebar: to'q tungi-ko'k fon (#12182B), oq-kulrang matn (#C7C9D6), faol bo'lim amber fon (#F5A623) bilan ajratiladi, matni to'q amber (#412402)
  - Asosiy kontent foni: `bg-background` (light #F8F9FB, dark #0E101A)
  - Accent rang: amber/oltin (#F5A623, och versiyasi #FAC775, to'q versiyasi #854F0B)
  - Muvaffaqiyat rangi: yashil (#0F6E56 matn / #E1F5EE fon), xato/qarz rangi: qizil (#A32D2D matn / #FCEBEB fon)
  - Kartochkalar: `bg-surface` fon, yumshoq soya (shadow-sm), border-radius 12px, padding 16-20px
  - Tugmalar: asosiy (amber fon, to'q matn), ikkinchi darajali (`bg-surface`, border, `text-fg-secondary`), border-radius 8px
  - Shrift: Inter (Google Fonts orqali)
  - Ikonkalar: lucide-react
  - Barcha ranglar/o'lchamlar Tailwind config'da custom token sifatida belgilansin (masalan colors.sidebar, colors.accent), hech qachon to'g'ridan-to'g'ri hex kod yozilmasin komponentlarda
  - Karta hover soyasi: `hover:shadow-card-hover` (`hover:shadow-md` ishlatilmaydi). Sidebar hover/border: `bg-sidebar-hover` / `border-sidebar-border`

## Neytral ranglar va tungi rejim (juda muhim)

Tailwind `gray-*` shkalasi **ishlatilmaydi** — `bg-white`, `text-gray-900`,
`border-gray-100` kabi klasslar taqiqlanadi. Ularning o'rniga semantik
token'lar ishlatiladi; ular `src/index.css`dagi CSS o'zgaruvchilariga
bog'langan va `.dark` klassi ostida avtomatik almashadi, shuning uchun
komponentlarda `dark:` variantini yozish shart emas:

- Fon: `bg-surface` (karta/panel), `bg-surface-sunken` (jadval sarlavhasi,
  hover, disabled input), `bg-surface-raised` (modal/dropdown)
- Chegara: `border-line` (yengil), `border-line-strong` (input, ajratuvchi)
- Matn: `text-fg` (asosiy), `text-fg-secondary`, `text-fg-muted`,
  `text-fg-faint` (faqat dekorativ/placeholder — kontrasti past)

`accent`, `success`, `danger`, `info`, `sidebar-*`, `scheduleBlock-*`
token'lari ikkala rejimda bir xil qoladi — ularga tegilmaydi. Sidebar ham
ikkala rejimda to'q ko'k.

## Rangli StatCard variantlari

`StatCard` `variant` propini oladi: `plain` (default, oq karta) va gradient
variantlar. Rang **semantik**, bezak uchun emas:

- `green` — pul kiradi (tushum, sof foyda, to'lov)
- `orange` — pul chiqadi (xarajat, chiqim)
- `rose` — qarz/qarzdorlik
- `blue` — hajm/son (o'quvchi, guruh, lead, xodim, filial)
- `purple` — son (ikkinchi hisob ko'rsatkichi) yoki ikkinchi darajali pul
  toifasi (grant, bonus, sof foyda) — bir qatorda `green`/`blue` bilan yonma-yon
  takrorlanmasin
- `teal` — nisbat, foiz, davomat (attendance, CPL/CAC kabi hosila metrikalar)
- `plain` — qolgan hammasi (qatorda kamida bitta neytral)

Bir qatorda taxminan 2 rangli + 2 oq; yonma-yon bir xil rang qo'yilmaydi,
kamida bitta neytral (`plain`) qoldiriladi. `orange` sahifaning asosiy
xarajat/bosh ko'rsatkichi bo'lib, qatorda ko'pi bilan bitta.

## Sahifa joylashuvi (mobil-first o'qituvchi kabineti)

Bu ilova telefon-kenglikdagi ustun (`max-w-lg`) sifatida quriladi:
`TeacherLayout` yopishqoq yengil header + pastki tab-bar beradi (sidebar yo'q).
Sahifalar `/teacher/*` marshrutlarida, App.jsx'da `React.lazy()` orqali yuklanadi.

- Sahifa ritmi: `max-w-lg` konteyner + `px-4 pt-4 pb-24 space-y-4`,
  kartalar `padding="p-4"`, karta ichi `gap-3`, forma `gap-4`.
- Modal formasi: bir ustunli — `flex flex-col gap-4`; ikki ustunli —
  `grid grid-cols-1 gap-4 md:grid-cols-2`. Footer doim
  `[secondary "Bekor qilish"] [primary "Saqlash"]`, yuborilayotganda primary
  matni "Saqlanmoqda...".
- O'tishlar faqat `transition-colors` (interaktiv element) va
  `transition-shadow` (karta hover). Boshqa animatsiya yo'q.
- Spinner faqat 2 joyda: `Suspense` fallback va tugma ichidagi band holat.
  Qolgan barcha yuklanish holatlari `Skeleton`.

## Qisqalik qoidasi

Oddiy, xavfsiz vazifalarda (yangi sahifa yaratish, mavjud naqshni takrorlash, kichik tuzatish) fikrlash jarayonini ovoz chiqarib yozib bermasdan, ichida chuqur fikrlab, faqat yakuniy natijani va muhim qarorlarni qisqa xulosa qilib ber. Har bir kichik qadamni ("endi buni qilaman, keyin buni tekshiraman") batafsil e'lon qilib o'tirma.

Bundan MUSTASNO: ma'lumotlar bazasiga ta'sir qiluvchi amal (migratsiya, seed, production yozuv/o'chirish)dan oldin — bu holatda aniq nima va nega ekanini qisqa (2-3 gap) tushuntirib, ruxsat so'rash tartibi o'zgarishsiz davom etadi. Bu yerda qisqalik xavfsizlikdan ustun emas.

## Yangi sahifa qo'shish qoidasi

Har qanday yangi `/teacher/*` sahifa: (1) App.jsx'ga React.lazy() orqali qo'shiladi, statik import EMAS; (2) src/utils/prefetch.js'dagi routeImports xaritasiga ham qo'shiladi (App.jsx'dagi lazy() aynan shu xaritadagi funksiyani ishlatsin: `lazy(routeImports["/teacher/yangi-sahifa"])`); (3) kerak bo'lsa `src/constants/teacherNav.js`ga tab qo'shiladi. Ikkalasi bajarilmasa, bundle hajmi oshadi va prefetch ishlamaydi.
