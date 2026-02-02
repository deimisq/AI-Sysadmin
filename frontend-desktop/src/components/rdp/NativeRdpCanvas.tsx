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

    const hasLaunched = useRef(false);

    // DEBUG: Log component mount
    console.log('[NativeRdpCanvas] Component rendered/mounted', { host, username });

    useEffect(() => {
        console.log('[NativeRdpCanvas] useEffect triggered', {
            hasContainer: !!containerRef.current,
            hasLaunched: hasLaunched.current,
            host,
            username
        });

        if (!containerRef.current || hasLaunched.current) return;

        // Mark as launched immediately to prevent duplicates
        hasLaunched.current = true;
        let isMounted = true;

        const launchRdp = async () => {
            try {
                if (!isMounted) return;

                console.log('[RDP] Starting launch sequence...');
                setStatus('launching');

                const rect = containerRef.current!.getBoundingClientRect();
                console.log('[RDP] Container rect:', rect);

                // Ensure valid dimensions
                if (rect.width < 100 || rect.height < 100) {
                    console.warn('[RDP] Container too small, retrying in 500ms...', { w: rect.width, h: rect.height });
                    setTimeout(launchRdp, 500);
                    return;
                }

                // Calculate Absolute Screen Coordinates
                console.log('[RDP] Getting window position...');
                const windowPos = await getCurrentWindow().innerPosition();
                console.log('[RDP] Window position:', windowPos);

                // 2. Add element offset
                const screenX = windowPos.x + Math.round(rect.left);
                const screenY = windowPos.y + Math.round(rect.top);

                const params = {
                    host,
                    username,
                    password,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    x: screenX,
                    y: screenY
                };

                console.log('[RDP] Invoking Tauri command with params:', params);

                // Invoke Rust command with ABSOLUTE coordinates
                const result = await invoke('start_embedded_rdp_command', params);

                console.log('[RDP] Command returned:', result);

                if (isMounted) setStatus('active');

            } catch (err: any) {
                console.error("[RDP] FATAL ERROR:", err);
                console.error("[RDP] Error stack:", err.stack);
                console.error("[RDP] Error details:", JSON.stringify(err, null, 2));

                if (isMounted) {
                    setErrorMsg(`RDP Launch Failed: ${err.toString()}`);
                    setStatus('error');
                }
            }
        };

        // CRITICAL FIX: Don't use setTimeout - cleanup cancels it
        // Use Promise microtask instead
        Promise.resolve().then(() => {
            if (isMounted && containerRef.current) {
                console.log('[RDP] Executing launchRdp via microtask');
                launchRdp();
            }
        });

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
