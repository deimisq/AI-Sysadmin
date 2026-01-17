#!/bin/bash
# Quick SSH test script

echo "🧪 Testing SSH Connection via Rust ssh2 crate"
echo "=============================================="
echo ""
echo "Server: localhost:2222"
echo "User: root / Password: root"
echo ""

cd "$(dirname "$0")/src-tauri"

echo "Running Rust SSH test..."
cargo test test_ssh_connection_to_localhost -- --ignored --nocapture

echo ""
echo "Test completed. Check output above for results."
