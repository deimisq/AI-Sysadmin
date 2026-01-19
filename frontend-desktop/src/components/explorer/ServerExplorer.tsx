import { useEffect, useState } from 'react';
import { Search, Monitor, Terminal, Server as ServerIcon, Folder, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchServers, type Server } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function ServerExplorer() {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { openTab } = useWorkspaceStore();

    useEffect(() => {
        fetchServers()
            .then(data => {
                setServers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load servers", err);
                setLoading(false);
            });
    }, []);

    // Simple grouping logic (mocked for now as 'All Servers', 'Linux', 'Windows')
    // In real world, we would parse tags or group_id
    const filteredServers = servers.filter(s =>
        s.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ip_address.includes(searchTerm)
    );

    const handleServerClick = (server: Server) => {
        // Just select? Or maybe open details?
        // For now, let's open terminal on double click
    };

    const handleServerDoubleClick = (server: Server) => {
        openTab({
            type: 'terminal',
            title: server.hostname,
            serverId: server.id,
            server: server,
        });
    };

    if (loading) return <div className="p-4 text-xs text-muted-foreground">Loading inventory...</div>;

    return (
        <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none">
            {/* Header / Search */}
            <div className="p-2 border-b border-[#333]">
                <div className="text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground pl-1">
                    Explorer
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search servers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-[#3c3c3c] border border-transparent focus:border-blue-500 rounded-sm py-1 pl-7 pr-2 text-xs text-white placeholder-gray-500 outline-none"
                    />
                </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto p-1">
                {/* Simulated Group */}
                <CollapsibleGroup title="All Servers" count={filteredServers.length} defaultOpen={true}>
                    {filteredServers.map(server => (
                        <div
                            key={server.id}
                            className="group flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] rounded-sm text-sm"
                            onClick={() => handleServerClick(server)}
                            onDoubleClick={() => handleServerDoubleClick(server)}
                        >
                            <ServerIcon className={`h-3.5 w-3.5 ${getIconColor(server)}`} />
                            <span className="truncate flex-1">{server.hostname}</span>
                            <span className="text-[10px] text-gray-500 hidden group-hover:block">{server.ip_address}</span>
                        </div>
                    ))}
                    {filteredServers.length === 0 && (
                        <div className="text-xs text-gray-500 px-4 py-2 italic">No servers found</div>
                    )}
                </CollapsibleGroup>
            </div>
        </div>
    );
}

function CollapsibleGroup({ title, count, children, defaultOpen = false }: { title: string, count: number, children: React.ReactNode, defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-1">
            <div
                className="flex items-center gap-1 px-1 py-1 cursor-pointer hover:text-white"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="text-xs font-bold uppercase">{title}</span>
                <span className="text-xs bg-[#3c3c3c] rounded-full px-1.5">{count}</span>
            </div>
            {isOpen && (
                <div className="pl-2 border-l border-[#333] ml-2">
                    {children}
                </div>
            )}
        </div>
    );
}

function getIconColor(server: Server) {
    if (server.os_family === 'windows') return 'text-blue-400';
    if (server.os_family === 'linux') return 'text-orange-400';
    return 'text-gray-400';
}
