use tauri::Manager;
use std::time::Duration;
use std::thread;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Setup logging in debug mode
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Start the backend sidecar
      println!("🚀 Starting AI Sysadmin Agent backend...");
      
      let sidecar_command = app.shell().sidecar("ai-sysadmin-backend")
        .expect("Failed to create sidecar command");

      let (mut rx, mut child) = sidecar_command
        .spawn()
        .expect("Failed to spawn backend sidecar");

      // Monitor backend output in a separate thread
      tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
          match event {
            tauri::shell::process::CommandEvent::Stdout(line) => {
              println!("[Backend] {}", String::from_utf8_lossy(&line));
            }
            tauri::shell::process::CommandEvent::Stderr(line) => {
              eprintln!("[Backend Error] {}", String::from_utf8_lossy(&line));
            }
            tauri::shell::process::CommandEvent::Terminated(payload) => {
              println!("[Backend] Process terminated with code: {:?}", payload.code);
              break;
            }
            _ => {}
          }
        }
      });

      // Wait for backend to be ready
      println!("⏳ Waiting for backend to start...");
      thread::sleep(Duration::from_secs(3));

      // Verify backend is running with health check
      let backend_url = "http://127.0.0.1:8000/health";
      match check_backend_health(backend_url) {
        Ok(_) => {
          println!("✅ Backend is running and healthy!");
        }
        Err(e) => {
          eprintln!("⚠️  Backend health check failed: {}", e);
          eprintln!("   The application will continue, but backend may not be available.");
        }
      }

      // Store child process handle for cleanup
      app.manage(BackendProcess { child });

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        println!("🛑 Shutting down backend...");
        // Backend will be terminated when the process exits
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// Struct to hold the backend process
struct BackendProcess {
  child: tauri::shell::process::CommandChild,
}

// Health check function
fn check_backend_health(url: &str) -> Result<(), String> {
  use std::time::Instant;
  
  let start = Instant::now();
  let timeout = Duration::from_secs(10);
  
  while start.elapsed() < timeout {
    match ureq::get(url).timeout(Duration::from_secs(2)).call() {
      Ok(response) => {
        if response.status() == 200 {
          return Ok(());
        }
      }
      Err(_) => {
        thread::sleep(Duration::from_millis(500));
        continue;
      }
    }
  }
  
  Err("Backend did not respond within timeout".to_string())
}
