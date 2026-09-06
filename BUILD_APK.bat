@echo off
chcp 65001 >nul

:: ============================================================================
:: Společné Nález - BUILD APK
:: Jednoduchý skript pro sestavení Android APK z PWA
:: ============================================================================

title Spolecne Nalezy - Build APK

:: Pridat npm global do PATH pro pristup k bubblewrap
set "NPM_GLOBAL=C:\Users\%USERNAME%\AppData\Roaming\npm"
if exist "%NPM_GLOBAL%" (
    set "PATH=%NPM_GLOBAL%;%PATH%"
)

:: Zkontrolovat zda bezi jako spravce
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Spustte tento skript jako spravce pro plny pristup
    pause
)

echo ============================================================================
echo   Spolecne Nalezy - Build Android APK
 echo   (Pouzi Bubblewrap CLI pro TWA)
echo ============================================================================
echo.

:: Krok 1: Kontrola Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [CHYBA] Node.js neni nainstalovan!
    echo Nainstalujte z: https://nodejs.org/
    echo.
    goto :end
)
echo [OK] Node.js nalezno

:: Krok 2: Kontrola npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [CHYBA] npm neni dostupny!
    echo.
    goto :end
)
echo [OK] npm nalezno

:: Krok 3: Kontrola Java
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo [CHYBA] Java neni nainstalovano!
    echo Nainstalujte z: https://adoptium.net/
    echo.
    goto :end
)
echo [OK] Java nalezno

:: Krok 4: Kontrola a instalace Bubblewrap
where bubblewrap >nul 2>&1
if %errorlevel% neq 0 (
    echo [i] Instaluji @bubblewrap/cli...
    call npm install -g @bubblewrap/cli 2>nul
    :: Vyzkousime zda se nainstalovalo (npm muze vratit chybu kvuli warnings)
    where bubblewrap >nul 2>&1
    if %errorlevel% neq 0 (
        :: Pridame npm global bin do PATH
        set "NPM_GLOBAL=C:\Users\%USERNAME%\AppData\Roaming\npm"
        if exist "%NPM_GLOBAL%\bubblewrap.cmd" (
            set "PATH=%PATH%;%NPM_GLOBAL%"
            where bubblewrap >nul 2>&1
            if %errorlevel% neq 0 (
                echo [CHYBA] Nepodarilo se nainstalovat @bubblewrap/cli
                goto :end
            )
        ) else (
            echo [CHYBA] Nepodarilo se nainstalovat @bubblewrap/cli
            goto :end
        )
    )
) else (
    echo [OK] Bubblewrap CLI je jiz nainstalovano
)

:: Krok 5: Inicializace projektu
echo.
echo ============================================================================
echo   Krok 2: Inicializace Bubblewrap projektu...
echo ============================================================================
echo.

:: Zkontroluj zda existuje twa-manifest.json v aktualnim adresari
if exist twa-manifest.json (
    echo [i] Pouzivam mistni twa-manifest.json
    call bubblewrap init --manifest=twa-manifest.json
) else (
    echo [i] Pouzivam vzdaleny manifest
    call bubblewrap init --manifest=https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app/manifest.json
)

if %errorlevel% neq 0 (
    echo [CHYBA] Nepodarilo se inicializovat Bubblewrap projekt
    goto :end
)
echo [OK] Projekt uspesne inicializovan

:: Krok 6: Sestaveni APK
echo.
echo ============================================================================
echo   Krok 3: Sestaveni podepsaneho APK...
echo ============================================================================
echo.

call bubblewrap build
if %errorlevel% neq 0 (
    echo [CHYBA] Nepodarilo se sestavit APK
    goto :end
)

:: Krok 7: Overeni APK
echo.
echo ============================================================================
echo   Krok 4: Overovani APK...
echo ============================================================================
echo.

if exist app-release-signed.apk (
    for %%F in (app-release-signed.apk) do set APK_SIZE=%%~zF
    echo [OK] APK uspesne vytvoren!
    echo     Umisteni: %~dp0app-release-signed.apk
    echo     Velikost: %APK_SIZE% bajtu (%APK_SIZE% / 1048576 MB)
) else (
    echo [CHYBA] APK soubor nebyl vytvoren
    goto :end
)

:: Krok 8: Instalace na zarizeni (volitelne)
echo.
echo ============================================================================
echo   Krok 5: Instalace na zarizeni (volitelne)
echo ============================================================================
echo.

where adb >nul 2>&1
if %errorlevel% equ 0 (
    echo [i] ADB je dostupny
    call adb devices | find "device" >nul 2>&1
    if %errorlevel% equ 0 (
        set /p choice=Chcete nainstalovat APK na pripojene zarizeni? (a/n): 
        if /i "%choice%"=="a" (
            echo.
            echo [i] Instaluje app-release-signed.apk...
            call adb install app-release-signed.apk
            if %errorlevel% equ 0 (
                echo [OK] APK uspesne nainstalovan!
            ) else (
                echo [CHYBA] Instalace selhala
            )
        )
    ) else (
        echo [i] Zadne Android zarizeni neni pripojeno
    )
) else (
    echo [i] ADB neni nainstalovano - preskakuji instalaci
)

:: Dokonceno
echo.
echo ============================================================================
echo   HOTOVO! APK je pripraven k pouziti.
echo ============================================================================
echo.
echo Soubor: %~dp0app-release-signed.apk
echo.
echo Moznosti instalace:
echo  1. Pres ADB: adb install app-release-signed.apk
echo  2. Rucne: Prevedte soubor do mobilu a nainstalujte
endlocal

:end
echo.
echo Stisknete libovolnou klavesu pro ukonceni...
pause >nul
