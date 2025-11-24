"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ServerList } from "@/components/server-list";
import { AddServerForm } from "@/components/add-server-form";
import { ConversationalChat } from "@/components/conversational-chat";
import { GroupManager } from "@/components/group-manager";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { PlusCircle, Server as ServerIcon, FolderOpen, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export default function Dashboard() {
    const router = useRouter();
    const { t } = useI18n();
    const [selectedServer, setSelectedServer] = useState<any>(null);
    const [editingServer, setEditingServer] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showGroupManager, setShowGroupManager] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        } else {
            setIsAuthenticated(true);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/login");
    };

    const handleServerAdded = () => {
        setShowAddForm(false);
        setEditingServer(null);
        setRefreshKey(prev => prev + 1);
    };

    const handleEdit = (server: any) => {
        setEditingServer(server);
        setShowAddForm(true);
    };

    const handleCancelEdit = () => {
        setEditingServer(null);
        setShowAddForm(false);
    };

    const toggleAddForm = () => {
        if (showAddForm) {
            setShowAddForm(false);
            setEditingServer(null);
        } else {
            setEditingServer(null);
            setShowAddForm(true);
        }
    };

    const handleGroupManagerClose = () => {
        setShowGroupManager(false);
        setRefreshKey(prev => prev + 1);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between border-b pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <ServerIcon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{t.header.title}</h1>
                            <p className="text-muted-foreground">{t.header.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <LanguageSwitcher />
                        <Button variant="outline" onClick={() => setShowGroupManager(true)}>
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Manage Groups
                        </Button>
                        <Button onClick={toggleAddForm}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {showAddForm ? t.common.cancel : t.header.addServer}
                        </Button>
                        <Button variant="destructive" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid gap-8">
                    {showGroupManager && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <GroupManager onClose={handleGroupManagerClose} />
                        </div>
                    )}

                    {showAddForm && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <AddServerForm
                                onServerAdded={handleServerAdded}
                                initialData={editingServer}
                                onCancel={handleCancelEdit}
                            />
                        </div>
                    )}

                    {selectedServer ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <ConversationalChat
                                server={selectedServer}
                                onClose={() => setSelectedServer(null)}
                            />
                        </div>
                    ) : (
                        <ServerList
                            key={refreshKey}
                            onDiagnose={setSelectedServer}
                            onEdit={handleEdit}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
