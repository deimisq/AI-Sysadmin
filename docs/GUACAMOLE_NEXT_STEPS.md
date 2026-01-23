# Guacamole Integration - Next Steps

## ✅ Completed (Phase 1 - Backend)

- [x] Created `guacamole_manager.rs` for managing guacd/guacamole-lite
- [x] Integrated detection for both native guacd and Node.js guacamole-lite
- [x] Created `guacamole-lite-server.js` script for Windows
- [x] Auto-detection prioritizes guacamole-lite on Windows (easier install)
- [x] Tauri commands: `guacamole_start`, `guacam ole_stop`, `guacamole_get_url`

## 📋 Current Status

The backend is ready to start either:

- **guacd** (native C daemon) on Linux/macOS
- **guacamole-lite** (Node.js version) on Windows

## 🚀 Next Steps (Phase 2 - Frontend Integration)

### Day 2: Frontend Guacamole Client

#### Step 1: Install guacamole-common-js

```bash
cd frontend-desktop
npm install guacamole-common-js
npm install --save-dev @types/guacamole-common-js
```

#### Step 2: Create GuacamoleCanvas Component

Create `frontend-desktop/src/components/rdp/GuacamoleCanvas.tsx`:

```typescript
import { useRef, useEffect, useState } from 'react';
import Guacamole from 'guacamole-common-js';

interface GuacamoleCanvasProps {
    host: string;
    port: number;
    username: string;
    password: string;
    width?: number;
    height?: number;
}

export function GuacamoleCanvas({ 
    host, 
    port, 
    username, 
    password,
    width = 1920, 
    height = 1080 
}: GuacamoleCanvasProps) {
    const displayRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<string>('connecting');
    const [error, setError] = useState<string | null>(null);
    const clientRef = useRef<Guacamole.Client | null>(null);

    useEffect(() => {
        if (!displayRef.current) return;

        // Create WebSocket tunnel to guacd
        const tunnel = new Guacamole.WebSocketTunnel('ws://127.0.0.1:4822');
        
        // Create Guacamole client
        const client = new Guacamole.Client(tunnel);
        clientRef.current = client;

        // Attach display to DOM
        const display = client.getDisplay();
        displayRef.current.appendChild(display.getElement());

        // Connect with RDP parameters
        client.connect(`token=${encodeURIComponent(JSON.stringify({
            connection: {
                type: 'rdp',
                settings: {
                    hostname: host,
                    port: port.toString(),
                    username,
                    password,
                    'ignore-cert': 'true',
                    'enable-drive': 'true',
                    'create-drive-path': 'true',
                    'security': 'any',
                    'enable-wallpaper': 'false',
                    width: width.toString(),
                    height: height.toString(),
                }
            }
        }))}`);

        // Event handlers
        client.onstatechange = (state: number) => {
            switch (state) {
                case Guacamole.Client.CONNECTING:
                    setStatus('Connecting...');
                    break;
                case Guacamole.Client.CONNECTED:
                    setStatus('Connected');
                    break;
                case Guacamole.Client.DISCONNECTING:
                    setStatus('Disconnecting...');
                    break;
                case Guacamole.Client.DISCONNECTED:
                    setStatus('Disconnected');
                    break;
            }
        };

        client.onerror = (error: Guacamole.Status) => {
            setError(`Connection error: ${error.message}`);
            console.error('Guacamole error:', error);
        };

        // Handle mouse and keyboard
        const mouse = new Guacamole.Mouse(display.getElement());
        const keyboard = new Guacamole.Keyboard(document);

        mouse.onmousedown = mouse.onmouseup = mouse.on mousemove = (mouseState: Guacamole.Mouse.State) => {
            client.sendMouseState(mouseState);
        };

        keyboard.onkeydown = (keysym: number) => {
            client.sendKeyEvent(1, keysym);
        };

        keyboard.onkeyup = (keysym: number) => {
            client.sendKeyEvent(0, keysym);
        };

        // Cleanup
        return () => {
            client.disconnect();
            mouse.dispose?.();
            keyboard.dispose?.();
        };
    }, [host, port, username, password, width, height]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-black text-red-500">
                <div className="text-center p-4">
                    <p className="text-lg font-bold mb-2">Connection Error</p>
                    <p className="text-sm font-mono">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black">
            {/* Guacamole Display Container */}
            <div ref={displayRef} className="w-full h-full" />

            {/* Status Overlay */}
            <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-2 rounded text-xs">
                Status: <span className={status === 'Connected' ? 'text-green-400' : 'text-yellow-400'}>
                    {status}
                </span>
            </div>
        </div>
    );
}
```

#### Step 3: Update RDPComponent to Use GuacamoleCanvas

Replace the current `RDPCanvas` with `GuacamoleCanvas` in `RDPComponent.tsx`:

```typescript
import { GuacamoleCanvas } from './GuacamoleCanvas';

// In the return statement, replace RDPCanvas with:
<GuacamoleCanvas
    host={server.ip}
    port={3389}
    username={username}
    password={password}
    width={1920}
    height={1080}
/>
```

#### Step 4: Start Guacamole Server Automatically

Add this to `RDPComponent.tsx` to auto-start guacamole:

```typescript
useEffect(() => {
    // Start guacamole server when component mounts
    invoke('guacamole_start')
        .then(() => console.log('Guacamole server started'))
        .catch(err => console.error('Failed to start Guacamole:', err));

    return () => {
        //  Optional: stop on unmount
        // invoke('guacamole_stop');
    };
}, []);
```

## 🎯 Expected Result After Day 2

- Embedded RDP working with real desktop rendering
- Full mouse and keyboard input
- No more mock frames
- Connection to actual Windows RDP servers

## 📅 Remaining Timeline

- **Day 3**: Advanced features (clipboard, audio, file transfer)
- **Day 4**: Testing, optimization, polish

## ⚠️ Important Notes

1. Make sure `guacamole-lite` is installed: `npm install guacamole-lite`
2. The `guacamole-lite-server.js` script will be auto-detected and started
3. WebSocket connection is on `ws://127.0.0.1:4822` by default
4. For clipboard/audio, we'll add those in Day 3

## 🐛 Common Issues

- **"Cannot connect to WebSocket"**: Make sure guacamole server is running
- **"Authentication failed"**: Check RDP credentials
- **"Connection refused"**: RDP server might not be accessible
- **Black screen**: Check RDP port (3389) and firewall rules
