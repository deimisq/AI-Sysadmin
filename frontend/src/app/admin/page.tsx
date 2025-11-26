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
import { AIParameters } from "@/components/admin/ai-parameters";
import { BackendParameters } from "@/components/admin/backend-parameters";
import { FrontendParameters } from "@/components/admin/frontend-parameters";
import { CommunicationSettings } from "@/components/admin/communication-settings";
import { SecuritySettings } from "@/components/admin/security-settings";
import NotificationPreferences from "@/components/admin/notification-preferences";
import { SystemStats } from "@/components/admin/system-stats";
import { AuditLogs } from "@/components/admin/audit-logs";

import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Footer } from "@/components/footer";

export default function AdminPage() {
    const router = useRouter();
    const { t } = useI18n();
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
                    <p className="mt-4 text-muted-foreground">{t.common.loading}</p>
                </div>
            </div>
        );
    }

    if (!currentUser || !["superadmin", "admin"].includes(currentUser.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t.admin.accessDenied}</CardTitle>
                        <CardDescription>{t.admin.accessDeniedMsg}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push("/dashboard")}>
                            {t.admin.returnDashboard}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1 bg-background p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-6">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={() => router.push("/dashboard")}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t.admin.dashboard}
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-2">
                                    <Shield className="h-8 w-8 text-primary" />
                                    {t.admin.title}
                                </h1>
                                <p className="text-muted-foreground">{t.admin.subtitle}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <ThemeSwitcher />
                            <LanguageSwitcher />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    {stats && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{t.admin.totalUsers}</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.total_users}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{t.admin.totalServers}</CardTitle>
                                    <Server className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.total_servers}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{t.admin.totalGroups}</CardTitle>
                                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.total_groups}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{t.admin.operations}</CardTitle>
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
                                {t.admin.tabs.users}
                            </TabsTrigger>
                            <TabsTrigger value="servers">
                                <Server className="mr-2 h-4 w-4" />
                                {t.admin.tabs.servers}
                            </TabsTrigger>
                            <TabsTrigger value="logs">
                                <Activity className="mr-2 h-4 w-4" />
                                {t.admin.tabs.logs}
                            </TabsTrigger>
                            <TabsTrigger value="ai-params">
                                <Shield className="mr-2 h-4 w-4" />
                                {t.admin.tabs.aiParams}
                            </TabsTrigger>
                            <TabsTrigger value="backend-params">
                                <FolderOpen className="mr-2 h-4 w-4" />
                                {t.admin.tabs.backendParams}
                            </TabsTrigger>
                            <TabsTrigger value="frontend-params">
                                <FolderOpen className="mr-2 h-4 w-4" />
                                {t.admin.tabs.frontendParams}
                            </TabsTrigger>
                            <TabsTrigger value="security">
                                <Shield className="mr-2 h-4 w-4" />
                                {t.admin.tabs.security}
                            </TabsTrigger>
                            <TabsTrigger value="communication">
                                <Activity className="mr-2 h-4 w-4" />
                                {t.admin.tabs.communication}
                            </TabsTrigger>
                            <TabsTrigger value="notifications">
                                <Activity className="mr-2 h-4 w-4" />
                                {t.admin.tabs.notifications}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="users" className="space-y-4">
                            <UserManagement currentUser={currentUser} />
                        </TabsContent>

                        <TabsContent value="servers" className="space-y-4">
                            <ServerManagement />
                        </TabsContent>

                        <TabsContent value="logs" className="space-y-4">
                            <AuditLogs />
                        </TabsContent>

                        <TabsContent value="ai-params" className="space-y-4">
                            <AIParameters />
                        </TabsContent>

                        <TabsContent value="backend-params" className="space-y-4">
                            <BackendParameters />
                        </TabsContent>

                        <TabsContent value="frontend-params" className="space-y-4">
                            <FrontendParameters />
                        </TabsContent>

                        <TabsContent value="security" className="space-y-4">
                            <SecuritySettings />
                        </TabsContent>

                        <TabsContent value="communication" className="space-y-4">
                            <CommunicationSettings />
                        </TabsContent>

                        <TabsContent value="notifications" className="space-y-4">
                            <NotificationPreferences currentUser={currentUser} />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer />
        </div>
    );
}
