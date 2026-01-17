// SSH Connection Manager Module
// Handles all SSH connections with background session management

use ssh2::Session;
use std::collections::HashMap;
use std::io::Read;
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use anyhow::{Result, Context};
use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHCredentials {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SSHSessionInfo {
    pub session_id: String,
    pub host: String,
    pub username: String,
    pub connected_at: String,
    pub is_active: bool,
}

pub struct SSHManager {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl SSHManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Connect to SSH server and return session ID
    pub fn connect(&self, creds: SSHCredentials) -> Result<String> {
        let tcp = TcpStream::connect((creds.host.as_str(), creds.port))
            .context("Failed to connect to host")?;
        
        let mut session = Session::new()
            .context("Failed to create SSH session")?;
        
        session.set_tcp_stream(tcp);
        session.handshake()
            .context("SSH handshake failed")?;

        // Authenticate
        if let Some(password) = &creds.password {
            session.userauth_password(&creds.username, password)
                .context("Password authentication failed")?;
        } else if let Some(key_path) = &creds.private_key_path {
            session.userauth_pubkey_file(&creds.username, None, std::path::Path::new(key_path), None)
                .context("Public key authentication failed")?;
        } else {
            anyhow::bail!("No authentication method provided");
        }

        if !session.authenticated() {
            anyhow::bail!("Authentication failed");
        }

        // Store session
        let session_id = Uuid::new_v4().to_string();
        let mut sessions = self.sessions.lock().unwrap();
        sessions.insert(session_id.clone(), session);

        Ok(session_id)
    }

    /// Execute a command on an existing SSH session
    pub fn execute_command(&self, session_id: &str, command: &str) -> Result<String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(session_id)
            .context("Session not found")?;

        let mut channel = session.channel_session()
            .context("Failed to open channel")?;
        
        channel.exec(command)
            .context("Failed to execute command")?;

        let mut output = String::new();
        channel.read_to_string(&mut output)
            .context("Failed to read output")?;

        channel.wait_close()
            .context("Failed to close channel")?;

        Ok(output)
    }

    /// Close SSH session
    pub fn disconnect(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.lock().unwrap();
        
        if let Some(mut session) = sessions.remove(session_id) {
            let _ = session.disconnect(None, "Client disconnected", None);
        }

        Ok(())
    }

    /// List all active sessions
    pub fn list_sessions(&self) -> Vec<SSHSessionInfo> {
        let sessions = self.sessions.lock().unwrap();
        
        sessions.keys().map(|id| {
            SSHSessionInfo {
                session_id: id.clone(),
                host: "unknown".to_string(), // TODO: Store metadata
                username: "unknown".to_string(),
                connected_at: chrono::Utc::now().to_rfc3339(),
                is_active: true,
            }
        }).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ssh_manager_creation() {
        let manager = SSHManager::new();
        assert_eq!(manager.list_sessions().len(), 0);
    }
}
