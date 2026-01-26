import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Window } from '@tauri-apps/api/window';

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

                // Get the position of the container relative to the screen
                // We need to pass precise screen coordinates to Rust so it places the RDP window correctly
                const rect = containerRef.current!.getBoundingClientRect();

                // Ensure we have valid dimensions before launching to prevent MSTSC error
                if (rect.width < 100 || rect.height < 100) {
                    console.log('Container too small, retrying in 500ms...');
                    setTimeout(launchRdp, 500);
                    return;
                }

                // Get current window position to offset (client coords -> screen coords)
                // Note: This needs proper coordination with window movement.
                // For MVP, we pass client rect and let backend figure out screen position, 
                // OR we assume maximized/fixed window for first test.

                // Tauri v2 API for window position
                // However, getting screen coordinates of an element is tricky in web.
                // We'll calculate it based on window position if possible, or start with static.

                // Simplified MVP: Just pass 0,0 relative logic or specific offset
                // Rust backend will use clientToScreen if we pass client coordinates? 
                // No, SetWindowPos uses screen coordinates.

                // Correct approach:
                // We will center it for now, or just try to launch it.
                // Sending window inner coordinates (client area)

                console.log('Launching Native RDP...', { host, username });

                // Invoke Rust command
                await invoke('start_embedded_rdp_command', {
                    host,
                    username,
                    password,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    x: Math.round(rect.left), // This is relative to viewport, needs correction in Rust
                    y: Math.round(rect.top)
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

        // Small delay to ensure layout is stable
        setTimeout(launchRdp, 500);

        return () => {
            isMounted = false;
            // TODO: Ideally we should kill the RDP process on unmount
            // invoke('stop_embedded_rdp') 
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
                <div className="text-gray-500 flex flex-col items-center p-8 bg-gray-900/80 rounded-lg border border-gray-700">
                    <div className="text-4xl mb-4">🖥️</div>
                    <p className="font-bold text-white mb-2">RDP Session Active</p>
                    <p className="text-sm max-w-md text-center">
                        The remote desktop is running in a native window embedded here.
                        If you resize this app, the RDP window might need a moment to adjust.
                    </p>
                    <p className="text-xs mt-4 text-green-400">Mode: Embedded MSTSC (WinAPI)</p>
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
