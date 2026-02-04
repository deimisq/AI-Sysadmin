import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Play } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { diagnoseProblem } from '../../lib/api';

export function AIChatPanel() {
    const { tabs, activeTabId } = useWorkspaceStore();
    // Get current context server
    const activeTab = tabs.find(t => t.id === activeTabId);
    const server = (activeTab?.type === 'terminal' && activeTab.server) ? activeTab.server : null;

    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, command?: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Clear messages when server context changes? Maybe not, context switching conversation is complex.
    // For now, let's keep conversation persistent or clear?
    // Let's keep it persistent but warn about context change if server changes?
    // User might want to carry over context.

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            if (server) {
                // Server context mode
                const res = await diagnoseProblem(server.id, userMsg);

                // Parse response
                let analysis = "No analysis received";
                let command = undefined;

                if (res.analysis) {
                    if (typeof res.analysis === 'string') {
                        analysis = res.analysis;
                    } else {
                        analysis = res.analysis.analysis || JSON.stringify(res.analysis);
                        command = res.analysis.proposed_command;
                    }
                }

                setMessages(prev => [...prev, { role: 'ai', content: analysis, command }]);
            } else {
                // General Assistant Mode (No Server Context)
                // TODO: Wire up a different endpoint for general chat
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        role: 'ai',
                        content: "Active terminal required. Please open a server terminal to use AI diagnostics."
                    }]);
                    setLoading(false);
                }, 800);
            }
        } catch (e: any) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'ai', content: `Error: ${e.message || "Failed to contact AI"}` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleRunCommand = (cmd: string) => {
        // We need to inject this command into the active terminal
        // But active terminal is inside WorkspaceArea -> TabContent -> TerminalComponent
        // We can emit an event or use Store to "send_input" to active tab
        // For now, let's just copy to clipboard and notify
        navigator.clipboard.writeText(cmd);
        // Toast?
        // Ideally: useWorkspaceStore().sendToActiveTerminal(cmd)
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333]">
            {/* Header */}
            <div className="p-2 border-b border-[#333] flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#252526] select-none">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>AI Assistant</span>
                </div>

                {server ? (
                    <span className="text-blue-400 ml-2 truncate max-w-[120px] px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                        {server.hostname}
                    </span>
                ) : (
                    <span className="text-gray-600 ml-2">No Context</span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 opacity-60">
                        <Sparkles className="w-12 h-12 mb-4" />
                        <p className="text-sm font-medium">How can I help you today?</p>
                        <p className="text-xs mt-2 max-w-[200px]">Open a terminal to analyze logs, processes, or run commands automatically.</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`
                           max-w-[95%] rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap shadow-sm
                           ${m.role === 'user' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-gray-200 border border-[#3e3e3e]'}
                       `}>
                            {m.content}
                        </div>
                        {m.command && (
                            <div className="mt-2 w-full max-w-[95%] bg-[#000000] border border-[#3e3e3e] rounded p-2">
                                <div className="flex justify-between items-center mb-2 border-b border-[#333] pb-1">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Proposed Command</span>
                                </div>
                                <code className="text-xs text-green-400 font-mono block mb-3 break-all">{m.command}</code>
                                <button
                                    onClick={() => handleRunCommand(m.command!)}
                                    className="w-full flex items-center justify-center gap-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-xs text-white py-1.5 rounded transition-colors border border-[#444]"
                                    title="Copy to Clipboard (Auto-run coming soon)"
                                >
                                    <Play className="w-3 h-3 text-green-500" /> Copy Command
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start">
                        <div className="bg-[#2d2d2d] rounded-lg p-3 border border-[#3e3e3e]">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[#333] bg-[#252526]">
                <div className="relative">
                    <textarea
                        className="w-full bg-[#1e1e1e] border border-[#333] text-white text-xs rounded p-2 pr-10 resize-none focus:border-blue-500 focus:ring-0 outline-none placeholder-gray-600"
                        rows={1} // Auto-grow ideally
                        style={{ minHeight: '40px' }}
                        placeholder={server ? "Analyze logs, check load..." : "Select a server first..."}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button
                        className={`
                           absolute bottom-2 right-2 p-1.5 rounded transition-all
                           ${input.trim() ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-[#333] text-gray-500 cursor-not-allowed'}
                       `}
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="text-[10px] text-gray-600 mt-1 text-center">
                    AI can make mistakes. Verify commands before running.
                </div>
            </div>
        </div>
    );
}
