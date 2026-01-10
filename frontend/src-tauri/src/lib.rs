use tauri::{command, Emitter, Manager, Window};
use tauri_plugin_oauth::start;

#[command]
async fn start_oauth_server(window: Window) -> Result<u16, String> {
    start(move |url| {
        println!("OAuth redirect received: {}", url);
        let _ = window.emit("oauth_redirect", url);
    })
    .map_err(|err| err.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_oauth::init())
    .invoke_handler(tauri::generate_handler![start_oauth_server])
    .setup(|app| {
      println!("🚀 AI Sysadmin Agent");
      
      // Open DevTools for debugging
      let window = app.get_webview_window("main").unwrap();
      window.open_devtools();
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
