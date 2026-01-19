import { useEffect, useState } from 'react';
import { Search, Server as ServerIcon, ChevronDown, ChevronRight, RotateCw } from 'lucide-react';
import { fetchServers, type Server } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function ServerExplorer() {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { openTab } = useWorkspaceStore();

    const loadServers = () => {
        setLoading(true);
        setError(null);
        fetchServers()
            .then(data => {
                setServers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load servers", err);
                setError(err.message || "Failed to connect to server");
                setLoading(false);
            });
    };

    useEffect(() => {
        loadServers();
    }, []);

    const filteredServers = servers.filter(s =>
        s.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ip_address.includes(searchTerm)
    );

    const handleServerDoubleClick = (server: Server) => {
        openTab({
            type: 'terminal',
            title: server.hostname,
            serverId: server.id.toString(), // id is number in API, string in Tab
            server: server,
        });
    };

    if (loading) return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>Loading inventory...</span>
        </div>
    );

    if (error) return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-xs text-red-400 gap-2 text-center">
            <span>{error}</span>
            <button
                onClick={loadServers}
                className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded transition-colors flex items-center gap-1"
            >
                <RotateCw className="w-3 h-3" /> Retry
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none">
            {/* Header / Search */}
            <div className="p-2 border-b border-[#333]">
                <div className="flex items-center justify-between mb-2 pl-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Explorer
                    </div>
                    <button onClick={loadServers} title="Refresh" className="hover:bg-[#333] p-1 rounded">
                        <RotateCw className="w-3 h-3 text-gray-400" />
                    </button>
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
            <div className="flex-1 overflow-y-auto p-1 font-sans">
                <CollapsibleGroup title="All Servers" count={filteredServers.length} defaultOpen={true}>
                    {filteredServers.map(server => (
                        <div
                            key={server.id}
                            className="group flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#2a2d2e] rounded-sm text-sm border border-transparent hover:border-[#333]"
                            onDoubleClick={() => handleServerDoubleClick(server)}
                            title={`Double click to open terminal\n${server.ip_address}`}
                        >
                            <ServerIcon className={`h-3.5 w-3.5 ${getIconColor(server)}`} />
                            <span className="truncate flex-1 text-xs">{server.hostname}</span>
                            <span className="text-[10px] text-gray-500 hidden group-hover:block">{server.ip_address}</span>
                        </div>
                    ))}
                    {filteredServers.length === 0 && (
                        <div className="text-xs text-gray-500 px-4 py-2 italic text-center opacity-60">No servers found</div>
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
                <span className="text-xs bg-[#3c3c3c] rounded-full px-1.5 ml-auto">{count}</span>
            </div>
            {isOpen && (
                <div className="pl-2 border-l border-[#333] ml-2 mt-1 space-y-0.5">
                    {children}
                </div>
            )}
        </div>
    );
}

function getIconColor(server: Server) {
    if (server.os_info?.toLowerCase().includes('windows')) return 'text-blue-400';
    if (server.os_info?.toLowerCase().includes('linux') || server.os_info?.toLowerCase().includes('ubuntu')) return 'text-orange-400';
    return 'text-gray-400';
}
