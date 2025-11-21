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
        
        # Run diagnostic commands
        checks = [
            ("cpu_usage", "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'"),
            ("memory_usage", "free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2 }'"),
            ("disk_usage", "df -h / | awk 'NR==2{print $5}'"),
            ("top_processes", "ps aux --sort=-%cpu | head -10"),
            ("load_average", "uptime | awk -F'load average:' '{print $2}'"),
            ("running_services", "systemctl list-units --type=service --state=running | head -20"),
            ("network_connections", "ss -tuln | wc -l"),
            ("recent_errors", "journalctl -p err -n 20 --no-pager"),
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
                    "output": stdout.strip() if rc == 0 else f"Error: {stdout}",
                    "exit_code": rc
                }
            except Exception as e:
                logger.error(f"Failed to run check {check_name}: {e}")
                diagnostics["checks"][check_name] = {
                    "success": False,
                    "output": f"Failed to execute: {str(e)}",
                    "exit_code": -1
                }
        
        return diagnostics
    
    def _build_inventory(self, server, ssh_password: str = None, ssh_key: str = None) -> Dict[str, Any]:
        """Build Ansible inventory for the server"""
        inventory = {
            "all": {
                "hosts": {
                    server.ip_address: {
                        "ansible_user": server.ssh_username,
                    }
                }
            }
        }
        
        if ssh_password:
            inventory["all"]["hosts"][server.ip_address]["ansible_password"] = ssh_password
        if ssh_key:
            inventory["all"]["hosts"][server.ip_address]["ansible_ssh_private_key_file"] = ssh_key
            
        return inventory

# Singleton instance
diagnostic_service = DiagnosticService()
