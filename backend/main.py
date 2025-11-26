from fastapi import FastAPI
from routers import inventory, agent, auth, admin, config
import json
import os
from datetime import datetime
from database import engine, Base, SessionLocal
import models
from datetime import timedelta
import uuid

app = FastAPI(title="Sysadmin AI Agent API")

@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    
    # Check for license
    db = SessionLocal()
    try:
        license = db.query(models.License).first()
        if not license:
            # Create TRIAL license
            print("No license found. Creating TRIAL license...")
            trial_license = models.License(
                license_key=str(uuid.uuid4()),
                type="TRIAL",
                status="ACTIVE",
                start_date=datetime.now(),
                expiration_date=datetime.now() + timedelta(days=30),
                installation_id=str(uuid.uuid4())
            )
            db.add(trial_license)
            db.commit()
            print(f"TRIAL License created. Expires: {trial_license.expiration_date}")
    except Exception as e:
        print(f"Error checking/creating license: {e}")
    finally:
        db.close()

from fastapi.middleware.cors import CORSMiddleware
from middleware.license_check import LicenseCheckMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For MVP, allow all. In prod, restrict to frontend/n8n IPs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add license check middleware
app.add_middleware(LicenseCheckMiddleware)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["administration"])
app.include_router(config.router, prefix="/api/v1/config", tags=["configuration"])
app.include_router(inventory.router, prefix="/api/v1", tags=["inventory"])
app.include_router(agent.router, prefix="/api/v1", tags=["agent"])

@app.get("/")
async def root():
    return {"message": "Sysadmin AI Agent API is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/v1/version")
async def get_version():
    """Get application version information"""
    version_file = os.path.join(os.path.dirname(__file__), "..", "VERSION.json")
    try:
        with open(version_file, 'r') as f:
            version_data = json.load(f)
        version_data["currentYear"] = datetime.now().year
        return version_data
    except Exception as e:
        return {
            "version": "1.0.0",
            "name": "AI Sysadmin Agent",
            "currentYear": datetime.now().year,
            "error": str(e)
        }
