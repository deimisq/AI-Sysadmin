use std::process::Command;
use std::thread;
use std::time::Duration;
use std::sync::{Arc, Mutex};
use tauri::{Window, Runtime};
use windows::core::PCWSTR;
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::WindowsAndMessaging::{
    SetWindowPos, GetWindowLongPtrW, SetWindowLongPtrW, GetWindowThreadProcessId,
    FindWindowExW, IsWindowVisible, GetWindowRect,
    SWP_SHOWWINDOW, SWP_NOZORDER, GWL_STYLE, GWL_EXSTYLE,
    WS_CAPTION, WS_THICKFRAME, WS_CHILD, WS_POPUP,
    WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU, WS_VISIBLE,
};
use std::path::{Path, PathBuf};

use lazy_static::lazy_static;

// Global state to track RDP window and sync thread
lazy_static! {
    static ref RDP_WINDOW_STATE: Arc<Mutex<Option<RdpWindowState>>> = Arc::new(Mutex::new(None));
}

struct RdpWindowState {
    rdp_pid: u32,    // Store PID to find window dynamically
    should_sync: bool,
    offset_x: i32,   // Offset from window top-left to RDP container
    offset_y: i32,
    width: i32,
    height: i32,
}

// Structure to pass RDP config
#[derive(serde::Deserialize)]
pub struct RdpConfig {
    pub host: String,
    pub username: String,
    pub password: String,
    pub width: i32,
    pub height: i32,
    pub x: i32,
    pub y: i32,
}

// Stop synchronization thread
pub fn stop_rdp_sync() {
    if let Ok(mut state) = RDP_WINDOW_STATE.lock() {
        if let Some(window_state) = state.as_mut() {
            window_state.should_sync = false;
            println!("[RDP Sync] Stopped synchronization");
        }
        *state = None;
    }
}

// Start synchronization thread
fn start_sync_thread<R: Runtime>(window: Window<R>, rdp_pid: u32, offset_x: i32, offset_y: i32, width: i32, height: i32) {
    
    // Store in global state
    {
        let mut state = RDP_WINDOW_STATE.lock().unwrap();
        *state = Some(RdpWindowState {
            rdp_pid,
            should_sync: true,
            offset_x,
            offset_y,
            width,
            height,
        });
    }
    
    println!("[RDP Sync] Starting position sync thread with PID {} and offset ({}, {})", rdp_pid, offset_x, offset_y);
    
    thread::spawn(move || {
        let mut last_tauri_x = 0i32;
        let mut last_tauri_y = 0i32;
        let mut iteration = 0u32;
        
        loop {
            // Check if we should continue
            let should_continue = {
                if let Ok(state) = RDP_WINDOW_STATE.lock() {
                    state.as_ref().map(|s| s.should_sync).unwrap_or(false)
                } else {
                    false
                }
            };
            
            if !should_continue {
                println!("[RDP Sync] Thread stopped");
                break;
            }
            
            iteration += 1;
            
            if iteration <= 5 || iteration % 10 == 0 {
                println!("[RDP Sync] Loop iteration {}", iteration);
            }
            
            // Get current Tauri window position
            match window.outer_position() {
                Ok(pos) => {
                    // Calculate absolute RDP position: window position + offset
                    let tauri_x = pos.x + offset_x;
                    let tauri_y = pos.y + offset_y;
                    
                    let window_changed = tauri_x != last_tauri_x || tauri_y != last_tauri_y;
                    
                    // AGGRESSIVE MODE: Force position for the first 50 iterations (5 seconds)
                    let force_update = iteration <= 50;
                    
                    if force_update || window_changed {
                        unsafe {
                            // DYNAMIC SEARCH: Find RDP window by PID each iteration
                            // This handles MSTSC creating multiple windows over time
                            let mut rdp_window = HWND(std::ptr::null_mut());
                            let mut current_hwnd = HWND(std::ptr::null_mut());
                            
                            loop {
                                match FindWindowExW(None, Some(current_hwnd), None, None) {
                                    Ok(hwnd) => {
                                        current_hwnd = hwnd;
                                        if current_hwnd.0.is_null() {
                                            break;
                                        }
                                    },
                                    Err(_) => break,
                                }
                                
                                if !IsWindowVisible(current_hwnd).as_bool() {
                                    continue;
                                }
                                
                                let mut window_pid = 0u32;
                                GetWindowThreadProcessId(current_hwnd, Some(&mut window_pid));
                                
                                if window_pid == rdp_pid {
                                    rdp_window = current_hwnd;
                                    break;
                                }
                            }
                            
                            if !rdp_window.0.is_null() {
                                // Position using ABSOLUTE screen coordinates (floating window)
                                let _ = SetWindowPos(
                                    rdp_window,
                                    Some(windows::Win32::UI::WindowsAndMessaging::HWND_TOPMOST),
                                    tauri_x,
                                    tauri_y,
                                    width,
                                    height,
                                    SWP_SHOWWINDOW
                                );
                                
                                if force_update && (iteration <= 5 || iteration % 10 == 0) {
                                    println!("[RDP Sync] FORCE position to ({}, {}) size ({}, {}) [iter {}]", tauri_x, tauri_y, width, height, iteration);
                                }
                            } else {
                                if iteration <= 5 || iteration % 20 == 0 {
                                    println!("[RDP Sync] No RDP window found for PID {} at iteration {}", rdp_pid, iteration);
                                }
                            }
                        }
                        
                        last_tauri_x = tauri_x;
                        last_tauri_y = tauri_y;
                    }
                },
                Err(e) => {
                    println!("[RDP Sync] ERROR getting window position: {:?}", e);
                    // Don't break, just continue trying
                }
            }
            
            // Sync every 16ms (60 FPS) for smooth movement
            thread::sleep(Duration::from_millis(16));
        }
    });
}

pub fn start_embedded_rdp<R: Runtime>(window: Window<R>, mut config: RdpConfig) -> Result<(String, u32), String> {
    
    // Sanitize inputs
    if config.width < 400 { config.width = 1024; }
    
    // Define Paths
    let current_exe = std::env::current_exe().unwrap_or_default();
    let current_dir = std::env::current_dir().unwrap_or_default();
    let app_dir = current_exe.parent().unwrap_or(std::path::Path::new("."));

    // CHECK: 1. Custom RdpHost.exe (C# Sidecar, ActiveX Native) - BEST EXPERIENCE
    let rdp_host_path = app_dir.join("binaries").join("RdpHost.exe");
    let dev_rdp_host_path = current_dir.join("frontend-desktop").join("binaries").join("RdpHost.exe");
    let dev_rdp_host_path_2 = current_dir.join("binaries").join("RdpHost.exe");
    
    let use_rdp_host = rdp_host_path.exists() || dev_rdp_host_path.exists() || dev_rdp_host_path_2.exists();

    if use_rdp_host {
        let exe_path = if rdp_host_path.exists() { rdp_host_path } 
                      else if dev_rdp_host_path.exists() { dev_rdp_host_path }
                      else { dev_rdp_host_path_2 };
                      
        println!("🚀 Launching Native Sidecar (RdpHost.exe) from: {:?}", exe_path);
        
        let hwnd = window.hwnd().map(|h| h.0 as isize).unwrap_or(0);

        // RdpHost manages its own embedding via /parent. 
        // We do NOT start the sync thread because RdpHost is a true child window 
        // and using SetWindowPos with screen coordinates (like the sync thread does) would break it.
        // TODO: Add a resize listener thread if needed.
        
        let child = Command::new(exe_path)
            .arg(format!("/v:{}", config.host))
            .arg(format!("/u:{}", config.username))
            .arg(format!("/p:{}", config.password))
            .arg(format!("/w:{}", config.width))
            .arg(format!("/h:{}", config.height))
            .arg(format!("/parent:{}", hwnd))
            .spawn()
            .map_err(|e| format!("Failed to launch RdpHost: {}", e))?;
            
        let pid = child.id();
        println!("✅ RdpHost launched. PID: {}", pid);
        return Ok(("Native Sidecar Launched".to_string(), pid));
    }

    // CHECK: 2. Fallback to MSTSC/FreeRDP
    println!("[RDP] Current Executable: {:?}", current_exe);

    // Potential paths for FreeRDP check
    let mut search_paths = vec![];
    if let Some(parent) = current_exe.parent() {
        search_paths.push(parent.join("binaries").join("wfreerdp.exe"));
        search_paths.push(parent.join("wfreerdp.exe"));
    }
    search_paths.push(current_dir.join("binaries").join("wfreerdp.exe"));
    search_paths.push(current_dir.join("frontend-desktop").join("binaries").join("wfreerdp.exe"));
    search_paths.push(std::path::PathBuf::from(r"C:\Users\DeimisQuintanilla\Proyectos\ai_agent\frontend-desktop\binaries\wfreerdp.exe"));
    
    let mut freerdp_path = std::path::PathBuf::new();
    let mut found_freerdp = false;
    
    for path in &search_paths {
        if path.exists() {
            println!("[RDP] ✅ Found wfreerdp.exe at: {:?}", path);
            freerdp_path = path.clone();
            found_freerdp = true;
            break;
        }
    }
    
    let child_res = if found_freerdp {
        println!("🚀 Launching FreeRDP from: {:?}", freerdp_path);
        Command::new(freerdp_path)
            .arg(format!("/v:{}", config.host))
            .arg(format!("/u:{}", config.username))
            .arg(format!("/p:{}", config.password))
            .arg(format!("/w:{}", config.width))
            .arg(format!("/h:{}", config.height))
            .arg("/smart-sizing")
            .arg("/cert:ignore")
            .arg("/sec:rdp")
            .spawn()
    } else {
        println!("⚠️ FreeRDP/Sidecar not found. Falling back to MSTSC.");
        let mut rdp_path = std::env::temp_dir();
        let filename = format!("ai_agent_{}_{}.rdp", config.host.replace(":", "_"), std::process::id());
        rdp_path.push(&filename);
        
        let rdp_content = format!(
            "full address:s:{}\r\nusername:s:{}\r\nscreen mode id:i:1\r\nsmart sizing:i:1\r\ndisplayconnectionbar:i:0\r\n", 
            config.host, config.username
        );
        let _ = std::fs::write(&rdp_path, rdp_content);
        
        let target = format!("TERMSRV/{}", config.host);
        let _ = Command::new("cmdkey")
            .args(&["/generic", &target, &format!("/user:{}", config.username), &format!("/pass:{}", config.password)])
            .output();

        Command::new("mstsc").arg(rdp_path).spawn()
    };

    let child = child_res.map_err(|e| format!("Failed to spawn process: {}", e))?;
    let pid = child.id();
    println!("RDP Process spawned with PID: {}", pid);

    // MSTSC/FreeRDP require window searching and embedding logic
    // This logic runs in a separate thread to not block the main runtime
    let window_clone = window.clone();
    let rdp_x = config.x;
    let rdp_y = config.y;
    let rdp_width = config.width;
    let rdp_height = config.height;
    
    thread::spawn(move || {
        // Wait for window instantiation
        thread::sleep(Duration::from_millis(1000));
        
        let mut attempts = 0;
        let mut rdp_hwnd = HWND(std::ptr::null_mut());
        
        while attempts < 150 {
            unsafe {
                let mut current_hwnd = HWND(std::ptr::null_mut());
                loop {
                    let child_after = if current_hwnd.0.is_null() { None } else { Some(current_hwnd) };
                    match FindWindowExW(None, child_after, PCWSTR(std::ptr::null()), PCWSTR(std::ptr::null())) {
                        Ok(hwnd) => {
                            current_hwnd = hwnd;
                            if current_hwnd.0.is_null() { break; }
                        },
                        Err(_) => break, 
                    }
                    
                    let mut window_pid: u32 = 0;
                    GetWindowThreadProcessId(current_hwnd, Some(&mut window_pid));
                    
                    if window_pid == pid && IsWindowVisible(current_hwnd).as_bool() {
                        rdp_hwnd = current_hwnd;
                        break;
                    }
                }
            }
            if !rdp_hwnd.0.is_null() { break; }
            thread::sleep(Duration::from_millis(100));
            attempts += 1;
        }

        if !rdp_hwnd.0.is_null() {
            unsafe {
                // Modify style to POPUP (floating)
                let style = GetWindowLongPtrW(rdp_hwnd, GWL_STYLE);
                let style_mask = WS_CAPTION | WS_THICKFRAME | WS_MAXIMIZEBOX | WS_MINIMIZEBOX | WS_SYSMENU | WS_CHILD;
                let new_style = (style & !style_mask.0 as isize) | WS_POPUP.0 as isize | WS_VISIBLE.0 as isize;
                SetWindowLongPtrW(rdp_hwnd, GWL_STYLE, new_style);
                SetWindowLongPtrW(rdp_hwnd, GWL_EXSTYLE, 0);

                let _ = SetWindowPos(
                    rdp_hwnd, 
                    Some(windows::Win32::UI::WindowsAndMessaging::HWND_TOPMOST), 
                    rdp_x, rdp_y, 
                    rdp_width, rdp_height, 
                    SWP_SHOWWINDOW
                );
            }
            
            // Calculate absolute offset
            let window_pos = window_clone.outer_position().unwrap_or_default();
            let offset_x = rdp_x - window_pos.x;
            let offset_y = rdp_y - window_pos.y;
            
            // Start SYNC THREAD
            start_sync_thread(window_clone, pid, offset_x, offset_y, rdp_width, rdp_height);
        }
    });

    // Keep process alive
    std::mem::forget(child);
    Ok(("RDP Launched".to_string(), pid))
}

// Updated helper signature to include finding logic flag
fn spawn_sync_thread<R: Runtime>(window: Window<R>, pid: u32, offset_x: i32, offset_y: i32, width: i32, height: i32, find_and_embed: bool) {
    let window_clone = window.clone(); // ...
