#!/usr/bin/env node
/**
 * Guacamole WebSocket Proxy
 * Lightweight Node.js proxy for RDP connections via Guacamole protocol
 * This will be bundled with the app executable - no Docker needed!
 */

const net = require('net');
const { WebSocketServer } = require('ws');

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const GUAC_PORT = parseInt(process.env.GUAC_PORT || '4822');
const GUAC_HOST = process.env.GUAC_HOST || '127.0.0.1';
const WS_PORT = 4823; // WebSocket port for frontend

console.log('🚀 Starting Guacamole WebSocket Proxy...');

// --- Auto-start guacd logic ---
const guacdPath = path.join(__dirname, 'bin', 'guacd', 'bin', 'guacd.exe');
let guacdProcess = null;

if (fs.existsSync(guacdPath)) {
    console.log(`📦 Found local guacd: ${guacdPath}`);
    console.log('   Spawning guacd process...');

    guacdProcess = spawn(guacdPath, ['-b', GUAC_HOST, '-l', GUAC_PORT, '-f'], {
        stdio: 'inherit'
    });

    guacdProcess.on('error', (err) => {
        console.error('❌ Failed to start guacd:', err);
    });

    guacdProcess.on('exit', (code) => {
        console.log(`⚠️  guacd exited with code ${code}`);
    });
} else {
    console.log('⚠️  Local guacd.exe not found. Assuming external service (Docker/System).');
    console.log(`   Looking for: ${guacdPath}`);
}

console.log(`   Guacamole Target: ${GUAC_HOST}:${GUAC_PORT}`);
console.log(`   WebSocket Server: ws://localhost:${WS_PORT}`);

const wss = new WebSocketServer({
    host: GUAC_HOST,
    port: WS_PORT
});

wss.on('listening', () => {
    console.log(`✅ WebSocket proxy listening on ws://${GUAC_HOST}:${WS_PORT}`);
});

wss.on('connection', (ws, req) => {
    console.log('🔗 New WebSocket connection from:', req.socket.remoteAddress);

    // Connect to guacd
    const guacSocket = new net.Socket();
    let isConnected = false;

    guacSocket.connect(GUAC_PORT, GUAC_HOST, () => {
        console.log('✅ Connected to guacd');
        isConnected = true;
    });

    // Forward WebSocket -> guacd
    ws.on('message', (data) => {
        if (isConnected) {
            guacSocket.write(data);
        }
    });

    // Forward guacd -> WebSocket
    guacSocket.on('data', (data) => {
        if (ws.readyState === ws.OPEN) {
            ws.send(data);
        }
    });

    // Handle errors and disconnections
    guacSocket.on('error', (err) => {
        console.error('❌ guacd socket error:', err.message);
        ws.close();
    });

    guacSocket.on('close', () => {
        console.log('🔌 guacd connection closed');
        ws.close();
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket closed');
        guacSocket.destroy();
    });

    ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message);
        guacSocket.destroy();
    });
});

wss.on('error', (err) => {
    console.error('❌ WebSocket server error:', err.message);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down proxy...');
    if (guacdProcess) {
        console.log('   Stopping guacd...');
        guacdProcess.kill();
    }
    wss.close(() => {
        console.log('✅ Proxy stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    wss.close(() => process.exit(0));
});
