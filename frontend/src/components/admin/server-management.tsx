"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAllServers, createServer, updateServer, deleteServer, fetchGroups, createClient } from "@/lib/api";
import { Server, Edit2, Trash2, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

const OS_OPTIONS = [
    "Ubuntu 22.04",
    "Ubuntu 24.04",
    "Debian 11",
    "Debian 12",
    "CentOS 7",
    "CentOS 8",
    "Rocky Linux 8",
    "Rocky Linux 9",
    "AlmaLinux 8",
    "AlmaLinux 9",
    "Fedora 38",
    "Fedora 39",
    "Red Hat Enterprise Linux 8",
    "Red Hat Enterprise Linux 9",
    "Windows Server 2019",
    "Windows Server 2022",
    "Other"
];

interface ServerManagementProps {
    currentUser: any;
}

export function ServerManagement({ currentUser }: ServerManagementProps) {
    const { t } = useI18n();
    const [servers, setServers] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingServer, setEditingServer] = useState<any>(null);
    const [creatingServer, setCreatingServer] = useState(false);
    const [newServer, setNewServer] = useState<any>({
        hostname: "",
        ip_address: "",
        description: "",
        os_info: "",
        ssh_username: "",
        ssh_password: "",
        ssh_key_path: "",
        group_id: "",
        client_id: 1
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [serversData, groupsData] = await Promise.all([
                fetchAllServers(),
                fetchGroups()
            ]);
            setServers(serversData);
            setGroups(groupsData);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditServer = (server: any) => {
        setEditingServer({ ...server, ssh_password: "", ssh_key_path: "" });
    };

    const handleSaveServer = async () => {
        if (!editingServer) return;

        try {
            const updateData: any = {
                hostname: editingServer.hostname,
                ip_address: editingServer.ip_address,
                description: editingServer.description,
                os_info: editingServer.os_info,
                ssh_username: editingServer.ssh_username,
                group_id: editingServer.group_id || null
            };

            if (editingServer.ssh_password) {
                updateData.ssh_password = editingServer.ssh_password;
            }
            if (editingServer.ssh_key_path) {
                updateData.ssh_key_path = editingServer.ssh_key_path;
            }

            await updateServer(editingServer.id, updateData);
            await loadData();
            setEditingServer(null);
            alert(t.serverManagement.serverUpdated);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to update server");
        }
    };

    const handleCreateServer = async () => {
        if (!newServer.hostname || !newServer.ip_address || !newServer.os_info || !newServer.ssh_username) {
            alert("Hostname, IP Address, OS, and SSH Username are required");
            return;
        }

        if (!newServer.ssh_password && !newServer.ssh_key_path) {
            alert("Either SSH Password or SSH Key Path is required");
            return;
        }

        try {
            // Ensure client exists
            let clientId = 1;
            try {
                const client = await createClient({
                    name: "Default Client",
                    description: "Auto-created client"
                });
                clientId = client.id;
            } catch (error) {
                console.log("Using default client ID");
            }

            const serverData = { ...newServer, client_id: clientId };
            if (!serverData.group_id) delete serverData.group_id;

            await createServer(serverData);
            await loadData();
            setCreatingServer(false);
            setNewServer({
                hostname: "",
                ip_address: "",
                description: "",
                os_info: "",
                ssh_username: "",
                ssh_password: "",
                ssh_key_path: "",
                group_id: "",
                client_id: 1
            });
            alert("Server created successfully");
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to create server");
        }
    };

    const handleDeleteServer = async (serverId: number) => {
        if (!confirm("Are you sure you want to delete this server?")) return;

        try {
            await deleteServer(serverId);
            await loadData();
            alert("Server deleted successfully");
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to delete server");
        }
    };

    if (loading) {
        return <div>Loading servers...</div>;
    }

    // Create Server Form
    if (creatingServer) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Create New Server</CardTitle>
                    <CardDescription>Add a new server to the system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Hostname *</label>
                            <Input
                                value={newServer.hostname}
                                onChange={(e) => setNewServer({ ...newServer, hostname: e.target.value })}
                                placeholder="server.example.com"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">IP Address *</label>
                            <Input
                                value={newServer.ip_address}
                                onChange={(e) => setNewServer({ ...newServer, ip_address: e.target.value })}
                                placeholder="192.168.1.100"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Operating System *</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newServer.os_info}
                                onChange={(e) => setNewServer({ ...newServer, os_info: e.target.value })}
                            >
                                <option value="">Select OS</option>
                                {OS_OPTIONS.map((os) => (
                                    <option key={os} value={os}>{os}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">SSH Username *</label>
                            <Input
                                value={newServer.ssh_username}
                                onChange={(e) => setNewServer({ ...newServer, ssh_username: e.target.value })}
                                placeholder="ubuntu"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">SSH Password</label>
                            <Input
                                type="password"
                                value={newServer.ssh_password}
                                onChange={(e) => setNewServer({ ...newServer, ssh_password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">SSH Private Key Path</label>
                            <Input
                                value={newServer.ssh_key_path}
                                onChange={(e) => setNewServer({ ...newServer, ssh_key_path: e.target.value })}
                                placeholder="/path/to/private/key"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Path to private key file on backend server</p>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Group</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newServer.group_id}
                                onChange={(e) => setNewServer({ ...newServer, group_id: e.target.value })}
                            >
                                <option value="">No Group</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                value={newServer.description}
                                onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
                                placeholder="Production web server"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreateServer}>Create Server</Button>
                        <Button variant="outline" onClick={() => setCreatingServer(false)}>Cancel</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Edit Server Form
    if (editingServer) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Edit Server: {editingServer.hostname}</CardTitle>
                    <CardDescription>Update server information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Hostname *</label>
                            <Input
                                value={editingServer.hostname}
                                onChange={(e) => setEditingServer({ ...editingServer, hostname: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">IP Address *</label>
                            <Input
                                value={editingServer.ip_address}
                                onChange={(e) => setEditingServer({ ...editingServer, ip_address: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Operating System *</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={editingServer.os_info}
                                onChange={(e) => setEditingServer({ ...editingServer, os_info: e.target.value })}
                            >
                                {OS_OPTIONS.map((os) => (
                                    <option key={os} value={os}>{os}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">SSH Username *</label>
                            <Input
                                value={editingServer.ssh_username}
                                onChange={(e) => setEditingServer({ ...editingServer, ssh_username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">SSH Password (leave blank to keep)</label>
                            <Input
                                type="password"
                                value={editingServer.ssh_password}
                                onChange={(e) => setEditingServer({ ...editingServer, ssh_password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">SSH Private Key Path (leave blank to keep)</label>
                            <Input
                                value={editingServer.ssh_key_path}
                                onChange={(e) => setEditingServer({ ...editingServer, ssh_key_path: e.target.value })}
                                placeholder="/path/to/private/key"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Group</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={editingServer.group_id || ""}
                                onChange={(e) => setEditingServer({ ...editingServer, group_id: e.target.value })}
                            >
                                <option value="">No Group</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                value={editingServer.description || ""}
                                onChange={(e) => setEditingServer({ ...editingServer, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveServer}>Save Changes</Button>
                        <Button variant="outline" onClick={() => setEditingServer(null)}>Cancel</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Servers List
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            Server Management
                        </CardTitle>
                        <CardDescription>Manage all servers in the system</CardDescription>
                    </div>
                    <Button onClick={() => setCreatingServer(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Server
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {servers.map((server) => (
                        <div
                            key={server.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{server.hostname}</h3>
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {server.ip_address}
                                    </span>
                                    {server.group && (
                                        <span
                                            className="px-2 py-1 rounded text-xs font-medium text-white"
                                            style={{ backgroundColor: server.group.color || "#888" }}
                                        >
                                            {server.group.name}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">{server.os_info}</p>
                                {server.description && (
                                    <p className="text-sm text-muted-foreground">{server.description}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditServer(server)}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                {currentUser.role === "superadmin" && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteServer(server.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {servers.length === 0 && (
                        <div className="text-center p-10 text-muted-foreground">
                            No servers yet. Create one to get started.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
