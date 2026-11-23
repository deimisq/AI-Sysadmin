import { uiText } from '../../lib/ui-language';
import { Search, PanelLeft, PanelRight, Settings, Terminal, Building2, HelpCircle, BookOpen, LogOut } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { isLocalWorkspace, selectWorkspaceMode } from '../../lib/workspace-mode';
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export function WorkspaceToolbar({ isNative }: { isNative?: boolean }) {
    const { sidebarVisible, aiPanelVisible, toggleSidebar, toggleAIPanel, setActiveOverlay } = useWorkspaceStore();
    const local = isLocalWorkspace();
    return <header className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-[#30333b] bg-[#191c23] select-none">
        <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400"><Terminal size={18} /></div>
            <span className="font-semibold text-sm text-gray-100 whitespace-nowrap">AI Sysadmin</span>
            <span className="text-[11px] text-gray-400 border-l border-[#353943] pl-3 hidden xl:inline">{local ? 'Espacio personal' : uiText('Espacio de empresa')}</span>
        </div>
        <button onClick={() => window.dispatchEvent(new Event('workspace-command-palette'))}
            className="mx-auto flex items-center gap-2 h-8 px-3 rounded-md bg-[#242832] border border-[#353943] text-gray-400 hover:border-gray-500 text-xs w-full max-w-sm min-w-0"
            aria-label={uiText("Buscar conexiones y acciones (Ctrl+Shift+P)")}>
            <Search size={14} /><span className="truncate">{uiText("Buscar conexiones y acciones")}</span><kbd className="ml-auto text-[11px] whitespace-nowrap hidden lg:block">Ctrl ⇧ P</kbd>
        </button>
        {!isNative && <span className="text-[11px] text-amber-300 whitespace-nowrap">{uiText("Vista previa")}</span>}
        <div className="flex items-center gap-1">
            <button aria-label="Mostrar u ocultar conexiones" aria-pressed={sidebarVisible} title={uiText("Conexiones · Ctrl+Alt+B")} onClick={toggleSidebar} className="workspace-tool"><PanelLeft size={17} /></button>
            <button aria-label={uiText("Mostrar u ocultar acompañante IA")} aria-pressed={aiPanelVisible} title={uiText("Acompañante IA · Ctrl+Alt+I")} onClick={toggleAIPanel} className="workspace-tool"><PanelRight size={17} /></button>
            <DropdownMenu>
                <DropdownMenuTrigger className="workspace-tool" aria-label="Opciones del espacio de trabajo"><Settings size={17} /></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#242832] border-[#353943] text-gray-200">
                    <DropdownMenuItem onClick={() => setActiveOverlay('settings')}><Settings size={15} className="mr-2" />{uiText("Ajustes")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveOverlay('documentation')}><BookOpen size={15} className="mr-2" />{uiText("Documentación")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveOverlay('help')}><HelpCircle size={15} className="mr-2" />{uiText("Ayuda")}</DropdownMenuItem>
                    {!local && <><DropdownMenuItem onClick={() => setActiveOverlay('admin')}><Building2 size={15} className="mr-2" />{uiText("Administración")}</DropdownMenuItem><DropdownMenuItem onClick={() => setActiveOverlay('profile')}>{uiText("Mi perfil")}</DropdownMenuItem><DropdownMenuItem onClick={() => setActiveOverlay('reports')}>{uiText("Informes")}</DropdownMenuItem></>}
                    <DropdownMenuItem onClick={async () => {
                        if (!await confirmDialog(uiText('Cambiar de espacio cerrará las conexiones de esta ventana. ¿Continuar?'))) return;
                        selectWorkspaceMode('enterprise'); localStorage.removeItem('token'); window.location.hash = '#/login'; window.location.reload();
                    }}><LogOut size={15} className="mr-2" />{local ? uiText('Acceder a empresa') : uiText('Cerrar sesión')}</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </header>;
}
