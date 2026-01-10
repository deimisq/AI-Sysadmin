import { useEffect, useState } from 'react';
import { api, fetchServers, removeAuthToken, type Server } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Terminal, Search, LogOut, RefreshCw, Server as ServerIcon } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const userData = await api.get<any>('/auth/me');
            setUser(userData);

            const serverData = await fetchServers();
            setServers(serverData);
        } catch (error) {
            console.error(error);
            removeAuthToken();
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const filteredServers = servers.filter(s =>
        s.hostname.toLowerCase().includes(search.toLowerCase()) ||
        s.ip_address.includes(search)
    );

    const handleLogout = () => {
        removeAuthToken();
        navigate('/login');
    };

    const openConsole = (serverId: number) => {
        navigate(`/server/${serverId}/console`);
    };

    if (loading && !user) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b bg-card p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                        <Terminal className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h1 className="font-bold text-xl">Sysadmin AI</h1>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
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

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                        {filteredServers.map(server => (
                            <Card key={server.id} className="hover:shadow-md transition-shadow group">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="truncate" title={server.hostname}>{server.hostname}</span>
                                        <div className={`h-2 w-2 rounded-full ${true ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1 pb-4">
                                    <div className="text-2xl font-mono text-primary truncate">{server.ip_address}</div>
                                    <p className="text-xs text-muted-foreground truncate">{server.os_info || 'Unknown OS'}</p>
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
            </main>
        </div>
    );
}
