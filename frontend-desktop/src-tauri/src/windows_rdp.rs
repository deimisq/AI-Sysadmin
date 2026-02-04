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
        let mut last_tauri_w = 0u32;
        let mut last_tauri_h = 0u32;
        let mut iteration = 0u32;
        
        // Capture initial window metrics for delta calculation
        let initial_win_size = window.inner_size().unwrap_or_default();
        let initial_rdp_width = width;
        let initial_rdp_height = height;
        
        println!("[RDP Sync] Initial Window Size: {}x{}", initial_win_size.width, initial_win_size.height);
        
        // Monitor Margins instead of Delta
        // This ensures Sidebar/Header sizes remain fixed while content expands
        let margin_left = offset_x;
        let margin_top = offset_y;
        
        // Calculate Right/Bottom margins based on initial state
        // WinW = MarginL + RdpW + MarginR  =>  MarginR = WinW - MarginL - RdpW
        let margin_right = (initial_win_size.width as i32) - margin_left - (initial_rdp_width as i32);
        let margin_bottom = (initial_win_size.height as i32) - margin_top - (initial_rdp_height as i32);
        
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
            
            if iteration <= 5 || iteration % 60 == 0 {
                println!("[RDP Sync] Loop iteration {}", iteration);
            }
            
            // Get current Tauri window position AND size
            let current_pos_res = window.outer_position();
            let current_size_res = window.inner_size();
            
            if let (Ok(pos), Ok(size)) = (current_pos_res, current_size_res) {
                 // Calculate absolute RDP position: window position + offset
                let tauri_x = pos.x + offset_x;
                let tauri_y = pos.y + offset_y;
                
                // Calculate Dynamic Size based on Margins
                // NewW = CurrentWinW - MarginL - MarginR
                let target_w = (size.width as i32) - margin_left - margin_right;
                let target_h = (size.height as i32) - margin_top - margin_bottom;
                
                // Safety clamp
                let target_w = if target_w < 100 { 100 } else { target_w };
                let target_h = if target_h < 100 { 100 } else { target_h };
                
                let window_changed = tauri_x != last_tauri_x || tauri_y != last_tauri_y || size.width != last_tauri_w || size.height != last_tauri_h;
                
                // AGGRESSIVE MODE: Force position for the first 50 iterations (5 seconds)
                let force_update = iteration <= 50;
                
                if force_update || window_changed {
                    unsafe {
                        // Find RDP window by PID each iteration (in case handle changes)
                        let mut rdp_window = HWND(std::ptr::null_mut());
                        let mut current_hwnd = HWND(std::ptr::null_mut());
                        
                        loop {
                            match FindWindowExW(None, Some(current_hwnd), None, None) {
                                Ok(hwnd) => {
                                    current_hwnd = hwnd;
                                    if current_hwnd.0.is_null() { break; }
                                },
                                Err(_) => break,
                            }
                            
                            if !IsWindowVisible(current_hwnd).as_bool() { continue; }
                            
                            let mut window_pid = 0u32;
                            GetWindowThreadProcessId(current_hwnd, Some(&mut window_pid));
                            
                            if window_pid == rdp_pid {
                                rdp_window = current_hwnd;
                                break;
                            }
                        }
                        
                        if !rdp_window.0.is_null() {
                            // Position using calculated target size
                            let _ = SetWindowPos(
                                rdp_window,
                                Some(windows::Win32::UI::WindowsAndMessaging::HWND_TOPMOST),
                                tauri_x,
                                tauri_y,
                                target_w,
                                target_h,
                                SWP_SHOWWINDOW
                            );
                            
                            if force_update && (iteration <= 5 || iteration % 10 == 0) {
                                println!("[RDP Sync] UPDATE: Pos({}, {}) Size({}x{})", tauri_x, tauri_y, target_w, target_h);
                            }
                        }
                    }
                    
                    last_tauri_x = tauri_x;
                    last_tauri_y = tauri_y;
                    last_tauri_w = size.width;
                    last_tauri_h = size.height;
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
    // Auto-detect paths relative to CWD
    let possible_roots = vec![
        current_dir.clone(),
        current_dir.join("frontend-desktop"),
        current_dir.parent().unwrap_or(Path::new(".")).to_path_buf(),
        app_dir.to_path_buf(),
    ];

    let mut rdp_host_path = PathBuf::new();
    let mut rdp_source_path = PathBuf::new();
    let mut found_binary = false;
    let mut found_source = false;

    // Search for Binary
    for root in &possible_roots {
        let p = root.join("binaries").join("RdpHost_Native.exe");
        if p.exists() {
            rdp_host_path = p;
            found_binary = true;
            break;
        }
    }

    // Search for Source (for auto-compile)
    for root in &possible_roots {
        let p = root.join("src-rdp").join("RdpHost.cs");
        if p.exists() {
            rdp_source_path = p;
            found_source = true;
            break;
        }
    }

    // AUTO-COMPILE logic enhanced: Check generic existence OR if source is newer
    let mut needs_compile = !found_binary && found_source;
    
    if found_binary && found_source {
        // Check timestamps
        if let (Ok(meta_bin), Ok(meta_src)) = (std::fs::metadata(&rdp_host_path), std::fs::metadata(&rdp_source_path)) {
            if let (Ok(time_bin), Ok(time_src)) = (meta_bin.modified(), meta_src.modified()) {
                if time_src > time_bin {
                    println!("♻️ Source (RdpHost.cs) is newer than Binary. Recompiling...");
                    needs_compile = true;
                }
            }
        }
    }

    if needs_compile {
        println!("⚠️ Attempting AUTO-COMPILE of RdpHost_Native.exe from {:?}...", rdp_source_path);
        
        // KILL existing processes to free the file lock
        let _ = Command::new("taskkill")
            .args(&["/F", "/IM", "RdpHost_Native.exe"])
            .output();
        // Give OS a moment to release the file handle
        std::thread::sleep(std::time::Duration::from_millis(500));
        
        // Output to where source is parent -> binaries
        let output_dir = rdp_source_path.parent().unwrap().parent().unwrap().join("binaries");
        if !output_dir.exists() { let _ = std::fs::create_dir_all(&output_dir); }
        let output_exe = output_dir.join("RdpHost_Native.exe");
        
        let csc_paths = vec![
             r"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
             r"C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe",
        ];
        
        let mut compile_success = false;
        
        for csc in csc_paths {
            if Path::new(csc).exists() {
                println!("🔨 Compiling with {}", csc);
                let status = Command::new(csc)
                    .args(&[
                        "/target:winexe",
                        "/platform:x64", 
                        "/optimize",
                        &format!("/out:{}", output_exe.to_string_lossy()),
                        "/reference:System.Windows.Forms.dll",
                        "/reference:System.Drawing.dll",
                        "/reference:Microsoft.CSharp.dll",
                        &rdp_source_path.to_string_lossy()
                    ])
                    .output();
                    
                match status {
                    Ok(out) => {
                        if out.status.success() {
                            println!("✅ Compilation SUCCESS! Created: {:?}", output_exe);
                            rdp_host_path = output_exe;
                            compile_success = true;
                            found_binary = true; // Now we have it
                            break;
                        } else {
                            println!("❌ Compilation FAILED: {}", String::from_utf8_lossy(&out.stdout));
                        }
                    },
                    Err(e) => println!("❌ Failed to run csc: {}", e),
                }
            }
        }
    }

    let use_rdp_host = found_binary;

    if use_rdp_host {
        let exe_path = rdp_host_path;
        println!("🚀 Launching Native Sidecar (RdpHost.exe) from: {:?}", exe_path);
        
        // Ensure we have a valid parent HWND
        let hwnd_val = window.hwnd().map(|h| h.0 as isize).unwrap_or(0);
        
        // Calculate Relative Position (Offset) for Child Window
        // Input config.x/y are SCREEN coordinates. We need CLIENT coordinates relative to parent.
        let window_pos = window.outer_position().unwrap_or_default();
        let rel_x = config.x - window_pos.x; 
        let rel_y = config.y - window_pos.y;
        
        // Adjust for titlebar/borders if necessary (usually outer_position includes them)
        // For now, simple diff is a good starting point.
        
        println!("📍 RDP Positioning: Screen({},{})", config.x, config.y);

        let child = Command::new(exe_path)
            .arg(format!("/v:{}", config.host))
            .arg(format!("/u:{}", config.username))
            .arg(format!("/p:{}", config.password))
            .arg(format!("/w:{}", config.width))
            .arg(format!("/h:{}", config.height))
            // Pass absolute coords for initial placement
            .arg(format!("/x:{}", config.x)) 
            .arg(format!("/y:{}", config.y)) 
            // Pass Parent PID for "Suicide Pact" (Auto-Close if parent dies)
            .arg(format!("/parent_pid:{}", std::process::id()))
            // Pass Parent HWND for Owner Relationship (Z-Order syncing)
            .arg(format!("/parent:{}", hwnd_val))      
            .spawn()
            .map_err(|e| format!("Failed to launch RdpHost: {}", e))?;
            
        let pid = child.id();
        println!("✅ RdpHost launched. PID: {}", pid);
        
        // ENABLE SYNC THREAD (Overlay Bonding)
        // We treated RdpHost like MSTSC now: Find window -> Bond position loop
        let window_clone = window.clone();
        let rdp_width = config.width;
        let rdp_height = config.height;
        
        // RECALCULATE OFFSET for Sync Thread (It needs relative offset from Window Top-Left)
        // Since config.x/y are the TARGET SCREEN COORDS, and window_pos is CURRENT WINDOW SCREEN COORDS
        // Offset = Target - Window
        let win_pos = window.outer_position().unwrap_or_default();
        let offset_x = config.x - win_pos.x;
        let offset_y = config.y - win_pos.y;
        
        // Reuse the logic we had for finding MSTSC windows, but applied to RdpHost PID
        thread::spawn(move || {
             start_sync_thread(window_clone, pid, offset_x, offset_y, rdp_width, rdp_height);
        });

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

// End of implementation
