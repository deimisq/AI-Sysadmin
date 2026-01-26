// Smart WebSocket-to-Guacamole Proxy
// Handles the initial Guacamole handshake (select -> connect) automatically
// allowing the client to connect with simple URL parameters.

const WebSocket = require('ws');
const net = require('net');
const url = require('url');

const WS_PORT = parseInt(process.env.GUAC_PORT || '4822');
const GUACD_HOST = '127.0.0.1';
const GUACD_PORT = 4823; // Docker mapping

console.log(`[${new Date().toISOString()}] Starting Smart Guacamole Proxy`);
console.log(`[${new Date().toISOString()}] 0.0.0.0:${WS_PORT} -> ${GUACD_HOST}:${GUACD_PORT}`);

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws, req) => {
    const id = Math.random().toString(36).substr(2, 6);
    const params = url.parse(req.url, true).query;

    console.log(`[${id}] New connection to ${params.hostname}`);

    const guacd = net.connect(GUACD_PORT, GUACD_HOST);
    let handshakeState = 'SELECT';

    guacd.on('connect', () => {
        // 1. Select RDP protocol
        const protocol = params.protocol || 'rdp';
        guacd.write(`${protocol.length}.select,${protocol.length}.${protocol};`);
    });

    guacd.on('data', (data) => {
        const msg = data.toString('utf8');

        // 2. Intercept 'args' request from guacd
        if (handshakeState === 'SELECT' && msg.indexOf('args,') !== -1) {
            console.log(`[${id}] negotiating handshake...`);

            // Extract requested parameters
            const argsPayload = msg.substring(msg.indexOf('args,') + 5);
            const requestedParams = [];
            const parts = argsPayload.split(',');
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                const dotIndex = part.indexOf('.');
                if (dotIndex !== -1) requestedParams.push(part.substring(dotIndex + 1));
            }

            // Prepare parameters
            const allParams = { ...params };
            // Defaults that fix common Windows/RDP issues
            if (!allParams['ignore-cert']) allParams['ignore-cert'] = 'true';
            if (!allParams.security) allParams.security = 'any'; // Try 'nla' if this fails
            if (!allParams.width) allParams.width = '1280';
            if (!allParams.height) allParams.height = '720';
            if (!allParams.dpi) allParams.dpi = '96';

            // 3. Send 'size' 
            const sizeMsg = `4.size,${allParams.width.length}.${allParams.width},${allParams.height.length}.${allParams.height},${allParams.dpi.length}.${allParams.dpi};`;
            guacd.write(sizeMsg);

            // 4. Send 'audio/video' (basic)
            guacd.write('5.audio,0;,5.video,0;,5.image,0;;');

            // 5. Send 'connect' with values in exact order requested
            const values = requestedParams.map(key => allParams[key] || '');
            const connectElements = values.map(v => `${String(v).length}.${String(v)}`).join(',');
            guacd.write(`7.connect,${connectElements};`);

            handshakeState = 'CONNECTED';
            return; // Do not forward 'args' to client
        }

        // Forward everything else (READY, error, frame data)
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data.toString('utf8'));
        }
    });

    guacd.on('error', (err) => console.error(`[${id}] guacd error: ${err.message}`));
    guacd.on('close', () => {
        console.log(`[${id}] guacd closed connection`);
        ws.close();
    });

    ws.on('message', (data) => {
        if (guacd.writable) guacd.write(data);
    });

    // Keep alive
    const ping = setInterval(() => {
        if (guacd.writable && handshakeState === 'CONNECTED') guacd.write('3.nop;');
    }, 5000);

    ws.on('close', () => {
        clearInterval(ping);
        console.log(`[${id}] Client closed`);
        guacd.end();
    });
});
