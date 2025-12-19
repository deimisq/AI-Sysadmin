"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Save, Eye, EyeOff } from "lucide-react";
import { getConfigByCategory, updateConfigCategory } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";

interface AIParamsProps {
    currentUser: any;
}

export function AIParameters({ currentUser }: AIParamsProps) {
    const { t } = useI18n();
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

    const loadConfig = async () => {
        try {
            const data = await getConfigByCategory("ai");
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
            setMessage(`✅ ${t.aiParams.loadSuccess}`);
        } catch (error: any) {
            console.error("Failed to load config:", error);
            setMessage(`ℹ️ ${t.aiParams.loadDefault}`);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            await updateConfigCategory("ai", config);
            setMessage(`✅ ${t.aiParams.saveSuccess}`);
        } catch (error: any) {
            setMessage(`❌ ${t.aiParams.saveError}: ` + error.message);
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
                    {t.aiParams.title}
                </CardTitle>
                <CardDescription>
                    {t.aiParams.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Provider Selection */}
                <div>
                    <label className="text-sm font-medium mb-2 block">{t.aiParams.provider}</label>
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
                        {t.aiParams.model}: {selectedProvider?.model}
                    </p>
                </div>

                {/* AWS Bedrock Configuration */}
                {config.llm_provider === "bedrock" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">AWS Bedrock Configuration</h3>
                        <div>
                            <label className="text-sm font-medium">{t.aiParams.awsRegion}</label>
                            <Input
                                value={config.aws_region}
                                onChange={(e) => setConfig({ ...config, aws_region: e.target.value })}
                                placeholder="us-east-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {t.aiParams.awsRegionHelp}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{t.aiParams.bedrockKey}</label>
                            <Input
                                type={showSecrets ? "text" : "password"}
                                value={config.aws_bearer_token_bedrock}
                                onChange={(e) => setConfig({ ...config, aws_bearer_token_bedrock: e.target.value })}
                                placeholder="ABSK..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {t.aiParams.bedrockKeyHelp}
                            </p>
                        </div>
                    </div>
                )}

                {/* Anthropic API Configuration */}
                {config.llm_provider === "anthropic" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">Anthropic API Configuration</h3>
                        <div>
                            <label className="text-sm font-medium">{t.aiParams.anthropicKey}</label>
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
                        <h3 className="font-medium text-sm">Google Gemini Configuration</h3>
                        <div>
                            <label className="text-sm font-medium">{t.aiParams.googleKey}</label>
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
                            <label className="text-sm font-medium">{t.aiParams.openaiKey}</label>
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
                    <h3 className="font-medium text-sm">{t.aiParams.parameters}</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">{t.aiParams.temperature}</label>
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                value={config.temperature}
                                onChange={(e) => setConfig({ ...config, temperature: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {t.aiParams.temperatureHelp}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{t.aiParams.maxTokens}</label>
                            <Input
                                type="number"
                                step="100"
                                min="100"
                                max="8000"
                                value={config.max_tokens}
                                onChange={(e) => setConfig({ ...config, max_tokens: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {t.aiParams.maxTokensHelp}
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
                                {t.aiParams.hideSecrets}
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                {t.aiParams.showSecrets}
                            </>
                        )}
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? t.aiParams.saving : t.aiParams.save}
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
                        <strong>ℹ️ Note:</strong> {t.aiParams.note}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
