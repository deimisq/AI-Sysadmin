"use client";

import { useState, useEffect } from "react";
import { fetchGroups, createGroup, updateGroup, deleteGroup } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, Plus, Trash2, Edit2, X } from "lucide-react";

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
            } else {
                await createGroup(formData);
            }

            setFormData({ name: "", description: "", color: PRESET_COLORS[0] });
            setEditingGroup(null);
            setShowForm(false);
            await loadGroups();
        } catch (error) {
            console.error("Failed to save group", error);
            alert("Failed to save group. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (groupId: number) => {
        if (!confirm("Are you sure you want to delete this group?")) {
            return;
        }

        try {
            await deleteGroup(groupId);
            await loadGroups();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to delete group");
        }
    };

    const handleCancel = () => {
        setFormData({ name: "", description: "", color: PRESET_COLORS[0] });
        setEditingGroup(null);
        setShowForm(false);
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Manage Server Groups
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add/Edit Form */}
                {showForm ? (
                    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-semibold">
                            {editingGroup ? "Edit Group" : "Create New Group"}
                        </h3>
                        <Input
                            placeholder="Group Name *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            placeholder="Description (optional)"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Color</label>
                            <div className="flex gap-2">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? "border-foreground" : "border-transparent"
                                            }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setFormData({ ...formData, color })}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : editingGroup ? "Update" : "Create"}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Group
                    </Button>
                )}

                {/* Groups List */}
                <div className="space-y-2">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full"
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
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleDelete(group.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {groups.length === 0 && !showForm && (
                        <div className="text-center p-10 text-muted-foreground">
                            No groups yet. Create one to organize your servers.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
