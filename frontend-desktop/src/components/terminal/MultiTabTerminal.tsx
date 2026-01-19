import { useEffect } from 'react';
import { X, Plus, Terminal as TerminalIcon } from 'lucide-react';
import TerminalComponent from '../terminal';
import { useTerminal } from '../../contexts/TerminalContext';

export function MultiTabTerminal() {
    const { tabs, activeTabId, setActiveTab, closeSession, openSession } = useTerminal();

    // Force resize event when switching tabs to ensure xterm fits correctly
    useEffect(() => {
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
        return () => clearTimeout(timer);
    }, [activeTabId]);

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        closeSession(id);
    };

    const addNewTab = () => {
        // Simple clone of active tab for now
        // Ideally show a server selector modal
        const currentTab = tabs.find(t => t.id === activeTabId);
        if (currentTab) {
            openSession(currentTab.server);
        } else if (tabs.length > 0) {
            openSession(tabs[tabs.length - 1].server);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e]">
            {/* Tab Bar - VS Code Style */}
            <div className="flex items-center bg-[#252526] border-b border-[#333] overflow-x-auto select-none no-scrollbar">
                {tabs.map(tab => {
                    const isActive = activeTabId === tab.id;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r border-[#333] min-w-[150px] max-w-[200px] h-9
                                transition-colors
                                ${isActive
                                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
                                    : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e] border-t-2 border-t-transparent'
                                }
                            `}
                        >
                            <TerminalIcon className={`w-3 h-3 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                            <span className="truncate flex-1 font-mono text-xs">{tab.title}</span>
                            <button
                                onClick={(e) => closeTab(tab.id, e)}
                                className={`
                                    p-0.5 rounded-sm hover:bg-[#444] text-inherit 
                                    ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                    transition-opacity
                                `}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
                <button
                    onClick={addNewTab}
                    className="p-2 h-9 text-[#969696] hover:text-white hover:bg-[#333] transition-colors"
                    title="Clone Session"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-black">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className="absolute inset-0"
                        style={{
                            display: activeTabId === tab.id ? 'block' : 'none',
                        }}
                    >
                        {/* We use key={tab.id} to preserve component instance */}
                        <TerminalComponent
                            serverData={tab.server}
                            hostname={tab.server.hostname}
                        />
                    </div>
                ))}

                {tabs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-[#555] gap-4">
                        <TerminalIcon className="w-16 h-16 opacity-20" />
                        <p>No active sessions</p>
                        <p className="text-xs">Select a server from Dashboard to connect</p>
                    </div>
                )}
            </div>
        </div>
    );
}
