import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send, X, Image as ImageIcon, Server as ServerIcon, Play } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { fetchServers, type Server } from "@/lib/api";
import { useParams } from "react-router-dom";
import { fetch } from '@tauri-apps/plugin-http';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    proposedCommand?: string | null;
    executionResult?: any;
}

export function AiAssistantPanel() {
    const { id: routeServerId } = useParams<{ id: string }>();

    const [servers, setServers] = useState<Server[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<string>("");

    const [messages, setMessages] = useState<Message[]>([
        { role: "system", content: "Cargando asistente..." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        fetchServers().then(data => {
            setServers(data);
            if (data.length > 0) {
                if (routeServerId) {
                    setSelectedServerId(routeServerId);
                } else {
                    setMessages([{ role: "system", content: "👋 Selecciona un servidor del menú superior para comenzar." }]);
                }
            }
        }).catch(err => {
            setMessages([{ role: "system", content: "❌ Error cargando lista de servidores." }]);
        });
    }, []);

    // Sync with Route ID if it changes
    useEffect(() => {
        if (routeServerId && routeServerId !== selectedServerId) {
            setSelectedServerId(routeServerId);
        }
    }, [routeServerId]);

    // On Server Change
    useEffect(() => {
        if (!selectedServerId) return;
        const srv = servers.find(s => s.id.toString() === selectedServerId);
        if (srv) {
            setMessages([{
                role: "system",
                content: `💡 **${srv.hostname}** seleccionado. Estoy listo para ayudarte con el diagnóstico.`
            }]);
        }
    }, [selectedServerId, servers]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const diagnoseProblem = async (serverId: string, description: string, locale: string = "es") => {
        const res = await fetch(`${API_BASE_URL}/servers/${serverId}/diagnose`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ description, locale })
        });
        if (!res.ok) throw new Error("Failed to diagnose");
        return await res.json();
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !selectedServerId) return;

        let messageContent = input;
        if (selectedImage) {
            messageContent += `\n\n[Image attached: ${imageFile?.name}]\nBase64: ${selectedImage}`;
        }

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        const currentImage = selectedImage;
        setSelectedImage(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        setLoading(true);

        try {
            const res = await diagnoseProblem(selectedServerId, messageContent, "es");
            const analysisText = typeof res.analysis === 'string'
                ? res.analysis
                : res.analysis.analysis || JSON.stringify(res.analysis);

            const command = typeof res.analysis === 'object' && res.analysis.proposed_command
                ? res.analysis.proposed_command
                : null;

            setMessages(prev => [...prev, {
                role: "assistant",
                content: analysisText,
                proposedCommand: command
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "❌ Error al conectar con el agente. Verifica tu conexión."
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteCommand = async (messageIndex: number, command: string) => {
        if (!selectedServerId) return;

        // Dispatch event to TerminalComponent
        window.dispatchEvent(new CustomEvent('run-terminal-command', { detail: command }));

        // Update UI to show execution started
        setMessages(prev => prev.map((msg, idx) => {
            if (idx === messageIndex) {
                return {
                    ...msg,
                    executionResult: {
                        output: "🚀 Comando enviado a la terminal interactiva.\nRevisa la consola central."
                    }
                };
            }
            return msg;
        }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
                setImageFile(file);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background border-l text-sm">
            {/* Header / Server Selector */}
            <div className="p-3 border-b flex items-center gap-2 bg-muted/40 sticky top-0 z-10">
                <ServerIcon className="h-4 w-4 text-muted-foreground" />
                <select
                    className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                    value={selectedServerId}
                    onChange={(e) => setSelectedServerId(e.target.value)}
                >
                    <option value="" disabled>Seleccionar Servidor</option>
                    {servers.map(s => (
                        <option key={s.id} value={s.id}>{s.hostname} ({s.ip_address})</option>
                    ))}
                </select>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-lg max-w-[90%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' :
                                msg.role === 'system' ? 'bg-muted text-muted-foreground text-xs' :
                                    'bg-secondary text-secondary-foreground shadow-sm'
                            }`}>
                            <div className="prose prose-sm dark:prose-invert break-words">
                                <ReactMarkdown>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>

                            {/* Execution Result */}
                            {msg.executionResult && (
                                <div className="mt-2 p-2 bg-black/10 rounded text-xs font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                                    {msg.executionResult.output || msg.executionResult.stdout}
                                </div>
                            )}
                        </div>

                        {/* Proposed Command Button */}
                        {msg.proposedCommand && !msg.executionResult && (
                            <div className="w-full max-w-[90%]">
                                <div className="bg-muted p-2 rounded border text-xs font-mono mb-1 truncate">
                                    {msg.proposedCommand}
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full gap-2 border-primary/20 hover:bg-primary/10"
                                    onClick={() => handleExecuteCommand(idx, msg.proposedCommand!)}
                                    disabled={loading}
                                >
                                    <Play className="h-3 w-3" /> Ejecutar en Consola
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Pensando...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t bg-background">
                {selectedImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={selectedImage} alt="Preview" className="h-16 rounded border" />
                        <button onClick={() => { setSelectedImage(null); setImageFile(null); }} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
                <div className="flex gap-2 relative">
                    <Button
                        variant="ghost" size="icon"
                        className="h-10 w-10 shrink-0 text-muted-foreground"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <ImageIcon className="h-5 w-5" />
                    </Button>
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageSelect}
                    />

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 min-h-[40px] max-h-32 p-2 border rounded-md text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder={selectedServerId ? "Escribe un mensaje..." : "Selecciona un servidor primero"}
                        disabled={!selectedServerId || loading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />

                    <Button
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={handleSendMessage}
                        disabled={!selectedServerId || loading || !input.trim()}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
