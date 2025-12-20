"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAuditLogs, fetchAuditLogStats, exportAuditLogsCSV } from "@/lib/api";
import { Shield, Clock, Search, ChevronLeft, ChevronRight, Download, RefreshCw, Filter, X, BarChart3, User, Activity } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { toast } from "sonner";

interface AuditLog {
    id: number;
    user_id: number;
    username: string;
    user_email: string;
    user_role: string;
    action: string;
    resource_type: string;
    resource_id: number | null;
    details: any;
    ip_address: string | null;
    created_at: string;
}

interface AuditLogStats {
    total_logs: number;
    logs_today: number;
    logs_this_week: number;
    logs_this_month: number;
    top_users: Array<{ user_id: number; username: string; count: number }>;
    top_actions: Record<string, number>;
}

export function AuditLogs() {
    const { t } = useI18n();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditLogStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage] = useState(20);
    const [totalLogs, setTotalLogs] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        start_date: "",
        end_date: "",
        action: "",
        resource_type: "",
        user_id: undefined as number | undefined,
    });

    useEffect(() => {
        loadLogs();
        loadStats();
    }, [currentPage]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const skip = (currentPage - 1) * logsPerPage;

            // Build filters object
            const activeFilters: any = {};
            if (filters.start_date) activeFilters.start_date = filters.start_date;
            if (filters.end_date) activeFilters.end_date = filters.end_date;
            if (filters.action) activeFilters.action = filters.action;
            if (filters.resource_type) activeFilters.resource_type = filters.resource_type;
            if (filters.user_id) activeFilters.user_id = filters.user_id;

            const data = await fetchAuditLogs(skip, logsPerPage, Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
            setLogs(data.logs || []);
            setTotalLogs(data.total || 0);
        } catch (error) {
            console.error("Failed to load audit logs", error);
            toast.error(t.auditLogs?.loadError || "Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await fetchAuditLogStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load stats", error);
        }
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        loadLogs();
        toast.success(t.auditLogs?.filtersApplied || "Filters applied");
    };

    const handleClearFilters = () => {
        setFilters({
            start_date: "",
            end_date: "",
            action: "",
            resource_type: "",
            user_id: undefined,
        });
        setCurrentPage(1);
        setTimeout(() => loadLogs(), 100);
        toast.success(t.auditLogs?.filtersCleared || "Filters cleared");
    };

    const handleExportCSV = async () => {
        try {
            setExporting(true);
            const activeFilters: any = {};
            if (filters.start_date) activeFilters.start_date = filters.start_date;
            if (filters.end_date) activeFilters.end_date = filters.end_date;
            if (filters.action) activeFilters.action = filters.action;
            if (filters.resource_type) activeFilters.resource_type = filters.resource_type;
            if (filters.user_id) activeFilters.user_id = filters.user_id;

            await exportAuditLogsCSV(Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
            toast.success(t.auditLogs?.exportSuccess || "Export successful");
        } catch (error) {
            console.error("Failed to export", error);
            toast.error(t.auditLogs?.exportError || "Failed to export");
        } finally {
            setExporting(false);
        }
    };

    // Filter logs based on search term (client-side filter)
    const filteredLogs = logs.filter(log => {
        const searchLower = searchTerm.toLowerCase();
        return (
            log.action?.toLowerCase().includes(searchLower) ||
            log.resource_type?.toLowerCase().includes(searchLower) ||
            log.username?.toLowerCase().includes(searchLower) ||
            log.user_email?.toLowerCase().includes(searchLower) ||
            log.ip_address?.toLowerCase().includes(searchLower)
        );
    });

    // Group logs by date
    const groupedLogs = filteredLogs.reduce((groups: any, log: AuditLog) => {
        const date = new Date(log.created_at).toLocaleDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
        return groups;
    }, {});

    const dates = Object.keys(groupedLogs).sort((a, b) =>
        new Date(b).getTime() - new Date(a).getTime()
    );

    const totalPages = Math.ceil(totalLogs / logsPerPage);

    const getActionBadgeColor = (action: string) => {
        if (action?.includes('create')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        if (action?.includes('update')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        if (action?.includes('delete')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        if (action?.includes('login')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    const getRoleBadgeColor = (role: string) => {
        if (role === 'superadmin') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        if (role === 'admin') return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    if (loading) {
        return <div className="text-center py-10">{t.common.loadingData}</div>;
    }

    return (
        <div className="space-y-4">
            {/* Statistics Cards */}
            {showStats && stats && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.auditLogs?.today || "Today"}</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.logs_today}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.auditLogs?.thisWeek || "This Week"}</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.logs_this_week}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.auditLogs?.thisMonth || "This Month"}</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.logs_this_month}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.auditLogs?.total || "Total"}</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_logs}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                {t.auditLogs.title}
                            </CardTitle>
                            <CardDescription>{t.auditLogs.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowStats(!showStats)}
                            >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                {showStats ? (t.auditLogs?.hideStats || "Hide Stats") : (t.auditLogs?.showStats || "Show Stats")}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="h-4 w-4 mr-2" />
                                {t.auditLogs?.filters || "Filters"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCSV}
                                disabled={exporting}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {exporting ? (t.auditLogs?.exporting || "Exporting...") : (t.auditLogs?.exportCSV || "Export CSV")}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadLogs}
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="mt-4 p-4 border rounded-lg space-y-4 bg-muted/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">{t.auditLogs?.startDate || "Start Date"}</label>
                                    <Input
                                        type="date"
                                        value={filters.start_date}
                                        onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">{t.auditLogs?.endDate || "End Date"}</label>
                                    <Input
                                        type="date"
                                        value={filters.end_date}
                                        onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">{t.auditLogs?.action || "Action"}</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={filters.action}
                                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                                    >
                                        <option value="">{t.auditLogs?.allActions || "All Actions"}</option>
                                        <option value="create_user">Create User</option>
                                        <option value="update_user">Update User</option>
                                        <option value="delete_user">Delete User</option>
                                        <option value="create_server">Create Server</option>
                                        <option value="update_server">Update Server</option>
                                        <option value="delete_server">Delete Server</option>
                                        <option value="login">Login</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                                    <X className="h-4 w-4 mr-2" />
                                    {t.auditLogs?.clearFilters || "Clear"}
                                </Button>
                                <Button size="sm" onClick={handleApplyFilters}>
                                    <Filter className="h-4 w-4 mr-2" />
                                    {t.auditLogs?.applyFilters || "Apply Filters"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative mt-4">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t.auditLogs.search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredLogs.length > 0 ? (
                        <>
                            <div className="space-y-6">
                                {dates.map((date) => (
                                    <div key={date}>
                                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            {date}
                                        </h3>
                                        <div className="space-y-2 ml-6">
                                            {groupedLogs[date].map((log: AuditLog) => (
                                                <div
                                                    key={log.id}
                                                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(log.action)}`}>
                                                                {log.action}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {t.auditLogs.on} {log.resource_type}
                                                            </span>
                                                            {log.user_role && (
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(log.user_role)}`}>
                                                                    {log.user_role}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <User className="h-3 w-3 text-muted-foreground" />
                                                            <span className="font-medium">{log.username}</span>
                                                            {log.user_email && (
                                                                <span className="text-muted-foreground">({log.user_email})</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {log.ip_address && `${t.auditLogs.ip}: ${log.ip_address}`}
                                                            {log.resource_id && ` • Resource ID: ${log.resource_id}`}
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
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-4">
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
                                        {t.auditLogs.page} {currentPage} {t.auditLogs.of} {totalPages} • {totalLogs} {t.auditLogs?.totalRecords || "total records"}
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
        </div>
    );
}
