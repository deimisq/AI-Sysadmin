import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Server, Shield, Settings, Activity, Bell, Code, Mail } from "lucide-react";

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
    { id: "system", label: "Sistema", icon: Activity },
    { id: "security", label: "Seguridad", icon: Shield },
    { id: "notifications", label: "Notificaciones", icon: Bell },
    { id: "communication", label: "Comunicaciones", icon: Mail },
    { id: "frontend", label: "Frontend", icon: Code },
    { id: "backend", label: "Backend", icon: Server },
    { id: "advanced", label: "Avanzado", icon: Settings },
];

interface AdminTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
    return (
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
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
