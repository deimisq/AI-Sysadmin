"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import TerminalComponent from "@/components/terminal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File, Cpu, HardDrive, Activity, Send, Sparkles, Play, ArrowUp } from "lucide-react";
import { executeCommand, fetchServerStats, fetchServerFiles } from "@/lib/api";

export default function ServerConsolePage() {
    const params = useParams();
    const serverId = params.id;
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, command?: string }[]>([
        { role: 'ai', content: 'Hola, soy tu copiloto de infraestructura. Estoy conectado al contexto de esta terminal. ¿Qué necesitas hacer hoy?' }
    ]);
    const [input, setInput] = useState("");
    const [externalCmd, setExternalCmd] = useState<string | undefined>(undefined);

    // Real Data State
    const [stats, setStats] = useState({ cpu: 0, memory: 0, disk: 0 });
    const [files, setFiles] = useState<any[]>([]);
    const [currentPath, setCurrentPath] = useState("/");

    // Load stats periodically
    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchServerStats(Number(serverId));
                setStats(data);
            } catch (e) {
                console.error("Failed to load stats", e);
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

    const handleTerminalCommand = async (cmd: string) => {
        try {
            const response = await executeCommand(Number(serverId), cmd);
            if (response.error) {
                return `Error: ${response.error}\nOutput: ${response.output}`;
            }
            return response.output || "";
        } catch (error: any) {
            return `Error: ${error.message}`;
        }
    };

    const handleSendMessage = () => {
        if (!input.trim()) return;
        setMessages([...messages, { role: 'user', content: input }]);
        setInput("");

        // Mock AI response logic based on input
        setTimeout(() => {
            let responseContent = "Entendido.";
            let responseCommand = undefined;

            if (input.toLowerCase().includes("update") || input.toLowerCase().includes("actualiz")) {
                responseContent = "Para actualizar los paquetes del sistema, te sugiero ejecutar:";
                responseCommand = "sudo apt update && sudo apt upgrade -y";
            } else if (input.toLowerCase().includes("disk") || input.toLowerCase().includes("disco")) {
                responseContent = "Para ver el uso del disco:";
                responseCommand = "df -h";
            } else if (input.toLowerCase().includes("mem") || input.toLowerCase().includes("ram")) {
                responseContent = "Para ver el estado de la memoria:";
                responseCommand = "free -h";
            } else {
                responseContent = `Entendido. Para realizar esa acción, podrías probar el siguiente comando (ejemplo):`;
                responseCommand = "ls -la";
            }

            setMessages(prev => [...prev, {
                role: 'ai',
                content: responseContent,
                command: responseCommand
            }]);
        }, 1000);
    };

    const runCommand = (cmd: string) => {
        setExternalCmd(cmd);
        // Reset after a moment so it can be triggered again if needed
        setTimeout(() => setExternalCmd(undefined), 100);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4 p-4 bg-background">
            {/* Left Panel: System Status & Files */}
            <div className="w-64 flex flex-col gap-4 hidden md:flex">
                <Card className="p-4 flex-1 flex flex-col gap-4">
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
                                    className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer"
                                    onClick={() => handleNavigate("..")}
                                >
                                    <ArrowUp className="h-3 w-3 text-gray-400" /> ..
                                </div>
                            )}
                            {files.map((file, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer"
                                    onClick={() => file.is_dir && handleNavigate(file.name)}
                                >
                                    {file.is_dir ? (
                                        <Folder className="h-3 w-3 text-blue-400" />
                                    ) : (
                                        <File className="h-3 w-3 text-gray-400" />
                                    )}
                                    <span className="truncate">{file.name}</span>
                                </div>
                            ))}
                            {files.length === 0 && (
                                <div className="text-xs text-muted-foreground p-2">Empty or loading...</div>
                            )}
                        </div>
                    </ScrollArea>
                </Card>
            </div>

            {/* Center Panel: Terminal */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
                <Card className="flex-1 bg-[#1e1e1e] border-none overflow-hidden flex flex-col shadow-2xl">
                    <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between text-xs text-gray-400 border-b border-[#3e3e3e]">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="ml-2 font-mono">ssh user@server-{serverId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Connected • API Mode
                        </div>
                    </div>
                    <div className="flex-1 p-1 relative">
                        <TerminalComponent
                            onCommand={handleTerminalCommand}
                            externalCommand={externalCmd}
                        />
                    </div>
                </Card>
            </div>

            {/* Right Panel: AI Copilot */}
            <div className="w-80 flex flex-col hidden lg:flex">
                <Card className="h-full flex flex-col border-l-4 border-l-primary/20">
                    <div className="p-3 border-b flex items-center gap-2 font-semibold bg-muted/30">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Copilot
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                    {msg.command && (
                                        <div className="max-w-[90%] w-full bg-black/90 rounded-lg p-2 border border-gray-700 shadow-lg">
                                            <div className="font-mono text-xs text-green-400 mb-2 break-all">
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
                        </div>
                    </ScrollArea>

                    <div className="p-3 border-t mt-auto bg-background">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                            className="space-y-2"
                        >
                            <textarea
                                placeholder="Describe el problema o haz una pregunta...&#10;&#10;Tip: Presiona Shift+Enter para nueva línea, Enter para enviar"
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
                                <span>💡 Consejo: Sé específico sobre el problema. La IA analizará datos reales del servidor y conversará contigo.</span>
                                <Button type="submit" size="icon">
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
}
