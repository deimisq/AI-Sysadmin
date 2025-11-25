"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Save, Eye, EyeOff } from "lucide-react";
import { getConfigByCategory, updateConfigCategory } from "@/lib/api";

interface AIParamsProps {
    currentUser: any;
}

export function AIParameters({ currentUser }: AIParamsProps) {
    const [config, setConfig] = useState({
        llm_provider: "bedrock",
        aws_region: "us-east-1",
        aws_access_key_id: "",
        aws_secret_access_key: "",
        google_api_key: "",
        openai_api_key: "",
        temperature: "0.7",
        max_tokens: "2000",
        model_name: ""
    });
    const [showSecrets, setShowSecrets] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const providers = [
        { value: "bedrock", label: "Amazon Bedrock (Claude 3.5 Sonnet)", model: "anthropic.claude-3-5-sonnet-20240620-v1:0" },
        { value: "gemini", label: "Google Gemini 2.0 Flash", model: "gemini-2.0-flash-exp" },
        { value: "openai", label: "OpenAI GPT-4o", model: "gpt-4o" }
    ];

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await getConfigByCategory("ai");
            setConfig({
                llm_provider: data.llm_provider || "bedrock",
                aws_region: data.aws_region || "us-east-1",
                aws_access_key_id: data.aws_access_key_id || "",
                aws_secret_access_key: data.aws_secret_access_key || "",
                google_api_key: data.google_api_key || "",
                openai_api_key: data.openai_api_key || "",
                temperature: data.temperature || "0.7",
                max_tokens: data.max_tokens || "2000",
                model_name: data.model_name || ""
            });
            setMessage("✅ Configuration loaded successfully");
        } catch (error: any) {
            console.error("Failed to load config:", error);
            setMessage("ℹ️ No saved configuration found. Using defaults.");
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            await updateConfigCategory("ai", config);
            setMessage("✅ Configuration saved successfully! Changes applied immediately.");
        } catch (error: any) {
            setMessage("❌ Failed to save configuration: " + error.message);
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
                    AI Configuration
                </CardTitle>
                <CardDescription>
                    Configure LLM provider and model parameters
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Provider Selection */}
                <div>
                    <label className="text-sm font-medium mb-2 block">LLM Provider</label>
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
                        Model: {selectedProvider?.model}
                    </p>
                </div>

                {/* AWS Bedrock Configuration */}
                {config.llm_provider === "bedrock" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">AWS Bedrock Configuration</h3>
                        <div>
                            <label className="text-sm font-medium">AWS Region</label>
                            <Input
                                value={config.aws_region}
                                onChange={(e) => setConfig({ ...config, aws_region: e.target.value })}
                                placeholder="us-east-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">AWS Access Key ID</label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                value={config.aws_access_key_id}
                                onChange={(e) => setConfig({ ...config, aws_access_key_id: e.target.value })}
                                placeholder="AKIA..."
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">AWS Secret Access Key</label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                value={config.aws_secret_access_key}
                                onChange={(e) => setConfig({ ...config, aws_secret_access_key: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                )}

                {/* Google Gemini Configuration */}
                {config.llm_provider === "gemini" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">Google Gemini Configuration</h3>
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
                        <h3 className="font-medium text-sm">OpenAI Configuration</h3>
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
                    <h3 className="font-medium text-sm">Model Parameters</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Temperature</label>
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                value={config.temperature}
                                onChange={(e) => setConfig({ ...config, temperature: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Controls randomness (0 = deterministic, 2 = very creative)
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
                                Maximum length of AI response
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
                                Hide Secrets
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                Show Secrets
                            </>
                        )}
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "Saving..." : "Save Configuration"}
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
                        <strong>ℹ️ Note:</strong> API keys are stored securely in the database.
                        Changes are applied immediately without requiring a backend restart.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
