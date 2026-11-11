"""Exercise the real SFTP adapter with an in-process fake transport."""
import asyncio
import importlib.util
import stat
import os
import secrets
from cryptography.fernet import Fernet
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

from fastapi import HTTPException
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.update(DATABASE_URL='sqlite://', SECRET_KEY=secrets.token_urlsafe(48),
                  ENCRYPTION_KEY=Fernet.generate_key().decode())


def load_service():
    spec = importlib.util.spec_from_file_location('sftp_adapter_under_test', Path(__file__).resolve().parents[1] / 'services/ssh_service.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Context:
    def __init__(self, value): self.value = value
    async def __aenter__(self): return self.value
    async def __aexit__(self, *args): return False


def test_sftp_preserves_literal_paths_and_filenames(monkeypatch):
    module = load_service()
    paths = []
    async def scandir(path):
        paths.append(path)
        for name, mode in [('z file $(x)', stat.S_IFREG | 0o640), ('directory', stat.S_IFDIR | 0o750), ('.', stat.S_IFDIR)]:
            yield SimpleNamespace(filename=name, attrs=SimpleNamespace(permissions=mode, size=20, mtime=0))
    conn = SimpleNamespace(start_sftp_client=lambda: Context(SimpleNamespace(scandir=scandir)))
    connect = Mock(return_value=Context(conn))
    monkeypatch.setattr(module.asyncssh, 'connect', connect)
    path = '/literal/$(not-a-command); "folder"'
    result = asyncio.run(module.SSHService.list_directory('192.0.2.1', 'test', path))
    assert paths == [path]
    assert [item['name'] for item in result] == ['directory', 'z file $(x)']
    assert result[0]['is_dir'] is True
    assert result[1]['permissions'] == '-rw-r-----'
    assert connect.call_args.kwargs['known_hosts'] is not None


def test_sftp_errors_do_not_disclose_transport_details(monkeypatch):
    module = load_service()
    monkeypatch.setattr(module.asyncssh, 'connect', Mock(side_effect=OSError('sensitive transport details')))
    with pytest.raises(HTTPException) as error:
        asyncio.run(module.SSHService.list_directory('192.0.2.1', 'test', '/'))
    assert error.value.status_code == 502
    assert 'sensitive' not in error.value.detail
