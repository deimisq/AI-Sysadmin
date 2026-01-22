"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getInvitationDetails, acceptInvitation } from "@/lib/api";
import { toast } from "sonner";

export default function AcceptInvitationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<any>(null);

    const [formData, setFormData] = useState({
        username: "",
        full_name: "",
        password: "",
        confirm_password: ""
    });

    useEffect(() => {
        if (!token) {
            setError("Token de invitación no encontrado");
            setLoading(false);
            return;
        }

        const loadDetails = async () => {
            try {
                const details = await getInvitationDetails(token);
                setInvitation(details);
                // Pre-fill username with email prefix as suggestion
                if (details.email) {
                    setFormData(prev => ({
                        ...prev,
                        username: details.email.split('@')[0]
                    }));
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Invitación inválida o expirada");
            } finally {
                setLoading(false);
            }
        };

        loadDetails();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirm_password) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        if (formData.password.length < 8) {
            toast.error("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        if (!token) return;

        setSubmitting(true);
        try {
            await acceptInvitation(token, {
                username: formData.username,
                password: formData.password,
                full_name: formData.full_name || formData.username
            });

            toast.success("Cuenta creada exitosamente");
            router.push("/login?registered=true");
        } catch (err: any) {
            toast.error(err.message || "Error al crear la cuenta");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <Card className="w-full max-w-md shadow-lg border-red-200 dark:border-red-900/30">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-red-100 rounded-full dark:bg-red-900/20">
                                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <CardTitle className="text-center text-red-600 dark:text-red-400">Invitación Inválida</CardTitle>
                        <CardDescription className="text-center">
                            {error}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => router.push("/")} variant="outline">
                            Volver al Inicio
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative">
            <div className="absolute top-4 right-4">
                <ThemeSwitcher />
            </div>

            <Card className="w-full max-w-md shadow-lg border-2 border-slate-200 dark:border-slate-800">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-blue-600/10 rounded-lg">
                            <Shield className="h-10 w-10 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Aceptar Invitación</CardTitle>
                    <CardDescription className="text-center">
                        {invitation.organization_name
                            ? `Has sido invitado a unirte a ${invitation.organization_name}`
                            : "Has sido invitado a unirte a AI Sysadmin Agent"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-md mb-6 border border-blue-100 dark:border-blue-900/30">
                        <p className="text-sm text-center text-blue-800 dark:text-blue-200">
                            Registrándose como: <strong>{invitation.email}</strong>
                        </p>
                        <p className="text-xs text-center text-blue-600 dark:text-blue-300 mt-1">
                            Rol asignado: {invitation.role}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Nombre de Usuario</Label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nombre Completo</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm_password">Confirmar Contraseña</Label>
                            <Input
                                id="confirm_password"
                                type="password"
                                value={formData.confirm_password}
                                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                required
                                minLength={8}
                            />
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                            {submitting ? "Creando cuenta..." : "Completar Registro"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
