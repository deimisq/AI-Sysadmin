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

    // ... (rest of launch code) ...

                    // Scoring
                    let mut score = 0;
                    
                    // 1. PID Match (Perfect)
                    if window_pid == pid {
                        score = 100;
                    }
                    
                    // Check for blocking Dialogs (#32770)
                    if class_name == "#32770" && (title.contains("Remote Desktop") || title.contains("Escritorio remoto") || title.contains(&config.host)) {
                        println!("[WARNING] BLOCKING DIALOG DETECTED: '{}'. MSTSC might be waiting for input.", title);
                    }

                    // 2. Class Match (Required for others)
                    if class_name.contains("TscShell") {
                         // Log even if hidden
                        if !IsWindowVisible(current_hwnd).as_bool() {
                             println!("[DEBUG] Found HIDDEN RDP Window: '{}'", title);
                        }

                        if score < 100 { score = 10; } // Base score for just being RDP

                        if title.contains(&config.host) {
                            score += 50;
                        }
                        if title.contains("ai_agent") {
                            score += 40;
                        }
                    }

                    if score > max_score {
                        max_score = score;
                        best_hwnd = current_hwnd;
                        println!("[DEBUG] New Best Candidate: Score {} | Title: '{}' | Class: '{}'", score, title, class_name);
                    }
                }
            }
            
            // If we found a good enough candidate (Score > 0)
            if !best_hwnd.0.is_null() && max_score > 0 {
                rdp_hwnd = best_hwnd; // Valid assignment now
                println!("Selected RDP Window with Score: {}", max_score);
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
