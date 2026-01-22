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
import { Terminal, Settings, LogOut, Monitor, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OSIcon } from "./os-icon";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [servers, setServers] = useState<Server[]>([]);
    const { openTab } = useWorkspaceStore();
    const navigate = useNavigate();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            // Toggle on Ctrl+P or Ctrl+K
            if ((e.key === "p" || e.key === "k") && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
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
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Servers">
                    {servers.map(server => (
                        <CommandItem key={server.id} onSelect={() => runCommand(() => openTab({
                            type: 'terminal',
                            title: server.hostname,
                            serverId: server.id.toString(),
                            server: server
                        }))}>
                            <OSIcon os={server.os_info} className="mr-2 h-4 w-4" />
                            <span className="font-medium mr-2">{server.hostname}</span>
                            <span className="text-muted-foreground text-xs">{server.ip_address}</span>
                            <CommandShortcut>SSH</CommandShortcut>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Actions">
                    <CommandItem onSelect={() => runCommand(() => window.location.reload())}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        <span>Reload Window</span>
                        <CommandShortcut>F5</CommandShortcut>
                    </CommandItem>
                    {/* 
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          */}
                    <CommandItem onSelect={() => runCommand(() => {
                        localStorage.removeItem('token');
                        navigate('/login');
                    })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log Out</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
