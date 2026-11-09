import { useState, useEffect } from 'react';
// import { invoke } from '@tauri-apps/api/core';
import { Button } from '../ui/button';
import type { Server } from '@/lib/api';
import { fetchServerCredentials } from '@/lib/api';
// import { GuacamoleCanvas } from './GuacamoleCanvas';
import { NativeRdpCanvas } from './NativeRdpCanvas';
import GuacamoleRdpCanvas from './GuacamoleRdpCanvas';
import { isLocalWorkspace } from '../../lib/workspace-mode';

interface RDPComponentProps {
    serverData: Server;
    active?: boolean;
    onDisconnect: () => void;
    onSwitchToSSH?: () => void; // Optional callback to switch to SSH terminal mode
}

export function RDPComponent({ serverData, onDisconnect, active = true }: RDPComponentProps) {
    const local = isLocalWorkspace();
    const [retry, setRetry] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<{
        ip: string;
        username: string;
        password: string;
        port: number;
    } | null>(null);

    // Toggle between Native RDP and Guacamole
    // Default to Native (FreeRDP) since we want the native integration experience
    const useGuacamole = false;


    // Fetch credentials only
    useEffect(() => {
        let isMounted = true;
        setLoading(true); setError(null);

        const initialize = async () => {
            try {
                console.log('[RDPComponent] Initializing Native RDP connection...');

                // Fetch credentials
                console.log('[RDPComponent] Fetching credentials for server:', serverData.id);
                const creds = serverData.quick_protocol ? serverData : await fetchServerCredentials(serverData.id);
                console.log('[RDPComponent] Credentials fetched:', {
                    ip: creds.ip_address,
                    username: creds.ssh_username
                });

                if (isMounted) {
                    const credData = {
                        ip: creds.ip_address,
                        username: creds.ssh_username || 'Administrator',
                        password: creds.ssh_password || '',
                        port: creds.rdp_port || 3389,
                    };
                    // Do not log passwords or private keys.
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
    }, [serverData.id, retry]);

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
                        onClick={() => setRetry(value => value + 1)}
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
            {/* Main Content Area - RDP Canvas (Guacamole or Native) */}
            <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
                {useGuacamole && !local ? (
                    <GuacamoleRdpCanvas
                        host={credentials.ip}
                        username={credentials.username}
                        password={credentials.password}
                        width={800}
                        height={600}
                        onDisconnect={onDisconnect}
                    />
                ) : (
                    <NativeRdpCanvas
                        temporaryServerId={serverData.quick_protocol ? serverData.id : undefined}
                        active={active}
                        port={credentials.port}
                        host={credentials.ip}
                        username={credentials.username}
                        password={credentials.password}
                        onDisconnect={onDisconnect}
                    />
                )}
            </div>
        </div>
    );
}

