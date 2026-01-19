import { useEffect, useState, useMemo } from 'react';
import { Search, Server as ServerIcon, ChevronDown, ChevronRight, RotateCw, MoreVertical, Terminal, MessageSquare, Pencil, Trash2, Zap, Plus } from 'lucide-react';
import { fetchServers, fetchGroups, deleteServer, type Server } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { ServerFormDialog } from '../servers/ServerFormDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { toast } from 'sonner';

export function ServerExplorer() {
    const [servers, setServers] = useState<Server[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Actions
    const { openTab, toggleAIPanel, aiPanelVisible } = useWorkspaceStore();

    // Edit/Add Interface
    const [formOpen, setFormOpen] = useState(false);
    const [editingServer, setEditingServer] = useState<Server | null>(null);

    const loadData = () => {
        setLoading(true);
        setError(null);
        Promise.all([
            fetchServers(),
            fetchGroups().catch(err => {
                console.warn("Failed to fetch groups", err);
                return [];
            })
        ])
            .then(([serversData, groupsData]) => {
                setServers(serversData);
                setGroups(groupsData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load data", err);
                setError(err.message || "Failed to load inventory");
                setLoading(false);
            });
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter and Group Logic
    const filteredServers = useMemo(() => {
        return servers.filter(s =>
            s.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.ip_address.includes(searchTerm)
        );
    }, [servers, searchTerm]);

    const groupedServers = useMemo(() => {
        const groupsMap: Record<string, Server[]> = {};

        // Initialize groups
        groups.forEach((g: any) => {
            groupsMap[g.id] = [];
        });
        groupsMap['ungrouped'] = [];

        // Distribute servers
        filteredServers.forEach(server => {
            const gid = server.group_id ? String(server.group_id) : 'ungrouped';
            if (groupsMap[gid]) {
                groupsMap[gid].push(server);
            } else {
                // If group id exists in server but not in groups list, put in ungrouped or creating key?
                // Better put in ungrouped or render anyway. Let's create key if missing to be safe
                if (!groupsMap[gid]) groupsMap[gid] = [];
                groupsMap[gid].push(server);
            }
        });

        return groupsMap;
    }, [filteredServers, groups]);

    // Handlers
    const handleConnect = (server: Server) => {
        openTab({
            type: 'terminal',
            title: server.hostname,
            serverId: server.id.toString(),
            server: server,
        });
    };

    const handleChat = (server: Server) => {
        if (!aiPanelVisible) toggleAIPanel();
        // TODO: Set context for AI chat
        toast.info(`Chat context: ${server.hostname}`);
    };

    const handleEdit = (server: Server) => {
        setEditingServer(server);
        setFormOpen(true);
    };

    const handleDelete = async (server: Server) => {
        if (confirm(`¿Estás seguro de eliminar el servidor ${server.hostname}?`)) {
            try {
                await deleteServer(server.id);
                toast.success("Servidor eliminado");
                loadData();
            } catch (err: any) {
                toast.error(`Error: ${err.message}`);
            }
        }
    };

    const handleAddServer = () => {
        setEditingServer(null);
        setFormOpen(true);
    };

    if (loading && servers.length === 0) return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>Cargando inventario...</span>
        </div>
    );

    if (error) return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-xs text-red-400 gap-2 text-center">
            <span>{error}</span>
            <button
                onClick={loadData}
                className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded transition-colors flex items-center gap-1"
            >
                <RotateCw className="w-3 h-3" /> Reintentar
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#252526] text-[#cccccc] select-none">
            {/* Header / Search */}
            <div className="p-3 border-b border-[#333] space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        EXPLORADOR
                    </div>
                    <div className="flex gap-1">
                        <button onClick={handleAddServer} title="Agregar Servidor" className="hover:bg-[#333] p-1 rounded text-gray-400 hover:text-white">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={loadData} title="Refrescar" className="hover:bg-[#333] p-1 rounded text-gray-400 hover:text-white">
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-[#3c3c3c] border border-transparent focus:border-blue-500 rounded-sm py-1.5 pl-8 pr-2 text-xs text-white placeholder-gray-500 outline-none"
                    />
                </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto p-1 font-sans">
                {/* Render Groups */}
                {groups.map(group => {
                    const groupServersList = groupedServers[group.id] || [];
                    if (groupServersList.length === 0) return null; // Hide empty groups? Or show empty? Usually better to show.

                    return (
                        <CollapsibleGroup
                            key={group.id}
                            title={group.name}
                            count={groupServersList.length}
                            defaultOpen={true}
                        >
                            {groupServersList.map(server => (
                                <ServerItem
                                    key={server.id}
                                    server={server}
                                    onConnect={() => handleConnect(server)}
                                    onChat={() => handleChat(server)}
                                    onEdit={() => handleEdit(server)}
                                    onDelete={() => handleDelete(server)}
                                />
                            ))}
                        </CollapsibleGroup>
                    );
                })}

                {/* Render Ungrouped */}
                {groupedServers['ungrouped'] && groupedServers['ungrouped'].length > 0 && (
                    <CollapsibleGroup
                        title="Sin Agrupar"
                        count={groupedServers['ungrouped'].length}
                        defaultOpen={true}
                    >
                        {groupedServers['ungrouped'].map(server => (
                            <ServerItem
                                key={server.id}
                                server={server}
                                onConnect={() => handleConnect(server)}
                                onChat={() => handleChat(server)}
                                onEdit={() => handleEdit(server)}
                                onDelete={() => handleDelete(server)}
                            />
                        ))}
                    </CollapsibleGroup>
                )}

                {/* Empty State */}
                {filteredServers.length === 0 && (
                    <div className="text-xs text-gray-500 px-4 py-8 italic text-center opacity-60">
                        {searchTerm ? 'No se encontraron resultados' : 'No hay servidores'}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <ServerFormDialog
                open={formOpen}
                onOpenChange={(v) => {
                    setFormOpen(v);
                    if (!v) setEditingServer(null);
                }}
                serverToEdit={editingServer}
                groups={groups}
                onSuccess={loadData}
            />
        </div>
    );
}

// Sub-components

function CollapsibleGroup({ title, count, children, defaultOpen = false }: { title: string, count: number, children: React.ReactNode, defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-0.5">
            <div
                className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-[#ccc] group"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-white" /> : <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-white" />}
                <span className="text-xs font-semibold uppercase tracking-tight flex-1 truncate">{title}</span>
                {count > 0 && <span className="text-[10px] bg-[#3c3c3c] text-gray-400 rounded-full px-1.5 min-w-[1.2em] text-center">{count}</span>}
            </div>
            {isOpen && (
                <div className="space-y-0.5 animate-in fade-in duration-100 slide-in-from-top-1">
                    {children}
                </div>
            )}
        </div>
    );
}

interface ServerItemProps {
    server: Server;
    onConnect: () => void;
    onChat: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function ServerItem({ server, onConnect, onChat, onEdit, onDelete }: ServerItemProps) {
    return (
        <div
            className="group flex items-center gap-2 pl-6 pr-2 py-1 cursor-pointer hover:bg-[#2a2d2e] text-sm text-gray-300 hover:text-white border border-transparent hover:border-[#333] relative"
            onDoubleClick={onConnect}
        >
            <ServerIcon className={`h-3.5 w-3.5 min-w-[14px] ${getIconColor(server)}`} />
            <div className="flex-1 min-w-0">
                <div className="truncate text-xs leading-tight">{server.hostname}</div>
                <div className="truncate text-[10px] text-gray-500 group-hover:text-gray-400 leading-tight">{server.ip_address}</div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#444] rounded outline-none data-[state=open]:opacity-100 data-[state=open]:bg-[#444]">
                    <MoreVertical className="h-3 w-3 text-gray-400 hover:text-white" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#252526] border-[#444] text-[#ccc] z-50">
                    <DropdownMenuItem onClick={onConnect} className="hover:bg-[#094771] hover:text-white cursor-pointer py-1.5 focus:bg-[#094771] focus:text-white">
                        <Terminal className="mr-2 h-3.5 w-3.5" /> Conectar SSH
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onChat} className="hover:bg-[#333] focus:bg-[#333] cursor-pointer py-1.5">
                        <MessageSquare className="mr-2 h-3.5 w-3.5" /> Asistente IA
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit} className="hover:bg-[#333] focus:bg-[#333] cursor-pointer py-1.5">
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                    </DropdownMenuItem>
                    <div className="h-[1px] bg-[#444] my-1" />
                    <DropdownMenuItem onClick={onDelete} className="hover:bg-[#333] focus:bg-[#333] text-red-400 hover:text-red-300 focus:text-red-300 cursor-pointer py-1.5">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function getIconColor(server: Server) {
    if (server.os_info?.toLowerCase().includes('windows')) return 'text-blue-400';
    if (server.os_info?.toLowerCase().includes('linux') || server.os_info?.toLowerCase().includes('ubuntu') || server.os_info?.toLowerCase().includes('debian')) return 'text-orange-400';
    return 'text-gray-400';
}
