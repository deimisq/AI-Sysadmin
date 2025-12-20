from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas, dependencies
from services.ssh_service import ssh_service
from utils.encryption import encrypt_data
import csv
import io

router = APIRouter()


@router.post("/clients/", response_model=schemas.Client)
def create_client(client: schemas.ClientCreate, db: Session = Depends(dependencies.get_db)):
    db_client = models.Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/clients/", response_model=List[schemas.Client])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(dependencies.get_db)):
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
    db_group = models.ServerGroup(**group.dict(), created_by=current_user.id)
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
    # Superadmins and Admins can see all groups
    if current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]:
        groups = db.query(models.ServerGroup).offset(skip).limit(limit).all()
        return groups
    
    # Regular users can only see groups they have access to
    user_group_ids = [perm.group_id for perm in current_user.group_permissions_detail]
    
    if not user_group_ids:
        return []
        
    groups = db.query(models.ServerGroup).filter(
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
    
    # Validation removed to allow raw private keys
    # if server_data.get('ssh_key_path'): ...
    
    # Encrypt sensitive data before storing
    if server_data.get('ssh_password'):
        server_data['ssh_password'] = encrypt_data(server_data['ssh_password'])
    if server_data.get('ssh_key_path'):
        server_data['ssh_key_path'] = encrypt_data(server_data['ssh_key_path'])
    
    # Add owner information
    server_data['created_by'] = current_user.id
    
    db_server = models.Server(**server_data)
    db.add(db_server)
    db.commit()
    db.refresh(db_server)
    return db_server

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
    """
    Get servers based on user permissions:
    - Admins: See ALL servers
    - Users: See servers they created + servers in their assigned groups
    """
    # Superadmins and Admins can see all servers
    if current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]:
        servers = db.query(models.Server).offset(skip).limit(limit).all()
        return servers
    
    #Regular users see:
    # 1. Servers they created
    # 2. Servers in groups they belong to
    
    # Get IDs of groups the user belongs to
    user_group_ids = [perm.group_id for perm in current_user.group_permissions_detail]
    
    # Build query: servers created by user OR in their groups
    from sqlalchemy import or_
    
    query = db.query(models.Server).filter(
        or_(
            models.Server.created_by == current_user.id,  # Own servers
            models.Server.group_id.in_(user_group_ids) if user_group_ids else False  # Group servers
        )
    )
    
    servers = query.offset(skip).limit(limit).all()
    return servers

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
    
    # Check permissions
    is_admin = current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]
    is_owner = server.created_by == current_user.id
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=403,
            detail="You can only delete servers you created or be an admin"
        )
    
    db.delete(server)
    db.commit()
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
    
    # Check permissions
    is_admin = current_user.role in [models.RoleType.SUPERADMIN.value, models.RoleType.ADMIN.value]
    is_owner = db_server.created_by == current_user.id
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=403,
            detail="You can only edit servers you created or be an admin"
        )
    
    update_data = server_update.dict(exclude_unset=True)
    
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
    return db_server

@router.post("/execute/", response_model=schemas.CommandResponse)
async def execute_command(request: schemas.CommandRequest, db: Session = Depends(dependencies.get_db)):
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


# CSV Template Download
@router.get("/servers/csv-template")
async def download_csv_template():
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
                    models.ServerGroup.name == group_name
                ).first()
                
                if not group:
                    # Create new group
                    group = models.ServerGroup(
                        name=group_name,
                        description=f"Auto-created from CSV import",
                        created_by=current_user.id
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
                
                group_id = group.id
            
            # Prepare server data
            server_data = {
                "hostname": hostname,
                "ip_address": ip_address,
                "ssh_username": ssh_username,
                "description": row.get('description', '').strip() or None,
                "os_info": row.get('os_info', '').strip() or None,
                "client_id": default_client.id,
                "group_id": group_id
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
