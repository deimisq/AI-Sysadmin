import asyncssh
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

class SSHService:
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
        # Build diagnostic info for better error reporting
        auth_method = []
        if private_key:
            auth_method.append(f"SSH Key: {private_key}")
        if password:
            auth_method.append("Password: [REDACTED]")
        if not auth_method:
            auth_method.append("No authentication provided")
        
        auth_info = ", ".join(auth_method)
        
        try:
            client_keys = None
            if private_key:
                # If it looks like a path, use it, otherwise treat as content
                if private_key.startswith('/') or private_key.startswith('./'):
                    client_keys = [private_key]
                    logger.info(f"Using SSH key file: {private_key}")
                else:
                    logger.warning(f"SSH key doesn't look like a path: {private_key[:50]}...")
                    # Importing key from string content would require more handling
                    # For MVP let's assume path or we'd need to write to temp file
                    pass

            logger.info(f"Attempting SSH connection to {username}@{hostname}:{port}")
            logger.debug(f"Authentication: {auth_info}")
            logger.debug(f"Command to execute: {command}")
            
            async with asyncssh.connect(
                hostname, 
                port=port, 
                username=username, 
                password=password,
                client_keys=client_keys,
                known_hosts=None # Security warning: disabling known_hosts for MVP ease
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
