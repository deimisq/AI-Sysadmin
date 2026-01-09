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

      println!("🚀 AI Sysadmin Agent - Desktop Wrapper");
      println!("   Loading from: https://testing.sentrait.com.uy");

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
