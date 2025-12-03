"""
Diagnostic Service - Collects system information from remote servers
"""
from services.ansible_service import ansible_service
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class DiagnosticService:
    """Service to gather diagnostic information from servers"""
    
    def __init__(self):
        self.ansible = ansible_service
    
    def gather_system_info(self, server, ssh_password: str = None, ssh_key: str = None) -> Dict[str, Any]:
        """
        Gather comprehensive system information from a server
        
        Args:
            server: Server model object
            ssh_password: Decrypted SSH password (if available)
            ssh_key: Decrypted SSH key path (if available)
            
        Returns:
            Dictionary with system information
        """
        inventory = self._build_inventory(server, ssh_password, ssh_key)
        
        diagnostics = {
            "hostname": server.hostname,
            "ip_address": server.ip_address,
            "os_info": server.os_info,
            "checks": {}
        }
        
        # Optimized diagnostic commands - combined where possible
        checks = [
            ("system_overview", "echo 'CPU:' && top -bn1 | grep 'Cpu(s)' && echo 'Memory:' && free -h | grep Mem && echo 'Disk:' && df -h / | grep -v Filesystem && echo 'Load:' && uptime"),
            ("top_processes", "ps aux --sort=-%cpu | head -6"),
            ("recent_errors", "journalctl -p err -n 5 --no-pager 2>/dev/null || echo 'No recent errors'"),
        ]
        
        for check_name, command in checks:
            try:
                stdout, status, rc = self.ansible.run_command(
                    host_pattern=server.ip_address,
                    module="shell",
                    module_args=command,
                    inventory=inventory
                )
                diagnostics["checks"][check_name] = {
                    "success": rc == 0,
                    "output": stdout.strip()[:500] if rc == 0 else f"Error: {stdout[:200]}",  # Limit output size
                    "exit_code": rc
                }
            except Exception as e:
                logger.error(f"Failed to run check {check_name}: {e}")
                diagnostics["checks"][check_name] = {
                    "success": False,
                    "output": f"Timeout or connection error",
                    "exit_code": -1
                }
                # Don't fail completely if one check fails
                continue
        
        return diagnostics
    
    def _build_inventory(self, server, ssh_password: str = None, ssh_key: str = None) -> Dict[str, Any]:
        """Build Ansible inventory for the server"""
        inventory = {
            "all": {
                "hosts": {
                    server.ip_address: {
                        "ansible_user": server.ssh_username,
                        "ansible_host_key_checking": False,  # Disable for easier testing
                    }
                }
            }
        }
        
        # Validate and add authentication
        if ssh_password:
            logger.info(f"Using password authentication for {server.ip_address}")
            inventory["all"]["hosts"][server.ip_address]["ansible_password"] = ssh_password
            
        if ssh_key:
            # Check if user accidentally entered public key instead of path
            if ssh_key.startswith("ssh-rsa") or ssh_key.startswith("ssh-ed25519") or "AAAAB3NzaC" in ssh_key:
                logger.error(f"SSH key appears to be a public key, not a file path: {ssh_key[:50]}...")
                raise ValueError("SSH key should be a file path (e.g., /home/user/.ssh/id_rsa), not the key content itself")
            
            logger.info(f"Using SSH key authentication: {ssh_key}")
            inventory["all"]["hosts"][server.ip_address]["ansible_ssh_private_key_file"] = ssh_key
            
        logger.debug(f"Inventory built for {server.ip_address}: user={server.ssh_username}, has_password={bool(ssh_password)}, has_key={bool(ssh_key)}")
        return inventory

# Singleton instance
diagnostic_service = DiagnosticService()
