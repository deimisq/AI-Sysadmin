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
            let key_pair = russh::keys::load_secret_key(key_path, None)
                .context("Failed to load SSH private key")?;
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
    pub fn create_pty(&self, session_id: &str, rows: u32, cols: u32) -> Result<()> {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            let mut sessions = self.sessions.lock().await;
            let session = sessions.get_mut(session_id).context("Session not found")?;
            
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

            // Store channel somewhere? 
            // In russh, the channel IS the interaction point.
            // We need to store this channel to read/write to it.
            // But SessionHandle doesn't store channels directly in a way we can access later easily via ID
            // unless we re-architect to store ChannelHandle instead of SessionHandle.
            
            // For now, let's just log success. 
            // REAL IMPLEMENTATION requires storing the channel in a separate map.
            Ok(())
        })
    }

    pub fn pty_read(&self, _session_id: &str) -> Result<Vec<u8>> {
        anyhow::bail!("PTY not yet implemented")
    }

    pub fn pty_write(&self, _session_id: &str, _data: &[u8]) -> Result<()> {
        anyhow::bail!("PTY not yet implemented")
    }

    pub fn pty_resize(&self, _session_id: &str, _rows: u32, _cols: u32) -> Result<()> {
        anyhow::bail!("PTY not yet implemented")
    }

    pub fn pty_close(&self, _session_id: &str) -> Result<()> {
        anyhow::bail!("PTY not yet implemented")
    }
}
