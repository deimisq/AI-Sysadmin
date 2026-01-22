# Phase 3: Windows Support & Enterprise SSO

**Status**: Planning
**Target**: Q2 2026

## Objective

Enable seamless management of Windows Servers alongside Linux infrastructure, providing a unified "Single Pane of Glass" experience for Sysadmins.

## Key Features

1. **RDP Client Integration**
   - Native Remote Desktop Protocol support within the application tabs.
   - High performance (hardware acceleration where possible).
   - Clipboard sharing, drive redirection, and resolution scaling.

2. **PowerShell Remoting (WinRM/OpenSSH)**
   - First-class PowerShell terminal experience.
   - Support for WinRM (HTTP/HTTPS) and OpenSSH-on-Windows.
   - Syntax highlighting/Intellisense for PS commands (future).

3. **Enterprise SSO**
   - OAuth2 / SAML integration for login to the Desktop App.
   - Support Google Workspace, Azure AD, Okta.

## Technical Architecture

### RDP Implementation Strategy

Integrating RDP into a Tauri (Rust/Webview) app is challenging.

**Option A: Rust Bindings (freerdp-rs)**

- **Pros**: Native integration, rendered to canvas or window buffer.
- **Cons**: `freerdp` is C code, tough to build cross-platform, potential stability issues.

**Option B: WebAssembly (RDP via WebSocket)**

- **Pros**: Easier to render in frontend (Guacamole-lite).
- **Cons**: Requires a backend component/proxy translation (RDP -> WebSocket), adds latency. Not truly "client-side".

**Option C: Native Subprocess / Sidecar (Recommended)**

- Use an embedded RDP client (like `wfreerdp` or a custom minimalistic client) launched as a child process, reparenting the window into our UI (difficult) or overlaying.
- **Alternative**: Use a highly optimized Rust RDP crate like `ironrdp`.

**Chosen Path: `ironrdp` (Rust Native)**

- A pure Rust implementation of RDP.
- Safe, integrates well with Tauri async runtime.
- Output: Bitmap frames -> Render to HTML5 Canvas in frontend via Tauri Events.
- Input: Capture JS keyboard/mouse -> Send via Tauri Command -> `ironrdp`.

### PowerShell / WinRM

**Strategy**: `winrm-rs` crate does not support interactive shells easily (it's request/response).
**Better Path**: Encourage **OpenSSH for Windows** (standard in Server 2019+).

- Treat Windows servers as SSH hosts.
- Detect "OS: Windows" and switch terminal shell profile to PowerShell.
- **Legacy Fallback**: For older servers without SSH, build a rudimentary WinRM shell (non-interactive exec).

## Implementation Plan

### Step 1: Proof of Concept - IronRDP

1. Create a Tauri command `connect_rdp(host, user, pass)`.
2. Implement `ironrdp` connector loop.
3. Stream video frames to frontend (raw RGB).
4. Render on `<canvas>` in React.

### Step 2: Input Handling

1. Map browser mouse events to RDP PDU.
2. Map keyboard scancodes.

### Step 3: PowerShell Profile

1. Update `ssh_connect` to detect Windows banner.
2. If Windows detected, set PTY mode to `TERM=xterm-256color` but expect PowerShell prompts.

## Risks

- **RDP Performance**: Streaming bitmaps via Tauri event bridge might be slow for high-res. need Zero-Copy transfer if possible.
- **NLA Authentication**: Network Level Authentication is complex to get right in custom implementaitons.

## Timeline

- **Week 1-2**: Research IronRDP and build PoC.
- **Week 3-4**: Canvas Rendering optimization.
- **Week 5**: Input mapping.
- **Week 6**: Integration into Tab Manager.
