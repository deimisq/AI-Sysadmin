"use client";

import { useState, useEffect } from "react";
import { createServer, createClient, updateServer, fetchGroups } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface ServerFormProps {
    onServerAdded: () => void;
    initialData?: any;
    onCancel?: () => void;
}

export function AddServerForm({ onServerAdded, initialData, onCancel }: ServerFormProps) {
    const [formData, setFormData] = useState({
        hostname: "",
        ip_address: "",
        description: "",
        os_info: "",
        ssh_username: "",
        ssh_password: "",
        ssh_key_path: "",
        group_id: "",
    });
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadGroups();
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                hostname: initialData.hostname || "",
                ip_address: initialData.ip_address || "",
                description: initialData.description || "",
                os_info: initialData.os_info || "",
                ssh_username: initialData.ssh_username || "",
                ssh_password: "", // Don't populate sensitive data
                ssh_key_path: "", // Don't populate sensitive data
                group_id: initialData.group_id || "",
            });
        }
    }, [initialData]);

    const loadGroups = async () => {
        try {
            const data = await fetchGroups();
            setGroups(data);
        } catch (error) {
            console.error("Failed to load groups", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate that at least password or SSH key is provided (only for new servers)
        if (!initialData && !formData.ssh_password && !formData.ssh_key_path) {
            alert("Debes proporcionar una contraseña o una clave SSH");
            return;
        }

        setLoading(true);
        try {
            if (initialData) {
                // Update existing server
                // Only send fields that are not empty for sensitive data
                const updateData: any = { ...formData };
                if (!updateData.ssh_password) delete updateData.ssh_password;
                if (!updateData.ssh_key_path) delete updateData.ssh_key_path;

                await updateServer(initialData.id, updateData);
            } else {
                // Create new server
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

                await createServer({ ...formData, client_id: clientId });
            }

            // Reset form completely
            setFormData({
                hostname: "",
                ip_address: "",
                description: "",
                os_info: "",
                ssh_username: "",
                ssh_password: "",
                ssh_key_path: "",
                group_id: "",
            });

            onServerAdded();
        } catch (error) {
            console.error("Failed to save server", error);
            alert("Failed to save server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{initialData ? "Edit Server" : "Add New Server"}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            placeholder="Hostname *"
                            value={formData.hostname}
                            onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                            required
                        />
                        <Input
                            placeholder="IP Address *"
                            value={formData.ip_address}
                            onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                            required
                        />
                        <div className="col-span-2">
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.os_info}
                                onChange={(e) => setFormData({ ...formData, os_info: e.target.value })}
                                required
                            >
                                <option value="">Select Operating System *</option>
                                {OS_OPTIONS.map((os) => (
                                    <option key={os} value={os}>{os}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.group_id}
                                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                            >
                                <option value="">No Group (Optional)</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Input
                            placeholder="SSH Username *"
                            value={formData.ssh_username}
                            onChange={(e) => setFormData({ ...formData, ssh_username: e.target.value })}
                            required
                        />
                        <Input
                            type="password"
                            placeholder={initialData ? "SSH Password (leave blank to keep unchanged)" : "SSH Password (optional if SSH Key)"}
                            value={formData.ssh_password}
                            onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })}
                        />
                        <div className="col-span-2">
                            <Input
                                placeholder={initialData ? "SSH Private Key Path (leave blank to keep unchanged)" : "SSH Private Key Path (optional if Password)"}
                                value={formData.ssh_key_path}
                                onChange={(e) => setFormData({ ...formData, ssh_key_path: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                ⚠️ Ruta al archivo de clave PRIVADA en el servidor backend (ej: /home/user/.ssh/id_rsa)
                            </p>
                        </div>
                    </div>
                    <Input
                        placeholder="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="flex gap-2">
                        <Button type="submit" className="flex-1" disabled={loading}>
                            {loading ? "Saving..." : (initialData ? "Update Server" : "Add Server")}
                        </Button>
                        {initialData && onCancel && (
                            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                                Cancel
                            </Button>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
