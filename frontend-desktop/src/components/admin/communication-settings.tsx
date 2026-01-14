import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Save, Loader2, MessageSquare, Webhook } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';

const API_URL = import.meta.env.VITE_API_URL;

interface CommunicationConfig {
    teams_webhook_url: string;
    teams_enabled: boolean;
    general_webhook_url: string;
    general_webhook_enabled: boolean;
    email_gateway_enabled: boolean;
    email_gateway_host: string;
    email_gateway_port: number;
}

export function CommunicationSettings() {
    const [config, setConfig] = useState<CommunicationConfig>({
        teams_webhook_url: "",
        teams_enabled: false,
        general_webhook_url: "",
        general_webhook_enabled: false,
        email_gateway_enabled: false,
        email_gateway_host: "",
        email_gateway_port: 25
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
            const res = await fetch(`${API_URL}/config/communication`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({ ...config, ...data });
            }
        } catch (error) {
            console.error("Failed to load communication config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/config/communication`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success("Configuración de comunicaciones actualizada");
            } else {
                toast.error("Error al guardar configuración");
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const testWebhook = async (type: 'teams' | 'general') => {
        const url = type === 'teams' ? config.teams_webhook_url : config.general_webhook_url;
        if (!url) {
            toast.error("URL del webhook vacía");
            return;
        }

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: "Test desde AI Sysadmin Agent",
                    title: "Test de Webhook",
                    timestamp: new Date().toISOString()
                })
            });

            if (res.ok) {
                toast.success("Webhook enviado correctamente");
            } else {
                toast.error(`Error al enviar webhook (${res.status})`);
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
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
                    <Mail className="h-5 w-5" />
                    Configuración de Comunicaciones
                </CardTitle>
                <CardDescription>
                    Integración con servicios de comunicación externos
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Microsoft Teams */}
                <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Microsoft Teams</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={config.teams_enabled}
                            onChange={(e) => setConfig({ ...config, teams_enabled: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <Label>Habilitar integración con Teams</Label>
                    </div>
                    {config.teams_enabled && (
                        <div className="space-y-2">
                            <Label>Webhook URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={config.teams_webhook_url}
                                    onChange={(e) => setConfig({ ...config, teams_webhook_url: e.target.value })}
                                    placeholder="https://outlook.office.com/webhook/..."
                                />
                                <Button variant="outline" onClick={() => testWebhook('teams')}>
                                    Test
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Obtén el webhook desde Teams → Connectors → Incoming Webhook
                            </p>
                        </div>
                    )}
                </div>

                {/* Generic Webhooks */}
                <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                        <Webhook className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Webhooks Personalizados</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={config.general_webhook_enabled}
                            onChange={(e) => setConfig({ ...config, general_webhook_enabled: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <Label>Habilitar webhooks personalizados</Label>
                    </div>
                    {config.general_webhook_enabled && (
                        <div className="space-y-2">
                            <Label>Webhook URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={config.general_webhook_url}
                                    onChange={(e) => setConfig({ ...config, general_webhook_url: e.target.value })}
                                    placeholder="https://your-service.com/webhook"
                                />
                                <Button variant="outline" onClick={() => testWebhook('general')}>
                                    Test
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                URL de tu servicio que recibirá notificaciones en formato JSON
                            </p>
                        </div>
                    )}
                </div>

                {/* Email Gateway */}
                <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Email Gateway</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={config.email_gateway_enabled}
                            onChange={(e) => setConfig({ ...config, email_gateway_enabled: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <Label>Habilitar gateway de email</Label>
                    </div>
                    {config.email_gateway_enabled && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label>Host</Label>
                                <Input
                                    value={config.email_gateway_host}
                                    onChange={(e) => setConfig({ ...config, email_gateway_host: e.target.value })}
                                    placeholder="mail.example.com"
                                />
                            </div>
                            <div>
                                <Label>Port</Label>
                                <Input
                                    type="number"
                                    value={config.email_gateway_port}
                                    onChange={(e) => setConfig({ ...config, email_gateway_port: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    )}
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
