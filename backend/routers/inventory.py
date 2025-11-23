from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas
from services.ssh_service import ssh_service
from utils.encryption import encrypt_data

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
    server_data = server.dict()
    
    # Validate SSH key path before encrypting
    if server_data.get('ssh_key_path'):
        ssh_key = server_data['ssh_key_path']
        # Check if user entered public key instead of path
        if ssh_key.startswith("ssh-rsa") or ssh_key.startswith("ssh-ed25519") or "AAAAB3NzaC" in ssh_key:
            raise HTTPException(
                status_code=400, 
                detail="SSH Key Path debe ser una ruta al archivo de clave privada (ej: /home/user/.ssh/id_rsa), no el contenido de la clave pública"
            )
    
    # Encrypt sensitive data before storing
    if server_data.get('ssh_password'):
        server_data['ssh_password'] = encrypt_data(server_data['ssh_password'])
    if server_data.get('ssh_key_path'):
        server_data['ssh_key_path'] = encrypt_data(server_data['ssh_key_path'])
    
    db_server = models.Server(**server_data)
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

@router.put("/servers/{server_id}", response_model=schemas.Server)
def update_server(server_id: int, server_update: schemas.ServerUpdate, db: Session = Depends(get_db)):
    db_server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    update_data = server_update.dict(exclude_unset=True)
    
    # Validate SSH key path if provided
    if update_data.get('ssh_key_path'):
        ssh_key = update_data['ssh_key_path']
        if ssh_key.startswith("ssh-rsa") or ssh_key.startswith("ssh-ed25519") or "AAAAB3NzaC" in ssh_key:
             raise HTTPException(
                status_code=400, 
                detail="SSH Key Path debe ser una ruta al archivo de clave privada, no el contenido de la clave pública"
            )
            
    # Encrypt sensitive data if they are being updated
    if update_data.get('ssh_password'):
        update_data['ssh_password'] = encrypt_data(update_data['ssh_password'])
    if update_data.get('ssh_key_path'):
        update_data['ssh_key_path'] = encrypt_data(update_data['ssh_key_path'])
        
    for key, value in update_data.items():
        setattr(db_server, key, value)
        
    db.commit()
    db.refresh(db_server)
    return db_server

@router.post("/execute/", response_model=schemas.CommandResponse)
async def execute_command(request: schemas.CommandRequest, db: Session = Depends(get_db)):
    server = db.query(models.Server).filter(models.Server.id == request.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    # Decrypt SSH credentials before using them
    from utils.encryption import decrypt_data
    
    ssh_key_path = None
    password = None
    auth_method = "None"
    
    # Decrypt SSH key path if available
    if server.ssh_key_path:
        ssh_key_path = decrypt_data(server.ssh_key_path)
        auth_method = f"SSH Key: {ssh_key_path}"
    
    # Decrypt password if available
    if server.ssh_password:
        password = decrypt_data(server.ssh_password)
        if auth_method == "None":
            auth_method = "Password"
        else:
            auth_method += " + Password"
    
    stdout, stderr, exit_code = await ssh_service.execute_command(
        hostname=server.ip_address,
        username=server.ssh_username,
        command=request.command,
        private_key=ssh_key_path,
        password=password,
        port=server.ssh_port
    )
    
    return schemas.CommandResponse(
        stdout=stdout,
        stderr=stderr,
        exit_code=exit_code,
        hostname=server.ip_address,
        username=server.ssh_username,
        command=request.command,
        auth_method=auth_method
    )
