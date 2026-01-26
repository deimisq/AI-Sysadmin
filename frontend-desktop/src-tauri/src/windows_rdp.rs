use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::{Window, Runtime};
use windows::core::{PCWSTR, HSTRING};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    SetParent, SetWindowPos, GetWindowLongPtrW, SetWindowLongPtrW, GetWindowThreadProcessId,
    FindWindowExW, IsWindowVisible,
    HWND_TOP, SWP_SHOWWINDOW, GWL_STYLE, GWL_EXSTYLE,
    WS_CHILD, WS_CAPTION, WS_THICKFRAME, WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU, WS_POPUP, WS_VISIBLE
};

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

pub fn start_embedded_rdp<R: Runtime>(window: Window<R>, mut config: RdpConfig) -> Result<String, String> {
    
    // Sanitize inputs
    if config.width < 400 { config.width = 1024; }
    if config.height < 300 { config.height = 768; }
    
    println!("Starting MSTSC with: host={}, w={}, h={}", config.host, config.width, config.height);

    // 1. Save credentials using cmdkey
    let target = format!("TERMSRV/{}", config.host);
    // Silent fail/log if cmdkey fails, mstsc will just prompt
    let _ = Command::new("cmdkey")
        .args(&["/generic", &target, &format!("/user:{}", config.username), &format!("/pass:{}", config.password)])
        .output();

    // 2. Launch mstsc.exe
    let child = Command::new("mstsc")
        .args(&[
            &format!("/v:{}", config.host),
            "/noconnectionbar" 
        ])
        .spawn()
        .map_err(|e| format!("Failed to launch mstsc: {}", e))?;
        
    let pid = child.id();
    println!("MSTSC launched with PID: {}", pid);

    // 3. Wait for the window to appear and find its HWND by PID
    thread::spawn(move || {
        let mut attempts = 0;
        let mut rdp_hwnd = HWND(std::ptr::null_mut());
        
        // Try for up to 10 seconds
        while attempts < 100 {
            unsafe {
                // Iterate top-level windows using FindWindowEx loop manually
                let mut current_hwnd = HWND(std::ptr::null_mut());
                
                loop {
                    // FindNext child of Desktop (NULL parent)
                    current_hwnd = FindWindowExW(HWND(std::ptr::null_mut()), current_hwnd, PCWSTR(std::ptr::null()), PCWSTR(std::ptr::null())).unwrap_or(HWND(std::ptr::null_mut()));
                    
                    if current_hwnd.0.is_null() {
                        break; // End of list
                    }
                    
                    let mut window_pid: u32 = 0;
                    GetWindowThreadProcessId(current_hwnd, Some(&mut window_pid));
                    
                    if window_pid == pid && IsWindowVisible(current_hwnd).as_bool() {
                        rdp_hwnd = current_hwnd;
                        break; // Found it!
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
                // 4. Modify Window Style to remove borders (Aggressive stripping)
                let style = GetWindowLongPtrW(rdp_hwnd, GWL_STYLE);
                
                // Remove everything that looks like a window
                let style_mask = WS_CAPTION | WS_THICKFRAME | WS_MAXIMIZEBOX | WS_MINIMIZEBOX | WS_SYSMENU | WS_POPUP;
                let new_style = (style & !style_mask.0 as isize) | WS_CHILD.0 as isize | WS_VISIBLE.0 as isize;
                
                SetWindowLongPtrW(rdp_hwnd, GWL_STYLE, new_style);
                
                // Also clear Extended styles (sometimes drop shadow stays)
                SetWindowLongPtrW(rdp_hwnd, GWL_EXSTYLE, 0);

                // 5. Reparent to Tauri Window
                let tauri_hwnd = window.hwnd().unwrap(); 
                let parent_hwnd = HWND(tauri_hwnd.0 as *mut std::ffi::c_void);
                
                let _ = SetParent(rdp_hwnd, Some(parent_hwnd));

                // 6. Move to correct position
                // Wait a tiny bit for the parent change to apply
                thread::sleep(Duration::from_millis(50));
                
                let _ = SetWindowPos(
                    rdp_hwnd, 
                    Some(HWND_TOP), 
                    config.x, config.y, 
                    config.width, config.height, 
                    SWP_SHOWWINDOW
                );
            }
            println!("RDP Window Embedded Successfully!");
        } else {
            println!("Failed to find MSTSC window for PID {}", pid);
        }
    });

    Ok("RDP Launched".to_string())
}
