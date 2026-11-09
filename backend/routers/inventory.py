from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import database, models, schemas, dependencies
from services.ssh_service import ssh_service
from services.ai_service import ai_service
from services.diagnostic_service import diagnostic_service
from services.ansible_service import ansible_service
from services.audit_service import audit_service
from utils.encryption import encrypt_data, decrypt_data
import csv
import io
import logging
from utils.access import require_server_access, require_group_access, server_query, is_global_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/clients/", response_model=schemas.Client)
def create_client(client: schemas.ClientCreate, db: Session = Depends(dependencies.get_db),
                  current_user: models.User = Depends(dependencies.get_current_superuser)):
    db_client = models.Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/clients/", response_model=List[schemas.Client])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(dependencies.get_db),
                 current_user: models.User = Depends(dependencies.get_current_superuser)):
    clients = db.query(models.Client).offset(skip).limit(limit).all()
    return clients

# Server Groups endpoints
@router.post("/groups/", response_model=schemas.ServerGroup)
def create_group(
    group: schemas.ServerGroupCreate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """Create a new server group"""
    group_data = group.dict()
    
    # Determine organization_id
    # Default to current user's org
    org_id = current_user.organization_id
    
    # Allow superadmins to specify organization
    if current_user.is_superuser and group_data.get('organization_id'):
        org_id = group_data['organization_id']
        
    # Enforce organization_id in input data
    group_data['organization_id'] = org_id

    db_group = models.ServerGroup(
        **group_data, 
        created_by=current_user.id
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/groups/", response_model=List[schemas.ServerGroup])
def read_groups(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """Get groups - admins see all, users see only their assigned groups"""
    # Superadmins can see all groups globally
    if current_user.is_superuser:
        groups = db.query(models.ServerGroup).offset(skip).limit(limit).all()
        return groups
    
    # Base query filtered by organization
    query = db.query(models.ServerGroup)
    query = query.filter(models.ServerGroup.organization_id == current_user.organization_id)
        
    # Org Admins see all groups in their org
    if current_user.role == models.RoleType.ADMIN.value:
        return query.offset(skip).limit(limit).all()
    
    # Regular users can only see groups they have access to
    user_group_ids = [perm.group_id for perm in current_user.group_permissions_detail]
    
    if not user_group_ids:
        return []
        
    groups = query.filter(
        models.ServerGroup.id.in_(user_group_ids)
    ).offset(skip).limit(limit).all()
    
    return groups

@router.put("/groups/{group_id}", response_model=schemas.ServerGroup)
def update_group(
    group_id: int,
    group_update: schemas.ServerGroupUpdate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """Update a group - only creator or admins can edit"""
    db_group = db.query(models.ServerGroup).filter(models.ServerGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Org check
    if not current_user.is_superuser:
        if db_group.organization_id is not None and db_group.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Group not found")
    
    # Check permissions: only creator or admins can edit
    is_admin = current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]
    is_creator = db_group.created_by == current_user.id
    
    if not (is_admin or is_creator):
        raise HTTPException(
            status_code=403,
            detail="You can only edit groups you created or be an admin"
        )
    
    update_data = group_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        # Only superusers can change organization
        if key == 'organization_id' and not current_user.is_superuser:
            continue
        setattr(db_group, key, value)
        
    db.commit()
    db.refresh(db_group)
    return db_group

@router.delete("/groups/{group_id}")
def delete_group(
    group_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """Delete a group - only creator or admins can delete"""
    db_group = db.query(models.ServerGroup).filter(models.ServerGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Org check
    if not current_user.is_superuser:
        if db_group.organization_id is not None and db_group.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Group not found")
    
    # Check permissions: only creator or admins can delete
    is_admin = current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]
    is_creator = db_group.created_by == current_user.id
    
    if not (is_admin or is_creator):
        raise HTTPException(
            status_code=403,
            detail="You can only delete groups you created or be an admin"
        )
    
    # Check if group has servers
    if db_group.servers:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete group with {len(db_group.servers)} servers. Remove servers from group first."
        )
    
    db.delete(db_group)
    db.commit()
    return {"message": "Group deleted successfully"}

@router.post("/servers/", response_model=schemas.Server)
def create_server(
    server: schemas.ServerCreate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """Create a new server - all authenticated users can create servers"""
    server_data = server.dict()
    require_group_access(current_user, server_data.get("group_id"), db)
    
    # Validation removed to allow raw private keys
    # if server_data.get('ssh_key_path'): ...
    
    # Encrypt sensitive data before storing
    if server_data.get('ssh_password'):
        server_data['ssh_password'] = encrypt_data(server_data['ssh_password'])
    if server_data.get('ssh_key_path'):
        server_data['ssh_key_path'] = encrypt_data(server_data['ssh_key_path'])
    
    # Add owner information
    server_data['created_by'] = current_user.id
    server_data['organization_id'] = current_user.organization_id
    
    db_server = models.Server(**server_data)
    db.add(db_server)
    db.commit()
    db.refresh(db_server)
    
    # Audit Log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="create_server",
        resource_type="server",
        resource_id=db_server.id,
        details={"hostname": db_server.hostname, "ip": db_server.ip_address}
    )

    return db_server


# CSV Template Download - MUST be before /servers/{server_id}
@router.get("/servers/csv-template")
async def download_csv_template(
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """
    Download a CSV template for bulk server import.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row with all fields
    headers = [
        "hostname",
        "ip_address", 
        "ssh_username",
        "ssh_password",
        "ssh_key_path",
        "description",
        "os_info",
        "group_name"  # Will create group if doesn't exist
    ]
    writer.writerow(headers)
    
    # Example rows
    writer.writerow([
        "webserver-01",
        "192.168.1.10",
        "admin",
        "mypassword123",
        "",
        "Production web server",
        "Ubuntu 22.04",
        "Production Servers"
    ])
    writer.writerow([
        "dbserver-01",
        "192.168.1.20",
        "root",
        "",
        "/home/user/.ssh/id_rsa",
        "Database server",
        "Debian 12",
        "Database Servers"
    ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=servers_template.csv"
        }
    )


@router.get("/servers/{server_id}", response_model=schemas.Server)
def get_server(
    server_id: int,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """Get a single server by ID"""
    server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)
    
    # Org check - allow if both are None or if they match
    if not current_user.is_superuser:
        if not (server.organization_id == current_user.organization_id or 
                (server.organization_id is None and current_user.organization_id is None)):
            raise HTTPException(status_code=404, detail="Server not found")
    
    # Check permissions
    if current_user.role not in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]:
        # Check if user has access to this server's group
        if server.group_id:
            permission = db.query(models.UserGroupPermission).filter(
                models.UserGroupPermission.user_id == current_user.id,
                models.UserGroupPermission.group_id == server.group_id
            ).first()
            if not permission:
                raise HTTPException(status_code=403, detail="Access denied to this server")
    
    return server

@router.get("/servers/", response_model=List[schemas.Server])
def read_servers(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """List only servers visible under the shared tenant policy."""
    return server_query(current_user, db).offset(skip).limit(limit).all()

@router.delete("/servers/{server_id}")
def delete_server(
    server_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """Delete a server - users can only delete their own servers, admins can delete any"""
    server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)
    
    # Org check
    if not current_user.is_superuser:
        if server.organization_id is not None and server.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Server not found")
    
    # Check permissions
    is_admin = current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]
    is_owner = server.created_by == current_user.id
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=403,
            detail="You can only delete servers you created or be an admin"
        )
    
    server_info = {"hostname": server.hostname, "ip": server.ip_address}
    db.delete(server)
    db.commit()
    
    # Audit Log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="delete_server",
        resource_type="server",
        resource_id=server_id,
        details=server_info
    )

    return {"message": "Server deleted successfully"}

@router.put("/servers/{server_id}", response_model=schemas.Server)
def update_server(
    server_id: int,
    server_update: schemas.ServerUpdate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """Update a server - users can only edit their own servers, admins can edit any"""
    db_server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, db_server, db)
        
    # Org check
    if not current_user.is_superuser:
        if db_server.organization_id is not None and db_server.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Server not found")
    
    # Check permissions
    is_admin = current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]
    is_owner = db_server.created_by == current_user.id
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=403,
            detail="You can only edit servers you created or be an admin"
        )
    
    update_data = server_update.dict(exclude_unset=True)
    if "group_id" in update_data:
        require_group_access(current_user, update_data["group_id"], db)
    
    # Validation removed to allow raw private keys
    # if update_data.get('ssh_key_path'): ...
            
    # Encrypt sensitive data if they are being updated
    if update_data.get('ssh_password'):
        update_data['ssh_password'] = encrypt_data(update_data['ssh_password'])
    if update_data.get('ssh_key_path'):
        update_data['ssh_key_path'] = encrypt_data(update_data['ssh_key_path'])
        
    for key, value in update_data.items():
        setattr(db_server, key, value)
        
    db.commit()
    db.refresh(db_server)
    
    # Audit Log
    safe_details = {k: v for k, v in update_data.items() if k not in ['ssh_password', 'ssh_key_path']}
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="update_server",
        resource_type="server",
        resource_id=db_server.id,
        details=safe_details
    )

    return db_server

@router.get("/servers/{server_id}/credentials")
def get_server_credentials(
    server_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """Get decrypted credentials for direct SSH connection (Desktop only)"""
    db_server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, db_server, db)
    
    # Org check
    if not current_user.is_superuser:
        if db_server.organization_id is not None and db_server.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Server not found")
    
    # Permission check
    is_admin = current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]
    is_owner = db_server.created_by == current_user.id
    
    if not (is_admin or is_owner):
        raise HTTPException(status_code=403, detail="Access denied")

    # Decrypt credentials
    decrypted_password = decrypt_data(db_server.ssh_password) if db_server.ssh_password else None
    decrypted_key = decrypt_data(db_server.ssh_key_path) if db_server.ssh_key_path else None

    return {
        "ip_address": db_server.ip_address,
        "ssh_username": db_server.ssh_username,
        "ssh_password": decrypted_password,
        "ssh_key_path": decrypted_key,
        "ssh_port": db_server.ssh_port or 22
    }



@router.post("/execute/", response_model=schemas.CommandResponse)
async def execute_command(
    request: schemas.CommandRequest, 
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    server = db.query(models.Server).filter(models.Server.id == request.server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)
    
    # Org check
    if not current_user.is_superuser:
        if server.organization_id is not None and server.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Server not found")
    
    # Decrypt SSH credentials before using them
    from utils.encryption import decrypt_data
    
    ssh_key_path = None
    password = None
    auth_method = "None"
    
    # Decrypt SSH key path if available
    if server.ssh_key_path:
        ssh_key_path = decrypt_data(server.ssh_key_path)
        auth_method = "SSH Key"
    
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



# CSV Import
@router.post("/servers/import-csv")
async def import_servers_from_csv(
    file: UploadFile = File(...),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    db: Session = Depends(dependencies.get_db)
):
    """
    Import servers from a CSV file.
    
    - Creates groups if they don't exist
    - Assigns group_admin role to uploader for new groups (if not superadmin/admin)
    - Returns summary of imported servers
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    
    # Parse CSV
    reader = csv.DictReader(io.StringIO(decoded))
    
    results = {
        "success": [],
        "errors": [],
        "groups_created": [],
        "total_processed": 0
    }
    
    # Get or create default client
    default_client = db.query(models.Client).first()
    if not default_client:
        default_client = models.Client(name="Default Client", description="Auto-created")
        db.add(default_client)
        db.commit()
        db.refresh(default_client)
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        results["total_processed"] += 1
        
        try:
            # Validate required fields
            hostname = row.get('hostname', '').strip()
            ip_address = row.get('ip_address', '').strip()
            ssh_username = row.get('ssh_username', '').strip()
            
            if not hostname or not ip_address or not ssh_username:
                results["errors"].append({
                    "row": row_num,
                    "error": "Missing required fields (hostname, ip_address, ssh_username)"
                })
                continue
            
            # Check for auth method
            ssh_password = row.get('ssh_password', '').strip()
            ssh_key_path = row.get('ssh_key_path', '').strip()
            
            if not ssh_password and not ssh_key_path:
                results["errors"].append({
                    "row": row_num,
                    "hostname": hostname,
                    "error": "Must provide either ssh_password or ssh_key_path"
                })
                continue
            
            # Handle group
            group_id = None
            group_name = row.get('group_name', '').strip()
            
            if group_name:
                # Check if group exists
                group = db.query(models.ServerGroup).filter(
                    models.ServerGroup.name == group_name,
                    models.ServerGroup.organization_id == current_user.organization_id
                ).first()
                
                if not group:
                    # Create new group
                    group = models.ServerGroup(
                        name=group_name,
                        description=f"Auto-created from CSV import",
                        created_by=current_user.id,
                        organization_id=current_user.organization_id
                    )
                    db.add(group)
                    db.commit()
                    db.refresh(group)
                    
                    results["groups_created"].append(group_name)
                    
                    # If user is not superadmin or admin, assign group_admin role
                    if current_user.role not in ['superadmin', 'admin']:
                        permission = models.UserGroupPermission(
                            user_id=current_user.id,
                            group_id=group.id,
                            role='group_admin'
                        )
                        db.add(permission)
                        db.commit()
                
                require_group_access(current_user, group.id, db)
                group_id = group.id
            
            # Prepare server data
            server_data = {
                "hostname": hostname,
                "ip_address": ip_address,
                "ssh_username": ssh_username,
                "description": row.get('description', '').strip() or None,
                "os_info": row.get('os_info', '').strip() or None,
                "client_id": default_client.id,
                "group_id": group_id,
                "organization_id": current_user.organization_id,
                "created_by": current_user.id
            }
            
            # Encrypt sensitive data
            if ssh_password:
                server_data["ssh_password"] = encrypt_data(ssh_password)
            if ssh_key_path:
                # Validate it's a path, not a key
                if ssh_key_path.startswith("ssh-rsa") or ssh_key_path.startswith("ssh-ed25519"):
                    results["errors"].append({
                        "row": row_num,
                        "hostname": hostname,
                        "error": "ssh_key_path should be a file path, not the key content"
                    })
                    continue
                server_data["ssh_key_path"] = encrypt_data(ssh_key_path)
            
            # Create server
            db_server = models.Server(**server_data)
            db.add(db_server)
            db.commit()
            
            results["success"].append({
                "row": row_num,
                "hostname": hostname,
                "ip_address": ip_address,
                "group": group_name or "No group"
            })
            
        except Exception as e:
            db.rollback()
            results["errors"].append({
                "row": row_num,
                "hostname": row.get('hostname', 'unknown'),
                "error": str(e)
            })
    
    return {
        "message": f"Import completed. {len(results['success'])} servers added, {len(results['errors'])} errors.",
        "details": results
    }


@router.get("/servers/{server_id}/diagnostic")
async def get_server_diagnostic(
    server_id: int,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """Get real-time diagnostic information from a server via SSH"""
    from datetime import datetime
    
    # Get server from database
    server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)
        
    # Org check
    if not current_user.is_superuser:
        if server.organization_id is not None and server.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Server not found")
    
    # Decrypt SSH credentials before using them
    ssh_key_path = None
    password = None
    
    # Decrypt SSH key path if available
    if server.ssh_key_path:
        ssh_key_path = decrypt_data(server.ssh_key_path)
    
    # Decrypt SSH password if exists
    if server.ssh_password:
        password = decrypt_data(server.ssh_password)
    
    try:
        # Get uptime
        stdout, stderr, exit_code = await ssh_service.execute_command(
            hostname=server.ip_address,
            username=server.ssh_username,
            command="uptime -p",
            private_key=ssh_key_path,
            password=password,
            port=server.ssh_port or 22
        )
        if exit_code != 0:
            raise Exception(f"Uptime command failed: {stderr}")
        uptime = stdout.strip().replace("up ", "").replace(",", "")
        
        # Get CPU usage
        stdout, stderr, exit_code = await ssh_service.execute_command(
            hostname=server.ip_address,
            username=server.ssh_username,
            command="top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | sed 's/%us.*//' | sed 's/us.*//'",
            private_key=ssh_key_path,
            password=password,
            port=server.ssh_port or 22
        )
        cpu_usage = int(float(stdout.strip())) if stdout.strip() and exit_code == 0 else 0
        
        # Get Memory usage
        stdout, stderr, exit_code = await ssh_service.execute_command(
            hostname=server.ip_address,
            username=server.ssh_username,
            command="free | grep Mem | awk '{printf \"%.0f\", ($3/$2) * 100}'",
            private_key=ssh_key_path,
            password=password,
            port=server.ssh_port or 22
        )
        memory_usage = int(stdout.strip()) if stdout.strip() and exit_code == 0 else 0
        
        # Get Disk usage
        stdout, stderr, exit_code = await ssh_service.execute_command(
            hostname=server.ip_address,
            username=server.ssh_username,
            command="df -h / | tail -1 | awk '{print $5}' | sed 's/%//'",
            private_key=ssh_key_path,
            password=password,
            port=server.ssh_port or 22
        )
        disk_usage = int(stdout.strip()) if stdout.strip() and exit_code == 0 else 0
        
        # Get detailed storage info (partitions)
        partitions = []
        stdout, stderr, exit_code = await ssh_service.execute_command(
            hostname=server.ip_address,
            username=server.ssh_username,
            command="df -h --output=source,size,used,avail,pcent,target 2>/dev/null || df -h | awk '{print $1 \" \" $2 \" \" $3 \" \" $4 \" \" $5 \" \" $6}'",
            private_key=ssh_key_path,
            password=password,
            port=server.ssh_port or 22
        )
        
        if stdout and exit_code == 0:
            lines = stdout.strip().split('\n')
            # Skip header if present
            if lines and ("Filesystem" in lines[0] or "S.ficheros" in lines[0]):
                lines = lines[1:]
            
            for line in lines:
                parts = line.split()
                if len(parts) >= 6:
                    # Filter out tmpfs, devtmpfs, loop, etc to keep it clean if desired
                    # But usually showing filtered /dev/ is better or physical disks
                    fs = parts[0]
                    if not fs.startswith('/dev/'): 
                        continue
                        
                    partitions.append({
                        "filesystem": parts[0],
                        "size": parts[1],
                        "used": parts[2],
                        "available": parts[3],
                        "use_percentage": parts[4],
                        "mount": parts[5]
                    })
        
        return {
            "status": "online",
            "uptime": uptime,
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "disk_usage": disk_usage,
            "partitions": partitions,
            "last_check": datetime.now().isoformat()
        }
        
    except Exception as e:
        # If SSH fails, return error status
        return {
            "status": "error",
            "error": str(e),
            "last_check": datetime.now().isoformat()
        }


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatDiagnoseRequest(BaseModel):
    description: str
    locale: str = "es"
    history: list[ChatMessage] = []
    context_consent_version: Optional[str] = None

class ChatExecuteRequest(BaseModel):
    command: str

@router.post("/servers/{server_id}/diagnose")
async def diagnose_server_problem_chat(
    server_id: int, 
    request: ChatDiagnoseRequest, 
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)
    if request.context_consent_version != "2026-10-25":
        raise HTTPException(status_code=428, detail="Accept the infrastructure AI context notice before diagnosing")

    # Org check
    if not current_user.is_superuser:
        if server.organization_id is not None and server.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Server not found")

    try:
        # Gather diagnostics first
        logger.info(f"Gathering diagnostics for server {server.hostname} for AI Chat")
        
        ssh_password = decrypt_data(server.ssh_password) if server.ssh_password else None
        ssh_key = decrypt_data(server.ssh_key_path) if server.ssh_key_path else None
        
        diagnostics = {}
        if ssh_password or ssh_key:
            try:
                diagnostics = diagnostic_service.gather_system_info(server, ssh_password, ssh_key)
            except Exception as diag_error:
                logger.error(f"Diagnostic gathering failed: {diag_error}")
                diagnostics = {"error": str(diag_error), "checks": {}}
        
        # Build context
        has_embedded_results = "Exit" in request.description or "Output" in request.description
        
        diagnostic_summary = f"""
Server: {server.hostname} ({server.ip_address})
OS: {server.os_info}

DIAGNOSTIC RESULTS:
"""
        if diagnostics.get("checks"):
            for check_name, result in diagnostics.get("checks", {}).items():
                if result.get("success"):
                    diagnostic_summary += f"\n{check_name.upper()}:\n{result['output']}\n"
        
        server_info = f"Hostname: {server.hostname}, OS: {server.os_info}, IP: {server.ip_address}"
        full_context = f"{server_info}\n\n{diagnostic_summary}\n\nUSER QUERY:\n{request.description}"
        
        response_data = ai_service.analyze_problem(
            db, 
            request.description, 
            full_context, 
            request.locale,
            history=[m.dict() for m in request.history]
        )
        
        return {
            "analysis": response_data,
            "diagnostics": diagnostics if not has_embedded_results else None
        }
        
    except Exception as e:
        logger.error(f"Chat diagnosis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/servers/{server_id}/execute")
async def execute_server_command_chat(
    server_id: int,
    request: ChatExecuteRequest,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)

    # Decrypt credentials
    ssh_password = decrypt_data(server.ssh_password) if server.ssh_password else None
    ssh_key = decrypt_data(server.ssh_key_path) if server.ssh_key_path else None
    
    try:
        stdout, stderr, exit_code = await ssh_service.execute_command(
            hostname=server.ip_address,
            username=server.ssh_username,
            command=request.command,
            private_key=ssh_key,
            password=ssh_password,
            port=server.ssh_port
        )
        
        # Audit Log
        audit_service.log_action(
            db=db,
            user_id=current_user.id,
            action="execute_command",
            resource_type="server",
            resource_id=server.id,
            details={"command": request.command, "exit_code": exit_code}
        )

        return {
            "stdout": stdout,
            "stderr": stderr,
            "output": stdout + (stderr if stderr else ""),
            "exit_code": exit_code
        }
        
    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
