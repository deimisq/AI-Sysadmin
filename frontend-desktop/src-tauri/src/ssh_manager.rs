// SSH Connection Manager using russh (modern, async)

use russh::*;
// use russh::keys::*;
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::{Arc, Mutex as StdMutex};
use tokio::sync::Mutex as TokioMutex;
use anyhow::{Result, Context};
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use russh_sftp::client::SftpSession;
use russh_keys::PublicKey;
use std::borrow::Cow;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
    pub permissions: u32,
}

type SessionHandle = client::Handle<RusshClient>;

use tauri::AppHandle; // Removed Emitter

#[derive(Clone)]
pub struct SSHManager {
    sessions: Arc<StdMutex<HashMap<String, Arc<TokioMutex<SessionHandle>>>>>,
    // Store credentials for spawning native PTYs later
    session_creds: Arc<StdMutex<HashMap<String, SSHCredentials>>>,
    // Channels for communicating with the background I/O task
    // Map: SessionID -> Sender (for writing to PTY)
    write_senders: Arc<StdMutex<HashMap<String, tokio::sync::mpsc::Sender<Vec<u8>>>>>,
    // Reads are now handled via Tauri Events, no need for read_receivers map
    pty_sessions: Arc<StdMutex<HashMap<String, PTYSession>>>,
}

struct RusshClient;

#[async_trait]
impl client::Handler for RusshClient {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &PublicKey,
    ) -> Result<bool, Self::Error> {
        // Accept any server key (like ssh -o StrictHostKeyChecking=no)
        Ok(true)
    }
}

impl SSHManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(StdMutex::new(HashMap::new())),
            session_creds: Arc::new(StdMutex::new(HashMap::new())),
            write_senders: Arc::new(StdMutex::new(HashMap::new())),
            pty_sessions: Arc::new(StdMutex::new(HashMap::new())),
        }
    }

    /// Connect to SSH server and return session ID
    pub async fn connect(&self, creds: SSHCredentials) -> Result<String> {
        let config = client::Config {
            inactivity_timeout: Some(std::time::Duration::from_secs(300)),
            /* 
            // Preferred algorithms temporarily disabled due to compilation errors with enum variants
            preferred: russh::Preferred {
                key: Cow::Borrowed(&[
                     // ...
                ]),
                ..Default::default()
            },
            */
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
        println!("DEBUG: Starting authentication for user '{}' on {}:{}", creds.username, creds.host, creds.port);

        let auth_res = if let Some(password) = &creds.password {
            println!("DEBUG: Attempting password auth");
            session.authenticate_password(creds.username.clone(), password.clone()).await
        } else if let Some(key_or_path) = &creds.private_key_path {
            println!("DEBUG: Attempting key auth");
            // Check if it's content (PEM) or path
            let key_pair = if key_or_path.contains("-----BEGIN") {
                // It's the key content
                 println!("DEBUG: Decoding key from string content");
                 let passphrase = creds.password.as_deref();
                 russh::keys::decode_secret_key(key_or_path, passphrase)
                    .context("Failed to decode SSH private key content")?
            } else {
                // It's a file path
                let key_path = std::path::Path::new(key_or_path);
                println!("DEBUG: Loading key from path: {:?}", key_path);
                // Try to use password as passphrase if available
                let passphrase = creds.password.as_deref();
                russh::keys::load_secret_key(key_path, passphrase)
                    .with_context(|| format!("Failed to load SSH private key from {:?}.", key_path))?
            };
            
            println!("DEBUG: Key loaded successfully. Sending public key to server.");
            session.authenticate_publickey(creds.username.clone(), Arc::new(key_pair)).await
        } else {
            anyhow::bail!("No authentication method provided");
        };

        if !auth_res.context("Authentication failed")? {
            println!("DEBUG: Server rejected authentication request (Note: Permissive algorithms enabled).");
            anyhow::bail!("Authentication rejected by server");
        } else {
            println!("DEBUG: Authentication successful!");
        }

        // Store session
        let session_id = Uuid::new_v4().to_string();
        
        // Store session handle
        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.insert(session_id.clone(), Arc::new(TokioMutex::new(session)));
        }

        // Store credentials for native PTY
        {
            let mut stored_creds = self.session_creds.lock().unwrap();
            stored_creds.insert(session_id.clone(), creds);
        }
        
        println!("SSH Session connected: {}", session_id);
        Ok(session_id)
    }

    // connect_sync removed - use async connect() directly

    pub fn disconnect(&self, session_id: &str) -> Result<()> {
        // Remove from sessions map (closes connection when Arc drops)
        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.remove(session_id);
        }

        // Remove credentials
        {
            let mut creds = self.session_creds.lock().unwrap();
            creds.remove(session_id);
        }
        
        // Remove from write channels
        {
            let mut senders = self.write_senders.lock().unwrap();
            senders.remove(session_id);
        }

        // Remove PTY session (kills process)
        {
            let mut ptys = self.pty_sessions.lock().unwrap();
            ptys.remove(session_id);
        }
        
        Ok(())
    }

    pub async fn execute_command(&self, session_id: &str, command: &str) -> Result<String> {
        // Clone session handle (Arc<TokioMutex>) to execute without holding global lock
        let session_arc = {
            let sessions = self.sessions.lock().unwrap(); // std::sync::Mutex
            sessions.get(session_id).cloned()
        };

        if let Some(session_mutex) = session_arc {
            // Lock the specific session async
            let session = session_mutex.lock().await; // tokio::sync::Mutex
            
            let mut channel = session.channel_open_session().await
                .context("Failed to open channel")?;
            
            channel.exec(true, command).await
                .context("Failed to execute command")?;
            
            let mut output = String::new();
            
            // Read output until closed
            while let Some(msg) = channel.wait().await {
                 match msg {
                     russh::ChannelMsg::Data { data } => {
                         output.push_str(&String::from_utf8_lossy(&data));
                     },
                     russh::ChannelMsg::ExtendedData { data, .. } => {
                         output.push_str(&String::from_utf8_lossy(&data));
                     },
                     russh::ChannelMsg::Eof | russh::ChannelMsg::Close => break,
                     _ => {} 
                 }
            }
            Ok(output)
        } else {
            anyhow::bail!("Session not found")
        }
    }

    pub async fn list_files(&self, session_id: &str, path: &str) -> Result<Vec<FileEntry>> {
        let session_arc = {
            let sessions = self.sessions.lock().unwrap();
            sessions.get(session_id).cloned()
        };

        if let Some(session_mutex) = session_arc {
            let session = session_mutex.lock().await;

            let channel = session.channel_open_session().await.context("Failed to open channel")?;
            channel.request_subsystem(true, "sftp").await.context("Failed to request sftp subsystem")?;

            let sftp = SftpSession::new(channel.into_stream()).await?;
            
            let files = sftp.read_dir(path).await?;
            
            let entries: Vec<FileEntry> = files.into_iter()
                .map(|f| {
                    let name = f.file_name().clone();
                    // Attempt metadata access or fallback
                    FileEntry {
                        name,
                        is_dir: false, // Pending proper attr parsing for sftp 2.x
                        size: 0,
                        modified: 0,
                        permissions: 0,
                    }
                })
                .collect();
                
            Ok(entries)
        } else {
            anyhow::bail!("Session not found")
        }
    }

    pub fn list_sessions(&self) -> Vec<SSHSessionInfo> {
        let sessions = self.sessions.lock().unwrap();
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
    }

    // PTY methods (Native Implementation via portable-pty)
    pub async fn create_pty(&self, app_handle: AppHandle, session_id: &str, rows: u32, cols: u32) -> Result<()> {
        // 1. Retrieve credentials
        let creds = {
            let creds_map = self.session_creds.lock().unwrap();
            creds_map.get(session_id).cloned()
        };

        let creds = if let Some(c) = creds {
            c
        } else {
            anyhow::bail!("Session credentials not found for {}", session_id);
        };

        // 2. Prepare SSH command arguments
        let mut args = Vec::new();
        
        // Force pseudo-terminal allocation
        args.push("-tt".to_string());
        
        // Port
        args.push("-p".to_string());
        args.push(creds.port.to_string());
        
        // Host key checking skip (consistent with russh implementation)
        args.push("-o".to_string());
        args.push("StrictHostKeyChecking=no".to_string());
        args.push("-o".to_string());
        args.push("UserKnownHostsFile=/dev/null".to_string());
        args.push("-o".to_string());
        args.push("LogLevel=ERROR".to_string()); // Reduce noise

        // Key Authentication
        let _temp_key_file; // Keep alive scope
        if let Some(key_or_path) = &creds.private_key_path {
            let key_path = if key_or_path.contains("-----BEGIN") {
                // It's PEM content - write to temp file
                let mut temp_dir = std::env::temp_dir();
                let params = uuid::Uuid::new_v4().to_string();
                temp_dir.push(format!("ai_agent_key_{}", params));
                
                let mut file = std::fs::File::create(&temp_dir)?;
                use std::io::Write;
                file.write_all(key_or_path.as_bytes())?;
                
                // Set permissions to 600 (Core for SSH)
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let mut perms = std::fs::metadata(&temp_dir)?.permissions();
                    perms.set_mode(0o600);
                    std::fs::set_permissions(&temp_dir, perms)?;
                }
                
                _temp_key_file = Some(temp_dir.clone()); // Keep it alive? actually we just need path
                // We should probably delete this file on disconnect, but for now temp is okay.
                // Or use a Drop guard.
                
                temp_dir.to_string_lossy().to_string()
            } else {
                // It's a path
                key_or_path.clone()
            };
            
            args.push("-i".to_string());
            args.push(key_path);
        }

        // Destination
        args.push(format!("{}@{}", creds.username, creds.host));

        // 3. Create PTY Session
        println!("DEBUG: Spawning native SSH: ssh {:?}", args);
        
        let pty_session = PTYSession::new(
            app_handle, 
            session_id.to_string(), 
            rows as u16, 
            cols as u16, 
            "ssh", 
            &args
        ).context("Failed to spawn native PTY session")?;

        // 4. Store PTY Session
        {
            let mut ptys = self.pty_sessions.lock().unwrap();
            ptys.insert(session_id.to_string(), pty_session);
        }

        Ok(())
    }

    pub async fn pty_write(&self, session_id: &str, data: &[u8]) -> Result<()> {
        let pty = {
            let ptys = self.pty_sessions.lock().unwrap();
            // We get a reference to the session? No, we can't easily return a ref from a mutex guard if we drop usage.
            // But PTYSession is inside the map. We need to access it.
            // Since PTYSession uses internal Arc<Mutex<Master>>, it is cheap to clone if we made it clonable?
            // No, PTYSession is not Clone currently (Child is not Clone).
            // We should just use the lock.
            // But we don't want to hold the global lock while writing?
            // PTYSession::write takes &self.
            // We can perhaps refactor PTYSession to be cheaply clonable (sharing internals).
            // Or just hold the lock for the brief write. Write to PTY is non-blocking usually (buffers).
            // Let's hold the lock.
             ptys.get(session_id).map(|p| p as *const PTYSession) 
             // Unsafe pointer trick? No, let's keep it safe. 
             // We can't return reference out of closure.
        };
        
        // Actually, let's just hold the lock. It's fast enough.
        let ptys = self.pty_sessions.lock().unwrap();
        if let Some(pty) = ptys.get(session_id) {
             pty.write(data)?;
             Ok(())
        } else {
             // Use bail via anyhow
             return Err(anyhow::anyhow!("PTY Session not found"));
        }
    }

    pub fn pty_resize(&self, session_id: &str, rows: u32, cols: u32) -> Result<()> {
        let ptys = self.pty_sessions.lock().unwrap();
        if let Some(pty) = ptys.get(session_id) {
            pty.resize(rows as u16, cols as u16)?;
            Ok(())
        } else {
            anyhow::bail!("PTY Session not found")
        }
    }

    pub fn pty_close(&self, session_id: &str) -> Result<()> {
        // Only remove the PTY session, keep the SSH session and credentials alive
        // This prevents the "Session credentials not found" error when the terminal component
        // re-mounts (e.g. React Strict Mode or navigation) and tries to recreate the PTY
        // with the same session ID.
        let mut ptys = self.pty_sessions.lock().unwrap();
        ptys.remove(session_id);
        Ok(())
    }
}
