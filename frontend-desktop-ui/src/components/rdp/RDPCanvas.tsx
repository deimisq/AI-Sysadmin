import { useRef, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface RdpFrame {
    width: number;
    height: number;
    format: string;
    data: number[];
    timestamp: number;
}

interface RDPCanvasProps {
    sessionId: string;
    width?: number;
    height?: number;
}

export function RDPCanvas({ sessionId, width = 1920, height = 1080 }: RDPCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [fps, setFps] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [frameCount, setFrameCount] = useState(0);
    const animationFrameRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        let isActive = true;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError('Failed to get canvas 2D context');
            return;
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        let frameCounter = 0;
        let lastFpsUpdate = Date.now();

        const renderLoop = async () => {
            if (!isActive) return;

            try {
                // Get frame from backend
                const frame = await invoke<RdpFrame | null>('rdp_get_frame', {
                    sessionId
                });

                if (frame && ctx) {
                    // Create ImageData from frame
                    const imageData = ctx.createImageData(frame.width, frame.height);

                    // Copy frame data to ImageData
                    // Frame data is RGBA array
                    const uint8Data = new Uint8Array(frame.data);
                    imageData.data.set(uint8Data);

                    // Draw to canvas
                    ctx.putImageData(imageData, 0, 0);

                    // Update frame stats
                    frameCounter++;
                    setFrameCount(prev => prev + 1);

                    // Calculate FPS every second
                    const now = Date.now();
                    if (now - lastFpsUpdate >= 1000) {
                        setFps(frameCounter);
                        frameCounter = 0;
                        lastFpsUpdate = now;
                    }
                }
            } catch (err: any) {
                console.error('Error getting RDP frame:', err);
                setError(err.toString());
            }

            // Request next frame (targeting ~30 FPS)
            animationFrameRef.current = window.setTimeout(renderLoop, 1000 / 30);
        };

        // Start render loop
        renderLoop();

        // Cleanup
        return () => {
            isActive = false;
            if (animationFrameRef.current) {
                clearTimeout(animationFrameRef.current);
            }
        };
    }, [sessionId, width, height]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-black text-red-500">
                <div className="text-center p-4">
                    <p className="text-lg font-bold mb-2">Canvas Error</p>
                    <p className="text-sm font-mono">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain"
                style={{
                    imageRendering: 'pixelated', // Prevent blurring on scaling
                }}
            />

            {/* Stats Overlay */}
            <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-2 rounded text-xs font-mono space-y-1">
                <div>FPS: <span className="text-green-400">{fps}</span></div>
                <div>Frames: <span className="text-blue-400">{frameCount}</span></div>
                <div className="text-[10px] text-gray-500">Session: {sessionId.slice(0, 8)}...</div>
            </div>

            {/* Mock Indicator */}
            <div className="absolute bottom-2 left-2 bg-yellow-900/70 text-yellow-300 px-2 py-1 rounded text-xs border border-yellow-600">
                🧪 Mock Frames (Testing Mode)
            </div>
        </div>
    );
}
