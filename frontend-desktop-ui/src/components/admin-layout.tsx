
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Server, Shield, Settings, Activity, Bell, Code, Mail, FileText, Building2, Folder, UserPlus } from "lucide-react";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    );
}

interface TabButtonProps {
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick: () => void;
}

function TabButton({ icon: Icon, label, active, onClick }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
                }`}
        >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{label}</span>
        </button>
    );
}

const tabs = [
    { id: "users", label: "Usuarios", icon: Users },
    { id: "invitations", label: "Invitaciones", icon: UserPlus },
    { id: "groups", label: "Grupos", icon: Folder },
    { id: "servers", label: "Servidores", icon: Server },
    { id: "ai", label: "Parámetros IA", icon: Settings },
    { id: "stats", label: "Estadísticas", icon: Activity },
    { id: "scheduled", label: "Reportes", icon: FileText },
    { id: "audit-logs", label: "Auditoría", icon: Shield },
    { id: "security", label: "Seguridad", icon: Shield },
    { id: "notifications", label: "Notificaciones", icon: Bell },
    { id: "communication", label: "Comunicaciones", icon: Mail },
    { id: "frontend", label: "Frontend", icon: Code },
    { id: "backend", label: "Backend", icon: Server },
];

interface AdminTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    currentUser?: any;
}

export function AdminTabs({ activeTab, onTabChange, currentUser }: AdminTabsProps) {
    const visibleTabs = [...tabs];

    // Insert Organizations tab at the beginning if superadmin
    if (currentUser?.role === 'superadmin') {
        // Check if already exists to avoid duplicates if re-rendered
        if (!visibleTabs.some(t => t.id === "organizations")) {
            visibleTabs.unshift({ id: "organizations", label: "Organizaciones", icon: Building2 });
        }
    }

    return (
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                    {visibleTabs.map((tab) => (
                        <TabButton
                            key={tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            active={activeTab === tab.id}
                            onClick={() => onTabChange(tab.id)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
