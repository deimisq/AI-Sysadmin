import { useEffect, useState } from 'react';
import { fetchServers, type Server } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Terminal, Search, Server as ServerIcon, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function Dashboard() {
    const navigate = useNavigate();
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('Dashboard mounted');
        loadData();
    }, []);

    const loadData = async () => {
        console.log('Loading servers...');
        setLoading(true);
        setError(null);
        try {
            const serverData = await fetchServers();
            console.log('Servers loaded:', serverData);
            setServers(serverData);
        } catch (err: any) {
            console.error('Error loading servers:', err);
            const errorMsg = err.message || 'Error cargando servidores';

            // If authentication error, redirect to login
            if (errorMsg.includes('credentials') || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                console.log('Authentication error detected, redirecting to login...');
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }

            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const filteredServers = servers.filter(s =>
        s.hostname.toLowerCase().includes(search.toLowerCase()) ||
        s.ip_address.includes(search)
    );

    const openConsole = (serverId: number) => {
        console.log('Opening console for server:', serverId);
        navigate(`/server/${serverId}/console`);
    };

    console.log('Rendering Dashboard. Servers count:', servers.length, 'Filtered:', filteredServers.length);

    return (
        <DashboardLayout>
            <div className="h-full w-full flex flex-col bg-background">
                {/* Header Bar */}
                <div className="p-6 border-b flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card">
                    <div>
                        <h1 className="text-2xl font-bold">Servidores</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {servers.length} servidor{servers.length !== 1 ? 'es' : ''} total{servers.length !== 1 ? 'es' : ''}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar servidores..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4">
                            <p className="font-medium">Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader className="h-20 bg-muted/50" />
                                    <CardContent className="h-24 bg-muted/20" />
                                </Card>
                            ))}
                        </div>
                    ) : filteredServers.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <ServerIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">No se encontraron servidores</p>
                            {search && <p className="text-sm mt-2">Intenta con otro criterio de búsqueda</p>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredServers.map(server => (
                                <Card
                                    key={server.id}
                                    className="hover:shadow-lg transition-all duration-200 group border-border/60 bg-card hover:border-primary/20"
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center justify-between text-base">
                                            <span className="truncate" title={server.hostname}>
                                                {server.hostname}
                                            </span>
                                            <span className="relative flex h-3 w-3 ml-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 pb-4">
                                        <div className="text-xl font-mono text-primary font-semibold">
                                            {server.ip_address}
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <p className="truncate">{server.os_info || 'Linux'}</p>
                                            {server.description && (
                                                <p className="truncate" title={server.description}>
                                                    {server.description}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0">
                                        <Button
                                            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                            onClick={() => openConsole(server.id)}
                                            type="button"
                                        >
                                            <Terminal className="mr-2 h-4 w-4" />
                                            Abrir Consola
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
