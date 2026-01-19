import { X, LayoutDashboard } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DashboardView } from '../views/DashboardView';

export function OverlayContainer() {
    const { activeOverlay, setActiveOverlay } = useWorkspaceStore();

    if (!activeOverlay) return null;

    let Content: React.ReactNode = null;
    let title = "";

    switch (activeOverlay) {
        case 'dashboard':
            // Renders Dashboard View (without Layout)
            Content = <div className="h-full"><DashboardView /></div>;
            title = "Dashboard";
            break;
        case 'settings':
            Content = <div className="p-10 text-[#ccc]">
                <h3 className="text-xl font-bold mb-4">Ajustes de la Aplicación</h3>
                <p>Configuración de apariencia, idioma y conexiones.</p>
            </div>;
            title = "Ajustes";
            break;
        case 'profile':
            title = "Perfil de Usuario";
            Content = <div className="p-10 text-[#ccc]">
                <h3 className="text-xl font-bold mb-4">Admin User</h3>
                <p>admin@sentrait.com</p>
                <button className="mt-4 px-4 py-2 bg-red-600 rounded text-white">Cerrar Sesión</button>
            </div>;
            break;
        case 'reports':
            title = "Informes";
            Content = <div className="p-10 text-[#ccc]">Módulo de Informes en construcción.</div>;
            break;
        default:
            title = activeOverlay.charAt(0).toUpperCase() + activeOverlay.slice(1);
            Content = <div className="p-10 text-[#ccc]">Sección {title} en construcción.</div>;
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
