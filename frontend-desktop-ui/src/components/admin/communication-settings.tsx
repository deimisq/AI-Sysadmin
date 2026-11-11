import { uiText } from '../../lib/ui-language';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Save, Eye, EyeOff, Mail, Send } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export function CommunicationSettings() {
    const [config, setConfig] = useState({
        // SMTP Settings
        smtp_enabled: "false",
        smtp_host: "",
        smtp_port: "587",
        smtp_username: "",
        smtp_password: "",
        smtp_from_email: "",
        smtp_from_name: "AI Sysadmin Agent",
        smtp_use_tls: "true",

        // Notification Settings
        enable_email_notifications: "false",
        admin_email: "",

        // Future Integrations (placeholders)
        teams_webhook_url: "",
        slack_webhook_url: "",
        telegram_bot_token: "",
        telegram_chat_id: "",
        whatsapp_enabled: "false"
    });
    const [showSecrets, setShowSecrets] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [testEmailRecipient, setTestEmailRecipient] = useState("");
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
            const res = await fetch(`${API_BASE_URL}/config/communication`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                // Merge loaded config with defaults
                setConfig({
                    smtp_enabled: String(data.smtp_enabled ?? "false"),
                    smtp_host: data.smtp_host || "",
                    smtp_port: String(data.smtp_port || "587"),
                    smtp_username: data.smtp_username || "",
                    smtp_password: data.smtp_password || "",
                    smtp_from_email: data.smtp_from_email || "",
                    smtp_from_name: data.smtp_from_name || "AI Sysadmin Agent",
                    smtp_use_tls: String(data.smtp_use_tls ?? "true"),
                    enable_email_notifications: String(data.enable_email_notifications ?? "false"),
                    admin_email: data.admin_email || "",
                    teams_webhook_url: data.teams_webhook_url || "",
                    slack_webhook_url: data.slack_webhook_url || "",
                    telegram_bot_token: data.telegram_bot_token || "",
                    telegram_chat_id: data.telegram_chat_id || "",
                    whatsapp_enabled: String(data.whatsapp_enabled ?? "false")
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
            const res = await fetch(`${API_BASE_URL}/config/communication`, {
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

    const handleTestEmail = async () => {
        if (!testEmailRecipient) {
            setMessage("❌ Por favor ingresa un email destinatario");
            return;
        }

        setTestingEmail(true);
        setMessage("");

        try {
            const response = await fetch(`${API_BASE_URL}/admin/test-email`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    recipient: testEmailRecipient,
                    smtp_config: config
                })
            });

            if (!response.ok) {
                const error = (await response.json()) as any;
                throw new Error(error.detail || "Error enviando email de prueba");
            }

            const result = await response.json();
            setMessage(`✅ ${result.message}`);
        } catch (error: any) {
            setMessage("❌ Error enviando email de prueba: " + error.message);
        } finally {
            setTestingEmail(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />{uiText("Configuración de Comunicación")}</CardTitle>
                <CardDescription>{uiText("Configura notificaciones por email e integraciones de mensajería")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* SMTP Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4" />{uiText("Configuración SMTP")}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{uiText("Habilitar SMTP")}</span>
                            <select
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                value={config.smtp_enabled}
                                onChange={(e) => setConfig({ ...config, smtp_enabled: e.target.value })}
                            >
                                <option value="false">{uiText("Desactivado")}</option>
                                <option value="true">{uiText("Activado")}</option>
                            </select>
                        </div>
                    </div>

                    {config.smtp_enabled === "true" && (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">SMTP Host</label>
                                    <Input
                                        value={config.smtp_host}
                                        onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                                        placeholder="smtp.gmail.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">SMTP Port</label>
                                    <Input
                                        type="number"
                                        value={config.smtp_port}
                                        onChange={(e) => setConfig({ ...config, smtp_port: e.target.value })}
                                        placeholder="587"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">SMTP Username</label>
                                    <Input
                                        value={config.smtp_username}
                                        onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })}
                                        placeholder="user@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">SMTP Password</label>
                                    <Input
                                        type={showSecrets ? "text" : "password"}
                                        value={config.smtp_password}
                                        onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">From Email</label>
                                    <Input
                                        type="email"
                                        value={config.smtp_from_email}
                                        onChange={(e) => setConfig({ ...config, smtp_from_email: e.target.value })}
                                        placeholder="noreply@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">From Name</label>
                                    <Input
                                        value={config.smtp_from_name}
                                        onChange={(e) => setConfig({ ...config, smtp_from_name: e.target.value })}
                                        placeholder="AI Sysadmin Agent"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={config.smtp_use_tls === "true"}
                                    onChange={(e) => setConfig({ ...config, smtp_use_tls: e.target.checked ? "true" : "false" })}
                                    className="h-4 w-4"
                                />
                                <label className="text-sm font-medium">{uiText("Usar TLS/STARTTLS")}</label>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{uiText("Destinatario de prueba")}</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        value={testEmailRecipient}
                                        onChange={(e) => setTestEmailRecipient(e.target.value)}
                                        placeholder="destinatario@ejemplo.com"
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleTestEmail}
                                        disabled={testingEmail || !config.smtp_host || !config.smtp_username || !testEmailRecipient}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        {testingEmail ? "Enviando..." : "Enviar Prueba"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">{uiText("Envía un email de prueba para verificar la configuración SMTP")}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Notification Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">{uiText("Configuración de Notificaciones")}</h3>
                    <div>
                        <label className="text-sm font-medium">{uiText("Habilitar Notificaciones por Email")}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={config.enable_email_notifications}
                            onChange={(e) => setConfig({ ...config, enable_email_notifications: e.target.value })}
                        >
                            <option value="false">{uiText("Desactivado")}</option>
                            <option value="true">{uiText("Activado")}</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">{uiText("Enviar alertas por email para eventos críticos")}</p>
                    </div>
                    {config.enable_email_notifications === "true" && (
                        <div>
                            <label className="text-sm font-medium">{uiText("Email del Administrador")}</label>
                            <Input
                                type="email"
                                value={config.admin_email}
                                onChange={(e) => setConfig({ ...config, admin_email: e.target.value })}
                                placeholder="admin@example.com"
                            />
                        </div>
                    )}
                </div>

                {/* Future Integrations */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-medium text-sm">{uiText("Integraciones de Mensajería (Próximamente)")}</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Microsoft Teams Webhook</label>
                            <Input
                                value={config.teams_webhook_url}
                                onChange={(e) => setConfig({ ...config, teams_webhook_url: e.target.value })}
                                placeholder="https://..."
                                disabled
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Slack Webhook</label>
                            <Input
                                value={config.slack_webhook_url}
                                onChange={(e) => setConfig({ ...config, slack_webhook_url: e.target.value })}
                                placeholder="https://hooks.slack.com/..."
                                disabled
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Telegram Bot Token</label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                value={config.telegram_bot_token}
                                onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
                                placeholder="••••••••"
                                disabled
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Telegram Chat ID</label>
                            <Input
                                value={config.telegram_chat_id}
                                onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
                                placeholder="-1001234567890"
                                disabled
                            />
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
                                <EyeOff className="mr-2 h-4 w-4" />{uiText("Ocultar Secretos")}</>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />{uiText("Mostrar Secretos")}</>
                        )}
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? uiText("Guardando...") : uiText("Guardar Configuración")}
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
                        <strong>{uiText("ℹ️ Nota:")}</strong>{uiText("Las credenciales SMTP se almacenan de forma segura en la base de datos. Los cambios se aplican inmediatamente.")}</p>
                </div>
            </CardContent>
        </Card>
    );
}
