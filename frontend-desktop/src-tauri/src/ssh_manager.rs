// SSH Connection Manager using russh (modern, async)

use russh::*;
use russh::keys::*;
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, Context};
use uuid::Uuid;
use serde::{Serialize, Deserialize};

use crate::pty_session::PTYSession;

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

type SessionHandle = client::Handle<RusshClient>;

#[derive(Clone)]
pub struct SSHManager {
    sessions: Arc<Mutex<HashMap<String, SessionHandle>>>,
    channels: Arc<Mutex<HashMap<String, russh::Channel<client::Msg>>>>,
    pty_sessions: Arc<Mutex<HashMap<String, PTYSession>>>,
}

struct RusshClient;

#[async_trait]
impl client::Handler for RusshClient {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &key::PublicKey,
    ) -> Result<bool, Self::Error> {
        // Accept any server key (like ssh -o StrictHostKeyChecking=no)
        Ok(true)
    }
}

impl SSHManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            channels: Arc::new(Mutex::new(HashMap::new())),
            pty_sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Connect to SSH server and return session ID
    pub async fn connect(&self, creds: SSHCredentials) -> Result<String> {
        let config = client::Config {
            inactivity_timeout: Some(std::time::Duration::from_secs(300)),
            ..Default::default()
        };
        
        let client = RusshClient;
        
        // Connect
        let mut session = client::connect(
            Arc::new(config),
            (creds.host.as_str(), creds.port),
            client,
        )
        .await
        .context("Failed to connect to SSH server")?;

        // Authenticate
        let auth_res = if let Some(password) = &creds.password {
            session.authenticate_password(creds.username.clone(), password.clone()).await
        } else if let Some(key_path) = &creds.private_key_path {
            // Load key from file
            let key_path = std::path::Path::new(key_path);
            
            // Try to use password as passphrase if available
            let passphrase = creds.password.as_deref();
            
            let key_pair = russh::keys::load_secret_key(key_path, passphrase)
                .with_context(|| format!("Failed to load SSH private key from {:?}. Verify file exists and format is supported (PEM/OpenSSH). Inner error", key_path))?;
                
            session.authenticate_publickey(creds.username.clone(), Arc::new(key_pair)).await
        } else {
            anyhow::bail!("No authentication method provided");
        };

        if !auth_res.context("Authentication failed")? {
            anyhow::bail!("Authentication rejected by server");
        }

        // Store session
        let session_id = Uuid::new_v4().to_string();
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session_id.clone(), session);

        Ok(session_id)
    }

    // connect_sync removed - use async connect() directly

    pub fn disconnect(&self, session_id: &str) -> Result<()> {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            let mut sessions = self.sessions.lock().await;
            sessions.remove(session_id);
            Ok(())
        })
    }

    pub fn execute_command(&self, _session_id: &str, _command: &str) -> Result<String> {
        // Stub - russh command execution needs channel implementation
        anyhow::bail!("Command execution not yet implemented with russh")
    }

    pub fn list_sessions(&self) -> Vec<SSHSessionInfo> {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let sessions = self.sessions.lock().await;
            sessions
                .keys()
                .map(|id| SSHSessionInfo {
                    session_id: id.clone(),
                    host: "unknown".to_string(),
                    username: "unknown".to_string(),
                    connected_at: "unknown".to_string(),
                    is_active: true,
                })
                .collect()
        })
    }

    // PTY methods
    pub async fn create_pty(&self, session_id: &str, rows: u32, cols: u32) -> Result<()> {
        let mut sessions = self.sessions.lock().await;
        // Clone session handle to release lock early if possible, 
        // but session access usually needs exclusive mutability or internal locking.
        // Russh Client session handles are cloneable and share internal state.
        
        if let Some(session) = sessions.get_mut(session_id) {
            // Open a channel
            let mut channel = session.channel_open_session().await
                .context("Failed to open channel")?;
            
            // Request PTY
            channel.request_pty(
                true, 
                "xterm", 
                cols, rows, 
                0, 0, 
                &[] // No special modes
            ).await.context("Failed to request PTY")?;
            
            // Start shell
            channel.request_shell(true).await
                .context("Failed to start shell")?;

            // Store channel for I/O
            let mut channels = self.channels.lock().await;
            channels.insert(session_id.to_string(), channel);
            
            Ok(())
        } else {
            anyhow::bail!("Session not found")
        }
    }

    pub async fn pty_read(&self, _session_id: &str) -> Result<Vec<u8>> {
        // Placeholder to prevent locking issues until async read loop is architected
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        Ok(vec![])
    }

    pub async fn pty_write(&self, session_id: &str, data: &[u8]) -> Result<()> {
        let mut channels = self.channels.lock().await;
        if let Some(channel) = channels.get_mut(session_id) {
            channel.data(data).await.context("Failed to write to PTY")?;
            Ok(())
        } else {
             anyhow::bail!("Channel not found")
        }
    }

    pub fn pty_resize(&self, _session_id: &str, _rows: u32, _cols: u32) -> Result<()> {
        anyhow::bail!("PTY not yet implemented")
    }

    pub fn pty_close(&self, _session_id: &str) -> Result<()> {
        anyhow::bail!("PTY not yet implemented")
    }
}
