import { useState } from 'react';
import { sendCommand } from '../../lib/bridge';
import { InteractiveTerminal } from '../terminal/InteractiveTerminal';

interface SSHTestProps { }

export function SSHTest({ }: SSHTestProps) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [output, setOutput] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'command' | 'interactive'>('command');

    // Test connection credentials
    const [host, setHost] = useState('testing.sentrait.com.uy');
    const [port, setPort] = useState(22);
    const [username, setUsername] = useState('ubuntu');
    const [password, setPassword] = useState('');
    const [privateKeyPath, setPrivateKeyPath] = useState('');
    const [authMethod, setAuthMethod] = useState<'password' | 'key'>('key');

    const handleConnect = async () => {
        setLoading(true);
        setError(null);
        setOutput('Connecting...\n');

        try {
            console.log('Attempting SSH connection to:', { host, port, username, authMethod });

            const newSessionId = await sendCommand('ssh_connect', {
                host,
                port,
                username,
                password: authMethod === 'password' && password ? password : null,
                privateKeyPath: authMethod === 'key' && privateKeyPath ? privateKeyPath : null,
            });

            console.log('SSH connection successful! Session:', newSessionId);
            setSessionId(newSessionId);
            setOutput(`✅ Connected! Session ID: ${newSessionId}\n`);

            // Switch to interactive mode automatically if preferred
            setMode('interactive');
        } catch (err) {
            console.error('SSH connection error:', err);
            setError(`Connection failed: ${err}`);
            setOutput((prev) => `${prev}❌ Error: ${err}\n`);
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
            console.log('Executing command:', command);
            const result = await sendCommand('ssh_execute', {
                sessionId,
                command,
            });

            console.log('Command result:', result);
            setOutput((prev) => `${prev}$ ${command}\n${result}\n`);
        } catch (err) {
            console.error('Command execution error:', err);
            setError(`Execution failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!sessionId) return;

        setLoading(true);

        try {
            await sendCommand('ssh_disconnect', { sessionId });
            setOutput((prev) => `${prev}Disconnected.\n`);
            setSessionId(null);
            setMode('command');
        } catch (err) {
            setError(`Disconnect failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const testGreet = async () => {
        try {
            const message = await sendCommand('greet', { name: 'Developer' });
            setOutput(`${message}\n`);
        } catch (err) {
            setError(`Greet failed: ${err}`);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🚀 Phase 1.2: Interactive Terminal</h1>

            {/* Test Rust backend */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg flex justify-between items-center">
                <button
                    onClick={testGreet}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Test Rust Backend
                </button>

                {sessionId && (
                    <div className="flex bg-gray-200 rounded p-1">
                        <button
                            onClick={() => setMode('command')}
                            className={`px-4 py-2 rounded ${mode === 'command' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                        >
                            Command Mode
                        </button>
                        <button
                            onClick={() => setMode('interactive')}
                            className={`px-4 py-2 rounded ${mode === 'interactive' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                        >
                            Interactive Mode
                        </button>
                    </div>
                )}
            </div>

            {/* Connection Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">SSH Connection</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Authentication Method</label>
                    <div className="flex gap-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="auth"
                                checked={authMethod === 'password'}
                                onChange={() => setAuthMethod('password')}
                                className="mr-2"
                            />
                            Password
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="auth"
                                checked={authMethod === 'key'}
                                onChange={() => setAuthMethod('key')}
                                className="mr-2"
                            />
                            SSH Key
                        </label>
                    </div>
                </div>

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
                        className="px-3 py-2 border rounded col-span-2"
                    />

                    {authMethod === 'password' ? (
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="px-3 py-2 border rounded col-span-2"
                        />
                    ) : (
                        <input
                            type="text"
                            placeholder="SSH Key Path (e.g., C:\Users\YourName\.ssh\id_rsa)"
                            value={privateKeyPath}
                            onChange={(e) => setPrivateKeyPath(e.target.value)}
                            className="px-3 py-2 border rounded col-span-2"
                        />
                    )}
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

            {/* ERROR DISPLAY */}
            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    ❌ {error}
                </div>
            )}

            {/* INTERACTIVE MODE */}
            {sessionId && mode === 'interactive' && (
                <div className="mb-6 h-[600px] border-2 border-gray-300 rounded overflow-hidden">
                    <InteractiveTerminal sessionId={sessionId} />
                </div>
            )}

            {/* COMMAND MODE */}
            {mode === 'command' && (
                <>
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
                            <button
                                onClick={() => handleExecute('htop')}
                                disabled={!sessionId || loading}
                                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50"
                            >
                                htop (will fail in command mode)
                            </button>
                        </div>
                    </div>

                    {/* Output Terminal */}
                    <div className="p-4 bg-black text-green-400 rounded-lg font-mono text-sm">
                        <h2 className="text-xl font-semibold mb-2 text-white">Command Output</h2>

                        <pre className="whitespace-pre-wrap min-h-[300px] font-mono">
                            {output || 'Waiting for commands...'}
                        </pre>
                    </div>
                </>
            )}

            {/* Status Footer */}
            <div className="mt-6 p-4 bg-gray-100 rounded text-sm">
                <h3 className="font-semibold mb-2">Phase 1.2 Status:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li className="text-green-600">✅ Rust backend initialized</li>
                    <li className="text-green-600">✅ Single-shot commands working</li>
                    <li className={mode === 'interactive' ? "text-green-600 font-bold" : "text-gray-500"}>
                        {mode === 'interactive' ? "🚀 Interactive Terminal Active (xterm.js + PTY)" : "⏸️ Command Mode Active"}
                    </li>
                    <li className="text-yellow-600">⏳ Multi-tab management (Next Step)</li>
                </ul>
            </div>
        </div>
    );
}
