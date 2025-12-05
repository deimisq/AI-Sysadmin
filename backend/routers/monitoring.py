from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import database, models, schemas, dependencies
from services.ssh_service import ssh_service
from utils.encryption import decrypt_data
import re

router = APIRouter()

async def get_server_connection_details(server_id: int, db: Session):
    server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    ssh_key_path = None
    password = None
    
    if server.ssh_key_path:
        ssh_key_path = decrypt_data(server.ssh_key_path)
    
    if server.ssh_password:
        password = decrypt_data(server.ssh_password)
        
    return server, ssh_key_path, password

@router.get("/servers/{server_id}/stats")
async def get_server_stats(
    server_id: int, 
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """Get real-time server statistics (CPU, RAM, Disk)"""
    server, ssh_key_path, password = await get_server_connection_details(server_id, db)
    
    # Command to get all stats in one go to minimize latency
    # 1. CPU: top -bn1 | grep "Cpu(s)"
    # 2. RAM: free -m | grep Mem
    # 3. Disk: df -h / | tail -1
    cmd = 'top -bn1 | grep "Cpu(s)" && free -m | grep Mem && df -h / | tail -1'
    
    stdout, stderr, exit_code = await ssh_service.execute_command(
        hostname=server.ip_address,
        username=server.ssh_username,
        command=cmd,
        private_key=ssh_key_path,
        password=password,
        port=server.ssh_port
    )
    
    if exit_code != 0:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {stderr}")
    
    lines = stdout.strip().split('\n')
    stats = {
        "cpu": 0,
        "memory": 0,
        "disk": 0
    }
    
    try:
        # Parse CPU
        # Example: %Cpu(s):  0.0 us,  0.0 sy,  0.0 ni, 100.0 id, ...
        # We want 100 - id (idle)
        cpu_line = lines[0]
        idle_match = re.search(r'(\d+\.\d+)\s+id', cpu_line)
        if idle_match:
            idle = float(idle_match.group(1))
            stats["cpu"] = round(100 - idle, 1)
            
        # Parse RAM
        # Example: Mem:           7961        1234        5678 ...
        # Total Used Free ...
        ram_line = lines[1]
        ram_parts = ram_line.split()
        total_ram = int(ram_parts[1])
        used_ram = int(ram_parts[2])
        stats["memory"] = round((used_ram / total_ram) * 100, 1)
        
        # Parse Disk
        # Example: /dev/sda1        20G   10G   10G  50% /
        disk_line = lines[2]
        disk_parts = disk_line.split()
        # Use percentage (usually 5th column, remove %)
        use_pct = disk_parts[4].replace('%', '')
        stats["disk"] = int(use_pct)
        
    except Exception as e:
        print(f"Error parsing stats: {e}")
        # Return partial stats or zeros if parsing fails
        pass
        
    return stats

@router.get("/servers/{server_id}/files")
async def list_files(
    server_id: int, 
    path: str = "/",
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """List files in a directory"""
    server, ssh_key_path, password = await get_server_connection_details(server_id, db)
    
    # ls -la --group-directories-first --time-style=long-iso
    # We need to sanitize path to prevent injection, though paramiko handles some
    # Simple check:
    if ';' in path or '|' in path:
         raise HTTPException(status_code=400, detail="Invalid path")
         
    cmd = f'ls -la --group-directories-first --time-style=long-iso "{path}"'
    
    stdout, stderr, exit_code = await ssh_service.execute_command(
        hostname=server.ip_address,
        username=server.ssh_username,
        command=cmd,
        private_key=ssh_key_path,
        password=password,
        port=server.ssh_port
    )
    
    if exit_code != 0:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {stderr}")
        
    files = []
    lines = stdout.strip().split('\n')
    # Skip first line (total)
    for line in lines[1:]:
        parts = line.split()
        if len(parts) < 8:
            continue
            
        # drwxr-xr-x 2 root root 4096 2023-01-01 12:00 .
        permissions = parts[0]
        is_dir = permissions.startswith('d')
        size = parts[4]
        date = f"{parts[5]} {parts[6]}"
        name = " ".join(parts[7:])
        
        if name == '.' or name == '..':
            continue
            
        files.append({
            "name": name,
            "is_dir": is_dir,
            "size": size,
            "date": date,
            "permissions": permissions
        })
        
    return {"path": path, "files": files}
