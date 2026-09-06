#requires -Version 5.1

<#
.SYNOPSIS
    Simple PowerShell script to build Android APK for Společné Nálezy using Bubblewrap CLI
.DESCRIPTION
    This script automates the process of creating an Android APK from the PWA using Bubblewrap CLI.
    It checks dependencies, generates required files, and builds the signed APK.
.NOTES
    File Name      : build_apk_simple.ps1
    Prerequisites  : Node.js, npm, Java, Bubblewrap CLI
    Author        : Společné Nálezy Team
#>

param()

function Write-Status {
    param([string]$message, [string]$type = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    switch ($type) {
        "SUCCESS" { $color = "Green" }
        "ERROR"   { $color = "Red" }
        "WARNING" { $color = "Yellow" }
        "STEP"   { $color = "Cyan" }
        default  { $color = "White" }
    }
    Write-Host "[$timestamp] [$type] $message" -ForegroundColor $color
}

function Test-Dependency {
    param([string]$command)
    try {
        & $command --version *>&1 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Invoke-CommandSafe {
    param([string]$command, [string]$workingDirectory = $PSScriptRoot)
    Write-Status "Running: $command" "INFO"
    try {
        $result = Invoke-Expression -Command $command -ErrorAction Stop
        return $true
    } catch {
        Write-Status "Command failed: $_" "ERROR"
        return $false
    }
}

# Main execution
Write-Status "========================================" "STEP"
Write-Status "Společné Nálezy - Android APK Builder" "STEP"
Write-Status "========================================" "STEP"

$projectDir = $PSScriptRoot
Write-Status "Project directory: $projectDir" "INFO"

# Step 1: Check Node.js
Write-Status "Step 1: Checking dependencies..." "STEP"
if (-not (Test-Dependency "node")) {
    Write-Status "Node.js is not installed!" "ERROR"
    Write-Status "Please install from https://nodejs.org/" "ERROR"
    exit 1
}
Write-Status "Node.js found" "SUCCESS"

# Step 2: Check npm
if (-not (Test-Dependency "npm")) {
    Write-Status "npm is not available!" "ERROR"
    exit 1
}
Write-Status "npm found" "SUCCESS"

# Step 3: Check Java
if (-not (Test-Dependency "java")) {
    Write-Status "Java is not installed!" "ERROR"
    Write-Status "Please install from https://adoptium.net/" "ERROR"
    exit 1
}
Write-Status "Java found" "SUCCESS"

# Step 4: Check for required icon files
Write-Status "Step 2: Checking required icons..." "STEP"
$publicDir = Join-Path $projectDir "public"
$requiredIcons = @("icon-192.png", "icon-512.png", "icon-maskable-512.png")
$missingIcons = @()

foreach ($icon in $requiredIcons) {
    $iconPath = Join-Path $publicDir $icon
    if (-not (Test-Path $iconPath)) {
        $missingIcons += $icon
    }
}

if ($missingIcons.Count -gt 0) {
    Write-Status "Missing icons: $($missingIcons -join ', ')" "WARNING"
    Write-Status "Attempting to generate placeholder icons..." "INFO"
    
    $placeholderScript = Join-Path $projectDir "create_placeholder_icons.py"
    if (Test-Path $placeholderScript) {
        if (Invoke-CommandSafe "python $placeholderScript") {
            Write-Status "Placeholder icons generated successfully" "SUCCESS"
        } else {
            Write-Status "Failed to generate icons with script" "WARNING"
        }
    } else {
        Write-Status "create_placeholder_icons.py not found" "WARNING"
    }
} else {
    Write-Status "All required icons are present" "SUCCESS"
}

# Step 5: Check/create Android keystore
Write-Status "Step 3: Setting up Android keystore..." "STEP"
$keystorePath = Join-Path $projectDir "android.keystore"

if (Test-Path $keystorePath -PathType Leaf) {
    $keystoreSize = (Get-Item $keystorePath).Length
    if ($keystoreSize -gt 0) {
        Write-Status "Valid Android keystore found" "SUCCESS"
    } else {
        Write-Status "Keystore file is empty, will create new one" "WARNING"
        $needsKeystore = $true
    }
} else {
    $needsKeystore = $true
}

if ($needsKeystore) {
    Write-Status "Creating new Android keystore..." "INFO"
    
    # Try to find keytool
    $keytoolPath = "keytool"
    $javaHome = $env:JAVA_HOME
    if ($javaHome -and (Test-Path (Join-Path $javaHome "bin"))) {
        $possibleKeytool = Join-Path $javaHome "bin" "keytool.exe"
        if (Test-Path $possibleKeytool) {
            $keytoolPath = $possibleKeytool
        }
    }
    
    $keystoreCmd = @(
        "`"$keytoolPath`"",
        "-genkey",
        "-v",
        "-keystore=$keystorePath",
        "-alias=android",
        "-keyalg=RSA",
        "-keysize=2048",
        "-validity=10000",
        '"-dname=CN=Spolecne Nalezy, OU=Development, O=Spolecne Nalezy, L=Prague, ST=Prague, C=CZ"',
        "-storepass=spolecnenalezy123",
        "-keypass=spolecnenalezy123",
        "-noprompt"
    ) -join " "
    
    try {
        Invoke-Expression -Command $keystoreCmd -ErrorAction Stop | Out-Null
        Write-Status "Keystore created successfully" "SUCCESS"
        
        # Update twa-manifest.json
        if (Test-Path (Join-Path $projectDir "twa-manifest.json")) {
            $manifest = Get-Content (Join-Path $projectDir "twa-manifest.json") -Raw | ConvertFrom-Json
            $manifest.signingKey = @{
                path = "./android.keystore"
                alias = "android"
                password = "spolecnenalezy123"
                keyPassword = "spolecnenalezy123"
            }
            $manifest | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $projectDir "twa-manifest.json")
            Write-Status "Updated twa-manifest.json with keystore details" "SUCCESS"
        }
    } catch {
        Write-Status "Failed to create keystore: $_" "WARNING"
    }
}

# Step 6: Install Bubblewrap CLI
Write-Status "Step 4: Installing Bubblewrap CLI..." "STEP"
if (-not (Test-Dependency "bubblewrap")) {
    Write-Status "Installing @bubblewrap/cli globally..." "INFO"
    if (-not (Invoke-CommandSafe "npm install -g @bubblewrap/cli")) {
        Write-Status "Failed to install @bubblewrap/cli" "ERROR"
        exit 1
    }
} else {
    Write-Status "Bubblewrap CLI is already installed" "SUCCESS"
}

# Step 7: Initialize Bubblewrap project
Write-Status "Step 5: Initializing Bubblewrap project..." "STEP"
$localManifest = Join-Path $projectDir "twa-manifest.json"
if (Test-Path $localManifest) {
    Write-Status "Using local manifest: $localManifest" "INFO"
    if (-not (Invoke-CommandSafe "bubblewrap init --manifest=./twa-manifest.json")) {
        Write-Status "Failed to initialize Bubblewrap project" "ERROR"
        exit 1
    }
} else {
    Write-Status "Local twa-manifest.json not found!" "ERROR"
    exit 1
}

# Step 8: Build APK
Write-Status "Step 6: Building signed APK..." "STEP"
if (-not (Invoke-CommandSafe "bubblewrap build")) {
    Write-Status "Failed to build APK" "ERROR"
    exit 1
}

# Step 9: Verify APK
Write-Status "Step 7: Verifying APK..." "STEP"
$apkPath = Join-Path $projectDir "app-release-signed.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length
    $apkSizeMB = [math]::Round($apkSize / 1MB, 2)
    
    Write-Status "APK successfully created!" "SUCCESS"
    Write-Status "Location: $apkPath" "SUCCESS"
    Write-Status "Size: $apkSize bytes ($apkSizeMB MB)" "SUCCESS"
    
    # Check for ADB
    if (Test-Dependency "adb") {
        Write-Status "ADB detected - Checking for devices..." "INFO"
        $adbOutput = & adb devices 2>&1
        if ($adbOutput -match "device" -and $adbOutput -notmatch "unauthorized") {
            $choice = Read-Host "Install APK on connected device? (y/n)"
            if ($choice -eq "y") {
                if (Invoke-CommandSafe "adb install app-release-signed.apk") {
                    Write-Status "APK installed successfully!" "SUCCESS"
                } else {
                    Write-Status "Installation failed" "ERROR"
                }
            }
        } else {
            Write-Status "No authorized Android devices connected" "INFO"
        }
    }
    
    Write-Status "========================================" "STEP"
    Write-Status "DONE! APK is ready for use." "STEP"
    Write-Status "========================================" "STEP"
    Write-Status "APK File: $apkPath" "SUCCESS"
    Write-Status "To install manually:" "INFO"
    Write-Status "  1. Transfer the APK to your Android device" "INFO"
    Write-Status "  2. Enable 'Unknown sources' in Android settings" "INFO"
    Write-Status "  3. Open the APK file to install" "INFO"
    Write-Status "Or use ADB: adb install app-release-signed.apk" "INFO"
    
    exit 0
} else {
    Write-Status "APK file was not created" "ERROR"
    Write-Status "Expected at: $apkPath" "ERROR"
    exit 1
}