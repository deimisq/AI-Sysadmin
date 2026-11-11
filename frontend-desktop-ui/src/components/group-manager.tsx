import { uiText } from '../lib/ui-language';
import { useState, useEffect } from "react";
import { fetchGroups, createGroup, updateGroup, deleteGroup } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Plus, Trash2, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServerGroup {
    id: number;
    name: string;
    description?: string;
    color?: string;
}

const PRESET_COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
];

export function GroupManager({ onClose }: { onClose: () => void }) {
    const [groups, setGroups] = useState<ServerGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingGroup, setEditingGroup] = useState<ServerGroup | null>(null);
    const [deletingGroup, setDeletingGroup] = useState<ServerGroup | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: PRESET_COLORS[0],
    });

    useEffect(() => {
        loadGroups();
    }, []);

    useEffect(() => {
        if (editingGroup) {
            setFormData({
                name: editingGroup.name,
                description: editingGroup.description || "",
                color: editingGroup.color || PRESET_COLORS[0],
            });
            setShowForm(true);
        }
    }, [editingGroup]);

    const loadGroups = async () => {
        try {
            const data = await fetchGroups();
            setGroups(data);
        } catch (error) {
            console.error("Failed to load groups", error);
            toast.error(uiText("Error al cargar grupos"));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingGroup) {
                await updateGroup(editingGroup.id, formData);
                toast.success("Grupo actualizado");
            } else {
                await createGroup(formData);
                toast.success("Grupo creado");
            }

            setFormData({ name: "", description: "", color: PRESET_COLORS[0] });
            setEditingGroup(null);
            setShowForm(false);
            await loadGroups();
        } catch (error) {
            console.error("Failed to save group", error);
            toast.error(uiText("Error al guardar grupo"));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingGroup) return;

        try {
            await deleteGroup(deletingGroup.id);
            toast.success("Grupo eliminado");
            await loadGroups();
            setDeletingGroup(null);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || uiText("Error al eliminar grupo"));
        }
    };

    const handleCancel = () => {
        setFormData({ name: "", description: "", color: PRESET_COLORS[0] });
        setEditingGroup(null);
        setShowForm(false);
    };

    return (
        <>
            <Card className="w-full">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />{uiText("Gestión de Grupos")}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} type="button">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add/Edit Form */}
                    {showForm ? (
                        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                            <h3 className="font-semibold">
                                {editingGroup ? uiText("Editar Grupo") : uiText("Crear Grupo")}
                            </h3>
                            <div>
                                <Label>{uiText("Nombre del grupo *")}</Label>
                                <Input
                                    placeholder={uiText("ej., Producción")}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label>{uiText("Descripción")}</Label>
                                <Input
                                    placeholder={uiText("Descripción opcional")}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="flex gap-2">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color
                                                    ? "border-foreground scale-110"
                                                    : "border-transparent hover:scale-105"
                                                }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setFormData({ ...formData, color })}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={loading}>
                                    {loading ? uiText("Guardando...") : editingGroup ? uiText("Actualizar") : uiText("Crear")}
                                </Button>
                                <Button type="button" variant="outline" onClick={handleCancel}>{uiText("Cancelar")}</Button>
                            </div>
                        </form>
                    ) : (
                        <Button onClick={() => setShowForm(true)} type="button">
                            <Plus className="mr-2 h-4 w-4" />{uiText("Crear Nuevo Grupo")}</Button>
                    )}

                    {/* Groups List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {groups.map((group) => (
                            <div
                                key={group.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: group.color || "#888" }}
                                    />
                                    <div>
                                        <div className="font-medium">{group.name}</div>
                                        {group.description && (
                                            <div className="text-sm text-muted-foreground">{group.description}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setEditingGroup(group)}
                                        type="button"
                                        title={uiText("Editar")}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => setDeletingGroup(group)}
                                        type="button"
                                        title={uiText("Eliminar")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {groups.length === 0 && !showForm && (
                            <div className="text-center p-10 text-muted-foreground">
                                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>{uiText("No hay grupos creados")}</p>
                                <p className="text-sm mt-2">{uiText("Crea un grupo para organizar tus servidores")}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{uiText("¿Eliminar grupo?")}</AlertDialogTitle>
                        <AlertDialogDescription>{uiText("Esta acción eliminará el grupo")}<strong>{deletingGroup?.name}</strong>{uiText(". Los servidores en este grupo no serán eliminados, solo desagrupados.")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{uiText("Cancelar")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{uiText("Eliminar")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
