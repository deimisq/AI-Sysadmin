import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Server, Save, Loader2, Database, Zap } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';

const API_URL = import.meta.env.VITE_API_URL;

interface BackendConfig {
    api_version: string;
    max_connections: number;
    request_timeout: number;
    enable_cors: boolean;
    cors_origins: string;
    db_pool_size: number;
    db_max_overflow: number;
    cache_enabled: boolean;
    cache_ttl: number;
    rate_limit_enabled: boolean;
    rate_limit_per_minute: number;
    log_level: string;
    enable_metrics: boolean;
}

export function BackendParameters() {
    const [config, setConfig] = useState<BackendConfig>({
        api_version: "v1",
        max_connections: 100,
        request_timeout: 30,
        enable_cors: true,
        cors_origins: "*",
        db_pool_size: 10,
        db_max_overflow: 20,
        cache_enabled: true,
        cache_ttl: 300,
        rate_limit_enabled: true,
        rate_limit_per_minute: 60,
        log_level: "INFO",
        enable_metrics: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const loadConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/config/backend`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({ ...config, ...data });
            }
        } catch (error) {
            console.error("Failed to load backend config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/config/backend`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success("Configuración del backend actualizada");
                toast.info("Algunos cambios requieren reiniciar el servidor");
            } else {
                toast.error("Error al guardar configuración");
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Parámetros del Backend
                </CardTitle>
                <CardDescription>
                    Configuración del servidor y servicios backend
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* API Configuration */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Configuración de API
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <Label>Versión de API</Label>
                            <select
                                className="w-full px-3 py-2 border rounded-md bg-background"
                                value={config.api_version}
                                onChange={(e) => setConfig({ ...config, api_version: e.target.value })}
                            >
                                <option value="v1">v1</option>
                                <option value="v2">v2 (Beta)</option>
                            </select>
                        </div>
                        <div>
                            <Label>Conexiones Máximas</Label>
                            <Input
                                type="number"
                                value={config.max_connections}
                                onChange={(e) => setConfig({ ...config, max_connections: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label>Timeout de Request (s)</Label>
                            <Input
                                type="number"
                                value={config.request_timeout}
                                onChange={(e) => setConfig({ ...config, request_timeout: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>

                {/* CORS */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">CORS</h3>
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            checked={config.enable_cors}
                            onChange={(e) => setConfig({ ...config, enable_cors: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <Label>Habilitar CORS</Label>
                    </div>
                    {config.enable_cors && (
                        <div>
                            <Label>Orígenes Permitidos</Label>
                            <Input
                                value={config.cors_origins}
                                onChange={(e) => setConfig({ ...config, cors_origins: e.target.value })}
                                placeholder="* o https://example.com,https://app.example.com"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Usa * para todos o separa múltiples orígenes con comas
                            </p>
                        </div>
                    )}
                </div>

                {/* Database */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Base de Datos
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>Tamaño del Pool</Label>
                            <Input
                                type="number"
                                value={config.db_pool_size}
                                onChange={(e) => setConfig({ ...config, db_pool_size: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Conexiones permanentes a la BD
                            </p>
                        </div>
                        <div>
                            <Label>Max Overflow</Label>
                            <Input
                                type="number"
                                value={config.db_max_overflow}
                                onChange={(e) => setConfig({ ...config, db_max_overflow: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Conexiones temporales adicionales
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Performance y Cache
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.cache_enabled}
                                onChange={(e) => setConfig({ ...config, cache_enabled: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Habilitar Cache</Label>
                        </div>
                        {config.cache_enabled && (
                            <div>
                                <Label>TTL del Cache (segundos)</Label>
                                <Input
                                    type="number"
                                    value={config.cache_ttl}
                                    onChange={(e) => setConfig({ ...config, cache_ttl: parseInt(e.target.value) })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Rate Limiting */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Rate Limiting</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.rate_limit_enabled}
                                onChange={(e) => setConfig({ ...config, rate_limit_enabled: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Habilitar Rate Limiting</Label>
                        </div>
                        {config.rate_limit_enabled && (
                            <div>
                                <Label>Requests por Minuto</Label>
                                <Input
                                    type="number"
                                    value={config.rate_limit_per_minute}
                                    onChange={(e) => setConfig({ ...config, rate_limit_per_minute: parseInt(e.target.value) })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Logging & Monitoring */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Logging y Monitoreo</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>Nivel de Log</Label>
                            <select
                                className="w-full px-3 py-2 border rounded-md bg-background"
                                value={config.log_level}
                                onChange={(e) => setConfig({ ...config, log_level: e.target.value })}
                            >
                                <option value="DEBUG">DEBUG</option>
                                <option value="INFO">INFO</option>
                                <option value="WARNING">WARNING</option>
                                <option value="ERROR">ERROR</option>
                                <option value="CRITICAL">CRITICAL</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={config.enable_metrics}
                                onChange={(e) => setConfig({ ...config, enable_metrics: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Habilitar Métricas (Prometheus)</Label>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Configuración
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
