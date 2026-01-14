import { useState } from "react";
import { AdminLayout, AdminTabs } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "@/components/admin/user-management";
import { SecuritySettings } from "@/components/admin/security-settings";
import { NotificationPreferences } from "@/components/admin/notification-preferences";
import { CommunicationSettings } from "@/components/admin/communication-settings";
import { FrontendParameters } from "@/components/admin/frontend-parameters";
import { BackendParameters } from "@/components/admin/backend-parameters";
import { AuditLogs } from "@/components/admin/audit-logs";
import { Activity, Construction } from "lucide-react";

export function Admin() {
    const [activeTab, setActiveTab] = useState("users");

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
                    <p className="text-muted-foreground">
                        Configura y gestiona el sistema
                    </p>
                </div>

                {/* Tabs */}
                <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Tab Content */}
                {activeTab === "users" && <UserManagement />}

                {activeTab === "system" && <SystemInfo />}

                {activeTab === "audit-logs" && <AuditLogs />}

                {activeTab === "security" && <SecuritySettings />}

                {activeTab === "notifications" && <NotificationPreferences />}

                {activeTab === "communication" && <CommunicationSettings />}

                {activeTab === "frontend" && <FrontendParameters />}

                {activeTab === "backend" && <BackendParameters />}

                {activeTab === "advanced" && <PlaceholderSection title="Configuración Avanzada" />}
            </div>
        </AdminLayout>
    );
}

function SystemInfo() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Información del Sistema
                </CardTitle>
                <CardDescription>
                    Estado y estadísticas del sistema
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Versión</p>
                        <p className="text-2xl font-bold">v1.0.0</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Entorno</p>
                        <p className="text-2xl font-bold">Production</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Base de Datos</p>
                        <p className="text-2xl font-bold text-green-600">✓ Conectada</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">API</p>
                        <p className="text-2xl font-bold text-green-600">✓ Online</p>
                    </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-medium mb-2">Estado del Sistema</h3>
                    <p className="text-sm text-muted-foreground">
                        ✅ Todos los servicios están funcionando correctamente
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

interface PlaceholderSectionProps {
    title: string;
}

function PlaceholderSection({ title }: PlaceholderSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Construction className="h-5 w-5" />
                    {title}
                </CardTitle>
                <CardDescription>
                    Esta sección estará disponible próximamente
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Construction className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">En Desarrollo</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Esta funcionalidad se está desarrollando actualmente y estará disponible en una próxima actualización.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
