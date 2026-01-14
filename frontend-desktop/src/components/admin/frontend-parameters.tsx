import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Code, Save, Loader2, Palette, Layout } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';

const API_URL = import.meta.env.VITE_API_URL;

interface FrontendConfig {
    app_name: string;
    app_logo_url: string;
    primary_color: string;
    theme_mode: string;
    default_language: string;
    items_per_page: number;
    enable_dark_mode: boolean;
    custom_css: string;
    custom_js: string;
}

export function FrontendParameters() {
    const [config, setConfig] = useState<FrontendConfig>({
        app_name: "AI Sysadmin Agent",
        app_logo_url: "",
        primary_color: "#3b82f6",
        theme_mode: "system",
        default_language: "es",
        items_per_page: 10,
        enable_dark_mode: true,
        custom_css: "",
        custom_js: ""
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
            const res = await fetch(`${API_URL}/config/frontend`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({ ...config, ...data });
            }
        } catch (error) {
            console.error("Failed to load frontend config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/config/frontend`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success("Configuración del frontend actualizada");
                toast.info("Recarga la página para ver los cambios");
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
                    <Code className="h-5 w-5" />
                    Parámetros del Frontend
                </CardTitle>
                <CardDescription>
                    Personaliza la apariencia y comportamiento de la interfaz
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Branding */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Branding
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>Nombre de la Aplicación</Label>
                            <Input
                                value={config.app_name}
                                onChange={(e) => setConfig({ ...config, app_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>URL del Logo</Label>
                            <Input
                                value={config.app_logo_url}
                                onChange={(e) => setConfig({ ...config, app_logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png"
                            />
                        </div>
                    </div>
                </div>

                {/* Theme */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Tema</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <Label>Color Primario</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={config.primary_color}
                                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                                    className="w-20"
                                />
                                <Input
                                    value={config.primary_color}
                                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                                    placeholder="#3b82f6"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Modo de Tema</Label>
                            <select
                                className="w-full px-3 py-2 border rounded-md bg-background"
                                value={config.theme_mode}
                                onChange={(e) => setConfig({ ...config, theme_mode: e.target.value })}
                            >
                                <option value="light">Claro</option>
                                <option value="dark">Oscuro</option>
                                <option value="system">Sistema</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={config.enable_dark_mode}
                                onChange={(e) => setConfig({ ...config, enable_dark_mode: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Permitir modo oscuro</Label>
                        </div>
                    </div>
                </div>

                {/* Localization */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Layout className="h-5 w-5" />
                        Localización y Comportamiento
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>Idioma Predeterminado</Label>
                            <select
                                className="w-full px-3 py-2 border rounded-md bg-background"
                                value={config.default_language}
                                onChange={(e) => setConfig({ ...config, default_language: e.target.value })}
                            >
                                <option value="es">Español</option>
                                <option value="en">English</option>
                                <option value="pt">Português</option>
                            </select>
                        </div>
                        <div>
                            <Label>Items por Página</Label>
                            <Input
                                type="number"
                                value={config.items_per_page}
                                onChange={(e) => setConfig({ ...config, items_per_page: parseInt(e.target.value) })}
                                min="5"
                                max="100"
                            />
                        </div>
                    </div>
                </div>

                {/* Custom Code */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Código Personalizado</h3>
                    <div className="space-y-4">
                        <div>
                            <Label>CSS Personalizado</Label>
                            <Textarea
                                value={config.custom_css}
                                onChange={(e) => setConfig({ ...config, custom_css: e.target.value })}
                                placeholder="/* Tu CSS personalizado aquí */"
                                className="font-mono text-sm"
                                rows={6}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Se inyectará en todas las páginas
                            </p>
                        </div>
                        <div>
                            <Label>JavaScript Personalizado</Label>
                            <Textarea
                                value={config.custom_js}
                                onChange={(e) => setConfig({ ...config, custom_js: e.target.value })}
                                placeholder="// Tu JavaScript personalizado aquí"
                                className="font-mono text-sm"
                                rows={6}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Se ejecutará en todas las páginas (usar con precaución)
                            </p>
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
