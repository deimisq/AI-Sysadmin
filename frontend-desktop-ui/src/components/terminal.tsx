import { useState, useEffect } from 'react';
import LegacyTerminal from './LegacyTerminal';
import { InteractiveTerminal } from './terminal/InteractiveTerminal';
import { sendCommand, isTauri, isWebView2 } from '../lib/bridge';
import { Button } from './ui/button';
import { FileExplorer } from './terminal/FileExplorer';
import { RDPComponent } from './rdp/RDPComponent';
import { type Server } from '@/lib/api';

interface TerminalComponentProps {
    onCommand?: (command: string) => Promise<string>;
    externalCommand?: string;
    hostname?: string;
    websocketUrl?: string;
    externalOutput?: string;
    serverData?: Server | null;
}

export default function TerminalComponent(props: TerminalComponentProps) {
    const [isNativeRdpAvailable, setIsNativeRdpAvailable] = useState(false);
    const [isNativeSshAvailable, setIsNativeSshAvailable] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [serverInfo, setServerInfo] = useState<{ host: string; username: string } | null>(null);
    const [showFiles, setShowFiles] = useState(false);

    // Detect Environment Capabilities
    useEffect(() => {
        setIsNativeRdpAvailable(isTauri() || isWebView2());
        setIsNativeSshAvailable(isTauri()); // Only Tauri supports native SSH for now
    }, []);

    // Auto-connect in Desktop mode for ALL servers (SSH)
    useEffect(() => {
        if (isNativeSshAvailable && props.serverData && !sessionId && !connecting && retryCount === 0) {
            autoConnect();
        }
    }, [isNativeSshAvailable, props.serverData, sessionId, connecting, retryCount]);

    const autoConnect = async () => {
        if (!props.serverData) return;

        // Skip SSH autoconnect for Windows servers (handled by RDP component)
        if (props.serverData.os_type?.toLowerCase().includes('windows')) {
            return;
        }

        // ... (rest of logic same) ...
        setConnecting(true);
        setError(null);

        try {
            const { fetchServerCredentials } = await import('@/lib/api');
            const creds = await fetchServerCredentials(props.serverData.id);

            setServerInfo({ host: creds.ip_address, username: creds.ssh_username });

            const sid = await sendCommand('ssh_connect', {
                host: creds.ip_address,
                port: creds.ssh_port,
                username: creds.ssh_username,
                password: creds.ssh_password || null,
                privateKeyPath: creds.ssh_key_path || null
            });

            if (sid) {
                setSessionId(sid);
                setRetryCount(0);
            } else {
                throw new Error("Failed to get session ID");
            }
        } catch (e: any) {
            console.error("SSH connection failed:", e);
            setError(e.message || "Error de conexión");
            setRetryCount(prev => prev + 1);
        } finally {
            setConnecting(false);
        }
    };

    // ... (handleDisconnect same) ...

    const handleDisconnect = async () => {
        if (sessionId) {
            try {
                await sendCommand('ssh_disconnect', { sessionId });
            } catch (e) {
                console.error(e);
            }
            setSessionId(null);
        }
    };

    // State to force SSH mode even for Windows servers
    const [forceSSH, setForceSSH] = useState(false);

    const isWindows = props.serverData?.os_type?.toLowerCase().includes('windows');

    // Show RDP component for Windows servers (unless forceSSH is set)
    // Use isNativeRdpAvailable check here
    if (isWindows && isNativeRdpAvailable && props.serverData && !forceSSH) {
        return (
            <RDPComponent
                serverData={props.serverData}
                onDisconnect={() => {
                    window.location.reload();
                }}
                onSwitchToSSH={() => {
                    // Switch to SSH terminal mode for this Windows server
                    setForceSSH(true);
                }}
            />
        );
    }

    // Use Legacy terminal ONLY if failed 3+ times OR not native SSH available
    if (!isNativeSshAvailable || retryCount >= 3) {
        return <LegacyTerminal {...props} />;
    }

    // Connected - show native terminal
    if (sessionId && serverInfo) {
        return (
            <div className="h-full flex flex-col">
                <div className="bg-gray-900 border-b border-gray-700 p-2 flex justify-between items-center text-xs shrink-0 z-20 relative">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-gray-300 font-mono">
                            {serverInfo.username}@{serverInfo.host}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* SFTP disabled for now
                        <button
                            onClick={() => setShowFiles(!showFiles)}
                             ...
                        >
                        </button>
                        <div className="w-px h-4 bg-gray-700 mx-1"></div>
                        */}
                        <div className="w-px h-4 bg-gray-700 mx-1"></div>
                        <button
                            onClick={handleDisconnect}
                            className="text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                        >
                            Desconectar
                        </button>
                    </div>
                </div>
                <div className="flex-grow flex overflow-hidden relative">
                    <div className="flex-1 bg-black min-w-0">
                        <InteractiveTerminal sessionId={sessionId} />
                    </div>
                    {showFiles && (
                        <FileExplorer
                            sessionId={sessionId}
                            onClose={() => setShowFiles(false)}
                            className="w-72 flex-shrink-0 border-l border-[#333] shadow-xl z-10"
                        />
                    )}
                </div>
            </div>
        );
    }

    // Connecting state
    if (connecting) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-950">
                <div className="text-center space-y-4">
                    <div className="animate-spin text-4xl">⚙️</div>
                    <p className="text-gray-400">Conectando a {props.serverData?.hostname}...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-950 p-6">
                <div className="max-w-md w-full space-y-4 text-center">
                    <div className="text-6xl">⚠️</div>
                    <h3 className="text-xl font-bold text-red-400">Error de Conexión</h3>
                    <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded text-sm">
                        {error}
                    </div>
                    {props.serverData && (
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>{props.serverData.hostname} ({props.serverData.ip_address})</p>
                            <p>Intento {retryCount} de 3</p>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Button onClick={autoConnect} className="w-full">
                            🔄 Reintentar
                        </Button>
                        <button
                            onClick={() => setRetryCount(3)}
                            className="text-xs text-gray-500 hover:text-gray-300 underline"
                        >
                            Usar terminal web (proxy)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
