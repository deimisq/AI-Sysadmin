from fastapi import FastAPI
from routers import inventory, agent, auth, admin, config
import json
import os
from datetime import datetime

app = FastAPI(title="Sysadmin AI Agent API")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For MVP, allow all. In prod, restrict to frontend/n8n IPs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
