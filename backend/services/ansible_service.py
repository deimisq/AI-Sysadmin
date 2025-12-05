import ansible_runner
import logging
import os
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)

class AnsibleService:
    def __init__(self, private_data_dir: str = "/tmp/ansible_runner"):
        self.private_data_dir = private_data_dir
        if not os.path.exists(self.private_data_dir):
            os.makedirs(self.private_data_dir)

    def _handle_raw_ssh_key(self, inventory: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
        """
        Checks if inventory contains raw SSH key content and writes it to a temp file.
        Returns modified inventory and the path to the temp file (or None).
        """
        temp_key_path = None
        try:
            # Navigate to the host vars
            # Structure: inventory['all']['hosts'][ip]['ansible_ssh_private_key_file']
            hosts = inventory.get('all', {}).get('hosts', {})
            for host, vars in hosts.items():
                key = vars.get('ansible_ssh_private_key_file')
                if key and ('BEGIN' in key and 'PRIVATE KEY' in key):
                    # It's a raw key
                    import tempfile
                    fd, path = tempfile.mkstemp()
                    with os.fdopen(fd, 'w') as f:
                        f.write(key)
                    # Ensure correct permissions (critical for SSH)
                    os.chmod(path, 0o600)
                    
                    # Update inventory to use path
                    vars['ansible_ssh_private_key_file'] = path
                    temp_key_path = path
                    logger.info(f"Created temporary SSH key file for {host}")
                    break # Assuming only one host/key for now per run
        except Exception as e:
            logger.error(f"Error handling raw SSH key: {e}")
            
        return inventory, temp_key_path

    def run_playbook(self, playbook_path: str, inventory: Dict[str, Any], extra_vars: Dict[str, Any] = None) -> Tuple[str, str, int]:
        """
        Runs an Ansible playbook.
        """
        inventory, temp_key_path = self._handle_raw_ssh_key(inventory)
        try:
            r = ansible_runner.run(
                private_data_dir=self.private_data_dir,
                playbook=playbook_path,
                inventory=inventory,
                extravars=extra_vars
            )
            
            # Collect output
            stdout = r.stdout.read()
            status = r.status
            rc = r.rc
            
            return stdout, status, rc
        except Exception as e:
            logger.error(f"Ansible playbook execution failed: {str(e)}")
            return "", "failed", -1
        finally:
            if temp_key_path and os.path.exists(temp_key_path):
                os.remove(temp_key_path)

    def run_command(self, host_pattern: str, module: str, module_args: str, inventory: Dict[str, Any]) -> Tuple[str, str, int]:
        """
        Runs an ad-hoc Ansible command.
        """
        inventory, temp_key_path = self._handle_raw_ssh_key(inventory)
        try:
            r = ansible_runner.run(
                private_data_dir=self.private_data_dir,
                host_pattern=host_pattern,
                module=module,
                module_args=module_args,
                inventory=inventory
            )
            
            stdout = r.stdout.read()
            status = r.status
            rc = r.rc
            
            return stdout, status, rc
        except Exception as e:
            logger.error(f"Ansible command execution failed: {str(e)}")
            return "", "failed", -1
        finally:
            if temp_key_path and os.path.exists(temp_key_path):
                os.remove(temp_key_path)

ansible_service = AnsibleService()
