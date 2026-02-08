import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export function SecuritySettings() {
    const [msConfig, setMsConfig] = useState({
        microsoft_client_id: "",
        microsoft_client_secret: "",
        microsoft_tenant_id: ""
    });
    const [savingMs, setSavingMs] = useState(false);

    // Domain management state
    const [domains, setDomains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchDomains();
        fetchMsConfig();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const fetchMsConfig = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/config/security`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setMsConfig({
                    microsoft_client_id: data.microsoft_client_id || "",
                    microsoft_client_secret: data.microsoft_client_secret || "",
                    microsoft_tenant_id: data.microsoft_tenant_id || ""
                });
            }
        } catch (err) {
            console.error("Failed to fetch Microsoft config", err);
        }
    };

    const handleSaveMsConfig = async () => {
        setSavingMs(true);
        try {
            const res = await fetch(`${API_BASE_URL}/config/security`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(msConfig),
            });

            if (!res.ok) throw new Error("Failed to save configuration");
            toast.success("Configuración de Microsoft guardada correctamente");
        } catch (err) {
            console.error("Failed to save Microsoft config", err);
            toast.error("Error al guardar configuración");
        } finally {
            setSavingMs(false);
        }
    };

    const fetchDomains = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/allowed-domains`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setDomains(data);
            }
        } catch (err) {
            console.error("Failed to fetch domains", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDomain = async () => {
        if (!newDomain.trim()) return;
        setAdding(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/admin/allowed-domains`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    domain: newDomain.trim(),
                    description: "Added via admin panel (desktop)",
                    is_active: true
                }),
            });

            if (!res.ok) {
                const err = (await res.json()) as any;
                throw new Error(err.detail || "Failed to add domain");
            }

            const added = await res.json();
            setDomains([...domains, added]);
            setNewDomain("");
            toast.success("Dominio añadido correctamente");
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteDomain = async (id: number) => {
        const confirmed = window.confirm("¿Seguro que quieres eliminar este dominio permitido?");
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/allowed-domains/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (res.ok) {
                setDomains(domains.filter(d => d.id !== id));
                toast.success("Dominio eliminado");
            }
        } catch (err) {
            console.error("Failed to delete domain", err);
            toast.error("Error al eliminar dominio");
        }
    };

    return (
        <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Configuración Microsoft OAuth
                    </CardTitle>
                    <CardDescription>
                        Configura el inicio de sesión con Microsoft Entra ID (Azure AD)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted p-4 rounded-md text-sm mb-4 border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20">
                        <p className="font-medium mb-2 text-blue-900 dark:text-blue-100">URL de Redirección (Callback)</p>
                        <p className="text-muted-foreground mb-2">
                            Añade esta URL a tu registro de aplicación en Azure Portal.
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="bg-background px-3 py-2 rounded border block w-full text-xs font-mono">
                                {window.location.origin}/auth/microsoft/callback
                            </code>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/auth/microsoft/callback`);
                                    toast.success("Copiado al portapapeles");
                                }}
                            >
                                Copiar
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Application (Client) ID</label>
                            <Input
                                value={msConfig.microsoft_client_id}
                                onChange={(e) => setMsConfig({ ...msConfig, microsoft_client_id: e.target.value })}
                                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Client Secret Value</label>
                            <Input
                                type="password"
                                value={msConfig.microsoft_client_secret}
                                onChange={(e) => setMsConfig({ ...msConfig, microsoft_client_secret: e.target.value })}
                                placeholder="Valor del Client Secret"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Directory (Tenant) ID</label>
                            <Input
                                value={msConfig.microsoft_tenant_id}
                                onChange={(e) => setMsConfig({ ...msConfig, microsoft_tenant_id: e.target.value })}
                                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                            />
                            <p className="text-xs text-muted-foreground">Deja en blanco para 'common' (multitenant) o pon el ID de tu tenant.</p>
                        </div>
                        <Button onClick={handleSaveMsConfig} disabled={savingMs} className="w-fit">
                            {savingMs ? "Guardando..." : "Guardar Configuración"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Dominios Permitidos
                    </CardTitle>
                    <CardDescription>
                        Restringe el registro de usuarios a estos dominios de correo
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="ejemplo.com"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                            />
                            <Button onClick={handleAddDomain} disabled={adding || !newDomain.trim()}>
                                {adding ? "Añadiendo..." : <><Plus className="mr-2 h-4 w-4" /> Añadir</>}
                            </Button>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <div className="border rounded-md divide-y">
                            {loading ? (
                                <div className="p-4 text-sm text-muted-foreground">Cargando dominios...</div>
                            ) : domains.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">No hay dominios configurados. Cualquier dominio es permitido (inseguro).</div>
                            ) : (
                                domains.map((domain) => (
                                    <div key={domain.id} className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-500" />
                                            <span className="font-medium">@{domain.domain}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                            onClick={() => handleDeleteDomain(domain.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
