@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: Instalační skript pro Společné Nálezy
:: Vytvoří APK z PWA pomocí Bubblewrap CLI
:: ============================================================================

echo ============================================================================
echo   Instalace aplikace Společné Nálezy
 echo   (Android APK z PWA prostřednictvím Bubblewrap)
echo ============================================================================
echo.

:: Zkontrolovat, zda je NPM nainstalován
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [CHYBA] NPM (Node.js) není nainstalován!
    echo Nainstalujte Node.js z https://nodejs.org/
    pause
    exit /b 1
)

:: Zkontrolovat, zda je Java nainstalováno (vyžadováno pro Bubblewrap)
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo [CHYBA] Java není nainstalováno!
    echo Nainstalujte Java JDK z https://adoptium.net/
    pause
    exit /b 1
)

echo [1/4] Kontroluji a instaluji Bubblewrap CLI...
call npm install -g @bubblewrap/cli 2>nul

if %errorlevel% neq 0 (
    echo [CHYBA] Nepodařilo se nainstalovat @bubblewrap/cli
    pause
    exit /b 1
)

echo [2/4] Inicializuji Android projekt z twa-manifest.json...
call bubblewrap init --manifest="https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app/manifest.json"

if %errorlevel% neq 0 (
    echo [CHYBA] Nepodařilo se inicializovat Bubblewrap projekt
    pause
    exit /b 1
)

echo [3/4] Sestavuji podepsaný APK balíček...
call bubblewrap build

if %errorlevel% neq 0 (
    echo [CHYBA] Nepodařilo se sestavit APK
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo   HOTOVO! APK byl úspěšně sestaven.
echo ============================================================================
echo.
echo   Umístění: .\app-release-signed.apk
echo.
echo   Pro instalaci na připojené Android zařízení spusťte:
echo     adb install app-release-signed.apk
echo.
echo   Nebo přeneste soubor do mobilu a nainstalujte ručně (sideloading).
echo.

:: Zkontrolovat, zda je ADB dostupné
where adb >nul 2>&1
if %errorlevel% equ 0 (
    set /p choice=Chcete nainstalovat APK přímo na připojené zařízení? (a/n):
    if /i "!choice!"=="a" (
        echo.
        echo [4/4] Instaluji APK na zařízení...
        call adb install app-release-signed.apk
        if %errorlevel% equ 0 (
            echo APK byl úspěšně nainstalován!
        ) else (
            echo [CHYBA] Instalace selhala. Zkontrolujte připojení zařízení a USB debugging.
        )
    )
)

echo.
echo Stiskněte libovolnou klávesu pro ukončení...
pause >nul
