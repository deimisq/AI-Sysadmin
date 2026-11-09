import { X, LayoutDashboard } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DashboardView } from '../views/DashboardView';
import { ReportsView } from '../views/ReportsView';
import { DocsView } from '../views/DocsView';
import { ProfileView } from '../views/ProfileView';
import { AdminView } from '../views/AdminView';
import { SettingsView } from '../views/SettingsView';
import { HelpView } from '../views/HelpView';
import { ConnectionCatalog } from './ConnectionCatalog';

export function OverlayContainer() {
    const { activeOverlay, setActiveOverlay } = useWorkspaceStore();

    if (!activeOverlay) return null;
    if (activeOverlay === 'settings') return <div className="absolute inset-0 z-[100] bg-[#202020]"><SettingsView /></div>;

    let Content: React.ReactNode = null;
    let title = "";

    switch (activeOverlay) {
        case 'catalog':
            Content = <div className="h-full"><ConnectionCatalog /></div>;
            title = 'Catálogo de conexiones';
            break;
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
        case 'help':
            Content = <div className="h-full"><HelpView /></div>;
            title = "Ayuda";
            break;
        default:
            return null;
    }

    return (
        <div className="absolute inset-0 z-[100] bg-[#1c1f26] flex animate-in fade-in duration-150">
            {/* Modal Window */}
            <div className="bg-[#1c1f26] w-full h-full flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#252526] shrink-0">
                    <div className="flex items-center gap-2">
                        {activeOverlay === 'dashboard' && <LayoutDashboard className="w-5 h-5 text-blue-400" />}
                        <h2 className="text-lg font-semibold text-white tracking-wide">{title}</h2>
                    </div>
                    <button
                        onClick={() => setActiveOverlay(null)}
                        className="p-1.5 hover:bg-[#c42b1c] rounded text-gray-400 hover:text-white transition-colors"
                        title="Volver al espacio de conexiones"
                        aria-label={`Cerrar ${title} y volver a las sesiones`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-[#1e1e1e] relative">
                    {/* Add a specific class to scope Dashboard CSS if needed */}
                    <div className="h-full dashboard-overlay-wrapper">
                        {Content}
                    </div>
                </div>
            </div>
        </div>
    );
}
