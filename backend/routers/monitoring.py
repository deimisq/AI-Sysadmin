from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import database, models, schemas, dependencies
from services.ssh_service import ssh_service
from utils.encryption import decrypt_data
from utils.access import require_server_access
import re

router = APIRouter()

async def get_server_connection_details(server_id: int, db: Session, current_user: models.User):
    server = db.query(models.Server).filter(models.Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    require_server_access(current_user, server, db)
    
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
    server, ssh_key_path, password = await get_server_connection_details(server_id, db, current_user)
    
    # Command to get all stats in one go to minimize latency
    # 1. CPU: top -bn1 | grep "Cpu(s)"
    # 2. RAM: free -m | grep Mem
    # 3. Disk: df -h / | tail -1
    cmd = 'export LC_ALL=C; top -bn1 | grep "Cpu(s)" && free -m | grep Mem && df -h / | tail -1'
    
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
        "cpu": None,
        "memory": None,
        "disk": None
    }
    
    try:
        # Parse CPU
        # Example: %Cpu(s):  0.0 us,  0.0 sy,  0.0 ni, 100.0 id, ...
        # We want 100 - id (idle)
        cpu_line = lines[0]
        idle_match = re.search(r'(\d+(?:\.\d+)?)\s+id', cpu_line)
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
        
    except (ValueError, IndexError, ZeroDivisionError):
        raise HTTPException(status_code=502, detail="Server returned unreadable statistics")

    if any(value is None or not 0 <= value <= 100 for value in stats.values()):
        raise HTTPException(status_code=502, detail="Server returned unreadable statistics")
        
    return stats

@router.get("/servers/{server_id}/files")
async def list_files(
    server_id: int, 
    path: str = "/",
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """List files in a directory"""
    server, ssh_key_path, password = await get_server_connection_details(server_id, db, current_user)
    
    if not path or '\x00' in path or len(path) > 4096:
        raise HTTPException(status_code=400, detail="Invalid path")

    files = await ssh_service.list_directory(
        hostname=server.ip_address,
        username=server.ssh_username,
        path=path,
        private_key=ssh_key_path,
        password=password,
        port=server.ssh_port
    )
    
    return {"path": path, "files": files}
