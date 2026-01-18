// Simple SSH test to validate connection before full UI testing

use crate::ssh_manager::{SSHManager, SSHCredentials};

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    #[ignore] // Run with: cargo test -- --ignored
    fn test_ssh_connection_to_localhost() {
        let manager = SSHManager::new();
        
        let creds = SSHCredentials {
            host: "localhost".to_string(),
            port: 2222,
            username: "root".to_string(),
            password: Some("root".to_string()),
            private_key_path: None,
        };

        // Test connection
        let result = manager.connect(creds);
        
        match result {
            Ok(session_id) => {
                println!("✅ Connected successfully! Session ID: {}", session_id);
                
                // Test command execution
                let output = manager.execute_command(&session_id, "whoami").unwrap();
                println!("Command output: {}", output);
                
                assert!(output.contains("root") || output.len() > 0);
                
                // Cleanup
                let _ = manager.disconnect(&session_id);
            },
            Err(e) => {
                panic!("❌ Connection failed: {}", e);
            }
        }
    }
}

pub fn manual_test_ssh() -> Result<(), String> {
    println!("🧪 Running manual SSH test...");
    
    let manager = SSHManager::new();
    
    let creds = SSHCredentials {
        host: "localhost".to_string(),
        port: 2222,
        username: "root".to_string(),
        password: Some("root".to_string()),
        private_key_path: None,
    };

    println!("Connecting to localhost:2222...");
    
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    let session_id = rt.block_on(manager.connect(creds))
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    println!("✅ Connected! Session ID: {}", session_id);
    
    let commands = vec!["whoami", "pwd", "uname -a", "ls -la /"];
    
    for cmd in commands {
        println!("\n$ {}", cmd);
        match manager.execute_command(&session_id, cmd) {
            Ok(output) => println!("{}", output),
            Err(e) => eprintln!("Error: {}", e),
        }
    }
    
    println!("\nDisconnecting...");
    manager.disconnect(&session_id)
        .map_err(|e| format!("Disconnect failed: {}", e))?;
    
    println!("✅ Test completed successfully!");
    
    Ok(())
}
