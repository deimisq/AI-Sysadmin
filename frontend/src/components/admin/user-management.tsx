"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAllUsers, createUser, updateUserAdmin, deleteUser, fetchGroups, grantGroupAccess, revokeGroupAccess, fetchUserGroups } from "@/lib/api";
import { Users, Edit2, Trash2, Shield, FolderOpen, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface UserManagementProps {
    currentUser: any;
}

export function UserManagement({ currentUser }: UserManagementProps) {
    const { t } = useI18n();
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, groupsData] = await Promise.all([
                fetchAllUsers(),
                fetchGroups()
            ]);
            setUsers(usersData);
            setGroups(groupsData);
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
            await updateUserAdmin(editingUser.id, {
                email: editingUser.email,
                username: editingUser.username,
                full_name: editingUser.full_name,
                role: editingUser.role,
                is_active: editingUser.is_active,
            });

            await loadData();
            setEditingUser(null);
            alert(t.userManagement.userUpdated);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to update user");
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.username || !newUser.password) {
            alert("Email, username, and password are required");
            return;
        }

        try {
            await createUser(newUser);
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
            alert(t.userManagement.userCreated);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to create user");
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm(t.userManagement.confirmDelete)) return;

        try {
            await deleteUser(userId);
            await loadData();
            alert(t.userManagement.userDeleted);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to delete user");
        }
    };

    const handleManagePermissions = async (user: any) => {
        setManagingPermissions(user);
        try {
            const userGroupsData = await fetchUserGroups(user.id);
            setUserGroups(userGroupsData);
        } catch (error) {
            console.error("Failed to load user groups", error);
        }
    };

    const handleGrantAccess = async (groupId: number, role: string = "user") => {
        if (!managingPermissions) return;

        try {
            await grantGroupAccess(managingPermissions.id, groupId, role);
            const userGroupsData = await fetchUserGroups(managingPermissions.id);
            setUserGroups(userGroupsData);
            alert("Access granted successfully");
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to grant access");
        }
    };

    const handleRevokeAccess = async (groupId: number) => {
        if (!managingPermissions) return;

        try {
            await revokeGroupAccess(managingPermissions.id, groupId);
            const userGroupsData = await fetchUserGroups(managingPermissions.id);
            setUserGroups(userGroupsData);
            alert("Access revoked successfully");
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to revoke access");
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
        return <div>{t.userManagement.loading}</div>;
    }

    // Create User Form
    if (creatingUser) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t.userManagement.createUser}</CardTitle>
                    <CardDescription>Add a new user to the system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium">{t.userManagement.email} *</label>
                            <Input
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="user@example.com"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">{t.userManagement.username} *</label>
                            <Input
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                placeholder="username"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">{t.userManagement.password} *</label>
                            <Input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">{t.userManagement.fullName}</label>
                            <Input
                                value={newUser.full_name}
                                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">{t.userManagement.role}</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            >
                                <option value="user">User</option>
                                <option value="group_admin">Group Admin</option>
                                <option value="admin">Admin</option>
                                {currentUser.role === "superadmin" && (
                                    <option value="superadmin">Superadmin</option>
                                )}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newUser.is_active}
                                onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <label className="text-sm font-medium">{t.userManagement.active}</label>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCreateUser}>{t.userManagement.createUser}</Button>
                        <Button variant="outline" onClick={() => setCreatingUser(false)}>{t.userManagement.cancel}</Button>
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
                    <CardTitle>{t.userManagement.editUser}: {editingUser.username}</CardTitle>
                    <CardDescription>Update user information and role</CardDescription>
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
                            <label className="text-sm font-medium">Username</label>
                            <Input
                                value={editingUser.username}
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                value={editingUser.full_name || ""}
                                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Role</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                            >
                                <option value="user">User</option>
                                <option value="group_admin">Group Admin</option>
                                <option value="admin">Admin</option>
                                {currentUser.role === "superadmin" && (
                                    <option value="superadmin">Superadmin</option>
                                )}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={editingUser.is_active}
                                onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <label className="text-sm font-medium">Active</label>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveUser}>{t.userManagement.save}</Button>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>{t.userManagement.cancel}</Button>
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
                    <CardTitle>{t.userManagement.managePermissions}: {managingPermissions.username}</CardTitle>
                    <CardDescription>{t.userManagement.manageRolesDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-medium mb-2">{t.userManagement.currentGroups}</h3>
                        {userGroups.length > 0 ? (
                            <div className="space-y-2">
                                {userGroups.map((group: any) => (
                                    <div key={group.id} className="flex items-center justify-between p-3 border rounded">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color || "#888" }} />
                                            <div className="flex-1">
                                                <span className="font-medium">{group.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-muted-foreground">{t.userManagement.roleLabel}:</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${group.role === 'group_admin'
                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        }`}>
                                                        {group.role === 'group_admin' ? t.userManagement.roleGroupAdmin : t.userManagement.roleUser}
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
                            <p className="text-sm text-muted-foreground">{t.userManagement.noGroupsAssigned}</p>
                        )}
                    </div>

                    <div>
                        <h3 className="font-medium mb-2">{t.userManagement.availableGroups}</h3>
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
                                                {t.userManagement.grantAsUser}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleGrantAccess(group.id, "group_admin")}
                                                className="border-purple-500 text-purple-700 hover:bg-purple-50"
                                            >
                                                <Shield className="h-4 w-4 mr-1" />
                                                {t.userManagement.grantAsAdmin}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">{t.userManagement.allGroupsAssigned}</p>
                        )}
                    </div>

                    <Button variant="outline" onClick={() => setManagingPermissions(null)}>{t.common.close}</Button>
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
                            {t.userManagement.title}
                        </CardTitle>
                        <CardDescription>Manage system users and their permissions</CardDescription>
                    </div>
                    <Button onClick={() => setCreatingUser(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t.userManagement.createUser}
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
                                            {t.userManagement.inactive}
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
                                    Groups
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                {currentUser.role === "superadmin" && user.id !== currentUser.id && (
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
