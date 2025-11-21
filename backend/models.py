from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    servers = relationship("Server", back_populates="client")

class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String, index=True)
    ip_address = Column(String)
    client_id = Column(Integer, ForeignKey("clients.id"))
    description = Column(String, nullable=True)
    os_info = Column(String, nullable=True)
    
    # Connection details (stored securely ideally, simplified for MVP)
    ssh_port = Column(Integer, default=22)
    ssh_username = Column(String)
    # In a real app, this should be encrypted or stored in Vault
    ssh_key_path = Column(String, nullable=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="servers")
    credentials = relationship("Credential", back_populates="server")
    logs = relationship("OperationLog", back_populates="server")

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
    action = Column(String)
    output = Column(Text)
    status = Column(String) # 'success', 'failed', 'pending_approval'
    approved_by = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    server = relationship("Server", back_populates="logs")
