"""
PyInstaller Build Script for AI Sysadmin Agent Backend

This script builds a standalone executable of the FastAPI backend
for distribution with the Tauri desktop application.

Usage:
    python build_desktop.py

Output:
    - Windows: dist/ai-sysadmin-backend.exe
    - Linux/Mac: dist/ai-sysadmin-backend
"""

import PyInstaller.__main__
import sys
import os
from pathlib import Path

def build():
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    
    # Define paths
    main_script = str(script_dir / "desktop_main.py")  # Use desktop entry point
    dist_path = str(script_dir / "dist")
    build_path = str(script_dir / "build")
    spec_path = str(script_dir)
    
    # PyInstaller arguments
    args = [
        main_script,
        
        # Output settings
        '--name=ai-sysadmin-backend',
        f'--distpath={dist_path}',
        f'--workpath={build_path}',  # Changed from --buildpath
        f'--specpath={spec_path}',
        
        # Bundling options
        '--onefile',  # Single executable file
        '--console',  # Show console window (for debugging; can be --windowed for release)
        '--clean',    # Clean PyInstaller cache
        
        # Hidden imports (modules that PyInstaller might miss)
        '--hidden-import=uvicorn',
        '--hidden-import=uvicorn.logging',
        '--hidden-import=uvicorn.loops',
        '--hidden-import=uvicorn.loops.auto',
        '--hidden-import=uvicorn.protocols',
        '--hidden-import=uvicorn.protocols.http',
        '--hidden-import=uvicorn.protocols.http.auto',
        '--hidden-import=uvicorn.protocols.websockets',
        '--hidden-import=uvicorn.protocols.websockets.auto',
        '--hidden-import=uvicorn.lifespan',
        '--hidden-import=uvicorn.lifespan.on',
        
        '--hidden-import=fastapi',
        '--hidden-import=pydantic',
        '--hidden-import=pydantic_settings',
        '--hidden-import=sqlalchemy',
        '--hidden-import=sqlalchemy.ext.declarative',
        '--hidden-import=alembic',
        '--hidden-import=passlib.handlers.bcrypt',
        
        '--hidden-import=langchain',
        '--hidden-import=langchain_community',
        '--hidden-import=langchain_openai',
        '--hidden-import=langchain_google_genai',
        
        '--hidden-import=paramiko',
        '--hidden-import=asyncssh',
        '--hidden-import=ansible_runner',
        
        '--hidden-import=apscheduler',
        '--hidden-import=apscheduler.schedulers.background',
        '--hidden-import=apscheduler.triggers.cron',
        
        '--hidden-import=reportlab',
        '--hidden-import=reportlab.pdfgen',
        
        # Collect data files and submodules
        '--collect-data=langchain',
        '--collect-data=langchain_community',
        '--collect-data=ansible_runner',
        '--collect-submodules=uvicorn',
        '--collect-submodules=fastapi',
        '--collect-submodules=pydantic',
        '--collect-submodules=sqlalchemy',
        
        # Copy runtime hooks
        '--runtime-hook=runtime_hook.py',  # We'll create this
        
        # Optimization
        '--optimize=2',  # Python optimization level
        
        # Exclude unnecessary modules to reduce size
        '--exclude-module=matplotlib',
        '--exclude-module=numpy',
        '--exclude-module=pandas',  
        '--exclude-module=PIL',
        '--exclude-module=tkinter',
        '--exclude-module=pytest',
        '--exclude-module=notebook',
        '--exclude-module=jupyter',
    ]
    
    print("=" * 60)
    print("Building AI Sysadmin Agent Backend for Desktop")
    print("=" * 60)
    print(f"Platform: {sys.platform}")
    print(f"Python: {sys.version}")
    print(f"Output: {dist_path}")
    print("=" * 60)
    
    # Run PyInstaller
    PyInstaller.__main__.run(args)
    
    print("=" * 60)
    print("✅ Build completed!")
    print(f"Executable location: {dist_path}/ai-sysadmin-backend")
    if sys.platform == "win32":
        print(f"Executable: {dist_path}/ai-sysadmin-backend.exe")
    print("=" * 60)

if __name__ == '__main__':
    build()
