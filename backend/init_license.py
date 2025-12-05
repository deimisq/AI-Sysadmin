#!/usr/bin/env python3
"""
Initialize trial license on first run or update
"""
from sqlalchemy.orm import Session
from database import SessionLocal
from services.license_service import LicenseService
import models
import uuid
import os

def init_license():
    """Initialize trial license if no active license exists"""
    db = SessionLocal()
    
    try:
        # Check if there's an active license
        active_license = LicenseService.get_active_license(db)
        
        if active_license:
            print(f"✓ Licencia activa encontrada: {active_license.license_key}")
            print(f"  Tipo: {active_license.license_type}")
            print(f"  Expira: {active_license.expires_at.strftime('%Y-%m-%d')}")
            return
        
        # Check if there's an installation ID stored
        installation_id_file = "/app/data/installation_id.txt"
        
        if os.path.exists(installation_id_file):
            with open(installation_id_file, 'r') as f:
                installation_id = f.read().strip()
        else:
            # Generate new installation ID
            installation_id = str(uuid.uuid4())
            os.makedirs("/app/data", exist_ok=True)
            with open(installation_id_file, 'w') as f:
                f.write(installation_id)
        
        print(f"⚙️  Generando licencia de prueba (180 días)...")
        print(f"   Installation ID: {installation_id}")
        
        # Create trial license
        license = LicenseService.create_trial_license(db, installation_id)
        
        print(f"✓ Licencia de prueba creada exitosamente!")
        print(f"  Clave: {license.license_key}")
        print(f"  Tipo: {license.license_type}")
        print(f"  Máximo de servidores: {license.max_servers}")
        print(f"  Máximo de usuarios: {license.max_users}")
        print(f"  Expira: {license.expires_at.strftime('%Y-%m-%d')}")
        
    except Exception as e:
        print(f"❌ Error al inicializar licencia: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_license()
