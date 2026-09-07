# Návod na nasazení do mobilu a testování na zařízení s API

Tato aplikace **Společné Nálezy** je plně optimalizována pro nasazení do mobilních telefonů (Android i iOS) s připojením k backendu a Gemini AI API.

## Možnost 1: Okamžitá instalace do mobilu přes PWA / WebAPK (Doporučeno)

1. Na svém Android nebo iOS telefonu otevřete prohlížeč (Google Chrome, Edge, Safari).
2. Přejděte na adresu:
   **https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app**
   *(nebo v aplikaci naskenujte QR kód z dialogu „Nasadit do mobilu“).*
3. **Android (Chrome):**
   - V menu klepněte na **„Přidat na plochu“** nebo na výzvu **„Instalovat aplikaci“**.
   - Systém Android vytvoří nativní WebAPK ikonu na vaší ploše.
   - Aplikace běží v samostatném okně bez adresního řádku (standalone), má plný přístup ke kameře, GPS lokaci a komunikuje se serverovým Gemini API.
4. **iOS (Safari):**
   - Klepněte na tlačítko Sdílet (čtverec se šipkou nahoru).
   - Zvolte **„Přidat na plochu“**.

---

## Možnost 2: Export a sestavení samostatného instalačního balíčku (.apk)

Pokud potřebujete fyzický `.apk` soubor pro sideloading nebo distribuci:

### A) Pomocí Google Bubblewrap CLI (TWA)

#### Rychlá metoda (doporučeno)
Spusťte automatizovaný instalační skript:
```bash
# Windows (PowerShell - doporučeno)
.\[install.ps1](install.ps1)

# Windows (CMD)
[install.bat](install.bat)

# Linux/macOS
./build-android-apk.sh
```

Skript automaticky:
- Zkontroluje a nainstaluje všechny závislosti (Node.js, Java, Bubblewrap)
- Sestaví podepsaný APK
- Nainstaluje na připojené zařízení (pokud je ADB dostupné)

#### Ruční metoda
```bash
# 1. Nainstalujte nástroj Bubblewrap
npm install -g @bubblewrap/cli

# 2. Inicializujte a sestavte APK (použije předpřipravený twa-manifest.json)
bubblewrap init --manifest=https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app/manifest.json
bubblewrap build

# 3. Nainstalujte vygenerovaný APK soubor do připojeného mobilu:
adb install app-release-signed.apk

# 4. Sestavení projektu
./gradlew build --stacktrace --info
```

### B) Přes exportní balíček v aplikaci
Přímo v aplikaci v záhlaví klikněte na tlačítko **„Nasadit & Exportovat"**:
- Můžete si přímo stáhnout ZIP archiv obsahující veškeré konfigurace (`twa-manifest.json`, `AndroidManifest.xml`, build skript, ikony).
- Lze spustit live test připojení k API (`/api/health` a `/api/ai/analyze`).

---

## 🎨 Ikony pro APK

Aplikace využívá ikony pro PWA a Android APK. Projekt již obsahuje `icon.svg` v `public/` složce.

### Generování ikon

#### Metoda 1: Automatické generování (doporučeno)
```bash
node generate-icons.js
```
Vygeneruje všechny potřebné ikony z `public/icon.svg`.

#### Metoda 2: Placeholder ikony
Pokud nemáte SVG ikonu, můžete použít placeholder:
```bash
python create_placeholder_icons.py
```
**Požadavky:** `pip install Pillow`

#### Metoda 3: Ruční vytvoření
Vytvořte tyto soubory:
- `public/icon-192.png` (192×192)
- `public/icon-512.png` (512×512)
- `public/icon-maskable-512.png` (512×512, kruhová maska)
- `android/ic_launcher.png` (512×512)
- `android/ic_launcher_round.png` (512×512)

Podrobný návod: [ICONSREADME.md](ICONSREADME.md)
