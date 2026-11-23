import { uiText } from '../lib/ui-language';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen } from 'lucide-react';
import LegacyTerminal from './LegacyTerminal';
import { InteractiveTerminal } from './terminal/InteractiveTerminal';
import { sendCommand, isTauri, isWebView2 } from '../lib/bridge';
import { Button } from './ui/button';
import { FileExplorer } from './terminal/FileExplorer';
import { RDPComponent } from './rdp/RDPComponent';
import { type Server } from '@/lib/api';
import { isLocalWorkspace } from '../lib/workspace-mode';
import { useWorkspaceStore } from '../stores/workspaceStore';

interface TerminalComponentProps {
    active?: boolean;
    onCommand?: (command: string) => Promise<string>;
    externalCommand?: string;
    hostname?: string;
    websocketUrl?: string;
    externalOutput?: string;
    serverData?: Server | null;
}

export default function TerminalComponent(props: TerminalComponentProps) {
    const local = isLocalWorkspace();
    const [isNativeRdpAvailable, setIsNativeRdpAvailable] = useState(false);
    const [isNativeSshAvailable, setIsNativeSshAvailable] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [serverInfo, setServerInfo] = useState<{ host: string; username: string } | null>(null);
    const [showFiles, setShowFiles] = useState(false);
    const connectionGeneration = useRef(0);

    useEffect(() => () => { connectionGeneration.current++; }, []);
    useEffect(() => () => {
        if (sessionId) sendCommand('ssh_disconnect', { sessionId }).catch(console.error);
    }, [sessionId]);
    useEffect(() => {
        const serverId = props.serverData?.id;
        if (!isLocalWorkspace() || serverId === undefined || !sessionId) return;
        useWorkspaceStore.getState().registerNativeSession(serverId, sessionId);
        return () => useWorkspaceStore.getState().clearNativeSession(serverId, sessionId);
    }, [props.serverData?.id, sessionId]);

    // Detect Environment Capabilities
    useEffect(() => {
        setIsNativeRdpAvailable(isTauri() || isWebView2());
        setIsNativeSshAvailable(isTauri() || isWebView2()); // Both support native SSH via Bridge
    }, []);

    // Auto-connect in Desktop mode for ALL servers (SSH)
    useEffect(() => {
        if (isNativeSshAvailable && props.serverData && !sessionId && !connecting && retryCount === 0) {
            autoConnect();
        }
    }, [isNativeSshAvailable, props.serverData, sessionId, connecting, retryCount]);

    const autoConnect = async () => {
        if (!props.serverData) return;
        const attempt = ++connectionGeneration.current;
        console.log('[Terminal] autoConnect started for:', props.serverData.hostname);

        // Skip SSH autoconnect for Windows servers (handled by RDP component)
        if (props.serverData.connection_protocol === 'rdp' || (!props.serverData.connection_protocol && (props.serverData.os_type || props.serverData.os_info)?.toLowerCase().includes('windows'))) {
            console.log('[Terminal] Skipping autoConnect (Windows detected)');
            return;
        }

        setConnecting(true);
        setError(null);

        try {
            console.log('[Terminal] Fetching credentials...');
            const { fetchServerCredentials } = await import('@/lib/api');
            const creds = props.serverData.quick_protocol ? { ...props.serverData, ssh_username: props.serverData.ssh_username || '', ssh_port: props.serverData.ssh_port || 22 } : await fetchServerCredentials(props.serverData.id);

            console.log('[Terminal] Credentials fetched, sending ssh_connect...');
            setServerInfo({ host: creds.ip_address, username: creds.ssh_username });

            // Add console logs for debugging connection flow.
            console.log(`[Bridge] Sending command: ssh_connect`, {
                host: creds.ip_address,
                port: creds.ssh_port,
                username: creds.ssh_username,
                password: creds.ssh_password ? '********' : null, // Mask password for logs
                privateKeyPath: creds.ssh_key_path ? '[REDACTED]' : null
            });
            const env = isWebView2() ? 'WebView2' : (isTauri() ? 'Tauri' : 'Browser');
            console.log(`[Bridge] Environment detected: ${env}`);

            const sid = await sendCommand('ssh_connect', {
                ...(props.serverData.quick_protocol ? { temporaryServerId: props.serverData.id } : {}),
                ...(isLocalWorkspace() && !props.serverData.quick_protocol ? { localServerId: props.serverData.id } : {}),
                host: creds.ip_address,
                port: creds.ssh_port,
                username: creds.ssh_username,
                password: creds.ssh_password || null,
                privateKeyPath: creds.ssh_key_path || null
            });
            if (attempt !== connectionGeneration.current) {
                if (sid) await sendCommand('ssh_disconnect', { sessionId: sid });
                return;
            }

            if (sid) {
                setSessionId(sid);
                setRetryCount(0);
                console.log(`[Bridge] Received session ID: ${sid}`);
            } else {
                throw new Error("Failed to get session ID");
            }
        } catch (e: any) {
            if (attempt !== connectionGeneration.current) return;
            console.error("SSH connection failed:", e);
            setError(e.message || uiText("Error de conexión"));
            setRetryCount(prev => prev + 1);
        } finally {
            if (attempt === connectionGeneration.current) setConnecting(false);
        }
    };

    // State to force SSH mode even for Windows servers
    const [forceSSH, setForceSSH] = useState(false);

    const isWindows = props.serverData?.connection_protocol === 'rdp' || (!props.serverData?.connection_protocol && (props.serverData?.os_type || props.serverData?.os_info)?.toLowerCase().includes('windows'));

    // Show RDP component for Windows servers (unless forceSSH is set)
    // Use isNativeRdpAvailable check here
    if (isWindows && isNativeRdpAvailable && props.serverData && !forceSSH) {
        return (
            <RDPComponent
                active={props.active}
                serverData={props.serverData}
                onDisconnect={() => {
                    const state = useWorkspaceStore.getState();
                    const tab = state.tabs.find(tab => tab.server === props.serverData);
                    if (tab) state.closeTab(tab.id);
                }}
                onSwitchToSSH={() => {
                    // Switch to SSH terminal mode for this Windows server
                    setForceSSH(true);
                }}
            />
        );
    }

    // Use Legacy terminal ONLY if failed 3+ times OR not native SSH available
    if (!local && !props.serverData?.quick_protocol && (!isNativeSshAvailable || retryCount >= 3)) {
        return <LegacyTerminal {...props} />;
    }

    // Connected - show native terminal
    if (sessionId && serverInfo) {
        return (
            <div className="h-full flex flex-col">
                {props.serverData?.quick_protocol !== 'sftp' && props.active !== false && document.getElementById('session-actions') && createPortal(
                    <button onClick={() => setShowFiles(value => !value)} aria-pressed={showFiles}
                        title="Mostrar u ocultar archivos SFTP"
                        className="flex items-center gap-1 px-2 h-7 text-[11px] text-gray-400 hover:text-white hover:bg-white/5 rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-blue-400">
                        <FolderOpen size={13} />{uiText("Archivos")}</button>, document.getElementById('session-actions')!
                )}
                <div className="flex-grow flex overflow-hidden relative">
                    {props.serverData?.quick_protocol !== 'sftp' && <div className="flex-1 bg-black min-w-0">
                        <InteractiveTerminal onReconnect={() => { setSessionId(null); setServerInfo(null); }} sessionId={sessionId} serverId={props.serverData?.quick_protocol ? undefined : props.serverData?.id} />
                    </div>}
                    { (showFiles || props.serverData?.quick_protocol === 'sftp') && (
                        <FileExplorer
                            sessionId={sessionId}
                            onClose={props.serverData?.quick_protocol === 'sftp' ? undefined : () => setShowFiles(false)}
                            className={props.serverData?.quick_protocol === 'sftp' ? "flex-1 min-w-0" : "w-72 flex-shrink-0 border-l border-[#333] shadow-xl z-10"}
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
                    <p className="text-gray-400">{uiText("Conectando a")}{" "}{props.serverData?.hostname}...</p>
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
                    <h3 className="text-xl font-bold text-red-400">{uiText("Error de Conexión")}</h3>
                    <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded text-sm">
                        {error}
                    </div>
                    {props.serverData && (
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>{props.serverData.hostname} ({props.serverData.ip_address})</p>
                            <p>{uiText("Intento")}{" "}{retryCount}</p>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Button onClick={autoConnect} className="w-full">{uiText("🔄 Reintentar")}</Button>
                        {!local && <button
                            onClick={() => setRetryCount(3)}
                            className="text-xs text-gray-500 hover:text-gray-300 underline"
                        >{uiText("Usar terminal web (proxy)")}</button>}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
