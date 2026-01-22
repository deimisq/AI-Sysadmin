import os
import sys

# Add current dir to path
sys.path.append(os.getcwd())

# Ensure we are in desktop mode (or force it for this script)
os.environ["DESKTOP_MODE"] = "true"

from desktop_config import get_database_url
from models import Base
from sqlalchemy import create_engine

# Import all models to ensure they are registered in Base
# (already imported in models.py imports, but good practice to be explicit if separated)

def bootstrap():
    url = get_database_url()
    print(f"Bootstrapping Desktop Database at: {url}")
    
    if "sqlite" not in url:
        print("Error: This script is intended for SQLite (Desktop Mode) only.")
        sys.exit(1)

    engine = create_engine(url)

    print("Creating schema...")
    Base.metadata.create_all(bind=engine)
    print("Schema created successfully.")

if __name__ == "__main__":
    bootstrap()
