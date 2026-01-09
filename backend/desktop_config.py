"""
Desktop Mode Configuration

This module handles configuration for desktop (Tauri) mode vs SaaS mode.
In desktop mode:
- Uses SQLite database stored in user's app data directory
- Simplified authentication (local mode)
- Different default settings optimized for single-user usage
"""

import os
import sys
from pathlib import Path
from typing import Optional

# Detect if running in desktop mode
# This can be set via environment variable or by checking if we're bundled with PyInstaller
DESKTOP_MODE = os.getenv("DESKTOP_MODE", "false").lower() == "true"

# Alternative: detect PyInstaller bundle
if getattr(sys, 'frozen', False):
    # Running in PyInstaller bundle
    DESKTOP_MODE = True
    APPLICATION_PATH = Path(sys._MEIPASS)
else:
    # Running in normal Python environment
    APPLICATION_PATH = Path(__file__).parent


def get_desktop_data_dir() -> Path:
    """
    Get the application data directory for desktop mode.
    
    Returns:
        Path: Directory where app data should be stored
        
    Directory structure:
    - Windows: %APPDATA%/AI Sysadmin Agent/
    - macOS: ~/Library/Application Support/AI Sysadmin Agent/
    - Linux: ~/.local/share/ai-sysadmin-agent/
    """
    app_name = "AI Sysadmin Agent"
    
    if sys.platform == "win32":
        # Windows
        base = Path(os.getenv("APPDATA", "~"))
        data_dir = base / app_name
    elif sys.platform == "darwin":
        # macOS
        data_dir = Path.home() / "Library" / "Application Support" / app_name
    else:
        # Linux and others
        base = Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share"))
        data_dir = base / "ai-sysadmin-agent"
    
    # Create directory if it doesn't exist
    data_dir = data_dir.expanduser()
    data_dir.mkdir(parents=True, exist_ok=True)
    
    return data_dir


def get_database_url() -> str:
    """
    Get the appropriate database URL based on mode.
    
    Returns:
        str: Database connection string
    """
    if DESKTOP_MODE:
        # Use SQLite in desktop mode
        data_dir = get_desktop_data_dir()
        db_path = data_dir / "database.db"
        
        # SQLite URL format
        return f"sqlite:///{db_path}"
    else:
        # Use PostgreSQL from environment in SaaS mode
        return os.getenv(
            "DATABASE_URL",
            "postgresql://sysadmin_agent:secure_password_dev@localhost:5432/sysadmin_agent_db"
        )


def get_logs_dir() -> Path:
    """Get directory for log files in desktop mode."""
    if DESKTOP_MODE:
        data_dir = get_desktop_data_dir()
        logs_dir = data_dir / "logs"
        logs_dir.mkdir(exist_ok=True)
        return logs_dir
    else:
        # Default logs location for SaaS mode
        return Path("/var/log/ai-sysadmin-agent")


def get_config_dir() -> Path:
    """Get directory for configuration files in desktop mode."""
    if DESKTOP_MODE:
        data_dir = get_desktop_data_dir()
        config_dir = data_dir / "config"
        config_dir.mkdir(exist_ok=True)
        return config_dir
    else:
        return Path("/etc/ai-sysadmin-agent")


# Desktop-specific settings
DESKTOP_SETTINGS = {
    "desktop_mode": DESKTOP_MODE,
    "database_url": get_database_url(),
    "logs_dir": str(get_logs_dir()) if DESKTOP_MODE else None,
    "config_dir": str(get_config_dir()) if DESKTOP_MODE else None,
    "data_dir": str(get_desktop_data_dir()) if DESKTOP_MODE else None,
    
    # Desktop-specific optimizations
    "enable_auto_backup": DESKTOP_MODE,  # Auto-backup database in desktop mode
    "backup_interval_hours": 24,
    "max_backups_to_keep": 7,
    
    # Simplified authentication for desktop
    "simplified_auth": DESKTOP_MODE,  # Skip email verification, etc.
    "auto_login": DESKTOP_MODE,  # Remember login
}


def print_desktop_config():
    """Print current desktop configuration (for debugging)."""
    print("=" * 50)
    print("DESKTOP CONFIGURATION")
    print("=" * 50)
    print(f"Desktop Mode: {DESKTOP_MODE}")
    print(f"Application Path: {APPLICATION_PATH}")
    
    if DESKTOP_MODE:
        print(f"Data Directory: {get_desktop_data_dir()}")
        print(f"Database URL: {get_database_url()}")
        print(f"Logs Directory: {get_logs_dir()}")
        print(f"Config Directory: {get_config_dir()}")
    
    print("=" * 50)


# Print config on import (only in desktop mode)
if DESKTOP_MODE:
    print_desktop_config()
