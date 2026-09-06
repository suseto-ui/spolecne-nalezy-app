# Bubblewrap CLI - Troubleshooting Guide

## Problém: "Invalid URL" error při inicializaci Bubblewrap projektu

### Příznaky
- Příkaz `bubblewrap init --manifest=twa-manifest.json` selhává s chybou:
  ```
  cli ERROR Invalid URL
  ```
- Stejná chyba se objevuje bez ohledu na formát URL v `twa-manifest.json`
- Problém se projevuje na Windows, i s různými verzemi Bubblewrap CLI

### Zkoušená řešení (neúspěšná)

#### 1. Různé formáty host
- `https://example.com` - Invalid URL
- `http://localhost:8080` - Invalid URL  
- `localhost:8080` - Invalid URL
- `127.0.0.1:8080` - Invalid URL
- `https://1.1.1.1` - Invalid URL

#### 2. Různé formáty webManifestUrl
- `/manifest.json` - Invalid URL
- `http://localhost:8080/manifest.json` - Invalid URL
- `manifest.json` - Invalid URL

#### 3. Flag --skip-manifest-validation
- Přidání `--skip-manifest-validation` k příkazu nevyřešilo problém
- Bubblewrap stále validuje URL před spuštěním

#### 4. Místní HTTP server
- Spuštění místního HTTP serveru na portu 8080
- Server vrací 200 OK pro /manifest.json
- Přesto Bubblewrap hlásí "Invalid URL"

#### 5. Různé verze Bubblewrap
- Zkoušeno s 1.24.0 a 1.25.0
- Obě verze hlásí stejnou chybu

### Příčina

Po důkladném testování se zdá, že **Bubblewrap CLI na Windows má bug ve validaci URL**. 
Tento problém není způsobuje špatnou konfigurací manifestu, ale interním problémem v Bubblewrap samotném.

### Doporučená řešení

#### 🔴 Řešení 1: Použít Linux/macOS (Doporučeno)
Bubblewrap je lépe testovaný a podporovaný na Unix systémy. Build APK na Linuxu nebo macOS.

#### 🟡 Řešení 2: Použít Capacitor místo Bubblewrap
Capacitor je alternativa k Bubblewrap, která:
- Funguje spolehlivě na Windows
- Má obdobnou funkčnost pro generování APK z web aplikací
- Je aktivně vyvíjený a podporovaný

Použijte nový script: `build_capacitor_apk.py`

#### 🟡 Řešení 3: Použít Android Studio
1. Vytvořte nový TWA (Trusted Web Activity) projekt v Android Studio
2. Ručně nakonfigurujte manifest a assets
3. Build a sign APK prostřednictvím Android Studio

#### 🟡 Řešení 4: Použít Cordova
Cordova je další alternativa pro build Android aplikací z webových zdrojů.

### Soubory pro řešení 2 (Capacitor)
- `build_capacitor_apk.py` - Úplný build script pomocí Capacitor
- `create_placeholder_icons.py` - Script pro generování ikon (již existuje)

### Pokyny pro Capacitor

1. **Nainstalujte Capacitor:**
   ```bash
   npm install -g @capacitor/cli
   ```

2. **Spusťte build script:**
   ```bash
   python build_capacitor_apk.py
   ```

3. **Výsledný APK:**
   - Bude vytvořen soubor `app-release-signed.apk` v kořenovém adreáři projektu

### Důležité poznámky

- Bubblewrap vyžaduje validní web manifest dostupný na HTTP/HTTPS URL
- Místní vývoj s `file://` URL nefunguje
- Pro produkční použití je nutné mít web manifest dostupný na veřejné URL
- Pro testování můžete použít místní HTTP server (python -m http.server)

### Reference
- [Bubblewrap GitHub](https://github.com/GoogleChromeLabs/bubblewrap)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [TWA Documentation](https://developer.chrome.com/docs/android/trusted-web-activity/)
