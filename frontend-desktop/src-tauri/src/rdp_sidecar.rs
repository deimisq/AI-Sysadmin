use std::process::{Command, Child, Stdio};
use std::path::PathBuf;
use anyhow::{Result, Context, bail};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RdpConfig {
    pub host: String,
    pub username: String,
    pub password: String,
    pub width: u32,
    pub height: u32,
    pub color_depth: u8,
}

impl Default for RdpConfig {
    fn default() -> Self {
        Self {
            host: String::new(),
            username: String::new(),
            password: String::new(),
            width: 1920,
            height: 1080,
            color_depth: 32,
        }
    }
}

pub struct RdpSidecar {
    process: Option<Child>,
    config: RdpConfig,
}

impl RdpSidecar {
    pub fn new(config: RdpConfig) -> Self {
        Self {
            process: None,
            config,
        }
    }

    /// Detect FreeRDP binary on the system
    pub fn detect_freerdp() -> Result<PathBuf> {
        #[cfg(target_os = "windows")]
        {
            // Try bundled binary first
            if let Ok(exe_dir) = std::env::current_exe() {
                let bundled = exe_dir.parent()
                    .unwrap()
                    .join("binaries")
                    .join("wfreerdp.exe");
                
                if bundled.exists() {
                    println!("Found bundled wfreerdp.exe: {:?}", bundled);
                    return Ok(bundled);
                }
            }
            
            // Fallback: check PATH
            which::which("wfreerdp").context("wfreerdp.exe not found. Install FreeRDP for Windows.")
        }

        #[cfg(target_os = "linux")]
        {
            // Try common locations
            for path in &[
                "/usr/bin/xfreerdp",
                "/usr/local/bin/xfreerdp",
            ] {
                let p = PathBuf::from(path);
                if p.exists() {
                    println!("Found xfreerdp: {:?}", p);
                    return Ok(p);
                }
            }
            
            which::which("xfreerdp").context("xfreerdp not found. Install with: sudo apt install freerdp2-x11")
        }

        #[cfg(target_os = "macos")]
        {
            which::which("xfreerdp").context("xfreerdp not found. Install with: brew install freerdp")
        }
    }

    /// Spawn FreeRDP process in headless mode
    pub fn spawn(&mut self) -> Result<()> {
        let freerdp_path = Self::detect_freerdp()?;
        
        println!("Spawning FreeRDP: {:?}", freerdp_path);
        println!("Config: {}@{} ({}x{})", self.config.username, self.config.host, self.config.width, self.config.height);

        let mut cmd = Command::new(freerdp_path);
        
        // Connection parameters
        cmd.arg(format!("/v:{}", self.config.host))
           .arg(format!("/u:{}", self.config.username))
           .arg(format!("/p:{}", self.config.password));
        
        // Display settings
        cmd.arg(format!("/size:{}x{}", self.config.width, self.config.height))
           .arg(format!("/bpp:{}", self.config.color_depth));
        
        // Security settings (permissive for testing)
        cmd.arg("/cert:ignore")
           .arg("/sec:rdp");
        
        // Performance optimizations
        cmd.arg("+compression")
           .arg("+bitmap-cache");
        
        // Headless mode (no GUI window)
        #[cfg(target_os = "linux")]
        {
            cmd.arg("/video-child:0"); // Redirect video output
        }
        
        // Disable unnecessary features to reduce overhead
        cmd.arg("-audio")
           .arg("-themes")
           .arg("-wallpaper");
        
        // Redirect stdout/stderr for debugging
        cmd.stdout(Stdio::piped())
           .stderr(Stdio::piped());
        
        println!("Command: {:?}", cmd);
        
        let child = cmd.spawn()
            .context("Failed to spawn FreeRDP process")?;
        
        self.process = Some(child);
        
        println!("FreeRDP process spawned successfully (PID: {:?})", self.process.as_ref().map(|p| p.id()));
        
        Ok(())
    }

    /// Check if process is still running
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

    /// Terminate the FreeRDP process
    pub fn terminate(&mut self) -> Result<()> {
        if let Some(mut process) = self.process.take() {
            println!("Terminating FreeRDP process (PID: {})", process.id());
            process.kill().context("Failed to kill FreeRDP process")?;
            process.wait().context("Failed to wait for process termination")?;
            println!("FreeRDP process terminated");
        }
        Ok(())
    }
}

impl Drop for RdpSidecar {
    fn drop(&mut self) {
        let _ = self.terminate();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_freerdp() {
        match RdpSidecar::detect_freerdp() {
            Ok(path) => println!("FreeRDP found at: {:?}", path),
            Err(e) => println!("FreeRDP not found: {}", e),
        }
    }
}
