"use client";

import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalComponentProps {
    onCommand?: (command: string) => Promise<string>;
    externalCommand?: string; // To receive commands from AI
    hostname?: string; // Server hostname for prompt
    websocketUrl?: string; // For real SSH connection
    externalOutput?: string; // To inject output directly from API
}

export default function TerminalComponent({ onCommand, externalCommand, hostname = 'server', websocketUrl, externalOutput }: TerminalComponentProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const commandRef = useRef("");
    const socketRef = useRef<WebSocket | null>(null);

    // Create prompt with dynamic hostname (Legacy mode)
    const getPrompt = useCallback(() => {
        return `\x1b[1;32mroot@${hostname}\x1b[0m:\x1b[1;34m~\x1b[0m# `;
    }, [hostname]);

    // Define handleCommand (Legacy mode)
    const handleCommand = useCallback(async (term: Terminal, cmd: string) => {
        if (!onCommand) return;
        term.write('\r\n');
        if (!cmd.trim()) {
            term.write(getPrompt());
            return;
        }

        try {
            const output = await onCommand(cmd);
            // Fix newlines for xterm
            const formattedOutput = output.replace(/\n/g, '\r\n');
            term.write(formattedOutput);
            if (!formattedOutput.endsWith('\n')) term.write('\r\n');
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            term.write(`\x1b[1;31mError executing command: ${errorMsg}\x1b[0m\r\n`);
        }

        commandRef.current = "";
        term.write(getPrompt());
    }, [onCommand, getPrompt]);

    // Initialize Terminal
    useEffect(() => {
        if (!terminalRef.current || xtermRef.current) return;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#f0f0f0',
                cursor: '#ffffff',
                selectionBackground: 'rgba(255, 255, 255, 0.3)',
            },
            allowProposedApi: true,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);

        term.open(terminalRef.current);
        // Delay fit to ensure DOM is ready and preventing 'dimensions' undefined error
        setTimeout(() => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.error("Fit error:", e);
            }
        }, 100);

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Handle Resize
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        // --- WEBSOCKET MODE ---
        if (websocketUrl) {
            term.writeln(`\x1b[1;33mConnecting to ${hostname}...\x1b[0m`);

            const socket = new WebSocket(websocketUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                term.writeln('\x1b[1;32mConnected via Secure Shell (WebSocket)\x1b[0m');
                term.writeln('');
                fitAddon.fit();
                // Send initial resize if possible (needs protocol support)
            };

            socket.onmessage = (event) => {
                term.write(event.data);
            };

            socket.onclose = () => {
                term.writeln('\r\n\x1b[1;31mConnection closed.\x1b[0m');
            };

            socket.onerror = (error) => {
                console.error("WebSocket Error:", error);
                term.writeln('\r\n\x1b[1;31mConnection Error\x1b[0m');
            };

            term.onData(data => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(data);
                }
            });
        }
        // --- LEGACY MODE ---
        else if (onCommand) {
            // Initial greeting
            term.writeln('\x1b[1;32mAI Sysadmin Agent Console (Legacy Mode)\x1b[0m');
            term.writeln(`Connected to: \x1b[1;33m${hostname}\x1b[0m`);
            term.writeln('');
            term.write(getPrompt());

            // Handle Input
            term.onData(e => {
                switch (e) {
                    case '\r': // Enter
                        handleCommand(term, commandRef.current);
                        break;
                    case '\u007F': // Backspace (DEL)
                        if (commandRef.current.length > 0) {
                            commandRef.current = commandRef.current.slice(0, -1);
                            term.write('\b \b');
                        }
                        break;
                    case '\u0003': // Ctrl+C
                        term.write('^C\r\n');
                        term.write(getPrompt());
                        commandRef.current = "";
                        break;
                    default:
                        if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7e) || e >= '\u00a0') {
                            commandRef.current += e;
                            term.write(e);
                        }
                }
            });
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (socketRef.current) {
                socketRef.current.close();
            }
            term.dispose();
            xtermRef.current = null;
        };
    }, [websocketUrl, hostname]); // Re-init if WS URL changes

    // Handle external commands (AI) - Works for both modes
    useEffect(() => {
        if (!externalCommand || !xtermRef.current) return;

        const term = xtermRef.current;
        const socket = socketRef.current;

        if (socket && socket.readyState === WebSocket.OPEN) {
            // In WebSocket mode, just send the command as keystrokes + Enter
            socket.send(externalCommand);
            socket.send('\r'); // Enter
        } else if (onCommand) {
            // Legacy mode
            term.write('\x1b[2K\r');
            term.write(`${getPrompt()}${externalCommand}`);
            commandRef.current = externalCommand;
            handleCommand(term, externalCommand);
        }
    }, [externalCommand, onCommand, getPrompt, handleCommand]);

    // Handle external output (For injecting API results)
    useEffect(() => {
        if (!externalOutput || !xtermRef.current) return;

        // Convert newlines to CRLF for xterm
        const formatted = externalOutput.replace(/\n/g, '\r\n');
        xtermRef.current.write(formatted);

        // Add a prompt after output if needed? 
        // Better to let page handle prompt or just carriage return
        xtermRef.current.write('\r\n');
    }, [externalOutput]);

    return (
        <div className="h-full w-full bg-[#1e1e1e] p-2 rounded-md overflow-hidden">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
}
