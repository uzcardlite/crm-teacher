# Ustoz — Play Console materiallari

| | |
|---|---|
| Ilova nomi | Ustoz |
| Paket nomi | `uz.ncrm.ustoz` |
| Maxfiylik siyosati | `https://ustoz.ncrm.uz/privacy.html` |
| Aloqa email | `info@ncrm.uz` |
| Veb-sayt | `https://ncrm.uz` |
| Toifa | Образование |

---

## Reliz fayli (AAB)

GitHub Actions → **Build Ustoz Release (APK + AAB)** → *Run workflow*.
Artifact `ustoz-release-aab` → `app-release.aab` Play Console'ga yuklanadi.

- `versionCode` = workflow tartib raqami (avtomatik o'sadi — qo'lda tegilmaydi).
- `versionName` = `public/app-version.json` → `version`. Yangi relizda shuni va
  `src/components/UpdateGate.jsx` → `APP_VERSION`ni birga oshiring.
- Imzo kaliti GitHub secret'larida (`ANDROID_KEYSTORE_*`). Play App Signing
  yoqilgan bo'lsa, bu **upload key** hisoblanadi.

---

## Do'kon sahifasi matnlari

### Qisqa tavsif

```
Davomat, baholar va ota-onalar bilan aloqa — o'qituvchi uchun bitta ilovada.
```

### To'liq tavsif

```
Ustoz — o'quv markazi o'qituvchilari uchun ish ilovasi.

Nimalar qila olasiz:

• Davomat — guruhni tanlang va bir bosishda belgilang: keldi, kelmadi, kechikdi
• Baholar — imtihon va kunlik baholarni telefondan qo'ying
• Uy vazifalari — guruhga topshiriq bering
• Dars jadvali — bugungi va haftalik darslaringiz
• Ota-onalar bilan yozishma — raqam almashmasdan, ilovaning o'zida
• Oylik — hisob-kitobingizni ko'ring

Ilova Milliy CRM tizimidan foydalanadigan o'quv markazlari uchun mo'ljallangan.
Kirish uchun login va parolni markazingiz administratori beradi.

Savollar: info@ncrm.uz
```

---

## Grafik materiallar

| Material | O'lcham | Fayl |
|---|---|---|
| Ikonka | 512×512 | `ustoz-assets/icon-512.png` ✅ |
| Feature graphic | 1024×500 | `ustoz-assets/feature-graphic.png` ✅ |
| Skrinshotlar | 4 ta, 1080×1920 | `ustoz-assets/screenshots/` ✅ |

Skrinshotlar o'ylab topilgan demo markazdan ("Ziyo Nur o'quv markazi") olingan.
Qayta olish: `crm-backend/scripts/seed_demo_tenant.py` (lokal baza) →
ilovani shu bazaga ulab suratga olish → `scripts/store_screenshots.py`.

---

## App access (tekshiruvchi uchun hisob)

Ustoz oddiy telefon + parol bilan kiradi — alohida "aylanib o'tish" kerak emas.
Production'da demo markaz yaratilgach:

```
Telefon: +998990000002
Parol:   <DEMO_TEACHER_PASSWORD — seed skriptiga berilgan qiymat>
```

---

## Anketalar — tavsiya etilgan javoblar

### Ma'lumotlar xavfsizligi (Data safety)

| Tur | Yig'iladi | Ulashiladi | Majburiy | Maqsad |
|---|---|---|---|---|
| Номер телефона | Ha | Yo'q | Ha | Hisob boshqaruvi |
| Имя | Ha | Yo'q | Ha | Ilova funksiyasi |
| Фотографии | Ha | Yo'q | Yo'q (profil surati, ixtiyoriy) | Ilova funksiyasi |
| Другие сообщения | Ha | Yo'q | Yo'q | Ilova funksiyasi (ota-onalar bilan yozishma) |
| Другой пользовательский контент | Ha | Yo'q | Ha | Ilova funksiyasi (davomat, baho, uy vazifasi) |

Qo'shimcha: shifrlanadi **Ha**, o'chirishni so'rash mumkin **Ha** (info@ncrm.uz).
Joylashuv, kontaktlar, analitika, reklama identifikatori — **yo'q**.

### Kontent reytingi

Hamma savolga **Yo'q**, faqat *"foydalanuvchilar o'zaro muloqot qila oladimi"* →
**Ha** (ota-onalar bilan chat). Natija: **3+ / Everyone**.

### Boshqa bandlar

| Band | Javob |
|---|---|
| Maqsadli auditoriya | 18+ (o'qituvchilar) |
| Reklama | Yo'q |
| Moliyaviy funksiyalar | Yo'q (oylik faqat ko'rsatiladi) |

---

## Qolgan ishlar

1. Production'da demo markaz + `DEMO_TEACHER_PASSWORD` (ruxsat bilan)
2. Play Console: Create app → store listing → anketalar → AAB → Internal/Closed testing
3. Chiqqach: `public/app-version.json` → `url` haqiqiy Play havolasiga ishlashini tekshirish
