import { Component, type ReactNode } from 'react';
import { notifyDesktopFailure } from '../../lib/bridge';

export class DesktopErrorBoundary extends Component<{ children: ReactNode },{ failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { notifyDesktopFailure(); }
    render() {
        if (!this.state.failed) return this.props.children;
        return <div role="alert" className="h-screen flex items-center justify-center bg-[#1a1b1e] text-gray-200 p-8"><div className="max-w-md space-y-4"><h1 className="text-xl font-semibold">No pudimos abrir el espacio de trabajo</h1><p>Tus conexiones guardadas se conservan. Podés reiniciar la interfaz para continuar.</p><button className="bg-blue-600 rounded px-4 py-2" onClick={() => window.location.reload()}>Reiniciar interfaz</button></div></div>;
    }
}
