import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MultiTabTerminal } from '../components/terminal/MultiTabTerminal';
import { fetchServer } from '../lib/api';
import { useTerminal } from '../contexts/TerminalContext';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '../components/dashboard-layout';

export default function ServerConsole() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { openSession } = useTerminal();

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        // Fetch server details and open session
        // openSession handles deduplication (focus existing if open)
        fetchServer(id).then(server => {
            if (cancelled) return;
            openSession(server);
        }).catch(err => {
            console.error("Failed to fetch server", err);
        });

        return () => { cancelled = true; };
    }, [id, openSession]);

    return (
        <DashboardLayout>
            <div className="h-full w-full flex flex-col bg-[#1e1e1e]">
                {/* Minimal Header for Navigation */}
                <header className="flex items-center p-2 border-b border-[#333] bg-[#252526] text-white h-10 gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#333]" onClick={() => navigate('/')} title="Back to Dashboard">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-gray-400 font-mono">Terminal Workspaces</span>
                </header>

                <div className="flex-1 overflow-hidden relative">
                    <div className="absolute inset-0">
                        <MultiTabTerminal />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
