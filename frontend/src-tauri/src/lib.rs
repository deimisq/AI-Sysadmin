use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      println!("🚀 AI Sysadmin Agent");
      println!("   Loading: https://testing.sentrait.com.uy");
      println!("   Mode: Direct WebView (no iframe)");

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
