"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Save, Eye, EyeOff, Mail, Send } from "lucide-react";
import { getConfigByCategory, updateConfigCategory, API_BASE_URL } from "@/lib/api";

interface CommunicationSettingsProps {
    currentUser: any;
}

export function CommunicationSettings({ currentUser }: CommunicationSettingsProps) {
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

    const loadConfig = async () => {
        try {
            const data = await getConfigByCategory("communication");
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
            setMessage("✅ Configuration loaded successfully");
        } catch (error: any) {
            console.error("Failed to load config:", error);
            setMessage("ℹ️ No saved configuration found. Using defaults.");
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            await updateConfigCategory("communication", config);
            setMessage("✅ Configuration saved successfully! Changes applied immediately.");
        } catch (error: any) {
            setMessage("❌ Failed to save configuration: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmailRecipient) {
            setMessage("❌ Please enter a recipient email address");
            return;
        }

        setTestingEmail(true);
        setMessage("");

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
            const response = await fetch(`${API_BASE_URL}/admin/test-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && { "Authorization": `Bearer ${token}` }),
                },
                body: JSON.stringify({
                    recipient: testEmailRecipient,
                    smtp_config: config
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to send test email");
            }

            const result = await response.json();
            setMessage(`✅ ${result.message}`);
        } catch (error: any) {
            setMessage("❌ Failed to send test email: " + error.message);
        } finally {
            setTestingEmail(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Communication Settings
                </CardTitle>
                <CardDescription>
                    Configure email notifications and messaging integrations
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* SMTP Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            SMTP Email Configuration
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Enable SMTP</span>
                            <select
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                value={config.smtp_enabled}
                                onChange={(e) => setConfig({ ...config, smtp_enabled: e.target.value })}
                            >
                                <option value="false">Disabled</option>
                                <option value="true">Enabled</option>
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
                                <label className="text-sm font-medium">Use TLS/STARTTLS</label>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Test Email Recipient</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        value={testEmailRecipient}
                                        onChange={(e) => setTestEmailRecipient(e.target.value)}
                                        placeholder="recipient@example.com"
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleTestEmail}
                                        disabled={testingEmail || !config.smtp_host || !config.smtp_username || !testEmailRecipient}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        {testingEmail ? "Sending..." : "Send Test"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Send a test email to verify SMTP configuration
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Notification Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Notification Settings</h3>
                    <div>
                        <label className="text-sm font-medium">Enable Email Notifications</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={config.enable_email_notifications}
                            onChange={(e) => setConfig({ ...config, enable_email_notifications: e.target.value })}
                        >
                            <option value="false">Disabled</option>
                            <option value="true">Enabled</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Send email notifications for critical events and alerts
                        </p>
                    </div>
                    {config.enable_email_notifications === "true" && (
                        <div>
                            <label className="text-sm font-medium">Admin Email</label>
                            <Input
                                type="email"
                                value={config.admin_email}
                                onChange={(e) => setConfig({ ...config, admin_email: e.target.value })}
                                placeholder="admin@example.com"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Email address to receive system notifications
                            </p>
                        </div>
                    )}
                </div>

                {/* Future Integrations */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-medium text-sm">Messaging Integrations (Coming Soon)</h3>
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
                    <p className="text-xs text-muted-foreground">
                        These integrations will be available in future releases
                    </p>
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
                                Hide Secrets
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                Show Secrets
                            </>
                        )}
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "Saving..." : "Save Configuration"}
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
                        <strong>ℹ️ Note:</strong> SMTP credentials are stored securely in the database.
                        Changes are applied immediately without requiring a backend restart.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
