import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, Save } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";


export function FrontendParameters() {
    const [config, setConfig] = useState({
        api_url: "/api/v1",
        app_name: "AI Sysadmin Agent",
        default_language: "es", // Default to Spanish for desktop as requested implicitly
        theme: "system",
        items_per_page: "20",
        enable_animations: "true",
        show_debug_info: "false"
    });
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
            const res = await fetch(`${API_BASE_URL}/config/frontend`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({
                    api_url: data.api_url || "/api/v1",
                    app_name: data.app_name || "AI Sysadmin Agent",
                    default_language: data.default_language || "es",
                    theme: data.theme || "system",
                    items_per_page: String(data.items_per_page || "20"),
                    enable_animations: String(data.enable_animations ?? "true"),
                    show_debug_info: String(data.show_debug_info ?? "false")
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
            const res = await fetch(`${API_BASE_URL}/config/frontend`, {
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
                    <Palette className="h-5 w-5" />
                    Parámetros de Frontend
                </CardTitle>
                <CardDescription>
                    Personaliza la apariencia y comportamiento de la interfaz
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* API Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Configuración API</h3>
                    <div>
                        <label className="text-sm font-medium">URL Base de API</label>
                        <Input
                            value={config.api_url}
                            onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                            placeholder="/api/v1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            URL base para las llamadas al backend
                        </p>
                    </div>
                </div>

                {/* Application Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Configuración de la Aplicación</h3>
                    <div>
                        <label className="text-sm font-medium">Nombre de la Aplicación</label>
                        <Input
                            value={config.app_name}
                            onChange={(e) => setConfig({ ...config, app_name: e.target.value })}
                            placeholder="AI Sysadmin Agent"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Nombre que se muestra en la barra de título y encabezados
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Idioma por Defecto</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.default_language}
                                onChange={(e) => setConfig({ ...config, default_language: e.target.value })}
                            >
                                <option value="en">Inglés</option>
                                <option value="es">Español</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Tema</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.theme}
                                onChange={(e) => setConfig({ ...config, theme: e.target.value })}
                            >
                                <option value="light">Claro</option>
                                <option value="dark">Oscuro</option>
                                <option value="system">Sistema</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* UI/UX Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Configuración UI/UX</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Items por Página</label>
                            <Input
                                type="number"
                                value={config.items_per_page}
                                onChange={(e) => setConfig({ ...config, items_per_page: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Número de elementos a mostrar en listas paginadas
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Animaciones</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.enable_animations}
                                onChange={(e) => setConfig({ ...config, enable_animations: e.target.value })}
                            >
                                <option value="true">Activadas</option>
                                <option value="false">Desactivadas</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                Habilitar/deshabilitar animaciones de interfaz
                            </p>
                        </div>
                    </div>
                </div>

                {/* Developer Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Configuración de Desarrollador</h3>
                    <div>
                        <label className="text-sm font-medium">Mostrar Información de Depuración</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={config.show_debug_info}
                            onChange={(e) => setConfig({ ...config, show_debug_info: e.target.value })}
                        >
                            <option value="false">Desactivado</option>
                            <option value="true">Activado</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Muestra detalles técnicos adicionales en la interfaz
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-4 border-t">
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
                        <strong>ℹ️ Nota:</strong> Algunos cambios pueden requerir recargar la página para aplicarse completamente.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
