import { uiText } from '../../lib/ui-language';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { sendCommand } from '../../lib/bridge';
import { sameAiEndpoint } from '../../lib/ai-connection';

export interface LocalAiConfiguration {
    provider?: string;
    username?: string; organization?: string; project?: string; workspace?: string;
    base_url: string;
    model: string;
    has_api_key: boolean;
    consent_accepted: boolean;
    accepted_at?: string;
}
export const notifyAiConfiguration = () => window.dispatchEvent(new Event('local-ai-settings-changed'));

export interface AiProvider {
    id: string; name: string; base_url: string; default_model: string;
    models: string[]; local: boolean; requires_key: boolean;
}

export function LocalAiSettings() {
    const [settings, setSettings] = useState<LocalAiConfiguration | null>(null);
    const [providers, setProviders] = useState<AiProvider[]>([]);
    const [providerId, setProviderId] = useState('openai');
    const [baseUrl, setBaseUrl] = useState('');
    const [username, setUsername] = useState('opencode');
    const [organization, setOrganization] = useState('');
    const [project, setProject] = useState('');
    const [workspace, setWorkspace] = useState('');
    const [model, setModel] = useState('');
    const [key, setKey] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [busy, setBusy] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [localModels, setLocalModels] = useState<{ id: string; name: string }[]>([]);
    const [discovering, setDiscovering] = useState(false);
    const [discoveryError, setDiscoveryError] = useState('');
    const discoveryVersion = useRef(0);
    useEffect(() => () => { discoveryVersion.current++; }, []);
    const discover = async (id: string, password = '', address = baseUrl, user = username, account = { organization, project, workspace }) => {
        const version = ++discoveryVersion.current;
        setDiscovering(true); setDiscoveryError('');
        try {
            const result = await sendCommand<{ models: { id: string; name: string }[] }>('local_ai_models', { provider: id, base_url: address, username: user, ...account, ...(password ? { password } : {}) });
            if (version !== discoveryVersion.current) return;
            setLocalModels(result.models);
            setModel(previous => result.models.some(item => item.id === previous) ? previous : result.models[0]?.id || previous);
            setAccepted(false);
            if (!result.models.length) setDiscoveryError(!['ollama', 'opencode'].includes(id) ? uiText('El proveedor no devolvió modelos disponibles para esta clave.') : id === 'ollama' ? uiText('Ollama está disponible, pero no tiene modelos locales descargados.') : uiText('OpenCode está disponible, pero no tiene proveedores conectados. Configúralos en OpenCode y actualiza la lista.'));
        } catch (error) {
            if (version === discoveryVersion.current) setDiscoveryError(error instanceof Error ? error.message : uiText('No se pudo detectar el servicio local.'));
        } finally { if (version === discoveryVersion.current) setDiscovering(false); }
    };
    const load = async () => {
        setBusy(true);
        setLoadError(false);
        try {
            const [data, catalog] = await Promise.all([api.get<LocalAiConfiguration>('/ai/settings'), api.get<AiProvider[]>('/ai/providers')]);
            const existing = catalog.find(provider => provider.id === data.provider || provider.base_url === data.base_url);
            const provider = existing || catalog[0];
            setProviders(catalog); setSettings(data); setProviderId(provider.id);
            setBaseUrl(existing ? data.base_url : provider.base_url); setUsername(data.username || 'opencode');
            setOrganization(data.organization || ''); setProject(data.project || ''); setWorkspace(data.workspace || '');
            setModel(existing ? data.model : ''); setKey(''); setAccepted(false);
            if (provider.local || (existing && data.has_api_key)) void discover(provider.id, '', data.base_url, data.username || 'opencode', { organization: data.organization || '', project: data.project || '', workspace: data.workspace || '' });
        } catch { setLoadError(true); toast.error(uiText('No se pudo leer la configuración IA protegida.')); }
        finally { setBusy(false); }
    };
    useEffect(() => { void load(); }, []);
    const save = async (event: React.FormEvent) => {
        event.preventDefault(); setBusy(true);
        try {
            await api.put('/ai/settings', { provider: providerId, model: model.trim(),
                ...(provider?.local ? { base_url: baseUrl.trim(), ...(providerId === 'opencode' ? { username } : {}) } : {}),
                ...(providerId === 'openai' ? { organization, project } : {}), ...(providerId === 'claude' ? { workspace } : {}),
                ...(key ? { api_key: key } : {}), consent_accepted: accepted });
            setKey(''); notifyAiConfiguration(); await load(); toast.success('IA configurada en este equipo.');
        } catch (error) { toast.error(error instanceof Error ? error.message : uiText('No se pudo guardar la configuración.')); }
        finally { setBusy(false); }
    };
    const disconnect = async () => {
        setBusy(true);
        try { await api.post('/ai/settings/pause', {}); notifyAiConfiguration(); await load(); toast.success(uiText('IA pausada. La clave y la configuración se conservan.')); }
        catch { toast.error(uiText('No se pudo desconectar la IA.')); }
        finally { setBusy(false); }
    };
    const provider = providers.find(item => item.id === providerId);
    const sameProvider = (settings?.provider === providerId || settings?.base_url === provider?.base_url) &&
        (!provider?.local || (sameAiEndpoint(providerId, baseUrl, settings?.base_url || '') && (providerId !== 'opencode' || username === (settings?.username || 'opencode'))));
    const invalidateConnection = () => {
        discoveryVersion.current++; setLocalModels([]); setDiscoveryError(''); setDiscovering(false); setKey(''); setAccepted(false);
    };
    const invalidateModels = () => { discoveryVersion.current++; setLocalModels([]); setDiscoveryError(''); setDiscovering(false); setAccepted(false); };
    const changeProvider = (id: string) => {
        const next = providers.find(item => item.id === id)!;
        discoveryVersion.current++; setLocalModels([]); setDiscoveryError(''); setDiscovering(false);
        setProviderId(id); setModel(''); setKey(''); setAccepted(false);
        setBaseUrl(next.base_url); setUsername('opencode'); setOrganization(''); setProject(''); setWorkspace('');
        if (next.local) void discover(id, '', next.base_url, 'opencode');
    };
    return <section className="rounded-lg border border-border bg-card p-6 space-y-4" aria-label="Configurar IA en este equipo">
        <h2 className="text-lg font-semibold">{uiText("Proveedor de inteligencia artificial")}</h2>
        <p className="text-sm text-muted-foreground">{uiText("Elige el proveedor y completa los datos de su conexión.")}</p>
        {loadError ? <Button onClick={load}>{uiText("Reintentar lectura")}</Button> : <form onSubmit={save} className="space-y-4">
            <label className="block text-sm">{uiText("Proveedor")}<select aria-label="Proveedor de IA" className="mt-2 w-full rounded border px-3" value={providerId} disabled={busy} onChange={event => changeProvider(event.target.value)}>
                    <optgroup label="Servicios en la nube">{providers.filter(item => !item.local).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>
                    <optgroup label={uiText("Servidores y agentes")}>{providers.filter(item => item.local).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>
                </select>
            </label>
            {provider?.local && <label className="block text-sm">{uiText("URL del servidor")}{" "}{providerId === 'ollama' ? 'Ollama' : 'OpenCode'}
                <Input aria-label="URL del servidor IA" type="url" required value={baseUrl} onChange={event => { setBaseUrl(event.target.value); invalidateConnection(); }} disabled={busy} className="mt-2" placeholder={providerId === 'ollama' ? 'http://localhost:11434' : 'http://localhost:4096'} />
                <span className="block mt-1 text-xs text-muted-foreground">{uiText("Puede estar en este equipo, otro equipo de la red o detrás de un proxy. Incluye el puerto y la ruta del proxy, si corresponde.")}</span>
            </label>}
            {providerId === 'opencode' && <label className="block text-sm">{uiText("Usuario del servidor OpenCode")}<Input aria-label={uiText("Usuario de OpenCode")} value={username} required maxLength={200} disabled={busy} className="mt-2" onChange={event => { setUsername(event.target.value); invalidateConnection(); }} />
            </label>}
            <label className="block text-sm">{providerId === 'opencode' ? uiText('Contraseña de OpenCode (opcional)') : providerId === 'ollama' ? 'Token del proxy (opcional)' : 'Clave API'} {sameProvider && settings?.has_api_key && uiText('· deja vacío para conservar la guardada')}
                <Input aria-label="Clave API de IA" type="password" autoComplete="off" value={key} onChange={e => { setKey(e.target.value); invalidateModels(); }} onBlur={() => { if (key || provider?.local || (sameProvider && settings?.has_api_key)) void discover(providerId, key); }} disabled={busy} className="mt-2" />
            </label>
            {sameProvider && settings?.has_api_key && <p className="text-xs text-muted-foreground">{uiText("Hay una clave protegida guardada en este equipo. El campo vacío no significa que se haya perdido.")}{!settings.consent_accepted && uiText(' La IA está pausada; revisa y guarda para habilitarla.')}</p>}
            {providerId === 'openai' && <p className="text-xs text-muted-foreground">{uiText("Usa una clave de la API de OpenAI. El inicio de sesión de ChatGPT no se utiliza en esta conexión.")}</p>}
            {providerId === 'ollama' && <p className="text-sm text-muted-foreground">{uiText("Ollama nativo no requiere clave. La app acepta la URL del servidor terminada en /api, /v1 o sin sufijo y la adapta automáticamente. El token solo se usa si tu proxy lo exige; para enviar credenciales a otro equipo se necesita HTTPS.")}</p>}
            {providerId === 'opencode' && <p className="text-sm text-muted-foreground">{uiText("Inicia")}{" "}<code>opencode serve</code>{" "}{uiText("en el servidor indicado. Usará sus proveedores configurados, locales o de nube. El usuario predeterminado es opencode; si configuraste OPENCODE_SERVER_USERNAME, usa ese valor. Para credenciales fuera de este equipo usa HTTPS.")}</p>}
            {providerId === 'openai' && <details className="text-sm"><summary className="cursor-pointer">{uiText("Organización y proyecto (opcional)")}</summary><div className="mt-3 space-y-3">
                <label className="block">{uiText("Organización")}<Input onBlur={() => { if (key || (sameProvider && settings?.has_api_key)) void discover(providerId, key); }} aria-label={uiText("Organización de OpenAI")} value={organization} maxLength={200} disabled={busy} onChange={event => { setOrganization(event.target.value); invalidateModels(); }} /></label>
                <label className="block">{uiText("Proyecto")}<Input onBlur={() => { if (key || (sameProvider && settings?.has_api_key)) void discover(providerId, key); }} aria-label="Proyecto de OpenAI" value={project} maxLength={200} disabled={busy} onChange={event => { setProject(event.target.value); invalidateModels(); }} /></label>
            </div></details>}
            {providerId === 'claude' && <label className="block text-sm">{uiText("Workspace de Anthropic (si tu clave lo requiere)")}<Input onBlur={() => { if (key || (sameProvider && settings?.has_api_key)) void discover(providerId, key); }} aria-label="Workspace de Claude" value={workspace} maxLength={200} disabled={busy} className="mt-2" onChange={event => { setWorkspace(event.target.value); invalidateModels(); }} placeholder="wrkspc_…" />
                <span className="text-xs text-muted-foreground">{uiText("Necesario para claves que no están limitadas a un workspace.")}</span>
            </label>}
            <label className="block text-sm">{uiText("Modelo disponible")}<select aria-label={provider?.local ? uiText('Modelo local') : uiText('Modelo IA')} className="mt-2 w-full rounded border px-3" value={model} disabled={busy || discovering || !localModels.length} onChange={event => { setModel(event.target.value); setAccepted(false); }}>
                    {!localModels.some(item => item.id === model) && <option value={model}>{discovering ? uiText('Consultando modelos…') : model ? model + uiText(' · pendiente de verificar') : uiText('Carga los modelos para seleccionar')}</option>}
                    {localModels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            </label>
            <div className="space-y-2"><Button type="button" variant="outline" disabled={busy || discovering || (!!provider?.requires_key && !key && !(sameProvider && settings?.has_api_key))} onClick={() => void discover(providerId, key)}>{discovering ? uiText('Consultando modelos…') : uiText('Actualizar modelos')}</Button>
                <p className="text-xs text-muted-foreground">{uiText("La lista se consulta al proveedor con tu conexión. No se envían conversaciones ni datos de servidores. Algunos modelos del catálogo pueden no admitir chat.")}</p>
                {discoveryError && <p role="status" className="text-sm text-amber-300">{discoveryError}</p>}
            </div>
            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{uiText("Contexto compartido y privacidad")}</summary><p className="mt-2 leading-relaxed">{uiText("La salida SSH se registra cifrada en este equipo. Al pedir ayuda se comparten la consulta, los datos del servidor, la salida disponible y hasta diez intercambios recientes. Estos registros pueden contener información sensible. No se adjuntan credenciales del almacén ni se envía contexto continuamente. Guardar la configuración no envía consultas ni ejecuta tareas.")}</p></details>
            <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} disabled={busy} className="mt-1" /><span>{uiText("Autorizo compartir mis consultas, datos del servidor y registros de terminal con")}{" "}{provider?.name || 'el proveedor seleccionado'}{provider?.local ? ` en ${baseUrl}` : ''}{" "}{uiText("cuando pida ayuda o ejecute una tarea.")}{" "}{providerId === 'opencode' ? 'OpenCode puede reenviarlos al proveedor del modelo elegido y conservar registros.' : provider?.local ? uiText('El modelo se ejecuta mediante el servidor configurado.') : uiText('Acepto las condiciones de tratamiento, retención y posibles cargos del proveedor.')}</span></label>
            <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || discovering || !accepted || !!discoveryError || !localModels.some(item => item.id === model) || (!!provider?.requires_key && !key && !(sameProvider && settings?.has_api_key))}>{uiText("Guardar y habilitar IA")}</Button>{settings?.consent_accepted && <Button type="button" variant="outline" disabled={busy} onClick={disconnect}>{uiText("Pausar IA")}</Button>}</div>
            {settings?.consent_accepted && <p className="text-xs text-muted-foreground">{uiText("Configuración activa:")}{" "}{providers.find(item => item.id === settings.provider || item.base_url === settings.base_url)?.name || 'Proveedor existente'} · {settings.model}{uiText(". Guardar no envía consultas ni ejecuta tareas.")}</p>}
        </form>}
    </section>;
}
