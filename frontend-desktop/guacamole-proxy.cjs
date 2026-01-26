// Simple WebSocket-to-Guacamole Proxy
// Properly implements Guacamole protocol handshake

const WebSocket = require('ws');
const net = require('net');
const url = require('url');

const WS_PORT = parseInt(process.env.GUAC_PORT || '4822');
const GUACD_HOST = '127.0.0.1';
const GUACD_PORT = 4823; // Docker container port mapping: host 4823 -> container 4822

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
            // Check if this is the args message (guacd protocol)
            if (msg.indexOf('args,') !== -1) {
                console.log(`[${id}] Received guacd 'args'`);

                // Content after 'args,' example: 13.VERSION_1_5_0,8.hostname,4.port,...;
                const argsPayload = msg.substring(msg.indexOf('args,') + 5);

                // Parse the parameter names requested by guacd
                // Format is Length.Value,Length.Value,...
                const requestedParams = [];
                const parts = argsPayload.split(',');

                // Skip version (first element), inspect others
                for (let i = 1; i < parts.length; i++) {
                    const part = parts[i];
                    const dotIndex = part.indexOf('.');
                    if (dotIndex !== -1) {
                        const val = part.substring(dotIndex + 1);
                        if (val && val !== ';') requestedParams.push(val);
                    }
                }

                console.log(`[${id}] guacd expects: ${requestedParams.join(', ')}`);

                // Prepare all available params
                const allParams = { ...params };
                // Defaults
                if (!allParams.width) allParams.width = '1920';
                if (!allParams.height) allParams.height = '1080';
                if (!allParams.dpi) allParams.dpi = '96';
                if (!allParams['ignore-cert']) allParams['ignore-cert'] = 'true';
                if (!allParams.security) allParams.security = 'any';

                // Send 'size' instruction first (width, height, dpi)
                const sizeMsg = `4.size,${allParams.width.length}.${allParams.width},${allParams.height.length}.${allParams.height},${allParams.dpi.length}.${allParams.dpi};`;
                guacd.write(sizeMsg);

                // Map values to the requested order
                const values = requestedParams.map(key => allParams[key] || '');
                const connectElements = values.map(v => `${String(v).length}.${String(v)}`).join(',');
                const connectMsg = `7.connect,${connectElements};`;

                guacd.write(connectMsg);
                console.log(`[${id}] Sent handshake (size + connect)`);

                handshakeState = 'CONNECTING'; // Now waiting for 'ready'

                // CRITICAL: Do NOT forward 'args' to client used to simple tunnel
                return;
            }
        }

        // Log forwarding (debug)
        if (ws.readyState === WebSocket.OPEN) {
            // Log ready/error for debugging
            if (msg.startsWith('5.ready') || msg.startsWith('5.error')) {
                console.log(`[${id}] ← guacd: ${msg.substring(0, 100)}`);
            }
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
