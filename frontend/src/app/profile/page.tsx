"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCurrentUser, updateUserAdmin, fetchUserGroups } from "@/lib/api";
import { User, Shield, FolderOpen, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userGroups, setUserGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        username: "",
        full_name: "",
        password: "",
        confirmPassword: "",
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const user = await fetchCurrentUser();
            setCurrentUser(user);
            setFormData({
                email: user.email || "",
                username: user.username || "",
                full_name: user.full_name || "",
                password: "",
                confirmPassword: "",
            });

            // Load user's groups
            try {
                const groups = await fetchUserGroups(user.id);
                setUserGroups(groups);
            } catch (groupError) {
                console.error("Failed to load user groups", groupError);
                // Don't fail the whole page if groups fail to load
            }
        } catch (error: any) {
            console.error("Failed to load user data", error);
            if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
                localStorage.removeItem("token");
                router.push("/login");
            } else {
                alert("Failed to load profile data. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password && formData.password !== formData.confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        setSaving(true);
        try {
            const updateData: any = {
                email: formData.email,
                username: formData.username,
                full_name: formData.full_name,
            };

            if (formData.password) {
                updateData.password = formData.password;
            }

            await updateUserAdmin(currentUser.id, updateData);
            alert("Profile updated successfully");

            // Reload user data
            await loadUserData();
            setFormData({ ...formData, password: "", confirmPassword: "" });
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "superadmin": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
            case "admin": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
            case "group_admin": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
        }
    };

    return (
        <main className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.push("/dashboard")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">My Profile</h1>
                        <p className="text-muted-foreground">Manage your account settings</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Profile Information */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Information
                            </CardTitle>
                            <CardDescription>Update your personal information</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium">Email</label>
                                        <Input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Username</label>
                                        <Input
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium">Full Name</label>
                                        <Input
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-medium mb-4">Change Password</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-medium">New Password</label>
                                            <Input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="Leave blank to keep current"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Confirm Password</label>
                                            <Input
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" disabled={saving}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Role & Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Role & Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Role</label>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(currentUser?.role)}`}>
                                        {currentUser?.role || "user"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Status</label>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentUser?.is_active
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        }`}>
                                        {currentUser?.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Member Since</label>
                                <p className="mt-1 text-sm">
                                    {new Date(currentUser?.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assigned Groups */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FolderOpen className="h-5 w-5" />
                                Assigned Groups
                            </CardTitle>
                            <CardDescription>Server groups you have access to</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {userGroups.length > 0 ? (
                                <div className="space-y-2">
                                    {userGroups.map((group) => (
                                        <div
                                            key={group.id}
                                            className="flex items-center gap-2 p-2 border rounded-lg"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: group.color || "#888" }}
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{group.name}</p>
                                                {group.description && (
                                                    <p className="text-xs text-muted-foreground">{group.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No groups assigned</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
