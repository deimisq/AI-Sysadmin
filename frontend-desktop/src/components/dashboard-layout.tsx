import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    LogOut,
    Activity,
    Menu,
    Calendar,
    Book,
    User,
    Shield
} from "lucide-react";

// Removed Resizable imports
// import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { VersionNotification } from "@/components/version-notification";
import { fetchCurrentUser, removeAuthToken } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        fetchCurrentUser()
            .then(setCurrentUser)
            .catch((err) => {
                console.error("Failed to fetch user", err);
                // If credentials error, redirect to login
                const errorMsg = err?.message || String(err);
                if (errorMsg.includes('credentials') || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                    console.log('Auth error in layout, redirecting to login...');
                    localStorage.removeItem('token');
                    navigate('/login');
                }
            });
    }, [navigate]);

    const handleLogout = () => {
        removeAuthToken();
        navigate("/login");
    };

    const navItems = [
        { label: "Agente IA Sysadmin", icon: LayoutDashboard, href: "/", exact: true },
        { label: "Informes Programados", icon: Calendar, href: "/scheduled-reports" },
        { label: "Documentación", icon: Book, href: "/documentation" },
        { label: "Perfil", icon: User, href: "/profile" },
        { label: "Admin", icon: Shield, href: "/admin" },
    ];

    const handleNavClick = (href: string) => {
        console.log('Navigation clicked:', href);
        navigate(href);
        setMobileMenuOpen(false);
    };

    const SidebarContent = () => (
        <>
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
                                onClick={() => handleNavClick(item.href)}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        );
                    })}
                </nav>

                <div className="mt-8 px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    SETTINGS
                </div>
                <div className="flex items-center gap-2 px-2 mb-4">
                    <ThemeSwitcher />
                    <Button variant="outline" size="icon" title="Language">
                        <span className="text-xs">ES</span>
                    </Button>
                </div>
            </ScrollArea>

            <div className="mt-auto pt-4 border-t">
                {currentUser && (
                    <div className="mb-4 px-2">
                        <p className="text-sm font-medium">{currentUser?.full_name || currentUser?.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                    </div>
                )}
                <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                </Button>
            </div>
        </>
    );

    return (
        <div className="h-screen w-screen overflow-hidden bg-background text-foreground animate-in fade-in">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2 font-bold text-lg text-primary">
                    <Activity className="h-5 w-5" />
                    <span>AI Sysadmin</span>
                </div>
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-4 flex flex-col">
                        <SheetTitle className="sr-only">Menu</SheetTitle>
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex h-full">
                <aside className="w-64 flex flex-col border-r bg-muted/10 shrink-0">
                    <div className="flex flex-col h-full p-4">
                        <SidebarContent />
                    </div>
                </aside>

                <main className="flex-1 overflow-hidden bg-background">
                    {children}
                </main>
            </div>

            {/* Mobile Content */}
            <div className="md:hidden h-[calc(100vh-65px)] overflow-auto bg-background">
                {children}
            </div>

            {/* Version Update Notification (shown globally) */}
            <VersionNotification />
        </div>
    );
}
