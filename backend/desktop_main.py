"""
Desktop Backend Entry Point

This is the entry point when running the backend as a standalone desktop application.
It starts the Uvicorn server with appropriate settings for desktop mode.
"""

import uvicorn
import sys
import os

# Ensure desktop mode is set
os.environ["DESKTOP_MODE"] = "true"

def main():
    """Start the FastAPI server for desktop mode."""
    
    # Configuration for desktop mode
    config = {
        "app": "main:app",
        "host": "127.0.0.1",  # Only localhost in desktop mode
        "port": 8000,
        "log_level": "info",
        "access_log": True,
    }
    
    print("=" * 60)
    print("🚀 AI Sysadmin Agent - Desktop Backend")
    print("=" * 60)
    print(f"Server: http://{config['host']}:{config['port']}")
    print(f"API Docs: http://{config['host']}:{config['port']}/docs")
    print(f"Desktop Mode: ✅ Enabled")
    print("=" * 60)
    print("Press CTRL+C to stop the server")
    print("=" * 60)
    
    try:
        # Start uvicorn server
        uvicorn.run(**config)
    except KeyboardInterrupt:
        print("\n👋 Shutting down server...")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
