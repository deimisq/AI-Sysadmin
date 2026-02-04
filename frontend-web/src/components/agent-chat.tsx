"use client";

import { useState, useRef } from "react";
import { diagnoseProblem, executeCommand } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, CheckCircle, XCircle, Image as ImageIcon, X } from "lucide-react";

interface AgentChatProps {
    server: { id: number; hostname: string };
    onClose: () => void;
}

export function AgentChat({ server, onClose }: AgentChatProps) {
    const [problem, setProblem] = useState("");
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [proposedCommand, setProposedCommand] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleDiagnose = async () => {
        if (!problem) return;
        setLoading(true);
        setAnalysis(null);
        setProposedCommand(null);
        setExecutionResult(null);
        try {
            // If an image is attached, include it in the request
            let problemWithImage = problem;
            if (selectedImage) {
                problemWithImage += `\n\n[Image attached: ${imageFile?.name}]\nBase64: ${selectedImage}`;
            }

            const res = await diagnoseProblem(server.id, problemWithImage);
            const analysisText = typeof res.analysis === 'string'
                ? res.analysis
                : res.analysis.analysis || JSON.stringify(res.analysis);
            setAnalysis(analysisText);

            const command = typeof res.analysis === 'object' && res.analysis.proposed_command
                ? res.analysis.proposed_command
                : null;
            setProposedCommand(command);
        } catch (error) {
            console.error(error);
            setAnalysis("❌ Error al analizar el problema. Por favor intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!proposedCommand) return;
        setLoading(true);
        try {
            const res = await executeCommand(server.id, proposedCommand);
            setExecutionResult(res);
        } catch (error) {
            console.error(error);
            setExecutionResult({ exit_code: -1, stdout: "", stderr: "Error al ejecutar el comando" });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // If Enter without Shift, submit
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleDiagnose();
        }
        // Shift+Enter allows new line (default behavior)
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
        <Card className="w-full max-w-2xl mx-auto mt-4 border-2 border-primary">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>💬 Chat IA: {server.hostname}</CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Describe el problema o haz una pregunta:</label>
                    <div className="space-y-2">
                        <textarea
                            ref={textareaRef}
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ejemplo: necesito ver los puertos abiertos&#10;&#10;Tip: Presiona Shift+Enter para nueva línea, Enter para enviar"
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        />

                        {selectedImage && (
                            <div className="relative inline-block">
                                <img
                                    src={selectedImage}
                                    alt="Preview"
                                    className="max-w-xs max-h-40 rounded border"
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
                            <Button onClick={handleDiagnose} disabled={loading} className="flex-1">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Analizar
                            </Button>
                        </div>
                    </div>
                </div>

                {analysis && (
                    <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                        {analysis}
                    </div>
                )}

                {proposedCommand && !executionResult && (
                    <div className="border border-yellow-500 bg-yellow-500/10 p-4 rounded-md">
                        <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500 mb-2">⚙️ Comando Propuesto:</p>
                        <code className="block bg-black text-white p-2 rounded mb-4 overflow-x-auto">{proposedCommand}</code>
                        <Button onClick={handleExecute} disabled={loading} className="w-full">
                            <Play className="mr-2 h-4 w-4" /> Ejecutar Comando
                        </Button>
                    </div>
                )}

                {executionResult && (
                    <div className={`border p-4 rounded-md ${executionResult.exit_code === 0 ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {executionResult.exit_code === 0 ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                            <span className="font-bold">Resultado de Ejecución (Exit Code: {executionResult.exit_code})</span>
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
