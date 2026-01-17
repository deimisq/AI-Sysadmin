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

mod pty_session;
use pty_session::PTYSession;

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
    pty_sessions: Arc<Mutex<HashMap<String, PTYSession>>>,
}

impl SSHManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            pty_sessions: Arc::new(Mutex::new(HashMap::new())),
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

    /// Create a PTY (interactive terminal) session
    pub fn create_pty(&self, session_id: &str, rows: u32, cols: u32) -> Result<String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(session_id)
            .context("Session not found")?;

        let pty_id = format!("{}-pty", session_id);
        let pty_session = PTYSession::new(session, pty_id.clone(), rows, cols)?;

        let mut pty_sessions = self.pty_sessions.lock().unwrap();
        pty_sessions.insert(pty_id.clone(), pty_session);

        Ok(pty_id)
    }

    /// Read output from PTY session
    pub fn pty_read(&self, pty_id: &str) -> Result<Vec<u8>> {
        let pty_sessions = self.pty_sessions.lock().unwrap();
        let pty = pty_sessions.get(pty_id)
            .context("PTY session not found")?;
        
        pty.read_output()
    }

    /// Write input to PTY session
    pub fn pty_write(&self, pty_id: &str, data: &[u8]) -> Result<()> {
        let pty_sessions = self.pty_sessions.lock().unwrap();
        let pty = pty_sessions.get(pty_id)
            .context("PTY session not found")?;
        
        pty.write_input(data)
    }

    /// Resize PTY terminal
    pub fn pty_resize(&self, pty_id: &str, rows: u32, cols: u32) -> Result<()> {
        let pty_sessions = self.pty_sessions.lock().unwrap();
        let pty = pty_sessions.get(pty_id)
            .context("PTY session not found")?;
        
        pty.resize(rows, cols)
    }

    /// Close PTY session
    pub fn pty_close(&self, pty_id: &str) -> Result<()> {
        let mut pty_sessions = self.pty_sessions.lock().unwrap();
        
        if let Some(pty) = pty_sessions.remove(pty_id) {
            pty.close()?;
        }

        Ok(())
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
