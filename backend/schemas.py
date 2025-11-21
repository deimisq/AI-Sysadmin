from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ClientBase(BaseModel):
    name: str
    description: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ServerBase(BaseModel):
    hostname: str
    ip_address: str
    description: Optional[str] = None
    os_info: Optional[str] = None
    ssh_port: int = 22
    ssh_username: str
    ssh_password: Optional[str] = None
    ssh_key_path: Optional[str] = None

class ServerCreate(ServerBase):
    client_id: int

# Response model - excludes sensitive data
class Server(BaseModel):
    id: int
    hostname: str
    ip_address: str
    description: Optional[str] = None
    os_info: Optional[str] = None
    ssh_port: int
    ssh_username: str
    client_id: int
    created_at: datetime
    # Note: ssh_password and ssh_key_path are intentionally excluded for security
    class Config:
        from_attributes = True

class CommandRequest(BaseModel):
    server_id: int
    command: str

class CommandResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
