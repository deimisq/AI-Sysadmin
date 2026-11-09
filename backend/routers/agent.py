from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
import database, models, dependencies
from services.ai_service import ai_service
from services.ansible_service import ansible_service
from services.diagnostic_service import diagnostic_service
from utils.encryption import decrypt_data
import logging
from utils.permissions import require_server_access

logger = logging.getLogger(__name__)
router = APIRouter()

class AgentQuery(BaseModel):
    server_id: int
    problem_description: str
    language: Optional[str] = "en"  # "en" or "es"
    context_consent_version: Optional[str] = None

class AgentResponse(BaseModel):
    analysis: Dict[str, Any]
    diagnostics: Optional[Dict[str, Any]] = None

class ExecuteRequest(BaseModel):
    server_id: int
    command: str
    approved_by: Optional[str] = None  # Accepted for compatibility; identity comes from JWT.


@router.post("/agent/diagnose", response_model=AgentResponse)
def diagnose_problem(query: AgentQuery, db: Session = Depends(dependencies.get_db),
                     current_user: models.User = Depends(dependencies.get_current_active_user)):
    server = db.query(models.Server).filter(models.Server.id == query.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)
    if query.context_consent_version != "2026-10-25":
        raise HTTPException(status_code=428, detail="Accept the infrastructure AI context notice before diagnosing")
    
    try:
        # Step 1: Gather real diagnostic information from the server
        logger.info(f"Gathering diagnostics for server {server.hostname}")
        
        # Decrypt credentials
        ssh_password = decrypt_data(server.ssh_password) if server.ssh_password else None
        ssh_key = decrypt_data(server.ssh_key_path) if server.ssh_key_path else None
        
        # Check if we have credentials
        if not ssh_password and not ssh_key:
            return AgentResponse(
                analysis={
                    "analysis": "Cannot connect to server: No SSH credentials configured. Please add SSH password or key to the server configuration.",
                    "proposed_command": None
                },
                diagnostics={"error": "No credentials configured"}
            )
        
        # Collect system information with timeout protection
        try:
            diagnostics = diagnostic_service.gather_system_info(server, ssh_password, ssh_key)
        except Exception as diag_error:
            logger.error(f"Diagnostic gathering failed: {diag_error}")
            # If diagnostics fail, still try to provide analysis with limited info
            diagnostics = {
                "error": f"Failed to gather diagnostics: {str(diag_error)}",
                "checks": {}
            }
        
        # Step 2: Build context with real data
        # Check if the user message already contains execution results (follow-up message)
        has_embedded_results = "Exit Code:" in query.problem_description or "Output:" in query.problem_description or "```" in query.problem_description
        
        if has_embedded_results:
            # User is providing results from a previous command execution
            # Don't gather new diagnostics, just analyze what they provided
            diagnostic_summary = f"""
Server: {server.hostname} ({server.ip_address})
OS: {server.os_info}

USER PROVIDED DATA:
{query.problem_description}
"""
        else:
            # First-time diagnosis - gather fresh diagnostic data
            diagnostic_summary = f"""
Server: {server.hostname} ({server.ip_address})
OS: {server.os_info}

DIAGNOSTIC RESULTS:
"""
            if diagnostics.get("checks"):
                for check_name, result in diagnostics.get("checks", {}).items():
                    if result.get("success"):
                        diagnostic_summary += f"\n{check_name.upper()}:\n{result['output']}\n"
            else:
                diagnostic_summary += "\nUnable to gather diagnostic data. Analysis will be limited.\n"
        
        # Step 3: Analyze with AI using real data
        server_info = f"Hostname: {server.hostname}, OS: {server.os_info}, IP: {server.ip_address}"
        full_context = f"{server_info}\n\n{diagnostic_summary}"
        
        response_data = ai_service.analyze_problem(db, query.problem_description, full_context, query.language)
        
        return AgentResponse(analysis=response_data, diagnostics=diagnostics if not has_embedded_results else None)
        
    except Exception as e:
        logger.error(f"Error during diagnosis: {e}")
        raise HTTPException(status_code=500, detail=f"Diagnosis failed: {str(e)}")

@router.post("/agent/execute")
def execute_solution(request: ExecuteRequest, db: Session = Depends(dependencies.get_db),
                     current_user: models.User = Depends(dependencies.get_current_active_user)):
    server = db.query(models.Server).filter(models.Server.id == request.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)

    # Log the attempt
    log = models.OperationLog(
        server_id=server.id,
        action=request.command,
        status="pending",
        approved_by=current_user.username
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
