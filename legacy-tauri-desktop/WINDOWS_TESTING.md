# 🪟 Windows Testing Guide - Phase 1 PoC

## Prerequisites (One-time setup)

### 1. Install Rust

```powershell
# Download and run rustup-init.exe from:
# https://rustup.rs/

# Or via winget:
winget install Rustlang.Rustup
```

### 2. Install Node.js (if not installed)

```powershell
winget install OpenJS.NodeJS.LTS
```

### 3. Install Visual Studio Build Tools (Required for Rust on Windows)

```powershell
# Download from:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Or install via winget:
winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### 4. Install WebView2 (Usually pre-installed on Windows 10/11)

If missing:

```powershell
winget install Microsoft.EdgeWebView2Runtime
```

---

## Quick Start (Testing PoC)

### Option 1: Test Against Cloud Backend SSH

1. **Clone and pull latest**:

   ```powershell
   git pull origin testing
   cd frontend-desktop
   ```

2. **Install dependencies**:

   ```powershell
   npm install
   ```

3. **Run Tauri in dev mode**:

   ```powershell
   npm run tauri:dev
   ```

4. **In the app**:
   - Click "Test Rust Backend" button → Should see greeting
   - Connect to a real SSH server (your cloud backend server):
     - Host: `your-server-ip`
     - Port: `22`
     - Username: `ubuntu` (or your user)
     - Password: (your password)
   - Click "Connect"
   - Try quick commands (whoami, ls, df, etc.)

### Option 2: Test with Local Docker SSH Server

1. **Install Docker Desktop** (if not installed):

   ```powershell
   winget install Docker.DockerDesktop
   ```

2. **Run test SSH server**:

   ```powershell
   docker run -d --name ssh-test -p 2222:22 rastasheep/ubuntu-sshd:latest
   ```

3. **Run Tauri app**:

   ```powershell
   npm run tauri:dev
   ```

4. **Test credentials**:
   - Host: `localhost`
   - Port: `2222`
   - Username: `root`
   - Password: `root`

---

## Building Installer (For distribution)

```powershell
npm run tauri:build
```

Output will be in: `src-tauri/target/release/bundle/`

Formats:

- `.msi`: Windows installer
- `.exe`: Portable executable (no install)

---

## Troubleshooting

### Error: "VCRUNTIME140.dll not found"

**Solution**: Install Visual C++ Redistributable

```powershell
winget install Microsoft.VCRedist.2015+.x64
```

### Error: "webview2-sys build failed"

**Solution**: Install WebView2 Runtime

```powershell
winget install Microsoft.EdgeWebView2Runtime
```

### Error: "cargo not found"

**Solution**: Restart PowerShell after installing Rust

```powershell
# Close and reopen PowerShell, or run:
refreshenv
```

### SSH Connection Timeout

**Solution**: Check Windows Firewall

```powershell
# Allow outbound SSH connections
New-NetFirewallRule -DisplayName "SSH Outbound" -Direction Outbound -Protocol TCP -LocalPort 22,2222 -Action Allow
```

### App doesn't start (black screen)

**Solution**: GPU acceleration issue

1. Right-click app → Properties → Compatibility
2. Check "Disable fullscreen optimizations"
3. Or update GPU drivers

---

## Expected Results (Success Criteria)

✅ "Test Rust Backend" button shows greeting  
✅ SSH connection succeeds (see Session ID)  
✅ `whoami` command returns username  
✅ `ls -la` shows file listing  
✅ `df -h` shows disk usage  
✅ No crashes or errors  

---

## Reporting Results

After testing, please report:

1. **Success/Failure**: Did it work?
2. **Connection Time**: How long to connect? (should be < 1 second)
3. **Command Latency**: Fast enough?
4. **Any Errors**: Screenshot or copy error message
5. **Windows Version**: Run `winver` to check

Report via GitHub Issue or commit to `PHASE1_PROGRESS.md`

---

## Next Steps (After PoC Validation)

If PoC works:

- [ ] Implement interactive terminal (PTY)
- [ ] Add multi-tab UI
- [ ] Implement credential vault
- [ ] Add xterm.js integration

If issues found:

- [ ] Debug and fix
- [ ] Repeat test

---

## Development Tips

### Hot Reload

Tauri watches Rust files automatically. Changes to `src-tauri/src/*.rs` trigger recompile.

### Debug Mode

```powershell
# Open DevTools in app
Ctrl+Shift+I
```

### Logs

Rust `println!` output appears in PowerShell console where you ran `tauri:dev`.

### Clean Build

```powershell
cd src-tauri
cargo clean
cargo build --release
```

---

**Last Updated**: 2026-01-17  
**Tested On**: Windows 11 22H2  
**Tauri Version**: 2.0  
**Status**: Ready for Windows testing
