"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAuditLogs } from "@/lib/api";
import { Shield, Clock } from "lucide-react";

export function AuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await fetchAuditLogs(0, 50);
            setLogs(data);
        } catch (error) {
            console.error("Failed to load audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading audit logs...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Audit Logs
                </CardTitle>
                <CardDescription>Track all administrative actions</CardDescription>
            </CardHeader>
            <CardContent>
                {logs.length > 0 ? (
                    <div className="space-y-2">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{log.action}</span>
                                        <span className="text-xs text-muted-foreground">
                                            on {log.resource_type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        User ID: {log.user_id}
                                        {log.ip_address && ` • IP: ${log.ip_address}`}
                                    </p>
                                    {log.details && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {JSON.stringify(log.details)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {new Date(log.created_at).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No audit logs found</p>
                )}
            </CardContent>
        </Card>
    );
}
