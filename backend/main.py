from fastapi import FastAPI
from routers import inventory, agent, auth

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
app.include_router(inventory.router, prefix="/api/v1", tags=["inventory"])
app.include_router(agent.router, prefix="/api/v1", tags=["agent"])

@app.get("/")
async def root():
    return {"message": "Sysadmin AI Agent API is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
