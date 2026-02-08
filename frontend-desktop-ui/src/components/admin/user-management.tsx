import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Edit2, Trash2, Shield, FolderOpen, Plus, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { fetchOrganizations } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface UserManagementProps {
    currentUser?: any;
}

export function UserManagement({ currentUser }: UserManagementProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [newUser, setNewUser] = useState<any>({
        email: "",
        username: "",
        password: "",
        full_name: "",
        role: "user",
        is_active: true
    });
    const [managingPermissions, setManagingPermissions] = useState<any>(null);
    const [userGroups, setUserGroups] = useState<any[]>([]);
    const [organizationsList, setOrganizationsList] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    };

    const loadData = async () => {
        try {
            const promises: Promise<any>[] = [
                fetch(`${API_BASE_URL}/admin/users`, { headers: getAuthHeaders() }).then(r => r.json()),
                fetch(`${API_BASE_URL}/groups/`, { headers: getAuthHeaders() }).then(r => r.json())
            ];

            if (currentUser?.role === 'superadmin') {
                promises.push(fetchOrganizations());
            }

            const [usersData, groupsData, orgsData] = await Promise.all(promises);

            setUsers(usersData || []);
            setGroups(groupsData || []);
            if (orgsData) setOrganizationsList(orgsData);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: any) => {
        setEditingUser({ ...user });
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        try {
            const updatePayload: any = {
                email: editingUser.email,
                username: editingUser.username,
                full_name: editingUser.full_name,
                role: editingUser.role,
                is_active: editingUser.is_active,
                organization_id: editingUser.organization_id ? parseInt(editingUser.organization_id) : null
            };

            // Only include password if it was changed
            if (editingUser.newPassword && editingUser.newPassword.trim()) {
                updatePayload.password = editingUser.newPassword;
            }

            const res = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(updatePayload)
            });

            if (!res.ok) {
                const error = (await res.json()) as any;
                throw new Error(error.detail || "Error updating user");
            }

            await loadData();
            setEditingUser(null);
            toast.success("Usuario actualizado correctamente");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al actualizar usuario");
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.username || !newUser.password) {
            toast.error("Email, usuario y contraseña son requeridos");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(newUser)
            });

            if (!res.ok) {
                const error = (await res.json()) as any;
                throw new Error(error.detail || "Error creating user");
            }

            await loadData();
            setCreatingUser(false);
            setNewUser({
                email: "",
                username: "",
                password: "",
                full_name: "",
                role: "user",
                is_active: true
            });
            toast.success("Usuario creado exitosamente");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al crear usuario");
        }
    };

    const handleDeleteUser = async (userId: number) => {
        const confirmed = window.confirm("¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.");
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error("Error deleting user");

            await loadData();
            toast.success("Usuario eliminado");
        } catch (error: any) {
            console.error(error);
            toast.error("Error al eliminar usuario");
        }
    };

    const fetchUserGroups = async (userId: number) => {
        const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/groups`, {
            headers: getAuthHeaders()
        });
        if (res.ok) return await res.json();
        return [];
    };

    const handleManagePermissions = async (user: any) => {
        setManagingPermissions(user);
        try {
            const groupsData = await fetchUserGroups(user.id);
            setUserGroups(groupsData);
        } catch (error) {
            console.error("Failed to load user groups", error);
        }
    };

    const handleGrantAccess = async (groupId: number, role: string = "user") => {
        if (!managingPermissions) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${managingPermissions.id}/groups/${groupId}/grant?role=${role}`, {
                method: "POST",
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error("Error granting access");

            const groupsData = await fetchUserGroups(managingPermissions.id);
            setUserGroups(groupsData);
            toast.success("Acceso concedido");
        } catch (error: any) {
            console.error(error);
            toast.error("Error al conceder acceso");
        }
    };

    const handleRevokeAccess = async (groupId: number) => {
        if (!managingPermissions) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${managingPermissions.id}/groups/${groupId}/revoke`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error("Error revoking access");

            const groupsData = await fetchUserGroups(managingPermissions.id);
            setUserGroups(groupsData);
            toast.success("Acceso revocado");
        } catch (error: any) {
            console.error(error);
            toast.error("Error al revocar acceso");
        }
    };

    const handleSendApprovalNotification = async (user: any) => {
        const confirmed = window.confirm(`¿Enviar notificación de aprobación a ${user.email}?`);
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}/send-approval-notification`, {
                method: "POST",
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                const error = (await res.json()) as any;
                throw new Error(error.detail || "Failed to send notification");
            }

            const result = await res.json();
            toast.success(result.message || "Notificación enviada");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error enviando notificación");
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "superadmin": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
            case "admin": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
            case "group_admin": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
        }
    };

    if (loading) {
        return <div>Cargando usuarios...</div>;
    }

    // Create User Form
    if (creatingUser) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Crear Usuario</CardTitle>
                    <CardDescription>Añadir un nuevo usuario al sistema</CardDescription>
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
                                placeholder="username"
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
                                {currentUser?.role === "superadmin" && (
                                    <option value="superadmin">Superadmin</option>
                                )}
                            </select>
                        </div>
                        {currentUser?.role === "superadmin" && (
                            <div>
                                <label className="text-sm font-medium">Organización</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newUser.organization_id || ""}
                                    onChange={(e) => setNewUser({ ...newUser, organization_id: e.target.value ? parseInt(e.target.value) : undefined })}
                                >
                                    <option value="">(Tu organización actual)</option>
                                    {organizationsList.map((org) => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
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
                        <Button onClick={handleCreateUser}>Crear</Button>
                        <Button variant="outline" onClick={() => setCreatingUser(false)}>Cancelar</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Edit User Modal
    if (editingUser) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Editar Usuario: {editingUser.username}</CardTitle>
                    <CardDescription>Actualizar información y rol del usuario</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                value={editingUser.email}
                                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Usuario</label>
                            <Input
                                value={editingUser.username}
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Nombre Completo</label>
                            <Input
                                value={editingUser.full_name || ""}
                                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Nueva Contraseña (opcional)</label>
                            <Input
                                type="password"
                                placeholder="Dejar vacío para no cambiar"
                                value={editingUser.newPassword || ""}
                                onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Solo completar si desea cambiar la contraseña del usuario
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Rol</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                            >
                                <option value="user">Usuario</option>
                                <option value="group_admin">Admin de Grupo</option>
                                <option value="admin">Administrador</option>
                                {currentUser?.role === "superadmin" && (
                                    <option value="superadmin">Superadmin</option>
                                )}
                            </select>
                        </div>
                        {currentUser?.role === "superadmin" && (
                            <div>
                                <label className="text-sm font-medium">Organización</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editingUser.organization_id || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, organization_id: e.target.value ? parseInt(e.target.value) : undefined })}
                                >
                                    <option value="">(Sin asignar)</option>
                                    {organizationsList.map((org) => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={editingUser.is_active}
                                onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <label className="text-sm font-medium">Activo</label>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveUser}>Guardar</Button>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Manage Permissions Modal
    if (managingPermissions) {
        const userGroupIds = userGroups.map(g => g.id);
        const availableGroups = groups.filter(g => !userGroupIds.includes(g.id));

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Gestionar Permisos: {managingPermissions.username}</CardTitle>
                    <CardDescription>Asignar acceso a grupos de servidores</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                    <div>
                        <h3 className="font-medium mb-2">Grupos Actuales</h3>
                        {userGroups.length > 0 ? (
                            <div className="space-y-2">
                                {userGroups.map((group: any) => (
                                    <div key={group.id} className="flex items-center justify-between p-3 border rounded">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color || "#888" }} />
                                            <div className="flex-1">
                                                <span className="font-medium">{group.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-muted-foreground">Rol:</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${group.role === 'group_admin'
                                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        }`}>
                                                        {group.role === 'group_admin' ? "Admin de Grupo" : "Usuario"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleRevokeAccess(group.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No tiene grupos asignados.</p>
                        )}
                    </div>

                    <div>
                        <h3 className="font-medium mb-2">Grupos Disponibles</h3>
                        {availableGroups.length > 0 ? (
                            <div className="space-y-2">
                                {availableGroups.map((group) => (
                                    <div key={group.id} className="flex items-center justify-between p-3 border rounded">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color || "#888" }} />
                                            <span>{group.name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleGrantAccess(group.id, "user")}
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Usuario
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleGrantAccess(group.id, "group_admin")}
                                                className="border-purple-500 text-purple-700 hover:bg-purple-50"
                                            >
                                                <Shield className="h-4 w-4 mr-1" />
                                                Admin
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Todos los grupos están asignados.</p>
                        )}
                    </div>

                    <Button variant="outline" onClick={() => setManagingPermissions(null)}>Cerrar</Button>
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
                        <CardDescription>Administra usuarios y sus permisos</CardDescription>
                    </div>
                    <Button onClick={() => setCreatingUser(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Usuario
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-300px)] overflow-y-auto">
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
                                    onClick={() => handleManagePermissions(user)}
                                >
                                    <FolderOpen className="h-4 w-4 mr-1" />
                                    Grupos
                                </Button>
                                {user.is_active && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSendApprovalNotification(user)}
                                        title="Enviar email de aprobación de cuenta"
                                    >
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                {currentUser?.role === "superadmin" && user.id !== currentUser?.id && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteUser(user.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
