import { X, Terminal, Monitor } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { connectionPresentation } from '../../lib/connection-presentation';
import { useState } from 'react';
import { IdeAgentMonitor } from './IdeAgentMonitor';
import { IdeTransferMonitor } from './IdeTransferMonitor';

export function IdeTools() {
    const [section, setSection] = useState<'sessions' | 'tasks' | 'transfers'>('sessions');
    const { tabs, activeTabId, nativeSessions, setActiveTab, toggleTools } = useWorkspaceStore();
    return <section className="ide-tools h-full flex flex-col" aria-label="Panel de sesiones">
        <header className="flex items-center h-8 px-3 border-b border-[#333] shrink-0 gap-4"><button aria-pressed={section === 'sessions'} onClick={() => setSection('sessions')} className={`text-[11px] h-full border-b ${section === 'sessions' ? 'text-gray-100 border-blue-400' : 'text-gray-500 border-transparent'}`}>SESIONES ({tabs.length})</button><button aria-pressed={section === 'tasks'} onClick={() => setSection('tasks')} className={`text-[11px] h-full border-b ${section === 'tasks' ? 'text-gray-100 border-blue-400' : 'text-gray-500 border-transparent'}`}>TAREAS IA</button><button aria-pressed={section === 'transfers'} onClick={() => setSection('transfers')} className={`text-[11px] h-full ${section === 'transfers' ? 'text-blue-300' : 'text-gray-500'}`}>TRANSFERENCIAS</button><button aria-label="Ocultar panel inferior" onClick={toggleTools} className="ml-auto p-1 text-gray-400 hover:text-white"><X size={14} /></button></header>

        {section === 'tasks' ? <IdeAgentMonitor /> : section === 'transfers' ? <IdeTransferMonitor /> : <div className="overflow-auto flex-1">
            {!tabs.length && <p className="px-4 py-4 text-xs text-gray-500">Abre un servidor desde el explorador. Las sesiones aparecerán aquí.</p>}
            {tabs.map(tab => { const connection = connectionPresentation(tab.server); const Icon = connection.protocol === 'RDP' ? Monitor : Terminal; const registered = tab.server && nativeSessions[tab.server.id]; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`ide-session-row ${tab.id === activeTabId ? 'selected' : ''}`}>
                <Icon size={13} /><span className="truncate w-40 text-left">{tab.title}</span><span className="text-gray-500 truncate flex-1 text-left">{tab.server?.ip_address}</span><span className="text-gray-400">{connection.protocol}</span><span className="text-[10px] text-gray-400 ml-4">{registered ? 'Sesión SSH registrada' : 'Pestaña abierta'}</span>
            </button>; })}
        </div>}
    </section>;
}
