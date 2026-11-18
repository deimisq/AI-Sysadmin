import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { isTauri, isWebView2, sendCommand } from '../../lib/bridge';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import '@xterm/xterm/css/xterm.css';
import { attachTerminalClipboard } from '../../lib/terminal-clipboard';
import { uiText } from '../../lib/ui-language';
import { toast } from 'sonner';

interface InteractiveTerminalProps {
    sessionId: string;
    serverId?: number;
    onClose?: () => void;
}

export function InteractiveTerminal({ sessionId, onClose: _onClose }: InteractiveTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const ptyIdRef = useRef<string | null>(null);
    const unlistenRef = useRef<UnlistenFn | null>(null);
    const wv2HandlerRef = useRef<((event: any) => void) | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const clipboardCleanupRef = useRef<(() => void) | null>(null);
    const isMounted = useRef(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        isMounted.current = true;

        const initTerminal = async () => {
            if (!terminalRef.current || xtermRef.current) return;

            // Initialize xterm.js
            const term = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", monospace',
                theme: {
                    background: '#1e1e1e',
                    foreground: '#f0f0f0',
                },
                rows: 24,
                cols: 80,
            });

            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);

            term.open(terminalRef.current);
            fitAddon.fit();

            xtermRef.current = term;
            fitAddonRef.current = fitAddon;


            try {
                // Determine dimensions
                const cols = term.cols;
                const rows = term.rows;

                // FIX RACE CONDITION: Start listening BEFORE creating the PTY.
                // The ptyId is the same as the sessionId in our backend logic.
                const currentPtyId = sessionId;
                ptyIdRef.current = currentPtyId;

                // Set up event listener for PTY data
                if (isTauri()) {
                    const unlisten = await listen<number[]>(`pty-data:${currentPtyId}`, (event) => {
                        const data = event.payload;
                        if (data && data.length > 0) {
                            const uint8 = new Uint8Array(data);
                            term.write(uint8);
                        }
                    });
                    unlistenRef.current = unlisten;
                }

                // Handle incoming events from WebView2 if applicable
                if (isWebView2()) {
                    const messageHandler = (event: any) => {
                        const msg = event.data;
                        if (msg.type === 'PTY_DATA' && msg.ptyId === sessionId) {
                            let data = msg.payload;
                            if (data) {
                                // C# byte[] becomes Base64 string in JSON
                                if (typeof data === 'string') {
                                    const binaryString = atob(data);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    term.write(bytes);
                                } else if (Array.isArray(data)) {
                                    term.write(new Uint8Array(data));
                                }
                            }
                        }
                    };
                    wv2HandlerRef.current = messageHandler;
                    (window as any).chrome.webview.addEventListener('message', messageHandler);
                }

                if (!isMounted.current) {
                    return;
                }

                // Create PTY session in backend (this triggers the SSH connection and functionality)
                // Now that we are listening, we will capture the initial MOTD/Welcome message.
                await sendCommand('pty_create', {
                    sessionId,
                    rows,
                    cols
                });
                if (!isMounted.current) {
                    await sendCommand('pty_close', { ptyId: sessionId });
                    return;
                }

                // Handle input (user typing)
                term.onData(async (data) => {
                    if (!ptyIdRef.current) return;

                    // Convert string to bytes
                    const encoder = new TextEncoder();
                    const bytes = Array.from(encoder.encode(data));

                    try {
                        await sendCommand('pty_write', {
                            ptyId: ptyIdRef.current,
                            data: bytes
                        });
                    } catch (e) {
                        console.error('Failed to write to PTY:', e);
                        term.write(`\r\n❌ Write Error: ${e}\r\n`);
                    }
                });

                clipboardCleanupRef.current = attachTerminalClipboard(term, terminalRef.current!, {
                    readText: () => navigator.clipboard.readText(),
                    writeText: text => navigator.clipboard.writeText(text),
                }, operation => toast.error(uiText(operation === 'copy'
                    ? 'No se pudo copiar la selección al portapapeles.'
                    : 'No se pudo leer el portapapeles. Usa Ctrl+V para pegar.'), { id: 'terminal-clipboard' }));

                // Handle resize with ResizeObserver for better accuracy
                const resizeObserver = new ResizeObserver(() => {
                    if (!fitAddonRef.current || !ptyIdRef.current || !isMounted.current) return;

                    // Small delay to ensure container has settled
                    setTimeout(() => {
                        if (!fitAddonRef.current || !xtermRef.current) return;
                        fitAddonRef.current.fit();
                        const { cols, rows } = xtermRef.current;

                        sendCommand('pty_resize', {
                            ptyId: ptyIdRef.current!,
                            rows,
                            cols
                        }).catch(err => console.error('Resize failed:', err));
                    }, 50);
                });

                if (terminalRef.current) {
                    resizeObserver.observe(terminalRef.current);
                }
                resizeObserverRef.current = resizeObserver;


            } catch (err: any) {
                console.error('Failed to create PTY:', err);
                setError(err.toString());
                term.write(`\r\n❌ Failed to initialize PTY: ${err}\r\n`);
            }
        };

        const initializationTimer = setTimeout(initTerminal, 0);

        return () => {
            isMounted.current = false;
            clearTimeout(initializationTimer);
            clipboardCleanupRef.current?.();
            clipboardCleanupRef.current = null;
            if (unlistenRef.current) {
                unlistenRef.current();
                unlistenRef.current = null;
            }
            if (wv2HandlerRef.current && (window as any).chrome?.webview) {
                (window as any).chrome.webview.removeEventListener('message', wv2HandlerRef.current);
                wv2HandlerRef.current = null;
            }
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }

            if (ptyIdRef.current) {
                sendCommand('pty_close', { ptyId: ptyIdRef.current }).catch(console.error);
                ptyIdRef.current = null;
            }
            if (xtermRef.current) {
                xtermRef.current.dispose();
                xtermRef.current = null;
            }
        };
    }, [sessionId]);

    return (
        <div className="flex flex-col h-full w-full bg-black p-2 rounded overflow-hidden">
            {error && (
                <div className="bg-red-900 text-white p-2 mb-2 rounded text-sm">
                    Error: {error}
                </div>
            )}
            <div
                ref={terminalRef}
                className="flex-grow h-full w-full"
                style={{ minHeight: '400px' }}
            />
        </div>
    );
}
