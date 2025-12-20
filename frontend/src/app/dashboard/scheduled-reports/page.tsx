"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api";
import { ScheduledReports } from "@/components/admin/scheduled-reports";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n-context";

export default function ScheduledReportsPage() {
    const router = useRouter();
    const { t } = useI18n();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await fetchCurrentUser();
            setCurrentUser(user);
            // All users can access - they'll see only their reports
            // Admins will see all reports
        } catch (error: any) {
            console.error("Failed to load user data", error);
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">{t.common.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-6xl mx-auto">
                    <ScheduledReports currentUser={currentUser} />
                </div>
            </div>
        </div>
    );
}
