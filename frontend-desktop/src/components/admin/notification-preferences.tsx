import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Save, Mail, Shield, Server, Activity } from "lucide-react";
import { fetch } from '@tauri-apps/plugin-http';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface NotificationPreferencesProps {
    currentUser?: any;
}

export function NotificationPreferences({ currentUser }: NotificationPreferencesProps) {
    const [preferences, setPreferences] = useState({
        notify_new_users: true,
        notify_security_alerts: true,
        notify_new_servers: false,
        notify_system_events: true,
        notify_version_updates: true
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadPreferences();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const loadPreferences = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error("Error al cargar configuración");

            const data = await response.json();
            setPreferences({
                notify_new_users: data.notify_new_users ?? true,
                notify_security_alerts: data.notify_security_alerts ?? true,
                notify_new_servers: data.notify_new_servers ?? false,
                notify_system_events: data.notify_system_events ?? true,
                notify_version_updates: data.notify_version_updates ?? true
            });
        } catch (error: any) {
            setMessage("❌ Error al cargar preferencias: " + error.message);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            const response = await fetch(`${API_BASE_URL}/auth/me/preferences`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(preferences)
            });

            if (!response.ok) throw new Error("Failed to save preferences");

            setMessage("✅ Preferencias actualizadas correctamente");
            setTimeout(() => setMessage(""), 3000);
        } catch (error: any) {
            setMessage("❌ Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Only show to admins and superadmins
    if (currentUser && !["admin", "superadmin"].includes(currentUser.role)) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-600" />
                    <CardTitle>Preferencias de Notificación</CardTitle>
                </div>
                <CardDescription>
                    Gestiona qué eventos activan una notificación (alertas, nuevos usuarios, etc.)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {message && (
                    <div className={`p-3 rounded-lg ${message.startsWith("✅")
                        ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                        : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                        }`}>
                        {message}
                    </div>
                )}

                <div className="space-y-4">
                    {/* New Users */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_new_users"
                                checked={preferences.notify_new_users}
                                onChange={(e) => setPreferences({ ...preferences, notify_new_users: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Mail className="h-4 w-4 text-blue-600" />
                                <label htmlFor="notify_new_users" className="font-medium cursor-pointer">
                                    Nuevos Usuarios
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Recibir notificación cuando un nuevo usuario se registra.
                            </p>
                        </div>
                    </div>

                    {/* Security Alerts */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_security_alerts"
                                checked={preferences.notify_security_alerts}
                                onChange={(e) => setPreferences({ ...preferences, notify_security_alerts: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="h-4 w-4 text-red-600" />
                                <label htmlFor="notify_security_alerts" className="font-medium cursor-pointer">
                                    Alertas de Seguridad
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Notificaciones críticas sobre intentos fallidos de login o cambios de configuración sensibles.
                            </p>
                        </div>
                    </div>

                    {/* New Servers */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_new_servers"
                                checked={preferences.notify_new_servers}
                                onChange={(e) => setPreferences({ ...preferences, notify_new_servers: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Server className="h-4 w-4 text-green-600" />
                                <label htmlFor="notify_new_servers" className="font-medium cursor-pointer">
                                    Nuevos Servidores
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Aviso cuando un nuevo agente/servidor es detectado o registrado manualmente.
                            </p>
                        </div>
                    </div>

                    {/* System Events */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_system_events"
                                checked={preferences.notify_system_events}
                                onChange={(e) => setPreferences({ ...preferences, notify_system_events: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className="h-4 w-4 text-purple-600" />
                                <label htmlFor="notify_system_events" className="font-medium cursor-pointer">
                                    Eventos de Sistema
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Alertas sobre estado de servicios, backups y mantenimiento.
                            </p>
                        </div>
                    </div>

                    {/* Version Updates */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_version_updates"
                                checked={preferences.notify_version_updates}
                                onChange={(e) => setPreferences({ ...preferences, notify_version_updates: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Bell className="h-4 w-4 text-orange-600" />
                                <label htmlFor="notify_version_updates" className="font-medium cursor-pointer">
                                    Actualizaciones
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Recibir avisos sobre nuevas versiones del software.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "Guardando..." : "Guardar Preferencias"}
                    </Button>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>ℹ️ Nota:</strong> Estas preferencias son personales para tu usuario.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
