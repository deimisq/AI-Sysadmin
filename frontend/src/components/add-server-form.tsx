"use client";

import { useState } from "react";
import { createServer, createClient } from "@/lib/api";
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

export function AddServerForm({ onServerAdded }: { onServerAdded: () => void }) {
    const [formData, setFormData] = useState({
        hostname: "",
        ip_address: "",
        description: "",
        os_info: "",
        ssh_username: "",
        ssh_password: "",
        ssh_key_path: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate that at least password or SSH key is provided
        if (!formData.ssh_password && !formData.ssh_key_path) {
            alert("Debes proporcionar una contraseña o una clave SSH");
            return;
        }

        setLoading(true);
        try {
            // Create a default client first (or use existing one)
            let clientId = 1;
            try {
                const client = await createClient({
                    name: "Default Client",
                    description: "Auto-created client"
                });
                clientId = client.id;
            } catch (error) {
                // Client might already exist, use default ID 1
                console.log("Using default client ID");
            }

            // Create server with the client ID
            await createServer({ ...formData, client_id: clientId });

            // Reset form completely
            setFormData({
                hostname: "",
                ip_address: "",
                description: "",
                os_info: "",
                ssh_username: "",
                ssh_password: "",
                ssh_key_path: "",
            });

            onServerAdded();
        } catch (error) {
            console.error("Failed to create server", error);
            alert("Failed to create server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add New Server</CardTitle>
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
                        <Input
                            placeholder="SSH Username *"
                            value={formData.ssh_username}
                            onChange={(e) => setFormData({ ...formData, ssh_username: e.target.value })}
                            required
                        />
                        <Input
                            type="password"
                            placeholder="SSH Password (opcional si hay SSH Key)"
                            value={formData.ssh_password}
                            onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })}
                        />
                        <div className="col-span-2">
                            <Input
                                placeholder="SSH Private Key Path (opcional si hay contraseña)"
                                value={formData.ssh_key_path}
                                onChange={(e) => setFormData({ ...formData, ssh_key_path: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                ⚠️ Ruta al archivo de clave PRIVADA en el servidor backend (ej: /home/user/.ssh/id_rsa)
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                                Nota: NO ingresar la clave pública (ssh-rsa...). Debe ser la ruta al archivo de clave privada.
                            </p>
                        </div>
                    </div>
                    <Input
                        placeholder="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Adding..." : "Add Server"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
