import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Save, Loader2, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';

const API_URL = import.meta.env.VITE_API_URL;

interface NotificationConfig {
    email_notifications: boolean;
    slack_notifications: boolean;
    discord_notifications: boolean;
    telegram_notifications: boolean;
    notify_on_server_down: boolean;
    notify_on_task_complete: boolean;
    notify_on_error: boolean;
    notify_on_user_action: boolean;
    email_from: string;
    email_from_name: string;
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_use_tls: boolean;
    slack_webhook_url: string;
    discord_webhook_url: string;
    telegram_bot_token: string;
    telegram_chat_id: string;
}

export function NotificationPreferences() {
    const [config, setConfig] = useState<NotificationConfig>({
        email_notifications: true,
        slack_notifications: false,
        discord_notifications: false,
        telegram_notifications: false,
        notify_on_server_down: true,
        notify_on_task_complete: true,
        notify_on_error: true,
        notify_on_user_action: false,
        email_from: "",
        email_from_name: "AI Sysadmin",
        smtp_host: "",
        smtp_port: 587,
        smtp_username: "",
        smtp_use_tls: true,
        slack_webhook_url: "",
        discord_webhook_url: "",
        telegram_bot_token: "",
        telegram_chat_id: ""
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
            const res = await fetch(`${API_URL}/admin/config/notifications`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({ ...config, ...data });
            }
        } catch (error) {
            console.error("Failed to load notification config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/config/notifications`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success("Preferencias de notificaciones actualizadas");
            } else {
                toast.error("Error al guardar preferencias");
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
                    <Bell className="h-5 w-5" />
                    Preferencias de Notificaciones
                </CardTitle>
                <CardDescription>
                    Configura cómo y cuándo recibir notificaciones del sistema
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Notification Channels */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Canales de Notificación</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.email_notifications}
                                onChange={(e) => setConfig({ ...config, email_notifications: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Notificaciones por Email
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.slack_notifications}
                                onChange={(e) => setConfig({ ...config, slack_notifications: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Notificaciones por Slack
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.discord_notifications}
                                onChange={(e) => setConfig({ ...config, discord_notifications: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Notificaciones por Discord</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.telegram_notifications}
                                onChange={(e) => setConfig({ ...config, telegram_notifications: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Notificaciones por Telegram</Label>
                        </div>
                    </div>
                </div>

                {/* Event Types */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Eventos a Notificar</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.notify_on_server_down}
                                onChange={(e) => setConfig({ ...config, notify_on_server_down: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Servidor caído/inaccesible</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.notify_on_task_complete}
                                onChange={(e) => setConfig({ ...config, notify_on_task_complete: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Tareas completadas</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.notify_on_error}
                                onChange={(e) => setConfig({ ...config, notify_on_error: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Errores del sistema</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={config.notify_on_user_action}
                                onChange={(e) => setConfig({ ...config, notify_on_user_action: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label>Acciones de usuarios</Label>
                        </div>
                    </div>
                </div>

                {/* Email Configuration */}
                {config.email_notifications && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="text-lg font-medium">Configuración de Email</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label>Email From</Label>
                                <Input
                                    type="email"
                                    value={config.email_from}
                                    onChange={(e) => setConfig({ ...config, email_from: e.target.value })}
                                    placeholder="noreply@example.com"
                                />
                            </div>
                            <div>
                                <Label>Nombre From</Label>
                                <Input
                                    value={config.email_from_name}
                                    onChange={(e) => setConfig({ ...config, email_from_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>SMTP Host</Label>
                                <Input
                                    value={config.smtp_host}
                                    onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                                    placeholder="smtp.gmail.com"
                                />
                            </div>
                            <div>
                                <Label>SMTP Port</Label>
                                <Input
                                    type="number"
                                    value={config.smtp_port}
                                    onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label>SMTP Username</Label>
                                <Input
                                    value={config.smtp_username}
                                    onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    checked={config.smtp_use_tls}
                                    onChange={(e) => setConfig({ ...config, smtp_use_tls: e.target.checked })}
                                    className="h-4 w-4"
                                />
                                <Label>Usar TLS</Label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Slack Configuration */}
                {config.slack_notifications && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="text-lg font-medium">Configuración de Slack</h3>
                        <div>
                            <Label>Webhook URL</Label>
                            <Input
                                value={config.slack_webhook_url}
                                onChange={(e) => setConfig({ ...config, slack_webhook_url: e.target.value })}
                                placeholder="https://hooks.slack.com/services/..."
                            />
                        </div>
                    </div>
                )}

                {/* Discord Configuration */}
                {config.discord_notifications && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="text-lg font-medium">Configuración de Discord</h3>
                        <div>
                            <Label>Webhook URL</Label>
                            <Input
                                value={config.discord_webhook_url}
                                onChange={(e) => setConfig({ ...config, discord_webhook_url: e.target.value })}
                                placeholder="https://discord.com/api/webhooks/..."
                            />
                        </div>
                    </div>
                )}

                {/* Telegram Configuration */}
                {config.telegram_notifications && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="text-lg font-medium">Configuración de Telegram</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label>Bot Token</Label>
                                <Input
                                    value={config.telegram_bot_token}
                                    onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
                                    placeholder="123456:ABC-DEF..."
                                />
                            </div>
                            <div>
                                <Label>Chat ID</Label>
                                <Input
                                    value={config.telegram_chat_id}
                                    onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
                                    placeholder="-100123456789"
                                />
                            </div>
                        </div>
                    </div>
                )}

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
                                Guardar Preferencias
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
