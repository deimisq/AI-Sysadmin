// Simple WebSocket-to-Guacamole Proxy
// Properly implements Guacamole protocol handshake

const WebSocket = require('ws');
const net = require('net');
const url = require('url');

const WS_PORT = parseInt(process.env.GUAC_PORT || '4822');
const GUACD_HOST = '127.0.0.1';
const GUACD_PORT = 4822; // Docker maps 4823->4822, so we connect to 4822

console.log(`[${new Date().toISOString()}] Starting Guacamole WebSocket Proxy`);
console.log(`[${new Date().toISOString()}] WebSocket: 0.0.0.0:${WS_PORT}`);
console.log(`[${new Date().toISOString()}] guacd: ${GUACD_HOST}:${GUACD_PORT}`);

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('listening', () => {
    console.log(`[${new Date().toISOString()}] ✅ Proxy ready`);
});

wss.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] ❌ WebSocket error:`, error.message);
    process.exit(1);
});

wss.on('connection', (ws, req) => {
    const id = Math.random().toString(36).substr(2, 6);
    const params = url.parse(req.url, true).query;

    console.log(`[${id}] New connection`);
    console.log(`[${id}] RDP: ${params.hostname}:${params.port}`);

    const guacd = net.connect(GUACD_PORT, GUACD_HOST);
    let handshakeState = 'SELECT';

    guacd.on('connect', () => {
        console.log(`[${id}] Connected to guacd`);

        // Send Guacamole handshake: select protocol
        const protocol = params.protocol || 'rdp';
        const selectMsg = `6.select,${protocol.length}.${protocol};`;
        guacd.write(selectMsg);
        console.log(`[${id}] Sent: ${selectMsg.trim()}`);
    });

    guacd.on('data', (data) => {
        const msg = data.toString();

        if (handshakeState === 'SELECT') {
            // guacd responds with: args,param1,param2,...;
            console.log(`[${id}] guacd args response`);

            // Send connect with RDP parameters
            const connectArgs = [
                params.hostname || '',
                params.port || '3389',
                params.username || '',
                params.password || '',
                params['ignore-cert'] || 'true',
                params.security || 'any'
            ];

            const connectElements = connectArgs.map(arg => `${arg.length}.${arg}`).join(',');
            const connectMsg = `7.connect,${connectElements};`;

            guacd.write(connectMsg);
            console.log(`[${id}] Sent connect with ${connectArgs.length} params`);
            handshakeState = 'CONNECTED';
        }

        // Forward all guacd data to WebSocket AS STRING
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

    // Forward WebSocket messages to guacd
    ws.on('message', (data) => {
        if (guacd.writable) {
            guacd.write(data);
        }
    });

    ws.on('close', () => {
        console.log(`[${id}] WebSocket closed`);
        guacd.end();
    });

    ws.on('error', (err) => {
        console.error(`[${id}] WebSocket error:`, err.message);
        guacd.end();
    });
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    wss.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
    wss.close(() => process.exit(0));
});
