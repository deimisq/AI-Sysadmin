import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';

const API_URL = import.meta.env.VITE_API_URL;

interface SecurityConfig {
    session_timeout: number;
    max_login_attempts: number;
    password_min_length: number;
    require_special_chars: boolean;
    require_numbers: boolean;
    require_uppercase: boolean;
    enable_2fa: boolean;
    allowed_domains: string;
}

export function SecuritySettings() {
    const [config, setConfig] = useState<SecurityConfig>({
        session_timeout: 3600,
        max_login_attempts: 5,
        password_min_length: 8,
        require_special_chars: true,
        require_numbers: true,
        require_uppercase: true,
        enable_2fa: false,
        allowed_domains: ""
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
            const res = await fetch(`${API_URL}/admin/config/security`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig(data);
            }
        } catch (error) {
            console.error("Failed to load security config:", error);
            // Use defaults if loading fails
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/config/security`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success("Configuración de seguridad actualizada");
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
                    <Shield className="h-5 w-5" />
                    Configuración de Seguridad
                </CardTitle>
                <CardDescription>
                    Gestiona la seguridad y políticas de acceso del sistema
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Session Settings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Sesiones</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>Tiempo de sesión (segundos)</Label>
                            <Input
                                type="number"
                                value={config.session_timeout}
                                onChange={(e) => setConfig({ ...config, session_timeout: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Duración antes de cerrar sesión automáticamente
                            </p>
                        </div>
                        <div>
                            <Label>Máximo de intentos de login</Label>
                            <Input
                                type="number"
                                value={config.max_login_attempts}
                                onChange={(e) => setConfig({ ...config, max_login_attempts: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Intentos antes de bloquear temporalmente
                            </p>
                        </div>
                    </div>
                </div>

                {/* Password Policy */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Política de Contraseñas</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label>Longitud mínima</Label>
                            <Input
                                type="number"
                                value={config.password_min_length}
                                onChange={(e) => setConfig({ ...config, password_min_length: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.require_special_chars}
                                    onChange={(e) => setConfig({ ...config, require_special_chars: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label>Requerir caracteres especiales</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.require_numbers}
                                    onChange={(e) => setConfig({ ...config, require_numbers: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label>Requerir números</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.require_uppercase}
                                    onChange={(e) => setConfig({ ...config, require_uppercase: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label>Requerir mayúsculas</Label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Autenticación de Dos Factores</h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={config.enable_2fa}
                            onChange={(e) => setConfig({ ...config, enable_2fa: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <Label>Habilitar 2FA para todos los usuarios</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Requiere autenticación de dos factores para todos los usuarios del sistema
                    </p>
                </div>

                {/* Allowed Domains */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Dominios Permitidos</h3>
                    <div>
                        <Label>Dominios de email permitidos (separados por coma)</Label>
                        <Input
                            value={config.allowed_domains}
                            onChange={(e) => setConfig({ ...config, allowed_domains: e.target.value })}
                            placeholder="example.com, company.com"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Dejar vacío para permitir todos los dominios
                        </p>
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
