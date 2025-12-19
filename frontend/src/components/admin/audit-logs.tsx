"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAuditLogs } from "@/lib/api";
import { Shield, Clock, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function AuditLogs() {
    const { t } = useI18n();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage] = useState(20);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await fetchAuditLogs(0, 200); // Load more logs for pagination
            setLogs(data);
        } catch (error) {
            console.error("Failed to load audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter logs based on search term
    const filteredLogs = logs.filter(log => {
        const searchLower = searchTerm.toLowerCase();
        return (
            log.action?.toLowerCase().includes(searchLower) ||
            log.resource_type?.toLowerCase().includes(searchLower) ||
            log.user_id?.toString().includes(searchLower) ||
            log.ip_address?.toLowerCase().includes(searchLower)
        );
    });

    // Group logs by date
    const groupedLogs = filteredLogs.reduce((groups: any, log: any) => {
        const date = new Date(log.created_at).toLocaleDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
        return groups;
    }, {});

    // Pagination
    const dates = Object.keys(groupedLogs).sort((a, b) =>
        new Date(b).getTime() - new Date(a).getTime()
    );
    const totalPages = Math.ceil(dates.length / logsPerPage);
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const currentDates = dates.slice(startIndex, endIndex);

    const getActionBadgeColor = (action: string) => {
        if (action?.includes('create')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        if (action?.includes('update')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        if (action?.includes('delete')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    if (loading) {
        return <div className="text-center py-10">{t.common.loadingData}</div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {t.auditLogs.title}
                        </CardTitle>
                        <CardDescription>{t.auditLogs.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t.auditLogs.search}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filteredLogs.length > 0 ? (
                    <>
                        <div className="space-y-6">
                            {currentDates.map((date) => (
                                <div key={date}>
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        {date}
                                    </h3>
                                    <div className="space-y-2 ml-6">
                                        {groupedLogs[date].map((log: any) => (
                                            <div
                                                key={log.id}
                                                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                                                            {log.action}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {t.auditLogs.on} {log.resource_type}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t.auditLogs.userId}: {log.user_id}
                                                        {log.ip_address && ` • ${t.auditLogs.ip}: ${log.ip_address}`}
                                                    </p>
                                                    {log.details && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                                {t.auditLogs.viewDetails}
                                                            </summary>
                                                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                                                {JSON.stringify(log.details, null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    {new Date(log.created_at).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    {t.auditLogs.page} {currentPage} {t.auditLogs.of} {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        {t.auditLogs.previous}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        {t.auditLogs.next}
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">
                        {searchTerm ? t.auditLogs.noResults : t.auditLogs.noLogs}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
