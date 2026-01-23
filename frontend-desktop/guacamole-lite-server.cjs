// Guacamole-Lite Server for Windows
// This replaces guacd on Windows where guacd is harder to install

const GuacamoleLite = require('guacamole-lite');
const url = require('url');

// Configuration
const PORT = parseInt(process.env.GUAC_PORT || '4822');
const HOST = process.env.GUAC_HOST || '127.0.0.1';

console.log(`[${new Date().toISOString()}] Starting Guacamole-Lite server...`);
console.log(`[${new Date().toISOString()}] Configuration: ${HOST}:${PORT}`);

// Guacamole-lite configuration
const websocketOptions = {
    port: PORT,
    host: HOST
};

const guacdOptions = {
    host: '127.0.0.1',
    port: 4822
};

const clientOptions = {
    log: {
        verbose: process.env.VERBOSE === 'true',
        stdLog: (...args) => {
            console.log(new Date().toISOString(), '[GUAC]', ...args);
        },
        errorLog: (...args) => {
            console.error(new Date().toISOString(), '[GUAC-ERROR]', ...args);
        }
    },
    // Custom connection callback to parse query string parameters
    connectionDefaultSettings: {
        rdp: {
            'ignore-cert': 'true',
            'security': 'any',
            'enable-drive': 'true',
            'create-drive-path': 'true'
        }
    },
    // Parse connection settings from query string
    crypt: {
        cypher: 'AES-256-CBC',
        key: 'MySuperSecretKeyForParamsProtection12'
    }
};

// Create server with custom connection handler
const callbacks = {
    // This gets called when a client connects
    processConnectionSettings: (settings, callback) => {
        // Parse query string from WebSocket URL
        if (settings && settings.query) {
            const params = settings.query;

            console.log(`[${new Date().toISOString()}] Connection request with params:`, Object.keys(params));

            // Build connection settings from query parameters
            const connection = {
                type: params.protocol || 'rdp',
                settings: {}
            };

            // Copy all parameters to settings
            for (const [key, value] of Object.entries(params)) {
                if (key !== 'protocol') {
                    connection.settings[key] = value;
                }
            }

            console.log(`[${new Date().toISOString()}] Connecting to ${connection.type}://${connection.settings.hostname}:${connection.settings.port}`);

            // Return connection settings
            callback(null, connection);
        } else {
            const error = new Error('No connection parameters provided');
            console.error(`[${new Date().toISOString()}] Error:`, error.message);
            callback(error);
        }
    }
};

let server;

try {
    // Create WebSocket server
    server = new GuacamoleLite(websocketOptions, guacdOptions, clientOptions, callbacks);

    console.log(`[${new Date().toISOString()}] ✅ Guacamole-Lite WebSocket server started`);
    console.log(`[${new Date().toISOString()}] Listening on ws://${HOST}:${PORT}`);
    console.log(`[${new Date().toISOString()}] Ready to accept RDP/VNC/SSH connections`);

} catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to start server:`, error);
    process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n[${new Date().toISOString()}] Shutting down gracefully...`);
    if (server && server.close) {
        server.close(() => {
            console.log(`[${new Date().toISOString()}] Server closed`);
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGTERM', () => {
    console.log(`\n[${new Date().toISOString()}] Received SIGTERM, shutting down...`);
    if (server && server.close) {
        server.close(() => {
            console.log(`[${new Date().toISOString()}] Server closed`);
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Keep process alive
process.on('uncaughtException', (error) => {
    console.error(`[${new Date().toISOString()}] Uncaught exception:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toISOString()}] Unhandled rejection at:`, promise, 'reason:', reason);
});
