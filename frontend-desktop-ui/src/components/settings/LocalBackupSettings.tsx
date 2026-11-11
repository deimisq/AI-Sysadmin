import { uiText, uiFormat } from '../../lib/ui-language';
import { useRef, useState } from 'react';
import { sendCommand } from '../../lib/bridge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type Preview = { hash: string; created_at: string; connections: number; folders: number; external_key_files: number; servers: { hostname: string; ip_address: string }[] };
export function LocalBackupSettings() {
    const [password, setPassword] = useState('');
    const [repeat, setRepeat] = useState('');
    const [restorePassword, setRestorePassword] = useState('');
    const [includeKeyFiles, setIncludeKeyFiles] = useState(true);
    const [data, setData] = useState('');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const operationId = useRef(crypto.randomUUID());
    const resetPreview = () => { setPreview(null); setConfirmed(false); operationId.current = crypto.randomUUID(); setMessage(''); };
    const action = async (work: () => Promise<void>) => {
        setBusy(true); setMessage('');
        try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : uiText('La operación falló.')); }
        finally { setBusy(false); }
    };
    return <Card><CardHeader><CardTitle>{uiText("Exportar e importar conexiones")}</CardTitle><CardDescription>{uiText("Conexiones, credenciales guardadas y carpetas en un archivo cifrado portable.")}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{uiText("La contraseña protege la copia y será necesaria para restaurarla en otro equipo. No podemos recuperarla. No se incluyen la clave del proveedor IA, chats, diarios de terminal ni tareas. Las claves SSH pegadas se incluyen. Si activás incluir archivos de claves, se guardan cifrados dentro de la copia; de lo contrario, solo se conserva su ruta.")}</p>
            <label className="block space-y-1">{uiText("Contraseña de la copia (mínimo 12 caracteres)")}<Input type="password" autoComplete="new-password" maxLength={1024} value={password} disabled={busy} onChange={event => { setPassword(event.target.value); }} /></label>
            <label className="block space-y-1">{uiText("Repetir contraseña para crear una copia")}<Input type="password" autoComplete="new-password" value={repeat} disabled={busy} onChange={event => setRepeat(event.target.value)} /></label>
            <Button disabled={busy || password.length < 12 || password !== repeat} onClick={() => action(async () => {
                const result = await sendCommand<{ data: string }>('local_backup_export',{ password, include_key_files: includeKeyFiles });
                const bytes = Uint8Array.from(atob(result.data),char => char.charCodeAt(0));
                const url = URL.createObjectURL(new Blob([bytes],{ type: 'application/octet-stream' }));
                const link = document.createElement('a'); link.href = url; link.download = `inventario-${new Date().toISOString().slice(0,10)}.aisysbackup`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
                setPassword(''); setRepeat(''); setMessage(uiText('Copia cifrada preparada para descargar. Comprobá que el archivo se haya guardado.'));
            })}>{uiText("Exportar conexiones y credenciales")}</Button>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={includeKeyFiles} disabled={busy} onChange={event => setIncludeKeyFiles(event.target.checked)} />{uiText("Incluir el contenido de los archivos de claves privadas SSH en la copia cifrada para usarlos en otro equipo.")}</label>
            <div className="border-t pt-4 space-y-3"><h3 className="font-semibold">{uiText("Restaurar una copia")}</h3><p className="text-sm text-muted-foreground">{uiText("Agrega conexiones y carpetas con identificadores nuevos. Conserva lo existente; puede generar conexiones duplicadas. La copia se valida antes de guardar cambios.")}</p>
                <Input aria-label="Archivo de copia cifrada" type="file" accept=".aisysbackup" disabled={busy} onChange={event => {
                    resetPreview(); setData(''); const file = event.target.files?.[0]; if (!file) return;
                    void action(async () => {
                        if (file.size > 8 * 1024 * 1024 + 52) throw new Error(uiText('La copia supera el límite de 8 MiB.'));
                        const reader = new FileReader();
                        const encoded = await new Promise<string>((resolve,reject) => { reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error(uiText('No se pudo leer el archivo.'))); reader.readAsDataURL(file); });
                        setData(encoded);
                    });
                }} />
                <label className="block space-y-1">{uiText("Contraseña con la que se creó la copia")}<Input type="password" autoComplete="off" maxLength={1024} value={restorePassword} disabled={busy} onChange={event => { setRestorePassword(event.target.value); resetPreview(); }} aria-describedby="restore-password-help" /></label>
                <p id="restore-password-help" className="text-sm text-muted-foreground">{uiText("Ingresá la contraseña original de la copia (mínimo 12 caracteres). No necesitás completar los campos de exportación de arriba.")}</p>
                {!busy && <p className="text-sm text-muted-foreground">{!data ? uiText('Seleccioná un archivo .aisysbackup para restaurar.') : restorePassword.length < 12 ? uiText('Archivo cargado. Ingresá la contraseña de la copia para habilitar la validación.') : uiText('Archivo y contraseña listos para validar.')}</p>}
                <Button variant="outline" disabled={busy || !data || restorePassword.length < 12} onClick={() => action(async () => { setPreview(null); setConfirmed(false); setPreview(await sendCommand<Preview>('local_backup_preview',{ data,password: restorePassword })); })}>{uiText("Validar y revisar copia")}</Button>
                {preview && <div className="space-y-2 text-sm"><p>{preview.connections}{" "}{uiText("conexiones y")}{" "}{preview.folders}{" "}{uiText("carpetas ·")}{" "}{new Date(preview.created_at).toLocaleString()}</p>
                    {preview.external_key_files > 0 && <p className="text-amber-500">{preview.external_key_files}{" "}{uiText("conexiones usan rutas de claves externas. Revisalas en el equipo de destino.")}</p>}
                    <ul className="max-h-40 overflow-auto">{preview.servers.map((server,index) => <li key={index}>{server.hostname} · {server.ip_address}</li>)}</ul>
                    <label className="flex gap-2"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />{uiText("Revisé la copia y quiero agregar estas conexiones y carpetas.")}</label>
                    <Button disabled={busy || !confirmed || restorePassword.length < 12 || !data} onClick={() => action(async () => {
                        const result = await sendCommand<{ imported: number; folders: number }>('local_backup_import',{ data,password: restorePassword,hash:preview.hash,confirmed,operation_id:operationId.current });
                        window.dispatchEvent(new Event('local-inventory-restored'));
                        setPreview(null); setData(''); setRestorePassword(''); setConfirmed(false);
                        setMessage(uiFormat("Restauración completada: {0} conexiones y {1} carpetas agregadas.", result.imported, result.folders));
                    })}>{uiText("Agregar al inventario local")}</Button>
                </div>}
            </div>
            {busy && <p role="status">{uiText("Procesando la copia en este equipo…")}</p>}{message && <p role="status" className="text-sm">{message}</p>}
        </CardContent></Card>;
}
