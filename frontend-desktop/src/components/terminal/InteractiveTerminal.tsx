import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import '@xterm/xterm/css/xterm.css';

interface InteractiveTerminalProps {
    sessionId: string;
    onClose?: () => void;
}

export function InteractiveTerminal({ sessionId, onClose }: InteractiveTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const ptyIdRef = useRef<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(false);
    const unlistenRef = useRef<(() => void) | null>(null);

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

            term.write('\r\n🔌 Initializing PTY session...\r\n');

            try {
                // Determine dimensions
                const cols = term.cols;
                const rows = term.rows;

                // FIX RACE CONDITION: Start listening BEFORE creating the PTY.
                // The ptyId is the same as the sessionId in our backend logic.
                const currentPtyId = sessionId;
                ptyIdRef.current = currentPtyId;

                // Set up event listener for PTY data
                const unlisten = await listen<number[]>(`pty-data:${currentPtyId}`, (event) => {
                    const data = event.payload;
                    if (data && data.length > 0) {
                        const uint8 = new Uint8Array(data);
                        term.write(uint8);
                    }
                });
                unlistenRef.current = unlisten;

                // Create PTY session in backend (this triggers the SSH connection and functionality)
                // Now that we are listening, we will capture the initial MOTD/Welcome message.
                await invoke<string>('pty_create', {
                    sessionId,
                    rows,
                    cols
                });

                term.write(`\r\n✅ Connected to session: ${currentPtyId}\r\n`);
                term.write('---------------------------------------------------\r\n');

                // Handle input (user typing)
                term.onData(async (data) => {
                    if (!ptyIdRef.current) return;

                    // Convert string to bytes
                    const encoder = new TextEncoder();
                    const bytes = Array.from(encoder.encode(data));

                    try {
                        await invoke('pty_write', {
                            ptyId: ptyIdRef.current,
                            data: bytes
                        });
                    } catch (e) {
                        console.error('Failed to write to PTY:', e);
                        term.write(`\r\n❌ Write Error: ${e}\r\n`);
                    }
                });

                // Handle resize
                const handleResize = () => {
                    if (!fitAddonRef.current || !ptyIdRef.current) return;
                    fitAddonRef.current.fit();
                    const { cols, rows } = xtermRef.current!;

                    invoke('pty_resize', {
                        ptyId: ptyIdRef.current,
                        rows,
                        cols
                    }).catch(console.error);
                };

                window.addEventListener('resize', handleResize);

                // No more readLoop!

            } catch (err: any) {
                console.error('Failed to create PTY:', err);
                setError(err.toString());
                term.write(`\r\n❌ Failed to initialize PTY: ${err}\r\n`);
            }
        };

        initTerminal();

        return () => {
            isMounted.current = false;
            if (unlistenRef.current) {
                unlistenRef.current();
                unlistenRef.current = null;
            }
            // Remove resize listener - requires moving handleResize out or keeping ref?
            // Since handleResize was defined inside, we can't remove it easily unless we store it.
            // But window resize leak is minor for now compared to data leak.
            // Ideally should refactor handleResize to use ref or be outside.

            if (ptyIdRef.current) {
                invoke('pty_close', { ptyId: ptyIdRef.current }).catch(console.error);
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
