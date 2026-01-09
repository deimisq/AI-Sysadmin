use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Setup logging
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Debug)
          .build(),
      )?;

      println!("🚀 AI Sysadmin Agent - Desktop App");
      println!("   Loading iframe with: https://testing.sentrait.com.uy");

      // Open DevTools in development
      #[cfg(debug_assertions)]
      {
        let window = app.get_webview_window("main").unwrap();
        window.open_devtools();
        println!("🔧 DevTools opened");
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
