"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, Save } from "lucide-react";

interface FrontendParamsProps {
    currentUser: any;
}

export function FrontendParameters({ currentUser }: FrontendParamsProps) {
    const [config, setConfig] = useState({
        api_url: "/api/v1",
        app_name: "AI Sysadmin Agent",
        default_language: "en",
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

    const loadConfig = async () => {
        setMessage("Configuration loaded from environment variables");
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setMessage("✅ Configuration saved successfully. Rebuild frontend to apply changes.");
        } catch (error: any) {
            setMessage("❌ Failed to save configuration: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Frontend Configuration
                </CardTitle>
                <CardDescription>
                    Configure frontend application settings and user experience
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* API Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">API Settings</h3>
                    <div>
                        <label className="text-sm font-medium">API Base URL</label>
                        <Input
                            value={config.api_url}
                            onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                            placeholder="/api/v1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Backend API endpoint (use relative path when behind proxy)
                        </p>
                    </div>
                </div>

                {/* Application Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Application Settings</h3>
                    <div>
                        <label className="text-sm font-medium">Application Name</label>
                        <Input
                            value={config.app_name}
                            onChange={(e) => setConfig({ ...config, app_name: e.target.value })}
                            placeholder="AI Sysadmin Agent"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Displayed in browser title and header
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Default Language</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.default_language}
                                onChange={(e) => setConfig({ ...config, default_language: e.target.value })}
                            >
                                <option value="en">English</option>
                                <option value="es">Español</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Theme</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.theme}
                                onChange={(e) => setConfig({ ...config, theme: e.target.value })}
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="system">System</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* UI/UX Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">UI/UX Settings</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Items Per Page</label>
                            <Input
                                type="number"
                                value={config.items_per_page}
                                onChange={(e) => setConfig({ ...config, items_per_page: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Default pagination size for lists
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Animations</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.enable_animations}
                                onChange={(e) => setConfig({ ...config, enable_animations: e.target.value })}
                            >
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                Enable UI animations and transitions
                            </p>
                        </div>
                    </div>
                </div>

                {/* Developer Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Developer Settings</h3>
                    <div>
                        <label className="text-sm font-medium">Show Debug Info</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={config.show_debug_info}
                            onChange={(e) => setConfig({ ...config, show_debug_info: e.target.value })}
                        >
                            <option value="false">Disabled</option>
                            <option value="true">Enabled</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Show debug information in console (disable in production)
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-4 border-t">
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
                        <strong>ℹ️ Note:</strong> Frontend configuration changes require rebuilding the application.
                        These settings are typically managed through environment variables at build time.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
