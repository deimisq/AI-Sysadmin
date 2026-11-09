import { useEffect, useState } from "react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "./ui/command";
import { fetchServers, type Server } from "../lib/api";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { Settings, Sparkles, FolderPlus, Plus } from "lucide-react";
import { OSIcon } from "./os-icon";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [servers, setServers] = useState<Server[]>([]);
    const { openTab } = useWorkspaceStore();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'p' && e.shiftKey && !e.altKey && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        const show = () => setOpen(true);
        window.addEventListener('workspace-command-palette', show);
        return () => { document.removeEventListener("keydown", down); window.removeEventListener('workspace-command-palette', show); };
    }, []);

    useEffect(() => {
        if (open) {
            fetchServers().then(setServers).catch(console.error);
        }
    }, [open]);

    const runCommand = (command: () => void) => {
        setOpen(false)
        command()
    }

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Buscar conexión por nombre, dirección o acción…" />
            <CommandList>
                <CommandEmpty>No se encontraron conexiones ni acciones.</CommandEmpty>

                <CommandGroup heading="Conexiones">
                    {servers.map(server => (
                        <CommandItem key={server.id} value={`${server.hostname} ${server.ip_address} ${server.id}`} onSelect={() => runCommand(() => openTab({
                            type: 'terminal',
                            title: server.hostname,
                            serverId: server.id.toString(),
                            server: server
                        }))}>
                            <OSIcon os={server.os_info} className="mr-2 h-4 w-4" />
                            <span className="font-medium mr-2">{server.hostname}</span>
                            <span className="text-muted-foreground text-xs">{server.ip_address}</span>
                            <CommandShortcut>{server.connection_protocol === 'rdp' || (!server.connection_protocol && (server.os_type || server.os_info)?.toLowerCase().includes('windows')) ? 'RDP' : 'SSH'}</CommandShortcut>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Acciones">
                    <CommandItem onSelect={() => runCommand(() => useWorkspaceStore.getState().requestExplorerAction('add-server'))}><Plus className="mr-2 h-4 w-4" />Nueva conexión</CommandItem>
                    <CommandItem onSelect={() => runCommand(() => useWorkspaceStore.getState().requestExplorerAction('add-folder'))}><FolderPlus className="mr-2 h-4 w-4" />Nueva carpeta de cliente o entorno</CommandItem>
                    <CommandItem onSelect={() => runCommand(() => useWorkspaceStore.getState().toggleAIPanel())}><Sparkles className="mr-2 h-4 w-4" />Mostrar u ocultar acompañante IA</CommandItem>
                    <CommandItem onSelect={() => runCommand(() => useWorkspaceStore.getState().setActiveOverlay('settings'))}><Settings className="mr-2 h-4 w-4" />Ajustes de la aplicación</CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
