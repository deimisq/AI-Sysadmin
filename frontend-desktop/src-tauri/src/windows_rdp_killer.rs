use std::process::Command;

pub fn kill_rdp_process(pid: u32) -> Result<(), String> {
    println!("Attempting to kill RDP process with PID: {}", pid);
    
    // Use taskkill to forcefully terminate mstsc.exe
    let output = Command::new("taskkill")
        .args(&["/PID", &pid.to_string(), "/F"])
        .output()
        .map_err(|e| format!("Failed to execute taskkill: {}", e))?;
    
    if output.status.success() {
        println!("Successfully killed RDP process {}", pid);
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("taskkill failed: {}", stderr))
    }
}
