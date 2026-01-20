"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://testing.sentrait.com.uy/api/v1';

export default function AcceptInvitationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<any>(null);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        full_name: ""
    });

    useEffect(() => {
        console.log("Accept Invitation - Token:", token);

        if (!token) {
            setError("Token de invitación no encontrado");
            setLoading(false);
            return;
        }

        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/invitations/details/${token}`);
            if (!response.ok) throw new Error("Invitación no válida");
            const details = await response.json();
            setInvitation(details);
            setLoading(false);
        } catch (error: any) {
            console.error(error);
            setError(error.message || "Invitación no válida o expirada");
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username || !formData.password || !formData.full_name) {
            toast.error("Todos los campos son requeridos");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/invitations/accept/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    full_name: formData.full_name
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Error al crear la cuenta");
            }

            setSuccess(true);
            toast.success("¡Cuenta creada exitosamente!");

            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al crear la cuenta");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-sm text-muted-foreground">Cargando invitación...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100 dark:from-gray-900 dark:to-gray-800">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <CardTitle className="text-center text-red-600">Error</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => router.push("/login")}>
                            Ir al Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-green-600 mb-2">¡Cuenta Creada!</h2>
                        <p className="text-muted-foreground">
                            Redirigiendo al inicio de sesión...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <UserPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Bienvenido a AI Sysadmin Agent</CardTitle>
                    <CardDescription className="text-center">
                        Has sido invitado a crear una cuenta
                        {invitation?.organization_name && (
                            <> para <strong>{invitation.organization_name}</strong></>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Email (pre-asignado)</label>
                            <Input
                                type="email"
                                value={invitation?.email || ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Nombre Completo</label>
                            <Input
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="Juan Pérez"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Nombre de Usuario</label>
                            <Input
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="juanperez"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Contraseña</label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Mínimo 6 caracteres"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Confirmar Contraseña</label>
                            <Input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="Confirma tu contraseña"
                                required
                            />
                        </div>

                        {invitation?.role && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    <strong>Rol asignado:</strong> {invitation.role}
                                </p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando cuenta...
                                </>
                            ) : (
                                "Crear Cuenta"
                            )}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            ¿Ya tienes una cuenta?{" "}
                            <a href="/login" className="text-blue-600 hover:underline">
                                Iniciar sesión
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
