import { uiText, uiFormat } from '../../lib/ui-language';
import { useEffect, useState } from 'react';
import { sendCommand, isWebView2 } from '../../lib/bridge';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { isLocalWorkspace } from '../../lib/workspace-mode';

type Transfer = { id: string; sessionId: string; direction: string; status: string; bytes: number; total: number; fileName: string | null; error: string | null };
const labels: Record<string,string> = { preparing: 'Eligiendo archivo o destino', transferring: 'Transfiriendo', cancelling: 'Cancelando', completed: 'Completada', cancelled: 'Cancelada', failed: uiText('Error') };
export function IdeTransferMonitor() {
    const [transfer, setTransfer] = useState<Transfer | null>(null);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const { tabs, nativeSessions } = useWorkspaceStore();
    const supported = isWebView2() && isLocalWorkspace();
    useEffect(() => {
        if (!supported) return;
        let active = true; let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            try { const value = await sendCommand<Transfer | null>('sftp_transfer_latest'); if (active) { setTransfer(value); setLoaded(true); setError(''); } }
            catch { if (active) setError(uiText('No se pudo actualizar la transferencia. El último estado puede estar desactualizado.')); }
            if (active) timer = setTimeout(poll, 750);
        };
        void poll(); return () => { active = false; clearTimeout(timer); };
    }, [supported]);
    if (!supported) return <p className="p-4 text-xs text-gray-500">{uiText("Las transferencias directas requieren el espacio local de Windows.")}</p>;
    const serverId = Object.entries(nativeSessions).find(([, session]) => session === transfer?.sessionId)?.[0];
    const server = tabs.find(tab => tab.serverId === serverId)?.server;
    const running = !!transfer && ['preparing','transferring','cancelling'].includes(transfer.status);
    return <div className="p-3 text-xs overflow-auto space-y-2">
        {error && <p role="alert" className="text-amber-300">{error}</p>}
        {!transfer && <p className="text-gray-500">{loaded ? uiText('No hay transferencias registradas en esta instancia.') : 'Consultando transferencias…'}</p>}
        {transfer && <>
            <div className="flex gap-3 items-start"><div className="min-w-0 flex-1"><p className="text-gray-200 break-all">{transfer.direction === 'upload' ? 'Subida' : 'Descarga'} · {transfer.fileName || 'Archivo pendiente de elegir'}</p><p className="text-gray-400 mt-1 break-all">{server ? `${server.hostname} · ${server.ip_address}` : uiFormat("Sesión {0}", transfer.sessionId)}</p></div><span className="text-blue-200">{labels[transfer.status] || transfer.status}</span></div>
            <progress aria-label="Progreso de transferencia SFTP" className="w-full h-1.5" max={Math.max(1,transfer.total)} value={transfer.bytes} />
            <p className="font-mono text-gray-400">{transfer.bytes.toLocaleString()} / {transfer.total.toLocaleString()} bytes</p>
            {running && <button disabled={busy || !!error || transfer.status === 'cancelling'} className="border border-[#666] rounded px-2 py-1 disabled:opacity-40" onClick={async () => {
                setBusy(true);
                try { await sendCommand('sftp_transfer_cancel', { sessionId:transfer.sessionId, id:transfer.id }); }
                catch { setError(uiText('No se pudo confirmar la cancelación. Comprueba el estado antes de repetir.')); }
                finally { setBusy(false); }
            }}>{busy ? 'Solicitando…' : uiText('Cancelar transferencia')}</button>}
            {transfer.error && <p className="text-red-300 break-words">{transfer.error}</p>}
            <p className="text-[11px] text-gray-500">{uiText("Última transferencia de la instancia · cerrar este panel no cancela la operación.")}</p>
        </>}
    </div>;
}
