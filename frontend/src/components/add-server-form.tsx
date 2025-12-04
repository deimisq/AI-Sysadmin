"use client";

import { useState, useEffect } from "react";
import { createServer, createClient, updateServer, fetchGroups } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";
import { CSVImport } from "@/components/csv-import";
import { FileSpreadsheet, Server } from "lucide-react";

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
    "Windows Server 2022"
];

interface ServerFormProps {
    onServerAdded: () => void;
    initialData?: any;
    onCancel?: () => void;
}

export function AddServerForm({ onServerAdded, initialData, onCancel }: ServerFormProps) {
    const { t } = useI18n();
    const [mode, setMode] = useState<"manual" | "csv">("manual");
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

    // If editing, only show manual form
    if (initialData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Editar Servidor</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {renderFormFields()}
                    </form>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t.addServer.title}</CardTitle>
                <CardDescription>
                    Agrega servidores manualmente o importa varios desde un archivo CSV
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Mode Selector */}
                <div className="flex gap-2 mb-6">
                    <Button
                        type="button"
                        variant={mode === "manual" ? "default" : "outline"}
                        onClick={() => setMode("manual")}
                        className="flex-1"
                    >
                        <Server className="h-4 w-4 mr-2" />
                        Agregar Manualmente
                    </Button>
                    <Button
                        type="button"
                        variant={mode === "csv" ? "default" : "outline"}
                        onClick={() => setMode("csv")}
                        className="flex-1"
                    >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Importar desde CSV
                    </Button>
                </div>

                {mode === "csv" ? (
                    <CSVImport
                        onImportComplete={() => {
                            onServerAdded();
                            setMode("manual");
                        }}
                        onCancel={() => setMode("manual")}
                    />
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {renderFormFields()}
                    </form>
                )}
            </CardContent>
        </Card>
    );

    function renderFormFields() {
        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        placeholder={t.addServer.hostnamePlaceholder}
                        value={formData.hostname}
                        onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                        required
                    />
                    <Input
                        placeholder={t.addServer.ipPlaceholder}
                        value={formData.ip_address}
                        onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                        required
                    />
                    <div className="col-span-2">
                        <Input
                            list="os-options"
                            placeholder={t.addServer.osPlaceholder}
                            value={formData.os_info}
                            onChange={(e) => setFormData({ ...formData, os_info: e.target.value })}
                            required
                        />
                        <datalist id="os-options">
                            {OS_OPTIONS.map((os) => (
                                <option key={os} value={os} />
                            ))}
                        </datalist>
                    </div>
                    <div className="col-span-2">
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.group_id}
                            onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                        >
                            <option value="">{t.addServer.selectClient}</option>
                            {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Input
                        placeholder={t.addServer.sshUsername}
                        value={formData.ssh_username}
                        onChange={(e) => setFormData({ ...formData, ssh_username: e.target.value })}
                        required
                    />
                    <Input
                        type="password"
                        placeholder={initialData ? t.addServer.sshPasswordKeep : t.addServer.sshPassword}
                        value={formData.ssh_password}
                        onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })}
                    />
                    <div className="col-span-2">
                        <Input
                            placeholder={initialData ? t.addServer.sshKeyPathKeep : t.addServer.sshKeyPath}
                            value={formData.ssh_key_path}
                            onChange={(e) => setFormData({ ...formData, ssh_key_path: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {t.addServer.authNote}
                        </p>
                    </div>
                </div>
                <Input
                    placeholder={t.addServer.descriptionPlaceholder}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? t.common.loading : (initialData ? t.addServer.updateServer : t.addServer.submit)}
                    </Button>
                    {initialData && onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                            {t.common.cancel}
                        </Button>
                    )}
                </div>
            </>
        );
    }
}
