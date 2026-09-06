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
```bash
# 1. Nainstalujte nástroj Bubblewrap
npm install -g @bubblewrap/cli

# 2. Inicializujte a sestavte APK (použije předpřipravený twa-manifest.json)
bubblewrap init --manifest=https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app/manifest.json
bubblewrap build

# 3. Nainstalujte vygenerovaný APK soubor do připojeného mobilu:
adb install app-release-signed.apk
```

### B) Přes exportní balíček v aplikaci
Přímo v aplikaci v záhlaví klikněte na tlačítko **„Nasadit & Exportovat“**:
- Můžete si přímo stáhnout ZIP archiv obsahující veškeré konfigurace (`twa-manifest.json`, `AndroidManifest.xml`, build skript, ikony).
- Spustit live test připojení k API (`/api/health` a `/api/ai/analyze`).
