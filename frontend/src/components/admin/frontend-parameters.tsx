"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, Save } from "lucide-react";
import { getConfigByCategory, updateConfigCategory } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";

interface FrontendParamsProps {
    currentUser: any;
}

export function FrontendParameters({ currentUser }: FrontendParamsProps) {
    const { t } = useI18n();
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
        try {
            const data = await getConfigByCategory("frontend");
            setConfig({
                api_url: data.api_url || "/api/v1",
                app_name: data.app_name || "AI Sysadmin Agent",
                default_language: data.default_language || "en",
                theme: data.theme || "system",
                items_per_page: String(data.items_per_page || "20"),
                enable_animations: String(data.enable_animations ?? "true"),
                show_debug_info: String(data.show_debug_info ?? "false")
            });
            setMessage(`✅ ${t.aiParams.loadSuccess}`);
        } catch (error: any) {
            console.error("Failed to load config:", error);
            setMessage(`ℹ️ ${t.aiParams.loadDefault}`);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            await updateConfigCategory("frontend", config);
            setMessage(`✅ ${t.aiParams.saveSuccess}`);
        } catch (error: any) {
            setMessage(`❌ ${t.aiParams.saveError}: ` + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    {t.frontendParams.title}
                </CardTitle>
                <CardDescription>
                    {t.frontendParams.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* API Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">API Settings</h3>
                    <div>
                        <label className="text-sm font-medium">{t.frontendParams.apiUrl}</label>
                        <Input
                            value={config.api_url}
                            onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                            placeholder="/api/v1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {t.frontendParams.apiUrlHelp}
                        </p>
                    </div>
                </div>

                {/* Application Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Application Settings</h3>
                    <div>
                        <label className="text-sm font-medium">{t.frontendParams.appName}</label>
                        <Input
                            value={config.app_name}
                            onChange={(e) => setConfig({ ...config, app_name: e.target.value })}
                            placeholder="AI Sysadmin Agent"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {t.frontendParams.appNameHelp}
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">{t.frontendParams.defaultLanguage}</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.default_language}
                                onChange={(e) => setConfig({ ...config, default_language: e.target.value })}
                            >
                                <option value="en">{t.language.english}</option>
                                <option value="es">{t.language.spanish}</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{t.frontendParams.theme}</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.theme}
                                onChange={(e) => setConfig({ ...config, theme: e.target.value })}
                            >
                                <option value="light">{t.theme.light}</option>
                                <option value="dark">{t.theme.dark}</option>
                                <option value="system">{t.theme.system}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* UI/UX Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">UI/UX Settings</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">{t.frontendParams.itemsPerPage}</label>
                            <Input
                                type="number"
                                value={config.items_per_page}
                                onChange={(e) => setConfig({ ...config, items_per_page: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {t.frontendParams.itemsPerPageHelp}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{t.frontendParams.animations}</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.enable_animations}
                                onChange={(e) => setConfig({ ...config, enable_animations: e.target.value })}
                            >
                                <option value="true">{t.backendParams.enabled}</option>
                                <option value="false">{t.backendParams.disabled}</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t.frontendParams.animationsHelp}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Developer Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Developer Settings</h3>
                    <div>
                        <label className="text-sm font-medium">{t.frontendParams.showDebug}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={config.show_debug_info}
                            onChange={(e) => setConfig({ ...config, show_debug_info: e.target.value })}
                        >
                            <option value="false">{t.backendParams.disabled}</option>
                            <option value="true">{t.backendParams.enabled}</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t.frontendParams.showDebugHelp}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? t.aiParams.saving : t.aiParams.save}
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
                        <strong>ℹ️ Note:</strong> {t.frontendParams.note}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
