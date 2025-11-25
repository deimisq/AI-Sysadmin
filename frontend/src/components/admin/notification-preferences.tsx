"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Save, Mail, Shield, Server, Activity } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface NotificationPreferencesProps {
    currentUser: any;
}

export default function NotificationPreferences({ currentUser }: NotificationPreferencesProps) {
    const [preferences, setPreferences] = useState({
        notify_new_users: true,
        notify_security_alerts: true,
        notify_new_servers: false,
        notify_system_events: true
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                headers: {
                    ...(token && { "Authorization": `Bearer ${token}` }),
                },
            });

            if (!response.ok) throw new Error("Failed to load preferences");

            const data = await response.json();
            setPreferences({
                notify_new_users: data.notify_new_users ?? true,
                notify_security_alerts: data.notify_security_alerts ?? true,
                notify_new_servers: data.notify_new_servers ?? false,
                notify_system_events: data.notify_system_events ?? true
            });
        } catch (error: any) {
            setMessage("❌ Failed to load preferences: " + error.message);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
            const response = await fetch(`${API_BASE_URL}/users/me/preferences`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && { "Authorization": `Bearer ${token}` }),
                },
                body: JSON.stringify(preferences)
            });

            if (!response.ok) throw new Error("Failed to save preferences");

            setMessage("✅ Preferences saved successfully!");
            setTimeout(() => setMessage(""), 3000);
        } catch (error: any) {
            setMessage("❌ Failed to save preferences: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Only show to admins and superadmins
    if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-600" />
                    <CardTitle>Notification Preferences</CardTitle>
                </div>
                <CardDescription>
                    Configure which email notifications you want to receive
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {message && (
                    <div className={`p-3 rounded-lg ${message.startsWith("✅")
                            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                            : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                        }`}>
                        {message}
                    </div>
                )}

                <div className="space-y-4">
                    {/* New Users */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_new_users"
                                checked={preferences.notify_new_users}
                                onChange={(e) => setPreferences({ ...preferences, notify_new_users: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Mail className="h-4 w-4 text-blue-600" />
                                <label htmlFor="notify_new_users" className="font-medium cursor-pointer">
                                    New User Registrations
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Receive emails when new users register and require approval
                            </p>
                        </div>
                    </div>

                    {/* Security Alerts */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_security_alerts"
                                checked={preferences.notify_security_alerts}
                                onChange={(e) => setPreferences({ ...preferences, notify_security_alerts: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="h-4 w-4 text-red-600" />
                                <label htmlFor="notify_security_alerts" className="font-medium cursor-pointer">
                                    Security Alerts
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Important security-related notifications and alerts
                            </p>
                        </div>
                    </div>

                    {/* New Servers */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_new_servers"
                                checked={preferences.notify_new_servers}
                                onChange={(e) => setPreferences({ ...preferences, notify_new_servers: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Server className="h-4 w-4 text-green-600" />
                                <label htmlFor="notify_new_servers" className="font-medium cursor-pointer">
                                    New Servers Added
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Get notified when new servers are added to the system
                            </p>
                        </div>
                    </div>

                    {/* System Events */}
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="mt-1">
                            <input
                                type="checkbox"
                                id="notify_system_events"
                                checked={preferences.notify_system_events}
                                onChange={(e) => setPreferences({ ...preferences, notify_system_events: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className="h-4 w-4 text-purple-600" />
                                <label htmlFor="notify_system_events" className="font-medium cursor-pointer">
                                    System Events
                                </label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                General system events and important updates
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "Saving..." : "Save Preferences"}
                    </Button>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>ℹ️ Note:</strong> Email notifications will only be sent if SMTP is configured in Communication Settings.
                        You can test your email configuration from the Communication tab.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
