// Interactive PTY Terminal Module
// Handles PTY channels for interactive shell sessions

use ssh2::{Channel, Session};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use anyhow::{Result, Context};

pub struct PTYSession {
    channel: Arc<Mutex<Channel>>,
    session_id: String,
}

impl PTYSession {
    /// Create a new PTY session with a shell
    pub fn new(session: &Session, session_id: String, rows: u32, cols: u32) -> Result<Self> {
        let mut channel = session.channel_session()
            .context("Failed to create channel")?;
        
        // Request PTY (pseudo-terminal)
        channel.request_pty(
            "xterm-256color",  // Terminal type
            None,              // No specific modes
            Some((cols, rows, 0, 0))  // Width, Height, pixel width (0), pixel height (0)
        ).context("Failed to request PTY")?;
        
        // Start shell
        channel.shell()
            .context("Failed to start shell")?;

        Ok(Self {
            channel: Arc::new(Mutex::new(channel)),
            session_id,
        })
    }

    /// Read output from the terminal
    pub fn read_output(&self) -> Result<Vec<u8>> {
        let mut channel = self.channel.lock().unwrap();
        let mut buffer = vec![0u8; 4096];
        
        match channel.read(&mut buffer) {
            Ok(n) if n > 0 => {
                buffer.truncate(n);
                Ok(buffer)
            },
            Ok(_) => Ok(Vec::new()),
            Err(e) => Err(anyhow::anyhow!("Read error: {}", e)),
        }
    }

    /// Write input to the terminal
    pub fn write_input(&self, data: &[u8]) -> Result<()> {
        let mut channel = self.channel.lock().unwrap();
        channel.write_all(data)
            .context("Failed to write to channel")?;
        channel.flush()
            .context("Failed to flush channel")?;
        Ok(())
    }

    /// Resize the terminal
    pub fn resize(&self, rows: u32, cols: u32) -> Result<()> {
        let mut channel = self.channel.lock().unwrap();
        channel.request_pty_size(cols, rows, None, None)
            .context("Failed to resize PTY")?;
        Ok(())
    }

    /// Check if the channel is still open
    pub fn is_open(&self) -> bool {
        let channel = self.channel.lock().unwrap();
        !channel.eof()
    }

    /// Close the PTY session
    pub fn close(&self) -> Result<()> {
        let mut channel = self.channel.lock().unwrap();
        let _ = channel.close();
        let _ = channel.wait_close();
        Ok(())
    }
}
