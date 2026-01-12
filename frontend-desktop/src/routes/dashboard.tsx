import { useEffect, useState, useMemo } from 'react';
import {
    fetchServers,
    fetchGroups,
    createServer,
    updateServer,
    deleteServer,
    type Server
} from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
    Terminal,
    Search,
    Server as ServerIcon,
    Folder,
    FolderOpen,
    Filter,
    LayoutGrid,
    List,
    Plus,
    Settings,
    Zap,
    Pencil,
    Trash2,
    ChevronDown
} from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';
import { CSVImport } from '../components/csv-import';
import { GroupManager } from '../components/group-manager';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';
type SortMode = 'name' | 'ip' | 'group';

export default function Dashboard() {
    const navigate = useNavigate();
    const [servers, setServers] = useState<Server[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortMode, setSortMode] = useState<SortMode>('name');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

    // Dialog State
    const [addServerOpen, setAddServerOpen] = useState(false);
    const [addServerMode, setAddServerMode] = useState<'manual' | 'csv'>('manual');
    const [editingServer, setEditingServer] = useState<Server | null>(null);
    const [deletingServer, setDeletingServer] = useState<Server | null>(null);
    const [manageGroupsOpen, setManageGroupsOpen] = useState(false);

    // Form State
    const [serverForm, setServerForm] = useState({
        hostname: '',
        ip_address: '',
        description: '',
        os_info: '',
        group_id: null as number | null
    });

    useEffect(() => {
        console.log('Dashboard mounted');
        loadData();
    }, []);

    const loadData = async () => {
        console.log('Loading servers and groups...');
        setLoading(true);
        try {
            const [serverData, groupData] = await Promise.all([
                fetchServers(),
                fetchGroups().catch(() => [])
            ]);
            console.log('Loaded:', serverData.length, 'servers,', groupData.length, 'groups');
            setServers(serverData);
            setGroups(groupData);

            const initialExpanded: Record<string, boolean> = { 'ungrouped': true };
            groupData.forEach((g: any) => initialExpanded[g.id] = true);
            setExpandedGroups(initialExpanded);

        } catch (err: any) {
            console.error('Error loading:', err);
            if (err.message?.includes('credentials') || err.message?.includes('401')) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const handleAddServer = async () => {
        try {
            const payload = {
                ...serverForm,
                group_id: serverForm.group_id ?? undefined
            };
            await createServer(payload);
            toast.success('Servidor agregado exitosamente');
            loadData();
            setAddServerOpen(false);
            resetForm();
        } catch (err: any) {
            toast.error(err.message || 'Error al agregar servidor');
        }
    };

    const handleEditServer = async () => {
        if (!editingServer) return;
        try {
            const payload = {
                ...serverForm,
                group_id: serverForm.group_id ?? undefined
            };
            await updateServer(editingServer.id, payload);
            toast.success('Servidor actualizado');
            loadData();
            setEditingServer(null);
            resetForm();
        } catch (err: any) {
            toast.error(err.message || 'Error al actualizar');
        }
    };

    const handleDeleteServer = async () => {
        if (!deletingServer) return;
        try {
            await deleteServer(deletingServer.id);
            toast.success('Servidor eliminado');
            loadData();
            setDeletingServer(null);
        } catch (err: any) {
            toast.error(err.message || 'Error al eliminar');
        }
    };

    const openEditDialog = (server: Server) => {
        setEditingServer(server);
        setServerForm({
            hostname: server.hostname,
            ip_address: server.ip_address,
            description: server.description || '',
            os_info: server.os_info || '',
            group_id: server.group_id || null
        });
    };

    const resetForm = () => {
        setServerForm({
            hostname: '',
            ip_address: '',
            description: '',
            os_info: '',
            group_id: null
        });
    };

    // Filtering & Sorting
    let processedServers = servers.filter(s =>
        s.hostname.toLowerCase().includes(search.toLowerCase()) ||
        s.ip_address.includes(search)
    );

    if (selectedGroupFilter !== 'all') {
        if (selectedGroupFilter === 'ungrouped') {
            processedServers = processedServers.filter(s => !s.group_id);
        } else {
            processedServers = processedServers.filter(s => String(s.group_id) === selectedGroupFilter);
        }
    }

    processedServers.sort((a, b) => {
        switch (sortMode) {
            case 'name':
                return a.hostname.localeCompare(b.hostname);
            case 'ip':
                return a.ip_address.localeCompare(b.ip_address);
            case 'group':
                return (a.group_id || 0) - (b.group_id || 0);
            default:
                return 0;
        }
    });

    const serversByGroup = useMemo(() => {
        const grouped: Record<string, Server[]> = {};
        groups.forEach((g: any) => { grouped[g.id] = []; });
        grouped['ungrouped'] = [];

        processedServers.forEach(server => {
            const gid = server.group_id ? String(server.group_id) : 'ungrouped';
            if (!grouped[gid]) grouped[gid] = [];
            grouped[gid].push(server);
        });

        return grouped;
    }, [processedServers, groups]);

    const openConsole = (serverId: number) => {
        navigate(`/server/${serverId}/console`);
    };

    const ServerCard = ({ server }: { server: Server }) => (
        <Card className="hover:shadow-md transition-shadow group flex flex-col border-border/60 bg-card/50">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center justify-between text-base font-medium">
                    <span className="truncate" title={server.hostname}>{server.hostname}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pb-4 px-4 flex-1">
                <div className="text-xl font-mono text-primary truncate mb-1">{server.ip_address}</div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{server.os_info || 'Ubuntu 22.04'}</span>
                    {server.description && (
                        <>
                            <span>•</span>
                            <span className="truncate">{server.description}</span>
                        </>
                    )}
                </div>
            </CardContent>
            <CardFooter className="px-4 pb-4 pt-0 gap-2">
                <Button className="flex-1 h-9" onClick={() => openConsole(server.id)} type="button">
                    <Terminal className="mr-2 h-4 w-4" />
                    Consola
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title="Diagnóstico"
                    onClick={() => toast.info('Diagnóstico en desarrollo')}
                    type="button"
                >
                    <Zap className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title="Editar"
                    onClick={() => openEditDialog(server)}
                    type="button"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                    title="Eliminar"
                    onClick={() => setDeletingServer(server)}
                    type="button"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );

    const ServerListItem = ({ server }: { server: Server }) => (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
            <div className="flex-1 grid grid-cols-4 gap-4">
                <div>
                    <p className="font-medium">{server.hostname}</p>
                    <p className="text-xs text-muted-foreground">{server.os_info || 'Ubuntu 22.04'}</p>
                </div>
                <div className="font-mono text-sm text-primary">{server.ip_address}</div>
                <div className="text-sm text-muted-foreground truncate">{server.description || '-'}</div>
                <div className="flex gap-2 justify-end">
                    <Button size="sm" onClick={() => openConsole(server.id)}>
                        <Terminal className="mr-1 h-3 w-3" />
                        Consola
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(server)}>
                        <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeletingServer(server)}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    );

    const GroupSection = ({ id, name, count }: { id: string, name: string, count: number }) => {
        if (count === 0) return null;
        const isExpanded = expandedGroups[id];

        return (
            <div className="space-y-4">
                <div
                    className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => toggleGroup(id)}
                >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", !isExpanded && "-rotate-90")} />
                    {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                    <span className="font-medium">{name}</span>
                    <span className="text-xs opacity-60 ml-auto">{count} servidor{count !== 1 ? 'es' : ''}</span>
                </div>

                {isExpanded && (
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        : "space-y-2"
                    }>
                        {serversByGroup[id]?.map(server =>
                            viewMode === 'grid'
                                ? <ServerCard key={server.id} server={server} />
                                : <ServerListItem key={server.id} server={server} />
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full bg-background">
                {/* Header */}
                <div className="p-8 pb-4 space-y-6 border-b">
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Agente IA Sysadmin</h1>
                            <p className="text-muted-foreground mt-1">Gestiona tu infraestructura con asistencia inteligente</p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => setManageGroupsOpen(true)}
                                type="button"
                            >
                                <Settings className="h-4 w-4" />
                                Gestionar Grupos
                            </Button>
                            <Button
                                className="gap-2"
                                onClick={() => setAddServerOpen(true)}
                                type="button"
                            >
                                <Plus className="h-4 w-4" />
                                Agregar Servidor
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar servidores..."
                                className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Filter className="h-3.5 w-3.5" />
                                        {selectedGroupFilter === 'all' ? 'Todos los grupos' :
                                            selectedGroupFilter === 'ungrouped' ? 'Sin agrupar' :
                                                groups.find(g => String(g.id) === selectedGroupFilter)?.name}
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => setSelectedGroupFilter('all')}>
                                        Todos los grupos
                                    </DropdownMenuItem>
                                    {groups.map(g => (
                                        <DropdownMenuItem key={g.id} onClick={() => setSelectedGroupFilter(String(g.id))}>
                                            {g.name}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuItem onClick={() => setSelectedGroupFilter('ungrouped')}>
                                        Sin agrupar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        {sortMode === 'name' ? 'Nombre' : sortMode === 'ip' ? 'IP' : 'Grupo'}
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => setSortMode('name')}>
                                        Por nombre
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortMode('ip')}>
                                        Por IP
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortMode('group')}>
                                        Por grupo
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="h-6 w-[1px] bg-border mx-1" />
                            <div className="flex bg-muted/50 p-1 rounded-md">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-7 w-7", viewMode === 'grid' && "bg-background shadow-sm")}
                                    onClick={() => setViewMode('grid')}
                                    type="button"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-7 w-7", viewMode === 'list' && "bg-background shadow-sm")}
                                    onClick={() => setViewMode('list')}
                                    type="button"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-8">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-8">
                            {[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse h-40 bg-muted/10" />)}
                        </div>
                    ) : (
                        <div className="pt-8 space-y-8">
                            {groups.map(g => (
                                <GroupSection key={g.id} id={String(g.id)} name={g.name} count={serversByGroup[String(g.id)]?.length || 0} />
                            ))}
                            <GroupSection id="ungrouped" name="Sin agrupar" count={serversByGroup['ungrouped']?.length || 0} />

                            {processedServers.length === 0 && !loading && (
                                <div className="text-center py-20 text-muted-foreground">
                                    <ServerIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No se encontraron servidores</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Server Dialog */}
            <Dialog open={addServerOpen} onOpenChange={setAddServerOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Agregar Nuevo Servidor</DialogTitle>
                        <DialogDescription>
                            Agrega servidores manualmente o importa varios desde un archivo CSV
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 border-b pb-4">
                        <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            type="button"
                        >
                            <ServerIcon className="h-4 w-4" />
                            Agregar Manualmente
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => setAddServerMode('csv')}
                            type="button"
                        >
                            <Plus className="h-4 w-4" />
                            Importar desde CSV
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nombre *</Label>
                                <Input
                                    value={serverForm.hostname}
                                    onChange={(e) => setServerForm({ ...serverForm, hostname: e.target.value })}
                                    placeholder="ej., servidor-web-01"
                                />
                            </div>
                            <div>
                                <Label>Dirección IP *</Label>
                                <Input
                                    value={serverForm.ip_address}
                                    onChange={(e) => setServerForm({ ...serverForm, ip_address: e.target.value })}
                                    placeholder="ej., 192.168.1.100"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Sistema Operativo</Label>
                            <Input
                                value={serverForm.os_info}
                                onChange={(e) => setServerForm({ ...serverForm, os_info: e.target.value })}
                                placeholder="ej., Ubuntu 22.04"
                            />
                        </div>

                        <div>
                            <Label>Grupo</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={serverForm.group_id || ''}
                                onChange={(e) => setServerForm({ ...serverForm, group_id: e.target.value ? Number(e.target.value) : null })}
                            >
                                <option value="">Selecciona un grupo</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Usuario SSH</Label>
                                <Input placeholder="root" />
                            </div>
                            <div>
                                <Label>Contraseña SSH (Opcional)</Label>
                                <Input type="password" placeholder="••••••••" />
                            </div>
                        </div>

                        <div>
                            <Label>Ruta a la clave privada (/home/user/.ssh/id_rsa) O pega el contenido de la clave aquí</Label>
                            <Textarea
                                className="min-h-[100px] font-mono text-xs"
                                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Proporciona contraseña SSH o ruta de clave privada (no ambas)
                            </p>
                        </div>

                        <div>
                            <Label>Descripción opcional</Label>
                            <Textarea
                                value={serverForm.description}
                                onChange={(e) => setServerForm({ ...serverForm, description: e.target.value })}
                                placeholder="Información adicional sobre el servidor"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => { setAddServerOpen(false); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddServer} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar Servidor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Server Dialog */}
            <Dialog open={!!editingServer} onOpenChange={(open) => !open && setEditingServer(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Editar Servidor</DialogTitle>
                        <DialogDescription>Modifica los datos del servidor</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nombre *</Label>
                                <Input
                                    value={serverForm.hostname}
                                    onChange={(e) => setServerForm({ ...serverForm, hostname: e.target.value })}
                                    placeholder="ej., servidor-web-01"
                                />
                            </div>
                            <div>
                                <Label>Dirección IP *</Label>
                                <Input
                                    value={serverForm.ip_address}
                                    onChange={(e) => setServerForm({ ...serverForm, ip_address: e.target.value })}
                                    placeholder="ej., 192.168.1.100"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Sistema Operativo</Label>
                            <Input
                                value={serverForm.os_info}
                                onChange={(e) => setServerForm({ ...serverForm, os_info: e.target.value })}
                                placeholder="ej., Ubuntu 22.04"
                            />
                        </div>

                        <div>
                            <Label>Grupo</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={serverForm.group_id || ''}
                                onChange={(e) => setServerForm({ ...serverForm, group_id: e.target.value ? Number(e.target.value) : null })}
                            >
                                <option value="">Selecciona un grupo</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label>Descripción opcional</Label>
                            <Textarea
                                value={serverForm.description}
                                onChange={(e) => setServerForm({ ...serverForm, description: e.target.value })}
                                placeholder="Información adicional sobre el servidor"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => { setEditingServer(null); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleEditServer}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingServer} onOpenChange={(open) => !open && setDeletingServer(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar servidor?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente el servidor <strong>{deletingServer?.hostname}</strong>.
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteServer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Manage Groups Dialog */}
            <Dialog open={manageGroupsOpen} onOpenChange={setManageGroupsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
                    <GroupManager onClose={() => { setManageGroupsOpen(false); loadData(); }} />
                </DialogContent>
            </Dialog>

            {/* CSV Import Dialog */}
            <Dialog open={addServerOpen && addServerMode === 'csv'} onOpenChange={(open) => { if (!open) { setAddServerOpen(false); setAddServerMode('manual'); } }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
                    <CSVImport
                        onImportComplete={() => { loadData(); setAddServerOpen(false); setAddServerMode('manual'); }}
                        onCancel={() => { setAddServerOpen(false); setAddServerMode('manual'); }}
                    />
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
