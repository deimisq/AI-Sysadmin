import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TerminalComponent from '../components/terminal';
import { fetchServer, executeCommand, type Server } from '../lib/api';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function ServerConsole() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [server, setServer] = useState<Server | null>(null);

    useEffect(() => {
        if (!id) return;
        fetchServer(id).then(setServer).catch(console.error);
    }, [id]);

    const handleCommand = async (cmd: string) => {
        if (!id) return '';
        return executeCommand(id, cmd);
    };

    if (!server) return (
        <div className="h-full flex items-center justify-center">Loading server info...</div>
    );

    return (
        <DashboardLayout>
            <div className="h-full w-full flex flex-col bg-background">
                <header className="flex items-center gap-4 p-4 border-b bg-card shadow-sm z-10">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Back to Dashboard">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            {server.hostname}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Online</span>
                        </h1>
                        <p className="text-xs text-muted-foreground font-mono">{server.ip_address}</p>
                    </div>
                </header>
                <div className="flex-1 overflow-hidden bg-[#1e1e1e] relative">
                    <div className="absolute inset-0 p-2">
                        <TerminalComponent
                            hostname={server.hostname}
                            onCommand={handleCommand}
                        />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
