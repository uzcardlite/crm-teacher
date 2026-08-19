# Ustoz ilovasi — APK / Play Store qo'llanmasi

Ustoz ilovasi endi **lokal bundle** (ilova telefonda, tez, offline) — masofadan
`ustoz.ncrm.uz` yuklamaydi. Quyida yangi APK/AAB'ni yig'ish va Play Store'ga
yuklash qadamlari.

## 0. Talablar (bir martalik)
- Node 18+ va npm
- Android Studio (Android SDK, JDK 17)
- Google Play Console akkaunti ($25 bir martalik) — Play Store uchun

## 1. Bog'liqliklarni o'rnatish
```bash
cd crm-teacher
npm install          # @capacitor/splash-screen ham o'rnatiladi
```

## 2. Ikonka va splash (NCRM logosidan) — `assets/` ichida tayyor
```bash
npx @capacitor/assets generate --android
```
Bu `assets/logo.png`, `assets/icon-foreground.png`, `assets/icon-background.png`,
`assets/splash.png`, `assets/splash-dark.png` fayllaridan barcha Android
ikonkalari + splash rasmlarini yaratadi (amber fon + oq koshin).

## 3. Web'ni yig'ish va Android'ga sinxronlash
```bash
npm run build
npx cap add android      # faqat birinchi marta (android/ papkasini yaratadi)
npx cap sync android
```

## 4. Imzo kaliti (keystore) — bir martalik, XAVFSIZ SAQLANG
```bash
keytool -genkey -v -keystore ustoz-release.keystore \
  -alias ustoz -keyalg RSA -keysize 2048 -validity 10000
```
> ⚠️ `ustoz-release.keystore` va parollarni yo'qotmang — keyingi yangilanishlar
> shu kalit bilan imzolanishi SHART, aks holda Play Store yangilashni rad etadi.

`android/keystore.properties` yarating (gitga qo'shmang):
```
storeFile=../../ustoz-release.keystore
storePassword=SIZNING_PAROL
keyAlias=ustoz
keyPassword=SIZNING_PAROL
```
`android/app/build.gradle` ichида `signingConfigs` + `release`ni shu properties'ga
ulang (Capacitor hujjatlaridagi standart namuna).

## 5. Versiya
Har relizda `android/app/build.gradle`:
- `versionCode` ni **1 ga oshiring** (butun son, har safar katta)
- `versionName` ni yangilang (masalan `"1.0.1"`)

Va **`src/components/UpdateGate.jsx` dagi `APP_VERSION`** ni shu `versionName`ga
tenglang + `public/app-version.json` dagi `version`ni yangilang (pastga qarang).

## 6. AAB (Play Store uchun) yoki APK (sinov uchun) yig'ish
```bash
cd android
./gradlew bundleRelease     # AAB -> app/build/outputs/bundle/release/app-release.aab
# yoki sinov uchun:
./gradlew assembleRelease   # APK -> app/build/outputs/apk/release/app-release.apk
```

## 7. Play Store'ga yuklash
1. Play Console → **Create app** (nom: Ustoz, til: o'zbek)
2. **Production** → yangi reliz → `app-release.aab` ni yuklang
3. Store listing: nom, qisqa/to'liq tavsif, **ikonka (512×512)**, **feature grafika
   (1024×500)**, kamida 2 ta **skrinshot**
4. **Maxfiylik siyosati** havolasi (majburiy) — oddiy sahifa yetarli
5. Content rating, Data safety anketalarini to'ldiring → **Submit**

## Yangilanishlar qanday yetadi (savolingizga javob)
- **Play Store** ilovani **avtomatik yangilaydi** (fon yoki "Update").
- Bundan tashqari ilova **ichida "Yangi versiya tayyor — Yuklab olish"** banneri
  chiqadi (`UpdateGate`). U `https://ustoz.ncrm.uz/app-version.json` ni tekshiradi.

Har relizdan keyin `public/app-version.json`ni yangilang va webни deploy qiling:
```json
{
  "version": "1.0.1",
  "url": "https://play.google.com/store/apps/details?id=uz.ncrm.ustoz",
  "notes": "Yangi imkoniyatlar va tuzatishlar"
}
```

## Eski (masofadan yuklaydigan) ilova nima bo'ladi?
Eski ilova hali ham `ustoz.ncrm.uz`ni jonli yuklaydi — **ishlab turaveradi**.
`UpdateGate` uni aniqlaydi (masofadan yuklangani bo'yicha) va ustozga
**"Yangi rasmiy ilova chiqdi — Yuklab olish"** bannerini ko'rsatadi (yuqoridagi
`app-version.json`dagi Play Store havolasiga). Ustozlar bosib yangi ilovani
o'rnatadi. Hech kim qolib ketmaydi.
