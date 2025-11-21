"use client";

import { useState } from "react";
import { createServer, createClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AddServerForm({ onServerAdded }: { onServerAdded: () => void }) {
    const [formData, setFormData] = useState({
        hostname: "",
        ip_address: "",
        description: "",
        os_info: "",
        ssh_username: "ubuntu",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                ssh_username: "ubuntu",
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
                            placeholder="Hostname"
                            value={formData.hostname}
                            onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                            required
                        />
                        <Input
                            placeholder="IP Address"
                            value={formData.ip_address}
                            onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                            required
                        />
                        <Input
                            placeholder="OS Info"
                            value={formData.os_info}
                            onChange={(e) => setFormData({ ...formData, os_info: e.target.value })}
                        />
                        <Input
                            placeholder="SSH Username"
                            value={formData.ssh_username}
                            onChange={(e) => setFormData({ ...formData, ssh_username: e.target.value })}
                        />
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
