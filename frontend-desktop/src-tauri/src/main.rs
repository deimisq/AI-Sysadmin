// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ssh_manager;
mod ssh_test;
mod pty_session;
mod rdp_manager;
mod rdp_sidecar;
mod rdp_frame_capture;
mod guacamole_manager;
#[cfg(target_os = "windows")]
mod windows_rdp;

use ssh_manager::{SSHManager, SSHCredentials, SSHSessionInfo, FileEntry};
use rdp_manager::RDPManager;
use rdp_frame_capture::RdpFrame;
use guacamole_manager::GuacamoleManager;
use std::sync::Mutex;
use tauri::{State, AppHandle, Window};

// Global app state (shared across the app)
struct AppState {
    ssh_manager: Mutex<SSHManager>,
    rdp_manager: Mutex<RDPManager>,
    guacamole: Mutex<GuacamoleManager>,
}

/// Connect to SSH server
#[tauri::command]
async fn ssh_connect(
    state: State<'_, AppState>,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
) -> Result<String, String> {
    let creds = SSHCredentials {
        host,
        port,
        username,
        password,
        private_key_path,
    };

    let manager = state.ssh_manager.lock().unwrap().clone();
    manager.connect(creds).await
        .map_err(|e| format!("SSH connection failed: {}", e))
}

/// Execute command on SSH session
#[tauri::command]
async fn ssh_execute(
    state: State<'_, AppState>,
    session_id: String,
    command: String,
) -> Result<String, String> {
    let manager = state.ssh_manager.lock().unwrap().clone();
    manager.execute_command(&session_id, &command).await
        .map_err(|e| format!("Command execution failed: {}", e))
}

/// Disconnect SSH session
#[tauri::command]
async fn ssh_disconnect(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    let manager = state.ssh_manager.lock().unwrap();
    manager.disconnect(&session_id)
        .map_err(|e| format!("Disconnect failed: {}", e))
}

/// List all active SSH sessions
#[tauri::command]
async fn ssh_list_sessions(
    state: State<'_, AppState>,
) -> Result<Vec<SSHSessionInfo>, String> {
    let manager = state.ssh_manager.lock().unwrap();
    Ok(manager.list_sessions())
}

/// Test command
#[tauri::command]
async fn greet(name: String) -> String {
    format!("Hello from Rust, {}! SSH module ready.", name)
}

/// Manual SSH test
#[tauri::command]
async fn test_ssh_manual() -> Result<String, String> {
    use ssh_test::manual_test_ssh;
    manual_test_ssh().await
        .map(|_| "SSH test completed successfully!".to_string())
}

/// Create PTY session for interactive terminal
#[tauri::command]
async fn pty_create(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    rows: u32,
    cols: u32,
) -> Result<String, String> {
    let manager = state.ssh_manager.lock().unwrap().clone();
    manager.create_pty(app, &session_id, rows, cols).await
        .map(|_| session_id)
        .map_err(|e| format!("PTY creation failed: {}", e))
}

/// Write input to PTY
#[tauri::command]
async fn pty_write(
    state: State<'_, AppState>,
    pty_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let manager = state.ssh_manager.lock().unwrap().clone();
    manager.pty_write(&pty_id, &data).await
        .map_err(|e| format!("PTY write failed: {}", e))
}

/// Resize PTY terminal
#[tauri::command]
async fn pty_resize(
    state: State<'_, AppState>,
    pty_id: String,
    rows: u32,
    cols: u32,
) -> Result<(), String> {
    let manager = state.ssh_manager.lock().unwrap();
    manager.pty_resize(&pty_id, rows, cols)
        .map_err(|e| format!("PTY resize failed: {}", e))
}

/// Close PTY session
#[tauri::command]
async fn pty_close(
    state: State<'_, AppState>,
    pty_id: String,
) -> Result<(), String> {
    let manager = state.ssh_manager.lock().unwrap();
    manager.pty_close(&pty_id)
        .map_err(|e| format!("PTY close failed: {}", e))
}

/// Connect to RDP server (Legacy/Screenshots)
#[tauri::command]
async fn rdp_connect(
    state: State<'_, AppState>,
    host: String,
    username: String,
    password: String,
) -> Result<String, String> {
    let manager = state.rdp_manager.lock().unwrap().clone();
    manager.connect(host, username, password).await
        .map_err(|e| format!("RDP connection failed: {}", e))
}

/// List files via SFTP
#[tauri::command]
async fn sftp_list_files(
    state: State<'_, AppState>,
    session_id: String,
    path: String,
) -> Result<Vec<FileEntry>, String> {
    let manager = state.ssh_manager.lock().unwrap().clone();
    manager.list_files(&session_id, &path).await
        .map_err(|e| format!("SFTP list failed: {}", e))
}

/// Launch native RDP client (External)
#[tauri::command]
async fn launch_native_rdp(
    host: String,
    username: String,
    password: String,
) -> Result<(), String> {
    use std::process::Command;
    // ... simplified implementation for brevity ...
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("cmdkey")
            .args(&["/generic", &format!("TERMSRV/{}", host), "/user", &username, "/pass", &password])
            .output();
        Command::new("mstsc").arg(format!("/v:{}", host)).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    Err("Only supported on Windows".to_string())
}

/// Get mock RDP frame
#[tauri::command]
async fn rdp_get_frame(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Option<rdp_frame_capture::RdpFrame>, String> {
    let manager = state.rdp_manager.lock().unwrap().clone();
    manager.get_mock_frame(&session_id)
        .map_err(|e| format!("Failed to get frame: {}", e))
}

/// Start Embedded Native RDP (Windows Only) - The New Option B
#[tauri::command]
async fn start_embedded_rdp_command(
    window: Window,
    host: String,
    username: String,
    password: String,
    width: i32,
    height: i32,
    x: i32,
    y: i32
) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let config = windows_rdp::RdpConfig {
            host,
            username,
            password,
            width,
            height,
            x,
            y
        };
        windows_rdp::start_embedded_rdp(window, config)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Native embedded RDP is only supported on Windows".to_string())
    }
}

// Guacamole Commands (kept for legacy/backup)
#[tauri::command]
async fn guacamole_start(state: State<'_, AppState>) -> Result<String, String> {
    state.guacamole.lock().unwrap().start().map_err(|e| e.to_string())?;
    Ok("started".to_string())
}

#[tauri::command]
async fn guacamole_stop(state: State<'_, AppState>) -> Result<(), String> {
    state.guacamole.lock().unwrap().stop().map_err(|e| e.to_string())
}

#[tauri::command]
async fn guacamole_get_url(state: State<'_, AppState>) -> Result<String, String> {
    state.guacamole.lock().unwrap().get_ws_url()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .manage(AppState {
            ssh_manager: Mutex::new(SSHManager::new()),
            rdp_manager: Mutex::new(RDPManager::new()),
            guacamole: Mutex::new(GuacamoleManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            test_ssh_manual,
            ssh_connect,
            ssh_execute,
            ssh_disconnect,
            ssh_list_sessions,
            pty_create,
            pty_write,
            pty_resize,
            pty_close,
            sftp_list_files,
            rdp_connect,
            launch_native_rdp,
            rdp_get_frame,
            guacamole_start,
            guacamole_stop,
            guacamole_get_url,
            start_embedded_rdp_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
