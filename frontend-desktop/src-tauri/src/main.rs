// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ssh_manager;
mod ssh_test;

use ssh_manager::{SSHManager, SSHCredentials, SSHSessionInfo};
use std::sync::Mutex;
use tauri::State;

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

    let manager = state.ssh_manager.lock().unwrap();
    
    manager.connect(creds)
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
