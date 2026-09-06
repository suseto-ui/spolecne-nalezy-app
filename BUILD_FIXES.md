# Android APK Build Fixes and Improvements

## Problem Analysis

The original build process was failing with the following errors:

1. **Remote manifest error**: The URL `https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app/manifest.json` was returning HTML instead of JSON, causing Bubblewrap to fail with: `Unexpected token '<', "<!doctype "... is not valid JSON`

2. **Missing icon files**: The `twa-manifest.json` referenced icon files (`/icon-512.png`, `/icon-maskable-512.png`) that didn't exist in the `public/` directory.

3. **Empty keystore**: The `android.keystore` file existed but was empty, which would cause signing failures.

4. **Incomplete manifest**: The `twa-manifest.json` was missing password fields in the signingKey section.

## Solutions Implemented

### 1. Enhanced build_apk.py Script

**File**: `build_apk.py`

- **Added icon generation**: Automatically checks for required icons and generates placeholders using `create_placeholder_icons.py`
- **Added keystore creation**: Creates a new Android keystore if missing or empty using `keytool`
- **Improved manifest handling**: Automatically updates `twa-manifest.json` with correct keystore details
- **Better Windows support**: Enhanced path handling and environment detection for Windows
- **Fixed step numbering**: Corrected inconsistent step numbers in the output
- **Better error handling**: More descriptive error messages and graceful fallbacks

### 2. Keystore Management

**File**: `twa-manifest.json`
- Added missing `password` and `keyPassword` fields to the `signingKey` section

**New File**: `create_keystore.py`
- Standalone script to create Android keystore using keytool
- Handles Java PATH issues on Windows
- Automatically updates the manifest with keystore details

### 3. Alternative Build Script

**New File**: `build_apk_simple.ps1`
- PowerShell version of the build script for better Windows integration
- Same functionality as the Python script but with native Windows support
- Color-coded output for better visibility

### 4. Improved Icon Generation

**Updated**: `create_placeholder_icons.py`
- Added better error messages when Pillow library is missing
- Clear instructions for manual icon creation as fallback

## Required Files for APK Build

### Essential Files
- [x] `twa-manifest.json` - TWA configuration
- [x] `android.keystore` - Signing keystore (auto-generated if missing)
- [ ] `public/icon-192.png` - 192x192 app icon
- [ ] `public/icon-512.png` - 512x512 app icon  
- [ ] `public/icon-maskable-512.png` - 512x512 circular icon
- [x] `public/manifest.json` - Web app manifest

### Build Scripts
- [x] `build_apk.py` - Main Python build script
- [x] `build_apk_simple.ps1` - PowerShell alternative
- [x] `create_placeholder_icons.py` - Icon generator
- [x] `create_keystore.py` - Keystore generator

## Usage Instructions

### Option 1: Automatic Build (Python)
```bash
python build_apk.py
```

### Option 2: Automatic Build (PowerShell)
```powershell
./build_apk_simple.ps1
```

### Option 3: Manual Step-by-Step

1. **Generate Icons** (if missing):
   ```bash
   python create_placeholder_icons.py
   ```

2. **Create Keystore** (if missing):
   ```bash
   python create_keystore.py
   ```

3. **Install Bubblewrap CLI**:
   ```bash
   npm install -g @bubblewrap/cli
   ```

4. **Initialize Bubblewrap Project**:
   ```bash
   bubblewrap init --manifest=twa-manifest.json
   ```

5. **Build APK**:
   ```bash
   bubblewrap build
   ```

6. **Install on Device**:
   ```bash
   adb install app-release-signed.apk
   ```

## Troubleshooting

### Common Issues and Solutions

1. **Bubblewrap not found after npm install**
   - Add npm global bin to PATH: `export PATH=$PATH:$(npm bin -g)`
   - On Windows: Add `%APPDATA%\npm` to system PATH

2. **Java keytool not found**
   - Ensure JAVA_HOME is set correctly
   - Add Java bin directory to PATH

3. **Pillow import error in icon generator**
   - Install Pillow: `pip install Pillow`
   - Or manually create the icon files

4. **Manifest JSON error**
   - Ensure the remote URL is accessible and returns valid JSON
   - Use local `twa-manifest.json` instead of remote URL

5. **Keystore signing failed**
   - Delete empty `android.keystore` and let the script create a new one
   - Ensure keystore passwords match those in `twa-manifest.json`

## Dependencies

### Required
- **Node.js** (v16+ recommended)
- **npm** (comes with Node.js)
- **Java** (JDK 8+)
- **Bubblewrap CLI** (`npm install -g @bubblewrap/cli`)

### Optional
- **Pillow** (for automatic icon generation: `pip install Pillow`)
- **ADB** (for direct device installation)

## Configuration

The build process uses the following configuration:

- **Package ID**: `cz.spolecnenalezy.app`
- **App Name**: "Společné Nálezy"
- **Keystore Alias**: `android`
- **Keystore Password**: `spolecnenalezy123`
- **Host**: `ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app`

## Security Note

The default keystore password (`spolecnenalezy123`) is suitable for development only. For production builds:

1. Create a new keystore with a strong password
2. Update the `twa-manifest.json` with your production credentials
3. Keep the keystore file secure and don't commit it to version control

## Files Modified

- `build_apk.py` - Enhanced with icon and keystore management
- `twa-manifest.json` - Added missing password fields
- `create_placeholder_icons.py` - Improved error messages

## Files Added

- `build_apk_simple.ps1` - PowerShell build script
- `create_keystore.py` - Keystore creation script
- `BUILD_FIXES.md` - This documentation

## Next Steps

1. **Test the build process**: Run `python build_apk.py` and verify it completes successfully
2. **Generate proper icons**: Replace placeholder icons with your actual app icons
3. **Update keystore**: For production, create a new keystore with secure passwords
4. **Configure app**: Update `twa-manifest.json` with your final app configuration