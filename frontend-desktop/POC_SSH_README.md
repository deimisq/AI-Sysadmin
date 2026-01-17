# Phase 1 PoC: Rust SSH Client

## 🎯 Objective

Validate that we can successfully execute SSH connections from Rust (Tauri) instead of relying on the Python backend.

## ✅ What's Implemented

### Backend (Rust)

- **SSH Manager** (`src-tauri/src/ssh_manager.rs`):
  - Connection handling with `ssh2` crate
  - Session management (HashMap of active sessions)
  - Password and SSH key authentication
  - Command execution
  - Session disconnect

- **Tauri Commands** (`src-tauri/src/main.rs`):
  - `ssh_connect(host, port, username, password, privateKeyPath)` → Returns session ID
  - `ssh_execute(sessionId, command)` → Returns command output
  - `ssh_disconnect(sessionId)` → Closes session
  - `ssh_list_sessions()` → Lists all active connections

### Frontend (React + TypeScript)

- **SSHTest Component** (`src/components/test/SSHTest.tsx`):
  - Connection form (host, port, username, password)
  - Quick command buttons (whoami, ls, df, free, etc.)
  - Terminal output display
  - Error handling

## 🚀 How to Test

### Prerequisites

1. **Rust** (for Tauri backend):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js dependencies**:

   ```bash
   cd frontend-desktop
   npm install
   ```

### Running the PoC

#### Option 1: Test Against Localhost

If you have SSH enabled on your machine:

```bash
# Make sure SSH server is running
sudo systemctl status sshd   # Linux
sudo systemctl start sshd    # If not running

# Run Tauri in development mode
npm run tauri:dev
```

Then in the app:

- Host: `localhost` or `127.0.0.1`
- Port: `22`
- Username: Your system username
- Password: Your password

#### Option 2: Test with Docker SSH Server

Create a test SSH server:

```bash
# Run an Alpine Linux container with SSH
docker run -d \
  --name ssh-test-server \
  -p 2222:22 \
  -e PUID=1000 \
  -e PGID=1000 \
  -e PASSWORD=testpass123 \
  -e USER=testuser \
  linuxserver/openssh-server:latest

# Test connection manually first
ssh testuser@localhost -p 2222
# Password: testpass123
```

Then in the app:

- Host: `localhost`
- Port: `2222`
- Username: `testuser`
- Password: `testpass123`

### Building for Production

```bash
npm run tauri:build
```

Output will be in `src-tauri/target/release/bundle/`.

## 🧪 Test Scenarios

### 1. Basic Connection

- [x] Connect to SSH server
- [x] Execute `whoami` command
- [x] Verify output matches expected user

### 2. Multiple Commands

- [x] Execute `pwd`
- [x] Execute `ls -la`
- [x] Execute `df -h`
- [x] Verify all outputs display correctly

### 3. Error Handling

- [ ] Try invalid password → Should show auth error
- [ ] Try invalid host → Should show connection timeout
- [ ] Try executing command without active session → Should show error

### 4. Session Management

- [ ] Connect to 2 different servers simultaneously
- [ ] Verify sessions are isolated
- [ ] Disconnect one, verify other still works

## 📊 Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Connection Time | < 500ms | TBD | ⏳ |
| Memory per Session | < 50MB | TBD | ⏳ |
| Command Exec Time | < 100ms | TBD | ⏳ |

To benchmark, use:

```bash
time ssh user@host 'echo test'   # Compare with our implementation
```

## 🐛 Known Issues

1. **Session metadata not stored**: Currently `list_sessions()` returns "unknown" for host/username.
   - Fix: Store `SSHCredentials` alongside `Session` in HashMap.

2. **No interactive shell yet**: Only single command execution.
   - Next: Implement PTY allocation for interactive sessions (Phase 1.2).

3. **No stdin streaming**: Commands that require user input will hang.
   - Next: Implement bidirectional channel communication.

## 📝 Next Steps (Phase 1.2)

- [ ] Implement multi-tab terminal UI
- [ ] Add xterm.js integration for interactive shell
- [ ] Implement PTY allocation (`session.channel_session()` + `request_pty()`)
- [ ] Add WebSocket-like event emitter for real-time output
- [ ] Persist sessions in background (survive tab changes)

## 🎓 Technical Learnings

### SSH2 Crate

- Very mature (used by cargo, rustup internally)
- Thread-safe with `Arc<Mutex<Session>>`
- Supports all auth methods (password, key, agent)

### Potential Issues

- `ssh2` is synchronous → May block Tauri main thread
  - **Solution**: Wrap in `tokio::spawn` for async execution
- SSH keys require filesystem access → Tauri security permissions needed

## 📚 References

- [ssh2-rs Documentation](https://docs.rs/ssh2/latest/ssh2/)
- [Tauri Command Guide](https://v2.tauri.app/develop/calling-rust/)
- [Phase 1 Full Plan](../../docs/PHASE1_CLIENT_SSH.md)

---

**Status**: ✅ PoC Complete (Basic SSH)  
**Next Milestone**: Multi-tab terminal (Week 3-4)  
**Progress**: 20% of Phase 1
