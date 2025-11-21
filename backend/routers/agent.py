from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import database, models
from services.ai_service import ai_service

router = APIRouter()

class AgentQuery(BaseModel):
    server_id: int
    problem_description: str

class AgentResponse(BaseModel):
    analysis: str

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/agent/diagnose", response_model=AgentResponse)
def diagnose_problem(query: AgentQuery, db: Session = Depends(get_db)):
    server = db.query(models.Server).filter(models.Server.id == query.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    server_info = f"Hostname: {server.hostname}, OS: {server.os_info}, IP: {server.ip_address}"
    
    try:
        response_text = ai_service.analyze_problem(db, query.problem_description, server_info)
        return AgentResponse(analysis=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
