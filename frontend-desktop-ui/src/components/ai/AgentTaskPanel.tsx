import { uiText } from '../../lib/ui-language';
import { useEffect, useRef, useState } from 'react';
import { sendCommand } from '../../lib/bridge';
import { type Server } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { AssistantTextarea } from './AssistantTextarea';

type TaskView = { Id: string; ServerId: number; Hostname: string; Objective: string; Status: string; Events: { At: string; Kind: string; Text: string; ExitCode: number | null }[] };
const labels: Record<string, string> = { running: uiText('En ejecución'), completed: uiText('Finalizada según la IA'), blocked: uiText('Necesita tu intervención'), failed: 'Detenida por error', cancelled: 'Cancelada o plazo agotado', limited: uiText('Límite alcanzado'), interrupted: uiText('Interrumpida al cerrar la aplicación') };

export function AgentTaskPanel({ server, enabled, onRunningChange }: { server: Server | null; enabled: boolean; onRunningChange: (running: boolean) => void }) {
    const [objective, setObjective] = useState('');
    const [authorized, setAuthorized] = useState(false);
    const [task, setTask] = useState<TaskView | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [connected, setConnected] = useState(false);
    const requestId = useRef(crypto.randomUUID().replaceAll('-', ''));
    const session = useWorkspaceStore(state => server ? state.nativeSessions[server.id] : undefined);
    useEffect(() => onRunningChange(task?.Status === 'running'), [task?.Status, onRunningChange]);
    useEffect(() => {
        let active = true; let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            try { const value = await sendCommand<TaskView | null>('local_task_status'); if (active) { setTask(value); setConnected(true); } }
            catch { if (active) setConnected(false); }
            finally { if (active) timer = setTimeout(poll, 1500); }
        };
        void poll(); return () => { active = false; clearTimeout(timer); };
    }, []);
    useEffect(() => { setAuthorized(false); requestId.current = crypto.randomUUID().replaceAll('-', ''); }, [server?.id, session, objective]);
    const start = async () => {
        if (!server || !session) return;
        setBusy(true); setError('');
        try {
            setTask(await sendCommand<TaskView>('local_task_start', { task_id: requestId.current, server_id: server.id, session_id: session, objective, authorized,
                expected_target: { address: server.ip_address, protocol: server.connection_protocol || 'ssh', port: server.ssh_port || 22 } }));
            setAuthorized(false);
            requestId.current = crypto.randomUUID().replaceAll('-', '');
        } catch (e) { setError(e instanceof Error ? e.message : uiText('No se pudo iniciar. Consulta el estado antes de repetir.')); }
        finally { setBusy(false); }
    };
    return <section className="p-3 space-y-3 text-xs overflow-y-auto overflow-x-hidden flex-1 min-h-0 min-w-0 [overflow-wrap:anywhere]" aria-label="Agente de tareas SSH">
        <p>{uiText("Describe el objetivo. El agente ejecutará comandos en una sesión SSH de este equipo, observará los resultados y decidirá los siguientes pasos.")}</p>
        <AssistantTextarea aria-label="Objetivo de la tarea" className="w-full min-h-24 p-2 bg-[#252526] border border-[#444] rounded" value={objective} maxLength={16000} onChange={e => setObjective(e.target.value)} placeholder={uiText("Por ejemplo: investiga por qué falla el servicio y corrige su configuración…")} />
        <p>{uiText("Destino:")}{" "}<strong>{server ? `${server.hostname} · ${server.ip_address}:${server.ssh_port || 22}` : uiText('Selecciona un servidor')}</strong>{uiText(". Hasta 10 comandos y 5 minutos. Los comandos usan shells independientes; no admiten interacción.")}</p>
        <label className="flex gap-2 items-start"><input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} /><span>{uiText("Autorizo al agente a ejecutar los pasos necesarios para este objetivo con los permisos del usuario SSH. Puede modificar el servidor y enviar comandos y resultados a mi proveedor IA. Cancelar no revierte cambios.")}</span></label>
        {!session && <p className="text-amber-300">{uiText("Abre la conexión SSH local para ejecutar una tarea. RDP todavía no admite este modo.")}</p>}
        {!connected && <p className="text-amber-300">{uiText("Sin comunicación con el agente nativo. No se puede iniciar otra tarea.")}</p>}
        <button className="bg-purple-600 rounded px-3 py-2 disabled:opacity-40" disabled={!connected || !enabled || !session || !authorized || !objective.trim() || busy || task?.Status === 'running'} onClick={start}>{uiText("Autorizar y ejecutar tarea")}</button>
        {error && <p role="alert" className="text-red-300">{error}</p>}
        {task && <div className="border-t border-[#444] pt-3 space-y-2">
            <p className="font-semibold">{labels[task.Status] || task.Status} · {task.Hostname}</p><p>{task.Objective}</p>
            {task.Status === 'running' && <button className="border border-red-400 rounded px-3 py-2" onClick={async () => { try { await sendCommand('local_task_cancel', { id: task.Id }); } catch { setError(uiText('No se pudo confirmar la cancelación. Verifica la conexión y el servidor.')); } }}>{uiText("Cancelar tarea")}</button>}
            <button className="block underline" onClick={() => {
                const url = URL.createObjectURL(new Blob([JSON.stringify(task, null, 2)], { type: 'application/json' }));
                const link = document.createElement('a'); link.href = url; link.download = `tarea-${task.Id}.json`; link.click(); URL.revokeObjectURL(url);
            }}>{uiText("Exportar registro (puede contener datos sensibles)")}</button>
            {task.Events.map((event, index) => <div key={index} className="bg-[#252526] border border-[#333] p-2 rounded"><p className="text-gray-400">{new Date(event.At).toLocaleTimeString()} · {event.Kind}{event.ExitCode != null ? ` · salida ${event.ExitCode}` : ''}</p><pre className="whitespace-pre-wrap break-words font-mono text-xs mt-1">{event.Text}</pre></div>)}
        </div>}
    </section>;
}
