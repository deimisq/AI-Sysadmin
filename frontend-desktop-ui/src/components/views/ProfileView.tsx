import { uiText, uiFormat } from '../../lib/ui-language';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Settings, Save, Loader2, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
// import DashboardLayout from "@/components/dashboard-layout";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface UserProfile {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
}

export function ProfileView() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);

    // Profile form
    const [profileForm, setProfileForm] = useState({
        full_name: "",
        email: ""
    });

    // Password form
    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: ""
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const loadProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                setProfileForm({
                    full_name: userData.full_name || "",
                    email: userData.email || ""
                });
            } else if (res.status === 401) {
                // Token expired
                localStorage.removeItem("token");
                navigate("/login");
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
            toast.error("Error al cargar perfil");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/users/me`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(profileForm)
            });

            if (res.ok) {
                toast.success("Perfil actualizado correctamente");
                loadProfile();
            } else {
                const error = await res.json();
                toast.error(uiFormat("Error: {0}", error.detail || "No se pudo actualizar el perfil"));
            }
        } catch (error: any) {
            toast.error(uiFormat("Error: {0}", error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        if (passwordForm.new_password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/users/me/password`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    current_password: passwordForm.current_password,
                    new_password: passwordForm.new_password
                })
            });

            if (res.ok) {
                toast.success("Contraseña cambiada correctamente");
                setPasswordForm({
                    current_password: "",
                    new_password: "",
                    confirm_password: ""
                });
            } else {
                const error = await res.json();
                toast.error(uiFormat("Error: {0}", error.detail || "No se pudo cambiar la contraseña"));
            }
        } catch (error: any) {
            toast.error(uiFormat("Error: {0}", error.message));
        } finally {
            setSaving(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            superadmin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
            admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            user: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        };

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[role.toLowerCase()] || "bg-gray-100"}`}>
                {role}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-8">
                <p className="text-muted-foreground">{uiText("No se pudo cargar el perfil")}</p>
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{uiText("Mi Perfil")}</h1>
                    <p className="text-muted-foreground">{uiText("Administra tu información personal y preferencias")}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* User Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />{uiText("Información de Usuario")}</CardTitle>
                            <CardDescription>{uiText("Información básica de tu cuenta")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">{uiText("Usuario")}</Label>
                                <Input
                                    id="username"
                                    value={user.username}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">{uiText("El nombre de usuario no se puede cambiar")}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                        placeholder="tu@email.com"
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="full_name">{uiText("Nombre Completo")}</Label>
                                <Input
                                    id="full_name"
                                    value={profileForm.full_name}
                                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                    placeholder="Juan Pérez"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{uiText("Rol")}</Label>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    {getRoleBadge(user.role)}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{uiText("Miembro desde")}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(user.created_at).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>

                            <Button
                                onClick={handleUpdateProfile}
                                disabled={saving}
                                className="w-full"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{uiText("Guardando...")}</>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />{uiText("Guardar Cambios")}</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Change Password Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />{uiText("Cambiar Contraseña")}</CardTitle>
                            <CardDescription>{uiText("Actualiza tu contraseña de acceso")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current_password">{uiText("Contraseña Actual")}</Label>
                                <Input
                                    id="current_password"
                                    type="password"
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new_password">{uiText("Nueva Contraseña")}</Label>
                                <Input
                                    id="new_password"
                                    type="password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                    placeholder="••••••••"
                                />
                                <p className="text-xs text-muted-foreground">{uiText("Mínimo 6 caracteres")}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm_password">{uiText("Confirmar Nueva Contraseña")}</Label>
                                <Input
                                    id="confirm_password"
                                    type="password"
                                    value={passwordForm.confirm_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>

                            <Button
                                onClick={handleChangePassword}
                                disabled={saving || !passwordForm.current_password || !passwordForm.new_password}
                                className="w-full"
                                variant="outline"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{uiText("Cambiando...")}</>
                                ) : (
                                    <>
                                        <Lock className="mr-2 h-4 w-4" />{uiText("Cambiar Contraseña")}</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preferences Card */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />{uiText("Preferencias")}</CardTitle>
                            <CardDescription>{uiText("Configura la apariencia y el comportamiento de la aplicación")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">{uiText("Tema de la aplicación")}</p>
                                    <p className="text-sm text-muted-foreground">{uiText("El tema se cambia desde el botón en la barra superior")}</p>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted">
                                    <span className="text-sm">{uiText("☀️ Claro / 🌙 Oscuro")}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">{uiText("Idioma")}</p>
                                    <p className="text-sm text-muted-foreground">{uiText("Idioma de la interfaz de usuario")}</p>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted">
                                    <span className="text-sm">{uiText("🇪🇸 Español")}</span>
                                </div>
                            </div>

                            <div className="p-4 border rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground">
                                    💡 <strong>Tip:</strong>{uiText("Más opciones de preferencias se agregarán en futuras actualizaciones.")}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
