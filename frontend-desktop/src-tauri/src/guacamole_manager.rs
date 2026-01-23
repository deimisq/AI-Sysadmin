use std::process::{Command, Child, Stdio};
use std::path::PathBuf;
use anyhow::{Result, Context};
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

    /// Detect guacd binary or guacamole-lite on the system
    pub fn detect_guacd() -> Result<(PathBuf, bool)> {
        // Returns (path, is_node_js)
        // is_node_js = true means we need to use "node path" instead of just "path"
        
        #[cfg(target_os = "windows")]
        {
            // On Windows, prefer guacamole-lite (Node.js) over guacd
            
            // Check if we have Node.js and guacamole-lite script
            if let Ok(node_path) = which::which("node") {
                // Check for bundled guacamole-lite-server.js
                if let Ok(exe_dir) = std::env::current_exe() {
                    let script_path = exe_dir.parent()
                        .unwrap()
                        .join("guacamole-lite-server.js");
                    
                    if script_path.exists() {
                        println!("Found guacamole-lite script: {:?}", script_path);
                        println!("Using Node.js: {:?}", node_path);
                        return Ok((script_path, true));
                    }
                }
                
                // Try in project directory
                let script_path = std::env::current_dir()
                    .unwrap()
                    .join("guacamole-lite-server.js");
                
                if script_path.exists() {
                    println!("Found guacamole-lite script in cwd: {:?}", script_path);
                    return Ok((script_path, true));
                }
            }
            
            // Fall back to guacd.exe if available
            // Try bundled binary first
            if let Ok(exe_dir) = std::env::current_exe() {
                let bundled = exe_dir.parent()
                    .unwrap()
                    .join("binaries")
                    .join("guacd.exe");
                
                if bundled.exists() {
                    println!("Found bundled guacd.exe: {:?}", bundled);
                    return Ok((bundled, false));
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
                    return Ok((p, false));
                }
            }
            
            // Fallback: check PATH
            if let Ok(p) = which::which("guacd") {
                return Ok((p, false));
            }
            
            anyhow::bail!("Neither guacamole-lite (Node.js) nor guacd.exe found. Please install one of them.")
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
                    return Ok((p, false));
                }
            }
            
            which::which("guacd")
                .map(|p| (p, false))
                .context("guacd not found. Install with: sudo apt install guacd")
        }

        #[cfg(target_os = "macos")]
        {
            which::which("guacd")
                .map(|p| (p, false))
                .context("guacd not found. Install with: brew install guacamole-server")
        }
    }

    /// Start guacd daemon
    pub fn start(&mut self) -> Result<()> {
        if self.is_running() {
            println!("guacd already running");
            return Ok(());
        }

        let (guacd_path, is_node_js) = Self::detect_guacd()?;
        
        println!("Starting Guacamole server...");
        println!("Path: {:?}", guacd_path);
        println!("Mode: {}", if is_node_js { "Node.js (guacamole-lite)" } else { "Native (guacd)" });
        println!("Bind: {}:{}", self.bind_address, self.port);

        let child = if is_node_js {
            // Use Node.js to run guacamole-lite
            let node_path = which::which("node")?;
            
            let mut cmd = Command::new(node_path);
            cmd.arg(guacd_path); // The JS script
            
            // Set environment variables for guacamole-lite
            cmd.env("GUAC_PORT", self.port.to_string());
            cmd.env("GUAC_HOST", &self.bind_address);
            
            // Redirect stdout/stderr
            cmd.stdout(Stdio::piped())
               .stderr(Stdio::piped());
            
            println!("Command: node {:?}", cmd);
            
            cmd.spawn()
                .context("Failed to spawn guacamole-lite (Node.js) process")?
        } else {
           // Use native guacd
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
            
            cmd.spawn()
                .context("Failed to spawn guacd process")?
        };
        
        self.process = Some(child);
        
        println!("Guacamole server spawned (PID: {:?})", self.process.as_ref().map(|p| p.id()));
        
        // Wait a bit for server to start listening
        std::thread::sleep(Duration::from_millis(1000)); // Node.js might need more time
        
        // Verify it's listening
        if !self.is_port_listening() {
            return Err(anyhow::anyhow!("Guacamole server started but not listening on port {}", self.port));
        }
        
        println!("✅ Guacamole server is listening on {}:{}", self.bind_address, self.port);
        
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
            
            // Kill the process
            process.kill().context("Failed to kill guacd")?;
            
            // Wait for it to exit
            process.wait().context("Failed to wait for guacd termination")?;
            
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
