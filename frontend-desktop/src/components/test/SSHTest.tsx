import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SSHTestProps { }

export function SSHTest({ }: SSHTestProps) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [output, setOutput] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Test connection credentials
    const [host, setHost] = useState('localhost');
    const [port, setPort] = useState(22);
    const [username, setUsername] = useState('ubuntu');
    const [password, setPassword] = useState('');

    const handleConnect = async () => {
        setLoading(true);
        setError(null);

        try {
            const newSessionId = await invoke<string>('ssh_connect', {
                host,
                port,
                username,
                password: password || null,
                privateKeyPath: null,
            });

            setSessionId(newSessionId);
            setOutput(`✅ Connected! Session ID: ${newSessionId}\n`);
        } catch (err) {
            setError(`Connection failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async (command: string) => {
        if (!sessionId) {
            setError('Not connected');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await invoke<string>('ssh_execute', {
                sessionId,
                command,
            });

            setOutput((prev) => `${prev}$ ${command}\n${result}\n`);
        } catch (err) {
            setError(`Execution failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!sessionId) return;

        setLoading(true);

        try {
            await invoke('ssh_disconnect', { sessionId });
            setOutput((prev) => `${prev}Disconnected.\n`);
            setSessionId(null);
        } catch (err) {
            setError(`Disconnect failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const testGreet = async () => {
        try {
            const message = await invoke<string>('greet', { name: 'Developer' });
            setOutput(`${message}\n`);
        } catch (err) {
            setError(`Greet failed: ${err}`);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🚀 Phase 1 PoC: Rust SSH Client</h1>

            {/* Test Rust backend */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <button
                    onClick={testGreet}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Test Rust Backend
                </button>
            </div>

            {/* Connection Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">SSH Connection</h2>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Host"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        className="px-3 py-2 border rounded"
                    />
                    <input
                        type="number"
                        placeholder="Port"
                        value={port}
                        onChange={(e) => setPort(Number(e.target.value))}
                        className="px-3 py-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="px-3 py-2 border rounded"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="px-3 py-2 border rounded"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleConnect}
                        disabled={loading || !!sessionId}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                        {loading ? 'Connecting...' : 'Connect'}
                    </button>

                    <button
                        onClick={handleDisconnect}
                        disabled={loading || !sessionId}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                        Disconnect
                    </button>
                </div>

                {sessionId && (
                    <div className="mt-4 text-sm text-green-600">
                        ✅ Connected - Session: {sessionId}
                    </div>
                )}
            </div>

            {/* Quick Commands */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Quick Commands</h2>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleExecute('whoami')}
                        disabled={!sessionId || loading}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                    >
                        whoami
                    </button>
                    <button
                        onClick={() => handleExecute('pwd')}
                        disabled={!sessionId || loading}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                    >
                        pwd
                    </button>
                    <button
                        onClick={() => handleExecute('ls -la')}
                        disabled={!sessionId || loading}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                    >
                        ls -la
                    </button>
                    <button
                        onClick={() => handleExecute('df -h')}
                        disabled={!sessionId || loading}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                    >
                        df -h
                    </button>
                    <button
                        onClick={() => handleExecute('free -m')}
                        disabled={!sessionId || loading}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                    >
                        free -m
                    </button>
                </div>
            </div>

            {/* Output Terminal */}
            <div className="p-4 bg-black text-green-400 rounded-lg font-mono text-sm">
                <h2 className="text-xl font-semibold mb-2 text-white">Terminal Output</h2>

                <pre className="whitespace-pre-wrap min-h-[300px]">
                    {output || 'Waiting for commands...'}
                </pre>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    ❌ {error}
                </div>
            )}

            {/* Status Footer */}
            <div className="mt-6 p-4 bg-gray-100 rounded text-sm">
                <h3 className="font-semibold mb-2">PoC Status:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li className="text-green-600">✅ Rust backend initialized (ssh2 crate)</li>
                    <li className="text-green-600">✅ Tauri commands exposed to React</li>
                    <li className={sessionId ? "text-green-600" : "text-gray-400"}>
                        {sessionId ? "✅" : "⏳"} SSH connection {sessionId ? "active" : "pending"}
                    </li>
                    <li className="text-yellow-600">⏳ Multi-tab terminal (Phase 1.2)</li>
                    <li className="text-yellow-600">⏳ Credential vault (Phase 1.3)</li>
                </ul>
            </div>
        </div>
    );
}
