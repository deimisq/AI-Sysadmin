import { LogOut, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useWorkspaceStore } from '../../stores/workspaceStore';

const MENU_ITEMS = [
    { label: 'Dashboard', type: 'dashboard' },
    { label: 'Informes', type: 'reports' },
    { label: 'Docs', type: 'docs' },
    { label: 'Perfil', type: 'profile' },
    { label: 'Admin', type: 'admin' },
    { label: 'Ajustes', type: 'settings' },
    { label: 'Ayuda', type: 'help' }
];

export function TopBar() {
    const { setActiveOverlay, activeOverlay } = useWorkspaceStore();

    // TODO: Read real user from Auth Context or LocalStorage
    const user = { name: 'Admin User', email: 'admin@sentrait.com' };

    const handleMenuClick = (type: string) => {
        if (activeOverlay === type) {
            setActiveOverlay(null);
        } else {
            setActiveOverlay(type as any);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.hash = '#/login';
        window.location.reload();
    };

    return (
        <div className="h-10 bg-[#333333] border-b border-[#1e1e1e] flex items-center justify-between px-4 select-none shrink-0 z-50">
            {/* Logo + Menu */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-blue-400 font-bold cursor-pointer" onClick={() => setActiveOverlay(null)}>
                    {/* SVG Logo Placeholder */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                        <path d="M8.5 8.5v.01" />
                        <path d="M16 16v.01" />
                        <path d="M12 12v.01" />
                    </svg>
                    <span className="text-sm tracking-tight">AI Sysadmin Agent</span>
                </div>

                <div className="flex items-center gap-5 text-xs text-[#cccccc]">
                    {MENU_ITEMS.map(item => (
                        <button
                            key={item.label}
                            onClick={() => handleMenuClick(item.type)}
                            className={`
                                transition-colors focus:outline-none px-2 py-1 rounded
                                ${activeOverlay === item.type ? 'bg-[#555] text-white font-medium' : 'hover:text-white hover:bg-[#444]'}
                            `}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:bg-[#444] rounded px-2 py-1 transition-colors cursor-pointer border-none">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-xs text-white shadow-sm">
                            {user.name.charAt(0)}
                        </div>
                        <div className="text-xs text-right hidden sm:block">
                            <div className="text-white font-medium leading-tight">{user.name}</div>
                            <div className="text-[10px] text-gray-400 leading-tight">{user.email}</div>
                        </div>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-[#252526] border-[#444] text-[#cccccc]">
                        <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-[#333] cursor-pointer focus:bg-[#333] focus:text-red-300">
                            <LogOut className="w-4 h-4 mr-2" />
                            Cerrar Sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
