"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Trash2, Check, X } from "lucide-react";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";

export function SecuritySettings({ currentUser }: { currentUser: any }) {
    const [domains, setDomains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchDomains();
    }, []);

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
        if (!confirm("Are you sure you want to remove this domain?")) return;

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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Settings
                </CardTitle>
                <CardDescription>
                    Configure security policies and allowed registration domains
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">Allowed Registration Domains</h3>
                    <p className="text-sm text-muted-foreground">
                        Users registering with emails from these domains will be automatically approved.
                        Others will require manual approval.
                    </p>

                    <div className="flex gap-2">
                        <Input
                            placeholder="example.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                        />
                        <Button onClick={handleAddDomain} disabled={adding || !newDomain.trim()}>
                            {adding ? "Adding..." : <><Plus className="mr-2 h-4 w-4" /> Add Domain</>}
                        </Button>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="border rounded-md divide-y">
                        {loading ? (
                            <div className="p-4 text-sm text-muted-foreground">Loading domains...</div>
                        ) : domains.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">No allowed domains configured. All registrations will require approval.</div>
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
    );
}
