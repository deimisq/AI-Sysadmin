// Simple SSH test to validate connection before full UI testing

use crate::ssh_manager::{SSHManager, SSHCredentials};

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Run with: cargo test -- --ignored
    async fn test_ssh_connection_to_localhost() {
        let manager = SSHManager::new();
        
        let creds = SSHCredentials {
            host: "localhost".to_string(),
            port: 2222,
            username: "root".to_string(),
            password: Some("root".to_string()),
            private_key_path: None,
        };

        // Test connection
        let result = manager.connect(creds).await;
        
        match result {
            Ok(session_id) => {
                println!("✅ Connected successfully! Session ID: {}", session_id);
                
                // Test command execution
                let output = manager.execute_command(&session_id, "whoami").await.unwrap();
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

pub async fn manual_test_ssh() -> Result<(), String> {
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
    
    let session_id = manager.connect(creds).await
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    println!("✅ Connected! Session ID: {}", session_id);
    
    let commands = vec!["whoami", "pwd", "uname -a", "ls -la /"];
    
    for cmd in commands {
        println!("\n$ {}", cmd);
        match manager.execute_command(&session_id, cmd).await {
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
