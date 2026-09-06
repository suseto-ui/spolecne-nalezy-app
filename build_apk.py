#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Spolecne Nalezy - Build APK Script
Vytvori Android APK z PWA pomoci Bubblewrap CLI
"""

import subprocess
import sys
import os
import time
import json
import threading
import http.server
import socketserver
from http import HTTPStatus

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
            print(f"    Error: {result.stderr[:500]}")
        return False
    else:
        print(f"[OK] SUCCESS")
        if result.stdout:
            print(f"    Output: {result.stdout[:200]}")
        return True


def find_command_path(command):
    """Find the full path to a command on Windows."""
    if sys.platform != "win32":
        return command
    
    # Common paths for commands on Windows
    common_paths = {
        'node': 'C:/Program Files/nodejs/node.exe',
        'npm': 'C:/Program Files/nodejs/npm.cmd',
        'java': 'C:/Program Files/Eclipse Adoptium/jdk-21.0.3.9-hotspot/bin/java.exe',
        'bubblewrap': 'C:/Users/Administrator/AppData/Roaming/npm/bubblewrap.cmd',
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
            # Return the first found path
            first_path = result.stdout.strip().split('\n')[0].strip()
            if os.path.exists(first_path):
                return first_path
    except:
        pass
    
    return command


class SimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler to serve files from project directory."""
    def __init__(self, *args, project_dir=None, **kwargs):
        self.project_dir = project_dir or os.getcwd()
        super().__init__(*args, directory=self.project_dir, **kwargs)


def start_http_server(project_dir, port=8080):
    """Start a simple HTTP server in a background thread."""
    Handler = lambda *args, **kwargs: SimpleHTTPRequestHandler(*args, project_dir=project_dir, **kwargs)
    
    server = socketserver.ThreadingTCPServer(("localhost", port), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    
    # Give the server a moment to start
    time.sleep(1)
    
    # Test if server is running
    try:
        import urllib.request
        urllib.request.urlopen(f"http://localhost:{port}/manifest.json", timeout=2)
        return server, thread
    except:
        server.shutdown()
        return None, None


def check_dependency(name, command):
    """Check if a dependency is installed."""
    try:
        # Find the actual path to the command
        cmd_path = find_command_path(command)
        
        result = subprocess.run(
            [cmd_path, '--version'],
            capture_output=True,
            text=True,
            timeout=10,
            shell=False
        )
        if result.returncode == 0:
            return True
        
        # On Windows, try with .cmd extension
        if sys.platform == "win32" and not cmd_path.endswith('.cmd'):
            cmd_to_check = cmd_path + '.cmd'
            if os.path.exists(cmd_to_check):
                result = subprocess.run(
                    [cmd_to_check, '--version'],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    shell=False
                )
                return result.returncode == 0
        
        return False
    except:
        return False


def create_keystore(project_dir):
    """Create a new Android keystore if missing or invalid."""
    keystore_path = os.path.join(project_dir, "android.keystore")
    
    # Check if keystore exists and is not empty
    if os.path.exists(keystore_path) and os.path.getsize(keystore_path) > 0:
        print("[OK] Valid Android keystore found")
        return True
    
    print("[i] Creating new Android keystore...")
    
    # Find keytool path (it's usually in Java bin directory)
    keytool_cmd = "keytool"
    if sys.platform == "win32":
        # Try common Java installation paths on Windows
        java_home = os.environ.get("JAVA_HOME")
        if java_home:
            keytool_path = os.path.join(java_home, "bin", "keytool.exe")
            if os.path.exists(keytool_path):
                keytool_cmd = keytool_path
    
    # Keystore details
    alias = "android"
    password = "spolecnenalezy123"  # Change this in production!
    dname = "CN=Spolecne Nalezy, OU=Development, O=Spolecne Nalezy, L=Prague, ST=Prague, C=CZ"
    validity = 10000  # 10000 days (~27 years)
    
    try:
        # Use keytool to create new keystore
        keystore_args = [
            keytool_cmd,
            "-genkey",
            "-v",
            f"-keystore={keystore_path}",
            f"-alias={alias}",
            f"-keyalg=RSA",
            "-keysize=2048",
            f"-validity={validity}",
            f"-dname={dname}",
            f"-storepass={password}",
            f"-keypass={password}",
            "-noprompt"
        ]
        
        # On Windows, we might need to use shell=True
        use_shell = sys.platform == "win32"
        
        result = subprocess.run(
            keystore_args,
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=30,
            shell=use_shell
        )
        
        if result.returncode == 0:
            print(f"[OK] Keystore created successfully at {keystore_path}")
            
            # Update twa-manifest.json to use the correct keystore details
            update_keystore_in_manifest(project_dir, alias, password)
            return True
        else:
            print(f"[X] Failed to create keystore: {result.stderr[:500]}")
            print("[i] Please ensure Java is properly installed and keytool is in your PATH")
            return False
    except Exception as e:
        print(f"[X] Error creating keystore: {str(e)}")
        return False


def update_keystore_in_manifest(project_dir, alias, password):
    """Update the twa-manifest.json with keystore details."""
    manifest_path = os.path.join(project_dir, "twa-manifest.json")
    
    if not os.path.exists(manifest_path):
        return
    
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        # Update signing key information
        manifest["signingKey"] = {
            "path": "./android.keystore",
            "alias": alias,
            "password": password,
            "keyPassword": password
        }
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        print(f"[OK] Updated twa-manifest.json with keystore details")
    except Exception as e:
        print(f"[X] Error updating manifest: {str(e)}")


def generate_placeholder_icons(project_dir):
    """Generate placeholder icons if they are missing."""
    print("\n[>] Checking for required icon files...")
    
    public_dir = os.path.join(project_dir, "public")
    required_icons = [
        "icon-192.png",
        "icon-512.png", 
        "icon-maskable-512.png"
    ]
    
    missing_icons = []
    for icon in required_icons:
        icon_path = os.path.join(public_dir, icon)
        if not os.path.exists(icon_path):
            missing_icons.append(icon)
    
    if not missing_icons:
        print("[OK] All required icons are present")
        return True
    
    print(f"[i] Missing icons: {', '.join(missing_icons)}")
    print("[i] Attempting to generate placeholder icons...")
    
    # Try to use the existing create_placeholder_icons.py script
    placeholder_script = os.path.join(project_dir, "create_placeholder_icons.py")
    if os.path.exists(placeholder_script):
        print("[i] Using create_placeholder_icons.py script...")
        try:
            result = subprocess.run(
                [sys.executable, placeholder_script],
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode == 0:
                print("[OK] Placeholder icons generated successfully")
                return True
            else:
                print(f"[X] Failed to generate icons: {result.stderr[:500]}")
                return False
        except Exception as e:
            print(f"[X] Error running icon generation script: {str(e)}")
            return False
    else:
        print("[X] create_placeholder_icons.py script not found")
        return False


def main():
    print("=" * 70)
    print("Spolecne Nalezy - Build APK z PWA")
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
        sys.exit(1)
    print("[OK] Node.js found")
    
    # Step 2: Check npm
    if not check_dependency("npm", "npm"):
        print("[X] npm is not available!")
        sys.exit(1)
    print("[OK] npm found")
    
    # Step 3: Check Java
    if not check_dependency("Java", "java"):
        print("[X] Java is not installed!")
        print("    Please install from https://adoptium.net/")
        sys.exit(1)
    print("[OK] Java found")
    
    # Step 4: Generate required icons if missing
    print("\n" + "=" * 70)
    print("Step 2: Checking and generating required icons...")
    print("=" * 70)
    
    if not generate_placeholder_icons(project_dir):
        print("[WARNING] Some icons may be missing, continuing anyway...")
    
    # Step 5: Create Android keystore if missing
    print("\n" + "=" * 70)
    print("Step 3: Setting up Android keystore...")
    print("=" * 70)
    
    if not create_keystore(project_dir):
        print("[WARNING] Using existing keystore or continuing without it...")
    
    # Step 6: Install Bubblewrap CLI if needed
    print("\n" + "=" * 70)
    print("Step 4: Installing Bubblewrap CLI...")
    print("=" * 70)
    
    if not check_dependency("Bubblewrap", "bubblewrap"):
        print("[i] Installing @bubblewrap/cli globally...")
        if not run_command(
            ["npm", "install", "-g", "@bubblewrap/cli"],
            description="npm install -g @bubblewrap/cli"
        ):
            print("[X] Failed to install @bubblewrap/cli")
            sys.exit(1)
    else:
        print("[OK] Bubblewrap CLI is already installed")
    
    # Step 7: Initialize Bubblewrap project
    print("\n" + "=" * 70)
    print("Step 5: Initializing Bubblewrap project...")
    print("=" * 70)
    
    # Use local twa-manifest.json if available
    local_manifest = os.path.join(project_dir, "twa-manifest.json")
    if os.path.exists(local_manifest):
        print(f"[i] Using local manifest: {local_manifest}")
        
        # Copy public/manifest.json to project root for HTTP server
        public_manifest = os.path.join(project_dir, "public", "manifest.json")
        root_manifest = os.path.join(project_dir, "manifest.json")
        if os.path.exists(public_manifest) and not os.path.exists(root_manifest):
            print("[i] Copying public/manifest.json to project root...")
            import shutil
            shutil.copy2(public_manifest, root_manifest)
        
        # Also copy icons to root
        for icon in ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]:
            public_icon = os.path.join(project_dir, "public", icon)
            root_icon = os.path.join(project_dir, icon)
            if os.path.exists(public_icon) and not os.path.exists(root_icon):
                shutil.copy2(public_icon, root_icon)
        
        # Start local HTTP server to serve manifest.json on port 8080
        print("[i] Starting local HTTP server for manifest validation on port 8080...")
        http_server, http_thread = start_http_server(project_dir, port=8080)
        if http_server is None:
            print("[X] Failed to start HTTP server for manifest validation")
            # Try without HTTP server - may work with --skip-manifest-validation
            print("[i] Trying without HTTP server...")
        
        try:
            if not run_command(
                ["bubblewrap", "init", "--manifest=./twa-manifest.json", "--skip-manifest-validation"],
                cwd=project_dir,
                description="bubblewrap init with local manifest"
            ):
                print("[X] Failed to initialize Bubblewrap project")
                sys.exit(1)
        finally:
            if http_server:
                http_server.shutdown()
                http_server.server_close()
                print("[OK] HTTP server stopped")
    else:
        print("[X] Local twa-manifest.json not found!")
        print("    Please ensure twa-manifest.json exists in the project directory")
        sys.exit(1)
    
    # Step 8: Build APK
    print("\n" + "=" * 70)
    print("Step 6: Building signed APK...")
    print("=" * 70)
    
    if not run_command(
        ["bubblewrap", "build"],
        cwd=project_dir,
        description="bubblewrap build"
    ):
        print("[X] Failed to build APK")
        sys.exit(1)
    
    # Step 9: Verify APK was created
    print("\n" + "=" * 70)
    print("Step 7: Verifying APK...")
    print("=" * 70)
    
    apk_path = os.path.join(project_dir, "app-release-signed.apk")
    if os.path.exists(apk_path):
        apk_size = os.path.getsize(apk_path)
        print(f"[OK] APK successfully created!")
        print(f"    Location: {apk_path}")
        print(f"    Size: {apk_size:,} bytes ({apk_size / (1024*1024):.2f} MB)")
        
        # Try to install on device if ADB is available
        if check_dependency("ADB", "adb"):
            print("\n" + "=" * 70)
            print("ADB detected - Attempting to install on device...")
            print("=" * 70)
            
            # Check for connected devices
            result = subprocess.run(
                ["adb", "devices"],
                capture_output=True,
                text=True
            )
            
            if "device" in result.stdout and "unauthorized" not in result.stdout:
                devices = [line.split()[0] for line in result.stdout.split('\n') 
                          if 'device' in line and line.strip()]
                if devices:
                    print(f"[i] Found device(s): {', '.join(devices)}")
                    choice = input("Install APK on device? (y/n): ").strip().lower()
                    if choice == 'y':
                        if run_command(
                            ["adb", "install", "app-release-signed.apk"],
                            cwd=project_dir,
                            description="adb install app-release-signed.apk"
                        ):
                            print("\n[OK] APK installed successfully!")
                        else:
                            print("\n[X] Installation failed")
            else:
                print("[i] No authorized Android devices connected")
        
        print("\n" + "=" * 70)
        print("DONE! APK is ready for use.")
        print("=" * 70)
        print(f"\nAPK File: {apk_path}")
        print("\nTo install manually:")
        print("  1. Transfer the APK to your Android device")
        print("  2. Enable 'Unknown sources' in Android settings")
        print("  3. Open the APK file to install")
        print("\nOr use ADB:")
        print("  adb install app-release-signed.apk")
        
        return 0
    else:
        print("[X] APK file was not created")
        print(f"    Expected at: {apk_path}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
