from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
import database, models
from services.ai_service import ai_service
from services.ansible_service import ansible_service
from utils.encryption import decrypt_data

router = APIRouter()

class AgentQuery(BaseModel):
    server_id: int
    problem_description: str

class AgentResponse(BaseModel):
    analysis: Dict[str, Any]

class ExecuteRequest(BaseModel):
    server_id: int
    command: str
    approved_by: str

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
        response_data = ai_service.analyze_problem(db, query.problem_description, server_info)
        return AgentResponse(analysis=response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent/execute")
def execute_solution(request: ExecuteRequest, db: Session = Depends(get_db)):
    server = db.query(models.Server).filter(models.Server.id == request.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Log the attempt
    log = models.OperationLog(
        server_id=server.id,
        action=request.command,
        status="pending",
        approved_by=request.approved_by
    )
    db.add(log)
    db.commit()
    
    try:
        # Decrypt SSH credentials if they exist
        ssh_password = decrypt_data(server.ssh_password) if server.ssh_password else None
        ssh_key = decrypt_data(server.ssh_key_path) if server.ssh_key_path else None
        
        # Build inventory for Ansible
        inventory = {
            "all": {
                "hosts": {
                    server.ip_address: {
                        "ansible_user": server.ssh_username,
                    }
                }
            }
        }
        
        # Add authentication method
        if ssh_password:
            inventory["all"]["hosts"][server.ip_address]["ansible_password"] = ssh_password
        if ssh_key:
            inventory["all"]["hosts"][server.ip_address]["ansible_ssh_private_key_file"] = ssh_key
        
        # Execute using Ansible (ad-hoc command for now)
        stdout, status, rc = ansible_service.run_command(
            host_pattern=server.ip_address,
            module="shell",
            module_args=request.command,
            inventory=inventory
        )
        
        log.output = stdout
        log.status = "success" if rc == 0 else "failed"
        db.commit()
        
        return {"status": log.status, "output": stdout}
        
    except Exception as e:
        log.status = "error"
        log.output = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))
