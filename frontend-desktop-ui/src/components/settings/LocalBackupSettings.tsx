import { useRef, useState } from 'react';
import { sendCommand } from '../../lib/bridge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type Preview = { hash: string; created_at: string; connections: number; folders: number; external_key_files: number; servers: { hostname: string; ip_address: string }[] };
export function LocalBackupSettings() {
    const [password, setPassword] = useState('');
    const [repeat, setRepeat] = useState('');
    const [data, setData] = useState('');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const operationId = useRef(crypto.randomUUID());
    const resetPreview = () => { setPreview(null); setConfirmed(false); operationId.current = crypto.randomUUID(); setMessage(''); };
    const action = async (work: () => Promise<void>) => {
        setBusy(true); setMessage('');
        try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : 'La operación falló.'); }
        finally { setBusy(false); }
    };
    return <Card><CardHeader><CardTitle>Copia de seguridad local</CardTitle><CardDescription>Conexiones, credenciales guardadas y carpetas en un archivo cifrado portable.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">La contraseña protege la copia y será necesaria para restaurarla en otro equipo. No podemos recuperarla. No se incluyen la clave del proveedor IA, chats, diarios de terminal ni tareas. Las claves SSH pegadas se incluyen; los archivos externos solo conservan su ruta y deben copiarse por separado.</p>
            <label className="block space-y-1">Contraseña de la copia (mínimo 12 caracteres)<Input type="password" autoComplete="new-password" maxLength={1024} value={password} disabled={busy} onChange={event => { setPassword(event.target.value); resetPreview(); }} /></label>
            <label className="block space-y-1">Repetir contraseña para crear una copia<Input type="password" autoComplete="new-password" value={repeat} disabled={busy} onChange={event => setRepeat(event.target.value)} /></label>
            <Button disabled={busy || password.length < 12 || password !== repeat} onClick={() => action(async () => {
                const result = await sendCommand<{ data: string }>('local_backup_export',{ password });
                const bytes = Uint8Array.from(atob(result.data),char => char.charCodeAt(0));
                const url = URL.createObjectURL(new Blob([bytes],{ type: 'application/octet-stream' }));
                const link = document.createElement('a'); link.href = url; link.download = `inventario-${new Date().toISOString().slice(0,10)}.aisysbackup`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
                setPassword(''); setRepeat(''); setPreview(null); setConfirmed(false); setMessage('Copia cifrada preparada para descargar. Comprobá que el archivo se haya guardado.');
            })}>Descargar copia cifrada</Button>
            <div className="border-t pt-4 space-y-3"><h3 className="font-semibold">Restaurar una copia</h3><p className="text-sm text-muted-foreground">Agrega conexiones y carpetas con identificadores nuevos. Conserva lo existente; puede generar conexiones duplicadas. La copia se valida antes de guardar cambios.</p>
                <Input aria-label="Archivo de copia cifrada" type="file" accept=".aisysbackup" disabled={busy} onChange={event => {
                    resetPreview(); setData(''); const file = event.target.files?.[0]; if (!file) return;
                    void action(async () => {
                        if (file.size > 8 * 1024 * 1024 + 52) throw new Error('La copia supera el límite de 8 MiB.');
                        const reader = new FileReader();
                        const encoded = await new Promise<string>((resolve,reject) => { reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('No se pudo leer el archivo.')); reader.readAsDataURL(file); });
                        setData(encoded);
                    });
                }} />
                <Button variant="outline" disabled={busy || !data || password.length < 12} onClick={() => action(async () => { setPreview(null); setConfirmed(false); setPreview(await sendCommand<Preview>('local_backup_preview',{ data,password })); })}>Validar y revisar copia</Button>
                {preview && <div className="space-y-2 text-sm"><p>{preview.connections} conexiones y {preview.folders} carpetas · {new Date(preview.created_at).toLocaleString()}</p>
                    {preview.external_key_files > 0 && <p className="text-amber-500">{preview.external_key_files} conexiones usan rutas de claves externas. Revisalas en el equipo de destino.</p>}
                    <ul className="max-h-40 overflow-auto">{preview.servers.map((server,index) => <li key={index}>{server.hostname} · {server.ip_address}</li>)}</ul>
                    <label className="flex gap-2"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Revisé la copia y quiero agregar estas conexiones y carpetas.</label>
                    <Button disabled={busy || !confirmed || password.length < 12 || !data} onClick={() => action(async () => {
                        const result = await sendCommand<{ imported: number; folders: number }>('local_backup_import',{ data,password,hash:preview.hash,confirmed,operation_id:operationId.current });
                        window.dispatchEvent(new Event('local-inventory-restored'));
                        setPreview(null); setData(''); setPassword(''); setRepeat(''); setConfirmed(false);
                        setMessage(`Restauración completada: ${result.imported} conexiones y ${result.folders} carpetas agregadas.`);
                    })}>Agregar al inventario local</Button>
                </div>}
            </div>
            {busy && <p role="status">Procesando la copia en este equipo…</p>}{message && <p role="status" className="text-sm">{message}</p>}
        </CardContent></Card>;
}
