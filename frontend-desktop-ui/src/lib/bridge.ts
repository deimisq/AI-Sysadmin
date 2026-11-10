import { invoke } from '@tauri-apps/api/core';

type HostMessage = { requestId?: string; result?: unknown; error?: string };
type WebViewHost = {
    postMessage(message: unknown): void;
    addEventListener(type: 'message', handler: (event: MessageEvent<HostMessage>) => void): void;
    removeEventListener(type: 'message', handler: (event: MessageEvent<HostMessage>) => void): void;
};

function webView(): WebViewHost | undefined {
    return (window as unknown as { chrome?: { webview?: WebViewHost } }).chrome?.webview;
}

export const isWebView2 = () => !!webView();
export const isTauri = () => '__TAURI_INTERNALS__' in window;
export const hasNativePreferences = () => typeof window !== 'undefined' && (window as unknown as { __AI_AGENT_NATIVE_PREFERENCES__?: boolean }).__AI_AGENT_NATIVE_PREFERENCES__ === true;
export const isPreferencesWindow = () => typeof window !== 'undefined' && (window as unknown as { __AI_AGENT_PREFERENCES_WINDOW__?: boolean }).__AI_AGENT_PREFERENCES_WINDOW__ === true;
export function notifyDesktopReady() {
    webView()?.postMessage({ type: 'DESKTOP_UI_READY' });
}
export function notifyDesktopFailure() {
    webView()?.postMessage({ type: 'DESKTOP_UI_FAILED' });
}

const commands: Record<string, string> = {
    start_embedded_rdp_command: 'START_RDP',
    stop_embedded_rdp_command: 'STOP_RDP',
    close_native_rdp: 'STOP_RDP',
    update_native_rdp_bounds: 'RDP_BOUNDS',
};

export async function sendCommand<T = any>(command: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (isTauri()) return invoke<T>(command, payload);
    const host = webView();
    if (!host) throw new Error('Esta función requiere la aplicación de escritorio Windows.');
    const requestId = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => {
        const cleanup = () => { clearTimeout(timer); host.removeEventListener('message', handler); };
        const handler = (event: MessageEvent<HostMessage>) => {
            if (event.data.requestId !== requestId) return;
            cleanup();
            if (event.data.error) reject(new Error(event.data.error));
            else resolve(event.data.result as T);
        };
        const timer = setTimeout(() => { cleanup(); reject(new Error(`Tiempo de espera agotado: ${command}`)); }, command === 'local_chat_execute' ? 24 * 60 * 60 * 1000 : command === 'local_ai_diagnose' ? 130000 : 35000);
        host.addEventListener('message', handler);
        try { host.postMessage({ type: commands[command] || command.toUpperCase(), requestId, payload }); }
        catch (error) { cleanup(); reject(error); }
    });
}
