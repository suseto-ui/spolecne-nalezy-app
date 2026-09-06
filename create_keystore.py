#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Keystore Creation Script for Spolecne Nalezy
Creates a basic Android keystore using keytool
"""

import subprocess
import sys
import os

def create_keystore():
    """Create Android keystore using keytool."""
    print("=" * 70)
    print("Creating Android Keystore for Spolecne Nalezy")
    print("=" * 70)
    
    # Keystore configuration
    keystore_path = "android.keystore"
    alias = "android"
    password = "spolecnenalezy123"
    dname = "CN=Spolecne Nalezy, OU=Development, O=Spolecne Nalezy, L=Prague, ST=Prague, C=CZ"
    validity = 10000  # ~27 years
    
    # Check if keytool is available
    try:
        result = subprocess.run(["keytool", "-help"], capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            print("[X] keytool not found in PATH")
            
            # Try with full path
            java_home = os.environ.get("JAVA_HOME")
            if java_home:
                keytool_path = os.path.join(java_home, "bin", "keytool.exe" if sys.platform == "win32" else "keytool")
                if os.path.exists(keytool_path):
                    keytool_cmd = keytool_path
                else:
                    print(f"[X] keytool not found at {keytool_path}")
                    return False
            else:
                print("[X] JAVA_HOME environment variable not set")
                return False
        else:
            keytool_cmd = "keytool"
    except:
        print("[X] Error checking for keytool")
        return False
    
    # Create keystore
    cmd = [
        keytool_cmd,
        "-genkey",
        "-v",
        f"-keystore={keystore_path}",
        f"-alias={alias}",
        "-keyalg=RSA",
        "-keysize=2048",
        f"-validity={validity}",
        f"-dname={dname}",
        f"-storepass={password}",
        f"-keypass={password}",
        "-noprompt"
    ]
    
    print(f"[i] Creating keystore: {keystore_path}")
    print(f"[i] Alias: {alias}")
    print(f"[i] Validity: {validity} days")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print(f"[OK] Keystore created successfully!")
            print(f"[OK] File: {os.path.abspath(keystore_path)}")
            print(f"[OK] Size: {os.path.getsize(keystore_path):,} bytes")
            
            # Update twa-manifest.json
            update_manifest(alias, password)
            return True
        else:
            print(f"[X] Failed to create keystore: {result.stderr}")
            return False
    except Exception as e:
        print(f"[X] Error: {str(e)}")
        return False


def update_manifest(alias, password):
    """Update twa-manifest.json with keystore details."""
    import json
    
    manifest_path = "twa-manifest.json"
    if not os.path.exists(manifest_path):
        print(f"[WARNING] {manifest_path} not found, skipping update")
        return
    
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        manifest["signingKey"] = {
            "path": "./android.keystore",
            "alias": alias,
            "password": password,
            "keyPassword": password
        }
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        print(f"[OK] Updated {manifest_path} with keystore details")
    except Exception as e:
        print(f"[X] Error updating manifest: {str(e)}")


if __name__ == "__main__":
    success = create_keystore()
    sys.exit(0 if success else 1)