use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::{Window, Runtime};
use windows::core::{PCWSTR, HSTRING};
use windows::Win32::Foundation::{HWND, RECT, BOOL, LPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    FindWindowW, SetParent, SetWindowPos, GetWindowRect, 
    MoveWindow, ShowWindow, SW_SHOW, HWND_TOP, SWP_SHOWWINDOW,
    GWL_STYLE, SetWindowLongPtrW, GetWindowLongPtrW,
    WS_POPUP, WS_CHILD, WS_VISIBLE, WS_CAPTION, WS_THICKFRAME,
    WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU
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
    // cmdkey /generic:TERMSRV/host /user:username /pass:password
    let target = format!("TERMSRV/{}", config.host);
    let _ = Command::new("cmdkey")
        .args(&["/generic", &target, &format!("/user:{}", config.username), &format!("/pass:{}", config.password)])
        .output()
        .map_err(|e| format!("Failed to save credentials: {}", e))?;

    // 2. Launch mstsc.exe
    // mstsc /v:host /w:width /h:height
    let mut child = Command::new("mstsc")
        .args(&[
            &format!("/v:{}", config.host),
            &format!("/w:{}", config.width),
            &format!("/h:{}", config.height),
            "/noconnectionbar" // Hide connection bar if possible
        ])
        .spawn()
        .map_err(|e| format!("Failed to launch mstsc: {}", e))?;

    let child_pid = child.id();

    // 3. Wait for the window to appear and find its HWND
    // We need to poll because mstsc takes time to create the window
    thread::spawn(move || {
        let mut rdp_hwnd = HWND(0);
        let mut attempts = 0;
        
        // Try for up to 10 seconds
        while attempts < 100 {
            // Find window by class name "TscShellContainerClass" (standard MSTSC window class)
            // Or typically checking by title which usually starts with the host ip
            
            // Note: Finding by PID is hard in pure WinAPI EnumWindows without external help, 
            // so we'll look for "TscShellContainerClass" which is unique to mstsc
            unsafe {
                 let class_name = HSTRING::from("TscShellContainerClass");
                 // We might have multiple, so ideally we match the title usually containing the IP
                 // simpler approach: FindWindowW(None, title)
                 
                 // Try to match the host in the title
                 let title = HSTRING::from(&config.host);
                 
                 // Try exact title first (often just IP)
                 rdp_hwnd = FindWindowW(PCWSTR(std::ptr::null()), PCWSTR(title.as_ptr()));
                 
                 // If not found, try class based + logic (simplified here to class)
                 if rdp_hwnd.0 == 0 {
                    rdp_hwnd = FindWindowW(PCWSTR(class_name.as_ptr()), PCWSTR(std::ptr::null()));
                 }
            }

            if rdp_hwnd.0 != 0 {
                // Verify if this window belongs to our process (simplified check)
                // In real prod code we check GetWindowThreadProcessId
                break;
            }
            
            thread::sleep(Duration::from_millis(100));
            attempts += 1;
        }

        if rdp_hwnd.0 != 0 {
            unsafe {
                // 4. Modify Window Style to remove borders
                let style = GetWindowLongPtrW(rdp_hwnd, GWL_STYLE);
                // Remove Popups, Captions, Borders
                let new_style = style & !(WS_CAPTION | WS_THICKFRAME | WS_MAXIMIZEBOX | WS_MINIMIZEBOX | WS_SYSMENU).0 as isize;
                // Add Child style
                let final_style = new_style | WS_CHILD.0 as isize;
                
                SetWindowLongPtrW(rdp_hwnd, GWL_STYLE, final_style);

                // 5. Reparent to Tauri Window
                // We need the HWND of the Tauri window
                let tauri_hwnd = window.hwnd().unwrap(); // Tauri gives us this handle
                let parent_hwnd = HWND(tauri_hwnd.0 as _);
                
                SetParent(rdp_hwnd, parent_hwnd);

                // 6. Move to correct position
                SetWindowPos(
                    rdp_hwnd, 
                    HWND_TOP, 
                    config.x, config.y, 
                    config.width, config.height, 
                    SWP_SHOWWINDOW
                );
                
                // Force focus
                // SetFocus(rdp_hwnd);
            }
            println!("RDP Window Embedded Successfully!");
        } else {
            println!("Failed to find MSTSC window");
        }
    });

    Ok("RDP Launched".to_string())
}
