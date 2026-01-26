import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface NativeRdpCanvasProps {
    host: string;
    username: string;
    password: string;
    width?: number;
    height?: number;
    onDisconnect?: () => void;
}

export function NativeRdpCanvas({
    host,
    username,
    password,
    width = 1200,
    height = 800,
    onDisconnect
}: NativeRdpCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'init' | 'launching' | 'active' | 'error'>('init');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let isMounted = true;

        const launchRdp = async () => {
            try {
                setStatus('launching');

                const rect = containerRef.current!.getBoundingClientRect();

                // Ensure valid dimensions
                if (rect.width < 100 || rect.height < 100) {
                    console.log('Container too small, retrying in 500ms...');
                    setTimeout(launchRdp, 500);
                    return;
                }

                // Calculate Absolute Screen Coordinates
                // 1. Get window position on screen
                const windowPos = await getCurrentWindow().innerPosition();

                // 2. Add element offset
                const screenX = windowPos.x + Math.round(rect.left);
                const screenY = windowPos.y + Math.round(rect.top);

                console.log('Launching Native RDP at Screen Coords:', { screenX, screenY, w: rect.width, h: rect.height });

                // Invoke Rust command with ABSOLUTE coordinates
                await invoke('start_embedded_rdp_command', {
                    host,
                    username,
                    password,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    x: screenX,
                    y: screenY
                });

                if (isMounted) setStatus('active');

            } catch (err: any) {
                console.error("Failed to launch native RDP:", err);
                if (isMounted) {
                    setErrorMsg(err.toString());
                    setStatus('error');
                }
            }
        };

        // Small delay to ensure layout
        setTimeout(launchRdp, 500);

        return () => {
            isMounted = false;
        };
    }, [host, username, password]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden"
        >
            {status === 'launching' && (
                <div className="text-white flex flex-col items-center">
                    <div className="animate-spin text-4xl mb-4">⚙️</div>
                    <p>Launching Native Windows RDP...</p>
                </div>
            )}

            {status === 'active' && (
                <div className="text-gray-500 flex flex-col items-center p-8 bg-gray-900/80 rounded-lg border border-gray-700 pointer-events-none">
                    <div className="text-4xl mb-4">🖥️</div>
                    <p className="font-bold text-white mb-2">RDP Session Active</p>
                    <p className="text-sm max-w-md text-center">
                        The native RDP window is floating above this area.
                        Mode: Overlay (WS_POPUP)
                    </p>
                </div>
            )}

            {status === 'error' && (
                <div className="text-red-400 p-4 border border-red-500 rounded bg-red-900/20">
                    <p className="font-bold">Failed to launch RDP</p>
                    <pre className="text-xs mt-2">{errorMsg}</pre>
                </div>
            )}
        </div>
    );
}
