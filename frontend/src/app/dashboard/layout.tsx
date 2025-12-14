"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
    LayoutDashboard,
    Server,
    Shield,
    User,
    LogOut,
    Settings,
    Activity
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { removeAuthToken } from "@/utils/auth";
import { useI18n } from "@/lib/i18n-context";
import { useState, useEffect } from "react";
import { fetchCurrentUser } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useI18n();
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        // Load user for sidebar role checks
        fetchCurrentUser().then(setCurrentUser).catch(() => { });
    }, []);

    const handleLogout = () => {
        removeAuthToken();
        router.push("/login");
    };

    const navItems = [
        { label: t.header.title || "Dashboard", icon: LayoutDashboard, href: "/dashboard", exact: true },
        { label: t.dashboard.profile || "Profile", icon: User, href: "/profile" },
    ];

    if (currentUser && ["superadmin", "admin"].includes(currentUser.role)) {
        navItems.push({ label: t.dashboard.admin || "Admin", icon: Shield, href: "/admin" });
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
            <ResizablePanelGroup direction="horizontal">

                {/* Global Sidebar Panel */}
                <ResizablePanel defaultSize={15} minSize={10} maxSize={20} className="hidden md:flex flex-col border-r bg-muted/10">
                    <div className="p-4 flex flex-col h-full">
                        <div className="flex items-center gap-2 font-bold text-xl mb-6 px-2 text-primary">
                            <Activity className="h-6 w-6" />
                            <span>AI Sysadmin</span>
                        </div>

                        <ScrollArea className="flex-1 -mx-2 px-2">
                            <nav className="space-y-1">
                                {navItems.map((item, i) => {
                                    const isActive = item.exact
                                        ? pathname === item.href
                                        : pathname.startsWith(item.href);

                                    return (
                                        <Button
                                            key={i}
                                            variant={isActive ? "secondary" : "ghost"}
                                            className={`w-full justify-start ${isActive ? 'bg-secondary' : ''}`}
                                            onClick={() => router.push(item.href)}
                                        >
                                            <item.icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                        </Button>
                                    );
                                })}
                            </nav>

                            <div className="h-[1px] bg-border my-4" />

                            {/* Server Quick List could go here */}
                            <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Settings
                            </div>
                            <div className="flex items-center gap-2 px-2 mb-4">
                                <ThemeSwitcher />
                                <LanguageSwitcher />
                            </div>
                        </ScrollArea>

                        <div className="mt-auto pt-4 border-t">
                            {currentUser && (
                                <div className="mb-4 px-2">
                                    <p className="text-sm font-medium">{currentUser.full_name || currentUser.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                                </div>
                            )}
                            <Button
                                variant="destructive"
                                className="w-full justify-start"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                {t.dashboard.logout || "Logout"}
                            </Button>
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="hidden md:flex" />

                {/* Main Content Area */}
                <ResizablePanel defaultSize={85}>
                    <main className="h-full w-full overflow-hidden bg-background">
                        {children}
                    </main>
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
    );
}
