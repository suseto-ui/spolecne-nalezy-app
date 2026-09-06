<#PSScriptInfo
.VERSION 1.0.0
.GUID 1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p
.AUTHOR Společné Nálezy
.DESCRIPTION Instalační skript pro sestavení a instalaci Android APK z PWA
#>

<#
================================================================================
Instalační skript pro Společné Nálezy
Vytvoří Android APK z PWA pomocí Bubblewrap CLI
================================================================================
#>

param(
    [switch]$SkipChecks,
    [switch]$BuildOnly,
    [switch]$InstallOnly,
    [switch]$Help
)

if ($Help) {
    Write-Host "`nPoužití: .\install.ps1 [volby]`n"
    Write-Host "Volby:"
    Write-Host "  -SkipChecks    : Vynechat kontrolu závislostí"
    Write-Host "  -BuildOnly     : Pouze sestavit APK (bez instalace)"
    Write-Host "  -InstallOnly   : Pouze nainstalovat existující APK"
    Write-Host "  -Help          : Zobrazit tuto nápovědu"
    Write-Host "`nPříklady:"
    Write-Host "  .\install.ps1                  # Sestavit a nainstalovat"
    Write-Host "  .\install.ps1 -BuildOnly       # Pouze sestavit APK"
    Write-Host "  .\install.ps1 -InstallOnly     # Pouze nainstalovat APK na zařízení"
    exit 0
}

# ============================================================================
# Funkce pro barevný výstup
# ============================================================================
function Write-Success {
    Write-Host "[`e[92m✓`e[0m] $args" -ForegroundColor Green
}

function Write-ErrorMsg {
    Write-Host "[`e[91m✗`e[0m] $args" -ForegroundColor Red
}

function Write-Info {
    Write-Host "[i] $args" -ForegroundColor Cyan
}

function Write-Step {
    Write-Host "`n$args" -ForegroundColor Yellow
}

# ============================================================================
# Funkce pro kontrolu závislostí
# ============================================================================
function Test-Dependency {
    param([string]$Name, [string]$Command, [string]$InstallUrl)
    
    if ($SkipChecks) { return $true }
    
    try {
        $result = cmd /c "where $Command 2>nul"
        if ($LASTEXITCODE -eq 0) { return $true }
        
        Write-ErrorMsg "$Name není nainstalováno!"
        Write-Info "Instalace: $InstallUrl"
        return $false
    } catch {
        Write-ErrorMsg "Chyba při kontrole $Name"
        return $false
    }
}

# ============================================================================
# Funkce pro sestavení APK
# ============================================================================
function Build-APK {
    Write-Step "[1/4] Kontroluji a instaluji Bubblewrap CLI..."
    
    # Zkontrolovat a nainstalovat Bubblewrap
    if (-not (Test-Dependency -Name "Bubblewrap CLI" -Command "bubblewrap" -InstallUrl "npm install -g @bubblewrap/cli")) {
        Write-Info "Instaluje @bubblewrap/cli..."
        npm install -g @bubblewrap/cli
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "Nepodařilo se nainstalovat @bubblewrap/cli"
            exit 1
        }
    }
    
    Write-Step "[2/4] Inicializuji Android projekt..."
    $manifestUrl = "https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app/manifest.json"
    
    # Zkontrolovat, zda twa-manifest.json existuje
    if (Test-Path .\twa-manifest.json) {
        Write-Info "Používám místní twa-manifest.json"
        bubblewrap init --manifest=".\twa-manifest.json"
    } else {
        Write-Info "Stahuji manifest z $manifestUrl"
        bubblewrap init --manifest=$manifestUrl
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Nepodařilo se inicializovat Bubblewrap projekt"
        exit 1
    }
    
    Write-Step "[3/4] Sestavuji podepsaný APK balíček..."
    bubblewrap build
    
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Nepodařilo se sestavit APK"
        exit 1
    }
    
    if (Test-Path .\app-release-signed.apk) {
        Write-Success "APK úspěšně sestaven: .\app-release-signed.apk"
        return $true
    } else {
        Write-ErrorMsg "APK soubor nebyl vytvořen"
        return $false
    }
}

# ============================================================================
# Funkce pro instalaci APK na zařízení
# ============================================================================
function Install-APK {
    if (-not (Test-Path .\app-release-signed.apk)) {
        Write-ErrorMsg "APK soubor (.\app-release-signed.apk) nebyl nalezen!"
        Write-Info "Nejdříve spusťte sestavení pomocí .\install.ps1 -BuildOnly"
        return $false
    }
    
    # Zkontrolovat ADB
    if (-not (Test-Dependency -Name "ADB" -Command "adb" -InstallUrl "https://developer.android.com/studio/releases/platform-tools")) {
        Write-ErrorMsg "ADB není nainstalováno!"
        Write-Info "Instalace: Android Platform Tools (část Android Studio)"
        return $false
    }
    
    # Zkontrolovat připojené zařízení
    $devices = adb devices | Select-String "device$" | ForEach-Object { $_ -split '\s+' | Select-Object -First 1 | Where-Object { $_ -ne "List" -and $_ -ne "of" -and $_ -ne "devices" -and $_ -ne "attached" } }
    
    if ($devices.Count -eq 0) {
        Write-ErrorMsg "Žádné Android zařízení není připojeno!"
        Write-Info "Připojte zařízení s povoleným USB debugging"
        return $false
    }
    
    Write-Step "[4/4] Instaluji APK na zařízení..."
    Write-Info "Připojeno: $($devices[0])"
    
    adb install .\app-release-signed.apk
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "APK úspěšně nainstalován na zařízení!"
        return $true
    } else {
        Write-ErrorMsg "Instalace selhala. Zkontrolujte USB debugging a oprávnění."
        return $false
    }
}

# ============================================================================
# Hlavní část skriptu
# ============================================================================

Write-Host "`n================================================================================" -ForegroundColor DarkGray
Write-Host "  Instalace aplikace Společné Nálezy" -ForegroundColor White
Write-Host "  Android APK z PWA prostřednictvím Bubblewrap" -ForegroundColor DarkGray
Write-Host "================================================================================`n" -ForegroundColor DarkGray

# Kontrola závislostí
if (-not $SkipChecks) {
    Write-Step "Kontroluji závislosti..."
    
    $missing = @()
    
    if (-not (Test-Dependency -Name "Node.js (npm)" -Command "npm" -InstallUrl "https://nodejs.org/")) {
        $missing += "Node.js"
    }
    
    if (-not (Test-Dependency -Name "Java" -Command "java" -InstallUrl "https://adoptium.net/")) {
        $missing += "Java"
    }
    
    if ($missing.Count -gt 0) {
        Write-ErrorMsg "Chybí závislosti: $($missing -join ', ')"
        exit 1
    }
    
    Write-Success "Všechny závislosti jsou nainstalovány"
}

# Sestavení
if (-not $InstallOnly) {
    $buildSuccess = Build-APK
    if (-not $buildSuccess) { exit 1 }
}

# Instalace
if (-not $BuildOnly) {
    $installSuccess = Install-APK
    if (-not $installSuccess) { 
        if (-not $InstallOnly) { 
            Write-Host "`nAPK byl sestaven, ale nebylo možné ho nainstalovat." -ForegroundColor Yellow
            Write-Host "Soubor: .\app-release-signed.apk" -ForegroundColor Yellow
        }
        exit 1
    }
}

# Dokončení
Write-Host "`n================================================================================" -ForegroundColor DarkGray
Write-Host "  HOTOVO!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor DarkGray
Write-Host "`nMožnosti:" -ForegroundColor Cyan
Write-Host "  - APK soubor: .\app-release-signed.apk"
Write-Host "  - Ruční instalace: adb install app-release-signed.apk"
Write-Host "  - Sideloading: Přeneste soubor do mobilu a nainstalujte ručně"
Write-Host "  - PWA: Otevřete https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app v prohlížeči a přidejte na plochu"
Write-Host "`n" -ForegroundColor Cyan
