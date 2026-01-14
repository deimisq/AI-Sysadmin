import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Loader2, Database, RefreshCw, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_URL = import.meta.env.VITE_API_URL;

interface AdvancedConfig {
    maintenance_mode: boolean;
    maintenance_message: string;
    enable_debug_mode: boolean;
    enable_profiling: boolean;
    backup_retention_days: number;
    auto_backup_enabled: boolean;
    auto_backup_time: string;
    ssh_key_algorithm: string;
    ssh_connection_timeout: number;
    enable_experimental_features: boolean;
}

export function AdvancedSettings() {
    const [config, setConfig] = useState<AdvancedConfig>({
        maintenance_mode: false,
        maintenance_message: "Sistema en mantenimiento. Volveremos pronto.",
        enable_debug_mode: false,
        enable_profiling: false,
        backup_retention_days: 30,
        auto_backup_enabled: true,
        auto_backup_time: "02:00",
        ssh_key_algorithm: "rsa",
        ssh_connection_timeout: 30,
        enable_experimental_features: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [backingUp, setBackingUp] = useState(false);

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
            const res = await fetch(`${API_URL}/admin/config/advanced`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({ ...config, ...data });
            }
        } catch (error) {
            console.error("Failed to load advanced config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/config/advanced`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success("Configuración avanzada actualizada");
            } else {
                toast.error("Error al guardar configuración");
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleBackupNow = async () => {
        setBackingUp(true);
        try {
            const res = await fetch(`${API_URL}/admin/backup`, {
                method: "POST",
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Backup creado: ${data.filename || 'backup.sql'}`);
            } else {
                toast.error("Error al crear backup");
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setBackingUp(false);
        }
    };

    const handleResetConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/config/reset`, {
                method: "POST",
                headers: getAuthHeaders()
            });

            if (res.ok) {
                toast.success("Configuración restablecida a valores por defecto");
                loadConfig();
            } else {
                toast.error("Error al restablecer configuración");
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        }
        setShowResetDialog(false);
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
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configuración Avanzada
                    </CardTitle>
                    <CardDescription>
                        Configuraciones del sistema y opciones avanzadas
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {/* Maintenance Mode */}
                    <div className="p-4 border rounded-lg space-y-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                            <h3 className="text-lg font-medium">Modo de Mantenimiento</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.maintenance_mode}
                                onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Activar modo de mantenimiento</Label>
                        </div>
                        {config.maintenance_mode && (
                            <div>
                                <Label>Mensaje de Mantenimiento</Label>
                                <Textarea
                                    value={config.maintenance_message}
                                    onChange={(e) => setConfig({ ...config, maintenance_message: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>

                    {/* Debug & Profiling */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Debug y Profiling</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.enable_debug_mode}
                                    onChange={(e) => setConfig({ ...config, enable_debug_mode: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label>Habilitar modo debug</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.enable_profiling}
                                    onChange={(e) => setConfig({ ...config, enable_profiling: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label>Habilitar profiling de performance</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.enable_experimental_features}
                                    onChange={(e) => setConfig({ ...config, enable_experimental_features: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label>Habilitar características experimentales</Label>
                            </div>
                        </div>
                    </div>

                    {/* Backup Configuration */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Backups
                            </h3>
                            <Button variant="outline" onClick={handleBackupNow} disabled={backingUp}>
                                {backingUp ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Backup Ahora
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.auto_backup_enabled}
                                    onChange={(e) => setConfig({ ...config, auto_backup_enabled: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label>Habilitar backups automáticos</Label>
                            </div>
                            {config.auto_backup_enabled && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <Label>Hora del Backup Diario</Label>
                                        <Input
                                            type="time"
                                            value={config.auto_backup_time}
                                            onChange={(e) => setConfig({ ...config, auto_backup_time: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Retención (días)</Label>
                                        <Input
                                            type="number"
                                            value={config.backup_retention_days}
                                            onChange={(e) => setConfig({ ...config, backup_retention_days: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SSH Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Configuración SSH</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label>Algoritmo de Clave SSH</Label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md bg-background"
                                    value={config.ssh_key_algorithm}
                                    onChange={(e) => setConfig({ ...config, ssh_key_algorithm: e.target.value })}
                                >
                                    <option value="rsa">RSA</option>
                                    <option value="ed25519">ED25519</option>
                                    <option value="ecdsa">ECDSA</option>
                                </select>
                            </div>
                            <div>
                                <Label>Timeout de Conexión (s)</Label>
                                <Input
                                    type="number"
                                    value={config.ssh_connection_timeout}
                                    onChange={(e) => setConfig({ ...config, ssh_connection_timeout: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="p-4 border-2 border-red-200 dark:border-red-800 rounded-lg space-y-4 bg-red-50 dark:bg-red-950/20">
                        <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Zona de Peligro</h3>
                        <Button
                            variant="destructive"
                            onClick={() => setShowResetDialog(true)}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Restablecer Configuración
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Esto restaurará todas las configuraciones a sus valores predeterminados.
                        </p>
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

            {/* Reset Confirmation Dialog */}
            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restablecer configuración?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción restaurará TODAS las configuraciones del sistema a sus valores predeterminados.
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetConfig} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Restablecer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
