import { uiText } from '../../lib/ui-language';
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchInvitations, createInvitation, deleteInvitation, fetchOrganizations } from "@/lib/api";
import { Mail, Trash2, Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import type { Organization } from "@/lib/api";

interface InvitationManagementProps {
    currentUser?: any;
}

export function InvitationManagement({ currentUser }: InvitationManagementProps) {
    const [invitations, setInvitations] = useState<any[]>([]);
    const [, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newInvite, setNewInvite] = useState<any>({
        email: "",
        role: "user",
        organization_id: ""
    });
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [lastCreatedToken, setLastCreatedToken] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [invitesData] = await Promise.all([
                fetchInvitations()
            ]);
            setInvitations(invitesData);

            if (currentUser?.role === 'superadmin') {
                fetchOrganizations().then(setOrganizations).catch(console.error);
            }
        } catch (error) {
            console.error("Failed to load invitations", error);
            toast.error("Error al cargar invitaciones");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newInvite.email) {
            toast.error("Email requerido");
            return;
        }

        try {
            const payload: any = {
                email: newInvite.email,
                role: newInvite.role
            };

            if (newInvite.organization_id) {
                payload.organization_id = parseInt(newInvite.organization_id);
            }

            const res = await createInvitation(payload);
            setLastCreatedToken(res.token);

            await loadData();
            setCreating(false);
            setNewInvite({ email: "", role: "user", organization_id: "" });
            toast.success("Invitación creada");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al crear invitación");
        }
    };

    const handleDelete = async (id: number) => {
        if (!await confirmDialog(uiText("¿Eliminar invitación?"))) return;
        try {
            await deleteInvitation(id);
            await loadData();
            toast.success("Invitación eliminada");
        } catch (error: any) {
            toast.error(uiText("Error al eliminar"));
        }
    };

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(token);
        toast.success("Token copiado al portapapeles");
    };

    const getOrgName = (id: number) => {
        const org = organizations.find(o => o.id === id);
        return org ? org.name : id;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />{uiText("Invitaciones Pendientes")}</CardTitle>
                        <CardDescription>{uiText("Gestionar invitaciones de acceso para nuevos usuarios")}</CardDescription>
                    </div>
                    <Button onClick={() => setCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" />{uiText("Nueva Invitación")}</Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Creation Form */}
                {creating && (
                    <div className="bg-muted/30 p-4 rounded-lg border mb-4 space-y-4">
                        <h3 className="font-medium text-sm">{uiText("Nueva Invitación")}</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-xs font-medium">Email</label>
                                <Input
                                    value={newInvite.email}
                                    onChange={e => setNewInvite({ ...newInvite, email: e.target.value })}
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium">{uiText("Rol")}</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newInvite.role}
                                    onChange={e => setNewInvite({ ...newInvite, role: e.target.value })}
                                >
                                    <option value="user">{uiText("Usuario")}</option>
                                    <option value="admin">Admin</option>
                                    <option value="group_admin">{uiText("Admin de Grupo")}</option>
                                </select>
                            </div>
                            {currentUser?.role === 'superadmin' && (
                                <div className="col-span-2">
                                    <label className="text-xs font-medium">{uiText("Organización")}</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newInvite.organization_id}
                                        onChange={e => setNewInvite({ ...newInvite, organization_id: e.target.value })}
                                    >
                                        <option value="">{uiText("(Asignar a mi organización)")}</option>
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setCreating(false)}>{uiText("Cancelar")}</Button>
                            <Button size="sm" onClick={handleCreate}>{uiText("Generar Invitación")}</Button>
                        </div>
                    </div>
                )}

                {/* Last Token Display */}
                {lastCreatedToken && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">{uiText("Invitación Creada Exitosamente")}</p>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">{uiText("Comparte este token o enlace con el usuario:")}</p>
                            <code className="text-xs bg-white dark:bg-black/20 px-2 py-1 rounded mt-1 block select-all">{lastCreatedToken}</code>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => copyToken(lastCreatedToken)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* List */}
                <div className="space-y-2">
                    {invitations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">{uiText("No hay invitaciones pendientes.")}</p>
                    ) : (
                        invitations.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{invite.email}</span>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded dark:bg-blue-900 dark:text-blue-200">{invite.role}</span>
                                        {invite.organization_id && (
                                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded border">
                                                {currentUser?.role === 'superadmin' ? getOrgName(invite.organization_id) : 'Org'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                                        <span>{uiText("Expira:")}{" "}{new Date(invite.expires_at).toLocaleDateString()}</span>
                                        <span className="font-mono bg-muted px-1 rounded select-all" title="Token">{invite.token?.substring(0, 8) || 'N/A'}...</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => copyToken(invite.token)} title="Copiar Token">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(invite.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
