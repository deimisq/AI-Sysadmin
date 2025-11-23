"use client";

import { useState } from "react";
import { ServerList } from "@/components/server-list";
import { AddServerForm } from "@/components/add-server-form";
import { ConversationalChat } from "@/components/conversational-chat";
import { Button } from "@/components/ui/button";
import { PlusCircle, Server as ServerIcon } from "lucide-react";

export default function Home() {
    const [selectedServer, setSelectedServer] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleServerAdded = () => {
        setShowAddForm(false);
        setRefreshKey(prev => prev + 1); // Trigger re-fetch
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
                            <h1 className="text-3xl font-bold tracking-tight">Sysadmin AI Agent</h1>
                            <p className="text-muted-foreground">Manage your infrastructure with intelligent assistance</p>
                        </div>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {showAddForm ? "Cancel" : "Add Server"}
                    </Button>
                </div>

                {/* Main Content */}
                <div className="grid gap-8">
                    {showAddForm && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <AddServerForm onServerAdded={handleServerAdded} />
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
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
