// Guacamole-Lite Server for Windows
// This replaces guacd on Windows where guacd is harder to install

const GuacamoleLite = require('guacamole-lite');

// Configuration
const PORT = process.env.GUAC_PORT || 4822;
const HOST = process.env.GUAC_HOST || '127.0.0.1';

// Create server
const server = new GuacamoleLite({
    port: PORT,
    host: HOST
}, {
    // Log level
    log: {
        verbose: false,
        stdLog: (...args) => {
            console.log(new Date().toISOString(), '[INFO]', ...args);
        }
    }
});

// Connection event
server.on('connection', (connection) => {
    console.log(`[${new Date().toISOString()}] New connection: ${connection.connectionId}`);

    connection.on('close', () => {
        console.log(`[${new Date().toISOString()}] Connection closed: ${connection.connectionId}`);
    });

    connection.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Connection error:`, error);
    });
});

// Server events
server.on('listening', () => {
    console.log(`[${new Date().toISOString()}] ✅ Guacamole-Lite server listening on ws://${HOST}:${PORT}`);
    console.log(`[${new Date().toISOString()}] Ready to accept RDP/VNC/SSH connections`);
});

server.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] ❌ Server error:`, error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[${new Date().toISOString()}] Shutting down gracefully...');
    server.close(() => {
        console.log('[${new Date().toISOString()}] Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n[${new Date().toISOString()}] Received SIGTERM, shutting down...');
    server.close(() => {
        console.log('[${new Date().toISOString()}] Server closed');
        process.exit(0);
    });
});

console.log(`[${new Date().toISOString()}] Starting Guacamole-Lite server...`);
