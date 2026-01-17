# Phase 1: Client-Side SSH & Multi-Tab Terminal

**Timeline**: Q1 2026 (6-8 weeks)  
**Epic**: Desktop-First Architecture Foundation  
**Status**: 🟡 Planning

---

## Objectives

1. Migrate SSH connection logic from Python backend to Rust (Tauri core)
2. Implement multi-tab terminal interface with session persistence
3. Build local credential vault with encryption
4. Achieve feature parity with current web-based terminal

---

## Technical Architecture

### Current Flow (v1.0)

```
Desktop App (React)
    │
    └─> WebSocket ─> Backend (Python AsyncSSH) ─> Target Server
```

### Target Flow (v2.0)

```
Desktop App (React)
    │
    ├─> Tauri Command ─> Rust SSH Client ─> Target Server
    │                       (spawned process per tab)
    │
    └─> React State Manager
        ├─> Tab 1 (xterm.js) <─> Rust SSH Process #1
        ├─> Tab 2 (xterm.js) <─> Rust SSH Process #2
        └─> Tab N (xterm.js) <─> Rust SSH Process #N
```

---

## Work Breakdown Structure (WBS)

### 1. Rust SSH Core Development

**Task 1.1: SSH Library Selection & PoC**  
**Assignee**: Rust Developer  
**Effort**: 1 week  
**Dependencies**: None

**Subtasks**:

- [ ] Evaluate `ssh2` vs `thrussh` (pros/cons comparison)
- [ ] Create proof-of-concept: Connect to test server, execute `ls`
- [ ] Benchmark: Connection time, memory usage
- [ ] Decision: Choose library (recommended: `ssh2` for maturity)

**Deliverables**:

- `research/ssh_library_comparison.md`
- `src-tauri/examples/basic_ssh.rs` (PoC)

---

**Task 1.2: SSH Connection Manager (Rust)**  
**Assignee**: Rust Developer  
**Effort**: 2 weeks  
**Dependencies**: Task 1.1

**Subtasks**:

- [ ] Implement `SSHConnectionManager` struct

  ```rust
  pub struct SSHConnectionManager {
      sessions: HashMap<String, Session>, // session_id -> SSH session
      channels: HashMap<String, Channel>, // channel_id -> SSH channel
  }
  ```

- [ ] Methods:
  - `connect(host, port, username, auth_method) -> Result<SessionId>`
  - `execute_command(session_id, command) -> Result<Output>`
  - `open_shell(session_id) -> Result<ChannelId>`
  - `send_input(channel_id, data)`
  - `close_session(session_id)`
- [ ] Error handling: Connection timeout, auth failures, network errors
- [ ] Unit tests: Mock SSH server (use `ssh-test-server` crate)

**Deliverables**:

- `src-tauri/src/ssh/manager.rs`
- `src-tauri/tests/ssh_tests.rs`

---

**Task 1.3: Credential Vault (Local Encryption)**  
**Assignee**: Rust Developer  
**Effort**: 1.5 weeks  
**Dependencies**: None (parallel with 1.2)

**Subtasks**:

- [ ] Choose storage: SQLite (`rusqlite`) or JSON file?
  - Recommendation: SQLite for querying + encryption at rest
- [ ] Implement encryption layer:

  ```rust
  use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
  
  pub struct CredentialVault {
      db: Connection,
      master_key: LessSafeKey, // Derived from user password via Argon2
  }
  ```

- [ ] CRUD operations:
  - `store_password(server_id, password_encrypted)`
  - `store_ssh_key(server_id, key_path, passphrase_encrypted)`
  - `retrieve_credentials(server_id) -> Credentials`
- [ ] Master password prompt UI (first launch)
- [ ] Key derivation: Argon2id (OWASP recommendation)

**Deliverables**:

- `src-tauri/src/vault/mod.rs`
- `src-tauri/data/credentials.db` (SQLite schema)

---

### 2. Tauri Commands (Rust ↔ React Bridge)

**Task 2.1: Define Tauri Command API**  
**Assignee**: Rust + React Developer (pair programming)  
**Effort**: 1 week  
**Dependencies**: Task 1.2

**Subtasks**:

- [ ] Define command signatures:

  ```rust
  #[tauri::command]
  async fn ssh_connect(
      server_id: String,
      host: String,
      port: u16,
      username: String,
  ) -> Result<SessionId, String>;

  #[tauri::command]
  async fn ssh_send_input(
      session_id: String,
      data: String,
  ) -> Result<(), String>;

  #[tauri::command]
  async fn ssh_disconnect(session_id: String) -> Result<(), String>;
  ```

- [ ] Register commands in `main.rs`:

  ```rust
  tauri::Builder::default()
      .invoke_handler(tauri::generate_handler![
          ssh_connect,
          ssh_send_input,
          ssh_disconnect
      ])
      .run(tauri::generate_context!())
  ```

- [ ] TypeScript type generation (use Tauri CLI auto-gen)

**Deliverables**:

- `src-tauri/src/commands/ssh.rs`
- `frontend-desktop/src/lib/tauri-api.ts` (TypeScript types)

---

### 3. Frontend: Multi-Tab Terminal UI

**Task 3.1: Tab State Management**  
**Assignee**: React Developer  
**Effort**: 1.5 weeks  
**Dependencies**: Task 2.1

**Subtasks**:

- [ ] Create `TerminalTabContext`:

  ```typescript
  interface TerminalTab {
      id: string; // UUID
      serverId: string;
      sessionId: string | null; // From Rust
      title: string; // "Server 1 - 192.168.1.10"
      isActive: boolean;
      terminal: Terminal | null; // xterm.js instance
  }

  const TerminalTabContext = createContext({
      tabs: [] as TerminalTab[],
      activeTabId: string | null,
      openTab: (serverId: string) => void,
      closeTab: (tabId: string) => void,
      switchTab: (tabId: string) => void,
  });
  ```

- [ ] Tab bar component (`<TabBar />`)
- [ ] Close tab confirmation (if session active)
- [ ] Reorder tabs (drag & drop)

**Deliverables**:

- `frontend-desktop/src/contexts/TerminalTabContext.tsx`
- `frontend-desktop/src/components/terminal/TabBar.tsx`

---

**Task 3.2: xterm.js Integration per Tab**  
**Assignee**: React Developer  
**Effort**: 2 weeks  
**Dependencies**: Task 3.1

**Subtasks**:

- [ ] Create `<TerminalPane />` component:

  ```typescript
  const TerminalPane: React.FC<{ tabId: string }> = ({ tabId }) => {
      const terminalRef = useRef<HTMLDivElement>(null);
      const xtermRef = useRef<Terminal | null>(null);

      useEffect(() => {
          const term = new Terminal({ /* options */ });
          term.loadAddon(new FitAddon());
          term.open(terminalRef.current!);
          
          // Connect to Rust SSH process
          const sessionId = await invoke('ssh_connect', { /* params */ });
          
          term.onData(data => {
              invoke('ssh_send_input', { sessionId, data });
          });

          // Listen to SSH output (use Tauri events)
          listen<string>(`ssh-output-${sessionId}`, event => {
              term.write(event.payload);
          });

          xtermRef.current = term;
      }, []);

      return <div ref={terminalRef} />;
  };
  ```

- [ ] Implement event-based output streaming (Rust → React):

  ```rust
  // In Rust
  let window = app.get_window("main").unwrap();
  window.emit(&format!("ssh-output-{}", session_id), output)?;
  ```

- [ ] Handle terminal resize (fit addon)
- [ ] SSH keepalive (send NUL byte every 30s)

**Deliverables**:

- `frontend-desktop/src/components/terminal/TerminalPane.tsx`
- `frontend-desktop/src/hooks/useSSHSession.ts`

---

### 4. Session Persistence

**Task 4.1: Background SSH Processes**  
**Assignee**: Rust Developer  
**Effort**: 1 week  
**Dependencies**: Task 1.2

**Subtasks**:

- [ ] Spawn SSH sessions as background Tokio tasks:

  ```rust
  #[tauri::command]
  async fn ssh_connect(...) -> Result<SessionId> {
      let session_id = Uuid::new_v4().to_string();
      
      tokio::spawn(async move {
          // Keep SSH connection alive in background
          loop {
              // Read from SSH channel
              // Emit events to frontend
          }
      });

      Ok(session_id)
  }
  ```

- [ ] Handle tab close: Keep SSH session alive if user reopens tab
- [ ] Session timeout: Close after 30 min of inactivity
- [ ] Graceful shutdown: Close all SSH connections when app quits

**Deliverables**:

- Updated `src-tauri/src/ssh/manager.rs` with background tasks

---

### 5. Testing & Quality Assurance

**Task 5.1: Integration Testing**  
**Assignee**: QA Engineer + Rust Developer  
**Effort**: 1.5 weeks  
**Dependencies**: All above tasks

**Test Scenarios**:

- [ ] Connect to 10 servers simultaneously (stress test)
- [ ] Reconnect to server after network interruption
- [ ] Close and reopen app while sessions active (state restoration)
- [ ] Copy/paste from terminal
- [ ] Special characters (UTF-8, emojis, control codes)
- [ ] Large output (e.g., `cat /var/log/syslog`)
- [ ] Interactive programs (`vim`, `htop`)

**Tools**:

- Docker Compose with 10 SSH servers (Alpine Linux)
- Automated test suite (Playwright for UI, Rust unit tests)

**Deliverables**:

- `tests/integration/multi_tab_ssh_test.rs`
- `tests/e2e/terminal_ui.spec.ts`

---

**Task 5.2: Performance Benchmarking**  
**Assignee**: DevOps Engineer  
**Effort**: 0.5 week  
**Dependencies**: Task 5.1

**Metrics**:

- SSH connection time (target: < 500ms)
- Memory per session (target: < 50MB)
- CPU usage with 20 active tabs (target: < 30%)
- Terminal rendering FPS (target: 60 FPS stable)

**Deliverables**:

- `benchmarks/ssh_performance_report.md`

---

## Migration Path from v1.0

### Backward Compatibility

**Option 1: Hybrid Mode (Recommended)**

- Add feature flag in settings: "Use legacy backend SSH"
- If enabled, fall back to WebSocket-based terminal
- Allows gradual rollout + easy rollback

**Option 2: Hard Cutover**

- Deprecate WebSocket terminal entirely in v2.0
- Simpler codebase, but riskier

### User Communication

- In-app notification: "Try our new faster terminal! Enable in Settings → Beta Features"
- Collect feedback via telemetry (opt-in)

---

## Definition of Done (DoD)

- [ ] All unit tests passing (95%+ code coverage)
- [ ] Integration tests pass on Windows, macOS, Linux
- [ ] No memory leaks (Valgrind/instruments.app verification)
- [ ] Code review approved by 2 senior engineers
- [ ] User documentation updated (`docs/USER_GUIDE.md`)
- [ ] Beta release to 50 test users (1 week soak test)

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `ssh2` crate has critical bug | Low | High | Maintain Python fallback for 3 months |
| xterm.js event loop conflicts | Medium | Medium | Throttle SSH output to 30 FPS max |
| Credential vault corruption | Low | Critical | Daily backups, SQLite WAL mode |
| Tab state memory leak | Medium | High | Regular profiling with Chrome DevTools |

---

## Success Metrics

**Quantitative**:

- 90% of users report "SSH is faster" in survey
- < 5% rollback to legacy mode after 1 month
- Average connection time < 400ms (vs 1.5s in v1.0)

**Qualitative**:

- Zero security incidents related to credential vault
- Positive feedback on multi-tab UX (NPS > 50)

---

## Post-Launch

**Monitoring**:

- Sentry error tracking for Rust panics
- Telemetry: Connection success rate, avg session duration
- User feedback form in-app (Help → Report Issue)

**Iteration Plan**:

- Week 1-2: Fix critical bugs
- Week 3-4: UX improvements (tab reordering, themes)
- Week 5+: Prepare for Phase 2 (multi-tenancy)

---

**Phase Owner**: Lead Backend Engineer  
**Created**: 2026-01-17  
**Next Review**: Weekly stand-up every Monday 10am
