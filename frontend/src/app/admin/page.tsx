"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCurrentUser, fetchSystemStats } from "@/lib/api";
import { Shield, Users, Server, FolderOpen, Activity, ArrowLeft } from "lucide-react";
import { UserManagement } from "@/components/admin/user-management";
import { ServerManagement } from "@/components/admin/server-management";
import { SystemStats } from "@/components/admin/system-stats";
import { AuditLogs } from "@/components/admin/audit-logs";

export default function AdminPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await fetchCurrentUser();
            setCurrentUser(user);

            // Check if user is admin
            if (!["superadmin", "admin"].includes(user.role)) {
                router.push("/dashboard");
                return;
            }

            const statsData = await fetchSystemStats();
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load admin data", error);
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!currentUser || !["superadmin", "admin"].includes(currentUser.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>You don't have permission to access this page</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push("/dashboard")}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => router.push("/dashboard")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Dashboard
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Shield className="h-8 w-8 text-primary" />
                                System Administration
                            </h1>
                            <p className="text-muted-foreground">Manage users, permissions, and system settings</p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                {stats && (
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_users}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
                                <Server className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_servers}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
                                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_groups}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Operations</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_operations}</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Admin Tabs */}
                <Tabs defaultValue="users" className="space-y-4">
                    <TabsList className="flex flex-wrap h-auto">
                        <TabsTrigger value="users">
                            <Users className="mr-2 h-4 w-4" />
                            Users
                        </TabsTrigger>
                        <TabsTrigger value="servers">
                            <Server className="mr-2 h-4 w-4" />
                            Servers
                        </TabsTrigger>
                        <TabsTrigger value="logs">
                            <Activity className="mr-2 h-4 w-4" />
                            Logs
                        </TabsTrigger>
                        <TabsTrigger value="ai-params">
                            <Shield className="mr-2 h-4 w-4" />
                            AI Params
                        </TabsTrigger>
                        <TabsTrigger value="backend-params">
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Backend Params
                        </TabsTrigger>
                        <TabsTrigger value="frontend-params">
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Frontend Params
                        </TabsTrigger>
                        <TabsTrigger value="communication">
                            <Activity className="mr-2 h-4 w-4" />
                            Communication
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users" className="space-y-4">
                        <UserManagement currentUser={currentUser} />
                    </TabsContent>

                    <TabsContent value="servers" className="space-y-4">
                        <ServerManagement currentUser={currentUser} />
                    </TabsContent>

                    <TabsContent value="logs" className="space-y-4">
                        <AuditLogs />
                    </TabsContent>

                    <TabsContent value="ai-params" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Parameters</CardTitle>
                                <CardDescription>Configure LLM providers and settings.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">AI configuration interface coming soon (Issue #7).</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="backend-params" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Backend Parameters</CardTitle>
                                <CardDescription>Configure backend system settings.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Backend configuration interface coming soon (Issue #8).</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="frontend-params" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Frontend Parameters</CardTitle>
                                <CardDescription>Configure frontend UI settings.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Frontend configuration interface coming soon (Issue #9).</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="communication" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Communication Settings</CardTitle>
                                <CardDescription>Configure email and notification settings.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Communication settings interface coming soon (Issue #10).</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}
