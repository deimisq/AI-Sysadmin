import { QuickConnect } from './QuickConnect';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';

export function IdeMenu() {
    const state = useWorkspaceStore();
    const menus = [
        { label: 'Archivo', items: [
            { label: 'Nueva conexión…', action: () => state.requestExplorerAction('add-server') },
            { label: 'Nueva carpeta…', action: () => state.requestExplorerAction('add-folder') },
            { label: 'Configuración…', action: () => state.setActiveOverlay('settings') },
        ] },
        { label: 'Conexiones', items: [
            { label: 'Exportar / importar conexiones…', action: () => state.openPreferences('backups') },
            { label: 'Catálogo de conexiones', action: () => state.setActiveOverlay('catalog') },
            { label: 'Buscar conexión…', action: () => window.dispatchEvent(new Event('workspace-command-palette')) },
            { label: 'Buscar en el árbol', action: () => state.requestExplorerAction('search') },
        ] },
        { label: 'Ver', items: [
            { label: `${state.sidebarVisible ? 'Ocultar' : 'Mostrar'} explorador`, action: state.toggleSidebar },
            { label: `${state.aiPanelVisible ? 'Ocultar' : 'Mostrar'} acompañante IA`, action: state.toggleAIPanel },
            { label: `${state.toolsVisible ? 'Ocultar' : 'Mostrar'} panel inferior`, action: state.toggleTools },
        ] },
        { label: 'Herramientas', items: [
            { label: 'Inteligencia artificial…', action: () => state.openPreferences('ai') },
            { label: 'Contexto y registros…', action: () => state.openPreferences('context') },
            { label: 'Copias de seguridad…', action: () => state.openPreferences('backups') },
        ] },
        { label: 'Ayuda', items: [
            { label: 'Documentación', action: () => state.setActiveOverlay('documentation') },
            { label: 'Ayuda de la aplicación', action: () => state.setActiveOverlay('help') },
        ] },
    ];
    return <div className="ide-menubar" role="group" aria-label="Menús de aplicación">
        <span className="ide-brand"><img src="/brand/icon.png" alt="" width="22" height="22" />AI Sysadmin</span>
        {menus.map(menu => <DropdownMenu key={menu.label}><DropdownMenuTrigger className="ide-menu-trigger">{menu.label}</DropdownMenuTrigger><DropdownMenuContent className="bg-[#252526] text-gray-200 border-[#454545] min-w-56">
            {menu.items.map(item => <DropdownMenuItem key={item.label} onClick={item.action}>{item.label}</DropdownMenuItem>)}
            {menu.label === 'Archivo' && state.activeTabId && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => state.closeTab(state.activeTabId!)}>Cerrar sesión seleccionada</DropdownMenuItem></>}
        </DropdownMenuContent></DropdownMenu>)}
        <QuickConnect />
        <button className="ml-auto text-[11px] text-gray-400 px-3 hover:text-white" onClick={() => window.dispatchEvent(new Event('workspace-command-palette'))}>Buscar · Ctrl+Shift+P</button>
    </div>;
}
