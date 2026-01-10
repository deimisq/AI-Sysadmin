use std::process::Command;

fn main() {
    println!("🚀 Abriendo AI Sysadmin Agent...");
    
    let url = "https://testing.sentrait.com.uy";
    
    // Open in default browser
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", url])
            .spawn()
            .expect("Failed to open browser");
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .expect("Failed to open browser");
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .expect("Failed to open browser");
    }
    
    println!("✅ Navegador abierto con {}", url);
    println!("Puedes cerrar esta ventana.");
    
    // Keep window open for 2 seconds so user sees the message
    std::thread::sleep(std::time::Duration::from_secs(2));
}
