import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../ui/button';
import type { Server } from '../../lib/api';
import { fetchServerCredentials } from '../../lib/api';

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

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] text-gray-400 relative p-8">
                <div className="text-center max-w-xl">
                    {/* Status Icon */}
                    <div className="text-6xl mb-6 opacity-80">🖥️</div>

                    <h3 className="text-2xl text-white font-semibold mb-2">Servidor Windows Conectado</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Session ID: <span className="font-mono text-xs text-gray-600">{sessionId}</span>
                    </p>

                    {/* Options Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Option 1: Native RDP */}
                        <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl p-5 text-left hover:border-blue-500/50 transition-colors">
                            <div className="text-3xl mb-3">🖼️</div>
                            <h4 className="text-white font-semibold mb-2">Escritorio Remoto</h4>
                            <p className="text-xs text-gray-500 mb-4">Abre el cliente RDP nativo del sistema para acceso visual completo.</p>
                            <Button
                                onClick={launchNativeRDP}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={nativeRdpLaunched}
                            >
                                {nativeRdpLaunched ? '✓ Cliente RDP Abierto' : 'Abrir Escritorio Remoto'}
                            </Button>
                        </div>

                        {/* Option 2: SSH/PowerShell Terminal */}
                        <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl p-5 text-left hover:border-green-500/50 transition-colors">
                            <div className="text-3xl mb-3">⚡</div>
                            <h4 className="text-white font-semibold mb-2">PowerShell Terminal</h4>
                            <p className="text-xs text-gray-500 mb-4">Acceso por línea de comandos vía SSH (requiere OpenSSH en el servidor).</p>
                            <Button
                                onClick={onSwitchToSSH}
                                variant="outline"
                                className="w-full border-green-600 text-green-400 hover:bg-green-900/20"
                            >
                                Abrir Terminal SSH
                            </Button>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg text-left">
                        <p className="text-xs text-blue-300">
                            <strong>💡 Nota:</strong> El renderizado RDP nativo en la aplicación está en desarrollo.
                            Por ahora, usa el cliente RDP del sistema para acceso visual, o SSH para comandos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

