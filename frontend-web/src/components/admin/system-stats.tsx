"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface SystemStatsProps {
    stats: any;
}

export function SystemStats({ stats }: SystemStatsProps) {
    const { t } = useI18n();

    if (!stats) {
        return <div>{t.systemStats.loading}</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {t.systemStats.title}
                </CardTitle>
                <CardDescription>{t.systemStats.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <h3 className="font-medium">{t.systemStats.resources}</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{t.systemStats.totalUsers}:</span>
                                <span className="font-medium">{stats.total_users}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{t.systemStats.totalServers}:</span>
                                <span className="font-medium">{stats.total_servers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{t.systemStats.totalGroups}:</span>
                                <span className="font-medium">{stats.total_groups}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">{t.systemStats.activity}</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{t.systemStats.totalOperations}:</span>
                                <span className="font-medium">{stats.total_operations}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <Activity className="h-4 w-4" />
                                <span>{t.systemStats.operational}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
