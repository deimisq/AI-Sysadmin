// Stub for PTY session - will be re-implemented with russh

use anyhow::Result;
use serde::Serialize;

#[derive(Serialize)]
pub struct PTYSession;

impl PTYSession {
    pub fn _new() -> Self {
        Self
    }
}
