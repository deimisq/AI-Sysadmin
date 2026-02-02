import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../ui/button';
import type { Server } from '../../lib/api';
import { fetchServerCredentials } from '../../lib/api';
// import { GuacamoleCanvas } from './GuacamoleCanvas';
import { NativeRdpCanvas } from './NativeRdpCanvas';

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
    const [guacamoleStatus, setGuacamoleStatus] = useState<string>('skipped');

    // Fetch credentials only
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                console.log('[RDPComponent] Initializing Native RDP connection...');

                // Fetch credentials
                console.log('[RDPComponent] Fetching credentials for server:', serverData.id);
                const creds = await fetchServerCredentials(serverData.id);
                console.log('[RDPComponent] Credentials fetched:', {
                    ip: creds.ip_address,
                    username: creds.ssh_username
                });

                if (isMounted) {
                    const credData = {
                        ip: creds.ip_address,
                        username: creds.ssh_username || 'Administrator',
                        password: creds.ssh_password || ''
                    };
                    console.log('[RDPComponent] Setting credentials:', credData);
                    setCredentials(credData);
                    setLoading(false);
                    console.log('[RDPComponent] Initialization complete, rendering NativeRdpCanvas');
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
        };
    }, [serverData.id]);

    // Render error state
    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                <h3 className="text-xl text-red-500 mb-4 font-bold">Error de Conexión</h3>
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
                <h2 className="text-xl font-semibold mb-2">Preparando RDP Nativo</h2>
                <p className="text-gray-400 mb-4">
                    {serverData.hostname} ({serverData.ip_address})
                </p>
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

                    {onSwitchToSSH && (
                        <button
                            onClick={onSwitchToSSH}
                            className="flex items-center gap-2 px-3 py-1.5 bg-black/20 hover:bg-black/40 border border-white/20 text-white rounded text-xs font-medium"
                        >
                            <span className="text-lg">⚡</span>
                            SSH
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area - Native RDP Canvas */}
            <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
                <NativeRdpCanvas
                    host={credentials.ip}
                    username={credentials.username}
                    password={credentials.password}
                    onDisconnect={onDisconnect}
                />
            </div>
        </div>
    );
}

