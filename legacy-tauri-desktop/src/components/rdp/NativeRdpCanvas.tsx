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
    const [processId, setProcessId] = useState<number | null>(null);

    const hasLaunched = useRef(false);

    // DEBUG: Log component mount
    console.log('[NativeRdpCanvas] Component rendered/mounted', { host, username });

    // --- LAUNCH LOGIC ---
    useEffect(() => {
        console.log('[NativeRdpCanvas] useEffect triggered', {
            hasContainer: !!containerRef.current,
            hasLaunched: hasLaunched.current,
            host,
            username
        });

        // CRITICAL: Check and set hasLaunched BEFORE any async operations
        if (hasLaunched.current) {
            console.log('[NativeRdpCanvas] Skipping - already launched');
            return;
        }

        if (!containerRef.current) {
            console.log('[NativeRdpCanvas] Skipping - no container');
            return;
        }

        // Mark as launched IMMEDIATELY
        hasLaunched.current = true;

        let isMounted = true;

        const launchRdp = async () => {
            try {
                if (!isMounted) return;
                setStatus('launching');

                const rect = containerRef.current!.getBoundingClientRect();

                const scale = window.devicePixelRatio || 1;

                // Ensure valid dimensions
                if (rect.width < 50 || rect.height < 50) {
                    console.warn('[RDP] Container too small, retrying...');
                    setTimeout(launchRdp, 200);
                    return;
                }

                const windowPos = await getCurrentWindow().innerPosition();

                // Absolute Screen Coordinates calculation (Physical Pixels)
                // rect.left/top are Logical (CSS) pixels. transform to Physical.
                // windowPos is already Physical (Tauri default).

                const physX = windowPos.x + Math.round(rect.left * scale);
                const physY = windowPos.y + Math.round(rect.top * scale);
                const physW = Math.round(rect.width * scale);
                const physH = Math.round(rect.height * scale);

                const params = {
                    host,
                    username,
                    password,
                    width: physW,
                    height: physH,
                    x: physX,
                    y: physY
                };

                // Invoke Rust command
                const result = await invoke('start_embedded_rdp_command', params) as [string, number];
                // Rust returns [message, pid] tuple

                console.log('[RDP] Command returned:', result);

                if (isMounted) {
                    const pid = result[1];
                    setProcessId(pid);
                    setStatus('active');
                }

            } catch (err: any) {
                console.error("[RDP] FATAL ERROR:", err);
                if (isMounted) {
                    setErrorMsg(`Launch Failed: ${err.toString()}`);
                    setStatus('error');
                }
            }
        };

        launchRdp();

        return () => {
            isMounted = false;
            // Note: We rely on the Rust "Suicide Pact" (parent_pid monitor) to kill the process on app exit.
            // Explicit kill here is tricky because React StrictMode triggers unmount/remount
        };
    }, [host, username, password]); // Removed processId dependency to avoid re-triggering

    // --- RESIZE OBSERVER LOGIC ---
    useEffect(() => {
        if (!processId || !containerRef.current) return;

        const updateBounds = () => {
            if (containerRef.current) {
                const scale = window.devicePixelRatio || 1;
                const rect = containerRef.current.getBoundingClientRect();
                // rust needs integer coords in Physical Pixels
                invoke('update_native_rdp_bounds', {
                    x: Math.round(rect.x * scale),
                    y: Math.round(rect.y * scale),
                    width: Math.round(rect.width * scale),
                    height: Math.round(rect.height * scale)
                }).catch(e => console.error("Failed to update RDP bounds:", e));
            }
        };

        const observer = new ResizeObserver(() => {
            updateBounds();
            // Debounce / delay updates to catch animations
            setTimeout(updateBounds, 100);
            setTimeout(updateBounds, 300);
        });

        observer.observe(containerRef.current);
        window.addEventListener('resize', updateBounds);

        // Initial update
        updateBounds();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateBounds);
        };
    }, [processId]); // Only activate watcher when Process ID is known

    return (
        <div
            ref={containerRef}
            id="rdp-native-container"
            className="w-full h-full bg-black relative overflow-hidden flex items-center justify-center"
            style={{ minHeight: '400px' }}
        >
            {status === 'launching' && (
                <div className="text-white flex flex-col items-center z-10">
                    <div className="animate-spin text-4xl mb-4">⚙️</div>
                    <p>Launching Native Sidecar...</p>
                </div>
            )}

            {status === 'active' && (
                <div className="absolute top-2 right-2 text-xs text-gray-500 opacity-50 pointer-events-none z-10 hover:opacity-100 transition-opacity">
                    Native RDP Active (PID: {processId})
                </div>
            )}

            {status === 'error' && (
                <div className="text-red-400 p-4 border border-red-500 rounded bg-red-900/20 z-10">
                    <p className="font-bold">Failed to launch RDP</p>
                    <pre className="text-xs mt-2">{errorMsg}</pre>
                </div>
            )}
        </div>
    );
}

export default NativeRdpCanvas;
