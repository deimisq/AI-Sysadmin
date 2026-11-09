import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { sendCommand } from '../../lib/bridge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

type Journal = { Id: string; ServerId: number | null; StartedAt: string | null; Bytes: number; Active: boolean; Status: string };
export function TerminalContextSettings() {
    const [journals,setJournals] = useState<Journal[]>([]);
    const [limit,setLimit] = useState('0');
    const [loaded,setLoaded] = useState(false);
    const [busy,setBusy] = useState(false);
    const [message,setMessage] = useState('');
    const [deleting,setDeleting] = useState<Journal | null>(null);
    const refresh = async () => {
        setBusy(true); setLoaded(false); setMessage('');
        try {
            const [list,policy] = await Promise.all([sendCommand<Journal[]>('local_context_list'),api.get<{ max_characters: number }>('/workspace/context-policy')]);
            setJournals(list); setLimit(String(policy.max_characters)); setLoaded(true);
        } catch { setMessage('No se pudo cargar la gestión de registros. Reintentá para comprobar su estado.'); }
        finally { setBusy(false); }
    };
    useEffect(() => { void refresh(); },[]);
    return <Card><CardHeader><CardTitle>Contexto y registros de terminal</CardTitle><CardDescription>Controlá lo que se conserva en este equipo y cuánto contexto se envía al pedir ayuda.</CardDescription></CardHeader><CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Los registros están cifrados para tu usuario Windows. Borrarlos no elimina conversaciones, registros de tareas ni datos que ya recibió el proveedor IA, y no cancela consultas en curso. No hay borrado automático.</p>
        <label className="block space-y-2">Contexto de terminal para próximas consultas y tareas
            <select aria-label="Ventana de contexto IA" className="block w-full rounded border bg-background p-2" value={limit} disabled={busy || !loaded} onChange={event => setLimit(event.target.value)}>
                <option value="0">Completo (hasta 240000 caracteres; rechaza sesiones mayores)</option>
                <option value="8000">Últimos 8000 caracteres</option><option value="32000">Últimos 32000 caracteres</option><option value="120000">Últimos 120000 caracteres</option>
                {!['0','8000','32000','120000'].includes(limit) && <option value={limit}>Últimos {limit} caracteres</option>}
            </select>
        </label>
        <p className="text-sm text-muted-foreground">Una ventana reciente omite el comienzo de la sesión al enviarlo a la IA, sin recortar el archivo local. Se informa al modelo que el contexto es parcial. Este límite usa caracteres, no tokens; el proveedor puede admitir menos.</p>
        <Button disabled={busy || !loaded} onClick={async () => {
            setBusy(true); setMessage('');
            try { await api.put('/workspace/context-policy',{max_characters:Number(limit)}); setMessage('Preferencia guardada para próximas consultas y tareas.'); }
            catch { setMessage('No se pudo guardar la preferencia.'); } finally { setBusy(false); }
        }}>Guardar contexto</Button>
        <div className="flex gap-3 items-center"><Button variant="outline" disabled={busy} onClick={refresh}>Actualizar registros</Button><span className="text-sm">{journals.length} registros · {(journals.reduce((total,item) => total+item.Bytes,0)/1024/1024).toFixed(2)} MiB</span></div>
        <div className="space-y-2">{journals.map(item => <div key={item.Id} className="rounded border p-3 space-y-1 text-sm"><p className="font-medium">{item.ServerId == null ? 'Destino no disponible' : `Conexión #${item.ServerId}`} · {item.StartedAt ? new Date(item.StartedAt).toLocaleString() : 'Fecha no disponible'}</p><p>{(item.Bytes/1024).toFixed(1)} KiB · {item.Status}</p><Button variant="outline" disabled={busy || item.Active || !loaded} onClick={() => setDeleting(item)}>Borrar registro</Button></div>)}</div>
        {deleting && <div role="alertdialog" aria-label="Confirmar borrado del registro" className="rounded border border-amber-600 p-3 space-y-3"><p>¿Borrar el registro de la conexión #{deleting.ServerId ?? 'desconocida'}? Se perderá ese contexto local y no se puede deshacer.</p><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Conservar</Button><Button disabled={busy} onClick={async () => {
            setBusy(true); setMessage('');
            try { setJournals(await sendCommand<Journal[]>('local_context_delete',{id:deleting.Id,confirmed:true})); setDeleting(null); setMessage('Registro local eliminado.'); }
            catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo borrar el registro.'); } finally { setBusy(false); }
        }}>Confirmar borrado</Button></div></div>}
        {message && <p role="status" className="text-sm">{message}</p>}
    </CardContent></Card>;
}
