import asyncssh
import logging
import stat
from datetime import datetime, timezone
from fastapi import HTTPException
from settings import settings
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

class SSHService:
    @staticmethod
    async def list_directory(hostname: str, username: str, path: str,
                             private_key: Optional[str] = None,
                             password: Optional[str] = None, port: int = 22):
        """Use SFTP, so filenames and paths never enter a remote shell."""
        try:
            async with asyncssh.connect(
                hostname, port=port, username=username, password=password,
                client_keys=SSHService.get_client_keys(private_key) if private_key else None,
                known_hosts=settings.SSH_KNOWN_HOSTS or (), login_timeout=20,
            ) as conn:
                async with conn.start_sftp_client() as sftp:
                    files = []
                    async for entry in sftp.scandir(path):
                        if entry.filename in ('.', '..'):
                            continue
                        attrs = entry.attrs
                        mode = attrs.permissions
                        files.append({
                            "name": entry.filename,
                            "is_dir": stat.S_ISDIR(mode) if mode is not None else False,
                            "size": str(attrs.size) if attrs.size is not None else "",
                            "date": datetime.fromtimestamp(attrs.mtime, timezone.utc).isoformat() if attrs.mtime is not None else "",
                            "permissions": stat.filemode(mode) if mode is not None else "",
                        })
                    return sorted(files, key=lambda item: (not item["is_dir"], item["name"].casefold()))
        except asyncssh.SFTPNoSuchFile:
            raise HTTPException(status_code=404, detail="Directory not found")
        except asyncssh.SFTPPermissionDenied:
            raise HTTPException(status_code=403, detail="Directory access denied")
        except (asyncssh.Error, OSError):
            raise HTTPException(status_code=502, detail="Unable to list remote directory")

    @staticmethod
    def get_client_keys(private_key: str):
        """Helper to process private key string into asyncssh usable keys"""
        if not private_key:
            return None
            
        try:
            # If it looks like a path, use it
            if private_key.strip().startswith('/') or private_key.strip().startswith('./'):
                logger.info(f"Using SSH key file: {private_key}")
                return [private_key.strip()]
            
            # Treat as raw content
            try:
                logger.info("Importing SSH key from content")
                return [asyncssh.import_private_key(private_key)]
            except Exception as e:
                # Last resort: try sanitizing escaped newlines if present
                if "\\n" in private_key:
                     logger.warning("Sanitizing escaped newlines in SSH key")
                     return [asyncssh.import_private_key(private_key.replace("\\n", "\n"))]
                raise e
        except Exception as e:
            logger.error(f"Failed to process SSH key: {e}")
            # Do not return None here to mask error, let caller handle or fail
            # returning None means asyncssh will try other auth methods (password, agent, etc)
            return None

    @staticmethod
    async def execute_command(
        hostname: str,
        username: str,
        command: str,
        private_key: Optional[str] = None,
        password: Optional[str] = None,
        port: int = 22
    ) -> Tuple[str, str, int]:
        """
        Executes a command on a remote server via SSH.
        Returns (stdout, stderr, exit_code).
        """
        # Build diagnostic info
        auth_method = []
        if private_key:
            auth_method.append("SSH Key: [REDACTED]")
        if password:
            auth_method.append("Password: [REDACTED]")
        if not auth_method:
            auth_method.append("No authentication provided")
        
        auth_info = ", ".join(auth_method)
        
        client_keys = SSHService.get_client_keys(private_key) if private_key else None
        
        try:
            logger.info(f"Attempting SSH connection to {username}@{hostname}:{port}")
            logger.debug(f"Authentication: {auth_info}")
            logger.debug(f"Command to execute: {command}")
            
            async with asyncssh.connect(
                hostname, 
                port=port, 
                username=username, 
                password=password,
                client_keys=client_keys,
                known_hosts=settings.SSH_KNOWN_HOSTS or ()
            ) as conn:
                logger.info(f"SSH connection established to {hostname}")
                result = await conn.run(command)
                
                # Log execution details
                if result.exit_status != 0:
                    logger.warning(f"Command failed with exit code {result.exit_status}")
                    logger.warning(f"STDOUT: {result.stdout[:200]}")
                    logger.warning(f"STDERR: {result.stderr[:200]}")
                else:
                    logger.info(f"Command executed successfully on {hostname}")
                
                return result.stdout, result.stderr, result.exit_status
                
        except asyncssh.PermissionDenied as e:
            error_msg = f"Permission denied for user {username} on host {hostname}. Auth used: {auth_info}. Error: {str(e)}"
            logger.error(error_msg)
            return "", error_msg, -1
        except asyncssh.ConnectionLost as e:
            error_msg = f"Connection lost to {hostname}:{port}. Error: {str(e)}"
            logger.error(error_msg)
            return "", error_msg, -1
        except FileNotFoundError as e:
            error_msg = f"SSH key file not found: {private_key}. Error: {str(e)}"
            logger.error(error_msg)
            return "", error_msg, -1
        except Exception as e:
            error_msg = f"SSH Connection failed to {username}@{hostname}:{port}. Auth: {auth_info}. Error: {type(e).__name__}: {str(e)}"
            logger.error(error_msg)
            return "", error_msg, -1

ssh_service = SSHService()
