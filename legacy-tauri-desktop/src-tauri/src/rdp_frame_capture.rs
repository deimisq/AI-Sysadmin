use std::sync::{Arc, Mutex};
use std::sync::mpsc::{channel, Sender, Receiver};
use tokio::task;
use serde::{Serialize, Deserialize};

/// Represents a single RDP frame
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct RdpFrame {
    pub width: u32,
    pub height: u32,
    pub format: String, // "RGB", "RGBA", etc.
    #[serde(with = "serde_bytes")]
    pub data: Vec<u8>,
    pub timestamp: u64,
}

/// Frame capture mode
#[derive(Clone, Debug)]
pub enum CaptureMode {
    /// Capture via shared memory (fastest, Windows only)
    SharedMemory,
    /// Capture via named pipe (cross-platform)
    NamedPipe(String),
    /// Capture via stdout/stderr parsing (fallback)
    StdoutParse,
}

pub struct FrameCapture {
    mode: CaptureMode,
    frame_sender: Option<Sender<RdpFrame>>,
    frame_receiver: Arc<Mutex<Receiver<RdpFrame>>>,
    is_capturing: Arc<Mutex<bool>>,
}

impl FrameCapture {
    pub fn new(mode: CaptureMode) -> Self {
        let (tx, rx) = channel();
        
        Self {
            mode,
            frame_sender: Some(tx),
            frame_receiver: Arc::new(Mutex::new(rx)),
            is_capturing: Arc::new(Mutex::new(false)),
        }
    }

    /// Start capturing frames from FreeRDP
    pub async fn start_capture(&mut self) -> anyhow::Result<()> {
        let mut capturing = self.is_capturing.lock().unwrap();
        if *capturing {
            return Ok(()); // Already capturing
        }
        *capturing = true;
        drop(capturing);

        match &self.mode {
            CaptureMode::NamedPipe(pipe_name) => {
                self.capture_from_pipe(pipe_name.clone()).await?;
            }
            CaptureMode::SharedMemory => {
                #[cfg(target_os = "windows")]
                {
                    self.capture_from_shared_memory().await?;
                }
                #[cfg(not(target_os = "windows"))]
                {
                    anyhow::bail!("SharedMemory mode only available on Windows");
                }
            }
            CaptureMode::StdoutParse => {
                // Will implement stdout parsing as fallback
                anyhow::bail!("StdoutParse mode not yet implemented");
            }
        }

        Ok(())
    }

    /// Capture frames from named pipe
    async fn capture_from_pipe(&mut self, _pipe_name: String) -> anyhow::Result<()> {
        // TODO: Implement named pipe reading
        // For now, this is a placeholder
        println!("FrameCapture: Starting pipe capture (placeholder)");
        Ok(())
    }

    /// Capture frames from shared memory (Windows only)
    #[cfg(target_os = "windows")]
    async fn capture_from_shared_memory(&mut self) -> anyhow::Result<()> {
        // TODO: Implement Windows shared memory reading
        println!("FrameCapture: Starting shared memory capture (placeholder)");
        Ok(())
    }

    /// Try to receive next frame (non-blocking)
    pub fn try_recv_frame(&self) -> Option<RdpFrame> {
        let receiver = self.frame_receiver.lock().unwrap();
        receiver.try_recv().ok()
    }

    /// Stop capturing
    pub fn stop(&mut self) {
        let mut capturing = self.is_capturing.lock().unwrap();
        *capturing = false;
        println!("FrameCapture: Stopped");
    }
}

impl Drop for FrameCapture {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Mock frame generator for testing (until real capture is implemented)
pub struct MockFrameGenerator {
    width: u32,
    height: u32,
    frame_count: u64,
}

impl MockFrameGenerator {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            frame_count: 0,
        }
    }

    /// Generate a test frame with gradient pattern
    pub fn generate_frame(&mut self) -> RdpFrame {
        let pixels = (self.width * self.height) as usize;
        let mut data = Vec::with_capacity(pixels * 4); // RGBA

        // Generate a moving gradient pattern
        let offset = (self.frame_count % 255) as u8;
        
        for y in 0..self.height {
            for x in 0..self.width {
                let r = ((x as f32 / self.width as f32) * 255.0) as u8;
                let g = ((y as f32 / self.height as f32) * 255.0) as u8;
                let b = offset;
                let a = 255u8;
                
                data.push(r);
                data.push(g);
                data.push(b);
                data.push(a);
            }
        }

        self.frame_count += 1;

        RdpFrame {
            width: self.width,
            height: self.height,
            format: "RGBA".to_string(),
            data,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_frame_generator() {
        let mut gen = MockFrameGenerator::new(100, 100);
        let frame = gen.generate_frame();
        
        assert_eq!(frame.width, 100);
        assert_eq!(frame.height, 100);
        assert_eq!(frame.data.len(), 100 * 100 * 4); // RGBA
        assert_eq!(frame.format, "RGBA");
    }
}
