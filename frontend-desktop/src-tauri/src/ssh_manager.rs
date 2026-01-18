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

use tauri::{AppHandle, Emitter}; // Add tauri imports

#[derive(Clone)]
pub struct SSHManager {
    sessions: Arc<Mutex<HashMap<String, SessionHandle>>>,
    // Channels for communicating with the background I/O task
    // Map: SessionID -> Sender (for writing to PTY)
    write_senders: Arc<Mutex<HashMap<String, tokio::sync::mpsc::Sender<Vec<u8>>>>>,
    // Reads are now handled via Tauri Events, no need for read_receivers map
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
            write_senders: Arc::new(Mutex::new(HashMap::new())),
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
        } else if let Some(key_or_path) = &creds.private_key_path {
            // Check if it's content (PEM) or path
            let key_pair = if key_or_path.contains("-----BEGIN") {
                // It's the key content
                 let passphrase = creds.password.as_deref();
                 russh::keys::decode_secret_key(key_or_path, passphrase)
                    .context("Failed to decode SSH private key content")?
            } else {
                // It's a file path
                let key_path = std::path::Path::new(key_or_path);
                // Try to use password as passphrase if available
                let passphrase = creds.password.as_deref();
                russh::keys::load_secret_key(key_path, passphrase)
                    .with_context(|| format!("Failed to load SSH private key from {:?}.", key_path))?
            };
            
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
    pub async fn create_pty(&self, app_handle: AppHandle, session_id: &str, rows: u32, cols: u32) -> Result<()> {
        let mut sessions = self.sessions.lock().await;
        
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

            // Create channels for two-way communication
            // Frontend -> SSH (Write)
            let (write_tx, mut write_rx) = tokio::sync::mpsc::channel::<Vec<u8>>(32);
            // SSH -> Frontend (Read) is now done via Events!

            let session_id_clone = session_id.to_string();
            // Spawn background task to handle I/O loop
            tokio::spawn(async move {
                println!("DEBUG: Starting I/O Loop for session {}", session_id_clone);
                loop {
                    tokio::select! {
                        // Data from frontend to write to SSH
                        Some(data) = write_rx.recv() => {
                            println!("DEBUG: I/O Loop received {} bytes to write", data.len());
                            // russh data() takes &[u8] (which implements AsyncRead)
                            if let Err(e) = channel.data(&data[..]).await {
                                eprintln!("Error writing to SSH channel: {:?}", e);
                                break;
                            }
                        }
                        // Data from SSH to send to frontend
                        msg = channel.wait() => {
                            match msg {
                                Some(russh::ChannelMsg::Data { data }) => {
                                    println!("DEBUG: Received {} bytes from SSH", data.len());
                                    // Emit event to frontend
                                    if let Err(e) = app_handle.emit(&format!("pty-data:{}", session_id_clone), data.to_vec()) {
                                        eprintln!("Failed to emit pty-data event: {}", e);
                                    }
                                }
                                Some(russh::ChannelMsg::ExtendedData { data, .. }) => {
                                     let _ = app_handle.emit(&format!("pty-data:{}", session_id_clone), data.to_vec());
                                }
                                Some(russh::ChannelMsg::Close) => {
                                    println!("DEBUG: SSH Channel received CLOSE msg");
                                    break;
                                }
                                Some(russh::ChannelMsg::Eof) => {
                                    println!("DEBUG: SSH Channel received EOF msg");
                                    // Often EOF is followed by Close, but some servers send it early.
                                    // We might want to keep writing? Usually EOF from server means shell closed.
                                    break;
                                }
                                None => {
                                    println!("DEBUG: SSH Channel wait() returned None (Channel closed locally or connection lost)");
                                    // Channel closed
                                    break;
                                }
                                // Ignore other messages
                                msg => {
                                    println!("DEBUG: SSH Ignored msg: {:?}", msg);
                                } 
                            }
                        }
                    }
                }
                println!("DEBUG: I/O Loop ENDED for session {}", session_id_clone);
            });

            // Store channels
            self.write_senders.lock().await.insert(session_id.to_string(), write_tx);
            
            Ok(())
        } else {
            anyhow::bail!("Session not found")
        }
    }

    // pty_read removed - replaced by Tauri Events

    pub async fn pty_write(&self, session_id: &str, data: &[u8]) -> Result<()> {
        println!("DEBUG: pty_write called for session {} with {} bytes: {:?}", session_id, data.len(), String::from_utf8_lossy(data));
        let senders = self.write_senders.lock().await;
        if let Some(sender) = senders.get(session_id) {
            sender.send(data.to_vec()).await
                .map_err(|_| anyhow::anyhow!("Channel closed"))?;
            Ok(())
        } else {
             println!("DEBUG: Session write channel not found for {}", session_id);
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
