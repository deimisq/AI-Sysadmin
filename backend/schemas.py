from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Authentication Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "user"
    is_active: Optional[bool] = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

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

class ServerGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None

class ServerGroupCreate(ServerGroupBase):
    pass

class ServerGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class ServerGroup(ServerGroupBase):
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
    group_id: Optional[int] = None

class ServerUpdate(BaseModel):
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    description: Optional[str] = None
    os_info: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_key_path: Optional[str] = None
    group_id: Optional[int] = None

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
    group_id: Optional[int] = None
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
    # Diagnostic information
    hostname: Optional[str] = None
    username: Optional[str] = None
    command: Optional[str] = None
    auth_method: Optional[str] = None

class AllowedDomainBase(BaseModel):
    domain: str
    description: Optional[str] = None
    is_active: bool = True

class AllowedDomainCreate(AllowedDomainBase):
    pass

class AllowedDomainUpdate(BaseModel):
    domain: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class AllowedDomain(AllowedDomainBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "info"

class NotificationCreate(NotificationBase):
    user_id: int

class Notification(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

class SystemConfigBase(BaseModel):
    key: str
    value: str
    category: str
    is_secret: bool = False
    description: Optional[str] = None

class SystemConfigCreate(SystemConfigBase):
    pass

class SystemConfigUpdate(BaseModel):
    value: str

class SystemConfig(SystemConfigBase):
    updated_at: datetime
    class Config:
        from_attributes = True
