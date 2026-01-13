import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Edit2, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetch } from '@tauri-apps/plugin-http';

const API_URL = import.meta.env.VITE_API_URL;

interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [newUser, setNewUser] = useState({
        email: "",
        username: "",
        password: "",
        full_name: "",
        role: "user",
        is_active: true
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const loadUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (error) {
            console.error("Failed to load users:", error);
            toast.error("Error al cargar usuarios");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.username || !newUser.password) {
            toast.error("Email, usuario y contraseña son requeridos");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(newUser)
            });

            if (res.ok) {
                toast.success("Usuario creado correctamente");
                setCreatingUser(false);
                setNewUser({
                    email: "",
                    username: "",
                    password: "",
                    full_name: "",
                    role: "user",
                    is_active: true
                });
                loadUsers();
            } else {
                const error = await res.json();
                toast.error(`Error: ${error.detail || "No se pudo crear el usuario"}`);
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            if (res.ok) {
                toast.success("Usuario eliminado");
                loadUsers();
            }
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        const colors: Record<string, string> = {
            superadmin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
            admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
            group_admin: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            user: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
        };
        return colors[role] || colors.user;
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    // Create User Form
    if (creatingUser) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Crear Nuevo Usuario</CardTitle>
                    <CardDescription>Agrega un nuevo usuario al sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Email *</label>
                            <Input
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="usuario@ejemplo.com"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Usuario *</label>
                            <Input
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                placeholder="usuario"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Contraseña *</label>
                            <Input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Nombre Completo</label>
                            <Input
                                value={newUser.full_name}
                                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                placeholder="Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Rol</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            >
                                <option value="user">Usuario</option>
                                <option value="group_admin">Admin de Grupo</option>
                                <option value="admin">Administrador</option>
                                <option value="superadmin">Superadministrador</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newUser.is_active}
                                onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <label className="text-sm font-medium">Activo</label>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreateUser}>Crear Usuario</Button>
                        <Button variant="outline" onClick={() => setCreatingUser(false)}>Cancelar</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Users List
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Gestión de Usuarios
                        </CardTitle>
                        <CardDescription>Administra los usuarios del sistema y sus permisos</CardDescription>
                    </div>
                    <Button onClick={() => setCreatingUser(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Usuario
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{user.username}</h3>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                        {user.role}
                                    </span>
                                    {!user.is_active && (
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                            Inactivo
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                {user.full_name && (
                                    <p className="text-sm text-muted-foreground">{user.full_name}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingUser(user)}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
