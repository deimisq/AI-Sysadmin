use std::process::Command;
use std::thread;
use std::time::Duration;
use std::sync::{Arc, Mutex};
use tauri::{Window, Runtime};
use windows::core::{PCWSTR, HSTRING};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    SetParent, SetWindowPos, GetWindowLongPtrW, SetWindowLongPtrW, GetWindowThreadProcessId,
    FindWindowExW, IsWindowVisible, GetWindowRect,
    HWND_TOP, SWP_SHOWWINDOW, SWP_NOZORDER, GWL_STYLE, GWL_EXSTYLE,
    WS_CHILD, WS_CAPTION, WS_THICKFRAME, WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU, WS_POPUP, WS_VISIBLE
};

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
            
            // Get current Tauri window position and size
            match window.outer_position() {
                Ok(pos) => {
                    let window_changed = pos.x != last_tauri_x || pos.y != last_tauri_y;
                    
                    // Since RDP is now a child window, we use RELATIVE coordinates (offset from parent)
                    // No need to add window position - coordinates are relative to parent
                    let tauri_x = offset_x;
                    let tauri_y = offset_y;
                    
                    // Check if window size changed (for resize support)
                    let window_size = window.outer_size().unwrap_or_default();
                    
                    // AGGRESSIVE MODE: Force position for the first 50 iterations (5 seconds)
                    // to fight MSTSC's tendency to reposition itself after connection
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
                                // Position using RELATIVE coordinates (child window)
                                let _ = SetWindowPos(
                                    rdp_window,
                                    Some(windows::Win32::UI::WindowsAndMessaging::HWND_TOP),
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
                        
                        last_tauri_x = pos.x;
                        last_tauri_y = pos.y;
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
    if config.height < 300 { config.height = 768; }
    
    println!("Starting MSTSC with: host={}, w={}, h={}", config.host, config.width, config.height);

    // 1. Create a temporary .rdp file (MORE RELIABLE than command line args)
    let mut rdp_path = std::env::temp_dir();
    let filename = format!("ai_agent_{}_{}.rdp", config.host.replace(":", "_"), std::process::id());
    rdp_path.push(&filename);

    let rdp_content = format!(
        "full address:s:{}\r\n\
         username:s:{}\r\n\
         desktopwidth:i:{}\r\n\
         desktopheight:i:{}\r\n\
         screen mode id:i:1\r\n\
         smart sizing:i:1\r\n\
         displayconnectionbar:i:0\r\n\
         authentication level:i:0\r\n\
         enablecredsspsupport:i:1\r\n", // 0 = No authentication requirement (bypass cert warnings)
        config.host, config.username, config.width, config.height
    );

    if let Err(e) = std::fs::write(&rdp_path, rdp_content) {
        return Err(format!("Failed to write temp RDP file: {}", e));
    }

    // 2. Save credentials using cmdkey
    let target = format!("TERMSRV/{}", config.host);
    println!("Running cmdkey for target: {}", target);
    match Command::new("cmdkey")
        .args(&["/generic", &target, &format!("/user:{}", config.username), &format!("/pass:{}", config.password)])
        .output() {
            Ok(_) => println!("cmdkey executed successfully"),
            Err(e) => println!("cmdkey failed (non-critical): {}", e),
        }

    // 3. Launch mstsc.exe with the file
    // Use absolute path to ensure we find it
    let mstsc_path = r"C:\Windows\System32\mstsc.exe";
    println!("Launching MSTSC from: {} with file: {:?}", mstsc_path, rdp_path);

    let mut child = Command::new(mstsc_path)
        .arg(&rdp_path)
        .spawn()
        .map_err(|e| format!("Failed to spawn mstsc process: {}", e))?;
        
    let pid = child.id();
    println!("MSTSC spawned with PID: {}", pid);

    // CHECK: Did it die immediately?
    thread::sleep(Duration::from_millis(500));
    if let Ok(Some(exit_status)) = child.try_wait() {
        return Err(format!("MSTSC process exited immediately with status: {}", exit_status));
    }
    println!("MSTSC process is stable (PID: {}). Starting window search...", pid);

    // Clone window for the sync thread (we'll need it later)
    let window_for_sync = window.clone();
    let rdp_x = config.x;
    let rdp_y = config.y;
    let rdp_width = config.width;
    let rdp_height = config.height;

    // 3. Wait for the window to appear and find its HWND by PID
    thread::spawn(move || {
        let mut attempts = 0;
        let mut rdp_hwnd = HWND(std::ptr::null_mut());
        
        // Best candidate strategy
        let mut best_hwnd = HWND(std::ptr::null_mut());
        let mut max_score = 0;

        // Try for up to 15 seconds
        while attempts < 150 {
            unsafe {
                let mut current_hwnd = HWND(std::ptr::null_mut());
                best_hwnd = HWND(std::ptr::null_mut());
                max_score = 0;
                
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
                    
                    // STRICT PID CHECK - Revert to simple logic
                    if window_pid == pid && IsWindowVisible(current_hwnd).as_bool() {
                        rdp_hwnd = current_hwnd;
                        println!("Found RDP Window by PID match: {}", pid);
                        break;
                    }
                }

            }
            
            if !rdp_hwnd.0.is_null() {
                break;
            }
            
            thread::sleep(Duration::from_millis(100));
            attempts += 1;
        }

        if !rdp_hwnd.0.is_null() {
            println!("Found MSTSC window HWND: {:?}", rdp_hwnd);
            
            unsafe {
                // 4. Modify Window Style - Make it a CHILD window
                
                let style = GetWindowLongPtrW(rdp_hwnd, GWL_STYLE);
                
                // Make it a CHILD window (fully integrated)
                let style_mask = WS_CAPTION | WS_THICKFRAME | WS_MAXIMIZEBOX | WS_MINIMIZEBOX | WS_SYSMENU | WS_POPUP;
                let new_style = (style & !style_mask.0 as isize) | WS_CHILD.0 as isize | WS_VISIBLE.0 as isize;
                
                SetWindowLongPtrW(rdp_hwnd, GWL_STYLE, new_style);
                SetWindowLongPtrW(rdp_hwnd, GWL_EXSTYLE, 0);

                // 5. SetParent - Make it a child of Tauri window
                let tauri_hwnd = window.hwnd().unwrap(); 
                let parent_hwnd = HWND(tauri_hwnd.0 as *mut std::ffi::c_void);
                let _ = SetParent(rdp_hwnd, Some(parent_hwnd));

                println!("[RDP] Set RDP window as child of Tauri window");

                // 6. Move to correct position within parent
                thread::sleep(Duration::from_millis(50));
                
                // Position relative to parent window (not screen)
                let _ = SetWindowPos(
                    rdp_hwnd, 
                    Some(windows::Win32::UI::WindowsAndMessaging::HWND_TOP), 
                    config.x, config.y, 
                    config.width, config.height, 
                    SWP_SHOWWINDOW
                );
            }
            println!("RDP Window Embedded Successfully!");
            
            // Calculate offset from window position
            let window_pos = window_for_sync.outer_position().unwrap_or_default();
            let offset_x = rdp_x - window_pos.x;
            let offset_y = rdp_y - window_pos.y;
            
            println!("[RDP] Calculated offset: ({}, {}) from window ({}, {}) to RDP ({}, {})", 
                offset_x, offset_y, window_pos.x, window_pos.y, rdp_x, rdp_y);
            
            // Start continuous position synchronization (pass PID, not HWND)
            start_sync_thread(window_for_sync, pid, offset_x, offset_y, rdp_width, rdp_height);
        } else {
            println!("Failed to find MSTSC window for PID {}", pid);
        }
    });

    // CRITICAL: Don't drop the child - we need to keep the process running
    std::mem::forget(child);

    Ok(("RDP Launched".to_string(), pid))
}
