import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft, Settings2, Sparkles, Archive, ScrollText } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { isLocalWorkspace } from '../../lib/workspace-mode';
import { isPreferencesWindow, sendCommand } from '../../lib/bridge';
import { preferencesSection, type PreferencesSection } from '../../lib/preferences';

const LocalAiSettings = lazy(() => import('../ai/LocalAiSettings').then(module => ({ default: module.LocalAiSettings })));
const LocalBackupSettings = lazy(() => import('../settings/LocalBackupSettings').then(module => ({ default: module.LocalBackupSettings })));
const TerminalContextSettings = lazy(() => import('../settings/TerminalContextSettings').then(module => ({ default: module.TerminalContextSettings })));

const categories = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'ai', label: 'Inteligencia artificial', icon: Sparkles },
    { id: 'backups', label: 'Copias de seguridad', icon: Archive },
    { id: 'context', label: 'Contexto y registros', icon: ScrollText },
] as const;

export function DesktopPreferences() {
    const requested = useWorkspaceStore(state => state.preferencesSection);
    const floating = isPreferencesWindow();
    const local = isLocalWorkspace();
    const initial = local ? (floating ? preferencesSection(new URLSearchParams(window.location.search).get('section')) : requested) : 'general';
    const [selected, setSelected] = useState<PreferencesSection>(initial);
    const [open, setOpen] = useState(true);
    const [visited, setVisited] = useState<PreferencesSection[]>([initial]);
    const [session, setSession] = useState(0);
    const { setActiveOverlay } = useWorkspaceStore();
    const visible = local ? categories : categories.slice(0, 1);
    useEffect(() => {
        if (!floating) setSelected(local ? requested : 'general');
    }, [requested, floating, local]);
    useEffect(() => {
        setVisited(previous => previous.includes(selected) ? previous : [...previous, selected]);
    }, [selected]);
    useEffect(() => {
        if (!floating) return;
        const navigate = (event: Event) => {
            const section = local ? preferencesSection((event as CustomEvent).detail) : 'general';
            setSelected(section); setVisited(previous => previous.includes(section) ? previous : [...previous, section]); setOpen(true);
        };
        const dismiss = () => { setOpen(false); setVisited([]); setSession(value => value + 1); };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) void sendCommand('preferences_close').catch(() => {});
        };
        window.addEventListener('preferences-navigate', navigate);
        window.addEventListener('preferences-hidden', dismiss);
        window.addEventListener('keydown', escape);
        return () => {
            window.removeEventListener('preferences-navigate', navigate);
            window.removeEventListener('preferences-hidden', dismiss);
            window.removeEventListener('keydown', escape);
        };
    }, [floating, local]);
    const close = () => { if (floating) void sendCommand('preferences_close').catch(() => {}); else setActiveOverlay(null); };
    return <section className={`desktop-preferences ${floating ? 'h-screen w-screen' : 'h-full'} flex flex-col text-[#eeeeee]`} aria-label="Configuración de la aplicación">
        <header className="h-14 shrink-0 flex items-center gap-3 px-5">
            {!floating && <button onClick={close} aria-label="Volver a las conexiones" title="Volver a las conexiones" className="preferences-back"><ArrowLeft size={18} /></button>}
            <h1 className="text-lg font-semibold">Configuración</h1>
        </header>
        <div className="flex flex-1 min-h-0">
            <nav role="tablist" aria-label="Categorías de configuración" aria-orientation="vertical" className="w-56 shrink-0 flex flex-col gap-1 p-3 overflow-y-auto">
                {visible.map((category, index) => <button key={category.id} role="tab" id={`preferences-${category.id}`}
                    aria-controls={`preferences-page-${category.id}`} aria-selected={selected === category.id} tabIndex={selected === category.id ? 0 : -1}
                    onClick={() => setSelected(category.id)} onKeyDown={event => {
                        const next = event.key === 'ArrowDown' ? (index + 1) % visible.length : event.key === 'ArrowUp' ? (index - 1 + visible.length) % visible.length : event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : -1;
                        if (next < 0) return;
                        event.preventDefault(); setSelected(visible[next].id); document.getElementById(`preferences-${visible[next].id}`)?.focus();
                    }} className="preferences-category"><category.icon size={17} className="shrink-0" /><span>{category.label}</span></button>)}
                <div className="mt-auto pt-6 px-3 text-xs text-[#a9a9a9]">AI Sysadmin Agent<br /><span className="text-[11px]">{local ? 'Preferencias de este equipo' : 'Espacio de empresa'}</span></div>
            </nav>
            <div key={session} className="flex-1 min-w-0 overflow-hidden">
                <div role="tabpanel" id="preferences-page-general" aria-labelledby="preferences-general" hidden={selected !== 'general'} className="settings-page">
                    <h2 className="preferences-heading">General</h2>
                    <p className="preferences-description">Información y preferencias del espacio de trabajo.</p>
                    <dl className="preferences-rows">
                        <div><dt>Espacio de trabajo</dt><dd>{local ? 'Personal · Inventario local' : 'Empresa'}</dd></div>
                        <div><dt>Conexiones de escritorio</dt><dd>Desde el equipo del técnico</dd></div>
                        <div><dt>Tema de la interfaz</dt><dd>Oscuro</dd></div>
                        <div><dt>Idioma</dt><dd>Español</dd></div>
                    </dl>
                    <p className="mt-6 text-xs text-[#b4b4b4]">Las conexiones abiertas permanecen activas mientras consultas la configuración. {floating ? 'Puedes mover esta ventana y seguir trabajando en la principal.' : 'Usa la flecha superior para volver.'}</p>
                </div>
                {local && open && <>
                    {visited.includes('ai') && <div role="tabpanel" id="preferences-page-ai" aria-labelledby="preferences-ai" hidden={selected !== 'ai'} className="settings-page"><Suspense fallback={<p role="status">Cargando proveedor de IA…</p>}><LocalAiSettings /></Suspense></div>}
                    {visited.includes('backups') && <div role="tabpanel" id="preferences-page-backups" aria-labelledby="preferences-backups" hidden={selected !== 'backups'} className="settings-page"><Suspense fallback={<p role="status">Cargando copias de seguridad…</p>}><LocalBackupSettings /></Suspense></div>}
                    {visited.includes('context') && <div role="tabpanel" id="preferences-page-context" aria-labelledby="preferences-context" hidden={selected !== 'context'} className="settings-page"><Suspense fallback={<p role="status">Cargando registros…</p>}><TerminalContextSettings /></Suspense></div>}
                </>}
            </div>
        </div>
    </section>;
}
