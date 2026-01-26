use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::{Window, Runtime};
use windows::core::{PCWSTR, HSTRING};
use windows::Win32::Foundation::{HWND, BOOL, LPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    FindWindowW, SetParent, SetWindowPos, GetWindowLongPtrW, SetWindowLongPtrW,
    HWND_TOP, SWP_SHOWWINDOW, GWL_STYLE,
    WS_POPUP, WS_CHILD, WS_CAPTION, WS_THICKFRAME, WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU
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

pub fn start_embedded_rdp<R: Runtime>(window: Window<R>, config: RdpConfig) -> Result<String, String> {
    
    // 1. Save credentials using cmdkey
    let target = format!("TERMSRV/{}", config.host);
    // Silent fail/log if cmdkey fails, mstsc will just prompt
    let _ = Command::new("cmdkey")
        .args(&["/generic", &target, &format!("/user:{}", config.username), &format!("/pass:{}", config.password)])
        .output();

    // 2. Launch mstsc.exe
    let _child = Command::new("mstsc")
        .args(&[
            &format!("/v:{}", config.host),
            &format!("/w:{}", config.width),
            &format!("/h:{}", config.height),
            "/noconnectionbar" 
        ])
        .spawn()
        .map_err(|e| format!("Failed to launch mstsc: {}", e))?;

    // 3. Wait for the window to appear and find its HWND
    thread::spawn(move || {
        let mut rdp_hwnd = HWND(std::ptr::null_mut());
        let mut attempts = 0;
        
        // Try for up to 10 seconds
        while attempts < 100 {
            unsafe {
                 let title = HSTRING::from(&config.host);
                 // In newer windows-rs, FindWindowW returns Result<HWND>. We unwrap_or default (null).
                 rdp_hwnd = FindWindowW(PCWSTR(std::ptr::null()), PCWSTR(title.as_ptr())).unwrap_or(HWND(std::ptr::null_mut()));
                 
                 // Fallback to class name if title match fails (TscShellContainerClass)
                 if rdp_hwnd.0.is_null() {
                    let class_name = HSTRING::from("TscShellContainerClass");
                    rdp_hwnd = FindWindowW(PCWSTR(class_name.as_ptr()), PCWSTR(std::ptr::null())).unwrap_or(HWND(std::ptr::null_mut()));
                 }
            }

            if !rdp_hwnd.0.is_null() {
                break;
            }
            
            thread::sleep(Duration::from_millis(100));
            attempts += 1;
        }

        if !rdp_hwnd.0.is_null() {
            unsafe {
                // 4. Modify Window Style to remove borders
                let style = GetWindowLongPtrW(rdp_hwnd, GWL_STYLE);
                let new_style = style & !(WS_CAPTION | WS_THICKFRAME | WS_MAXIMIZEBOX | WS_MINIMIZEBOX | WS_SYSMENU).0 as isize;
                let final_style = new_style | WS_CHILD.0 as isize;
                
                SetWindowLongPtrW(rdp_hwnd, GWL_STYLE, final_style);

                // 5. Reparent to Tauri Window
                let tauri_hwnd = window.hwnd().unwrap(); 
                // tauri handle is already an HWND-compatible type on Windows
                let parent_hwnd = HWND(tauri_hwnd.0 as *mut std::ffi::c_void);
                
                // SetParent now expects Option<HWND>
                let _ = SetParent(rdp_hwnd, Some(parent_hwnd));

                // 6. Move to correct position
                // SetWindowPos expects Option<HWND> for insert_after
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
            println!("Failed to find MSTSC window");
        }
    });

    Ok("RDP Launched".to_string())
}
