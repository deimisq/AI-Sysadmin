// Transparent WebSocket-to-Guacamole Proxy
// Bridges WebSocket (Browser) <-> TCP (guacd) directly.
// Handshake is handled by the client (Guacamole.Client) in the browser.

const WebSocket = require('ws');
const net = require('net');

const WS_PORT = parseInt(process.env.GUAC_PORT || '4822');
const GUACD_HOST = '127.0.0.1';
const GUACD_PORT = 4823; // Docker connection

console.log(`[${new Date().toISOString()}] Starting Transparent Guacamole Proxy`);
console.log(`[${new Date().toISOString()}] WS params: 0.0.0.0:${WS_PORT} -> ${GUACD_HOST}:${GUACD_PORT}`);

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('listening', () => {
    console.log(`[${new Date().toISOString()}] ✅ Proxy listening on port ${WS_PORT}`);
});

wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substr(2, 6);
    console.log(`[${id}] New WebSocket connection`);

    // Connect to guacd
    const guacd = net.connect(GUACD_PORT, GUACD_HOST);

    // From guacd -> Browser
    guacd.on('data', (data) => {
        // Guacamole protocol is text-based (mostly), but guacd sends bytes.
        // WebSocket can send strings or binary. guac-common-js handles string best.
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data.toString('utf8'));
        }
    });

    guacd.on('error', (err) => {
        console.error(`[${id}] guacd error:`, err.message);
        ws.close();
    });

    guacd.on('close', () => {
        console.log(`[${id}] guacd closed`);
        ws.close();
    });

    // From Browser -> guacd
    ws.on('message', (data) => {
        // console.log(`[${id}] WS -> guacd: ${data.length} bytes`); // define verbose if needed
        if (guacd.writable) {
            guacd.write(data);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[${id}] WebSocket closed (Code: ${code})`);
        guacd.end();
    });

    ws.on('error', (err) => {
        console.error(`[${id}] WebSocket error:`, err.message);
        guacd.end();
    });
});

// Cleanup
process.on('SIGINT', () => {
    console.log('Shutting down proxy...');
    wss.close(() => process.exit(0));
});
