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
    Shield,
    ChevronLeft,
    ChevronRight,
    MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { VersionNotification } from "@/components/version-notification";
import { fetchCurrentUser, removeAuthToken } from "@/lib/api";
import { AiAssistantPanel } from "./ai-assistant-panel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Sidebar States
    const [leftOpen, setLeftOpen] = useState(true); // Default visible
    const [rightOpen, setRightOpen] = useState(false); // Default hidden

    // Auto-toggle AI Panel based on route
    useEffect(() => {
        // If user is in a console view, open the AI panel automatically
        if (location.pathname.includes('/console')) {
            setRightOpen(true);
        } else {
            // Otherwise close it (optional, but requested "only appears when accessing Console")
            setRightOpen(false);
        }
    }, [location.pathname]);

    useEffect(() => {
        fetchCurrentUser()
            .then(setCurrentUser)
            .catch((err) => {
                console.error("Failed to fetch user", err);
                const errorMsg = err?.message || String(err);
                if (errorMsg.includes('credentials') || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
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
        { label: "Dashboard", icon: LayoutDashboard, href: "/", exact: true },
        { label: "Informes", icon: Calendar, href: "/scheduled-reports" },
        { label: "Docs", icon: Book, href: "/documentation" },
        { label: "Perfil", icon: User, href: "/profile" },
        { label: "Admin", icon: Shield, href: "/admin" },
    ];

    const handleNavClick = (href: string) => {
        navigate(href);
        setMobileMenuOpen(false);
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full min-w-[16rem]">
            <div className="flex items-center gap-2 font-bold text-xl mb-6 px-4 pt-4 text-primary">
                <Activity className="h-6 w-6" />
                <span>AI Sysadmin</span>
            </div>

            <ScrollArea className="flex-1 px-3">
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
                    AJUSTES
                </div>
                <div className="flex items-center gap-2 px-2 mb-4">
                    <ThemeSwitcher />
                </div>
            </ScrollArea>

            <div className="mt-auto p-4 border-t bg-muted/20">
                {currentUser && (
                    <div className="mb-4">
                        <p className="text-sm font-medium truncate">{currentUser?.full_name || currentUser?.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                    </div>
                )}
                <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Salir
                </Button>
            </div>
        </div>
    );

    return (
        <div className="h-screen w-screen overflow-hidden bg-background text-foreground animate-in fade-in flex flex-col md:flex-row">

            {/* Mobile Header (Only visible on small screens) */}
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-background shrink-0">
                <div className="flex items-center gap-2 font-bold text-lg text-primary">
                    <Activity className="h-5 w-5" />
                    <span>AI Sysadmin</span>
                </div>
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-0">
                        <SheetTitle className="sr-only">Menu</SheetTitle>
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Left Sidebar (Desktop) */}
            <aside
                className={`hidden md:flex flex-col border-r bg-muted/10 transition-all duration-300 relative shrink-0 ${leftOpen ? 'w-64' : 'w-0'}`}
                style={{ overflow: 'visible' }} // Allow button to overflow
            >
                <div className={`flex flex-col h-full w-64 overflow-hidden transition-opacity duration-300 ${leftOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <SidebarContent />
                </div>

                {/* Toggle Button Left */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-4 top-6 h-8 w-8 rounded-full border bg-background shadow-md z-50 hover:bg-muted"
                    onClick={() => setLeftOpen(!leftOpen)}
                    title={leftOpen ? "Colapsar menú" : "Expandir menú"}
                >
                    {leftOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="flex-1 overflow-auto bg-background p-4 relative">
                    {/* Children */}
                    {children}
                </div>

                {/* Global Notification at bottom */}
                <VersionNotification />
            </main>

            {/* Right Sidebar (AI Agent) */}
            <aside
                className={`hidden md:flex flex-col border-l bg-muted/10 transition-all duration-300 relative shrink-0 ${rightOpen ? 'w-96' : 'w-0'}`}
                style={{ overflow: 'visible' }}
            >
                <div className={`h-full w-96 overflow-hidden transition-opacity duration-300 bg-background ${rightOpen ? 'opacity-100' : 'opacity-0'}`}>
                    {rightOpen && <AiAssistantPanel />}
                </div>

                {/* Toggle Button Right */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -left-4 top-6 h-8 w-8 rounded-full border bg-background shadow-md z-50 hover:bg-muted"
                    onClick={() => setRightOpen(!rightOpen)}
                    title={rightOpen ? "Ocultar Agente" : "Mostrar Agente IA"}
                >
                    {rightOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>

                {/* Fallback Icon when closed (Optional, but user said 'opcion de ocultar', implying complete hide) */}
                {!rightOpen && (
                    <div className="absolute top-20 -left-10 hidden">
                        {/* Could put a floating icon here if desired */}
                    </div>
                )}
            </aside>

        </div>
    );
}
