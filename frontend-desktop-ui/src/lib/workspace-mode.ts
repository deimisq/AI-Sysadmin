import { isWebView2 } from './bridge';

export function isLocalWorkspace(): boolean {
    return isWebView2() && sessionStorage.getItem('workspace-mode') !== 'enterprise';
}

export function selectWorkspaceMode(mode: 'local' | 'enterprise') {
    if (mode === 'local' && !isWebView2()) throw new Error('El espacio local requiere el cliente Windows.');
    sessionStorage.setItem('workspace-mode', mode);
}
