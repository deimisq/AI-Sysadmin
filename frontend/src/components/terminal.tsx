"use client";

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalComponentProps {
    onCommand: (command: string) => Promise<string>;
    externalCommand?: string; // To receive commands from AI
}

export default function TerminalComponent({ onCommand, externalCommand }: TerminalComponentProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const commandRef = useRef("");

    // Handle external commands (from AI)
    useEffect(() => {
        if (externalCommand && xtermRef.current) {
            const term = xtermRef.current;
            // Clear current line
            term.write('\x1b[2K\r');
            // Write prompt and command
            term.write(`\x1b[1;32muser@server:~\x1b[0m$ ${externalCommand}`);
            commandRef.current = externalCommand;
            // Simulate Enter
            handleCommand(term, externalCommand);
        }
    }, [externalCommand]);

    const handleCommand = async (term: Terminal, cmd: string) => {
        term.write('\r\n');
        if (!cmd.trim()) {
            term.write('\x1b[1;32muser@server:~\x1b[0m$ ');
            return;
        }

        try {
            const output = await onCommand(cmd);
            // Fix newlines for xterm
            const formattedOutput = output.replace(/\n/g, '\r\n');
            term.write(formattedOutput);
            if (!formattedOutput.endsWith('\n')) term.write('\r\n');
        } catch (error) {
            term.write(`\x1b[1;31mError executing command: ${error}\x1b[0m\r\n`);
        }

        commandRef.current = "";
        term.write('\x1b[1;32muser@server:~\x1b[0m$ ');
    };

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
            convertEol: true, // Important for proper newline handling
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        // Initial greeting
        term.writeln('\x1b[1;32mAI Sysadmin Agent Console\x1b[0m');
        term.writeln('Connected via Secure API Gateway');
        term.writeln('');
        term.write('\x1b[1;32muser@server:~\x1b[0m$ ');

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
                    term.write('\x1b[1;32muser@server:~\x1b[0m$ ');
                    commandRef.current = "";
                    break;
                default: // Print all other characters for demonstration
                    if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7e) || e >= '\u00a0') {
                        commandRef.current += e;
                        term.write(e);
                    }
            }
        });

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            xtermRef.current = null;
        };
    }, []); // Removed onCommand dependency to avoid re-init

    return (
        <div className="h-full w-full bg-[#1e1e1e] p-2 rounded-md overflow-hidden">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
}
