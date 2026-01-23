// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ssh_manager;
mod ssh_test;
mod pty_session;
mod rdp_manager;
mod rdp_sidecar;
mod rdp_frame_capture;
mod guacamole_manager;

use ssh_manager::{SSHManager, SSHCredentials, SSHSessionInfo, FileEntry};
use rdp_manager::RDPManager;
use rdp_frame_capture::RdpFrame;
use guacamole_manager::GuacamoleManager;
use std::sync::Mutex;
use tauri::{State, AppHandle};

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

/// Test command to verify Rust backend is working
#[tauri::command]
async fn greet(name: String) -> String {
    format!("Hello from Rust, {}! SSH module ready.", name)
}

/// Manual SSH test (runs against localhost:2222)
#[tauri::command]
async fn test_ssh_manual() -> Result<String, String> {
    use ssh_test::manual_test_ssh;
    
    manual_test_ssh().await
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

/// Connect to RDP server
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

/// Launch native RDP client
#[tauri::command]
async fn launch_native_rdp(
    host: String,
    username: String,
    password: String,
) -> Result<(), String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        // Windows: Use cmdkey to store credentials, then launch mstsc.exe
        // This allows automatic login without prompting for password
        
        // Step 1: Store credentials using cmdkey
        let cmdkey_result = Command::new("cmdkey")
            .arg("/generic")
            .arg(format!("TERMSRV/{}", host))
            .arg("/user")
            .arg(&username)
            .arg("/pass")
            .arg(&password)
            .output();
        
        match cmdkey_result {
            Ok(output) => {
                if !output.status.success() {
                    let error_msg = String::from_utf8_lossy(&output.stderr);
                    return Err(format!("Failed to store credentials: {}", error_msg));
                }
                println!("Stored RDP credentials for {}", host);
            },
            Err(e) => return Err(format!("Failed to execute cmdkey: {}", e))
        }
        
        // Step 2: Launch mstsc.exe
        let result = Command::new("mstsc")
            .arg(format!("/v:{}", host))
            .spawn();
        
        match result {
            Ok(_) => {
                println!("Launched mstsc for {} with stored credentials", host);
                Ok(())
            },
            Err(e) => Err(format!("Failed to launch mstsc: {}", e))
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: Try xfreerdp with password parameter
        let result = Command::new("xfreerdp")
            .arg(format!("/v:{}", host))
            .arg(format!("/u:{}", username))
            .arg(format!("/p:{}", password))
            .arg("/cert:ignore")
            .spawn();
        
        match result {
            Ok(_) => {
                println!("Launched xfreerdp for {}", host);
                Ok(())
            },
            Err(_) => {
                // Fallback to remmina (doesn't support password in CLI easily)
                let remmina_result = Command::new("remmina")
                    .arg("-c")
                    .arg(format!("rdp://{}@{}", username, host))
                    .spawn();
                
                match remmina_result {
                    Ok(_) => Ok(()),
                    Err(e) => Err(format!("No RDP client found. Install xfreerdp or remmina. Error: {}", e))
                }
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: Microsoft Remote Desktop doesn't support password in CLI
        // User will need to enter it manually
        let result = Command::new("open")
            .arg("-a")
            .arg("Microsoft Remote Desktop")
            .arg(format!("rdp://full%20address=s:{}:3389&username=s:{}", host, username))
            .spawn();
        
        match result {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to open Remote Desktop. Install 'Microsoft Remote Desktop' from App Store. Error: {}", e))
        }
    }
}

/// Get mock RDP frame for testing
#[tauri::command]
async fn rdp_get_frame(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Option<rdp_frame_capture::RdpFrame>, String> {
    let manager = state.rdp_manager.lock().unwrap().clone();
    
    manager.get_mock_frame(&session_id)
        .map_err(|e| format!("Failed to get frame: {}", e))
}

/// Start Guacamole daemon
#[tauri::command]
async fn guacamole_start(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let mut guac = state.guacamole.lock().unwrap();
    
    guac.start()
        .map_err(|e| format!("Failed to start guacd: {}", e))?;
    
    Ok(guac.get_ws_url())
}

/// Stop Guacamole daemon
#[tauri::command]
async fn guacamole_stop(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut guac = state.guacamole.lock().unwrap();
    
    guac.stop()
        .map_err(|e| format!("Failed to stop guacd: {}", e))
}

/// Get Guacamole WebSocket URL
#[tauri::command]
async fn guacamole_get_url(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let guac = state.guacamole.lock().unwrap();
    
    if !guac.is_port_listening() {
        return Err("guacd not running".to_string());
    }
    
    Ok(guac.get_ws_url())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
