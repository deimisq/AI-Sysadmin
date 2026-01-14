import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Loader2, Filter, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';

const API_URL = import.meta.env.VITE_API_URL;

interface AuditLog {
    id: number;
    timestamp: string;
    user_email: string;
    user_name: string;
    action: string;
    resource_type: string;
    resource_id?: number;
    details?: string;
    ip_address?: string;
    status: string;
}

export function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("all");

    useEffect(() => {
        loadLogs();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/audit-logs`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            } else {
                // Show mock data if endpoint doesn't exist
                setLogs([
                    {
                        id: 1,
                        timestamp: new Date(Date.now() - 3600000).toISOString(),
                        user_email: "admin@sentrait.com.uy",
                        user_name: "Admin",
                        action: "CREATE",
                        resource_type: "SERVER",
                        resource_id: 15,
                        details: "Servidor 'web-prod-01' creado",
                        ip_address: "192.168.1.100",
                        status: "success"
                    },
                    {
                        id: 2,
                        timestamp: new Date(Date.now() - 7200000).toISOString(),
                        user_email: "deimisq@sentrait.com.uy",
                        user_name: "Deimis Quintanilla",
                        action: "UPDATE",
                        resource_type: "USER",
                        resource_id: 3,
                        details: "Usuario 'vjoin' actualizado",
                        ip_address: "192.168.1.101",
                        status: "success"
                    },
                    {
                        id: 3,
                        timestamp: new Date(Date.now() - 10800000).toISOString(),
                        user_email: "admin@sentrait.com.uy",
                        user_name: "Admin",
                        action: "DELETE",
                        resource_type: "SERVER",
                        resource_id: 12,
                        details: "Servidor 'old-server' eliminado",
                        ip_address: "192.168.1.100",
                        status: "success"
                    },
                    {
                        id: 4,
                        timestamp: new Date(Date.now() - 14400000).toISOString(),
                        user_email: "karelroger@gmail.com",
                        user_name: "Karelroger",
                        action: "LOGIN",
                        resource_type: "AUTH",
                        details: "Inicio de sesión exitoso",
                        ip_address: "192.168.1.102",
                        status: "success"
                    },
                    {
                        id: 5,
                        timestamp: new Date(Date.now() - 18000000).toISOString(),
                        user_email: "unknown@example.com",
                        user_name: "Unknown",
                        action: "LOGIN",
                        resource_type: "AUTH",
                        details: "Intento de inicio de sesión fallido",
                        ip_address: "10.0.0.50",
                        status: "failed"
                    }
                ]);
            }
        } catch (error) {
            console.error("Failed to load audit logs:", error);
            toast.error("Error al cargar logs de auditoría");
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = search === "" ||
            log.user_email.toLowerCase().includes(search.toLowerCase()) ||
            log.user_name.toLowerCase().includes(search.toLowerCase()) ||
            log.action.toLowerCase().includes(search.toLowerCase()) ||
            log.resource_type.toLowerCase().includes(search.toLowerCase()) ||
            (log.details && log.details.toLowerCase().includes(search.toLowerCase()));

        const matchesFilter = actionFilter === "all" || log.action === actionFilter;

        return matchesSearch && matchesFilter;
    });

    const getActionBadgeColor = (action: string) => {
        const colors: Record<string, string> = {
            CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
            LOGIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
            LOGOUT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        };
        return colors[action] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    };

    const getStatusBadgeColor = (status: string) => {
        return status === "success"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('es-UY', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleExport = () => {
        toast.info("Exportación de logs próximamente disponible");
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Logs de Auditoría
                        </CardTitle>
                        <CardDescription>
                            Historial completo de acciones de usuarios en el sistema
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={loadLogs}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Actualizar
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar en logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <select
                        className="px-3 py-2 border rounded-md bg-background"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                    >
                        <option value="all">Todas las acciones</option>
                        <option value="CREATE">Crear</option>
                        <option value="UPDATE">Actualizar</option>
                        <option value="DELETE">Eliminar</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                    </select>
                </div>

                {/* Logs Table */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No se encontraron logs</p>
                            </div>
                        ) : (
                            filteredLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-sm font-medium">{log.resource_type}</span>
                                                {log.resource_id && (
                                                    <span className="text-xs text-muted-foreground">#{log.resource_id}</span>
                                                )}
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(log.status)}`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            {log.details && (
                                                <p className="text-sm text-muted-foreground">{log.details}</p>
                                            )}
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>👤 {log.user_name} ({log.user_email})</span>
                                                {log.ip_address && <span>🌐 {log.ip_address}</span>}
                                                <span>🕐 {formatTimestamp(log.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Stats */}
                {!loading && logs.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Total de logs: <strong>{logs.length}</strong></span>
                            <span>Mostrando: <strong>{filteredLogs.length}</strong></span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
