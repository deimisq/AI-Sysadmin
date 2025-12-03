"use client";

import { useEffect, useState } from "react";
import { fetchServers, deleteServer, fetchGroups } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Server as ServerIcon, Trash2, FolderOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface Server {
    id: number;
    hostname: string;
    ip_address: string;
    description: string;
    os_info: string;
    group_id?: number;
}

interface ServerGroup {
    id: number;
    name: string;
    description?: string;
    color?: string;
}

interface ServerListProps {
    onDiagnose: (server: Server) => void;
    onEdit: (server: Server) => void;
}

export function ServerList({ onDiagnose, onEdit }: ServerListProps) {
    const { t } = useI18n();
    const [servers, setServers] = useState<Server[]>([]);
    const [groups, setGroups] = useState<ServerGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [serversData, groupsData] = await Promise.all([
                fetchServers(),
                fetchGroups()
            ]);
            setServers(serversData);
            setGroups(groupsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (serverId: number) => {
        if (!confirm(t.serverList.deleteConfirm)) {
            return;
        }

        try {
            await deleteServer(serverId);
            await loadData(); // Refresh the list
        } catch (error) {
            console.error(error);
            alert(t.serverList.deleteError);
        }
    };

    if (loading) return <div>{t.common.loading}</div>;

    // Group servers
    const ungroupedServers = servers.filter(s => !s.group_id);
    const groupedServers = groups.map(group => ({
        group,
        servers: servers.filter(s => s.group_id === group.id)
    })).filter(g => g.servers.length > 0);

    const renderServer = (server: Server) => (
        <Card key={server.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {server.hostname}
                </CardTitle>
                <ServerIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{server.ip_address}</div>
                <p className="text-xs text-muted-foreground">
                    {server.os_info} - {server.description}
                </p>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onDiagnose(server)}
                >
                    <Terminal className="mr-2 h-4 w-4" /> {t.serverList.diagnose}
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(server)}
                >
                    <span className="sr-only">Edit</span>
                    ✏️
                </Button>
                <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(server.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );

    return (
        <div className="space-y-8">
            {/* Grouped Servers */}
            {groupedServers.map(({ group, servers: groupServers }) => (
                <div key={group.id} className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <FolderOpen className="h-5 w-5" style={{ color: group.color || '#888' }} />
                        <h2 className="text-xl font-semibold">{group.name}</h2>
                        {group.description && (
                            <span className="text-sm text-muted-foreground">- {group.description}</span>
                        )}
                        <span className="ml-auto text-sm text-muted-foreground">
                            {groupServers.length} server{groupServers.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupServers.map(renderServer)}
                    </div>
                </div>
            ))}

            {/* Ungrouped Servers */}
            {ungroupedServers.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <ServerIcon className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-xl font-semibold text-muted-foreground">Ungrouped Servers</h2>
                        <span className="ml-auto text-sm text-muted-foreground">
                            {ungroupedServers.length} server{ungroupedServers.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ungroupedServers.map(renderServer)}
                    </div>
                </div>
            )}

            {servers.length === 0 && (
                <div className="col-span-full text-center p-10 text-muted-foreground">
                    {t.serverList.noServers}
                </div>
            )}
        </div>
    );
}
