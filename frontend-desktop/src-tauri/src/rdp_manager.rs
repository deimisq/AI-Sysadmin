use std::sync::{Arc, Mutex};
use serde::Serialize;
use anyhow::{Result, Context};
use uuid::Uuid;
use tokio::net::TcpStream;
use crate::rdp_sidecar::{RdpSidecar, RdpConfig};

#[derive(Clone, Serialize, Debug)]
pub struct RDPSessionInfo {
    pub id: String,
    pub host: String,
    pub username: String,
    pub status: String,
}

#[derive(Clone)]
pub struct RDPManager {
    sessions: Arc<Mutex<Vec<RDPSessionInfo>>>,
    sidecars: Arc<Mutex<Vec<(String, RdpSidecar)>>>, // (session_id, sidecar)
}

impl RDPManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(Vec::new())),
            sidecars: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn connect(&self, host: String, username: String, password: String) -> Result<String> {
        println!("RDP: Initiating connection to {} as {}", host, username);
        
        let id = Uuid::new_v4().to_string();
        
        // Step 1: Verify TCP connectivity to RDP port (3389)
        let rdp_addr = format!("{}:3389", host);
        
        let tcp_stream = TcpStream::connect(&rdp_addr).await
            .context(format!("Failed to connect to RDP server at {}", rdp_addr))?;
        
        println!("RDP: TCP connection established to {}", rdp_addr);
        drop(tcp_stream); // Close test connection
        
        // Step 2: Create sidecar configuration
        let config = RdpConfig {
            host: host.clone(),
            username: username.clone(),
            password: password.clone(),
            width: 1920,
            height: 1080,
            color_depth: 32,
        };
        
        // Step 3: Spawn FreeRDP sidecar
        let mut sidecar = RdpSidecar::new(config);
        
        match sidecar.spawn() {
            Ok(_) => {
                println!("RDP: FreeRDP sidecar spawned successfully");
                
                // Store sidecar
                {
                    let mut sidecars = self.sidecars.lock().unwrap();
                    sidecars.push((id.clone(), sidecar));
                }
                
                // Store session info
                let session = RDPSessionInfo {
                    id: id.clone(),
                    host: host.clone(),
                    username: username.clone(),
                    status: "Connected via FreeRDP Sidecar".to_string(),
                };
                
                {
                    let mut sessions = self.sessions.lock().unwrap();
                    sessions.push(session);
                }
                
                println!("RDP: Session {} created for {}", id, host);
                Ok(id)
            }
            Err(e) => {
                Err(anyhow::anyhow!("Failed to spawn FreeRDP: {}. Make sure FreeRDP is installed.", e))
            }
        }
    }
    
    pub fn get_session(&self, id: &str) -> Option<RDPSessionInfo> {
        let sessions = self.sessions.lock().unwrap();
        sessions.iter().find(|s| s.id == id).cloned()
    }
    
    pub fn disconnect(&self, id: &str) -> Result<()> {
        // Remove and terminate sidecar
        {
            let mut sidecars = self.sidecars.lock().unwrap();
            if let Some(pos) = sidecars.iter().position(|(sid, _)| sid == id) {
                let (_, mut sidecar) = sidecars.remove(pos);
                sidecar.terminate()?;
            }
        }
        
        // Remove session
        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.retain(|s| s.id != id);
        }
        
        println!("RDP: Session {} disconnected", id);
        Ok(())
    }
    
    pub fn get_mock_frame(&self, session_id: &str) -> Result<Option<crate::rdp_frame_capture::RdpFrame>> {
        let mut sidecars = self.sidecars.lock().unwrap();
        
        if let Some((_sid, sidecar)) = sidecars.iter_mut().find(|(sid, _)| *sid == session_id) {
            Ok(sidecar.generate_mock_frame())
        } else {
            Ok(None)
        }
    }
    
    pub fn list_sessions(&self) -> Vec<RDPSessionInfo> {
        let sessions = self.sessions.lock().unwrap();
        sessions.clone()
    }
}
