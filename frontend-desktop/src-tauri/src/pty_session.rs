use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem, MasterPty, Child};
use std::sync::{Arc, Mutex};
use std::io::{Read, Write};
use anyhow::Result;
use tauri::{Emitter, AppHandle};

pub struct PTYSession {
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    #[allow(dead_code)]
    child: Box<dyn Child + Send>,
}

impl PTYSession {
    pub fn new(app: AppHandle, session_id: String, rows: u16, cols: u16, command_line: &str, args: &[String]) -> Result<Self> {
        let pty_system = NativePtySystem::default();

        let pair = pty_system.openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let mut cmd = CommandBuilder::new(command_line);
        cmd.args(args);
        
        // Setup environment
        cmd.env("TERM", "xterm-256color");

        let child = pair.slave.spawn_command(cmd)?;

        // Close slave in parent
        // pair.slave is dropped here

        let mut master = pair.master;
        
        // Take writer (crucial step for portable-pty 0.8)
        let writer = master.take_writer()?;
        
        // Take reader
        let mut reader = master.try_clone_reader()?;
        
        let session_id_clone = session_id.clone();
        
        std::thread::spawn(move || {
            let mut buffer = [0u8; 8192];
            loop {
                match reader.read(&mut buffer) {
                    Ok(n) if n > 0 => {
                        let data = buffer[0..n].to_vec();
                        if let Err(e) = app.emit(&format!("pty-data:{}", session_id_clone), data) {
                            eprintln!("Failed to emit pty data: {}", e);
                            break;
                        }
                    }
                    _ => break,
                }
            }
            println!("PTY Read thread ended for session {}", session_id_clone);
        });

        Ok(Self {
            master: Arc::new(Mutex::new(master)),
            writer: Arc::new(Mutex::new(writer)),
            child,
        })
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<()> {
        let master = self.master.lock().unwrap();
        master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn write(&self, data: &[u8]) -> Result<()> {
        let mut writer = self.writer.lock().unwrap();
        writer.write_all(data)?;
        writer.flush()?;
        Ok(())
    }
}
