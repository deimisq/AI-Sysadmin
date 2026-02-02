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
                // 4. Modify Window Style
                // Strategy: OVERLAY/POPUP (Not Child)
                // We make it a borderless popup that floats ABOVE the main window
                // This avoids Z-Order issues with WebView2
                
                let style = GetWindowLongPtrW(rdp_hwnd, GWL_STYLE);
                
                // Remove borders/caption but keep POPUP
                let style_mask = WS_CAPTION | WS_THICKFRAME | WS_MAXIMIZEBOX | WS_MINIMIZEBOX | WS_SYSMENU;
                let new_style = (style & !style_mask.0 as isize) | WS_POPUP.0 as isize | WS_VISIBLE.0 as isize;
                
                // Remove child flag if present (just in case mstsc adds it)
                let final_style = new_style & !(WS_CHILD.0 as isize);
                
                SetWindowLongPtrW(rdp_hwnd, GWL_STYLE, final_style);
                SetWindowLongPtrW(rdp_hwnd, GWL_EXSTYLE, 0);

                // 5. NO SetParent - Keep it independent but positioned
                // let tauri_hwnd = window.hwnd().unwrap(); 
                // let parent_hwnd = HWND(tauri_hwnd.0 as *mut std::ffi::c_void);
                // let _ = SetParent(rdp_hwnd, Some(parent_hwnd));

                // 6. Move to correct position & Z-Order TOPMOST
                thread::sleep(Duration::from_millis(50));
                
                // Use HWND_TOPMOST to ensure it floats above the main app
                // Note: HWND_TOP might be enough, but TOPMOST guarantees visibility
                let _ = SetWindowPos(
                    rdp_hwnd, 
                    Some(windows::Win32::UI::WindowsAndMessaging::HWND_TOPMOST), 
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
