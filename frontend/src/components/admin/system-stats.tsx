"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp } from "lucide-react";

interface SystemStatsProps {
    stats: any;
}

export function SystemStats({ stats }: SystemStatsProps) {
    if (!stats) {
        return <div>Loading statistics...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Statistics
                </CardTitle>
                <CardDescription>Overview of system usage and activity</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <h3 className="font-medium">Resources</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Users:</span>
                                <span className="font-medium">{stats.total_users}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Servers:</span>
                                <span className="font-medium">{stats.total_servers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Groups:</span>
                                <span className="font-medium">{stats.total_groups}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">Activity</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Operations:</span>
                                <span className="font-medium">{stats.total_operations}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <TrendingUp className="h-4 w-4" />
                                <span>System operational</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
