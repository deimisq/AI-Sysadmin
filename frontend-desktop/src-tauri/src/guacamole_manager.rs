use std::process::{Command, Child, Stdio};
use std::path::PathBuf;
use anyhow::{Result, Context, bail};
use std::net::TcpStream;
use std::time::Duration;

/// Guacamole daemon manager
pub struct GuacamoleManager {
    process: Option<Child>,
    port: u16,
    bind_address: String,
}

impl GuacamoleManager {
    /// Create new Guacamole manager with default settings
    pub fn new() -> Self {
        Self {
            process: None,
            port: 4822, // Default guacd port
            bind_address: "127.0.0.1".to_string(),
        }
    }

    /// Create with custom port
    pub fn with_port(port: u16) -> Self {
        Self {
            process: None,
            port,
            bind_address: "127.0.0.1".to_string(),
        }
    }

    /// Detect guacd binary on the system
    pub fn detect_guacd() -> Result<PathBuf> {
        #[cfg(target_os = "windows")]
        {
            // Try bundled binary first
            if let Ok(exe_dir) = std::env::current_exe() {
                let bundled = exe_dir.parent()
                    .unwrap()
                    .join("binaries")
                    .join("guacd.exe");
                
                if bundled.exists() {
                    println!("Found bundled guacd.exe: {:?}", bundled);
                    return Ok(bundled);
                }
            }
            
            // Check common installation paths
            let paths = vec![
                r"C:\Program Files\Guacamole\bin\guacd.exe",
                r"C:\Program Files (x86)\Guacamole\bin\guacd.exe",
                r"C:\guacamole-server\guacd.exe",
            ];
            
            for path in paths {
                let p = PathBuf::from(path);
                if p.exists() {
                    println!("Found guacd.exe: {:?}", p);
                    return Ok(p);
                }
            }
            
            // Fallback: check PATH
            which::which("guacd").context("guacd.exe not found. Please install Guacamole Server or place guacd.exe in binaries/ folder")
        }

        #[cfg(target_os = "linux")]
        {
            // Try common locations
            for path in &[
                "/usr/sbin/guacd",
                "/usr/local/sbin/guacd",
                "/usr/bin/guacd",
            ] {
                let p = PathBuf::from(path);
                if p.exists() {
                    println!("Found guacd: {:?}", p);
                    return Ok(p);
                }
            }
            
            which::which("guacd").context("guacd not found. Install with: sudo apt install guacd")
        }

        #[cfg(target_os = "macos")]
        {
            which::which("guacd").context("guacd not found. Install with: brew install guacamole-server")
        }
    }

    /// Start guacd daemon
    pub fn start(&mut self) -> Result<()> {
        if self.is_running() {
            println!("guacd already running");
            return Ok(());
        }

        let guacd_path = Self::detect_guacd()?;
        
        println!("Starting guacd: {:?}", guacd_path);
        println!("Bind: {}:{}", self.bind_address, self.port);

        let mut cmd = Command::new(guacd_path);
        
        // Foreground mode (doesn't fork)
        cmd.arg("-f");
        
        // Bind address
        cmd.arg("-b").arg(&self.bind_address);
        
        // Listen port
        cmd.arg("-l").arg(self.port.to_string());
        
        // Verbosity for debugging
        #[cfg(debug_assertions)]
        cmd.arg("-L").arg("debug");
        
        // Redirect stdout/stderr for logging
        cmd.stdout(Stdio::piped())
           .stderr(Stdio::piped());
        
        println!("Command: {:?}", cmd);
        
        let child = cmd.spawn()
            .context("Failed to spawn guacd process")?;
        
        self.process = Some(child);
        
        println!("guacd process spawned (PID: {:?})", self.process.as_ref().map(|p| p.id()));
        
        // Wait a bit for guacd to start listening
        std::thread::sleep(Duration::from_millis(500));
        
        // Verify it's listening
        if !self.is_port_listening() {
            bail!("guacd started but not listening on port {}", self.port);
        }
        
        println!("guacd is listening on {}:{}", self.bind_address, self.port);
        
        Ok(())
    }

    /// Check if guacd process is running
    pub fn is_running(&mut self) -> bool {
        if let Some(ref mut process) = self.process {
            match process.try_wait() {
                Ok(Some(_status)) => false, // Process exited
                Ok(None) => true,           // Still running
                Err(_) => false,            // Error checking
            }
        } else {
            false
        }
    }

    /// Check if port is listening (guacd is ready)
    pub fn is_port_listening(&self) -> bool {
        let addr = format!("{}:{}", self.bind_address, self.port);
        TcpStream::connect_timeout(
            &addr.parse().unwrap(),
            Duration::from_millis(100)
        ).is_ok()
    }

    /// Get WebSocket URL for frontend
    pub fn get_ws_url(&self) -> String {
        format!("ws://{}:{}", self.bind_address, self.port)
    }

    /// Get HTTP URL (if using guacamole-lite or similar)
    pub fn get_http_url(&self) -> String {
        format!("http://{}:{}", self.bind_address, self.port)
    }

    /// Stop guacd daemon
    pub fn stop(&mut self) -> Result<()> {
        if let Some(mut process) = self.process.take() {
            println!("Stopping guacd (PID: {})", process.id());
            
            #[cfg(target_os = "windows")]
            {
                // On Windows, guacd might not respond to kill immediately
                // Try graceful shutdown first
                let _ = process.kill();
            }
            
            #[cfg(not(target_os = "windows"))]
            {
                process.kill().context("Failed to kill guacd")?;
            }
            
            // Wait for process to exit
            match process.wait_timeout(Duration::from_secs(5))? {
                Some(status) => {
                    println!("guacd exited with status: {:?}", status);
                }
                None => {
                    // Force kill if still running
                    println!("guacd didn't exit gracefully, force killing");
                    process.kill()?;
                    process.wait()?;
                }
            }
            
            println!("guacd stopped");
        }
        Ok(())
    }

    /// Get port number
    pub fn port(&self) -> u16 {
        self.port
    }
}

impl Drop for GuacamoleManager {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_guacd() {
        match GuacamoleManager::detect_guacd() {
            Ok(path) => println!("guacd found at: {:?}", path),
            Err(e) => println!("guacd not found: {}", e),
        }
    }

    #[test]
    #[ignore] // Run manually: cargo test -- --ignored
    fn test_start_stop() {
        let mut manager = GuacamoleManager::new();
        
        println!("Starting guacd...");
        manager.start().expect("Failed to start guacd");
        
        assert!(manager.is_running());
        assert!(manager.is_port_listening());
        
        println!("WebSocket URL: {}", manager.get_ws_url());
        
        std::thread::sleep(Duration::from_secs(2));
        
        println!("Stopping guacd...");
        manager.stop().expect("Failed to stop guacd");
        
        assert!(!manager.is_running());
    }
}
