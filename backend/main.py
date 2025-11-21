from fastapi import FastAPI
from routers import inventory, agent

app = FastAPI(title="Sysadmin AI Agent API")

app.include_router(inventory.router, prefix="/api/v1", tags=["inventory"])
app.include_router(agent.router, prefix="/api/v1", tags=["agent"])

@app.get("/")
async def root():
    return {"message": "Sysadmin AI Agent API is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
