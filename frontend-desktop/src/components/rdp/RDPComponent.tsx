import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../ui/button';
import type { Server } from '../../lib/api';
import { fetchServerCredentials } from '../../lib/api';

interface RDPComponentProps {
    serverData: Server;
    onDisconnect: () => void;
}

export function RDPComponent({ serverData, onDisconnect }: RDPComponentProps) {
    const [connecting, setConnecting] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const connect = async () => {
        setConnecting(true);
        setError(null);
        try {
            // Fetch credentials specifically for this server
            const creds = await fetchServerCredentials(serverData.id);

            // Call backend RDP connection
            // Note: We map ssh_username to RDP username as they share the credentials model generally
            const sid = await invoke<string>('rdp_connect', {
                host: creds.ip_address,
                username: creds.ssh_username || 'Administrator',
                password: creds.ssh_password || ''
            });

            setSessionId(sid);
        } catch (err: any) {
            console.error("RDP Connect Error:", err);
            setError(err.toString());
        } finally {
            setConnecting(false);
        }
    };

    useEffect(() => {
        connect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                <h3 className="text-xl text-red-500 mb-4 font-bold">Error de Conexión RDP</h3>
                <div className="bg-red-900/30 border border-red-800 p-4 rounded mb-6 max-w-lg overflow-auto">
                    <p className="font-mono text-sm">{error}</p>
                </div>
                <div className="flex gap-4">
                    <Button onClick={connect} variant="default" className="bg-blue-600 hover:bg-blue-700">Reintentar</Button>
                    <Button variant="outline" onClick={onDisconnect} className="bg-transparent border-gray-600 hover:bg-gray-800 text-gray-300">Volver</Button>
                </div>
            </div>
        );
    }

    if (connecting || !sessionId) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-white">
                <div className="animate-pulse text-6xl mb-6">🪟</div>
                <h2 className="text-xl font-semibold mb-2">Iniciando Escritorio Remoto</h2>
                <p className="text-gray-400">Conectando a {serverData.hostname} ({serverData.ip_address})...</p>
                <div className="mt-8 text-xs text-gray-600 font-mono">Protocolo: IronRDP</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-black relative overflow-hidden">
            {/* RDP Toolbar */}
            <div className="bg-[#0078d7] px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-md z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                    <span className="font-semibold text-sm">{serverData.hostname}</span>
                    <span className="text-xs opacity-70 ml-2 font-mono">{serverData.ip_address}</span>
                </div>

                <div className="flex gap-2">
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors">
                        Ctrl+Alt+Del
                    </button>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                    <button onClick={onDisconnect} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-sm transition-colors">
                        Desconectar
                    </button>
                </div>
            </div>

            {/* RDP Canvas Area (Placeholder for Phase 3 Phase B) */}
            <div className="flex-1 flex items-center justify-center bg-[#101010] text-gray-500 relative">
                {/* This area will contain the <canvas> element rendering the bitmap stream */}
                <div className="text-center p-8 border border-gray-800 rounded-lg bg-[#1a1a1a]">
                    <div className="text-4xl mb-4 opacity-50">🖥️</div>
                    <h3 className="text-lg text-gray-300 font-medium mb-1">Sesión RDP Establecida</h3>
                    <p className="text-sm text-gray-500 mb-4">Session ID: <span className="font-mono text-xs">{sessionId}</span></p>

                    <div className="bg-blue-900/20 border border-blue-900/50 p-3 rounded text-left max-w-sm mx-auto">
                        <p className="text-xs text-blue-300">
                            <strong>Estado:</strong> Conectado al backend (Rust).<br />
                            <strong>Renderizado:</strong> Pendiente de implementación (Canvas).<br />
                            <strong>Input:</strong> Pendiente de implementación.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
