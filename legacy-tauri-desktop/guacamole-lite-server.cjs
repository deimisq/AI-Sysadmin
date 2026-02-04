// Guacamole-Lite Server with disabled authentication
// Accepts connections with query parameters directly

const GuacamoleLite = require('guacamole-lite');

const PORT = parseInt(process.env.GUAC_PORT || '4822');

console.log(`[${new Date().toISOString()}] Starting Guacamole-Lite server (auth disabled)`);
console.log(`[${new Date().toISOString()}] Port: ${PORT}`);

// Custom token decryption that just returns the query params as connection settings
const clientOptions = {
    crypt: {
        cypher: 'AES-256-CBC',
        key: 'MySecretKeyForEncryption' // Not used since we override
    },
    log: {
        verbose: true,
        stdLog: console.log.bind(console),
        errorLog: console.error.bind(console)
    }
};

// Override the token decryption to just parse query params
const callbacks = {
    processConnectionSettings: (settings, callback) => {
        try {
            console.log('[processConnectionSettings] Raw settings:', JSON.stringify(settings, null, 2));

            // If already has connection, use it
            if (settings && settings.connection) {
                console.log('[processConnectionSettings] Using existing connection');
                return callback(null, settings);
            }

            // Build from query params
            if (settings && settings.query) {
                const params = settings.query;

                const connection = {
                    type: params.protocol || 'rdp',
                    settings: {}
                };

                // Copy all params
                for (const [key, value] of Object.entries(params)) {
                    if (key !== 'protocol' && value) {
                        connection.settings[key] = value;
                    }
                }

                console.log('[processConnectionSettings] Built connection:', {
                    type: connection.type,
                    hostname: connection.settings.hostname,
                    port: connection.settings.port,
                    username: connection.settings.username
                });

                return callback(null, { connection });
            }

            // If we get here, create a fake token that guacamole-lite can parse
            // We'll encode the query params as a JSON token
            if (settings && settings.token) {
                try {
                    const decoded = JSON.parse(decodeURIComponent(settings.token));
                    console.log('[processConnectionSettings] Decoded token:', decoded);
                    return callback(null, decoded);
                } catch (e) {
                    console.error('[processConnectionSettings] Token parse error:', e);
                }
            }

            callback(new Error('No valid connection settings'));

        } catch (error) {
            console.error('[processConnectionSettings] Error:', error);
            callback(error);
        }
    }
};

// Start server
const server = new GuacamoleLite(
    { port: PORT },
    { host: '127.0.0.1', port: 4822 }, // guacd connection
    clientOptions,
    callbacks
);

console.log(`[${new Date().toISOString()}] ✅ Server started on port ${PORT}`);
console.log(`[${new Date().toISOString()}] Connecting to guacd at 127.0.0.1:4822`);

// Graceful shutdown
const shutdown = () => {
    console.log('\nShutting down...');
    if (server && server.close) {
        server.close(() => {
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => console.error('Uncaught:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
