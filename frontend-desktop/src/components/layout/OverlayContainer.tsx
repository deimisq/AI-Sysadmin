import { X, LayoutDashboard } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DashboardView } from '../views/DashboardView';
import { ReportsView } from '../views/ReportsView';
import { DocsView } from '../views/DocsView';
import { ProfileView } from '../views/ProfileView';
import { AdminView } from '../views/AdminView';
import { SettingsView } from '../views/SettingsView';
import { HelpView } from '../views/HelpView';

export function OverlayContainer() {
    const { activeOverlay, setActiveOverlay } = useWorkspaceStore();

    if (!activeOverlay) return null;

    let Content: React.ReactNode = null;
    let title = "";

    switch (activeOverlay) {
        case 'dashboard':
            Content = <div className="h-full"><DashboardView /></div>;
            title = "Dashboard";
            break;
        case 'reports':
            Content = <div className="h-full"><ReportsView /></div>;
            title = "Informes";
            break;
        case 'documentation':
            Content = <div className="h-full"><DocsView /></div>;
            title = "Documentación";
            break;
        case 'profile':
            Content = <div className="h-full"><ProfileView /></div>;
            title = "Perfil";
            break;
        case 'admin':
            Content = <div className="h-full"><AdminView /></div>;
            title = "Administración";
            break;
        case 'settings':
            Content = <div className="h-full"><SettingsView /></div>;
            title = "Ajustes";
            break;
        case 'help':
            Content = <div className="h-full"><HelpView /></div>;
            title = "Ayuda";
            break;
        default:
            return null;
    }

    return (
        <div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
            {/* Modal Window */}
            <div className="bg-[#1e1e1e] border border-[#333] w-full h-full max-w-7xl max-h-[95vh] shadow-2xl rounded-lg flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#252526] shrink-0">
                    <div className="flex items-center gap-2">
                        {activeOverlay === 'dashboard' && <LayoutDashboard className="w-5 h-5 text-blue-400" />}
                        <h2 className="text-lg font-semibold text-white tracking-wide">{title}</h2>
                    </div>
                    <button
                        onClick={() => setActiveOverlay(null)}
                        className="p-1.5 hover:bg-[#c42b1c] rounded text-gray-400 hover:text-white transition-colors"
                        title="Close (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-[#1e1e1e] relative">
                    {/* Add a specific class to scope Dashboard CSS if needed */}
                    <div className="min-h-full dashboard-overlay-wrapper">
                        {Content}
                    </div>
                </div>
            </div>
        </div>
    );
}
