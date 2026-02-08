import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Play, Send, X, Image as ImageIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    proposedCommand?: string | null;
    executionResult?: any;
}

interface ConversationalChatProps {
    server: { id: number; hostname: string };
    onClose: () => void;
}

export function ConversationalChat({ server, onClose }: ConversationalChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "system",
            content: `💡 Conversación con IA para el servidor **${server.hostname}**. Describe el problema que estás experimentando y te ayudaré a diagnosticarlo y resolverlo.`
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const diagnoseProblem = async (serverId: number, description: string, locale: string = "es") => {
        const res = await fetch(`${API_BASE_URL}/servers/${serverId}/diagnose`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ description, locale })
        });
        if (!res.ok) throw new Error("Failed to diagnose");
        return await res.json();
    };

    const executeCommand = async (serverId: number, command: string) => {
        const res = await fetch(`${API_BASE_URL}/servers/${serverId}/execute`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ command })
        });
        if (!res.ok) throw new Error("Failed to execute command");
        return await res.json();
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        // Include image if attached
        let messageContent = input;
        if (selectedImage) {
            messageContent += `\n\n[Image attached: ${imageFile?.name}]\nBase64: ${selectedImage}`;
        }

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setSelectedImage(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        setLoading(true);

        try {
            const res = await diagnoseProblem(server.id, messageContent, "es");
            const analysisText = typeof res.analysis === 'string'
                ? res.analysis
                : res.analysis.analysis || JSON.stringify(res.analysis);

            const command = typeof res.analysis === 'object' && res.analysis.proposed_command
                ? res.analysis.proposed_command
                : null;

            const assistantMessage: Message = {
                role: "assistant",
                content: analysisText,
                proposedCommand: command
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "❌ Error al analizar el problema. Por favor, intenta de nuevo."
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteCommand = async (messageIndex: number, command: string) => {
        setLoading(true);
        try {
            const res = await executeCommand(server.id, command);

            // Update the message with execution result
            setMessages(prev => prev.map((msg, idx) => {
                if (idx === messageIndex) {
                    return { ...msg, executionResult: res };
                }
                return msg;
            }));

            // Automatically send the results back to the AI for analysis
            const resultSummary = `Ejecuté el comando que sugeriste. Aquí están los resultados:\n\n**Código de Salida:** ${res.exit_code}\n\n**Output:**\n\`\`\`\n${res.stdout || res.stderr || 'Sin output'}\n\`\`\`\n\nPor favor analiza estos resultados y dime qué encontraste.`;

            // Add user message with results
            setMessages(prev => [...prev, {
                role: "user",
                content: resultSummary
            }]);

            // Get AI analysis of the results
            const analysisRes = await diagnoseProblem(server.id, resultSummary, "es");
            const analysisText = typeof analysisRes.analysis === 'string'
                ? analysisRes.analysis
                : analysisRes.analysis.analysis || JSON.stringify(analysisRes.analysis);

            const newCommand = typeof analysisRes.analysis === 'object' && analysisRes.analysis.proposed_command
                ? analysisRes.analysis.proposed_command
                : null;

            setMessages(prev => [...prev, {
                role: "assistant",
                content: analysisText,
                proposedCommand: newCommand
            }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "❌ Error al ejecutar el comando. Por favor, verifica que el servidor esté accesible."
            }]);
        } finally {
            setLoading(false);
        }
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

    const removeImage = () => {
        setSelectedImage(null);
        setImageFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl">💬</span>
                        <span>Chat IA: {server.hostname}</span>
                    </DialogTitle>
                    <DialogDescription>
                        Asistente virtual para diagnóstico y resolución de problemas.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((message, idx) => (
                        <div
                            key={idx}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg p-4 ${message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : message.role === "system"
                                        ? "bg-muted/50 border border-muted-foreground/20"
                                        : "bg-muted"
                                    }`}
                            >
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{message.content}</ReactMarkdown>
                                </div>

                                {message.proposedCommand && !message.executionResult && (
                                    <div className="mt-4 border border-yellow-500 bg-yellow-500/10 p-3 rounded">
                                        <p className="text-xs font-bold text-yellow-600 mb-2">📝 Comando Propuesto</p>
                                        <code className="block bg-black text-white p-2 rounded text-xs mb-3 overflow-x-auto">
                                            {message.proposedCommand}
                                        </code>
                                        <Button
                                            onClick={() => handleExecuteCommand(idx, message.proposedCommand!)}
                                            disabled={loading}
                                            size="sm"
                                            className="w-full"
                                        >
                                            <Play className="mr-2 h-3 w-3" /> Ejecutar Comando
                                        </Button>
                                    </div>
                                )}

                                {message.executionResult && (
                                    <div className={`mt-4 border p-3 rounded ${message.executionResult.exit_code === 0
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-red-500 bg-red-500/10'
                                        }`}>
                                        <p className="text-xs font-bold mb-2">
                                            {message.executionResult.exit_code === 0 ? '✅' : '❌'}
                                            {' '}Resultado de Ejecución (Código: {message.executionResult.exit_code})
                                        </p>
                                        <pre className="text-xs bg-black text-white p-2 rounded overflow-x-auto">
                                            {message.executionResult.stdout || message.executionResult.stderr}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-lg p-4 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Analizando...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t p-4">
                    <div className="space-y-2">
                        {selectedImage && (
                            <div className="relative inline-block">
                                <img
                                    src={selectedImage}
                                    alt="Preview"
                                    className="max-w-xs max-h-32 rounded border"
                                />
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="absolute top-1 right-1"
                                    onClick={removeImage}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <p className="text-xs text-muted-foreground mt-1">{imageFile?.name}</p>
                            </div>
                        )}

                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe el problema que tienes con este servidor... (Tip: Shift+Enter para nueva línea, Enter para enviar)"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            disabled={loading}
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        />

                        <div className="flex gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                            >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Adjuntar Imagen
                            </Button>
                            <Button onClick={handleSendMessage} disabled={loading || !input.trim()} className="flex-1">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        💡 Tip: Puedes adjuntar screenshots de errores para un mejor diagnóstico
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
