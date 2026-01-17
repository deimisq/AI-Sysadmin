import { useState, useEffect } from 'react';
import LegacyTerminal from './LegacyTerminal';
import { InteractiveTerminal } from './terminal/InteractiveTerminal';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';


import { type Server, fetchServerSecrets } from '../lib/api';

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

    // Desktop Connection State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [connectionForm, setForm] = useState({
        host: '',
        port: 22,
        username: 'ubuntu',
        password: '',
        keyPath: '',
        authMethod: 'password' as 'password' | 'key'
    });
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial check
    useEffect(() => {
        // Robust check for Tauri environment
        const isTauri =
            (typeof window !== 'undefined' && '__TAURI__' in window) ||
            (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window);

        console.log("[Terminal] Environment detection:", { isTauri });

        if (isTauri) {
            setIsDesktop(true);
        }
    }, []);

    // ONE-CLICK CONNECT: Fetch secrets and connect automatically
    useEffect(() => {
        if (isDesktop && props.serverData && !sessionId && !connecting) {
            const connectWithSecrets = async () => {
                setConnecting(true);
                setError(null);
                try {
                    console.log("🔐 Fetching secrets for Zero-Friction connection...");
                    const secrets = await fetchServerSecrets(props.serverData!.id);

                    console.log("🚀 Connecting via SSH...");
                    const sid = await invoke<string>('ssh_connect', {
                        host: secrets.ip_address,
                        port: 22, // TODO: Add port to DB model if needed
                        username: secrets.ssh_username || '',
                        password: secrets.ssh_password || null,
                        privateKeyPath: secrets.ssh_key_path || null
                    });

                    setSessionId(sid);

                    // Pre-fill form just in case disconnected later
                    setForm(prev => ({
                        ...prev,
                        host: secrets.ip_address,
                        username: secrets.ssh_username || '',
                        password: secrets.ssh_password || '',
                        keyPath: secrets.ssh_key_path || '',
                        authMethod: secrets.ssh_key_path ? 'key' : 'password'
                    }));

                } catch (e: any) {
                    console.error("Auto-connect failed:", e);
                    // Fallback to manual form, but pre-fill what we know
                    setForm(prev => ({
                        ...prev,
                        host: props.serverData?.ip_address || '',
                        username: props.serverData?.ssh_username || ''
                    }));
                    setError("No se pudieron obtener credenciales automáticas. Ingresalas manualmente.");
                } finally {
                    setConnecting(false);
                }
            };

            connectWithSecrets();
        }
    }, [isDesktop, props.serverData, sessionId, connecting]);


    // Pre-fill form from server data
    useEffect(() => {
        if (props.serverData) {
            console.log("Pre-filling connection form with:", props.serverData);
            setForm(prev => ({
                ...prev,
                host: props.serverData?.ip_address || props.hostname || '',
                username: props.serverData?.ssh_username || 'ubuntu',
                // Note: ssh_key_path from DB is server-side, not client-side, so we don't autofill it
                // unless we want to assume a convention.
            }));
        }
    }, [props.serverData, props.hostname]);


    const handleChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleConnect = async () => {
        if (!connectionForm.host || !connectionForm.username) {
            setError("Host y Usuario son requeridos");
            return;
        }

        setConnecting(true);
        setError(null);
        try {
            console.log('Connecting to', connectionForm.host);
            const sid = await invoke<string>('ssh_connect', {
                host: connectionForm.host,
                port: Number(connectionForm.port),
                username: connectionForm.username,
                password: connectionForm.authMethod === 'password' && connectionForm.password ? connectionForm.password : null,
                privateKeyPath: connectionForm.authMethod === 'key' && connectionForm.keyPath ? connectionForm.keyPath : null
            });
            console.log('Connected, Session:', sid);
            setSessionId(sid);
        } catch (e: any) {
            console.error(e);
            setError(typeof e === 'string' ? e : e.message || "Error de conexión");
        } finally {
            setConnecting(false);
        }
    };

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

    // If not desktop or user opted for legacy, render old terminal
    if (!isDesktop || useLegacy) {
        return <LegacyTerminal {...props} />;
    }

    // If connected, render the interactive terminal
    if (sessionId) {
        return (
            <div className="h-full flex flex-col overflow-hidden rounded-md border border-gray-700">
                <div className="bg-gray-900 border-b border-gray-700 p-2 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-gray-300 font-mono">
                            {connectionForm.username}@{connectionForm.host}
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

    // Connection Form for Desktop
    return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-950 text-gray-100 p-6 rounded-lg border border-gray-800">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Conexión SSH Directa</h2>
                    <p className="text-sm text-gray-400">
                        Estás en la App de Escritorio. Conecta directamente a tu servidor local.
                    </p>
                    {props.serverData && (
                        <p className="text-xs text-yellow-500 bg-yellow-900/10 p-1 rounded border border-yellow-900/30">
                            ℹ️ Datos pre-cargados. Por seguridad, la contraseña no se sincroniza.
                        </p>
                    )}
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-200 p-3 rounded text-sm text-center">
                        ❌ {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Host / IP</Label>
                            <Input
                                placeholder="192.168.1.50"
                                value={connectionForm.host}
                                onChange={(e) => handleChange('host', e.target.value)}
                                className="bg-gray-900 border-gray-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Puerto</Label>
                            <Input
                                type="number"
                                value={connectionForm.port}
                                onChange={(e) => handleChange('port', e.target.value)}
                                className="bg-gray-900 border-gray-700"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Usuario</Label>
                        <Input
                            value={connectionForm.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            className="bg-gray-900 border-gray-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Método de Autenticación</Label>
                        <div className="flex gap-4 p-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={connectionForm.authMethod === 'password'}
                                    onChange={() => handleChange('authMethod', 'password')}
                                />
                                <span className="text-sm">Contraseña</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={connectionForm.authMethod === 'key'}
                                    onChange={() => handleChange('authMethod', 'key')}
                                />
                                <span className="text-sm">Llave SSH</span>
                            </label>
                        </div>
                    </div>

                    {connectionForm.authMethod === 'password' ? (
                        <div className="space-y-2">
                            <Label>Contraseña</Label>
                            <Input
                                type="password"
                                value={connectionForm.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                className="bg-gray-900 border-gray-700"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Ruta de la Llave Privada</Label>
                            <Input
                                placeholder="C:\Users\TuUsuario\.ssh\id_rsa"
                                value={connectionForm.keyPath}
                                onChange={(e) => handleChange('keyPath', e.target.value)}
                                className="bg-gray-900 border-gray-700"
                            />
                        </div>
                    )}

                    <Button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                    >
                        {connecting ? 'Conectando...' : 'Conectar Ahora'}
                    </Button>
                </div>

                <div className="pt-2 border-t border-gray-800 text-center">
                    <button
                        onClick={() => setUseLegacy(true)}
                        className="text-xs text-gray-500 hover:text-gray-300 hover:underline transition-colors"
                    >
                        ¿No puedes conectar directo? Usar Proxy Web (Legacy)
                    </button>
                </div>
            </div>
        </div>
    );
}
