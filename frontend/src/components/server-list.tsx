"use client";

import { useEffect, useState } from "react";
import { fetchServers, deleteServer } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, Server as ServerIcon, Trash2 } from "lucide-react";

interface Server {
    id: number;
    hostname: string;
    ip_address: string;
    description: string;
    os_info: string;
}

interface ServerListProps {
    onDiagnose: (server: Server) => void;
    onEdit: (server: Server) => void;
}

export function ServerList({ onDiagnose, onEdit }: ServerListProps) {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadServers();
    }, []);

    const loadServers = async () => {
        try {
            const data = await fetchServers();
            setServers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (serverId: number) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este servidor?")) {
            return;
        }

        try {
            await deleteServer(serverId);
            await loadServers(); // Refresh the list
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el servidor");
        }
    };

    if (loading) return <div>Loading servers...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((server) => (
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
                            <Terminal className="mr-2 h-4 w-4" /> Diagnose
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
            ))}
            {servers.length === 0 && (
                <div className="col-span-full text-center p-10 text-muted-foreground">
                    No servers found. Add one to get started.
                </div>
            )}
        </div>
    );
}
