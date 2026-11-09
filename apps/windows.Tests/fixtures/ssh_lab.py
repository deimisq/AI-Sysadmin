"""Loopback-only SSH protocol fixture. Never invokes a system shell."""
import asyncio
import base64
import json
import sys
import tempfile
from pathlib import Path
import asyncssh


class Server(asyncssh.SSHServer):
    def begin_auth(self, username):
        return True

    def password_auth_supported(self):
        return True

    def validate_password(self, username, password):
        return username == "lab" and password == sys.argv[1]


async def process(session):
    if session.command == "inspect-example":
        session.stdout.write("example: running\n")
        session.stderr.write("synthetic warning\n")
        session.exit(0)
    elif session.command == "too-much-output":
        session.stdout.write("x" * 100000)
        session.exit(0)
    elif session.command == "wait-example":
        await asyncio.sleep(60)
        session.exit(0)
    else:
        session.stderr.write("Unknown fixture command\n")
        session.exit(7)


async def main():
    key = asyncssh.generate_private_key("ssh-rsa", key_size=2048)
    sandbox = tempfile.TemporaryDirectory(prefix="aisys-sftp-")
    root = Path(sandbox.name)
    (root / "folder with spaces").mkdir()
    (root / "literal ; $ file.txt").write_text("synthetic data", encoding="utf-8")
    server = await asyncssh.create_server(Server, "127.0.0.1", 0, server_host_keys=[key], process_factory=process,
        sftp_factory=lambda channel: asyncssh.SFTPServer(channel, chroot=sandbox.name))
    print(json.dumps({"port": server.get_port(), "host_key": key.export_public_key().decode().split()[1]}), flush=True)
    await server.wait_closed()


asyncio.run(main())
