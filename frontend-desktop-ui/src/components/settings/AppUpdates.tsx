import { uiText, uiFormat } from '../../lib/ui-language';
import { useEffect, useState } from 'react';
import { sendCommand, isWebView2 } from '../../lib/bridge';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Button } from '../ui/button';

type Update = { current_version: string; repository: string; state: string; error: string; version: string; notes: string; received: number; size: number; has_token: boolean; installed: boolean };
type Info = { version: string; product: string; repository: string; runtime: string; architecture: string; os: string; commit: string; data_directory: string; installed: boolean };
const event = 'app-update-status';
async function status() { const result = await sendCommand<Update>('update_status'); window.dispatchEvent(new CustomEvent(event, { detail: result })); return result; }
function useUpdateStatus() {
    const [update, setUpdate] = useState<Update | null>(null);
    useEffect(() => {
        if (!isWebView2()) return;
        let active = true;
        const receive = (message: Event) => { if (active) setUpdate((message as CustomEvent<Update>).detail); };
        window.addEventListener(event, receive);
        void status().catch(() => {});
        const timer = setInterval(() => { void status().catch(() => {}); }, 2000);
        return () => { active = false; clearInterval(timer); window.removeEventListener(event, receive); };
    }, []);
    return update;
}
let checkedAtStartup = false;
export function AppVersionBadge() {
    const update = useUpdateStatus();
    useEffect(() => {
        if (!isWebView2() || checkedAtStartup) return;
        const timer = setTimeout(() => { if (checkedAtStartup) return; checkedAtStartup = true; void sendCommand('update_check').catch(() => {}).finally(() => { void status().catch(() => {}); }); }, 4000);
        return () => clearTimeout(timer);
    }, []);
    if (!update) return null;
    const label = update.state === 'restart' ? uiText('Reiniciar para actualizar') : update.state === 'downloaded' ? uiText('Actualización descargada') : update.state === 'available' ? uiFormat("Disponible {0}", update.version) : update.state === 'downloading' ? uiText('Descargando actualización…') : update.state === 'installing' ? uiText('Instalando…') : '';
    return <button title={uiText("Versión, información y actualizaciones")} onClick={() => useWorkspaceStore.getState().setActiveOverlay('help')} className="text-blue-200 whitespace-nowrap">v{update.current_version}{label ? ` · ${label}` : ''}</button>;
}

export function AppUpdateSettings() {
    const update = useUpdateStatus();
    const [info, setInfo] = useState<Info | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { if (isWebView2()) void sendCommand<Info>('app_info').then(setInfo).catch(() => {}); }, []);
    const action = async (command: string, payload: Record<string, unknown> = {}) => {
        setBusy(true); setError('');
        try { await sendCommand(command, payload); }
        catch (failure) { setError(failure instanceof Error ? failure.message : uiText('La actualización falló.')); }
        finally { setBusy(false); await status().catch(() => {}); }
    };
    if (!isWebView2()) return <p>{uiText("La versión y las actualizaciones integradas están disponibles en la aplicación Windows instalada.")}</p>;
    const working = busy || ['checking', 'downloading', 'installing'].includes(update?.state || '');
    return <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-xl font-semibold">{uiText("Acerca de AI Sysadmin Agent")}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm break-all">
            <dt>{uiText("Versión actual")}</dt><dd>{info?.version || update?.current_version || uiText('Consultando…')}</dd>
            <dt>{uiText("Instalación")}</dt><dd>{info?.installed ? uiText('Instalada · Windows x64') : uiText('Portable o desarrollo')}</dd>
            <dt>{uiText("Sistema")}</dt><dd>{info?.os}</dd><dt>Runtime</dt><dd>{info?.runtime} · {info?.architecture}</dd>
            <dt>{uiText("Repositorio")}</dt><dd>github.com/{info?.repository || 'deimisq/AI-Sysadmin'}</dd>
            <dt>Commit</dt><dd>{info?.commit || uiText('Compilación local')}</dd>
            <dt>{uiText("Datos locales")}</dt><dd>{info?.data_directory}</dd>
        </dl>
        <h3 className="font-semibold">{uiText("Actualizaciones")}</h3>
        <p className="text-sm text-muted-foreground">{uiText("La app busca versiones al abrir. La descarga y la instalación requieren tu aprobación por separado. Después puedes reiniciar la app para aplicar los cambios; se cerrarán las sesiones abiertas. Los datos locales se conservan.")}</p>
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={working || update?.state === 'restart' || update?.state === 'downloaded'} onClick={() => void action('update_check')}>{uiText("Buscar actualizaciones")}</Button>
            {update?.state === 'available' && <Button disabled={working || !update.installed} onClick={() => void action('update_download')}>{uiText("Descargar")}{" "}{update.version} · {Math.ceil(update.size / 1024 / 1024)} MB</Button>}
            {update?.state === 'downloaded' && <Button disabled={working || !update.installed} onClick={() => void action('update_install')}>{uiText("Instalar actualización")}</Button>}
            {update?.state === 'restart' && <Button disabled={working} onClick={() => void action('update_restart')}>{uiText("Reiniciar y aplicar")}{" "}{update.version}</Button>}
        </div>
        {update?.state === 'current' && <p role="status">{uiText("No hay una versión más nueva compatible en el canal de actualizaciones.")}</p>}
        {update?.state === 'available' && <p role="status">{uiText("Nueva versión disponible:")}{" "}{update.version}.</p>}
        {update?.state === 'downloading' && <p role="status">{uiText("Descargando:")}{" "}{Math.floor(update.received / 1024 / 1024)}{" "}{uiText("de")}{" "}{Math.ceil(update.size / 1024 / 1024)} MB.</p>}
        {update?.state === 'installing' && <p role="status">{uiText("Instalando la actualización. Mantén la app abierta…")}</p>}
        {update?.state === 'downloaded' && <p role="status">{uiText("Descarga verificada con SHA256. Falta tu aprobación para instalar.")}</p>}
        {update?.state === 'restart' && <p role="status">{uiText("Instalación preparada. Al aprobar el reinicio se cerrará la app, se reemplazarán sus archivos y se abrirá la nueva versión.")}</p>}
        {update?.notes && <details><summary>{uiText("Notas de la nueva versión")}</summary><pre className="whitespace-pre-wrap text-sm mt-2">{update.notes}</pre></details>}
        {(error || update?.error) && <p role="alert" className="text-sm text-red-400">{error || update?.error}</p>}
        <p className="text-xs text-muted-foreground">{uiText("Las compilaciones actuales no tienen firma de código. La app verifica el hash publicado por GitHub antes de ejecutar el actualizador. El modo portable requiere una instalación para habilitar la actualización integrada.")}</p>
    </section>;
}
