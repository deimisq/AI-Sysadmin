#!/usr/bin/env python3
"""
License Activation Script for AI Sysadmin Agent
Validates and activates commercial licenses
"""

import sys
import requests
import json
from datetime import datetime, timedelta
import hashlib
import uuid

# License server URL (replace with your actual server)
LICENSE_SERVER = "https://license.yourdomain.com/api/v1"

def get_installation_id():
    """Get or generate installation ID"""
    try:
        with open('.installation_id', 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        installation_id = str(uuid.uuid4())
        with open('.installation_id', 'w') as f:
            f.write(installation_id)
        return installation_id

def validate_license_key(license_key):
    """Validate license key format"""
    if len(license_key) != 29:  # Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
        return False
    parts = license_key.split('-')
    if len(parts) != 5:
        return False
    return all(len(part) == 5 and part.isalnum() for part in parts)

def activate_license(license_key, installation_id):
    """Activate license with remote server"""
    try:
        response = requests.post(
            f"{LICENSE_SERVER}/activate",
            json={
                "license_key": license_key,
                "installation_id": installation_id,
                "product": "ai-sysadmin-agent",
                "version": "1.0.0"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Activation failed: {response.json().get('detail', 'Unknown error')}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error: {e}")
        print("💡 Tip: Check your internet connection and try again")
        return None

def update_local_license(license_data):
    """Update local database with activated license"""
    import os
    import sys
    
    # Add backend to path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
    
    from database import SessionLocal
    from models import License
    from datetime import datetime
    
    db = SessionLocal()
    try:
        # Delete existing licenses
        db.query(License).delete()
        
        # Create new commercial license
        new_license = License(
            license_key=license_data['license_key'],
            type="COMMERCIAL",
            status="ACTIVE",
            start_date=datetime.fromisoformat(license_data['start_date']),
            expiration_date=datetime.fromisoformat(license_data['expiration_date']),
            installation_id=license_data['installation_id']
        )
        
        db.add(new_license)
        db.commit()
        
        print("✅ License activated successfully!")
        print(f"📅 Valid until: {license_data['expiration_date']}")
        print(f"🔑 License type: COMMERCIAL")
        
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    print("🔐 AI Sysadmin Agent - License Activation")
    print("=" * 50)
    
    # Get installation ID
    installation_id = get_installation_id()
    print(f"📋 Installation ID: {installation_id}")
    print()
    
    # Get license key from user
    if len(sys.argv) > 1:
        license_key = sys.argv[1]
    else:
        license_key = input("Enter your license key: ").strip().upper()
    
    # Validate format
    if not validate_license_key(license_key):
        print("❌ Invalid license key format")
        print("Expected format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX")
        sys.exit(1)
    
    print(f"🔍 Validating license key: {license_key}")
    
    # Activate with server
    license_data = activate_license(license_key, installation_id)
    
    if not license_data:
        sys.exit(1)
    
    # Update local database
    if update_local_license(license_data):
        print()
        print("🎉 Activation complete! Please restart the application.")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
