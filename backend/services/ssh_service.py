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
        try:
            # In a real app, we would handle keys more securely (e.g. from Vault or temporary files)
            # For this MVP, we assume private_key is the content of the key or path
            
            client_keys = None
            if private_key:
                # If it looks like a path, use it, otherwise treat as content
                if private_key.startswith('/') or private_key.startswith('./'):
                     client_keys = [private_key]
                else:
                     # Importing key from string content would require more handling
                     # For MVP let's assume path or we'd need to write to temp file
                     pass

            async with asyncssh.connect(
                hostname, 
                port=port, 
                username=username, 
                password=password,
                client_keys=client_keys,
                known_hosts=None # Security warning: disabling known_hosts for MVP ease
            ) as conn:
                result = await conn.run(command)
                return result.stdout, result.stderr, result.exit_status
                
        except Exception as e:
            logger.error(f"SSH Connection failed to {hostname}: {str(e)}")
            return "", str(e), -1

ssh_service = SSHService()
