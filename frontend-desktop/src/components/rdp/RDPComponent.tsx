import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../ui/button';
import type { Server } from '../../lib/api';
import { fetchServerCredentials } from '../../lib/api';
import { RDPCanvas } from './RDPCanvas';

interface RDPComponentProps {
    serverData: Server;
    onDisconnect: () => void;
    onSwitchToSSH?: () => void; // Optional callback to switch to SSH terminal mode
}

export function RDPComponent({ serverData, onDisconnect, onSwitchToSSH }: RDPComponentProps) {
    const [connecting, setConnecting] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nativeRdpLaunched, setNativeRdpLaunched] = useState(false);

    const connect = async () => {
        setConnecting(true);
        setError(null);
        try {
            const creds = await fetchServerCredentials(serverData.id);

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

    const launchNativeRDP = async () => {
        try {
            const creds = await fetchServerCredentials(serverData.id);

            // Launch native RDP client via Tauri shell command
            await invoke('launch_native_rdp', {
                host: creds.ip_address,
                username: creds.ssh_username || 'Administrator',
                password: creds.ssh_password || '',
            });

            setNativeRdpLaunched(true);
        } catch (err: any) {
            console.error("Failed to launch native RDP:", err);
            setError(`Error al abrir cliente RDP: ${err.toString()}`);
        }
    };

    useEffect(() => {
        connect();
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
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a] relative overflow-hidden">
            {/* RDP Toolbar */}
            <div className="bg-gradient-to-r from-[#0078d7] to-[#005a9e] px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg z-10">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.9)] animate-pulse"></div>
                    <span className="font-semibold">{serverData.hostname}</span>
                    <span className="text-xs opacity-60 font-mono bg-black/20 px-2 py-0.5 rounded">{serverData.ip_address}</span>
                </div>

                <div className="flex gap-2 items-center">
                    <button onClick={onDisconnect} className="bg-red-600/90 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-medium shadow-sm transition-all hover:shadow-md">
                        Desconectar
                    </button>
                </div>
            </div>

            {/* Main Content Area - Canvas */}
            <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
                {/* Canvas renders here */}
                <RDPCanvas sessionId={sessionId} width={1920} height={1080} />

                {/* Floating Control Bar */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-[#1e1e2e]/95 backdrop-blur-sm border border-[#2a2a3e] rounded-xl px-4 py-3 shadow-2xl">
                        <div className="flex gap-3 items-center">
                            {/* Native RDP Button */}
                            <button
                                onClick={launchNativeRDP}
                                disabled={nativeRdpLaunched}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium shadow-md"
                                title="Abre el cliente RDP nativo del sistema"
                            >
                                <span className="text-lg">🖥️</span>
                                <span>{nativeRdpLaunched ? '✓ RDP Nativo Abierto' : 'Cliente Nativo'}</span>
                            </button>

                            <div className="w-px h-8 bg-gray-700"></div>

                            {/* SSH Terminal Button */}
                            <button
                                onClick={onSwitchToSSH}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600 text-green-400 rounded-lg transition-colors text-sm font-medium"
                                title="Cambiar a terminal SSH/PowerShell"
                            >
                                <span className="text-lg">⚡</span>
                                <span>PowerShell/SSH</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

