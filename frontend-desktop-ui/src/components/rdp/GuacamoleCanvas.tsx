import { useRef, useEffect, useState } from 'react';
// @ts-ignore - guacamole-common-js doesn't have perfect TS types
import Guacamole from 'guacamole-common-js';

interface GuacamoleCanvasProps {
    host: string;
    port: number;
    username: string;
    password: string;
    width?: number;
    height?: number;
    onDisconnect?: () => void;
}

export function GuacamoleCanvas({
    host,
    port,
    username,
    password,
    width = 1920,
    height = 1080,
    onDisconnect
}: GuacamoleCanvasProps) {
    const displayRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<string>('initializing');
    const [error, setError] = useState<string | null>(null);
    const clientRef = useRef<Guacamole.Client | null>(null);
    const mouseRef = useRef<Guacamole.Mouse | null>(null);
    const keyboardRef = useRef<Guacamole.Keyboard | null>(null);

    useEffect(() => {
        if (!displayRef.current) return;

        let isActive = true;

        console.log('[GuacamoleCanvas] Initializing connection...');
        console.log('[GuacamoleCanvas] Target:', { host, port, username });

        try {
            // Create WebSocket tunnel to guacamole server (guacamole-lite or guacd)
            const wsUrl = 'ws://127.0.0.1:4822';
            console.log('[GuacamoleCanvas] Connecting to WebSocket:', wsUrl);

            const tunnel = new Guacamole.WebSocketTunnel(wsUrl);

            // Add detailed tunnel logging
            tunnel.onerror = (status: Guacamole.Status) => {
                console.error('[GuacamoleCanvas] Tunnel error:', status.code, status.message);
            };

            tunnel.onstatechange = (state: number) => {
                const states = ['CONNECTING', 'OPEN', 'CLOSED'];
                console.log(`[GuacamoleCanvas] Tunnel state: ${state} (${states[state] || 'UNKNOWN'})`);
            };

            // Create Guacamole client
            const client = new Guacamole.Client(tunnel);
            clientRef.current = client;

            // Get display and attach to DOM
            const display = client.getDisplay();
            const displayElement = display.getElement();

            // Clear previous content
            displayRef.current.innerHTML = '';
            displayRef.current.appendChild(displayElement);

            // Style the display element
            displayElement.style.margin = 'auto';

            // Build connection parameters for RDP
            const connectionParams = {
                protocol: 'rdp',
                hostname: host,
                port: port.toString(),
                username,
                password,
                'ignore-cert': 'true',
                'enable-drive': 'true',
                'create-drive-path': 'true',
                'security': 'any',
                'enable-wallpaper': 'false',
                'enable-theming': 'false',
                'enable-font-smoothing': 'false',
                'enable-full-window-drag': 'false',
                'enable-desktop-composition': 'false',
                'enable-menu-animations': 'false',
                width: width.toString(),
                height: height.toString(),
                dpi: '96',
                'color-depth': '16', // Lower color depth for better performance
            };

            console.log('[GuacamoleCanvas] Connection params:', connectionParams);

            // Build connection string
            const paramString = Object.entries(connectionParams)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');

            setStatus('connecting');

            // Connect
            client.connect(paramString);

            // State change handler
            client.onstatechange = (state: number) => {
                if (!isActive) return;

                console.log('[GuacamoleCanvas] State changed:', state);

                switch (state) {
                    case Guacamole.Client.IDLE:
                        setStatus('idle');
                        break;
                    case Guacamole.Client.CONNECTING:
                        setStatus('connecting');
                        break;
                    case Guacamole.Client.WAITING:
                        setStatus('waiting');
                        break;
                    case Guacamole.Client.CONNECTED:
                        setStatus('connected');
                        console.log('[GuacamoleCanvas] ✅ Connected successfully!');

                        // Send client size
                        client.sendSize(width, height);
                        break;
                    case Guacamole.Client.DISCONNECTING:
                        setStatus('disconnecting');
                        break;
                    case Guacamole.Client.DISCONNECTED:
                        setStatus('disconnected');
                        console.log('[GuacamoleCanvas] Disconnected');
                        if (onDisconnect) onDisconnect();
                        break;
                }
            };

            // Error handler
            client.onerror = (guacError: Guacamole.Status) => {
                if (!isActive) return;

                const errorMsg = `Connection error: ${guacError.message || 'Unknown error'} (Code: ${guacError.code})`;
                console.error('[GuacamoleCanvas]', errorMsg, guacError);
                setError(errorMsg);
                setStatus('error');
            };

            // Setup mouse input
            const mouse = new Guacamole.Mouse(displayElement);
            mouseRef.current = mouse;

            mouse.onmousedown =
                mouse.onmouseup =
                mouse.onmousemove = (mouseState: Guacamole.Mouse.State) => {
                    if (client && status === 'connected') {
                        client.sendMouseState(mouseState);
                    }
                };

            // Setup keyboard input
            const keyboard = new Guacamole.Keyboard(document);
            keyboardRef.current = keyboard;

            keyboard.onkeydown = (keysym: number) => {
                if (client && status === 'connected') {
                    client.sendKeyEvent(1, keysym);
                }
                return false;
            };

            keyboard.onkeyup = (keysym: number) => {
                if (client && status === 'connected') {
                    client.sendKeyEvent(0, keysym);
                }
            };

            console.log('[GuacamoleCanvas] Input handlers attached');

        } catch (err: any) {
            console.error('[GuacamoleCanvas] Setup error:', err);
            setError(`Setup failed: ${err.message}`);
            setStatus('error');
        }

        // Cleanup function
        return () => {
            console.log('[GuacamoleCanvas] Cleaning up...');
            isActive = false;

            if (keyboardRef.current?.dispose) {
                keyboardRef.current.dispose();
            }

            if (mouseRef.current?.dispose) {
                mouseRef.current.dispose();
            }

            if (clientRef.current) {
                try {
                    clientRef.current.disconnect();
                } catch (err) {
                    console.error('[GuacamoleCanvas] Error during disconnect:', err);
                }
            }
        };
    }, [host, port, username, password, width, height, status, onDisconnect]);

    // Render error state
    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-black text-red-500">
                <div className="text-center p-6 max-w-md">
                    <div className="text-6xl mb-4">❌</div>
                    <p className="text-lg font-bold mb-2">Connection Error</p>
                    <p className="text-sm font-mono bg-red-950/50 p-3 rounded border border-red-800">
                        {error}
                    </p>
                    <div className="mt-4 text-xs text-red-400">
                        <p>Troubleshooting:</p>
                        <ul className="text-left mt-2 space-y-1">
                            <li>• Check if Guacamole server is running</li>
                            <li>• Verify RDP server is accessible at {host}:{port}</li>
                            <li>• Confirm credentials are correct</li>
                            <li>• Check Windows Firewall settings</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // Get status color
    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'text-green-400';
            case 'connecting': return 'text-yellow-400';
            case 'error': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    // Get status icon
    const getStatusIcon = () => {
        switch (status) {
            case 'connected': return '✅';
            case 'connecting': return '⏳';
            case 'error': return '❌';
            default: return '⚪';
        }
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {/* Guacamole Display Container */}
            <div
                ref={displayRef}
                className="w-full h-full flex items-center justify-center"
                style={{ cursor: status === 'connected' ? 'none' : 'default' }}
            />

            {/* Status Overlay */}
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-xs font-mono border border-white/10 shadow-lg">
                <div className="flex items-center gap-2">
                    <span>{getStatusIcon()}</span>
                    <span className={getStatusColor()}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                    {host}:{port}
                </div>
            </div>

            {/* Loading overlay */}
            {(status === 'connecting' || status === 'waiting' || status === 'initializing') && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="text-6xl mb-4 animate-pulse">🔌</div>
                        <p className="text-white text-lg font-medium mb-2">
                            {status === 'initializing' && 'Initializing...'}
                            {status === 'connecting' && 'Connecting to RDP server...'}
                            {status === 'waiting' && 'Waiting for response...'}
                        </p>
                        <p className="text-gray-400 text-sm font-mono">
                            {host}:{port}
                        </p>
                        <div className="mt-4">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Real RDP Indicator */}
            {status === 'connected' && (
                <div className="absolute bottom-3 left-3 bg-green-900/70 text-green-300 px-3 py-1.5 rounded text-xs border border-green-600 font-medium shadow-lg">
                    🖥️ Live RDP Session
                </div>
            )}
        </div>
    );
}
