// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ssh_manager;
mod ssh_test;
mod pty_session;

use ssh_manager::{SSHManager, SSHCredentials, SSHSessionInfo};
use std::sync::Mutex;
use tauri::{State, Manager, AppHandle};

// Global SSH manager (shared across the app)
struct AppState {
    ssh_manager: Mutex<SSHManager>,
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

    // Clone manager and drop the lock immediately so we don't block other commands
    let manager = state.ssh_manager.lock().unwrap().clone();
    
    // Now await the async operation without holding the lock
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
    let manager = state.ssh_manager.lock().unwrap();
    
    manager.execute_command(&session_id, &command)
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

/// Test command to verify Rust backend is working
#[tauri::command]
async fn greet(name: String) -> String {
    format!("Hello from Rust, {}! SSH module ready.", name)
}

/// Manual SSH test (runs against localhost:2222)
#[tauri::command]
async fn test_ssh_manual() -> Result<String, String> {
    use ssh_test::manual_test_ssh;
    
    manual_test_ssh()
        .map(|_| "SSH test completed successfully! Check console for details.".to_string())
}

/// Create PTY session for interactive terminal
#[tauri::command]
async fn pty_create(
    app: AppHandle, // Injected
    state: State<'_, AppState>,
    session_id: String,
    rows: u32,
    cols: u32,
) -> Result<String, String> {
    // Release lock and clone manager
    let manager = state.ssh_manager.lock().unwrap().clone();
    
    manager.create_pty(app, &session_id, rows, cols).await
        .map(|_| session_id)
        .map_err(|e| format!("PTY creation failed: {}", e))
}

// pty_read removed - replaced by events

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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .manage(AppState {
            ssh_manager: Mutex::new(SSHManager::new()),
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
