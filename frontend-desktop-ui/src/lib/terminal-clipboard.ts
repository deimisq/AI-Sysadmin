interface ClipboardTerminal {
    getSelection(): string;
    onSelectionChange(listener: () => void): { dispose(): void };
    paste(text: string): void;
    focus(): void;
}

interface TextClipboard {
    readText(): Promise<string>;
    writeText(text: string): Promise<void>;
}

/** Scoped to one SSH terminal; never reads the clipboard without a right click. */
export function attachTerminalClipboard(
    terminal: ClipboardTerminal,
    element: HTMLElement,
    clipboard: TextClipboard,
    onError: (operation: 'copy' | 'paste') => void,
) {
    let disposed = false;
    let lastCopied = '';
    const selection = terminal.onSelectionChange(() => {
        const text = terminal.getSelection();
        if (!text) { lastCopied = ''; return; }
        if (text === lastCopied || disposed) return;
        lastCopied = text;
        // Start within the selection event to retain the browser's user activation.
        try {
            void clipboard.writeText(text).catch(() => {
                if (!disposed) { lastCopied = ''; onError('copy'); }
            });
        } catch { lastCopied = ''; onError('copy'); }
    });
    const mouseDown = (event: MouseEvent) => {
        if (event.button !== 2) return;
        // Prevent xterm from selecting a word and replacing the clipboard before paste.
        event.preventDefault();
        event.stopPropagation();
    };
    const contextMenu = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (disposed) return;
        try {
            void clipboard.readText().then(text => {
                if (disposed || !element.getClientRects().length || !text) return;
                terminal.focus();
                // xterm preserves bracketed-paste mode and normalizes terminal line endings.
                terminal.paste(text);
            }).catch(() => { if (!disposed) onError('paste'); });
        } catch { onError('paste'); }
    };
    element.addEventListener('mousedown', mouseDown, true);
    element.addEventListener('contextmenu', contextMenu, true);
    return () => {
        disposed = true;
        selection.dispose();
        element.removeEventListener('mousedown', mouseDown, true);
        element.removeEventListener('contextmenu', contextMenu, true);
    };
}
