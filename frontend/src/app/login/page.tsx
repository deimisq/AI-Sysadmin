"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { setAuthToken } from "@/utils/auth";
import { toast } from "sonner";
// We might not need full update of i18n context just for login, but let's keep it simple for now or use hardcoded strings to match new distribution style?
// Let's stick to hardcoded spanish for consistency with Landing/Subscribe pages which are in Spanish.

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [msConfig, setMsConfig] = useState<{ enabled: boolean; clientId: string; tenantId: string } | null>(null);

    // Check for "registered" query param to show success message
    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            toast.success("Cuenta creada exitosamente. Por favor inicia sesión.");
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchMsConfig = async () => {
            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
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
        password: "",
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
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

            const formBody = new URLSearchParams();
            formBody.append("username", formData.username.trim());
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
                throw new Error(error.detail || "Error al iniciar sesión");
            }

            const data = await res.json();
            setAuthToken(data.access_token);

            // Redirect to dashboard (Admin Panel)
            router.push("/dashboard");

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Ocurrió un error inesperado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <ThemeSwitcher />
            </div>
            <Card className="w-full max-w-md shadow-lg border-2 border-slate-200 dark:border-slate-800">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-blue-600/10 rounded-lg">
                            <Shield className="h-10 w-10 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Bienvenido de nuevo</CardTitle>
                    <CardDescription className="text-center">
                        Ingresa a tu panel de administración
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                placeholder="Usuario o Email"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Contraseña"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                            {loading ? "Cargando..." : "Iniciar Sesión"}
                        </Button>
                    </form>

                    {msConfig?.enabled && (
                        <>
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-50 dark:bg-slate-950 px-2 text-muted-foreground">
                                        O continuar con
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

                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">¿No tienes cuenta? </span>
                        <button
                            type="button"
                            className="text-blue-600 font-medium hover:underline"
                            onClick={() => router.push("/subscribe")}
                        >
                            Regístrate aquí
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
