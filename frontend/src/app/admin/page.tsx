"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCurrentUser, fetchSystemStats } from "@/lib/api";
import { Shield, Users, Server, FolderOpen, Activity, ArrowLeft } from "lucide-react";
import { UserManagement } from "@/components/admin/user-management";
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
                    <TabsList>
                        <TabsTrigger value="users">
                            <Users className="mr-2 h-4 w-4" />
                            Users
                        </TabsTrigger>
                        <TabsTrigger value="stats">
                            <Activity className="mr-2 h-4 w-4" />
                            Statistics
                        </TabsTrigger>
                        <TabsTrigger value="audit">
                            <Shield className="mr-2 h-4 w-4" />
                            Audit Logs
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users" className="space-y-4">
                        <UserManagement currentUser={currentUser} />
                    </TabsContent>

                    <TabsContent value="stats" className="space-y-4">
                        <SystemStats stats={stats} />
                    </TabsContent>

                    <TabsContent value="audit" className="space-y-4">
                        <AuditLogs />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}
