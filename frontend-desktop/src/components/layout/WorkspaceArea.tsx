import { useRef, useEffect } from 'react';
import { X, Plus, Terminal as TerminalIcon, LayoutDashboard, Settings } from 'lucide-react';
import { useWorkspaceStore, type Tab } from '../../stores/workspaceStore';
import TerminalComponent from '../terminal';

// Import Dashboard content (lazy load ideally, but direct import for now)
import Dashboard from '../../routes/dashboard';
// Note: Dashboard route component might have its own layout, we might need to strip it.
// Actually, `Dashboard` in routes uses `DashboardLayout`.
// We should perhaps refactor dashboard content to be a standalone component `DashboardView`.
// For now, let's just stick to Terminals, and if type is dashboard, show a placeholder.

export function WorkspaceArea() {
    const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useWorkspaceStore();

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
        return <WelcomeView />;
    }

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
            {/* Tab Bar */}
            <div className="flex bg-[#252526] overflow-x-auto no-scrollbar border-b border-[#333]">
                {tabs.map(tab => {
                    const isActive = activeTabId === tab.id;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r border-[#333] min-w-[120px] max-w-[200px] h-9 select-none
                                ${isActive
                                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
                                    : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e] border-t-2 border-t-transparent'
                                }
                            `}
                        >
                            <TabIcon type={tab.type} className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                            <span className="truncate flex-1 font-mono text-xs">{tab.title}</span>
                            <button
                                onClick={(e) => handleClose(e, tab.id)}
                                className={`p-0.5 rounded-md hover:bg-[#444] ${isActive ? '' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-[#000000]">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className="absolute inset-0 w-full h-full"
                        style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
                    >
                        <TabContent tab={tab} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function TabIcon({ type, className }: { type: string, className?: string }) {
    switch (type) {
        case 'terminal': return <TerminalIcon className={className} />;
        case 'dashboard': return <LayoutDashboard className={className} />;
        case 'settings': return <Settings className={className} />;
        default: return <TerminalIcon className={className} />;
    }
}

function TabContent({ tab }: { tab: Tab }) {
    if (tab.type === 'terminal' && tab.server) {
        return (
            <TerminalComponent
                serverData={tab.server}
                hostname={tab.server.hostname}
            />
        );
    }

    if (tab.type === 'dashboard') {
        return <div className="p-10 text-white">Dashboard View Placeholder</div>;
    }

    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            Unknown Tab Type: {tab.type}
        </div>
    );
}

function WelcomeView() {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-[#666]">
            <div className="mb-8 p-6 rounded-full bg-[#252526]">
                <LayoutDashboard className="w-24 h-24 opacity-20" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-400">Project Cockpit</h2>
            <p className="text-sm max-w-xs text-center mb-8">
                Select a server from the explorer to open a terminal session, or use standard shortcuts.
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                    <span className="bg-[#333] px-2 py-1 rounded">Ctrl+P</span>
                    <span>Search Files</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-[#333] px-2 py-1 rounded">Ctrl+T</span>
                    <span>New Terminal</span>
                </div>
            </div>
        </div>
    );
}
