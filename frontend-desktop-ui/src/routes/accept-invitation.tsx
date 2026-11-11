import { uiText } from '../lib/ui-language';
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInvitationDetails, acceptInvitation } from "@/lib/api";
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvitation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
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
        console.log("Full URL:", window.location.href);

        if (!token) {
            console.error("No token in URL");
            setError("Token de invitación no encontrado en la URL");
            setLoading(false);
            return;
        }

        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        try {
            console.log("Fetching invitation details for token:", token);
            const details = await getInvitationDetails(token!);
            console.log("Invitation details loaded:", details);
            setInvitation(details);
            setLoading(false);
        } catch (error: any) {
            console.error("Error loading invitation:", error);
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
            await acceptInvitation(token!, {
                username: formData.username,
                password: formData.password,
                full_name: formData.full_name
            });

            setSuccess(true);
            toast.success("¡Cuenta creada exitosamente!");

            setTimeout(() => {
                navigate("/login");
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
                        <p className="text-sm text-muted-foreground">{uiText("Cargando invitación...")}</p>
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
                        <CardTitle className="text-center text-red-600">{uiText("Error")}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => navigate("/login")}>{uiText("Ir al Login")}</Button>
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
                        <h2 className="text-2xl font-bold text-green-600 mb-2">{uiText("¡Cuenta Creada!")}</h2>
                        <p className="text-muted-foreground">{uiText("Redirigiendo al inicio de sesión...")}</p>
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
                    <CardTitle className="text-2xl text-center">{uiText("Bienvenido a AI Sysadmin Agent")}</CardTitle>
                    <CardDescription className="text-center">{uiText("Has sido invitado a crear una cuenta")}{invitation?.organization_name && (
                            <>{" "}{uiText("para")}{" "}<strong>{invitation.organization_name}</strong></>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">{uiText("Email (pre-asignado)")}</label>
                            <Input
                                type="email"
                                value={invitation?.email || ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">{uiText("Nombre Completo")}</label>
                            <Input
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="Juan Pérez"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">{uiText("Nombre de Usuario")}</label>
                            <Input
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="juanperez"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">{uiText("Contraseña")}</label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={uiText("Mínimo 6 caracteres")}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">{uiText("Confirmar Contraseña")}</label>
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
                                    <strong>{uiText("Rol asignado:")}</strong> {invitation.role}
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
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{uiText("Creando cuenta...")}</>
                            ) : (
                                uiText("Crear Cuenta")
                            )}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <p className="text-sm text-muted-foreground">{uiText("¿Ya tienes una cuenta?")}{" "}
                            <a href="/#/login" className="text-blue-600 hover:underline">{uiText("Iniciar sesión")}</a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
