import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save, Eye, EyeOff } from "lucide-react";
import { fetch } from '@tauri-apps/plugin-http';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export function BackendParameters() {
    const [config, setConfig] = useState({
        database_url: "",
        secret_key: "",
        algorithm: "HS256",
        access_token_expire_minutes: "1440",
        cors_origins: "*",
        debug_mode: "false",
        log_level: "INFO"
    });
    const [showSecrets, setShowSecrets] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

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
            const res = await fetch(`${API_BASE_URL}/config/backend`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({
                    database_url: data.database_url || "",
                    secret_key: data.secret_key || "",
                    algorithm: data.algorithm || "HS256",
                    access_token_expire_minutes: String(data.access_token_expire_minutes || "1440"),
                    cors_origins: data.cors_origins || "*",
                    debug_mode: String(data.debug_mode ?? "false"),
                    log_level: data.log_level || "INFO"
                });
                setMessage("✅ Configuración cargada correctamente");
            } else {
                setMessage("ℹ️ Usando configuración por defecto");
            }
        } catch (error: any) {
            console.error("Failed to load config:", error);
            setMessage("ℹ️ Usando configuración por defecto");
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch(`${API_BASE_URL}/config/backend`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setMessage("✅ Configuración guardada correctamente");
            } else {
                throw new Error("Error saving config");
            }
        } catch (error: any) {
            setMessage("❌ Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Parámetros de Backend
                </CardTitle>
                <CardDescription>
                    Configuración del sistema, base de datos y seguridad
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Database Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Configuración Base de Datos</h3>
                    <div>
                        <label className="text-sm font-medium">Database URL</label>
                        <Input
                            type={showSecrets ? "text" : "password"}
                            value={config.database_url}
                            onChange={(e) => setConfig({ ...config, database_url: e.target.value })}
                            placeholder="postgresql://user:pass@host:5432/dbname"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Cadena de conexión a Base de Datos (SQLAlchemy format)
                        </p>
                    </div>
                </div>

                {/* Security Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Configuración de Seguridad</h3>
                    <div>
                        <label className="text-sm font-medium">Secret Key</label>
                        <Input
                            type={showSecrets ? "text" : "password"}
                            value={config.secret_key}
                            onChange={(e) => setConfig({ ...config, secret_key: e.target.value })}
                            placeholder="••••••••"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Clave para firmar tokens JWT y cifrar datos sensibles
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Algoritmo</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.algorithm}
                                onChange={(e) => setConfig({ ...config, algorithm: e.target.value })}
                            >
                                <option value="HS256">HS256</option>
                                <option value="HS384">HS384</option>
                                <option value="HS512">HS512</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Expiración Token (min)</label>
                            <Input
                                type="number"
                                value={config.access_token_expire_minutes}
                                onChange={(e) => setConfig({ ...config, access_token_expire_minutes: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* CORS Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Configuración CORS</h3>
                    <div>
                        <label className="text-sm font-medium">Orígenes Permitidos (CORS)</label>
                        <Input
                            value={config.cors_origins}
                            onChange={(e) => setConfig({ ...config, cors_origins: e.target.value })}
                            placeholder="*"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Lista de dominios permitidos separados por coma, o "*" para todos.
                        </p>
                    </div>
                </div>

                {/* Application Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Configuración de Aplicación</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Modo Debug</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.debug_mode}
                                onChange={(e) => setConfig({ ...config, debug_mode: e.target.value })}
                            >
                                <option value="false">Desactivado</option>
                                <option value="true">Activado</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                Habilita logs detallados y trazas de error
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Log Level</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.log_level}
                                onChange={(e) => setConfig({ ...config, log_level: e.target.value })}
                            >
                                <option value="DEBUG">DEBUG</option>
                                <option value="INFO">INFO</option>
                                <option value="WARNING">WARNING</option>
                                <option value="ERROR">ERROR</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSecrets(!showSecrets)}
                    >
                        {showSecrets ? (
                            <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Ocultar Secretos
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                Mostrar Secretos
                            </>
                        )}
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "Guardando..." : "Guardar Configuración"}
                    </Button>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-sm ${message.startsWith("✅")
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : message.startsWith("❌")
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}>
                        {message}
                    </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>ℹ️ Nota:</strong> Algunos cambios críticos pueden requerir reiniciar el servicio backend.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
