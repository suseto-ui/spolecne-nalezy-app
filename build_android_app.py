#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build android-app project
"""

import subprocess
import sys
import os

# Change to android-app directory
os.chdir(r"C:\Users\Administrator\Develop\appkanase\android-app")

# Run gradle build
result = subprocess.run(
    [r"C:\Users\Administrator\Develop\appkanase\gradlew.bat", "clean", "build", "--no-daemon", "--stacktrace"],
    capture_output=True,
    text=True,
    timeout=300
)

print("STDOUT:")
print(result.stdout)
print("\nSTDERR:")
print(result.stderr)
print(f"\nReturn code: {result.returncode}")

sys.exit(result.returncode)
