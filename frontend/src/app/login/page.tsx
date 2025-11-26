"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
    const router = useRouter();
    const { t } = useI18n();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        full_name: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Determine API Base URL
            let apiBaseUrl = "/api/v1";
            if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                apiBaseUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
            }

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
                localStorage.setItem("token", data.access_token);
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
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Shield className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">
                        {isLogin ? t.login.welcomeBack : t.login.createAccount}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isLogin
                            ? t.login.loginSubtitle
                            : t.login.registerSubtitle}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <>
                                <Input
                                    type="email"
                                    placeholder={`${t.login.email} *`}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                                <Input
                                    placeholder={t.login.fullName}
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </>
                        )}
                        <Input
                            placeholder={`${t.login.username} *`}
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                        <Input
                            type="password"
                            placeholder={`${t.login.password} *`}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? t.login.wait : isLogin ? t.login.loginButton : t.login.registerButton}
                        </Button>
                    </form>

                    <div className="mt-4 text-center text-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setFormData({ username: "", email: "", password: "", full_name: "" });
                            }}
                            className="text-primary hover:underline"
                        >
                            {isLogin
                                ? t.login.noAccount
                                : t.login.hasAccount}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
