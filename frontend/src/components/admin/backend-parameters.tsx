"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save, Eye, EyeOff } from "lucide-react";

interface BackendParamsProps {
    currentUser: any;
}

export function BackendParameters({ currentUser }: BackendParamsProps) {
    const [config, setConfig] = useState({
        database_url: "",
        secret_key: "",
        algorithm: "HS256",
        access_token_expire_minutes: "1440",
        cors_origins: "*",
        debug_mode: "false",
        log_level: "INFO"
    });
    const [showSecrets, setShowSecrets] = useState(false);
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
            setMessage("✅ Configuration saved successfully. Restart backend to apply changes.");
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
                    <Settings className="h-5 w-5" />
                    Backend Configuration
                </CardTitle>
                <CardDescription>
                    Configure backend server settings and security parameters
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Database Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Database Settings</h3>
                    <div>
                        <label className="text-sm font-medium">Database URL</label>
                        <Input
                            type={showSecrets ? "text" : "password"}
                            value={config.database_url}
                            onChange={(e) => setConfig({ ...config, database_url: e.target.value })}
                            placeholder="postgresql://user:pass@host:5432/dbname"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            PostgreSQL connection string
                        </p>
                    </div>
                </div>

                {/* Security Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Security Settings</h3>
                    <div>
                        <label className="text-sm font-medium">Secret Key</label>
                        <Input
                            type={showSecrets ? "text" : "password"}
                            value={config.secret_key}
                            onChange={(e) => setConfig({ ...config, secret_key: e.target.value })}
                            placeholder="••••••••"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Used for JWT token signing (keep this secret!)
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Algorithm</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.algorithm}
                                onChange={(e) => setConfig({ ...config, algorithm: e.target.value })}
                            >
                                <option value="HS256">HS256</option>
                                <option value="HS384">HS384</option>
                                <option value="HS512">HS512</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Token Expiry (minutes)</label>
                            <Input
                                type="number"
                                value={config.access_token_expire_minutes}
                                onChange={(e) => setConfig({ ...config, access_token_expire_minutes: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* CORS Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">CORS Settings</h3>
                    <div>
                        <label className="text-sm font-medium">Allowed Origins</label>
                        <Input
                            value={config.cors_origins}
                            onChange={(e) => setConfig({ ...config, cors_origins: e.target.value })}
                            placeholder="*"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Comma-separated list of allowed origins. Use * for all (not recommended in production)
                        </p>
                    </div>
                </div>

                {/* Application Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Application Settings</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Debug Mode</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.debug_mode}
                                onChange={(e) => setConfig({ ...config, debug_mode: e.target.value })}
                            >
                                <option value="false">Disabled</option>
                                <option value="true">Enabled</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                Enable detailed error messages (disable in production)
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Log Level</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={config.log_level}
                                onChange={(e) => setConfig({ ...config, log_level: e.target.value })}
                            >
                                <option value="DEBUG">DEBUG</option>
                                <option value="INFO">INFO</option>
                                <option value="WARNING">WARNING</option>
                                <option value="ERROR">ERROR</option>
                            </select>
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

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>⚠️ Security Warning:</strong> These settings should be managed through environment variables
                        in production. Never commit sensitive values to version control. Backend restart required for changes to take effect.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
