"use client";

import { useState } from "react";
import { diagnoseProblem, executeCommand } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Send, X } from "lucide-react";
import ReactMarkdown from 'react-markdown';

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
            content: `🤖 **AI Sysadmin Assistant** connected to **${server.hostname}**\n\nI'm here to help you diagnose and resolve server issues. I'll analyze real diagnostic data and have a conversation with you about what I find.\n\n**What can I help you with today?**`
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const res = await diagnoseProblem(server.id, input);
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
                content: "❌ Error analyzing the problem. Please try again."
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
            const resultSummary = `I executed the command you suggested. Here are the results:\n\n**Exit Code:** ${res.exit_code}\n\n**Output:**\n\`\`\`\n${res.stdout || res.stderr || 'No output'}\n\`\`\`\n\nPlease analyze these results and tell me what you found.`;

            // Add user message with results
            setMessages(prev => [...prev, {
                role: "user",
                content: resultSummary
            }]);

            // Get AI analysis of the results
            const analysisRes = await diagnoseProblem(server.id, resultSummary);
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
                content: "❌ Failed to execute the command. Please check the server connection and try again."
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto mt-4 border-2 border-primary h-[80vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b">
                <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">💬</span>
                    <span>AI Chat: {server.hostname}</span>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
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
                                    <p className="text-xs font-bold text-yellow-600 mb-2">⚙️ Proposed Command:</p>
                                    <code className="block bg-black text-white p-2 rounded text-xs mb-3 overflow-x-auto">
                                        {message.proposedCommand}
                                    </code>
                                    <Button
                                        onClick={() => handleExecuteCommand(idx, message.proposedCommand!)}
                                        disabled={loading}
                                        size="sm"
                                        className="w-full"
                                    >
                                        <Play className="mr-2 h-3 w-3" /> Execute Command
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
                                        {' '}Execution Result (Exit Code: {message.executionResult.exit_code})
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
                            <span className="text-sm text-muted-foreground">AI is thinking...</span>
                        </div>
                    </div>
                )}
            </CardContent>

            <div className="border-t p-4">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Describe the issue or ask a question..."
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={loading}
                    />
                    <Button onClick={handleSendMessage} disabled={loading || !input.trim()}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    💡 Tip: Be specific about the issue. The AI will analyze real server data and have a conversation with you.
                </p>
            </div>
        </Card>
    );
}
