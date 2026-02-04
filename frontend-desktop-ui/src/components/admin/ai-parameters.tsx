import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export function AIParameters() {
    const [config, setConfig] = useState({
        llm_provider: "bedrock",
        aws_region: "us-east-1",
        aws_bearer_token_bedrock: "",
        google_api_key: "",
        openai_api_key: "",
        anthropic_api_key: "",
        temperature: "0.7",
        max_tokens: "2000",
        model_name: ""
    });
    const [showSecrets, setShowSecrets] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const providers = [
        { value: "bedrock", label: "Amazon Bedrock (Claude 3.5 Sonnet)", model: "anthropic.claude-3-5-sonnet-20240620-v1:0" },
        { value: "anthropic", label: "Anthropic API (Claude 3.5 Sonnet)", model: "claude-3-5-sonnet-20240620" },
        { value: "gemini", label: "Google Gemini 2.0 Flash", model: "gemini-2.0-flash-exp" },
        { value: "openai", label: "OpenAI GPT-4o", model: "gpt-4o" }
    ];

    useEffect(() => {
        loadConfig();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const loadConfig = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/config/ai`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();
                setConfig({
                    llm_provider: data.llm_provider || "bedrock",
                    aws_region: data.aws_region || "us-east-1",
                    aws_bearer_token_bedrock: data.aws_bearer_token_bedrock || "",
                    google_api_key: data.google_api_key || "",
                    openai_api_key: data.openai_api_key || "",
                    anthropic_api_key: data.anthropic_api_key || "",
                    temperature: String(data.temperature || "0.7"),
                    max_tokens: String(data.max_tokens || "2000"),
                    model_name: data.model_name || ""
                });
                setMessage("✅ Configuración cargada correctamente");
            } else {
                console.error("Failed to load config");
                setMessage("ℹ️ Usando configuración por defecto");
            }

        } catch (error: any) {
            console.error("Failed to load config:", error);
            setMessage("ℹ️ Usando configuración por defecto");
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch(`${API_BASE_URL}/config/ai`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setMessage("✅ Configuración guardada correctamente");
                toast.success("Configuración IA guardada");
            } else {
                throw new Error("Error saving config");
            }
        } catch (error: any) {
            setMessage("❌ Error al guardar: " + error.message);
            toast.error("Error al guardar configuración IA");
        } finally {
            setLoading(false);
        }
    };

    const selectedProvider = providers.find(p => p.value === config.llm_provider);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Parámetros de IA
                </CardTitle>
                <CardDescription>
                    Configura los proveedores de Inteligencia Artificial y modelos
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Provider Selection */}
                <div>
                    <label className="text-sm font-medium mb-2 block">Proveedor de LLM</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={config.llm_provider}
                        onChange={(e) => {
                            const provider = providers.find(p => p.value === e.target.value);
                            setConfig({
                                ...config,
                                llm_provider: e.target.value,
                                model_name: provider?.model || ""
                            });
                        }}
                    >
                        {providers.map((provider) => (
                            <option key={provider.value} value={provider.value}>
                                {provider.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                        Modelo seleccionado: {selectedProvider?.model}
                    </p>
                </div>

                {/* AWS Bedrock Configuration */}
                {config.llm_provider === "bedrock" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">Configuración AWS Bedrock</h3>
                        <div>
                            <label className="text-sm font-medium">AWS Region</label>
                            <Input
                                value={config.aws_region}
                                onChange={(e) => setConfig({ ...config, aws_region: e.target.value })}
                                placeholder="us-east-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Región donde está habilitado el modelo (ej. us-east-1)
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Access Key / Bearer Token</label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                value={config.aws_bearer_token_bedrock}
                                onChange={(e) => setConfig({ ...config, aws_bearer_token_bedrock: e.target.value })}
                                placeholder="ABSK..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Credenciales para acceder a Bedrock API
                            </p>
                        </div>
                    </div>
                )}

                {/* Anthropic API Configuration */}
                {config.llm_provider === "anthropic" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">Configuración Anthropic API</h3>
                        <div>
                            <label className="text-sm font-medium">Anthropic API Key</label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                value={config.anthropic_api_key}
                                onChange={(e) => setConfig({ ...config, anthropic_api_key: e.target.value })}
                                placeholder="sk-ant-..."
                            />
                        </div>
                    </div>
                )}

                {/* Google Gemini Configuration */}
                {config.llm_provider === "gemini" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">Configuración Google Gemini</h3>
                        <div>
                            <label className="text-sm font-medium">Google API Key</label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                value={config.google_api_key}
                                onChange={(e) => setConfig({ ...config, google_api_key: e.target.value })}
                                placeholder="AIza..."
                            />
                        </div>
                    </div>
                )}

                {/* OpenAI Configuration */}
                {config.llm_provider === "openai" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">Configuración OpenAI</h3>
                        <div>
                            <label className="text-sm font-medium">OpenAI API Key</label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                value={config.openai_api_key}
                                onChange={(e) => setConfig({ ...config, openai_api_key: e.target.value })}
                                placeholder="sk-..."
                            />
                        </div>
                    </div>
                )}

                {/* Model Parameters */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium text-sm">Parámetros del Modelo</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Temperatura (0.0 - 2.0)</label>
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                value={config.temperature}
                                onChange={(e) => setConfig({ ...config, temperature: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Controla la creatividad. Valores bajos son más deterministas.
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Max Tokens</label>
                            <Input
                                type="number"
                                step="100"
                                min="100"
                                max="8000"
                                value={config.max_tokens}
                                onChange={(e) => setConfig({ ...config, max_tokens: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Longitud máxima de la respuesta generada.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSecrets(!showSecrets)}
                    >
                        {showSecrets ? (
                            <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Ocultar Secretos
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                Mostrar Secretos
                            </>
                        )}
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "Guardando..." : "Guardar Configuración"}
                    </Button>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-sm ${message.startsWith("✅")
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : message.startsWith("❌")
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}>
                        {message}
                    </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>ℹ️ Nota:</strong> Los cambios en la configuración de IA se aplicarán inmediatamente para las nuevas conversaciones. Asegúrate de que las credenciales tengan los permisos necesarios.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
