#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Spolecne Nalezy - Build APK Script using Capacitor
Vytvori Android APK z webove aplikace pomoci Capacitor
"""

import subprocess
import sys
import os
import time
import json
import shutil

# Ensure UTF-8 encoding for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def run_command(cmd, cwd=None, description=""):
    """Run a command and return success status."""
    print(f"\n[>] {description}")
    print(f"    Command: {' '.join(cmd)}")
    
    # Resolve command paths for Windows
    if sys.platform == "win32" and cmd:
        resolved_cmd = []
        for i, part in enumerate(cmd):
            if i == 0:  # Only resolve the first part (the command itself)
                resolved_cmd.append(find_command_path(part))
            else:
                resolved_cmd.append(part)
        cmd = resolved_cmd
    
    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"[X] FAILED with code {result.returncode}")
        if result.stderr:
            print(f"    Error: {result.stderr[:1000]}")
        return False
    else:
        print(f"[OK] SUCCESS")
        if result.stdout:
            print(f"    Output: {result.stdout[:500]}")
        return True


def find_command_path(command):
    """Find the full path to a command on Windows."""
    if sys.platform != "win32":
        return command
    
    # Common paths for commands on Windows
    common_paths = {
        'node': 'C:/Program Files/nodejs/node.exe',
        'npm': 'C:/Program Files/nodejs/npm.cmd',
        'npx': 'C:/Program Files/nodejs/npx.cmd',
        'java': 'C:/Program Files/Eclipse Adoptium/jdk-21.0.3.9-hotspot/bin/java.exe',
        'cap': 'C:/Users/Administrator/AppData/Roaming/npm/cap.cmd',
    }
    
    if command in common_paths:
        path = common_paths[command]
        if path and os.path.exists(path):
            return path
    
    # Try npm global bin directory
    npm_global_bin = 'C:/Users/Administrator/AppData/Roaming/npm'
    if os.path.exists(npm_global_bin):
        cmd_file = os.path.join(npm_global_bin, command + '.cmd')
        if os.path.exists(cmd_file):
            return cmd_file
        cmd_file = os.path.join(npm_global_bin, command + '.ps1')
        if os.path.exists(cmd_file):
            return cmd_file
        cmd_file = os.path.join(npm_global_bin, command)
        if os.path.exists(cmd_file):
            return cmd_file
    
    # Try to find in PATH
    try:
        import subprocess
        result = subprocess.run(
            ['where', command],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            first_path = result.stdout.strip().split('\n')[0].strip()
            if os.path.exists(first_path):
                return first_path
    except:
        pass
    
    return command


def check_dependency(name, command):
    """Check if a dependency is installed."""
    try:
        cmd_path = find_command_path(command)
        result = subprocess.run(
            [cmd_path, '--version'],
            capture_output=True,
            text=True,
            timeout=10,
            shell=False
        )
        return result.returncode == 0
    except:
        return False


def setup_capacitor_project(project_dir):
    """Initialize a new Capacitor project."""
    print("\n" + "=" * 70)
    print("Step: Setting up Capacitor project...")
    print("=" * 70)
    
    # Remove existing Capacitor config if it exists
    cap_config_path = os.path.join(project_dir, 'capacitor.config.ts')
    if os.path.exists(cap_config_path):
        print(f"[i] Removing existing Capacitor config: {cap_config_path}")
        try:
            os.remove(cap_config_path)
            print(f"[OK] Removed Capacitor config")
        except Exception as e:
            print(f"[X] Failed to remove Capacitor config: {str(e)}")
            return False
    
    # Initialize npm package
    if not run_command(
        ['npm', 'init', '-y'],
        cwd=project_dir,
        description="npm init -y"
    ):
        return False
    
    # Install Capacitor dependencies
    if not run_command(
        ['npm', 'install', '@capacitor/core', '@capacitor/cli', '@capacitor/android'],
        cwd=project_dir,
        description="npm install Capacitor packages"
    ):
        return False
    
    # Initialize Capacitor
    if not run_command(
        ['npx', 'cap', 'init', 'SpolecneNalezy', 'cz.spolecnenalezy.app'],
        cwd=project_dir,
        description="capacitor init"
    ):
        return False
    
    # Remove existing android directory if it exists (from previous Bubblewrap attempts)
    android_dir = os.path.join(project_dir, 'android')
    if os.path.exists(android_dir):
        print(f"[i] Removing existing android directory: {android_dir}")
        try:
            shutil.rmtree(android_dir)
            print(f"[OK] Removed android directory")
        except Exception as e:
            print(f"[X] Failed to remove android directory: {str(e)}")
            return False
    
    # Add Android platform
    if not run_command(
        ['npx', 'cap', 'add', 'android'],
        cwd=project_dir,
        description="capacitor add android"
    ):
        return False
    
    return True


def configure_capacitor(project_dir):
    """Configure Capacitor project settings."""
    print("\n" + "=" * 70)
    print("Step: Configuring Capacitor...")
    print("=" * 70)
    
    # Configure app settings
    cap_config_path = os.path.join(project_dir, 'capacitor.config.ts')
    if os.path.exists(cap_config_path):
        try:
            with open(cap_config_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Update configuration
            updated_content = content.replace(
                'appId: "cz.spolecnenalezy.app"',
                'appId: "cz.spolecnenalezy.app"'
            )
            updated_content = updated_content.replace(
                'appName: "SpolecneNalezy"',
                'appName: "Společné Nálezy"'
            )
            updated_content = updated_content.replace(
                'webDir: "dist"',
                'webDir: "public"'
            )
            updated_content = updated_content.replace(
                'server: {}"',
                'server: {hostname: "localhost", androidScheme: "https"}'
            )
            
            with open(cap_config_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            
            print(f"[OK] Updated {cap_config_path}")
        except Exception as e:
            print(f"[X] Error updating capacitor config: {str(e)}")
            return False
    
    return True


def copy_web_assets(project_dir):
    """Copy web assets to the correct location."""
    print("\n" + "=" * 70)
    print("Step: Copying web assets...")
    print("=" * 70)
    
    public_dir = os.path.join(project_dir, 'public')
    www_dir = os.path.join(project_dir, 'www')
    
    if not os.path.exists(public_dir):
        print(f"[X] Public directory not found: {public_dir}")
        return False
    
    # Create www directory if it doesn't exist
    os.makedirs(www_dir, exist_ok=True)
    
    # Ensure index.html exists in public
    public_index = os.path.join(public_dir, 'index.html')
    if not os.path.exists(public_index):
        print(f"[i] Creating index.html in public/")
        try:
            with open(public_index, 'w', encoding='utf-8') as f:
                f.write('''<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0B0E14">
    <title>Společné Nálezy</title>
    <link rel="manifest" href="/manifest.json">
</head>
<body>
    <h1>Společné Nálezy</h1>
    <p>Načítání...</p>
</body>
</html>''')
            print(f"[OK] Created index.html")
        except Exception as e:
            print(f"[X] Failed to create index.html: {str(e)}")
            return False
    
    # Copy all files from public to www
    try:
        for item in os.listdir(public_dir):
            src = os.path.join(public_dir, item)
            dst = os.path.join(www_dir, item)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)
        print(f"[OK] Copied assets from public/ to www/")
        return True
    except Exception as e:
        print(f"[X] Error copying assets: {str(e)}")
        return False


def build_capacitor_android(project_dir):
    """Build Android APK using Capacitor."""
    print("\n" + "=" * 70)
    print("Step: Building Android APK with Capacitor...")
    print("=" * 70)
    
    # Sync web assets
    if not run_command(
        ['npx', 'cap', 'sync'],
        cwd=project_dir,
        description="capacitor sync"
    ):
        return False
    
    # Copy icons to android resources
    android_res_dir = os.path.join(project_dir, 'android', 'app', 'src', 'main', 'res')
    public_dir = os.path.join(project_dir, 'public')
    
    icon_sizes = [
        ('icon-192.png', 'mipmap-mdpi', 'ic_launcher.png'),
        ('icon-512.png', 'mipmap-xhdpi', 'ic_launcher.png'),
        ('icon-512.png', 'mipmap-xxhdpi', 'ic_launcher.png'),
        ('icon-512.png', 'mipmap-xxxhdpi', 'ic_launcher.png'),
    ]
    
    for src_icon, res_dir, dst_icon in icon_sizes:
        src_path = os.path.join(public_dir, src_icon)
        if os.path.exists(src_path):
            dst_dir = os.path.join(android_res_dir, res_dir)
            os.makedirs(dst_dir, exist_ok=True)
            dst_path = os.path.join(dst_dir, dst_icon)
            shutil.copy2(src_path, dst_path)
            print(f"[OK] Copied {src_icon} to {dst_path}")
    
    # Build APK using Gradle
    android_dir = os.path.join(project_dir, 'android')
    gradle_path = os.path.join(android_dir, 'gradlew.bat') if sys.platform == "win32" else os.path.join(android_dir, './gradlew')
    
    if os.path.exists(gradle_path):
        if not run_command(
            [gradle_path, 'assembleRelease'],
            cwd=android_dir,
            description="gradle assembleRelease"
        ):
            return False
    else:
        print("[X] gradlew not found!")
        return False
    
    # Find the APK file (Capacitor generates unsigned APK)
    apk_path = os.path.join(android_dir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk')
    if os.path.exists(apk_path):
        print(f"[OK] APK created at: {apk_path}")
        return True
    else:
        # Try to find any APK file
        for root, dirs, files in os.walk(android_dir):
            for f in files:
                if f.endswith('.apk'):
                    apk_path = os.path.join(root, f)
                    print(f"[OK] APK found at: {apk_path}")
                    return True
        print(f"[X] APK not found in {android_dir}")
        return False


def sign_apk(project_dir):
    """Sign the APK with the keystore."""
    print("\n" + "=" * 70)
    print("Step: Signing APK...")
    print("=" * 70)
    
    android_dir = os.path.join(project_dir, 'android')
    # Find the unsigned APK
    unsigned_apk = os.path.join(android_dir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk')
    if not os.path.exists(unsigned_apk):
        # Try to find any unsigned APK
        for root, dirs, files in os.walk(android_dir):
            for f in files:
                if f.endswith('-unsigned.apk'):
                    unsigned_apk = os.path.join(root, f)
                    break
    
    signed_apk = os.path.join(project_dir, 'app-release-signed.apk')
    keystore_path = os.path.join(project_dir, 'android.keystore')
    
    if not os.path.exists(unsigned_apk):
        print(f"[X] Unsigned APK not found: {unsigned_apk}")
        return False
    
    if not os.path.exists(keystore_path):
        print(f"[X] Keystore not found: {keystore_path}")
        return False
    
    # Find jarsigner
    java_home = os.environ.get('JAVA_HOME')
    if java_home:
        jarsigner_path = os.path.join(java_home, 'bin', 'jarsigner.exe' if sys.platform == "win32" else 'jarsigner')
    else:
        jarsigner_path = 'jarsigner'
    
    if not os.path.exists(jarsigner_path):
        print(f"[X] jarsigner not found at: {jarsigner_path}")
        return False
    
    # Sign the APK
    sign_cmd = [
        jarsigner_path,
        '-verbose',
        '-sigalg', 'SHA256withRSA',
        '-digestalg', 'SHA-256',
        '-keystore', keystore_path,
        '-storepass', 'spolecnenalezy123',
        '-keypass', 'spolecnenalezy123',
        '-signedjar', signed_apk,
        unsigned_apk,
        'android'
    ]
    
    if not run_command(
        sign_cmd,
        description="jarsigner sign APK"
    ):
        return False
    
    print(f"[OK] APK signed: {signed_apk}")
    return True


def main():
    print("=" * 70)
    print("Spolecne Nalezy - Build APK using Capacitor")
    print("=" * 70)
    
    project_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"\nProject directory: {project_dir}")
    
    # Step 1: Check Node.js
    print("\n" + "=" * 70)
    print("Step 1: Checking dependencies...")
    print("=" * 70)
    
    if not check_dependency("Node.js", "node"):
        print("[X] Node.js is not installed!")
        print("    Please install from https://nodejs.org/")
        return 1
    print("[OK] Node.js found")
    
    if not check_dependency("npm", "npm"):
        print("[X] npm is not available!")
        return 1
    print("[OK] npm found")
    
    if not check_dependency("Java", "java"):
        print("[X] Java is not installed!")
        print("    Please install from https://adoptium.net/")
        return 1
    print("[OK] Java found")
    
    # Step 2: Generate required icons if missing
    print("\n" + "=" * 70)
    print("Step 2: Checking and generating required icons...")
    print("=" * 70)
    
    public_dir = os.path.join(project_dir, "public")
    required_icons = ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]
    missing_icons = []
    
    for icon in required_icons:
        icon_path = os.path.join(public_dir, icon)
        if not os.path.exists(icon_path):
            missing_icons.append(icon)
    
    if missing_icons:
        print(f"[i] Missing icons: {', '.join(missing_icons)}")
        placeholder_script = os.path.join(project_dir, "create_placeholder_icons.py")
        if os.path.exists(placeholder_script):
            if not run_command(
                [sys.executable, placeholder_script],
                cwd=project_dir,
                description="Generating placeholder icons"
            ):
                print("[X] Failed to generate icons")
                return 1
        else:
            print("[X] create_placeholder_icons.py not found")
            return 1
    else:
        print("[OK] All required icons are present")
    
    # Step 3: Create Android keystore if missing
    print("\n" + "=" * 70)
    print("Step 3: Setting up Android keystore...")
    print("=" * 70)
    
    keystore_path = os.path.join(project_dir, "android.keystore")
    if not os.path.exists(keystore_path):
        print("[i] Creating new Android keystore...")
        keytool_cmd = "keytool"
        java_home = os.environ.get("JAVA_HOME")
        if java_home:
            keytool_path = os.path.join(java_home, "bin", "keytool.exe" if sys.platform == "win32" else "keytool")
            if os.path.exists(keytool_path):
                keytool_cmd = keytool_path
        
        alias = "android"
        password = "spolecnenalezy123"
        dname = "CN=Spolecne Nalezy, OU=Development, O=Spolecne Nalezy, L=Prague, ST=Prague, C=CZ"
        validity = 10000
        
        keystore_args = [
            keytool_cmd,
            "-genkeypair",
            "-v",
            "-keystore", keystore_path,
            "-alias", alias,
            "-keyalg", "RSA",
            "-keysize", "2048",
            "-validity", str(validity),
            "-dname", dname,
            "-storepass", password,
            "-keypass", password,
            "-noprompt"
        ]
        
        result = subprocess.run(
            keystore_args,
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f"[X] Failed to create keystore: {result.stderr[:500]}")
            return 1
        else:
            print(f"[OK] Keystore created at {keystore_path}")
    else:
        print("[OK] Keystore already exists")
    
    # Step 4: Setup Capacitor project
    if not setup_capacitor_project(project_dir):
        print("[X] Failed to setup Capacitor project")
        return 1
    
    # Step 5: Configure Capacitor
    if not configure_capacitor(project_dir):
        print("[X] Failed to configure Capacitor")
        return 1
    
    # Step 6: Copy web assets
    if not copy_web_assets(project_dir):
        print("[X] Failed to copy web assets")
        return 1
    
    # Step 7: Build Android APK
    if not build_capacitor_android(project_dir):
        print("[X] Failed to build APK")
        return 1
    
    # Step 8: Sign APK
    if not sign_apk(project_dir):
        print("[X] Failed to sign APK")
        return 1
    
    # Step 9: Verify APK
    print("\n" + "=" * 70)
    print("Step 9: Verifying APK...")
    print("=" * 70)
    
    signed_apk_path = os.path.join(project_dir, 'app-release-signed.apk')
    if os.path.exists(signed_apk_path):
        apk_size = os.path.getsize(signed_apk_path)
        print(f"[OK] APK successfully created!")
        print(f"    Location: {signed_apk_path}")
        print(f"    Size: {apk_size:,} bytes ({apk_size / (1024*1024):.2f} MB)")
        
        print("\n" + "=" * 70)
        print("DONE! APK is ready for use.")
        print("=" * 70)
        print(f"\nAPK File: {signed_apk_path}")
        return 0
    else:
        print("[X] APK file was not created")
        return 1


if __name__ == "__main__":
    sys.exit(main())
