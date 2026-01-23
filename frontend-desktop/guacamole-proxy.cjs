// Simple WebSocket-to-Guacamole Proxy Server
// Bridges WebSocket connections (from browser) to guacd TCP socket

const WebSocket = require('ws');
const net = require('net');
const url = require('url');

const WS_PORT = parseInt(process.env.GUAC_PORT || '4822');
const GUACD_HOST = '127.0.0.1';
const GUACD_PORT = 4823; // guacd will run on this port

console.log(`[${new Date().toISOString()}] Starting Guacamole WebSocket Proxy`);
console.log(`[${new Date().toISOString()}] WebSocket: 0.0.0.0:${WS_PORT}`);
console.log(`[${new Date().toISOString()}] guacd: ${GUACD_HOST}:${GUACD_PORT}`);

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('listening', () => {
    console.log(`[${new Date().toISOString()}] ✅ WebSocket proxy listening on port ${WS_PORT}`);
    console.log(`[${new Date().toISOString()}] Ready to proxy connections to guacd`);
});

wss.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] ❌ WebSocket server error:`, error);
    process.exit(1);
});

// Handle new WebSocket connections
wss.on('connection', (ws, req) => {
    const connectionId = Math.random().toString(36).substring(7);
    const clientIp = req.socket.remoteAddress;

    console.log(`[${new Date().toISOString()}] [${connectionId}] New WebSocket connection from ${clientIp}`);

    try {
        // Parse query parameters from WebSocket URL
        const parsedUrl = url.parse(req.url, true);
        const params = parsedUrl.query;

        console.log(`[${new Date().toISOString()}] [${connectionId}] Parameters:`, {
            protocol: params.protocol || 'rdp',
            hostname: params.hostname,
            port: params.port,
            username: params.username
        });

        // Build Guacamole connection string
        const protocol = params.protocol || 'rdp';
        const connectionParams = [];

        // Add all parameters as Guacamole protocol arguments
        for (const [key, value] of Object.entries(params)) {
            if (key !== 'protocol' && value) {
                connectionParams.push(`${key}=${value}`);
            }
        }

        // Connect to guacd
        const guacdSocket = net.connect(GUACD_PORT, GUACD_HOST);

        guacdSocket.on('connect', () => {
            console.log(`[${new Date().toISOString()}] [${connectionId}] Connected to guacd`);

            // Send Guacamole handshake
            // Format: "select" instruction with protocol
            const handshake = encodeGuacamoleInstruction('select', protocol);
            guacdSocket.write(handshake);

            console.log(`[${new Date().toISOString()}] [${connectionId}] Sent handshake: ${protocol}`);
        });

        guacdSocket.on('data', (data) => {
            // Forward guacd data to WebSocket client
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        guacdSocket.on('error', (error) => {
            console.error(`[${new Date().toISOString()}] [${connectionId}] guacd error:`, error.message);
            ws.close();
        });

        guacdSocket.on('close', () => {
            console.log(`[${new Date().toISOString()}] [${connectionId}] guacd connection closed`);
            ws.close();
        });

        // Handle WebSocket messages (from client)
        ws.on('message', (message) => {
            // Forward client messages to guacd
            if (guacdSocket.writable) {
                guacdSocket.write(message);
            }
        });

        ws.on('close', () => {
            console.log(`[${new Date().toISOString()}] [${connectionId}] WebSocket closed`);
            guacdSocket.end();
        });

        ws.on('error', (error) => {
            console.error(`[${new Date().toISOString()}] [${connectionId}] WebSocket error:`, error.message);
            guacdSocket.end();
        });

        // Send connection parameters after handshake
        // This needs to wait for guacd's response, so we'll handle it in the data event
        let handshakeComplete = false;
        const originalOnData = guacdSocket.on;

        guacdSocket.on('data', function handshakeHandler(data) {
            if (!handshakeComplete) {
                const response = data.toString();
                console.log(`[${new Date().toISOString()}] [${connectionId}] guacd response:`, response.substring(0, 100));

                // After receiving guacd's response, send connection parameters
                if (response.includes('args') || response.includes('ready')) {
                    // Send size instruction
                    const width = params.width || '1920';
                    const height = params.height || '1080';
                    const sizeInstruction = encodeGuacamoleInstruction('size', width, height);
                    guacdSocket.write(sizeInstruction);

                    // Send connect instruction with all parameters
                    const connectArgs = [
                        params.hostname || '',
                        params.port || '3389',
                        params.username || '',
                        params.password || '',
                        params['ignore-cert'] || 'true',
                        params.security || 'any'
                    ];

                    const connectInstruction = encodeGuacamoleInstruction('connect', ...connectArgs);
                    guacdSocket.write(connectInstruction);

                    console.log(`[${new Date().toISOString()}] [${connectionId}] Sent connect instruction`);
                    handshakeComplete = true;
                }
            }

            // Forward to WebSocket
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [${connectionId}] Error:`, error);
        ws.close();
    }
});

// Encode Guacamole protocol instruction
// Format: length.element1,length.element2,...;
function encodeGuacamoleInstruction(opcode, ...args) {
    const elements = [opcode, ...args];
    const encoded = elements.map(el => {
        const str = String(el);
        return `${str.length}.${str}`;
    }).join(',') + ';';

    return encoded;
}

// Graceful shutdown
function shutdown() {
    console.log(`\n[${new Date().toISOString()}] Shutting down...`);
    wss.close(() => {
        console.log(`[${new Date().toISOString()}] Server closed`);
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (error) => {
    console.error(`[${new Date().toISOString()}] Uncaught exception:`, error);
});

process.on('unhandledRejection', (reason) => {
    console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
});
