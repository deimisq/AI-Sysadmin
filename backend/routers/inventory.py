from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas
from services.ssh_service import ssh_service

router = APIRouter()

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/clients/", response_model=schemas.Client)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    db_client = models.Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/clients/", response_model=List[schemas.Client])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    clients = db.query(models.Client).offset(skip).limit(limit).all()
    return clients

@router.post("/servers/", response_model=schemas.Server)
def create_server(server: schemas.ServerCreate, db: Session = Depends(get_db)):
    db_server = models.Server(**server.dict())
    db.add(db_server)
    db.commit()
    db.refresh(db_server)
    return db_server

@router.get("/servers/", response_model=List[schemas.Server])
def read_servers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    servers = db.query(models.Server).offset(skip).limit(limit).all()
    return servers

@router.delete("/servers/{server_id}")
def delete_server(server_id: int, db: Session = Depends(get_db)):
    server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    db.delete(server)
    db.commit()
    return {"message": "Server deleted successfully"}

@router.post("/execute/", response_model=schemas.CommandResponse)
async def execute_command(request: schemas.CommandRequest, db: Session = Depends(get_db)):
    server = db.query(models.Server).filter(models.Server.id == request.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    # In a real app, we would retrieve the private key from the credentials table
    # For now, we assume the ssh_key_path is valid or we use password if stored
    
    # Check for credentials
    credential = db.query(models.Credential).filter(models.Credential.server_id == server.id).first()
    password = None
    # Decrypt password if available (logic to be added with security utils)
    
    stdout, stderr, exit_code = await ssh_service.execute_command(
        hostname=server.ip_address,
        username=server.ssh_username,
        command=request.command,
        private_key=server.ssh_key_path,
        port=server.ssh_port
    )
    
    return schemas.CommandResponse(stdout=stdout, stderr=stderr, exit_code=exit_code)
