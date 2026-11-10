import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Copy, Play, X, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { api, diagnoseProblem } from '../../lib/api';
import { notifyAiConfiguration, type LocalAiConfiguration } from './LocalAiSettings';
import { type Server } from '../../lib/api';
import { toast } from 'sonner';
import { isLocalWorkspace } from '../../lib/workspace-mode';
import { type AiEvidence, type AiHistoryTurn } from '../../lib/ai-evidence';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { AgentTaskPanel } from './AgentTaskPanel';
import { AssistantTextarea } from './AssistantTextarea';
import { sendCommand } from '../../lib/bridge';
import ReactMarkdown from 'react-markdown';

export function AIChatPanel() {
    const { tabs, activeTabId } = useWorkspaceStore();
    // Get current context server
    const activeTab = tabs.find(t => t.id === activeTabId);
    const server = activeTab?.server || null;
    if (server?.quick_protocol && !isLocalWorkspace()) return <p className="p-3 text-xs text-gray-400">La IA de conexiones temporales requiere el espacio local de Windows.</p>;
    return <ServerAssistant key={server?.id ?? 'none'} server={server} />;
}

function ServerAssistant({ server }: { server: Server | null }) {
    const local = isLocalWorkspace();
    const sshSession = useWorkspaceStore(state => server ? state.nativeSessions[server.id] : undefined);
    const [permission, setPermission] = useState('ask');
    const [executing, setExecuting] = useState(false);
    const [commandResults, setCommandResults] = useState<Record<string, string>>({});
    const [usedProposals, setUsedProposals] = useState<string[]>([]);
    const [approvalScope, setApprovalScope] = useState('once');
    const automaticSteps = useRef(0);
    const currentObjective = useRef('');
    useEffect(() => {
        setPermission('ask');
        if (!local || !server || !sshSession) return;
        let active = true;
        sendCommand<{ scope: string }>('local_chat_permission', { server_id: server.id, session_id: sshSession }).then(result => { if (active) setPermission(result.scope); }).catch(() => {});
        return () => { active = false; };
    }, [local, server?.id, sshSession]);
    const temporarySshSession = useWorkspaceStore(state => server?.quick_protocol && server.quick_protocol !== 'rdp' ? state.nativeSessions[server.id] : undefined);
    const waitingForTemporarySsh = !!server?.quick_protocol && server.quick_protocol !== 'rdp' && !temporarySshSession;
    const [mode, setMode] = useState<'chat' | 'task'>('chat');
    const [taskRunning, setTaskRunning] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(local && !!server);
    const [historyError, setHistoryError] = useState(false);
    const [historyRefresh, setHistoryRefresh] = useState(0);
    const [showClearHistory, setShowClearHistory] = useState(false);
    const [clearingHistory, setClearingHistory] = useState(false);
    const [consent, setConsent] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [configuration, setConfiguration] = useState<LocalAiConfiguration | null>(null);
    useEffect(() => {
        if (!local) return;
        let active = true;
        let configurationVersion = 0;
        const refresh = () => {
            const version = ++configurationVersion;
            requestVersion.current += 1;
            setAccepted(false); setLoading(false);
            api.get<LocalAiConfiguration>('/ai/settings').then(data => { if (active && version === configurationVersion) { setConfiguration(data); setAccepted(data.consent_accepted); } }).catch(() => { if (active && version === configurationVersion) { setConfiguration(null); setAccepted(false); } });
        };
        refresh(); window.addEventListener('local-ai-settings-changed', refresh);
        return () => { active = false; window.removeEventListener('local-ai-settings-changed', refresh); };
    }, [local]);
    const requestVersion = useRef(0);
    useEffect(() => () => { requestVersion.current += 1; }, []);

    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, command?: string, proposalId?: string, objective?: string, evidence?: AiEvidence | null, date?: string, target?: string, provider?: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!server?.quick_protocol) return;
        requestVersion.current += 1;
        setLoading(false);
        const changed = (event: Event) => {
            if ((event as CustomEvent).detail?.serverId !== server.id) return;
            requestVersion.current += 1;
            setMessages([]); setLoading(false); setHistoryRefresh(value => value + 1);
        };
        window.addEventListener('local-temporary-target-changed', changed);
        return () => window.removeEventListener('local-temporary-target-changed', changed);
    }, [server?.id, temporarySshSession]);
    const messagesRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!local || !server) return;
        let active = true;
        setHistoryLoading(true); setHistoryError(false);
        api.get<AiHistoryTurn[]>(`/servers/${server.id}/history`).then(turns => {
            if (!active) return;
            setMessages(turns.filter(turn => turn.kind !== 'command' && turn.kind !== 'result').flatMap(turn => [
                ...(turn.kind === 'continuation' ? [] : [
                { role: 'user' as const, content: turn.query, evidence: turn.evidence, date: turn.created_at, target: `${turn.hostname} · ${turn.address}` },
                ]),
                { role: 'ai' as const, content: turn.analysis, command: turn.command || undefined, date: turn.created_at, provider: `${turn.provider} · ${turn.model}`, target: `${turn.hostname} · ${turn.address}` },
            ]));
        }).catch(() => { if (active) setHistoryError(true); }).finally(() => { if (active) setHistoryLoading(false); });
        return () => { active = false; };
    }, [local, server?.id, historyRefresh, temporarySshSession]);

    // Scroll to bottom on new message
    useEffect(() => {
        const container = messagesRef.current;
        container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, [messages, mode]);

    const handleSend = async () => {
        if (!input.trim() || loading || executing || historyLoading || clearingHistory || !server || !accepted || waitingForTemporarySsh) return;
        automaticSteps.current = 0;
        const version = ++requestVersion.current;

        const userMsg = input;
        setUsedProposals(previous => [...previous, ...messages.flatMap(message => message.proposalId ? [message.proposalId] : [])]);
        currentObjective.current = userMsg;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, target: `${server.hostname} · ${server.ip_address}` }]);
        setLoading(true);

        try {
            if (server) {
                // Server context mode
                const res = await diagnoseProblem(server.id, userMsg, 'es', '2026-10-25', undefined, local ? server : undefined, local ? useWorkspaceStore.getState().nativeSessions[server.id] : undefined);
                if (version !== requestVersion.current) return;

                // Parse response
                let analysis = "No analysis received";
                let command = undefined;

                if (res.analysis) {
                    if (typeof res.analysis === 'string') {
                        analysis = res.analysis;
                    } else {
                        analysis = res.analysis.analysis || JSON.stringify(res.analysis);
                        command = res.analysis.proposed_command;
                    }
                }

                setMessages(prev => [...prev, { role: 'ai', content: analysis, command, proposalId: res.proposal_id || undefined, objective: userMsg, target: `${server.hostname} · ${server.ip_address}` }]);
                if (local) {
                    if (res.context_truncated) toast.info('La IA recibió la ventana reciente configurada. El comienzo de la sesión no fue incluido.');
                    if (res.history_saved === false) toast.warning('La respuesta llegó, pero no se guardó en el historial. El destino pudo cambiar o el almacenamiento no está disponible.');
                }
            }
        } catch (e: any) {
            if (version !== requestVersion.current) return;
            console.error(e);
            setMessages(prev => [...prev, { role: 'ai', content: `Error: ${e.message || "Failed to contact AI"}` }]);
        } finally {
            if (version === requestVersion.current) setLoading(false);
        }
    };

    const handleRunCommand = async (cmd: string) => {
        try {
            await navigator.clipboard.writeText(cmd);
            toast.success('Comando copiado. Revisalo antes de ejecutarlo.');
        } catch {
            toast.error('No se pudo copiar el comando. Podés seleccionarlo manualmente.');
        }
    };

    const executeProposal = async (proposalId: string, scope: string) => {
        if (!server || !sshSession || executing || loading || usedProposals.includes(proposalId)) return;
        const version = requestVersion.current;
        const objective = messages.find(message => message.proposalId === proposalId)?.objective || currentObjective.current;
        setExecuting(true); setUsedProposals(previous => [...previous, proposalId]);
        try {
            const result = await sendCommand<{ Output: string; ExitCode: number | null; Status?: string; Truncated?: boolean }>('local_chat_execute', { proposal_id: proposalId, scope });
            if (scope === 'session' || scope === 'always') setPermission(scope);
            if (version !== requestVersion.current) return;
            const interrupted = result.Status === 'interrupted' || result.Status === 'disconnected';
            if (interrupted) { automaticSteps.current = 10; setPermission('ask'); }
            const status = result.Status === 'interrupted' ? 'Comando interrumpido' : result.Status === 'disconnected' ? 'Sesión desconectada' : result.ExitCode == null ? 'La terminal volvió al prompt · código de salida no disponible' : `Salida ${result.ExitCode}`;
            setCommandResults(previous => ({ ...previous, [proposalId]: `${status}${result.Truncated ? ' · captura parcial' : ''}\n${result.Output}` }));
            if (interrupted) setMessages(previous => [...previous, { role: 'ai', content: `${status}. No se confirmó que la operación terminara. Voy a revisar la salida disponible sin reintentar el comando.` }]);
            setLoading(true);
            const reply = await diagnoseProblem(server.id, `Objetivo actual del técnico: ${objective}\nEstado observado: ${status}. ${interrupted ? 'La operación se interrumpió o perdió la conexión. Analizá la salida parcial y explicá qué quedó sin verificar. No la reintentes ni propongas repetir la actualización automáticamente.' : 'Analizá la salida disponible; volver al prompt no demuestra éxito y no proporciona un código de salida. Distinguí qué quedó verificado y qué falta para el objetivo.'}`, 'es', '2026-10-25', undefined, server, sshSession, true);
            if (version !== requestVersion.current) return;
            const analysis = typeof reply.analysis === 'string' ? reply.analysis : reply.analysis?.analysis || 'Sin análisis';
            const command = typeof reply.analysis === 'object' ? reply.analysis.proposed_command : undefined;
            setMessages(previous => [...previous, { role: 'ai', content: analysis, command, proposalId: reply.proposal_id || undefined, objective }]);
        } catch (error) {
            if (version !== requestVersion.current) return;
            automaticSteps.current = 10; setPermission('ask');
            const detail = error instanceof Error ? error.message : 'No se pudo confirmar el resultado.';
            setCommandResults(previous => ({ ...previous, [proposalId]: detail }));
            setMessages(previous => [...previous, { role: 'ai', content: `No se pudo completar la ejecución o el análisis: ${detail}\nRevisá la terminal antes de repetir el comando. No se reintentó automáticamente.` }]);
        } finally { setExecuting(false); if (version === requestVersion.current) setLoading(false); }
    };
    useEffect(() => {
        if (!local || !accepted || executing || loading || clearingHistory || permission === 'ask') return;
        const latest = messages[messages.length - 1];
        if (!latest?.proposalId || usedProposals.includes(latest.proposalId) || automaticSteps.current >= 10) return;
        automaticSteps.current++;
        void executeProposal(latest.proposalId, 'auto');
    }, [messages, permission, executing, loading, accepted, clearingHistory]);

    return (
        <div className="assistant-panel flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-[#1e1e1e] border-l border-[#333]">
            {/* Header */}
            <div className="p-2 border-b border-[#333] flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#252526] select-none">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Acompañante IA</span>
                </div>

                {local && server && <button aria-label="Limpiar chat" title="Limpiar chat y empezar una conversación nueva" disabled={executing || clearingHistory || historyLoading} className="ml-auto p-1 rounded hover:bg-[#333] disabled:opacity-40" onClick={() => setShowClearHistory(true)}><Trash2 className="w-3.5 h-3.5" /></button>}
                {server ? (
                    <span className="text-blue-400 ml-2 truncate max-w-[120px] px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                        {server.hostname}
                    </span>
                ) : (
                    <span className="text-gray-400 ml-2">Sin servidor</span>
                )}
            </div>

            {server?.quick_protocol && <p className="px-2 py-1 text-[11px] text-gray-400 border-b border-[#333]">Conexión temporal: conversación en memoria hasta cerrar la sesión.{server.quick_protocol === 'rdp' ? ' Sin captura de pantalla ni control de RDP.' : ' El registro cifrado de terminal y las auditorías conservan su retención local.'}</p>}
            {waitingForTemporarySsh && <p className="p-2 text-xs text-gray-400">Esperando la conexión SSH para habilitar su contexto.</p>}
            {local && <section className="assistant-context space-y-1.5" aria-label="Contexto del acompañante IA">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">Modelo</span>
                    <span className="truncate text-blue-200" title={configuration?.base_url}>{configuration?.consent_accepted ? configuration.model : 'Sin configurar'}</span>
                </div>

                                <details className="text-[11px] text-gray-400"><summary className="cursor-pointer">Contexto y privacidad</summary><p className="pt-2 leading-relaxed">La salida SSH se registra cifrada en este equipo. Al pedir ayuda se comparte el contexto disponible y la conversación reciente con tu proveedor. No hay envío continuo.</p><button className="text-blue-300 hover:underline" onClick={() => useWorkspaceStore.getState().openPreferences('ai')}>Configurar proveedor y privacidad</button></details>
                <div className="flex gap-2"><button aria-pressed={mode === 'chat'} className="border border-[#444] rounded px-2 py-1" onClick={() => setMode('chat')}>Conversar con el agente</button><button aria-pressed={mode === 'task'} className="border border-[#444] rounded px-2 py-1" onClick={() => setMode('task')}>Tarea avanzada</button></div>
            </section>}
            {local && taskRunning && mode === 'chat' && <button className="p-2 text-xs text-amber-300 border-b border-[#444]" onClick={() => setMode('task')}>Hay una tarea en ejecución · Ver progreso o cancelar</button>}
            {local && <div className={mode === 'task' ? 'flex flex-col flex-1 min-h-0' : 'hidden'}><AgentTaskPanel server={server} enabled={accepted} onRunningChange={setTaskRunning} /></div>}
            {(!local || mode === 'chat') && <>
            {local && server && <div className="px-3 py-2 text-xs text-gray-400 border-b border-[#333]" role="note">
                El agente propone comandos y solicita permiso antes de ejecutarlos por SSH.
                <p className="mt-1">Permiso: {permission === 'always' ? 'Automático para este destino' : permission === 'session' ? 'Automático en esta sesión SSH' : 'Preguntar por cada comando'}.</p>
                {permission !== 'ask' && <button className="text-blue-300 underline" onClick={async () => {
                    setPermission('ask');
                    try { await sendCommand('local_chat_revoke', { server_id: server.id, session_id: sshSession }); } catch { toast.error('No se pudo confirmar la revocación.'); }
                }}>Revocar permiso automático</button>}
            </div>}
            {server && !accepted && !local && (
                <section className="p-4 border-b border-[#444] text-xs text-gray-200 space-y-3" aria-label="Permiso para compartir contexto con IA">
                    <h3 className="font-semibold">Antes de usar el diagnóstico</h3>
                    <p>Esta integración usa el proveedor configurado en el backend. Puede recopilar datos del servidor y enviar nombres, direcciones, comandos y registros a un proveedor de IA en la nube. Todavía no ofrece conexión directa con tu propia clave ni un modo local verificado.</p>
                    <label className="flex items-start gap-2">
                        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                        <span>Entiendo el envío de contexto, tengo autorización para compartirlo y acepto las condiciones del proveedor configurado, incluidos posibles cargos.</span>
                    </label>
                    <button className="px-3 py-2 bg-blue-600 rounded disabled:opacity-40" disabled={!consent} onClick={() => setAccepted(true)}>Aceptar y habilitar para esta sesión</button>
                </section>
            )}
            {accepted && server && <div className="px-3 py-2 text-xs text-gray-300 border-b border-[#333] flex flex-wrap gap-2 justify-between"><span>Contexto de {server.hostname} · {local ? 'Proveedor propio' : 'Backend configurado'}</span><button className="underline" onClick={async () => {
                requestVersion.current += 1; setAccepted(false); setConsent(false); setLoading(false);
                if (local) { try { await api.post('/ai/settings/pause', {}); notifyAiConfiguration(); toast.success('Envíos pausados. La clave guardada se conserva.'); } catch { toast.error('No se pudo pausar la configuración. Reintentá desde Ajustes.'); } }
            }}>Detener nuevos envíos</button></div>}

            {/* Messages */}
            <div ref={messagesRef} className="assistant-messages flex flex-col flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3 gap-4 font-sans">
                {local && server && <div className="flex flex-wrap gap-2 justify-between text-xs text-gray-400"><span>{historyLoading ? 'Cargando historial protegido…' : 'Historial · Hasta 20 registros por destino'}</span><button disabled={executing || historyLoading || clearingHistory} className="underline disabled:opacity-40" onClick={() => setShowClearHistory(true)}>Limpiar chat</button></div>}
                {historyError && <p role="alert" className="text-xs text-amber-300">No se pudo cargar el historial. <button className="underline" onClick={() => setHistoryRefresh(value => value + 1)}>Reintentar</button></p>}
                {messages.length === 0 && (
                    <div className="flex flex-col flex-1 items-center justify-center py-4 text-center text-gray-500 opacity-60">
                        <Sparkles className="w-12 h-12 mb-4" />
                        <p className="text-sm font-medium">Tu acompañante en la terminal</p>
                        <p className="text-xs mt-2 max-w-[260px]">Preguntá por lo último que ejecutaste, un error anterior o posibles soluciones. Podés seguir el tema o cambiar de pregunta en este mismo chat.</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`
                           max-w-full min-w-0 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] shadow-sm
                           ${m.role === 'user' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-200 border border-[#3e3e3e]'}
                       `}>
                            <div className="space-y-2 [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_code]:font-mono [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                        </div>
                        {m.date && <p className="text-[11px] text-gray-400 mt-1 break-all">{new Date(m.date).toLocaleString()} · {m.target || m.provider}</p>}
                        {m.evidence && <details className="text-xs text-gray-300 mt-2 max-w-full"><summary>Evidencia compartida · {m.evidence.source === 'terminal-selection' ? 'Selección de terminal' : m.evidence.source === 'diagnostic' ? 'Consulta local' : 'Pegada por el técnico'}</summary><pre className="whitespace-pre-wrap break-all mt-2 p-2 bg-[#252526] rounded">{m.evidence.content}</pre></details>}
                        {m.command && (
                            <div className="mt-2 w-full max-w-[95%] bg-[#000000] border border-[#3e3e3e] rounded p-2">
                                <div className="flex justify-between items-center mb-2 border-b border-[#333] pb-1">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">{m.proposalId && commandResults[m.proposalId] ? 'Resultado del comando' : m.proposalId && usedProposals.includes(m.proposalId) ? 'Propuesta procesada' : 'Propuesta · Pendiente de permiso'}</span>
                                </div>
                                <code className="text-xs text-green-400 font-mono block mb-3 break-all">{m.command}</code>
                                {local && !m.proposalId && <p className="text-xs text-amber-300 mb-2">Esta propuesta no tiene autorización activa: puede pertenecer al historial o no tener una sesión SSH disponible. Pedí al agente una propuesta nueva con el servidor conectado.</p>}
                                {m.proposalId && !usedProposals.includes(m.proposalId) && <div className="space-y-2 mb-3">
                                    <p className="text-[11px] text-gray-400">En la terminal abierta de {server?.hostname} · puede realizar cambios.</p>
                                    <div className="flex items-center gap-1.5">
                                        <button disabled={executing || loading || !accepted || !sshSession} className="inline-flex shrink-0 items-center gap-1 rounded bg-[#007acc] hover:bg-[#168bd2] px-2.5 py-1.5 disabled:opacity-40" onClick={() => { automaticSteps.current = 0; void executeProposal(m.proposalId!, approvalScope); }}><Play className="h-3 w-3" />Ejecutar</button>
                                        <select aria-label="Duración del permiso de ejecución" title="Alcance del permiso" value={approvalScope} onChange={event => setApprovalScope(event.target.value)} className="min-w-0 flex-1 rounded border border-[#444] bg-[#252526] text-[11px] px-1.5 py-1.5">
                                            <option value="once">Una vez</option><option value="session">Esta sesión</option>{server && server.id > 0 && <option value="always">Siempre aquí</option>}
                                        </select>
                                        <button aria-label="Rechazar comando" title="Rechazar" className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-[#333] hover:text-white" onClick={() => setUsedProposals(previous => [...previous, m.proposalId!])}><X className="h-3.5 w-3.5" /></button>
                                    </div>
                                    {approvalScope !== 'once' && <p className="text-[10px] text-amber-200/80">{approvalScope === 'session' ? 'Los siguientes comandos se ejecutarán sin preguntar en esta sesión SSH.' : 'Los siguientes comandos se ejecutarán sin preguntar en este destino, incluso al reabrir la app.'} Podés revocarlo arriba.</p>}
                                </div>}
                                {m.proposalId && commandResults[m.proposalId] && <details className="text-xs mb-2"><summary className="cursor-pointer text-gray-400">{commandResults[m.proposalId].split('\n')[0]} · Ver salida capturada</summary><pre className="whitespace-pre-wrap break-all mt-2">{commandResults[m.proposalId]}</pre></details>}
                                <button
                                    onClick={() => handleRunCommand(m.command!)}
                                    className="w-full flex items-center justify-center gap-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-xs text-white py-1.5 rounded transition-colors border border-[#444]"
                                    title="Copiar sin ejecutar"
                                >
                                    <Copy className="w-3 h-3 text-green-500" /> Copiar comando
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start">
                        <div className="bg-[#2d2d2d] rounded-lg p-3 border border-[#3e3e3e]">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="shrink-0 p-3 border-t border-[#333] bg-[#252526]">
                {executing && <button className="text-xs text-red-300 mb-2 underline" onClick={() => { setPermission('ask'); automaticSteps.current = 10; void sendCommand('local_chat_cancel').catch(() => toast.error('No se pudo confirmar la detención.')); if (server && sshSession) void sendCommand('local_chat_revoke', { server_id: server.id, session_id: sshSession }).catch(() => toast.error('No se pudo revocar el permiso.')); }}>Detener comando · los cambios no se revierten</button>}
                {automaticSteps.current >= 10 && <p className="text-xs text-amber-300 mb-2">Límite de 10 pasos automáticos alcanzado. Revisá los resultados antes de continuar.</p>}
                <div className="relative">
                    <AssistantTextarea
                        className="w-full bg-[#1e1e1e] border border-[#333] text-white text-xs rounded p-2 pr-10 resize-none focus:border-blue-500 focus:ring-0 outline-none placeholder-gray-600"
                        style={{ minHeight: '40px' }}
                        placeholder={server ? "Preguntá sobre lo que está pasando en la terminal…" : "Seleccioná un servidor…"}
                        disabled={!server || !accepted || loading || executing || historyLoading || clearingHistory || waitingForTemporarySsh}
                        maxLength={16000}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button
                        className={`
                           absolute bottom-2 right-2 p-1.5 rounded transition-all
                           ${input.trim() ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-[#333] text-gray-500 cursor-not-allowed'}
                       `}
                        onClick={handleSend}
                        disabled={loading || historyLoading || clearingHistory || !input.trim() || !server || !accepted || waitingForTemporarySsh}
                        aria-label="Enviar consulta a la IA"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="text-[10px] text-gray-600 mt-1 text-center">
                    La IA puede equivocarse. Revisá cada comando antes de ejecutarlo.
                </div>
            </div>
            <Dialog open={showClearHistory} onOpenChange={setShowClearHistory}>
                <DialogContent className="bg-card text-card-foreground">
                    <DialogTitle>Limpiar chat de {server?.hostname}</DialogTitle>
                    <DialogDescription>Empieza una conversación nueva y elimina el historial de chat de este destino en el equipo. Las propuestas pendientes dejan de ser válidas. La terminal y sus registros se conservan como evidencia; los permisos de ejecución no cambian. No borra lo recibido por el proveedor ni copias anteriores.</DialogDescription>
                    <div className="flex gap-2 justify-end"><button disabled={clearingHistory} onClick={() => setShowClearHistory(false)} className="p-2 border border-border rounded">Cancelar</button><button disabled={clearingHistory} className="p-2 rounded bg-red-700 text-white" onClick={async () => {
                        if (!server) return;
                        setClearingHistory(true);
                        try {
                            await api.delete(`/servers/${server.id}/history`);
                            requestVersion.current++; automaticSteps.current = 0; currentObjective.current = '';
                            setLoading(false); setMessages([]); setInput(''); setCommandResults({}); setUsedProposals([]); setApprovalScope('once'); setHistoryError(false); setShowClearHistory(false);
                            toast.success('Chat limpio. Podés empezar una conversación nueva.');
                        }
                        catch { toast.error('No se pudo borrar el historial.'); }
                        finally { setClearingHistory(false); }
                    }}>Limpiar y empezar de nuevo</button></div>
                </DialogContent>
            </Dialog>
            </>}
        </div>
    );
}
