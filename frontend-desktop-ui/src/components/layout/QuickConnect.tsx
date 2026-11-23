import { uiText } from '../../lib/ui-language';
import { useState } from 'react';
import { Plug } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { isWebView2, isTauri } from '../../lib/bridge';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { parseQuickTarget } from '../../lib/quick-connect';

let nextTemporaryId = -1;

export function QuickConnect() {
    const [username, setUsername] = useState('');
    const [target, setTarget] = useState('');
    const [protocol, setProtocol] = useState<'ssh' | 'rdp' | 'sftp'>('ssh');
    const [pending, setPending] = useState<{ host: string; port: number; username: string; protocol: 'ssh' | 'rdp' | 'sftp' } | null>(null);
    const [password, setPassword] = useState('');
    const [keyPath, setKeyPath] = useState('');
    const [error, setError] = useState('');
    const reset = () => { setPending(null); setPassword(''); setKeyPath(''); };
    return <>
        <form className="quick-connect" aria-label={uiText("Conexión rápida")} onSubmit={event => {
            event.preventDefault(); setError('');
            try {
                if (!isWebView2() && !isTauri()) throw new Error(uiText('La conexión directa requiere la app de escritorio.'));
                if (!username.trim()) throw new Error(uiText('Indica el usuario.'));
                setPending({ ...parseQuickTarget(target, protocol), username: username.trim(), protocol });
            } catch (e) { setError((e as Error).message); }
        }}>
            <span className="quick-connect-label" aria-hidden="true">{uiText("Conexión rápida")}</span>
            <input title={uiText("Usuario con el que iniciar sesión")} aria-label={uiText("Usuario de conexión rápida")} placeholder={uiText("Usuario")} value={username} onChange={e => setUsername(e.target.value)} required autoComplete="off" />
            <input title={uiText("Dirección o nombre del servidor; opcionalmente :puerto")} aria-label={uiText("Servidor de conexión rápida")} placeholder={uiText("Servidor[:puerto]")} value={target} onChange={e => setTarget(e.target.value)} required autoComplete="off" />
            <select aria-label={uiText("Protocolo de conexión rápida")} value={protocol} onChange={e => setProtocol(e.target.value as typeof protocol)}><option value="ssh">SSH</option><option value="rdp">RDP</option><option value="sftp">SFTP</option></select>
            <button type="submit" title={uiText("Conectar directamente")} aria-label={uiText("Conectar directamente")}><Plug size={13} /><span>{uiText("Conectar")}</span></button>
            {error && <span role="alert" className="quick-connect-error" onClick={() => setError('')}>{error}</span>}
        </form>
        <Dialog open={!!pending} onOpenChange={open => { if (!open) reset(); }}>
            <DialogContent className="bg-[#252526] text-gray-200 max-w-sm">
                <DialogTitle>{uiText("Conectar por")}{" "}{pending?.protocol.toUpperCase()}</DialogTitle>
                <DialogDescription>{pending?.username}@{pending?.host}:{pending?.port}{uiText(". Sesión temporal; no se guarda en el inventario.")}</DialogDescription>
                <form className="space-y-3" onSubmit={event => {
                    event.preventDefault(); if (!pending) return;
                    const id = nextTemporaryId--;
                    useWorkspaceStore.getState().openTab({ type: 'terminal', serverId: String(id), title: pending.host,
                        server: { id, hostname: pending.host, ip_address: pending.host, description: '', os_info: pending.protocol === 'rdp' ? 'Windows' : '',
                            connection_protocol: pending.protocol === 'rdp' ? 'rdp' : 'ssh', ssh_port: pending.port, rdp_port: pending.port,
                            ssh_username: pending.username, ssh_password: password, ssh_key_path: pending.protocol === 'rdp' ? undefined : keyPath.trim(),
                            quick_protocol: pending.protocol } });
                    reset();
                }}>
                    <label className="block text-xs">{uiText("Contraseña")}<input autoFocus type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full mt-1 p-2 bg-[#181818] border border-[#444] rounded" /></label>
                    {pending?.protocol !== 'rdp' && <label className="block text-xs">{uiText("Ruta de clave privada (opcional)")}<input value={keyPath} onChange={e => setKeyPath(e.target.value)} className="block w-full mt-1 p-2 bg-[#181818] border border-[#444] rounded" placeholder="C:\\Users\\…\\.ssh\\id_ed25519" /></label>}
                    <p className="text-xs text-gray-400">{uiText("Las credenciales se mantienen en memoria durante la sesión.")}</p>
                    <div className="flex justify-end gap-2"><button type="button" onClick={reset} className="px-3 py-1 border border-[#444] rounded">{uiText("Cancelar")}</button><button type="submit" className="px-3 py-1 bg-blue-600 rounded">{uiText("Conectar")}</button></div>
                </form>
            </DialogContent>
        </Dialog>
    </>;
}
