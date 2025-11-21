"use client";

import { useState } from "react";
import { diagnoseProblem, executeCommand } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Play, CheckCircle, XCircle } from "lucide-react";

interface AgentChatProps {
    server: { id: number; hostname: string };
    onClose: () => void;
}

export function AgentChat({ server, onClose }: AgentChatProps) {
    const [problem, setProblem] = useState("");
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [executionResult, setExecutionResult] = useState<any>(null);

    const handleDiagnose = async () => {
        if (!problem) return;
        setLoading(true);
        setAnalysis(null);
        setExecutionResult(null);
        try {
            const res = await diagnoseProblem(server.id, problem);
            // res.analysis is an object with 'analysis' and 'proposed_command' fields
            const analysisText = typeof res.analysis === 'string'
                ? res.analysis
                : res.analysis.analysis || JSON.stringify(res.analysis);
            setAnalysis(analysisText);
        } catch (error) {
            console.error(error);
            setAnalysis("Error diagnosing problem. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Extract command from analysis (simple heuristic for MVP)
    // In a real app, the API should return structured data including the command
    const extractCommand = (text: string) => {
        if (!text || typeof text !== 'string') return null;
        const match = text.match(/Command to Execute:?\s*`?([^`\n]+)`?/i);
        return match ? match[1].trim() : null;
    };

    const suggestedCommand = analysis ? extractCommand(analysis) : null;

    const handleExecute = async () => {
        if (!suggestedCommand) return;
        setLoading(true);
        try {
            const res = await executeCommand(server.id, suggestedCommand);
            setExecutionResult(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto mt-4 border-2 border-primary">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Agent Session: {server.hostname}</CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Describe the problem:</label>
                    <div className="flex gap-2">
                        <Input
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            placeholder="e.g. High CPU usage on apache process"
                            onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
                        />
                        <Button onClick={handleDiagnose} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                        </Button>
                    </div>
                </div>

                {analysis && (
                    <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm font-mono">
                        {analysis}
                    </div>
                )}

                {suggestedCommand && !executionResult && (
                    <div className="border border-yellow-500 bg-yellow-500/10 p-4 rounded-md">
                        <p className="text-sm font-bold text-yellow-600 mb-2">Proposed Action:</p>
                        <code className="block bg-black text-white p-2 rounded mb-4">{suggestedCommand}</code>
                        <Button onClick={handleExecute} disabled={loading} className="w-full">
                            <Play className="mr-2 h-4 w-4" /> Approve & Execute
                        </Button>
                    </div>
                )}

                {executionResult && (
                    <div className={`border p-4 rounded-md ${executionResult.exit_code === 0 ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {executionResult.exit_code === 0 ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                            <span className="font-bold">Execution Result (Exit Code: {executionResult.exit_code})</span>
                        </div>
                        <pre className="text-xs bg-black text-white p-2 rounded overflow-x-auto">
                            {executionResult.stdout || executionResult.stderr}
                        </pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
