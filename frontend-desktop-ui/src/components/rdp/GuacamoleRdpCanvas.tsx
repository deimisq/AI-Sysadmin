import React, { useEffect, useRef, useState } from 'react';
import Guacamole from 'guacamole-common-js';

interface GuacamoleRdpCanvasProps {
    host: string;
    username: string;
    password: string;
    width?: number;
    height?: number;
    onDisconnect?: () => void;
}

export const GuacamoleRdpCanvas: React.FC<GuacamoleRdpCanvasProps> = ({
    host,
    username,
    password,
    width = 1024,
    height = 768,
    onDisconnect
}) => {
    const displayRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [error, setError] = useState<string | null>(null);
    const clientRef = useRef<any>(null);

    useEffect(() => {
        console.log('[Guacamole] Initializing connection...');

        if (!displayRef.current) {
            console.error('[Guacamole] Display ref not ready');
            return;
        }

        // WebSocket tunnel to guacamole proxy
        const wsUrl = `ws://127.0.0.1:4823`;
        console.log('[Guacamole] Connecting to:', wsUrl);

        try {
            // Create Guacamole tunnel
            const tunnel = new Guacamole.WebSocketTunnel(wsUrl);

            // Create Guacamole client
            const client = new Guacamole.Client(tunnel);
            clientRef.current = client;

            // Get display element
            const display = client.getDisplay().getElement();
            displayRef.current.appendChild(display);

            // Connection state handlers
            client.onstatechange = (state: number) => {
                console.log('[Guacamole] State changed:', state);

                switch (state) {
                    case Guacamole.Client.CONNECTING:
                        setStatus('connecting');
                        break;
                    case Guacamole.Client.CONNECTED:
                        setStatus('connected');
                        console.log('✅ Guacamole connected');
                        break;
                    case Guacamole.Client.DISCONNECTED:
                        setStatus('disconnected');
                        console.log('🔌 Guacamole disconnected');
                        if (onDisconnect) onDisconnect();
                        break;
                }
            };

            // Error handler
            client.onerror = (error: any) => {
                console.error('[Guacamole] Error:', error);
                setStatus('error');
                setError(error.message || 'Connection error');
            };

            // Build connection string
            // Format: protocol;hostname;port;username;password;width;height
            const connectionString = [
                'rdp',           // protocol
                host,            // hostname
                '3389',          // port
                username,        // username  
                password,        // password
                width.toString(),   // width
                height.toString(),  // height
                '',              // domain (optional)
                '0',             // color depth (0 = auto)
                'en-us-qwerty'   // keyboard layout
            ].join('\0');

            console.log('[Guacamole] Connection params:', { host, username, width, height });

            // Connect
            client.connect(connectionString);

            // Handle mouse events
            const mouse = new Guacamole.Mouse(display);

            mouse.onmousedown =
                mouse.onmouseup =
                mouse.onmousemove = (mouseState: any) => {
                    client.sendMouseState(mouseState);
                };

            // Handle keyboard events
            const keyboard = new Guacamole.Keyboard(document);

            keyboard.onkeydown = (keysym: number) => {
                client.sendKeyEvent(1, keysym);
            };

            keyboard.onkeyup = (keysym: number) => {
                client.sendKeyEvent(0, keysym);
            };

            // Cleanup
            return () => {
                console.log('[Guacamole] Cleaning up connection');
                keyboard.onkeydown = undefined;
                keyboard.onkeyup = undefined;
                client.disconnect();
            };

        } catch (err: any) {
            console.error('[Guacamole] Initialization error:', err);
            setStatus('error');
            setError(err.message);
        }
    }, [host, username, password, width, height, onDisconnect]);

    return (
        <div className="guacamole-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {status === 'connecting' && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    zIndex: 10
                }}>
                    <div className="spinner"></div>
                    <p>Connecting to {host}...</p>
                </div>
            )}

            {status === 'error' && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'red',
                    zIndex: 10
                }}>
                    <h3>Connection Error</h3>
                    <p>{error}</p>
                </div>
            )}

            <div
                ref={displayRef}
                style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden'
                }}
            />
        </div>
    );
};

export default GuacamoleRdpCanvas;
