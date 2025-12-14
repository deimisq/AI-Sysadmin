"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { setAuthToken } from "@/utils/auth";

export default function LoginPage() {
    const router = useRouter();
    const { t } = useI18n();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [msConfig, setMsConfig] = useState<{ enabled: boolean; clientId: string; tenantId: string } | null>(null);

    useEffect(() => { // Changed from useState to useEffect for side effects
        // Fetch Microsoft config on mount
        const fetchMsConfig = async () => {
            try {
                const apiBaseUrl = "/api/v1";
                const res = await fetch(`${apiBaseUrl}/auth/microsoft/config`);
                if (res.ok) {
                    const data = await res.json();
                    setMsConfig(data);
                }
            } catch (err) {
                console.error("Failed to fetch Microsoft config", err);
            }
        };
        fetchMsConfig();
    }, []);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        full_name: "",
    });

    const handleMicrosoftLogin = () => {
        if (!msConfig?.clientId) return;

        const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
        const tenant = msConfig.tenantId || "common";
        const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${msConfig.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=openid%20profile%20email%20User.Read`;

        window.location.href = url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // API Base URL - always use nginx proxy
            const apiBaseUrl = "/api/v1";

            if (isLogin) {
                // Login
                const formBody = new URLSearchParams();
                formBody.append("username", formData.username);
                formBody.append("password", formData.password);

                const res = await fetch(`${apiBaseUrl}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: formBody,
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.detail || t.login.failedLogin);
                }

                const data = await res.json();
                setAuthToken(data.access_token);
                router.push("/dashboard");
            } else {
                // Register
                const res = await fetch(`${apiBaseUrl}/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: formData.username,
                        email: formData.email,
                        password: formData.password,
                        full_name: formData.full_name || null,
                    }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.detail || t.login.failedRegister);
                }

                alert(t.login.successRegister);
                setIsLogin(true);
                setFormData({ username: "", email: "", password: "", full_name: "" });
            }
        } catch (error: any) {
            console.error(error);
            alert(error.message || t.common.error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Shield className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">AI Sysadmin Agent</CardTitle>
                    <CardDescription className="text-center">
                        {isLogin ? t.login.welcomeBack : t.login.createAccount}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <>
                                <div className="space-y-2">
                                    <Input
                                        placeholder={t.login.fullNamePlaceholder}
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        placeholder={t.login.emailPlaceholder}
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <Input
                                placeholder={t.login.usernamePlaceholder}
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder={t.login.passwordPlaceholder}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? t.common.loading : (isLogin ? t.login.signIn : t.login.signUp)}
                        </Button>
                    </form>

                    {msConfig?.enabled && isLogin && (
                        <>
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or continue with
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleMicrosoftLogin}
                                type="button"
                            >
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="microsoft" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                                    <path fill="currentColor" d="M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"></path>
                                </svg>
                                Microsoft
                            </Button>
                        </>
                    )}

                    <div className="mt-4 text-center text-sm">
                        <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setFormData({ username: "", email: "", password: "", full_name: "" });
                            }}
                        >
                            {isLogin ? t.login.noAccount : t.login.hasAccount}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
