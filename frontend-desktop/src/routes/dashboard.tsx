import { useEffect, useState } from 'react';
import { fetchServers, type Server } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Terminal, Search, RefreshCw, Server as ServerIcon } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function Dashboard() {
    const navigate = useNavigate();
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const serverData = await fetchServers();
            setServers(serverData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredServers = servers.filter(s =>
        s.hostname.toLowerCase().includes(search.toLowerCase()) ||
        s.ip_address.includes(search)
    );

    const openConsole = (serverId: number) => {
        navigate(`/server/${serverId}/console`);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full bg-background">
                <div className="p-6 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-card">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search servers..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button onClick={loadData} variant="outline" size="sm">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
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
                            <p>No servers found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                            {filteredServers.map(server => (
                                <Card key={server.id} className="hover:shadow-md transition-shadow group flex flex-col">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between">
                                            <span className="truncate" title={server.hostname}>{server.hostname}</span>
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 pb-4 flex-1">
                                        <div className="text-2xl font-mono text-primary truncate">{server.ip_address}</div>
                                        <p className="text-xs text-muted-foreground truncate">{server.os_info || 'Linux'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{server.description}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" onClick={() => openConsole(server.id)}>
                                            <Terminal className="mr-2 h-4 w-4" />
                                            Console
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
