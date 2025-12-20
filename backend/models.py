from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, JSON, Table, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base
import enum

# Enums for roles and permissions
class RoleType(str, enum.Enum):
    SUPERADMIN = "superadmin"  # Full system access
    ADMIN = "admin"  # Can manage users and groups
    GROUP_ADMIN = "group_admin"  # Can manage specific groups
    USER = "user"  # Basic user access

class PermissionType(str, enum.Enum):
    # Server permissions
    VIEW_SERVERS = "view_servers"
    CREATE_SERVERS = "create_servers"
    EDIT_SERVERS = "edit_servers"
    DELETE_SERVERS = "delete_servers"
    EXECUTE_COMMANDS = "execute_commands"
    
    # Group permissions
    VIEW_GROUPS = "view_groups"
    CREATE_GROUPS = "create_groups"
    EDIT_GROUPS = "edit_groups"
    DELETE_GROUPS = "delete_groups"
    
    # User permissions
    VIEW_USERS = "view_users"
    CREATE_USERS = "create_users"
    EDIT_USERS = "edit_users"
    DELETE_USERS = "delete_users"
    
    # Documentation permissions
    VIEW_DOCUMENTATION = "view_documentation"
    CREATE_DOCUMENTATION = "create_documentation"
    EDIT_DOCUMENTATION = "edit_documentation"
    DELETE_DOCUMENTATION = "delete_documentation"
    
    # System permissions
    VIEW_LOGS = "view_logs"
    MANAGE_SYSTEM = "manage_system"

# User Group Permission Model (for group-specific roles)
class UserGroupPermission(Base):
    __tablename__ = 'user_group_permissions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    group_id = Column(Integer, ForeignKey('server_groups.id', ondelete='CASCADE'), nullable=False)
    role = Column(String, default=RoleType.USER.value)  # Role within this group
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="group_permissions_detail")
    group = relationship("ServerGroup", back_populates="user_permissions_detail")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    microsoft_id = Column(String, unique=True, index=True, nullable=True)  # For Microsoft OAuth
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, default=RoleType.USER.value)  # Global role (SUPERADMIN, ADMIN only)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Notification preferences
    notify_new_users = Column(Boolean, default=True)  # Notify when new users register
    notify_security_alerts = Column(Boolean, default=True)  # Security-related notifications
    notify_new_servers = Column(Boolean, default=False)  # Notify when servers are added
    notify_system_events = Column(Boolean, default=True)  # General system events
    notify_version_updates = Column(Boolean, default=True)  # Notify when new versions are available
    
    # Language preference
    preferred_language = Column(String, default='en')  # User's preferred language for emails ('en' or 'es')
    
    # Relationships
    group_permissions_detail = relationship(
        "UserGroupPermission",
        back_populates="user",
        cascade="all, delete-orphan"
    )

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    servers = relationship("Server", back_populates="client")

class ServerGroup(Base):
    __tablename__ = "server_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    color = Column(String, nullable=True)  # For UI display (hex color)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    servers = relationship("Server", back_populates="group")
    creator = relationship("User", foreign_keys=[created_by])
    user_permissions_detail = relationship(
        "UserGroupPermission",
        back_populates="group",
        cascade="all, delete-orphan"
    )

class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String, index=True)
    ip_address = Column(String)
    client_id = Column(Integer, ForeignKey("clients.id"))
    group_id = Column(Integer, ForeignKey("server_groups.id"), nullable=True)
    description = Column(String, nullable=True)
    os_info = Column(String, nullable=True)
    
    # Connection details (stored securely ideally, simplified for MVP)
    ssh_port = Column(Integer, default=22)
    ssh_username = Column(String)
    ssh_password = Column(String, nullable=True)  # Encrypted
    ssh_key_path = Column(String, nullable=True)  # Encrypted
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Track who created the server
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("Client", back_populates="servers")
    group = relationship("ServerGroup", back_populates="servers")
    credentials = relationship("Credential", back_populates="server")
    logs = relationship("OperationLog", back_populates="server")

# Documentation Article Model
class DocumentationArticle(Base):
    __tablename__ = 'documentation_articles'
    
    id = Column(Integer, primary_key=True)
    slug = Column(String, unique=True, nullable=False, index=True)  # URL-friendly identifier
    title = Column(String, nullable=False)
    description = Column(Text)  # Short description for cards/lists
    content = Column(Text, nullable=False)  # Rich HTML content from TipTap
    icon = Column(String)  # Icon name from lucide-react
    category = Column(String, default="general")  # Category for organization
    order = Column(Integer, default=0)  # Display order
    published = Column(Boolean, default=False)  # Draft vs published
    
    # Author and timestamps
    author_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_edited_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    
    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    last_edited_by = relationship("User", foreign_keys=[last_edited_by_id])

class Credential(Base):
    __tablename__ = "credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"))
    type = Column(String) # 'ssh_password', 'db_password', 'api_key'
    username = Column(String, nullable=True)
    encrypted_value = Column(String) # Encrypted content
    
    server = relationship("Server", back_populates="credentials")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    
    id = Column(Integer, primary_key=True, index=True)
    problem_description = Column(Text)
    solution_description = Column(Text)
    command_executed = Column(Text, nullable=True)
    was_successful = Column(Boolean, default=True)
    
    # Vector embedding for semantic search (1536 dimensions for OpenAI ada-002, or 768 for others)
    # Let's assume 1536 for now
    embedding = Column(Vector(1536))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class OperationLog(Base):
    __tablename__ = "operation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Track who performed the action
    action = Column(String)
    output = Column(Text)
    status = Column(String) # 'success', 'failed', 'pending_approval'
    approved_by = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    server = relationship("Server", back_populates="logs")
    user = relationship("User")

class AuditLog(Base):
    """Track all administrative actions"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # 'create_user', 'delete_server', etc.
    resource_type = Column(String)  # 'user', 'server', 'group', etc.
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)  # Additional context
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")

class AllowedDomain(Base):
    """Domains allowed for user registration"""
    __tablename__ = "allowed_domains"
    
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    """System notifications for users"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(Text)
    type = Column(String, default="info") # info, warning, error, success
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", backref="notifications")

class SystemConfig(Base):
    """Dynamic system configuration"""
    __tablename__ = "system_config"
    
    key = Column(String, primary_key=True, index=True)
    value = Column(Text) # JSON encoded value
    category = Column(String, index=True) # ai, backend, frontend, communication
    is_secret = Column(Boolean, default=False) # If true, value is encrypted
    description = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class License(Base):
    """System license management"""
    __tablename__ = "licenses"
    
    id = Column(Integer, primary_key=True, index=True)
    license_key = Column(String, unique=True, index=True, nullable=False)
    license_type = Column(String, default="trial")  # trial, commercial, enterprise
    company_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    max_servers = Column(Integer, default=10)  # -1 for unlimited
    max_users = Column(Integer, default=5)  # -1 for unlimited
    
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    is_active = Column(Boolean, default=True)
    last_validated = Column(DateTime(timezone=True), nullable=True)
    validation_count = Column(Integer, default=0)
    
    # Installation tracking
    installation_id = Column(String, unique=True, nullable=True)  # Unique per installation
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ScheduledHealthCheck(Base):
    """Configuration for scheduled health checks"""
    __tablename__ = "scheduled_health_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Friendly name for this check
    
    # Target: either server_id OR group_id (not both)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=True)
    group_id = Column(Integer, ForeignKey("server_groups.id", ondelete="CASCADE"), nullable=True)
    
    # Schedule configuration
    schedule_type = Column(String, default="daily")  # 'daily', 'weekly', 'monthly', 'custom'
    cron_expression = Column(String, nullable=True)  # For custom schedules (e.g., "0 9 * * 1")
    schedule_hour = Column(Integer, default=9)  # Hour of day (0-23)
    schedule_minute = Column(Integer, default=0)  # Minute (0-59)
    schedule_day_of_week = Column(Integer, nullable=True)  # For weekly: 0=Monday, 6=Sunday
    schedule_day_of_month = Column(Integer, nullable=True)  # For monthly: 1-31
    
    # Email configuration
    email_recipients = Column(Text, nullable=False)  # Comma-separated email addresses
    
    # Status tracking
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime(timezone=True), nullable=True)
    next_run = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String, nullable=True)  # 'success', 'failed', 'running'
    
    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    server = relationship("Server", foreign_keys=[server_id])
    group = relationship("ServerGroup", foreign_keys=[group_id])
    creator = relationship("User", foreign_keys=[created_by])
    reports = relationship("HealthCheckReport", back_populates="scheduled_check", cascade="all, delete-orphan")


class HealthCheckReport(Base):
    """Stored health check reports for history and comparison"""
    __tablename__ = "health_check_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    scheduled_check_id = Column(Integer, ForeignKey("scheduled_health_checks.id", ondelete="CASCADE"), nullable=False)
    
    # Server identification (for group checks, one report per server)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="SET NULL"), nullable=True)
    server_hostname = Column(String, nullable=False)  # Cached hostname
    
    # Report content
    report_data = Column(JSON)  # Full diagnostic data
    ai_analysis = Column(Text, nullable=True)  # AI-generated analysis
    comparison_summary = Column(Text, nullable=True)  # Comparison with previous report
    
    # Metrics summary (for quick comparison)
    cpu_usage = Column(String, nullable=True)
    memory_usage = Column(String, nullable=True)
    disk_usage = Column(String, nullable=True)
    services_status = Column(String, nullable=True)  # 'all_ok', 'issues_found'
    
    # PDF storage
    pdf_filename = Column(String, nullable=True)  # Filename in reports directory
    
    # Status
    status = Column(String, default="completed")  # 'completed', 'failed', 'partial'
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    scheduled_check = relationship("ScheduledHealthCheck", back_populates="reports")
    server = relationship("Server", foreign_keys=[server_id])
