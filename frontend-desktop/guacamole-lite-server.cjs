// Guacamole-Lite Server for Windows
// This replaces guacd on Windows where guacd is harder to install

const GuacamoleLite = require('guacamole-lite');

// Configuration
const PORT = parseInt(process.env.GUAC_PORT || '4822');
const HOST = process.env.GUAC_HOST || '127.0.0.1';

console.log(`[${new Date().toISOString()}] Starting Guacamole-Lite server...`);
console.log(`[${new Date().toISOString()}] Configuration: ${HOST}:${PORT}`);

// Guacamole-lite configuration
const websocketOptions = {
    port: PORT
};

const guacdOptions = {
    host: '127.0.0.1',
    port: 4822
};

const clientOptions = {
    log: {
        verbose: true,
        stdLog: (...args) => {
            console.log(new Date().toISOString(), '[GUAC]', ...args);
        },
        errorLog: (...args) => {
            console.error(new Date().toISOString(), '[GUAC-ERROR]', ...args);
        }
    },
    // Disable token authentication - parse params directly from query string
    allowedUnencryptedConnectionSettings: {
        rdp: ['hostname', 'port', 'username', 'password', 'ignore-cert', 'security', 'enable-drive', 'create-drive-path', 'enable-wallpaper', 'enable-theming', 'enable-font-smoothing', 'enable-full-window-drag', 'enable-desktop-composition', 'enable-menu-animations', 'width', 'height', 'dpi', 'color-depth'],
        vnc: ['hostname', 'port', 'password'],
        ssh: ['hostname', 'port', 'username', 'password']
    }
};

const callbacks = {
    // Process connection settings from query parameters
    processConnectionSettings: (settings, callback) => {
        try {
            console.log(`[${new Date().toISOString()}] Processing connection settings:`, JSON.stringify(settings, null, 2));

            // If settings are already properly formatted, use them
            if (settings && settings.connection) {
                console.log(`[${new Date().toISOString()}] Using provided connection settings`);
                return callback(null, settings);
            }

            // Otherwise, build connection from query parameters
            if (settings && settings.query) {
                const params = settings.query;
                const connection = {
                    type: params.protocol || 'rdp',
                    settings: {}
                };

                // Copy all parameters except 'protocol'
                for (const [key, value] of Object.entries(params)) {
                    if (key !== 'protocol' && value !== undefined) {
                        connection.settings[key] = value;
                    }
                }

                console.log(`[${new Date().toISOString()}] Built connection:`, {
                    type: connection.type,
                    hostname: connection.settings.hostname,
                    port: connection.settings.port,
                    username: connection.settings.username
                });

                return callback(null, { connection });
            }

            // Fallback error
            const error = new Error('No valid connection settings provided');
            console.error(`[${new Date().toISOString()}] Error:`, error.message);
            callback(error);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Exception in processConnectionSettings:`, error);
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
    console.log(`[${new Date().toISOString()}] Token validation: DISABLED (using query params)`);

} catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to start server:`, error);
    process.exit(1);
}

// Graceful shutdown
const shutdown = () => {
    console.log(`\n[${new Date().toISOString()}] Shutting down gracefully...`);
    if (server && typeof server.close === 'function') {
        server.close(() => {
            console.log(`[${new Date().toISOString()}] Server closed`);
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Error handlers
process.on('uncaughtException', (error) => {
    console.error(`[${new Date().toISOString()}] Uncaught exception:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
});
