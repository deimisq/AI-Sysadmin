import { useState, useEffect } from 'react';
import LegacyTerminal from './LegacyTerminal';
import { InteractiveTerminal } from './terminal/InteractiveTerminal';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { type Server } from '../lib/api';

interface TerminalComponentProps {
    onCommand?: (command: string) => Promise<string>;
    externalCommand?: string;
    hostname?: string;
    websocketUrl?: string;
    externalOutput?: string;
    serverData?: Server | null;
}

export default function TerminalComponent(props: TerminalComponentProps) {
    const [isDesktop, setIsDesktop] = useState(false);
    const [useLegacy, setUseLegacy] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
    const [serverInfo, setServerInfo] = useState<{ host: string; username: string } | null>(null);

    // Detect Tauri environment
    useEffect(() => {
        const isTauri =
            (typeof window !== 'undefined' && '__TAURI__' in window) ||
            (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window);

        console.log("[Terminal] Environment detection:", { isTauri });

        if (isTauri) {
            setIsDesktop(true);
        }
    }, []);

    // AUTO-CONNECT when serverData is provided
    useEffect(() => {
        if (isDesktop && props.serverData && !sessionId && !connecting && !autoConnectAttempted) {
            const autoConnect = async () => {
                setAutoConnectAttempted(true);
                setConnecting(true);
                setError(null);

                try {
                    console.log("🔐 Fetching credentials for auto-connect...");
                    const { fetchServerCredentials } = await import('../lib/api');
                    const creds = await fetchServerCredentials(props.serverData!.id);

                    console.log("🚀 Auto-connecting to", creds.ip_address);
                    setServerInfo({ host: creds.ip_address, username: creds.ssh_username });

                    const sid = await invoke<string>('ssh_connect', {
                        host: creds.ip_address,
                        port: creds.ssh_port,
                        username: creds.ssh_username,
                        password: creds.ssh_password || null,
                        privateKeyPath: creds.ssh_key_path || null
                    });

                    console.log("✅ Connected! Session:", sid);
                    setSessionId(sid);

                } catch (e: any) {
                    console.error("❌ Auto-connect failed:", e);
                    setError(e.message || "Error de conexión SSH");
                } finally {
                    setConnecting(false);
                }
            };

            autoConnect();
        }
    }, [isDesktop, props.serverData, sessionId, connecting, autoConnectAttempted]);

    const handleDisconnect = async () => {
        if (sessionId) {
            try {
                await invoke('ssh_disconnect', { sessionId });
            } catch (e) {
                console.error(e);
            }
            setSessionId(null);
        }
    };

    const handleRetry = () => {
        setAutoConnectAttempted(false);
        setError(null);
    };

    // If not desktop or user opted for legacy, use web terminal
    if (!isDesktop || useLegacy) {
        return <LegacyTerminal {...props} />;
    }

    // If connected, show interactive terminal
    if (sessionId && serverInfo) {
        return (
            <div className="h-full flex flex-col overflow-hidden rounded-md border border-gray-700">
                <div className="bg-gray-900 border-b border-gray-700 p-2 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-gray-300 font-mono">
                            {serverInfo.username}@{serverInfo.host}
                        </span>
                        <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-[10px] uppercase">
                            Native SSH
                        </span>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        className="text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-900/20"
                    >
                        Disconnect
                    </button>
                </div>
                <div className="flex-grow bg-black relative">
                    <InteractiveTerminal sessionId={sessionId} />
                </div>
            </div>
        );
    }

    // If auto-connect failed, show error
    if (autoConnectAttempted && error) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-950 p-6">
                <div className="max-w-md w-full space-y-4 text-center">
                    <div className="text-6xl">🔌</div>
                    <h3 className="text-xl font-bold text-red-400">Error de Conexión SSH</h3>
                    <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded">
                        {error}
                    </div>
                    {props.serverData && (
                        <div className="text-sm text-gray-400 space-y-2 bg-gray-900/50 p-4 rounded">
                            <p><strong>Servidor:</strong> {props.serverData.hostname}</p>
                            <p><strong>IP:</strong> {props.serverData.ip_address}</p>
                            <p><strong>Usuario:</strong> {props.serverData.ssh_username}</p>
                        </div>
                    )}
                    <Button
                        onClick={handleRetry}
                        className="mt-4"
                    >
                        🔄 Reintentar Conexión
                    </Button>
                    <button
                        onClick={() => setUseLegacy(true)}
                        className="text-xs text-gray-500 hover:text-gray-300 hover:underline transition-colors"
                    >
                        Usar Terminal Web (Legacy)
                    </button>
                </div>
            </div>
        );
    }

    // Show loading while connecting
    if (connecting) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-950">
                <div className="text-center space-y-4">
                    <div className="animate-spin text-4xl">⚙️</div>
                    <p className="text-gray-400">Conectando a {props.serverData?.hostname || 'servidor'}...</p>
                </div>
            </div>
        );
    }

    // No serverData provided - shouldn't happen in normal flow
    return (
        <div className="h-full flex items-center justify-center bg-gray-950 p-6">
            <div className="text-center space-y-4">
                <div className="text-4xl">ℹ️</div>
                <p className="text-gray-400">Selecciona un servidor desde el dashboard para conectar</p>
            </div>
        </div>
    );
}
