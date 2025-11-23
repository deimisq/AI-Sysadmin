"use client";

import { useState } from "react";
import { ServerList } from "@/components/server-list";
import { AddServerForm } from "@/components/add-server-form";
import { ConversationalChat } from "@/components/conversational-chat";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { PlusCircle, Server as ServerIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export default function Home() {
    const { t } = useI18n();
    const [selectedServer, setSelectedServer] = useState<any>(null);
    const [editingServer, setEditingServer] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleServerAdded = () => {
        setShowAddForm(false);
        setEditingServer(null);
        setRefreshKey(prev => prev + 1); // Trigger re-fetch
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
                        <Button onClick={toggleAddForm}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {showAddForm ? t.common.cancel : t.header.addServer}
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid gap-8">
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
