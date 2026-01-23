import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../ui/button';
import type { Server } from '../../lib/api';
import { fetchServerCredentials } from '../../lib/api';
import { GuacamoleCanvas } from './GuacamoleCanvas';

interface RDPComponentProps {
    serverData: Server;
    onDisconnect: () => void;
    onSwitchToSSH?: () => void; // Optional callback to switch to SSH terminal mode
}

export function RDPComponent({ serverData, onDisconnect, onSwitchToSSH }: RDPComponentProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<{
        ip: string;
        username: string;
        password: string;
    } | null>(null);
    const [guacamoleStatus, setGuacamoleStatus] = useState<string>('starting');
    const [nativeRdpLaunched, setNativeRdpLaunched] = useState(false);

    // Auto-start Guacamole server and fetch credentials
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                console.log('[RDPComponent] Initializing RDP connection...');

                // Step 1: Start Guacamole server
                setGuacamoleStatus('starting');
                console.log('[RDPComponent] Starting Guacamole server...');

                try {
                    await invoke('guacamole_start');
                    console.log('[RDPComponent] ✅ Guacamole server started');
                    if (isMounted) setGuacamoleStatus('running');
                } catch (err: any) {
                    console.error('[RDPComponent] Failed to start Guacamole:', err);

                    // Check if already running
                    const status = await invoke<string>('guacamole_get_url').catch(() => null);
                    if (status) {
                        console.log('[RDPComponent] Guacamole already running');
                        if (isMounted) setGuacamoleStatus('running');
                    } else {
                        throw new Error(`Failed to start Guacamole server: ${err}`);
                    }
                }

                // Step 2: Fetch credentials
                console.log('[RDPComponent] Fetching credentials for server:', serverData.id);
                const creds = await fetchServerCredentials(serverData.id);

                if (isMounted) {
                    setCredentials({
                        ip: creds.ip_address,
                        username: creds.ssh_username || 'Administrator',
                        password: creds.ssh_password || ''
                    });
                    setLoading(false);
                    console.log('[RDPComponent] ✅ Credentials loaded');
                }

            } catch (err: any) {
                console.error('[RDPComponent] Initialization error:', err);
                if (isMounted) {
                    setError(err.toString());
                    setLoading(false);
                }
            }
        };

        initialize();

        return () => {
            isMounted = false;
            // Note: We don't stop Guacamole server on unmount
            // as it can be reused for other RDP connections
        };
    }, [serverData.id]);

    const launchNativeRDP = async () => {
        if (!credentials) return;

        try {
            // Launch native RDP client via Tauri shell command
            await invoke('launch_native_rdp', {
                host: credentials.ip,
                username: credentials.username,
                password: credentials.password,
            });

            setNativeRdpLaunched(true);
        } catch (err: any) {
            console.error('Failed to launch native RDP:', err);
            setError(`Error al abrir cliente RDP: ${err.toString()}`);
        }
    };

    // Render error state
    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                <h3 className="text-xl text-red-500 mb-4 font-bold">Error de Conexión RDP</h3>
                <div className="bg-red-900/30 border border-red-800 p-4 rounded mb-6 max-w-lg overflow-auto">
                    <p className="font-mono text-sm">{error}</p>
                </div>
                <div className="flex gap-4">
                    <Button
                        onClick={() => window.location.reload()}
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Reintentar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onDisconnect}
                        className="bg-transparent border-gray-600 hover:bg-gray-800 text-gray-300"
                    >
                        Volver
                    </Button>
                </div>
            </div>
        );
    }

    // Render loading state
    if (loading || !credentials) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-white">
                <div className="animate-pulse text-6xl mb-6">🪟</div>
                <h2 className="text-xl font-semibold mb-2">Iniciando Escritorio Remoto</h2>
                <p className="text-gray-400 mb-4">
                    {serverData.hostname} ({serverData.ip_address})
                </p>
                <div className="text-sm text-gray-500 font-mono">
                    {guacamoleStatus === 'starting' && '⏳ Iniciando servidor Guacamole...'}
                    {guacamoleStatus === 'running' && '📡 Cargando credenciales...'}
                </div>
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
                    <span className="text-xs opacity-60 font-mono bg-black/20 px-2 py-0.5 rounded">
                        {serverData.ip_address}
                    </span>
                </div>

                <div className="flex gap-2 items-center">
                    <button
                        onClick={onDisconnect}
                        className="bg-red-600/90 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-medium shadow-sm transition-all hover:shadow-md"
                    >
                        Desconectar
                    </button>
                </div>
            </div>

            {/* Main Content Area - Guacamole Canvas */}
            <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
                {/* Real Guacamole RDP Canvas */}
                <GuacamoleCanvas
                    host={credentials.ip}
                    port={3389}
                    username={credentials.username}
                    password={credentials.password}
                    width={1920}
                    height={1080}
                    onDisconnect={onDisconnect}
                />

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
                            {onSwitchToSSH && (
                                <button
                                    onClick={onSwitchToSSH}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600 text-green-400 rounded-lg transition-colors text-sm font-medium"
                                    title="Cambiar a terminal SSH/PowerShell"
                                >
                                    <span className="text-lg">⚡</span>
                                    <span>PowerShell/SSH</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

