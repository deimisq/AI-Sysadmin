"use client";

import { useState } from "react";
import { createServer } from "@/lib/api";
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
        client_id: 1 // Hardcoded for MVP
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createServer(formData);
            onServerAdded();
            setFormData({ ...formData, hostname: "", ip_address: "" }); // Reset key fields
        } catch (error) {
            console.error("Failed to create server", error);
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
                    <Button type="submit" className="w-full">Add Server</Button>
                </form>
            </CardContent>
        </Card>
    );
}
