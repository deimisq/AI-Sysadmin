# Native RDP Integration Plan (WinAPI Embedding)

## Strategy

Instead of streaming pixels via Guacamole (complex, slow, dependency-heavy), we will use the host OS's native RDP capabilities (`mstsc.exe`) and embed its window directly into our Tauri application.

## Architecture

1. **Frontend (`NativeRdp.tsx`)**:
    * Renders a placeholder `<div>` to define the position/size of the RDP session.
    * Calculates screen coordinates (x, y, width, height).
    * Invokes Rust command `start_native_rdp(host, credentials, rect)`.

2. **Backend (`windows_rdp.rs`)**:
    * **Credential Manager**: Uses `cmdkey` to store credentials securely so `mstsc` can auto-login.
    * **Process Launcher**: Launches `mstsc.exe /v:ghost /w:width /h:height`.
    * **Window Swallower**:
        * Waits for the `mstsc.exe` window to appear using WinAPI hooks or looking for PID.
        * Removes window decorations (title bar, borders) using `SetWindowLongPtr` with `GWL_STYLE`.
        * Calls `SetParent` to attach the RDP window to the Tauri window handle (`HWND`).
        * Calls `SetWindowPos` to move it to the exact coordinates provided by the frontend.

## Dependencies

- Rust Crate: `windows` (WinAPI wrapper)
* System: `mstsc.exe` (Built-in Windows RDP Client)

## Advantages

- **Performance**: ZERO overhead. Native hardware acceleration.
* **Features**: Native clipboard, audio, USB redirection, multi-monitor support work out of the box.
* **Stability**: Uses Microsoft's own battle-tested RDP client.
* **Deployment**: No extra binaries (Docker, Node) to bundle.

## Implementation Steps

1. Add `windows` crate dependencies.
2. Create `windows_rdp.rs` module.
3. Implement `CmdKey` wrapper to save passwords.
4. Implement `launch_and_embed_rdp` function.
5. Create Tauri command wrapper.
6. Create React component `NativeRdpCanvas`.
