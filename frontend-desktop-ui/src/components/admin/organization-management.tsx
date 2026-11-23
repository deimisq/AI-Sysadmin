import { uiText } from '../../lib/ui-language';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Edit2, Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import {
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization
} from "@/lib/api";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import type { Organization } from "@/lib/api";

export function OrganizationManagement() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [creatingOrg, setCreatingOrg] = useState(false);
    const [newOrg, setNewOrg] = useState<Partial<Organization>>({
        name: "",
        slug: "",
        subscription_tier: "free",
        max_users: 5
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await fetchOrganizations();
            setOrganizations(data);
        } catch (error) {
            console.error("Failed to load organizations", error);
            toast.error("Error al cargar organizaciones");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newOrg.name || !newOrg.slug) {
            toast.error("Nombre y Slug son requeridos");
            return;
        }

        try {
            await createOrganization(newOrg);
            await loadData();
            setCreatingOrg(false);
            setNewOrg({ name: "", slug: "", subscription_tier: "free", max_users: 5 });
            toast.success("Organización creada correctamente");
        } catch (error: any) {
            console.error(error);
            toast.error("Error al crear organización");
        }
    };

    const handleUpdate = async () => {
        if (!editingOrg) return;

        try {
            await updateOrganization(editingOrg.id, {
                name: editingOrg.name,
                subscription_tier: editingOrg.subscription_tier,
                max_users: editingOrg.max_users
            });
            await loadData();
            setEditingOrg(null);
            toast.success("Organización actualizada correctamente");
        } catch (error: any) {
            console.error(error);
            toast.error("Error al actualizar organización");
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirmDialog(uiText("¿Estás seguro de eliminar esta organización? Esto eliminará todos sus usuarios y datos."))) return;

        try {
            await deleteOrganization(id);
            await loadData();
            toast.success("Organización eliminada");
        } catch (error: any) {
            console.error(error);
            toast.error("Error al eliminar organización");
        }
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    if (loading) return <div>{uiText("Cargando organizaciones...")}</div>;

    if (creatingOrg) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{uiText("Nueva Organización")}</CardTitle>
                    <CardDescription>{uiText("Crear una nueva organización multi-tenant")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">{uiText("Nombre")}</label>
                            <Input
                                value={newOrg.name}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setNewOrg({ ...newOrg, name, slug: generateSlug(name) });
                                }}
                                placeholder="Mi Empresa S.A."
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">{uiText("Slug (URL Friendly)")}</label>
                            <Input
                                value={newOrg.slug}
                                onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                                placeholder="mi-empresa"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">{uiText("Plan de Suscripción")}</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newOrg.subscription_tier}
                                onChange={(e) => setNewOrg({ ...newOrg, subscription_tier: e.target.value })}
                            >
                                <option value="free">{uiText("Gratuito")}</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{uiText("Límite de Usuarios")}</label>
                            <Input
                                type="number"
                                value={newOrg.max_users}
                                onChange={(e) => setNewOrg({ ...newOrg, max_users: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreate}>{uiText("Crear Organización")}</Button>
                        <Button variant="outline" onClick={() => setCreatingOrg(false)}>{uiText("Cancelar")}</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (editingOrg) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{uiText("Editar:")}{" "}{editingOrg.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">{uiText("Nombre")}</label>
                            <Input
                                value={editingOrg.name}
                                onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Plan</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={editingOrg.subscription_tier}
                                onChange={(e) => setEditingOrg({ ...editingOrg, subscription_tier: e.target.value })}
                            >
                                <option value="free">{uiText("Gratuito")}</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{uiText("Límite de Usuarios")}</label>
                            <Input
                                type="number"
                                value={editingOrg.max_users}
                                onChange={(e) => setEditingOrg({ ...editingOrg, max_users: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleUpdate}>{uiText("Guardar Cambios")}</Button>
                        <Button variant="outline" onClick={() => setEditingOrg(null)}>{uiText("Cancelar")}</Button>
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
                            <Building2 className="h-5 w-5" />{uiText("Organizaciones")}</CardTitle>
                        <CardDescription>{uiText("Gestionar tenants y suscripciones")}</CardDescription>
                    </div>
                    <Button onClick={() => setCreatingOrg(true)}>
                        <Plus className="mr-2 h-4 w-4" />{uiText("Nueva Organización")}</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {organizations.map((org) => (
                        <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{org.name}</h3>
                                    <span className={`px-2 py-1 rounded text-xs font-medium 
                                        ${org.subscription_tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                            org.subscription_tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {org.subscription_tier.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    <span>Slug: {org.slug}</span>
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        Max: {org.max_users}{uiText("usuarios")}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingOrg(org)}>
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(org.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {organizations.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">{uiText("No hay organizaciones creadas.")}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
