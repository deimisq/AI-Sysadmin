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
    preferred_language: Optional[str] = "en"
    organization_id: Optional[int] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    preferred_language: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserGroupPermissionBase(BaseModel):
    group_id: int
    role: str = "user"  # user, group_admin

class UserGroupPermissionCreate(UserGroupPermissionBase):
    pass

class UserGroupPermission(UserGroupPermissionBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    is_active: bool
    role: str
    created_at: datetime
    group_permissions_detail: List[UserGroupPermission] = []
    notify_new_users: Optional[bool] = True
    notify_security_alerts: Optional[bool] = True
    notify_new_servers: Optional[bool] = False
    notify_system_events: Optional[bool] = True
    notify_version_updates: Optional[bool] = True
    preferred_language: Optional[str] = "en"
    organization_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Organization Schemas
class OrganizationBase(BaseModel):
    name: str
    slug: str
    subscription_tier: Optional[str] = "free"
    max_users: Optional[int] = 1

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    subscription_tier: Optional[str] = None
    max_users: Optional[int] = None

class Organization(OrganizationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class NotificationPreferences(BaseModel):
    notify_new_users: bool = True
    notify_security_alerts: bool = True
    notify_new_servers: bool = False
    notify_system_events: bool = True
    notify_version_updates: bool = True

# Client Schemas
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

# Server Group Schemas
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
    created_by: Optional[int] = None
    created_at: datetime
    organization_id: Optional[int] = None
    class Config:
        from_attributes = True

# Server Schemas
class ServerBase(BaseModel):
    hostname: str
    ip_address: str
    ssh_username: str
    ssh_password: Optional[str] = None
    ssh_key_path: Optional[str] = None
    description: Optional[str] = None
    os_info: Optional[str] = None
    client_id: Optional[int] = None
    group_id: Optional[int] = None

class ServerCreate(ServerBase):
    pass

class ServerUpdate(BaseModel):
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_key_path: Optional[str] = None
    description: Optional[str] = None
    os_info: Optional[str] = None
    client_id: Optional[int] = None
    group_id: Optional[int] = None

class Server(ServerBase):
    id: int
    created_at: datetime
    organization_id: Optional[int] = None
    class Config:
        from_attributes = True



# Diagnostic Schemas
class DiagnosticRequest(BaseModel):
    server_id: int
    problem_description: str
    language: str = "en"

class DiagnosticResponse(BaseModel):
    diagnosis: str
    suggested_commands: Optional[List[str]] = None

# Command Execution Schemas
class CommandExecutionRequest(BaseModel):
    server_id: int
    command: str

# Alias for backwards compatibility
CommandRequest = CommandExecutionRequest

class CommandExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    hostname: Optional[str] = None
    username: Optional[str] = None
    command: Optional[str] = None
    auth_method: Optional[str] = None

# Alias for backwards compatibility
CommandResponse = CommandExecutionResponse

# Audit Log Schemas
class AuditLogBase(BaseModel):
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    details: Optional[str] = None

class AuditLog(AuditLogBase):
    id: int
    user_id: int
    username: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Allowed Domain Schemas
class AllowedDomainBase(BaseModel):
    domain: str
    description: Optional[str] = None

class AllowedDomainCreate(AllowedDomainBase):
    pass

class AllowedDomain(AllowedDomainBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Notification Schemas
class NotificationBase(BaseModel):
    message: str
    type: str = "info"
    is_read: bool = False

class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# System Config Schemas
class SystemConfigBase(BaseModel):
    key: str
    value: str
    category: str = "general"
    is_secret: bool = False
    description: Optional[str] = None

class SystemConfigCreate(SystemConfigBase):
    pass

class SystemConfigUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None

class SystemConfig(SystemConfigBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
