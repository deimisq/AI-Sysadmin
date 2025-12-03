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

    def run_playbook(self, playbook_path: str, inventory: Dict[str, Any], extra_vars: Dict[str, Any] = None) -> Tuple[str, str, int]:
        """
        Runs an Ansible playbook.
        """
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

    def run_command(self, host_pattern: str, module: str, module_args: str, inventory: Dict[str, Any]) -> Tuple[str, str, int]:
        """
        Runs an ad-hoc Ansible command.
        """
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

ansible_service = AnsibleService()
