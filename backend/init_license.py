#!/usr/bin/env python3
"""
Initialize trial license on first run only.
Does NOT reset on updates - preserves existing licenses.
"""
from sqlalchemy.orm import Session
from database import SessionLocal
from services.license_service import LicenseService
from datetime import datetime
import models
import uuid
import os

def init_license():
    """Initialize trial license ONLY if no license exists at all"""
    db = SessionLocal()
    
    try:
        # Check if ANY license exists (active or not) - prevents reset on updates
        any_license = db.query(models.License).first()
        
        if any_license:
            # License exists - show status but DON'T create new one
            days_remaining = (any_license.expires_at - datetime.utcnow()).days
            status = "ACTIVA" if any_license.is_active and days_remaining > 0 else "EXPIRADA"
            
            print(f"✓ Licencia existente encontrada: {any_license.license_key}")
            print(f"  Tipo: {any_license.license_type}")
            print(f"  Estado: {status}")
            print(f"  Expira: {any_license.expires_at.strftime('%Y-%m-%d')}")
            if days_remaining > 0:
                print(f"  Días restantes: {days_remaining}")
            else:
                print(f"  ⚠️  Licencia expirada hace {abs(days_remaining)} días")
            return
        
        # No license exists - create trial license (first installation only)
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
        
        print(f"⚙️  Primera instalación detectada - Generando licencia de prueba (180 días)...")
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
