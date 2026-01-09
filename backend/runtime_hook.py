"""
PyInstaller Runtime Hook for AI Sysadmin Agent Backend

This hook runs before the main application starts.
It sets up the environment for the bundled application.
"""

import os
import sys

# Set desktop mode environment variable
os.environ["DESKTOP_MODE"] = "true"

# Ensure SQLite is available
try:
    import sqlite3
    print(f"✅ SQLite version: {sqlite3.sqlite_version}")
except ImportError:
    print("⚠️  SQLite not available!")

# Print runtime info
print("=" * 50)
print("AI Sysadmin Agent - Backend Runtime")
print("=" * 50)
print(f"Python: {sys.version}")
print(f"Platform: {sys.platform}")
print(f"Frozen: {getattr(sys, 'frozen', False)}")
if hasattr(sys, '_MEIPASS'):
    print(f"Bundle directory: {sys._MEIPASS}")
print("=" * 50)
