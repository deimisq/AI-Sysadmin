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
    ssh_key_path: Optional[str] = None

class ServerCreate(ServerBase):
    client_id: int

class Server(ServerBase):
    id: int
    client_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class CommandRequest(BaseModel):
    server_id: int
    command: str

class CommandResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
