"""Regression tests use an isolated in-memory database and never contact servers."""
import os
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.update(DATABASE_URL="sqlite://", DESKTOP_MODE="false",
                  SECRET_KEY="synthetic-test-only",
                  ENCRYPTION_KEY="synthetic-test-only")

import models
import dependencies
from utils.auth import create_access_token
from utils.encryption import encrypt_data


@pytest.fixture
def setup(monkeypatch):
    services = {}
    for name in ("ai", "ansible", "diagnostic", "ssh", "audit"):
        service = Mock()
        if name == "ssh":
            service.execute_command = AsyncMock(return_value=("ok", "", 0))
            service.list_directory = AsyncMock(return_value=[])
        module = ModuleType(f"services.{name}_service")
        setattr(module, f"{name}_service", service)
        if name == "ssh":
            module.SSHService = service
        monkeypatch.setitem(sys.modules, module.__name__, module)
        services[name] = service
    # Ensure service mocks do not escape this fixture through cached routers.
    import importlib
    routers = [importlib.import_module(f"routers.{name}") for name in ("agent", "inventory", "console_ws", "config", "monitoring")]
    routers = [importlib.reload(module) for module in routers]
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    models.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add_all([models.Organization(id=1, name="A", slug="a"), models.Organization(id=2, name="B", slug="b")])
    session.flush()
    users = {}
    for index, (name, org, role, active) in enumerate([
        ("owner", 1, "user", True), ("member", 1, "user", True),
        ("outsider", 1, "user", True), ("foreign", 2, "admin", True),
        ("admin", 1, "admin", True), ("global", None, "superadmin", True),
        ("inactive", 1, "admin", False), ("unassigned", None, "admin", True),
    ], 1):
        users[name] = models.User(id=index, username=name, email=f"{name}@example.test",
                                 organization_id=org, role=role, is_active=active, is_superuser=role == "superadmin")
    session.add_all(users.values())
    session.add_all([models.ServerGroup(id=1, name="A group", organization_id=1),
                     models.ServerGroup(id=2, name="B group", organization_id=2)])
    session.flush()
    session.add(models.UserGroupPermission(user_id=users["member"].id, group_id=1, role="user"))
    for server_id, org, group in [(1, 1, 1), (2, 2, 2), (3, None, None)]:
        session.add(models.Server(id=server_id, hostname=f"server-{server_id}", ip_address="192.0.2.1",
                                  organization_id=org, group_id=group, created_by=users["owner"].id if org == 1 else None,
                                  ssh_username="test", ssh_password=encrypt_data("test-password")))
    session.commit()
    app = FastAPI()
    for router in routers:
        app.include_router(router.router, prefix="/api/v1/config" if router.__name__ == "routers.config" else "/api/v1")
    app.dependency_overrides[dependencies.get_db] = lambda: session
    import database
    app.dependency_overrides[database.get_db] = lambda: session
    with TestClient(app) as client:
        yield client, session, services
    session.close()
    engine.dispose()


def headers(user):
    return {"Authorization": f"Bearer {create_access_token({'sub': user})}"}


@pytest.mark.parametrize("endpoint", ["stats", "files"])
@pytest.mark.parametrize("user", [None, "outsider", "foreign", "inactive", "unassigned"])
def test_monitoring_rejects_unauthorized_access(setup, endpoint, user):
    client, _, services = setup
    response = client.get(f"/api/v1/servers/1/{endpoint}", headers=headers(user) if user else {})
    assert response.status_code in (401, 403, 404)
    services["ssh"].execute_command.assert_not_called()
    services["ssh"].list_directory.assert_not_called()


def test_files_pass_path_to_sftp_without_shell_execution(setup):
    client, _, services = setup
    path = '/folder with spaces/$(touch should-never-run);|"'
    response = client.get('/api/v1/servers/1/files', params={"path": path}, headers=headers("owner"))
    assert response.status_code == 200
    assert response.json() == {"path": path, "files": []}
    assert services["ssh"].list_directory.await_args.kwargs["path"] == path
    services["ssh"].execute_command.assert_not_called()


@pytest.mark.parametrize("output", ["", "not statistics", "%Cpu(s): 1 id\nMem: 0 0\n/dev/a 1 1 0 100% /"])
def test_unreadable_stats_are_not_reported_as_zero(setup, output):
    client, _, services = setup
    services["ssh"].execute_command.return_value = (output, "", 0)
    response = client.get('/api/v1/servers/1/stats', headers=headers("member"))
    assert response.status_code == 502


def test_authorized_statistics(setup):
    client, _, services = setup
    services["ssh"].execute_command.return_value = ('%Cpu(s): 80.0 id\nMem: 1000 250 750\n/dev/a 20G 10G 10G 50% /', '', 0)
    response = client.get('/api/v1/servers/1/stats', headers=headers("member"))
    assert response.status_code == 200
    assert response.json() == {"cpu": 20.0, "memory": 25.0, "disk": 50}


@pytest.mark.parametrize("path,body", [
    ('/agent/diagnose', {"server_id": 1, "problem_description": "test"}),
    ('/servers/1/diagnose', {"description": "test"}),
])
def test_diagnosis_requires_explicit_context_consent_before_collection(setup, path, body):
    client, _, services = setup
    response = client.post('/api/v1' + path, json=body, headers=headers('owner'))
    assert response.status_code == 428
    services['diagnostic'].gather_system_info.assert_not_called()
    services['ai'].analyze_problem.assert_not_called()


@pytest.mark.parametrize("path,body", [
    ('/agent/diagnose', {"server_id": 1, "problem_description": "test"}),
    ('/servers/1/diagnose', {"description": "test"}),
])
def test_authorized_diagnosis_with_context_acceptance(setup, path, body):
    client, _, services = setup
    services['diagnostic'].gather_system_info.return_value = {"checks": {}}
    services['ai'].analyze_problem.return_value = {"analysis": "Test analysis", "proposed_command": None}
    response = client.post('/api/v1' + path, json={**body, "context_consent_version": "2026-10-25"}, headers=headers('owner'))
    assert response.status_code == 200
    services['ai'].analyze_problem.assert_called_once()


@pytest.mark.parametrize("path,body", [
    ("/agent/execute", {"server_id": 1, "command": "id", "approved_by": "spoofed"}),
    ("/agent/diagnose", {"server_id": 1, "problem_description": "test"}),
    ("/servers/1/execute", {"command": "id"}),
    ("/execute/", {"server_id": 1, "command": "id"}),
])
def test_execution_requires_authentication(setup, path, body):
    client, _, services = setup
    assert client.post("/api/v1" + path, json=body).status_code == 401
    services["ssh"].execute_command.assert_not_called()
    services["ansible"].run_command.assert_not_called()


@pytest.mark.parametrize("user", ["outsider", "foreign", "unassigned", "inactive"])
@pytest.mark.parametrize("path,body", [
    ("/agent/execute", {"server_id": 1, "command": "id", "approved_by": "spoofed"}),
    ("/agent/diagnose", {"server_id": 1, "problem_description": "test"}),
    ("/servers/1/execute", {"command": "id"}),
    ("/execute/", {"server_id": 1, "command": "id"}),
    ("/servers/1/diagnose", {"description": "test"}),
])
def test_execution_rejects_unauthorized_server(setup, user, path, body):
    client, _, services = setup
    assert client.post("/api/v1" + path, json=body, headers=headers(user)).status_code in (403, 404)
    services["ssh"].execute_command.assert_not_called()
    services["ansible"].run_command.assert_not_called()
    services["diagnostic"].gather_system_info.assert_not_called()


@pytest.mark.parametrize("user", ["owner", "member", "admin", "global"])
def test_authorized_command_executes(setup, user):
    client, _, services = setup
    response = client.post("/api/v1/servers/1/execute", json={"command": "id"}, headers=headers(user))
    assert response.status_code == 200
    services["ssh"].execute_command.assert_awaited_once()


@pytest.mark.parametrize("user,expected", [("owner", [1]), ("member", [1]), ("outsider", []),
                                         ("foreign", [2]), ("admin", [1]), ("global", [1, 2, 3]), ("unassigned", [3])])
def test_server_list_is_tenant_scoped(setup, user, expected):
    client, _, _ = setup
    response = client.get("/api/v1/servers/", headers=headers(user))
    assert response.status_code == 200
    assert sorted(item["id"] for item in response.json()) == expected


@pytest.mark.parametrize("user", ["foreign", "outsider", "unassigned", "inactive"])
def test_websocket_rejects_unauthorized_server(setup, monkeypatch, user):
    client, _, _ = setup
    import asyncssh
    connect = Mock(side_effect=AssertionError("No network calls allowed"))
    monkeypatch.setattr(asyncssh, "connect", connect)
    from starlette.websockets import WebSocketDisconnect
    token = create_access_token({"sub": user})
    with client.websocket_connect(f"/api/v1/ws/ssh/1?token={token}") as ws:
        try:
            while True:
                ws.receive_text()
        except WebSocketDisconnect:
            pass
    connect.assert_not_called()


def test_reassignment_to_foreign_group_is_rejected(setup):
    client, _, _ = setup
    response = client.put("/api/v1/servers/1", json={"group_id": 2}, headers=headers("owner"))
    assert response.status_code == 404


def test_approval_identity_is_server_derived(setup):
    client, db, services = setup
    services["ansible"].run_command.return_value = ("ok", "successful", 0)
    response = client.post("/api/v1/agent/execute", json={"server_id": 1, "command": "id", "approved_by": "spoofed"}, headers=headers("owner"))
    assert response.status_code == 200
    assert db.query(models.OperationLog).one().approved_by == "owner"


@pytest.mark.parametrize("user", ["foreign", "outsider", "unassigned", "inactive"])
def test_credentials_are_not_disclosed_to_unauthorized_users(setup, user):
    client, _, _ = setup
    response = client.get("/api/v1/servers/1/credentials", headers=headers(user))
    assert response.status_code in (403, 404)
    assert "test-password" not in response.text


@pytest.mark.parametrize("field,value", [("SECRET_KEY", "supersecretkey"),
                                       ("SECRET_KEY", "CHANGE_ME_GENERATE_WITH_openssl_rand_hex_32"),
                                       ("ENCRYPTION_KEY", "default-encryption-key-change-in-production")])
def test_insecure_secrets_are_rejected(field, value):
    from settings import Settings
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{field: value})


@pytest.mark.parametrize("user,expected", [("admin", 403), ("owner", 403), ("global", 200)])
def test_global_configuration_requires_global_admin(setup, user, expected):
    client, _, _ = setup
    assert client.get("/api/v1/config/", headers=headers(user)).status_code == expected
