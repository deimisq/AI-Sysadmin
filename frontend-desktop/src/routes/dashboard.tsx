import { useEffect, useState, useMemo } from 'react';
import { fetchServers, fetchGroups, type Server } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
import { cn } from '@/lib/utils';

export default function Dashboard() {
    const navigate = useNavigate();
    const [servers, setServers] = useState<Server[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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
            console.log('Servers loaded:', serverData);
            console.log('Groups loaded:', groupData);
            setServers(serverData);
            setGroups(groupData);

            // Expand all by default
            const initialExpanded: Record<string, boolean> = { 'ungrouped': true };
            groupData.forEach((g: any) => initialExpanded[g.id] = true);
            setExpandedGroups(initialExpanded);

        } catch (err: any) {
            console.error('Error loading data:', err);
            const errorMsg = err.message || 'Error cargando datos';

            if (errorMsg.includes('credentials') || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                console.log('Authentication error, redirecting to login...');
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId: string) => {
        console.log('Toggling group:', groupId);
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const filteredServers = servers.filter(s =>
        s.hostname.toLowerCase().includes(search.toLowerCase()) ||
        s.ip_address.includes(search)
    );

    const serversByGroup = useMemo(() => {
        const grouped: Record<string, Server[]> = {};

        groups.forEach((g: any) => {
            grouped[g.id] = [];
        });
        grouped['ungrouped'] = [];

        filteredServers.forEach(server => {
            const gid = server.group_id ? String(server.group_id) : 'ungrouped';
            if (!grouped[gid]) grouped[gid] = [];
            grouped[gid].push(server);
        });

        return grouped;
    }, [filteredServers, groups]);

    const openConsole = (serverId: number) => {
        console.log('Opening console for server:', serverId);
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
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Diagnóstico" type="button">
                    <Zap className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Editar" type="button">
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive" title="Eliminar" type="button">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {serversByGroup[id]?.map(server => (
                            <ServerCard key={server.id} server={server} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full bg-background">
                {/* Top Header Section */}
                <div className="p-8 pb-4 space-y-6 border-b">
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Agente IA Sysadmin</h1>
                            <p className="text-muted-foreground mt-1">Gestiona tu infraestructura con asistencia inteligente</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="gap-2" type="button">
                                <Settings className="h-4 w-4" />
                                Gestionar Grupos
                            </Button>
                            <Button className="gap-2" type="button">
                                <Plus className="h-4 w-4" />
                                Agregar Servidor
                            </Button>
                        </div>
                    </div>

                    {/* Filter Bar */}
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

                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap" type="button">
                                <Filter className="h-3.5 w-3.5" />
                                Todos los grupos
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap" type="button">
                                Nombre
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                            <div className="h-6 w-[1px] bg-border mx-1" />
                            <div className="flex bg-muted/50 p-1 rounded-md">
                                <Button variant="ghost" size="icon" className="h-7 w-7 bg-background shadow-sm" type="button">
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50" type="button">
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
                            {[1, 2, 3, 4].map(i => (
                                <Card key={i} className="animate-pulse h-40 bg-muted/10"></Card>
                            ))}
                        </div>
                    ) : (
                        <div className="pt-8 space-y-8">
                            {groups.map(g => (
                                <GroupSection
                                    key={g.id}
                                    id={String(g.id)}
                                    name={g.name}
                                    count={serversByGroup[String(g.id)]?.length || 0}
                                />
                            ))}

                            <GroupSection
                                id="ungrouped"
                                name="Sin agrupar"
                                count={serversByGroup['ungrouped']?.length || 0}
                            />

                            {filteredServers.length === 0 && !loading && (
                                <div className="text-center py-20 text-muted-foreground">
                                    <ServerIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No se encontraron servidores</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
