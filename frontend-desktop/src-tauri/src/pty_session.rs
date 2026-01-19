use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem, MasterPty, Child};
use std::sync::{Arc, Mutex};
use std::io::{Read, Write};
use anyhow::Result; // Removed Context unused
use tauri::{Emitter, AppHandle};

pub struct PTYSession {
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    #[allow(dead_code)] // We keep the child to ensure it lives as long as the session
    child: Box<dyn Child + Send>,
}

// We need to implement Send manually because portable_pty traits are not explicitly Send in all versions, 
// but the underlying system implementations usually are. 
// However, to be safe with Arc<Mutex<...>>, we rely on the fact that we'll access it safely.
// Actually, standard Box<dyn MasterPty + Send> is the right way if the crate supports it.
// portable-pty 0.8 supports Send for MasterPty.

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
        // pair.slave is dropped here, which is correct

        let master = pair.master;
        
        // Spawn read thread
        let mut reader = master.try_clone_reader()?;
        let session_id_clone = session_id.clone();
        
        std::thread::spawn(move || {
            let mut buffer = [0u8; 8192];
            loop {
                match reader.read(&mut buffer) {
                    Ok(n) if n > 0 => {
                        let data = buffer[0..n].to_vec();
                        // Emit to frontend
                        if let Err(e) = app.emit(&format!("pty-data:{}", session_id_clone), data) {
                            eprintln!("Failed to emit pty data: {}", e);
                            break;
                        }
                    }
                    _ => break, // EOF or error
                }
            }
            println!("PTY Read thread ended for session {}", session_id_clone);
        });

        Ok(Self {
            master: Arc::new(Mutex::new(master)),
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
        let master = self.master.lock().unwrap();
        // MasterPty is not Write itself, but we can get a writer
        let mut writer = master.try_clone_writer()?;
        writer.write_all(data)?;
        writer.flush()?;
        Ok(())
    }
}
