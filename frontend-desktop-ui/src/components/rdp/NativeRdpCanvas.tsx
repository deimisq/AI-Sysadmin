import { uiText, uiFormat } from '../../lib/ui-language';
import { useEffect, useRef, useState } from 'react';
import { sendCommand, isWebView2 } from '../../lib/bridge';

interface NativeRdpCanvasProps {
    host: string;
    username: string;
    password: string;
    port?: number;
    active?: boolean;
    temporaryServerId?: number;
    onDisconnect?: () => void;
}

export function NativeRdpCanvas({ host, username, password, port = 3389, active = true, temporaryServerId }: NativeRdpCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sessionRef = useRef<string | null>(null);
    const activeRef = useRef(active);
    activeRef.current = active;
    const [status, setStatus] = useState<'launching' | 'active' | 'error'>('launching');
    const [error, setError] = useState('');
    const [started, setStarted] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (!isWebView2()) return;
        const bridge = (window as any).chrome.webview;
        const handler = (event: MessageEvent) => {
            const message = event.data;
            if (message.type !== 'RDP_STATUS' || message.sessionId !== sessionRef.current) return;
            if (message.state === 'ready') setStatus('active');
            if (message.state === 'error' || message.state === 'disconnected') {
                setStatus('error');
                setError(uiFormat("RDP: {0}, código {1}. Comprueba usuario, red y permisos de escritorio remoto.", message.state, message.code));
            }
        };
        bridge.addEventListener('message', handler);
        return () => bridge.removeEventListener('message', handler);
    }, []);

    useEffect(() => {
        const sessionId = crypto.randomUUID();
        sessionRef.current = sessionId;
        let disposed = false;
        let requested = false;
        let timer: ReturnType<typeof setTimeout>;
        setStatus('launching'); setError(''); setStarted(false);
        const launch = async () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (disposed) return;
            if (!activeRef.current || !rect || rect.width < 50 || rect.height < 50) {
                timer = setTimeout(launch, 200); return;
            }
            try {
                const scale = window.devicePixelRatio || 1;
                let x = Math.round(rect.x * scale), y = Math.round(rect.y * scale);
                if (!isWebView2()) {
                    const { getCurrentWindow } = await import('@tauri-apps/api/window');
                    const position = await getCurrentWindow().innerPosition();
                    x += position.x; y += position.y;
                }
                if (disposed) return;
                requested = true;
                await sendCommand('start_embedded_rdp_command', {
                    ...(temporaryServerId !== undefined ? { temporaryServerId } : {}),
                    sessionId, host, username, password, port, visible: activeRef.current,
                    x, y,
                    width: Math.round(rect.width * scale), height: Math.round(rect.height * scale),
                });
                if (disposed) {
                    await sendCommand('stop_embedded_rdp_command', { sessionId });
                    return;
                }
                setStarted(true);
                if (temporaryServerId !== undefined) window.dispatchEvent(new CustomEvent('local-temporary-target-changed', { detail: { serverId: temporaryServerId } }));
                if (!isWebView2()) setStatus('active');
            } catch (error) {
                if (!disposed) { setStatus('error'); setError(String(error)); }
            }
        };
        timer = setTimeout(launch, 0);
        return () => {
            disposed = true;
            clearTimeout(timer);
            if (sessionRef.current === sessionId) sessionRef.current = null;
            if (requested) void sendCommand('stop_embedded_rdp_command', { sessionId }).catch(console.error);
            if (temporaryServerId !== undefined) window.dispatchEvent(new CustomEvent('local-temporary-target-changed', { detail: { serverId: temporaryServerId } }));
        };
    }, [host, username, password, port, retry, temporaryServerId]);

    useEffect(() => {
        if (!started || !sessionRef.current || !containerRef.current) return;
        const sessionId = sessionRef.current;
        let disposed = false;
        let frame = 0;
        const update = () => {
            if (disposed) return;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const scale = window.devicePixelRatio || 1;
            void sendCommand('update_native_rdp_bounds', {
                sessionId, visible: activeRef.current,
                x: Math.round(rect.x * scale), y: Math.round(rect.y * scale),
                width: Math.round(rect.width * scale), height: Math.round(rect.height * scale),
            }).catch(console.error);
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
        const observer = new ResizeObserver(schedule);
        observer.observe(containerRef.current);
        window.addEventListener('resize', schedule);
        update(); schedule();
        return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule); };
    }, [started, active]);

    return <div ref={containerRef} className="w-full h-full bg-black relative overflow-hidden flex items-center justify-center">
        {status === 'launching' && <div className="text-gray-300 text-sm">{uiText("Conectando al escritorio remoto...")}</div>}
        {status === 'error' && <div role="alert" className="text-red-300 p-4 max-w-lg text-sm space-y-3">
            <p>{uiText("No se pudo establecer la sesión RDP")}</p><p className="text-xs break-words">{error}</p>
            <button onClick={() => setRetry(value => value + 1)} className="px-3 py-1 border border-gray-600 rounded text-gray-200">{uiText("Reconectar esta sesión")}</button>
        </div>}
    </div>;
}
export default NativeRdpCanvas;
