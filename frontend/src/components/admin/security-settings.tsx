"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Trash2, Check, X } from "lucide-react";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";

export function SecuritySettings({ currentUser }: { currentUser: any }) {
    const { t } = useI18n();
    const [msConfig, setMsConfig] = useState({
        microsoft_client_id: "",
        microsoft_client_secret: "",
        microsoft_tenant_id: ""
    });
    const [savingMs, setSavingMs] = useState(false);

    // Domain management state
    const [domains, setDomains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchDomains();
        fetchMsConfig();
    }, []);

    const fetchMsConfig = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/config/security`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setMsConfig({
                    microsoft_client_id: data.microsoft_client_id || "",
                    microsoft_client_secret: data.microsoft_client_secret || "",
                    microsoft_tenant_id: data.microsoft_tenant_id || ""
                });
            }
        } catch (err) {
            console.error("Failed to fetch Microsoft config", err);
        }
    };

    const handleSaveMsConfig = async () => {
        setSavingMs(true);
        try {
            const res = await fetch(`${API_BASE_URL}/config/security`, {
                method: "PUT",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(msConfig),
            });

            if (!res.ok) throw new Error("Failed to save configuration");

            // Show success feedback if needed
        } catch (err) {
            console.error("Failed to save Microsoft config", err);
        } finally {
            setSavingMs(false);
        }
    };

    const fetchDomains = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/allowed-domains`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setDomains(data);
            }
        } catch (err) {
            console.error("Failed to fetch domains", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDomain = async () => {
        if (!newDomain.trim()) return;
        setAdding(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/admin/allowed-domains`, {
                method: "POST",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    domain: newDomain.trim(),
                    description: "Added via admin panel",
                    is_active: true
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to add domain");
            }

            const added = await res.json();
            setDomains([...domains, added]);
            setNewDomain("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteDomain = async (id: number) => {
        if (!confirm(t.securitySettings.allowedDomains.confirmDelete)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/allowed-domains/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (res.ok) {
                setDomains(domains.filter(d => d.id !== id));
            }
        } catch (err) {
            console.error("Failed to delete domain", err);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t.securitySettings.microsoftOAuth.title}
                    </CardTitle>
                    <CardDescription>
                        {t.securitySettings.microsoftOAuth.description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted p-4 rounded-md text-sm mb-4 border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20">
                        <p className="font-medium mb-2 text-blue-900 dark:text-blue-100">{t.securitySettings.microsoftOAuth.redirectUriTitle}</p>
                        <p className="text-muted-foreground mb-2">
                            {t.securitySettings.microsoftOAuth.redirectUriDescription}
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="bg-background px-3 py-2 rounded border block w-full text-xs font-mono">
                                {typeof window !== 'undefined' ? `${window.location.origin}/auth/microsoft/callback` : '...'}
                            </code>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/auth/microsoft/callback`);
                                    alert(t.securitySettings.microsoftOAuth.copiedToClipboard);
                                }}
                            >
                                {t.securitySettings.microsoftOAuth.copy}
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">{t.securitySettings.microsoftOAuth.clientId}</label>
                            <Input
                                value={msConfig.microsoft_client_id}
                                onChange={(e) => setMsConfig({ ...msConfig, microsoft_client_id: e.target.value })}
                                placeholder={t.securitySettings.microsoftOAuth.clientIdPlaceholder}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">{t.securitySettings.microsoftOAuth.clientSecret}</label>
                            <Input
                                type="password"
                                value={msConfig.microsoft_client_secret}
                                onChange={(e) => setMsConfig({ ...msConfig, microsoft_client_secret: e.target.value })}
                                placeholder={t.securitySettings.microsoftOAuth.clientSecretPlaceholder}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">{t.securitySettings.microsoftOAuth.tenantId}</label>
                            <Input
                                value={msConfig.microsoft_tenant_id}
                                onChange={(e) => setMsConfig({ ...msConfig, microsoft_tenant_id: e.target.value })}
                                placeholder={t.securitySettings.microsoftOAuth.tenantIdPlaceholder}
                            />
                            <p className="text-xs text-muted-foreground">{t.securitySettings.microsoftOAuth.tenantIdHelp}</p>
                        </div>
                        <Button onClick={handleSaveMsConfig} disabled={savingMs} className="w-fit">
                            {savingMs ? t.securitySettings.microsoftOAuth.saving : t.securitySettings.microsoftOAuth.saveConfiguration}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t.securitySettings.allowedDomains.title}
                    </CardTitle>
                    <CardDescription>
                        {t.securitySettings.allowedDomains.description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder={t.securitySettings.allowedDomains.placeholder}
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                            />
                            <Button onClick={handleAddDomain} disabled={adding || !newDomain.trim()}>
                                {adding ? t.securitySettings.allowedDomains.adding : <><Plus className="mr-2 h-4 w-4" /> {t.securitySettings.allowedDomains.addDomain}</>}
                            </Button>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <div className="border rounded-md divide-y">
                            {loading ? (
                                <div className="p-4 text-sm text-muted-foreground">{t.securitySettings.allowedDomains.loadingDomains}</div>
                            ) : domains.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">{t.securitySettings.allowedDomains.noDomains}</div>
                            ) : (
                                domains.map((domain) => (
                                    <div key={domain.id} className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-500" />
                                            <span className="font-medium">@{domain.domain}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                            onClick={() => handleDeleteDomain(domain.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
