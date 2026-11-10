import { FolderTree, Sparkles, Settings, HelpCircle, Network, Terminal } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { isLocalWorkspace } from '../../lib/workspace-mode';
import { AppVersionBadge } from '../settings/AppUpdates';

export function ActivityRail() {
    const { sidebarVisible, aiPanelVisible, activeOverlay, toggleSidebar, toggleAIPanel, setActiveOverlay } = useWorkspaceStore();
    return <nav aria-label="Herramientas del espacio de trabajo" className="w-12 shrink-0 bg-[#191c23] border-r border-[#30333b] flex flex-col items-center py-3 gap-2">
        <button className="workspace-tool" title="Conexiones" aria-label="Conexiones" aria-pressed={sidebarVisible} onClick={() => { if (activeOverlay) { setActiveOverlay(null); if (!sidebarVisible) toggleSidebar(); } else toggleSidebar(); }}><FolderTree size={20} /></button>
        <button className="workspace-tool" title="Acompañante IA" aria-label="Acompañante IA" aria-pressed={aiPanelVisible} onClick={toggleAIPanel}><Sparkles size={20} /></button>
        <div className="flex-1" />
        <button className="workspace-tool" title="Ayuda" aria-label="Ayuda" onClick={() => setActiveOverlay('help')}><HelpCircle size={19} /></button>
        <button className="workspace-tool" title="Ajustes" aria-label="Ajustes" aria-pressed={activeOverlay === 'settings'} onClick={() => setActiveOverlay('settings')}><Settings size={19} /></button>
    </nav>;
}

export function WorkspaceStatusBar() {
    const { tabs, activeTabId, nativeSessions, aiPanelVisible, toggleAIPanel } = useWorkspaceStore();
    const active = tabs.find(tab => tab.id === activeTabId);
    const sshCount = Object.keys(nativeSessions).length;
    const local = isLocalWorkspace();
    return <footer className="h-7 shrink-0 px-3 bg-[#191c23] border-t border-[#30333b] text-[11px] text-gray-400 flex items-center gap-4 select-none">
        <span className="flex items-center gap-1.5"><Network size={12} />{local ? 'Desde este equipo' : 'Empresa'}</span>
        <AppVersionBadge />
        {local && <span title="Sesiones SSH registradas; no incluye conexiones RDP">{sshCount} SSH</span>}
        <span className="truncate min-w-0 flex items-center gap-1.5"><Terminal size={12} className="shrink-0" />{active?.server ? `${active.server.hostname} · ${active.server.ip_address}` : 'Sin conexión seleccionada'}</span>
        <button onClick={toggleAIPanel} aria-pressed={aiPanelVisible} className="ml-auto whitespace-nowrap hover:text-blue-300 flex items-center gap-1.5"><Sparkles size={12} />Acompañante IA</button>
    </footer>;
}
