import { useState, useEffect } from 'react';
import { X, Plus, Terminal as TerminalIcon } from 'lucide-react';
import TerminalComponent from '../terminal';
import { type Server } from '../../lib/api';

interface Tab {
    id: string;
    title: string;
    server: Server;
}

export function MultiTabTerminal({ initialServer }: { initialServer: Server }) {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    // Initialize with the requested server
    useEffect(() => {
        if (initialServer && tabs.length === 0) {
            const newTab = {
                id: crypto.randomUUID(),
                title: initialServer.hostname,
                server: initialServer
            };
            setTabs([newTab]);
            setActiveTabId(newTab.id);
        }
    }, [initialServer]);

    // Force resize event when switching tabs to ensure xterm fits correctly
    useEffect(() => {
        // Small delay to allow CSS display transition
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
        return () => clearTimeout(timer);
    }, [activeTabId]);

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);

        if (activeTabId === id) {
            if (newTabs.length > 0) {
                setActiveTabId(newTabs[newTabs.length - 1].id);
            } else {
                setActiveTabId(null);
            }
        }
    };

    const addNewTab = () => {
        // For now, duplicate current server. In future, open server selector.
        if (initialServer) {
            const newTab = {
                id: crypto.randomUUID(),
                title: initialServer.hostname, // + ` (${tabs.length + 1})`,
                server: initialServer
            };
            setTabs([...tabs, newTab]);
            setActiveTabId(newTab.id);
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
                            onClick={() => setActiveTabId(tab.id)}
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
                    title="New Terminal Session"
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
                            // Use visibility + z-index to keep in DOM but hide
                            // Display none causes xterm fit issues, but we trigger resize event on switch.
                            display: activeTabId === tab.id ? 'block' : 'none',
                        }}
                    >
                        <TerminalComponent
                            serverData={tab.server}
                            hostname={tab.server.hostname}
                        // Pass handlers if needed
                        />
                    </div>
                ))}

                {tabs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-[#555] gap-4">
                        <TerminalIcon className="w-16 h-16 opacity-20" />
                        <p>No active sessions</p>
                        <button
                            onClick={addNewTab}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                            Start New Session
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
