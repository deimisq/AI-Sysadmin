use tauri::Manager;

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

      println!("🚀 AI Sysadmin Agent - Desktop Mode");
      println!("⚠️  Backend sidecar integration temporarily disabled");
      println!("   Backend must be run manually: backend/dist/ai-sysadmin-backend.exe");
      println!("   This will be re-enabled once we confirm Tauri shell plugin setup");

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
