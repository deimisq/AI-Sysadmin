import { uiText, uiFormat } from '../../lib/ui-language';
import { useEffect } from 'react';
import { X, Terminal as TerminalIcon, Monitor } from 'lucide-react';
import { useWorkspaceStore, type Tab } from '../../stores/workspaceStore';
import TerminalComponent from '../terminal';
import { connectionPresentation } from '../../lib/connection-presentation';

export function WorkspaceArea() {
    const { tabs, activeTabId, activeOverlay, setActiveTab, closeTab } = useWorkspaceStore();

    // Resize event trigger
    useEffect(() => {
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
        return () => clearTimeout(timer);
    }, [activeTabId, tabs.length]);

    const handleClose = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        closeTab(id);
    };

    if (tabs.length === 0) {
        return <div className="ide-empty h-full flex flex-col items-center justify-center text-gray-500 select-none">
            <img src="/brand/logo.png" alt="AI Sysadmin Agent" className="w-72 max-w-[80%] mb-6" />
            <h1 className="text-base text-gray-400 mb-5">{uiText("Espacio de sesiones")}</h1>
            <button onClick={() => window.dispatchEvent(new Event('workspace-command-palette'))} className="ide-empty-action"><span>{uiText("Abrir conexión")}</span><kbd>Ctrl+Shift+P</kbd></button>
            <button onClick={() => useWorkspaceStore.getState().requestExplorerAction('add-server')} className="ide-empty-action"><span>{uiText("Nueva conexión")}</span><span>{uiText("Archivo → Nueva conexión")}</span></button>
            <button onClick={() => useWorkspaceStore.getState().toggleAIPanel()} className="ide-empty-action"><span>{uiText("Acompañante IA")}</span><kbd>Ctrl+Alt+I</kbd></button>
            <p className="text-[12px] text-gray-400 mt-8">{uiText("Doble clic en un servidor del explorador para empezar.")}</p>
        </div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
            {/* Tab Bar */}
            <div className="flex shrink-0 min-w-0 border-b border-[#30333b]">
            <div role="tablist" aria-label="Sesiones abiertas" className="session-tabstrip flex flex-1 min-w-0 bg-[#191c23] overflow-x-auto">
                {tabs.map(tab => {
                    const isActive = activeTabId === tab.id;
                    return (
                        <div
                            key={tab.id}
                            role="presentation"
                            onMouseDown={event => { if (event.button === 1) event.preventDefault(); }}
                            onAuxClick={event => {
                                if (event.button !== 1) return;
                                event.preventDefault();
                                event.stopPropagation();
                                closeTab(tab.id);
                            }}
                            data-active={isActive}
                            className={`
                                group flex items-center gap-0.5 pl-0.5 pr-1 text-sm border-r border-[#30333b] min-w-[80px] max-w-[160px] h-8 select-none shrink-0
                                ${isActive
                                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
                                    : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e] border-t-2 border-t-transparent'
                                }
                            `}
                        >
                            <button role="tab" id={`tab-${tab.id}`} aria-selected={isActive} aria-controls={`session-${tab.id}`} tabIndex={isActive ? 0 : -1}
                                onClick={() => setActiveTab(tab.id)} title={tab.server ? `${tab.title} · ${tab.server.ip_address}` : tab.title}
                                onKeyDown={event => {
                                    const index = tabs.findIndex(item => item.id === tab.id);
                                    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                                    if (next < 0) return;
                                    event.preventDefault(); setActiveTab(tabs[next].id); document.getElementById(`tab-${tabs[next].id}`)?.focus();
                                }} className="flex items-center gap-1 flex-1 min-w-0 px-1.5 h-full">
                                <TabIcon tab={tab} className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                                <span className="truncate flex-1 text-left text-xs">{tab.title}</span>
                                <span className="protocol-badge">{connectionPresentation(tab.server).protocol}</span>
                            </button>
                            <button
                                aria-label={uiFormat("Cerrar sesión {0}", tab.title)}
                                onClick={(e) => handleClose(e, tab.id)}
                                className="p-1 rounded hover:bg-[#444] text-gray-400 hover:text-white focus:text-white"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>
            <div id="session-actions" className="flex items-center shrink-0 px-1 bg-[#202020]" />
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-[#000000]">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        id={`session-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`}
                        className="absolute inset-0 w-full h-full"
                        style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
                    >
                        <TabContent tab={tab} active={activeTabId === tab.id && !activeOverlay} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function TabIcon({ tab, className }: { tab: Tab, className?: string }) {
    const rdp = tab.type === 'rdp' || connectionPresentation(tab.server).protocol === 'RDP';
    return rdp ? <Monitor className={className} /> : <TerminalIcon className={className} />;
}

function TabContent({ tab, active }: { tab: Tab; active: boolean }) {
    if (tab.type === 'terminal' && tab.server) {
        return (
            <TerminalComponent
                active={active}
                serverData={tab.server}
                hostname={tab.server.hostname}
            />
        );
    }


    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            Unknown Tab Type: {tab.type}
        </div>
    );
}
