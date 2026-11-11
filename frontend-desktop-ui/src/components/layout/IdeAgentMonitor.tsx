import { uiText } from '../../lib/ui-language';
import { useEffect, useState } from 'react';
import { isWebView2, sendCommand } from '../../lib/bridge';
import { isLocalWorkspace } from '../../lib/workspace-mode';

type TaskSnapshot = { Id: string; Hostname: string; Objective: string; Status: string; Events: { At: string; Kind: string; Text: string; ExitCode: number | null }[] };
const labels: Record<string, string> = { running: uiText('En ejecución'), completed: uiText('Finalizada según la IA'), blocked: uiText('Necesita intervención'), failed: 'Detenida por error', cancelled: 'Cancelada o plazo agotado', limited: uiText('Límite alcanzado'), interrupted: 'Interrumpida' };

export function IdeAgentMonitor() {
    const [task, setTask] = useState<TaskSnapshot | null>(null);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const supported = isWebView2() && isLocalWorkspace();
    useEffect(() => {
        if (!supported) return;
        let active = true; let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            try { const snapshot = await sendCommand<TaskSnapshot | null>('local_task_status'); if (active) { setTask(snapshot); setLoaded(true); setError(''); } }
            catch { if (active) setError(uiText('No se pudo actualizar el estado. El último resultado puede estar desactualizado.')); }
            if (active) timer = setTimeout(poll, 1500);
        };
        void poll();
        return () => { active = false; clearTimeout(timer); };
    }, [supported]);
    if (!supported) return <p className="p-4 text-xs text-gray-500">{uiText("El seguimiento de tareas está disponible en el espacio local de Windows.")}</p>;
    return <div className="h-full overflow-auto text-xs">
        {error && <p role="alert" className="px-3 py-2 text-amber-300">{error}</p>}
        {!task && <p className="p-4 text-gray-500">{loaded ? uiText('No hay tareas registradas. Inicia un objetivo desde el acompañante IA de una conexión SSH.') : 'Consultando el agente local…'}</p>}
        {task && <>
            <div className="px-3 py-2 border-b border-[#333] flex items-start gap-3">
                <div className="min-w-0 flex-1"><p className="text-blue-200 font-medium">{task.Hostname} · {labels[task.Status] || task.Status}</p><p className="text-gray-400 mt-1 whitespace-pre-wrap break-words">{task.Objective}</p></div>
                {task.Status === 'running' && <button disabled={cancelling || !!error} className="border border-[#666] px-2 py-1 rounded text-red-300 disabled:opacity-40" onClick={async () => {
                    setCancelling(true);
                    try { await sendCommand('local_task_cancel', { id: task.Id }); }
                    catch { setError(uiText('No se pudo confirmar la cancelación. Comprueba el estado antes de repetir.')); }
                    finally { setCancelling(false); }
                }}>{cancelling ? 'Solicitando…' : uiText('Cancelar tarea')}</button>}
            </div>
            <p className="px-3 py-1 text-[10px] text-gray-500">{uiText("Última tarea de esta instancia · cancelar no revierte cambios · el resultado debe verificarse.")}</p>
            {task.Events.map((event, index) => <details key={`${task.Id}-${index}`} className="border-b border-[#303030] px-3 py-1.5"><summary className="cursor-pointer text-gray-400"><span className="font-mono mr-2">{new Date(event.At).toLocaleTimeString()}</span>{event.Kind}{event.ExitCode !== null ? ` · salida ${event.ExitCode}` : ''}</summary><pre className="font-mono text-[11px] whitespace-pre-wrap break-words text-gray-200 py-2">{event.Text}</pre></details>)}
        </>}
    </div>;
}
