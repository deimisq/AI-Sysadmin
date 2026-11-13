import { uiText, uiFormat } from '../../lib/ui-language';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, RotateCw, MoreVertical, Terminal, MessageSquare, Pencil, Trash2, Plus, Folder } from 'lucide-react';
import { emptyFolderLayout, readFolderLayout, removeFolder, folderPath, type FolderLayout, type ConnectionFolder } from '../../lib/connection-folders';
import { isLocalWorkspace } from '../../lib/workspace-mode';
import { api, fetchServers, fetchGroups, fetchCurrentUser, deleteServer, type Server } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { ServerFormDialog } from '../servers/ServerFormDialog';
import { GroupManagement } from '@/components/admin/group-management';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FolderCog } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { toast } from 'sonner';
import { OSIcon } from '../os-icon';
import { connectionPresentation } from '../../lib/connection-presentation';

export function ServerExplorer() {
    const local = isLocalWorkspace();
    const [servers, setServers] = useState<Server[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showGroupManager, setShowGroupManager] = useState(false);
    const [layout, setLayout] = useState<FolderLayout>(emptyFolderLayout);
    const [folderForm, setFolderForm] = useState<{ id?: string; parentId: string | null; name: string } | null>(null);
    const [deletingFolder, setDeletingFolder] = useState<string | null>(null);
    const [deletingServer, setDeletingServer] = useState<Server | null>(null);
    const layoutKey = currentUser ? `connection-folders:v1:${local ? 'device' : currentUser.organization_id ?? 'personal'}:${currentUser.id}` : null;
    const folderRevision = useRef(0);
    const folderSaving = useRef(false);
    const folderReady = useRef(false);
    const folderLoadVersion = useRef(0);
    useEffect(() => {
        if (!layoutKey) return;
        let active = true;
        const load = async () => {
            const version = ++folderLoadVersion.current;
            folderReady.current = false;
            try {
                if (local) {
                    let saved = await api.get<{ migrated: boolean; layout: FolderLayout; revision: number }>('/workspace/folders');
                    if (!saved.migrated) {
                        const legacy = readFolderLayout(localStorage.getItem(layoutKey));
                        const inventory = await fetchServers(); const valid = new Set(inventory.map(server => String(server.id)));
                        legacy.assignments = Object.fromEntries(Object.entries(legacy.assignments).filter(([id]) => valid.has(id)));
                        saved = await api.put('/workspace/folders', { layout: legacy, revision: saved.revision });
                    }
                    if (active && version === folderLoadVersion.current) { setLayout(saved.layout); folderRevision.current = saved.revision; folderReady.current = true; }
                } else if (active) { setLayout(readFolderLayout(localStorage.getItem(layoutKey))); folderReady.current = true; }
            } catch { if (active) toast.error(uiText('No se pudo leer la organización de carpetas. Actualiza el inventario para reintentar.')); }
        };
        void load(); window.addEventListener('local-inventory-restored',load); window.addEventListener('connection-folders-refresh',load);
        return () => { active = false; window.removeEventListener('local-inventory-restored',load); window.removeEventListener('connection-folders-refresh',load); };
    }, [layoutKey]);
    const saveLayout = async (next: FolderLayout) => {
        if (!layoutKey) return false;
        if (!folderReady.current || folderSaving.current) { toast.warning(uiText('Espera a que termine la carga o el guardado de carpetas.')); return false; }
        folderSaving.current = true;
        try {
            if (local) { const saved = await api.put<{ revision: number; layout: FolderLayout }>('/workspace/folders',{ layout: next, revision: folderRevision.current }); folderRevision.current = saved.revision; setLayout(saved.layout); }
            else { localStorage.setItem(layoutKey, JSON.stringify(next)); setLayout(next); }
            return true;
        }
        catch { toast.error(uiText('No se pudieron guardar las carpetas. Se recargará la organización guardada.')); window.dispatchEvent(new Event('connection-folders-refresh')); return false; }
        finally { folderSaving.current = false; }
    };
    const addFolder = (parentId: string | null = null) => {
        setFolderForm({ parentId, name: '' });
    };

    // Actions
    const { openTab, toggleAIPanel, aiPanelVisible } = useWorkspaceStore();

    // Edit/Add Interface
    const [formOpen, setFormOpen] = useState(false);
    const [editingServer, setEditingServer] = useState<Server | null>(null);
    const [creationFolderId, setCreationFolderId] = useState<string | null>(null);
    const { explorerAction, requestExplorerAction, activeTabId, tabs } = useWorkspaceStore();
    const searchInput = useRef<HTMLInputElement>(null);
    const selectedServer = tabs.find(tab => tab.id === activeTabId)?.serverId;
    useEffect(() => {
        if (!explorerAction || loading || error) return;
        if (explorerAction === 'add-server') { setCreationFolderId(null); setEditingServer(null); setFormOpen(true); }
        if (explorerAction === 'add-folder') setFolderForm({ parentId: null, name: '' });
        if (explorerAction === 'search') searchInput.current?.focus();
        requestExplorerAction(null);
    }, [explorerAction, loading, error, requestExplorerAction]);

    const loadData = () => {
        window.dispatchEvent(new Event('connection-inventory-changed'));
        window.dispatchEvent(new Event('connection-folders-refresh'));
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
                // Also fetch current user if not present (silent)
                fetchCurrentUser().then(setCurrentUser).catch(console.error);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load data", err);
                const errorMessage = err.message || "";
                if (errorMessage.includes("Could not validate credentials") || errorMessage.includes("401")) {
                    localStorage.removeItem('token');
                    window.location.href = '#/login'; // Force navigation
                    window.location.reload();
                    return;
                }
                setError(errorMessage || "Failed to load inventory");
                setLoading(false);
            });
    };

    useEffect(() => {
        loadData();
        window.addEventListener('local-inventory-restored',loadData);
        return () => window.removeEventListener('local-inventory-restored',loadData);
    }, []);

    // Filter and Group Logic
    const filteredServers = useMemo(() => {
        const matchingGroups = new Set(groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).map(g => g.id));
        return servers.filter(s =>
            s.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.ip_address.includes(searchTerm) || matchingGroups.has(s.group_id)
        );
    }, [servers, groups, searchTerm]);

    const groupedServers = useMemo(() => {
        const groupsMap: Record<string, Server[]> = {};

        // Initialize groups
        groups.forEach((g: any) => {
            groupsMap[g.id] = [];
        });
        groupsMap['ungrouped'] = [];

        // Distribute servers
        filteredServers.forEach(server => {
            if (layout.assignments[server.id]) return;
            const gid = server.group_id && groups.some(g => g.id === server.group_id) ? String(server.group_id) : 'ungrouped';
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
    }, [filteredServers, groups, layout]);

    // Handlers
    const handleConnect = (server: Server) => {
        console.log('[ServerExplorer] handleConnect triggered for:', server.hostname);
        openTab({
            type: 'terminal',
            title: server.hostname,
            serverId: server.id.toString(),
            server: server,
        });
    };

    const handleChat = (server: Server) => {
        handleConnect(server);
        if (!aiPanelVisible) toggleAIPanel();
    };

    const handleEdit = (server: Server) => {
        setCreationFolderId(null);
        setEditingServer(server);
        setFormOpen(true);
    };

    const handleDelete = (server: Server) => setDeletingServer(server);
    const confirmDeleteServer = async () => {
        if (deletingServer) {
            try {
                await deleteServer(deletingServer.id);
                setDeletingServer(null);
                toast.success(uiText("Servidor eliminado"));
                loadData();
            } catch (err: any) {
                toast.error(uiFormat("Error: {0}", err.message));
            }
        }
    };

    const handleAddServer = () => {
        setCreationFolderId(null);
        setEditingServer(null);
        setFormOpen(true);
    };

    const renderServer = (server: Server) => (
        <ServerItem key={server.id} server={server} onConnect={() => handleConnect(server)}
            selected={selectedServer === String(server.id)}
            onChat={() => handleChat(server)} onEdit={() => handleEdit(server)} onDelete={() => handleDelete(server)}
            folders={layout.folders} folderId={layout.assignments[server.id] || ''}
            onMove={folderId => {
                const assignments = { ...layout.assignments };
                if (folderId) assignments[server.id] = folderId; else delete assignments[server.id];
                saveLayout({ ...layout, assignments });
            }} />
    );
    const renderFolder = (folder: ConnectionFolder, ancestorMatches = false): React.ReactNode => {
        const matches = ancestorMatches || folder.name.toLowerCase().includes(searchTerm.toLowerCase());
        const folderServers = (matches ? servers : filteredServers).filter(s => layout.assignments[s.id] === folder.id);
        const children = layout.folders.filter(f => f.parentId === folder.id).map(f => renderFolder(f, matches));
        if (searchTerm && !matches && !folderServers.length && !children.some(Boolean)) return null;
        return <CollapsibleGroup key={folder.id} expansionKey={`${layoutKey}:folder:${folder.id}`} title={folder.name} count={folderServers.length} defaultOpen={true} forceOpen={!!searchTerm}
            actions={<DropdownMenu><DropdownMenuTrigger aria-label={`Opciones de ${folder.name}`} className="p-1"><MoreVertical className="h-3 w-3" /></DropdownMenuTrigger><DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setCreationFolderId(folder.id); setEditingServer(null); setFormOpen(true); }}>{uiText("Nueva conexión en esta carpeta")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => addFolder(folder.id)}>{uiText("Crear subcarpeta")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFolderForm({ ...folder })}>{uiText("Renombrar")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeletingFolder(folder.id)}>{uiText("Eliminar carpeta")}</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu>}>
            <div className="pl-1 border-l border-[#333] ml-2">
                {children}
                {folderServers.map(renderServer)}
                {!folderServers.length && !layout.folders.some(f => f.parentId === folder.id) && <p className="px-3 py-2 text-xs text-gray-400">{uiText("Carpeta vacía")}</p>}
            </div>
        </CollapsibleGroup>;
    };

    if (loading && servers.length === 0) return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>{uiText("Cargando inventario...")}</span>
        </div>
    );

    if (error) return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-xs text-red-400 gap-2 text-center">
            <span>{error}</span>
            <button
                onClick={loadData}
                className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded transition-colors flex items-center gap-1"
            >
                <RotateCw className="w-3 h-3" />{uiText("Reintentar")}</button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#20232b] text-[#cccccc] select-none">
            {/* Header / Search */}
            <div className="px-2 py-1.5 border-b border-[#333] space-y-1">
                <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">{uiText("CONEXIONES")}</div>
                    <div className="flex gap-1">
                        <button onClick={() => addFolder()} disabled={!layoutKey} aria-label="Crear carpeta local" title="Crear carpeta local" className="hover:bg-[#333] p-1 rounded disabled:opacity-30"><Folder className="w-3.5 h-3.5" /></button>
                        <button onClick={handleAddServer} title={uiText("Agregar Servidor")} className="hover:bg-[#333] p-1 rounded text-gray-400 hover:text-white">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        {!local && <button onClick={() => setShowGroupManager(true)} title={uiText("Gestionar Grupos")} className="hover:bg-[#333] p-1 rounded text-gray-400 hover:text-white">
                            <FolderCog className="w-3.5 h-3.5" />
                        </button>}
                        <button onClick={loadData} title="Refrescar" className="hover:bg-[#333] p-1 rounded text-gray-400 hover:text-white">
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-500" />
                    <input
                        type="text"
                        ref={searchInput}
                        aria-label={uiText("Buscar en el inventario")}
                        placeholder={uiText("Nombre, dirección o grupo…")}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-[#3c3c3c] border border-transparent focus:border-blue-500 rounded-sm py-1 pl-7 pr-2 text-xs text-white placeholder-gray-500 outline-none"
                    />
                </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto p-1 font-sans">

                {layout.folders.filter(f => f.parentId === null).map(f => renderFolder(f))}
                {/* Render Groups */}
                {groups.map(group => {
                    const groupServersList = groupedServers[group.id] || [];
                    if (searchTerm && groupServersList.length === 0) return null;

                    return (
                        <CollapsibleGroup
                            key={group.id}
                            expansionKey={`${layoutKey}:group:${group.id}`}
                            title={group.name}
                            count={groupServersList.length}
                            defaultOpen={true}
                            forceOpen={!!searchTerm}
                        >
                            {groupServersList.map(renderServer)}
                        </CollapsibleGroup>
                    );
                })}

                {/* Render Ungrouped */}
                {groupedServers['ungrouped'] && groupedServers['ungrouped'].length > 0 && (
                    <CollapsibleGroup
                        expansionKey={`${layoutKey}:ungrouped`}
                        title="Sin Agrupar"
                        count={groupedServers['ungrouped'].length}
                        defaultOpen={true}
                        forceOpen={!!searchTerm}
                    >
                        {groupedServers['ungrouped'].map(renderServer)}
                    </CollapsibleGroup>
                )}

                {/* Empty State */}
                {filteredServers.length === 0 && layout.folders.length === 0 && (
                    <div className="text-xs text-gray-500 px-4 py-8 italic text-center opacity-60">
                        {searchTerm ? uiText('No se encontraron resultados') : uiText('No hay servidores')}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <Dialog open={!!deletingServer} onOpenChange={open => { if (!open) setDeletingServer(null); }}>
                <DialogContent className="bg-card text-card-foreground">
                    <DialogTitle>{uiText("Eliminar conexión")}{" "}{deletingServer?.hostname}</DialogTitle>
                    <DialogDescription>{uiText("Se elimina del inventario. No se borra ni modifica el servidor remoto.")}</DialogDescription>
                    <div className="flex justify-end gap-2"><button onClick={() => setDeletingServer(null)} className="px-3 py-2 rounded border border-border">{uiText("Cancelar")}</button><button onClick={confirmDeleteServer} className="px-3 py-2 rounded bg-red-700 text-white">{uiText("Eliminar conexión")}</button></div>
                </DialogContent>
            </Dialog>
            <Dialog open={!!folderForm} onOpenChange={open => { if (!open) setFolderForm(null); }}>
                <DialogContent className="bg-card text-card-foreground">
                    <DialogTitle>{folderForm?.id ? 'Renombrar carpeta' : 'Crear carpeta local'}</DialogTitle>
                    <DialogDescription>{uiText("Organiza conexiones en este equipo sin cambiar sus permisos.")}</DialogDescription>
                    <form className="space-y-4" onSubmit={async event => {
                        event.preventDefault();
                        if (!folderForm?.name.trim()) return;
                        const name = folderForm.name.trim();
                        const saved = await saveLayout({ ...layout, folders: folderForm.id
                            ? layout.folders.map(f => f.id === folderForm.id ? { ...f, name } : f)
                            : [...layout.folders, { id: crypto.randomUUID(), name, parentId: folderForm.parentId }] });
                        if (saved) setFolderForm(null);
                    }}>
                        <label className="block text-sm">{uiText("Nombre de la carpeta")}<input autoFocus required maxLength={100} value={folderForm?.name || ''} onChange={e => setFolderForm(prev => prev ? { ...prev, name: e.target.value } : null)} className="mt-2 w-full bg-muted border border-border rounded p-2" />
                        </label>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setFolderForm(null)} className="px-3 py-2 rounded border border-border">{uiText("Cancelar")}</button><button type="submit" disabled={!folderForm?.name.trim()} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-40">{uiText("Guardar carpeta")}</button></div>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!deletingFolder} onOpenChange={open => { if (!open) setDeletingFolder(null); }}>
                <DialogContent className="bg-card text-card-foreground">
                    <DialogTitle>{uiText("Eliminar carpeta y subcarpetas")}</DialogTitle>
                    <DialogDescription>{uiText("Los servidores se conservarán y volverán a mostrarse en sus grupos originales.")}</DialogDescription>
                    <div className="flex justify-end gap-2"><button onClick={() => setDeletingFolder(null)} className="px-3 py-2 rounded border border-border">{uiText("Cancelar")}</button><button onClick={() => { if (deletingFolder) saveLayout(removeFolder(layout, deletingFolder)); setDeletingFolder(null); }} className="px-3 py-2 rounded bg-red-700 text-white">{uiText("Eliminar carpeta")}</button></div>
                </DialogContent>
            </Dialog>
            <ServerFormDialog
                open={formOpen}
                onOpenChange={(v) => {
                    setFormOpen(v);
                    if (!v) setEditingServer(null);
                }}
                serverToEdit={editingServer}
                groups={groups}
                destination={creationFolderId ? folderPath(layout.folders, creationFolderId) || 'Carpeta no disponible' : undefined}
                onSuccess={async saved => {
                    try {
                        if (!editingServer && creationFolderId) {
                            if (!layout.folders.some(folder => folder.id === creationFolderId)) {
                                toast.warning(uiText('La conexión se guardó en su grupo original: la carpeta de destino ya no está disponible.'));
                            } else {
                                const assigned = await saveLayout({ ...layout, assignments: { ...layout.assignments, [saved.id]: creationFolderId } });
                                if (!assigned) toast.warning(uiText('La conexión se guardó en su grupo original. Puedes moverla a la carpeta desde sus opciones.'));
                            }
                        }
                    } finally { loadData(); }
                }}
            />

            <Dialog open={showGroupManager} onOpenChange={setShowGroupManager}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border">
                    <GroupManagement currentUser={currentUser} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Sub-components

function CollapsibleGroup({ title, count, children, expansionKey, defaultOpen = false, forceOpen = false, actions }: { title: string, count: number, children: React.ReactNode, expansionKey: string, defaultOpen?: boolean, forceOpen?: boolean, actions?: React.ReactNode }) {
    const isOpen = useWorkspaceStore(state => state.explorerExpanded[expansionKey] ?? defaultOpen);
    const setExpanded = useWorkspaceStore(state => state.setExplorerExpanded);
    const expanded = forceOpen || isOpen;

    return (
        <div className="mb-0.5">
            <div className="flex items-center">
            <button type="button" aria-expanded={expanded}
                className="flex flex-1 min-w-0 items-center gap-1 px-2 py-1 hover:bg-[#2a2d2e] text-[#ccc] group text-left"
                onClick={() => { if (!forceOpen) setExpanded(expansionKey, !isOpen); }}
            >
                {expanded ? <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-white" /> : <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-white" />}
                <span className="text-xs font-semibold uppercase tracking-tight flex-1 truncate">{title}</span>
                {count > 0 && <span className="text-[10px] bg-[#3c3c3c] text-gray-400 rounded-full px-1.5 min-w-[1.2em] text-center">{count}</span>}
            </button>{actions}</div>
            {expanded && (
                <div className="space-y-0">
                    {children}
                </div>
            )}
        </div>
    );
}

interface ServerItemProps {
    selected: boolean;
    server: Server;
    onConnect: () => void;
    onChat: () => void;
    onEdit: () => void;
    onDelete: () => void;
    folders: ConnectionFolder[];
    folderId: string;
    onMove: (folderId: string) => void;
}

function ServerItem({ server, selected, onConnect, onChat, onEdit, onDelete, folders, folderId, onMove }: ServerItemProps) {
    const connection = connectionPresentation(server);
    return (
        <div
            className={`group flex items-center gap-1.5 pl-3 pr-1 h-7 cursor-pointer hover:bg-[#2a2d2e] text-xs text-gray-300 hover:text-white border relative ${selected ? 'bg-blue-500/10 border-blue-500/30' : 'border-transparent hover:border-[#333]'}`}
            onDoubleClick={onConnect}
        >
            <OSIcon os={server.os_info} className="h-3.5 w-3.5 min-w-[14px]" />
            <button type="button" onClick={event => { if (event.detail === 0) onConnect(); }} aria-label={uiFormat("Abrir conexión {0}", server.hostname)} title={`${server.hostname} · ${server.ip_address} · ${connection.protocol}:${connection.port}\nDoble clic o Enter para conectar`} className="flex-1 min-w-0 text-left py-0.5">
                <div className="truncate text-xs leading-tight">{server.hostname}</div>

            </button>

            <span className="protocol-badge" title={`Protocolo ${connection.protocol}, puerto ${connection.port}`}>{connection.protocol}</span>

            {/* Actions Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger aria-label={`Opciones de ${server.hostname}`} className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 hover:bg-[#444] rounded data-[state=open]:opacity-100 data-[state=open]:bg-[#444]">
                    <MoreVertical className="h-3 w-3 text-gray-400 hover:text-white" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#252526] border-[#444] text-[#ccc] z-50">
                    <label className="block p-2 text-xs">{uiText("Carpeta local")}<select aria-label={`Carpeta de ${server.hostname}`} value={folderId} onChange={e => onMove(e.target.value)} className="mt-1 w-full bg-[#333] text-white rounded p-1">
                            <option value="">{uiText("Grupo original")}</option>
                            {folders.map(f => <option key={f.id} value={f.id}>{folderPath(folders, f.id)}</option>)}
                        </select>
                    </label>
                    <DropdownMenuItem onClick={onConnect} className="hover:bg-[#094771] hover:text-white cursor-pointer py-1.5 focus:bg-[#094771] focus:text-white">
                        <Terminal className="mr-2 h-3.5 w-3.5" />{uiText("Abrir conexión")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={onChat} className="hover:bg-[#333] focus:bg-[#333] cursor-pointer py-1.5">
                        <MessageSquare className="mr-2 h-3.5 w-3.5" />{uiText("Asistente IA")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit} className="hover:bg-[#333] focus:bg-[#333] cursor-pointer py-1.5">
                        <Pencil className="mr-2 h-3.5 w-3.5" />{uiText("Editar")}</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#444]" />
                    <DropdownMenuItem onClick={onDelete} className="hover:bg-[#333] focus:bg-[#333] text-red-400 hover:text-red-300 focus:text-red-300 cursor-pointer py-1.5">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />{uiText("Eliminar")}</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
