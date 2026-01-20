import { useState, useEffect } from "react";
import { AdminTabs } from "@/components/admin-layout";
import { UserManagement } from "@/components/admin/user-management";
import { ServerManagement } from "@/components/admin/server-management";
import { AIParameters } from "@/components/admin/ai-parameters";
import { SystemStats } from "@/components/admin/system-stats";
import { ScheduledReports } from "@/components/admin/scheduled-reports";
import { SecuritySettings } from "@/components/admin/security-settings";
import { NotificationPreferences } from "@/components/admin/notification-preferences";
import { CommunicationSettings } from "@/components/admin/communication-settings";
import { FrontendParameters } from "@/components/admin/frontend-parameters";
import { BackendParameters } from "@/components/admin/backend-parameters";
import { AuditLogs } from "@/components/admin/audit-logs";
import { OrganizationManagement } from "@/components/admin/organization-management";
import { fetchCurrentUser } from "@/lib/api";
import { fetch } from '@tauri-apps/plugin-http';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export function AdminView() {
    const [activeTab, setActiveTab] = useState("users");
    const [stats, setStats] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        // Load current user
        const loadUser = async () => {
            try {
                const user = await fetchCurrentUser();
                setCurrentUser(user);
                // If superadmin, default tab could be organizations, but lets keep users for now or check url params
            } catch (error) {
                console.error("Failed to load current user", error);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (activeTab === "stats") {
            loadStats();
        }
    }, [activeTab]);

    const loadStats = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/admin/stats`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to load stats", error);
        }
    };

    if (!currentUser) {
        return <div className="p-6">Cargando perfil de administrador...</div>;
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
                    <p className="text-muted-foreground">
                        Configura y gestiona el sistema
                    </p>
                </div>

                {/* Tabs */}
                <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} />

                {/* Tab Content */}
                {activeTab === "organizations" && <OrganizationManagement />}

                {activeTab === "users" && <UserManagement currentUser={currentUser} />}
                {activeTab === "groups" && <GroupManagement currentUser={currentUser} />}
                {activeTab === "servers" && <ServerManagement currentUser={currentUser} />}

                {activeTab === "ai" && <AIParameters />}

                {activeTab === "stats" && stats && <SystemStats stats={stats} />}

                {activeTab === "scheduled" && <ScheduledReports />}

                {activeTab === "audit-logs" && <AuditLogs />}

                {activeTab === "security" && <SecuritySettings />}

                {activeTab === "notifications" && <NotificationPreferences currentUser={currentUser} />}

                {activeTab === "communication" && <CommunicationSettings />}

                {activeTab === "frontend" && <FrontendParameters />}

                {activeTab === "backend" && <BackendParameters />}
            </div>
        </div>
    );
}
