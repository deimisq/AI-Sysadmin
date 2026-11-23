import { uiText } from '../../lib/ui-language';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchGroups, createGroup, updateGroup, deleteGroup, fetchOrganizations } from "@/lib/api";
import { Edit2, Trash2, Plus, Folder } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import type { Organization } from "@/lib/api";

interface GroupManagementProps {
    currentUser?: any;
}

export function GroupManagement({ currentUser }: GroupManagementProps) {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [newGroup, setNewGroup] = useState<any>({
        name: "",
        description: "",
        color: "#3b82f6", // Default blue
        organization_id: ""
    });
    const [organizations, setOrganizations] = useState<Organization[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [groupsData] = await Promise.all([
                fetchGroups()
            ]);
            setGroups(groupsData);

            if (currentUser?.role === 'superadmin') {
                const orgsData = await fetchOrganizations();
                setOrganizations(orgsData);
            }
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newGroup.name) {
            toast.error("El nombre del grupo es requerido");
            return;
        }

        try {
            const payload: any = {
                name: newGroup.name,
                description: newGroup.description,
                color: newGroup.color
            };

            if (newGroup.organization_id) {
                payload.organization_id = parseInt(newGroup.organization_id);
            }

            await createGroup(payload);
            await loadData();
            setCreatingGroup(false);
            setNewGroup({ name: "", description: "", color: "#3b82f6", organization_id: "" });
            toast.success("Grupo creado correctamente");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al crear grupo");
        }
    };

    const handleUpdate = async () => {
        if (!editingGroup) return;

        try {
            await updateGroup(editingGroup.id, {
                name: editingGroup.name,
                description: editingGroup.description,
                color: editingGroup.color,
                organization_id: editingGroup.organization_id ? parseInt(editingGroup.organization_id) : undefined
            });
            await loadData();
            setEditingGroup(null);
            toast.success("Grupo actualizado correctamente");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al actualizar grupo");
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirmDialog(uiText("¿Estás seguro de eliminar este grupo? Los servidores en este grupo quedarán sin asignar."))) return;

        try {
            await deleteGroup(id);
            await loadData();
            toast.success("Grupo eliminado");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || uiText("Error al eliminar grupo"));
        }
    };

    const getOrganizationName = (orgId: number) => {
        const org = organizations.find(o => o.id === orgId);
        return org ? org.name : "Desconocida";
    };

    if (loading) return <div>{uiText("Cargando grupos...")}</div>;

    if (creatingGroup) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{uiText("Nuevo Grupo")}</CardTitle>
                    <CardDescription>{uiText("Crear un nuevo grupo de servidores")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">{uiText("Nombre")}</label>
                            <Input
                                value={newGroup.name}
                                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                placeholder="Servidores Web"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Color</label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={newGroup.color}
                                    onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    value={newGroup.color}
                                    onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                                    maxLength={7}
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">{uiText("Descripción")}</label>
                            <Input
                                value={newGroup.description}
                                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                placeholder="Descripción del grupo"
                            />
                        </div>
                        {currentUser?.role === "superadmin" && (
                            <div className="col-span-2">
                                <label className="text-sm font-medium">{uiText("Organización")}</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newGroup.organization_id || ""}
                                    onChange={(e) => setNewGroup({ ...newGroup, organization_id: e.target.value })}
                                >
                                    <option value="">{uiText("(Tu organización actual / Sin asignar)")}</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">{uiText("Si no se selecciona, se asignará a tu organización actual.")}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreate}>{uiText("Crear Grupo")}</Button>
                        <Button variant="outline" onClick={() => setCreatingGroup(false)}>{uiText("Cancelar")}</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (editingGroup) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{uiText("Editar Grupo:")}{" "}{editingGroup.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">{uiText("Nombre")}</label>
                            <Input
                                value={editingGroup.name}
                                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Color</label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={editingGroup.color || "#3b82f6"}
                                    onChange={(e) => setEditingGroup({ ...editingGroup, color: e.target.value })}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    value={editingGroup.color || "#3b82f6"}
                                    onChange={(e) => setEditingGroup({ ...editingGroup, color: e.target.value })}
                                    maxLength={7}
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium">{uiText("Descripción")}</label>
                            <Input
                                value={editingGroup.description || ""}
                                onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                            />
                        </div>
                        {currentUser?.role === "superadmin" && (
                            <div className="col-span-2">
                                <label className="text-sm font-medium">{uiText("Organización")}</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editingGroup.organization_id || ""}
                                    onChange={(e) => setEditingGroup({ ...editingGroup, organization_id: e.target.value })}
                                >
                                    <option value="">{uiText("(Tu organización actual / Sin asignar)")}</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">{uiText("Cambiar la organización puede afectar la visibilidad para otros usuarios.")}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleUpdate}>{uiText("Guardar Cambios")}</Button>
                        <Button variant="outline" onClick={() => setEditingGroup(null)}>{uiText("Cancelar")}</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Folder className="h-5 w-5" />{uiText("Grupos de Servidores")}</CardTitle>
                        <CardDescription>{uiText("Organizar servidores en grupos lógicos")}</CardDescription>
                    </div>
                    <Button onClick={() => setCreatingGroup(true)}>
                        <Plus className="mr-2 h-4 w-4" />{uiText("Nuevo Grupo")}</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {groups.map((group) => (
                        <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full border border-gray-200"
                                        style={{ backgroundColor: group.color || "#3b82f6" }}
                                    />
                                    <h3 className="font-medium">{group.name}</h3>
                                    {group.organization_id && currentUser?.is_superuser && (
                                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border">
                                            {getOrganizationName(group.organization_id)}
                                        </span>
                                    )}
                                </div>
                                {group.description && (
                                    <p className="text-sm text-muted-foreground ml-7 mt-1">{group.description}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingGroup(group)}>
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(group.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">{uiText("No hay grupos creados.")}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
