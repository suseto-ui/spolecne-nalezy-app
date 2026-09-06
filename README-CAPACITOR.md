# Společné Nálezy - Capacitor Build Guide

## Přechod z Bubblewrap na Capacitor

Z důvodu problémů s Bubblewrap CLI na Windows platformě byla aplikace převedena na použití **Capacitor**. Capacitor je moderní nástroj pro generování nativních mobilních aplikací z webových aplikací.

## Požadavky

- Node.js 16+ (doporučeno 18+)
- npm 8+
- Java JDK 11+ (doporučeno 17+)
- Android Studio (volitelné, pro pokročilé buildy)

## Rychlý start

### 1. Inicializace projektu

```bash
# Instalace Capacitor CLI
npm install -g @capacitor/cli @capacitor/core @capacitor/android

# Inicializace npm projektu
npm init -y

# Instalace Capacitor balíčků
npm install @capacitor/core @capacitor/cli @capacitor/android

# Inicializace Capacitor
npx cap init SpolecneNalezy cz.spolecnenalezy.app

# Přidání Android platformy
npx cap add android
```

### 2. Konfigurace

Upravte `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cz.spolecnenalezy.app',
  appName: 'Společné Nálezy',
  webDir: 'public',
  server: {
    hostname: 'localhost',
    androidScheme: 'https'
  }
};

export default config;
```

### 3. Kopírování web assets

```bash
# Vytvořte www adresář a zkopírujte obsah z public/
mkdir www
cp -r public/* www/
```

### 4. Synchronizace s Androidem

```bash
npx cap sync
```

### 5. Kopírování ikon

Ikony jsou automaticky kopírovány do Android resources během buildu, ale můžete je také ručně zkopírovat:

```bash
# Kopírování ikon do Android resources
cp public/icon-192.png android/app/src/main/res/mipmap-mdpi/ic_launcher.png
cp public/icon-512.png android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
cp public/icon-512.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
cp public/icon-512.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

### 6. Build APK

```bash
# Build Release APK
cd android
./gradlew assembleRelease
cd ..
```

### 7. Podepsání APK

```bash
# Vytvoření keystore (pokud ještě neexistuje)
keytool -genkeypair -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Spolecne Nalezy, OU=Development, O=Spolecne Nalezy, L=Prague, ST=Prague, C=CZ" -storepass spolecnenalezy123 -keypass spolecnenalezy123 -noprompt

# Podepsání APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore android.keystore -storepass spolecnenalezy123 -keypass spolecnenalezy123 -signedjar app-release-signed.apk android/app/build/outputs/apk/release/app-release-unsigned.apk android
```

## Automatizovaný build

Použijte připravený build script:

```bash
python build_capacitor_apk.py
```

Tento script provede všechny kroky automaticky:
1. Zkontroluje závislosti (Node.js, npm, Java)
2. Vygeneruje chybějící ikony
3. Vytvoří Android keystore
4. Inicializuje Capacitor projekt
5. Nakonfiguruje Capacitor
6. Zkopíruje web assets
7. Buildne Android APK
8. Podepíše APK
9. Ověří výsledek

## Struktur projektu

```
appkanase/
├── public/                  # Web assets
│   ├── index.html          # Hlavní HTML soubor
│   ├── manifest.json       # Web App Manifest
│   ├── icon-192.png        # Ikona 192x192
│   ├── icon-512.png        # Ikona 512x512
│   └── icon-maskable-512.png # Maskovatelná ikona
├── www/                    # Kopie public/ pro Capacitor
├── android/               # Android projekt (vygenerovaný Capacitorem)
├── capacitor.config.ts     # Konfigurace Capacitor
├── package.json           # NPM konfigurace
├── android.keystore       # Android keystore
├── build_capacitor_apk.py # Build script
└── app-release-signed.apk # Výsledný podepsaný APK
```

## Odstraňování problémů

### Chyba: "The web assets directory (./www) must contain an index.html file"

**Řešení:** Vytvořte `index.html` v `public/` adresáři. Soubor bude automaticky zkopírován do `www/` během buildu.

```bash
# Vytvoření jednoduchého index.html
echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Společné Nálezy</title></head><body><h1>Společné Nálezy</h1></body></html>' > public/index.html
```

### Chyba: "android platform already exists"

**Řešení:** Odstraňte existující `android/` adresář a spusťte `npx cap add android` znovu.

```bash
rm -rf android
npx cap add android
```

### Chyba: "keystore password was incorrect"

**Řešení:** Vytvořte nový keystore s správným heslem:

```bash
keytool -genkeypair -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Spolecne Nalezy, OU=Development, O=Spolecne Nalezy, L=Prague, ST=Prague, C=CZ" -storepass spolecnenalezy123 -keypass spolecnenalezy123 -noprompt
```

## Rozšířené možnosti

### Build Debug APK

```bash
cd android
./gradlew assembleDebug
cd ..
```

### Spuštění na zařízení

```bash
# Připojte Android zařízení nebo emulátor
adb devices

# Instalace APK
adb install app-release-signed.apk
```

### Aktualizace závislostí

```bash
npm update
npx cap sync
```

## Doporučení pro produkční použití

1. **Změňte heslo keystore** - Použijte bezpečnější heslo než `spolecnenalezy123`
2. **Použijte environment proměnné** - Neukládejte hesla přímo v build skriptech
3. **Automatizujte build** - Integrujte build do CI/CD pipeline
4. **Testujte na více zařízeních** - Ověřte funkčnost na různých Android verzích

## Reference

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Android Keystore System](https://developer.android.com/training/articles/keystore)

## Srovnání Bubblewrap vs Capacitor

| Funkce | Bubblewrap | Capacitor |
|--------|-----------|-----------|
| Platforma | TWA (Trusted Web Activity) | Native Web View |
| Integrace | PWA-focused | Full hybrid app |
| Pluginy | Omezené | Rozšiřitelné |
| Windows podpora | Problematic | Dobrá |
| Údržba | Google | Ionic Framework |

Pro tento projekt je **Capacitor lepší volbou**, protože:
- Funguje spolehlivě na Windows
- Má aktivní podporu a vývoj
- Nabízí více možností pro rozšíření
- Je kompatibilní s moderními webovými technologiemi
