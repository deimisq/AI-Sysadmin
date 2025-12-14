from fastapi import APIRouter, WebSocket, Depends, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
import asyncssh
import logging
import asyncio
import json
import os
from dependencies import get_db
from models import Server, User
from utils.auth import decode_access_token
from services.ssh_service import SSHService
from utils.encryption import decrypt_data

# Logger setup
logger = logging.getLogger("console_ws")

router = APIRouter()

async def get_current_user_ws(token: str, db: Session):
    try:
        payload = decode_access_token(token)
        if not payload:
            return None
        username = payload.get("sub")
        if username is None:
            return None
        return db.query(User).filter(User.username == username).first()
    except Exception as e:
        logger.error(f"WS Auth Error: {e}")
        return None

@router.websocket("/ws/ssh/{server_id}")
async def ssh_websocket_endpoint(websocket: WebSocket, server_id: int, token: str, db: Session = Depends(get_db)):
    await websocket.accept()
    
    # 1. Authenticate
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.send_text("Error: Unauthorized")
        await websocket.close()
        return

    # 2. Get Server Info
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        await websocket.send_text("Error: Server not found")
        await websocket.close()
        return

    # 3. Prepare SSH Connection
    
    # Decrypt credentials
    ssh_key_str = server.ssh_key_path
    if ssh_key_str:
        try:
            ssh_key_str = decrypt_data(ssh_key_str)
        except Exception as e:
            logger.warning(f"Failed to decrypt SSH key, using as is: {e}")

    ssh_password = server.ssh_password
    if ssh_password:
        try:
            ssh_password = decrypt_data(ssh_password)
        except Exception as e:
            logger.warning(f"Failed to decrypt SSH password: {e}")

    client_keys = None
    if ssh_key_str:
        # Use centralized logic from SSHService
        client_keys = SSHService.get_client_keys(ssh_key_str)

    try:
        # 4. Connect SSH
        logger.info(f"Connecting to {server.hostname} ({server.ip_address}) as {server.ssh_username}")
        async with asyncssh.connect(
            server.ip_address,
            port=server.ssh_port or 22,
            username=server.ssh_username,
            password=ssh_password,
            client_keys=client_keys,
            known_hosts=None
        ) as conn:
            
            # 5. Open Interactive Shell
            # Request a PTY (pseudo-terminal) to support interactive commands like top
            # Note: asyncssh uses 'encoding' not 'term_encoding' in newer versions
            stdin, stdout, stderr = await conn.open_session(term_type='xterm', encoding='utf-8')
            
            # 6. Pipe Loops
            
            # Task: Read from SSH stdout -> Send to WebSocket
            async def read_stdout():
                try:
                    while True:
                        data = await stdout.read(1024)
                        if not data:
                            break
                        await websocket.send_text(data)
                except Exception as e:
                    logger.error(f"Read error: {e}")

            # Task: Read from WebSocket -> Write to SSH stdin
            async def write_stdin():
                try:
                    while True:
                        data = await websocket.receive_text()
                        # Handle resize events if needed, usually sent as JSON
                        # simple raw text for now
                        stdin.write(data)
                        await stdin.drain()
                except WebSocketDisconnect:
                    logger.info("Client disconnected")
                except Exception as e:
                    logger.error(f"Write error: {e}")
                finally:
                    stdin.write_eof()

            # Run both tasks
            await asyncio.gather(read_stdout(), write_stdin())
            
    except Exception as e:
        logger.error(f"SSH Connection failed: {e}")
        try:
            await websocket.send_text(f"\r\nError: Could not connect to SSH server: {str(e)}\r\n")
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
