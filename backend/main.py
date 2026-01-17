from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import inventory, agent, auth, admin, config, version, license, monitoring, scheduled_reports, documentation
from services.version_service import start_version_check_loop
from services.scheduler_service import scheduler_service
import json
import os
import asyncio
from datetime import datetime


from database import engine, SessionLocal
import models
from services.audit_service import AuditService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)
    
    # Audit Startup Event
    try:
        db = SessionLocal()
        # Log system startup to verify audit system is working
        AuditService.log_action(
            db=db,
            user_id=None, 
            action="system_startup",
            resource_type="system",
            details={"event": "backend_started"},
            ip_address="internal"
        )
        db.close()
        print("✅ System startup audit log created.")
    except Exception as e:
        print(f"⚠️ Failed to create startup audit log: {e}")
    
    # Startup: start background version check
    version_check_task = asyncio.create_task(start_version_check_loop())
    
    # Start the scheduler for health checks
    scheduler_service.start()
    
    # Debug routes
    print("--- REGISTERED ROUTES ---")
    for route in app.routes:
        if hasattr(route, 'path'):
            print(f"Route: {route.path}")
    print("-------------------------")
    
    yield
    
    # Shutdown: cancel tasks and stop scheduler
    version_check_task.cancel()
    scheduler_service.shutdown()


app = FastAPI(title="Sysadmin AI Agent API", lifespan=lifespan)

# Get allowed origins from environment variable
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["administration"])
app.include_router(config.router, prefix="/api/v1/config", tags=["configuration"])
app.include_router(inventory.router, prefix="/api/v1", tags=["inventory"])
app.include_router(agent.router, prefix="/api/v1", tags=["agent"])
app.include_router(version.router, prefix="/api/v1", tags=["version"])
app.include_router(license.router, prefix="/api/v1", tags=["license"])
app.include_router(monitoring.router, prefix="/api/v1", tags=["monitoring"])
app.include_router(scheduled_reports.router, prefix="/api/v1", tags=["scheduled-reports"])
app.include_router(documentation.router, prefix="/api/v1/documentation", tags=["documentation"])
from routers import console_ws
app.include_router(console_ws.router, prefix="/api/v1", tags=["console"])

@app.get("/")
async def root():
    return {"message": "Sysadmin AI Agent API is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/v1/version")
async def get_version():
    """Get application version information"""
    version_file = "/app/VERSION.json"
    if not os.path.exists(version_file):
        version_file = os.path.join(os.path.dirname(__file__), "..", "VERSION.json")
    try:
        with open(version_file, 'r') as f:
            version_data = json.load(f)
        version_data["currentYear"] = datetime.now().year
        return version_data
    except Exception as e:
        return {
            "version": "0.9.3-beta3",
            "name": "AI Sysadmin Agent",
            "currentYear": datetime.now().year,
            "error": str(e)
        }
