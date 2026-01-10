"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TerminalComponent from "@/components/terminal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File, Cpu, HardDrive, Activity, Send, Sparkles, Play, ArrowUp, ArrowLeft } from "lucide-react";
import { executeCommand, fetchServerStats, fetchServerFiles, fetchServer } from "@/lib/api";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

// For static export - this will be handled client-side
export const dynamicParams = true;

// Generate empty params for initial build, actual data loaded client-side
export async function generateStaticParams() {
    return [];
}

export default function ServerConsolePage() {
    const params = useParams();
    const router = useRouter();
    const serverId = params.id;
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, command?: string }[]>([
        { role: 'ai', content: 'Hola, soy tu copiloto de infraestructura. Estoy conectado al contexto de esta terminal. ¿Qué necesitas hacer hoy?' }
    ]);
    const [input, setInput] = useState("");
    const [externalCmd, setExternalCmd] = useState<string | undefined>(undefined);

    // Real Data State
    const [server, setServer] = useState<any>(null);
    const [stats, setStats] = useState({ cpu: 0, memory: 0, disk: 0 });
    const [files, setFiles] = useState<any[]>([]);
    const [currentPath, setCurrentPath] = useState("/");

    // WebSocket URL State
    const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [termOutput, setTermOutput] = useState<string | undefined>(undefined);

    useEffect(() => {
        // Build WebSocket URL
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem("token"); // Or use getAuthToken() if imported
            if (token && serverId) {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                const url = `${protocol}//${host}/api/v1/ws/ssh/${serverId}?token=${token}`;
                setWsUrl(url);
            }
        }
    }, [serverId]);

    // Load server data
    useEffect(() => {
        const loadServer = async () => {
            try {
                console.log("Loading server info for ID:", serverId);
                const data = await fetchServer(Number(serverId));
                console.log("Server info loaded:", data);
                setServer(data);
            } catch (e) {
                console.error("Failed to load server", e);
            }
        };
        loadServer();
    }, [serverId]);

    // Legacy Stats Loading (Optional, might want to keep for side panel)
    useEffect(() => {
        const loadStats = async () => {
            // ... keep existing code ...
            try {
                const data = await fetchServerStats(Number(serverId));
                setStats(data);
            } catch (e) {
                // If SSH fails via stats API, it might fail via WS too, or not.
                // console.error("Failed to load stats", e);
            }
        };
        loadStats();
        const interval = setInterval(loadStats, 5000);
        return () => clearInterval(interval);
    }, [serverId]);

    // Load files
    useEffect(() => {
        const loadFiles = async () => {
            try {
                const data = await fetchServerFiles(Number(serverId), currentPath);
                setFiles(data.files);
            } catch (e) {
                console.error("Failed to load files", e);
            }
        };
        loadFiles();
    }, [serverId, currentPath]);

    const handleNavigate = (name: string) => {
        if (name === "..") {
            const parts = currentPath.split("/").filter(Boolean);
            parts.pop();
            setCurrentPath("/" + parts.join("/"));
        } else {
            setCurrentPath(currentPath === "/" ? `/${name}` : `${currentPath}/${name}`);
        }
    };

    const handleFileClick = (file: any) => {
        if (file.is_dir) {
            handleNavigate(file.name);
        }
        // Future: handle file selection/preview
    };

    const handleTerminalCommand = useCallback(async (cmd: string) => {
        try {
            const response = await executeCommand(Number(serverId), cmd);
            // Handle CommandResponse format: { stdout, stderr, exit_code, ... }
            let output = "";

            // Add stdout if present
            if (response.stdout) {
                output += response.stdout;
            }

            // Add stderr if present and exit code is not 0
            if (response.stderr && response.exit_code !== 0) {
                if (output) output += "\n";
                output += `\x1b[1;31mError (exit code ${response.exit_code}):\x1b[0m ${response.stderr}`;
            }

            // If no output at all, return a message
            if (!output) {
                output = `Command executed successfully (exit code: ${response.exit_code || 0})`;
            }

            return output;
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            return `\x1b[1;31mError executing command:\x1b[0m ${errorMsg}`;
        }
    }, [serverId]);

    const sendMessageToAgent = async (text: string) => {
        // Optimization: Use functional state update to avoid stale closure issues
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            // Correct endpoint is /agent/diagnose defined in agent.py
            const res = await fetch(`/api/v1/agent/diagnose`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    server_id: Number(serverId),
                    problem_description: text,
                    language: 'es'
                })
            });

            if (!res.ok) {
                if (res.status === 401) throw new Error("Unauthorized");
                const errText = await res.text();
                throw new Error(errText || "API Error");
            }

            const data = await res.json();
            // Response structure: { analysis: { analysis: "...", proposed_command: "..." }, diagnostics: {...} }
            const aiOutput = data.analysis;

            setMessages(prev => [...prev, {
                role: 'ai',
                content: aiOutput.analysis,
                command: aiOutput.proposed_command || undefined
            }]);

        } catch (error: any) {
            console.error("Agent Error:", error);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `Error del Agente: ${error.message || "No se pudo conectar con el servicio de IA."}`,
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        const msg = input;
        setInput("");
        await sendMessageToAgent(msg);
    };

    const runCommand = async (cmd: string) => {
        // Detect interactive commands that must run in the real shell session
        const interactiveCommands = ['top', 'htop', 'vim', 'nano', 'less', 'more', 'tail -f', 'watch', 'ssh'];
        const isInteractive = interactiveCommands.some(i => cmd.trim().startsWith(i));

        if (isInteractive) {
            setExternalCmd(cmd); // Send to socket via TerminalComponent
            setTimeout(() => setExternalCmd(undefined), 100);
            return;
        }

        // For non-interactive commands, execute via API to capture output for AI
        // 1. Echo command to terminal locally
        setTermOutput(`$ ${cmd}\n`);
        setTimeout(() => setTermOutput(undefined), 50);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/agent/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    server_id: Number(serverId),
                    command: cmd,
                    approved_by: "user_console"
                })
            });

            if (!res.ok) throw new Error("Execution failed");

            const result = await res.json();
            const output = result.output || "";

            // 2. Show output in terminal
            setTimeout(() => {
                setTermOutput(output);
                setTimeout(() => setTermOutput(undefined), 100);
            }, 100);

            // 3. Automatically feedback result to AI
            const feedbackMsg = `Ejecuté el comando \`${cmd}\`. El resultado fue:\n\`\`\`\n${output}\n\`\`\``;
            await sendMessageToAgent(feedbackMsg);

        } catch (e: any) {
            console.error(e);
            setTermOutput(`\x1b[1;31mError executing command via API: ${e.message}\x1b[0m\n`);
            setTimeout(() => setTermOutput(undefined), 1000);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header with back button */}
            <div className="flex items-center gap-4 p-4 border-b bg-card">
                <Button
                    variant="default"
                    size="default"
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Regresar al Dashboard
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold">
                        Consola del Servidor {server?.hostname || server?.name || `#${serverId}`}
                    </h1>
                    <p className="text-sm text-muted-foreground">Terminal interactiva con acceso SSH</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 p-2 min-h-0 overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border bg-background">

                    {/* Left Panel: System Status & Files */}
                    <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="hidden md:flex">
                        <div className="h-full flex flex-col gap-4 p-3 bg-muted/10">
                            <Card className="flex-1 flex flex-col gap-4 border-none shadow-none bg-transparent">
                                <div className="flex items-center gap-2 font-semibold text-sm text-muted-foreground">
                                    <Activity className="h-4 w-4" /> System Status
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>CPU Usage</span>
                                            <span className={stats.cpu > 80 ? "text-red-500" : "text-green-500"}>{stats.cpu}%</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${stats.cpu > 80 ? "bg-red-500" : "bg-green-500"}`}
                                                style={{ width: `${stats.cpu}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>Memory</span>
                                            <span className={stats.memory > 80 ? "text-red-500" : "text-yellow-500"}>{stats.memory}%</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${stats.memory > 80 ? "bg-red-500" : "bg-yellow-500"}`}
                                                style={{ width: `${stats.memory}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>Disk (/)</span>
                                            <span className={stats.disk > 80 ? "text-red-500" : "text-blue-500"}>{stats.disk}%</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${stats.disk > 80 ? "bg-red-500" : "bg-blue-500"}`}
                                                style={{ width: `${stats.disk}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t my-2" />

                                <div className="flex items-center justify-between font-semibold text-sm text-muted-foreground mb-2">
                                    <div className="flex items-center gap-2">
                                        <Folder className="h-4 w-4" /> File Explorer
                                    </div>
                                    <span className="text-xs opacity-50 truncate max-w-[100px]">{currentPath}</span>
                                </div>

                                <ScrollArea className="flex-1 -mx-2 px-2">
                                    <div className="space-y-1 text-sm">
                                        {currentPath !== "/" && (
                                            <div
                                                className="flex items-center gap-2 p-1.5 hover:bg-accent rounded cursor-pointer text-muted-foreground"
                                                onClick={() => {
                                                    const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
                                                    setCurrentPath(parent);
                                                }}
                                            >
                                                <ArrowUp className="h-3 w-3" /> ..
                                            </div>
                                        )}
                                        {files.map((file, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2 p-1.5 hover:bg-accent rounded cursor-pointer group"
                                                onClick={() => handleFileClick(file)}
                                            >
                                                {file.is_dir ? (
                                                    <Folder className="h-3 w-3 text-blue-400 group-hover:text-blue-300" />
                                                ) : (
                                                    <File className="h-3 w-3 text-gray-500 group-hover:text-gray-400" />
                                                )}
                                                <span className="truncate flex-1">{file.name}</span>
                                                <span className="text-[10px] text-muted-foreground opacity-50">{file.size}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </Card>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="hidden md:flex" />

                    {/* Central Panel: Console */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="h-full flex flex-col gap-2 min-w-0 p-2">
                            <Card className="flex-1 bg-[#1e1e1e] border-none overflow-hidden flex flex-col shadow-2xl">
                                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between text-xs text-gray-400 border-b border-[#3e3e3e]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <span className="ml-2 font-mono">
                                            ssh {server?.ssh_username || 'user'}@{server?.hostname || server?.name || `server-${serverId}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${wsUrl ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                        {wsUrl ? 'Connected • WebSocket' : 'Connected • API Mode'}
                                    </div>
                                </div>
                                <div className="flex-1 p-1 relative">
                                    <TerminalComponent
                                        onCommand={handleTerminalCommand}
                                        externalCommand={externalCmd}
                                        hostname={server?.hostname || server?.name || `server-${serverId}`}
                                        websocketUrl={wsUrl}
                                        externalOutput={termOutput}
                                    />
                                </div>
                            </Card>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="hidden lg:flex" />

                    {/* Right Panel: AI Copilot */}
                    <ResizablePanel defaultSize={30} minSize={20} maxSize={50} className="hidden lg:flex">
                        <div className="h-full flex flex-col p-2 bg-muted/10">
                            <Card className="h-full flex flex-col border-none shadow-none bg-transparent">
                                <div className="p-3 border-b flex items-center gap-2 font-semibold bg-muted/30 rounded-t-lg">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    AI Copilot
                                </div>

                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {messages.map((msg, i) => (
                                            <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`max-w-[95%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted shadow-sm border'
                                                    }`}>
                                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                                </div>
                                                {msg.command && (
                                                    <div className="max-w-[95%] w-full bg-black/90 rounded-lg p-3 border border-gray-700 shadow-lg">
                                                        <div className="font-mono text-xs text-green-400 mb-2 break-all whitespace-pre-wrap">
                                                            $ {msg.command}
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="w-full h-7 text-xs"
                                                            onClick={() => runCommand(msg.command!)}
                                                        >
                                                            <Play className="h-3 w-3 mr-1" /> Run in Terminal
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <Sparkles className="h-3 w-3 animate-spin" /> Analizando...
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-3 mt-auto">
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                                        className="space-y-2"
                                    >
                                        <textarea
                                            placeholder="Describe el problema o haz una pregunta..."
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                        />
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span>💡 Shift+Enter para nueva línea</span>
                                            <Button type="submit" size="icon" disabled={isLoading}>
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </Card>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
