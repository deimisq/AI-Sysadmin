import { uiText, uiFormat } from '../../lib/ui-language';
import { QuickConnect } from './QuickConnect';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';

export function IdeMenu() {
    const state = useWorkspaceStore();
    const menus = [
        { label: uiText('Archivo'), items: [
            { label: uiText('Nueva conexión…'), action: () => state.requestExplorerAction('add-server') },
            { label: uiText('Nueva carpeta…'), action: () => state.requestExplorerAction('add-folder') },
            { label: uiText('Configuración…'), action: () => state.setActiveOverlay('settings') },
        ] },
        { label: uiText('Conexiones'), items: [
            { label: uiText('Exportar / importar conexiones…'), action: () => state.openPreferences('backups') },
            { label: uiText('Catálogo de conexiones'), action: () => state.setActiveOverlay('catalog') },
            { label: uiText('Buscar conexión…'), action: () => window.dispatchEvent(new Event('workspace-command-palette')) },
            { label: uiText('Buscar en el árbol'), action: () => state.requestExplorerAction('search') },
        ] },
        { label: uiText('Ver'), items: [
            { label: uiFormat("{0} explorador", state.sidebarVisible ? uiText('Ocultar') : uiText('Mostrar')), action: state.toggleSidebar },
            { label: uiFormat("{0} acompañante IA", state.aiPanelVisible ? uiText('Ocultar') : uiText('Mostrar')), action: state.toggleAIPanel },
            { label: uiFormat("{0} panel inferior", state.toolsVisible ? uiText('Ocultar') : uiText('Mostrar')), action: state.toggleTools },
        ] },
        { label: uiText('Herramientas'), items: [
            { label: uiText('Inteligencia artificial…'), action: () => state.openPreferences('ai') },
            { label: uiText('Contexto y registros…'), action: () => state.openPreferences('context') },
            { label: uiText('Copias de seguridad…'), action: () => state.openPreferences('backups') },
        ] },
        { label: uiText('Ayuda'), items: [
            { label: uiText('Apoyar el proyecto · Sentra IT'), action: () => state.setActiveOverlay('help') },
            { label: uiText('Documentación'), action: () => state.setActiveOverlay('documentation') },
            { label: uiText('Ayuda de la aplicación'), action: () => state.setActiveOverlay('help') },
        ] },
    ];
    return <div className="ide-menubar" role="group" aria-label={uiText("Menús de aplicación")}>
        <span className="ide-brand"><img src="/brand/icon.png" alt="" width="22" height="22" />AI Sysadmin</span>
        {menus.map(menu => <DropdownMenu key={menu.label}><DropdownMenuTrigger className="ide-menu-trigger">{menu.label}</DropdownMenuTrigger><DropdownMenuContent className="bg-[#252526] text-gray-200 border-[#454545] min-w-56">
            {menu.items.map(item => <DropdownMenuItem key={item.label} onClick={item.action}>{item.label}</DropdownMenuItem>)}
            {menu.label === uiText('Archivo') && state.activeTabId && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => state.closeTab(state.activeTabId!)}>{uiText("Cerrar sesión seleccionada")}</DropdownMenuItem></>}
        </DropdownMenuContent></DropdownMenu>)}
        <QuickConnect />
        <button className="ml-auto text-[11px] text-gray-400 px-3 hover:text-white" onClick={() => window.dispatchEvent(new Event('workspace-command-palette'))}>{uiText("Buscar · Ctrl+Shift+P")}</button>
    </div>;
}
