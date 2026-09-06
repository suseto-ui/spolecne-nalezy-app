#!/usr/bin/env bash
set -e

echo "=== Sestavení instalační aplikace (APK) pro Společné Nálezy ==="
echo "Host API: https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app"

# 1. Kontrola Bubblewrap CLI
if ! command -v bubblewrap &> /dev/null; then
    echo "Instaluji @bubblewrap/cli pro sestavení Android APK..."
    npm install -g @bubblewrap/cli
fi

# 2. Generování projektu z twa-manifest.json
echo "Inicializuji Android projekt z twa-manifest.json..."
bubblewrap init --manifest="https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app/manifest.json"

# 3. Sestavení APK
echo "Sestavuji podepsaný testovací APK balíček..."
bubblewrap build

echo "=== Sestavení dokončeno! Soubor app-release-signed.apk je připraven pro instalaci (adb install) na Android zařízení. ==="
