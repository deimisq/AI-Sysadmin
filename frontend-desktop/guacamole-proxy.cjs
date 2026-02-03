#!/usr/bin/env node
/**
 * Guacamole WebSocket Proxy
 * Lightweight Node.js proxy for RDP connections via Guacamole protocol
 * This will be bundled with the app executable - no Docker needed!
 */

const net = require('net');
const { WebSocketServer } = require('ws');

const GUAC_PORT = parseInt(process.env.GUAC_PORT || '4822');
const GUAC_HOST = process.env.GUAC_HOST || '127.0.0.1';
const WS_PORT = 4823; // WebSocket port for frontend

console.log('🚀 Starting Guacamole WebSocket Proxy...');
console.log(`   Guacamole: ${GUAC_HOST}:${GUAC_PORT}`);
console.log(`   WebSocket: ws://${GUAC_HOST}:${WS_PORT}`);

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
    wss.close(() => {
        console.log('✅ Proxy stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    wss.close(() => process.exit(0));
});
