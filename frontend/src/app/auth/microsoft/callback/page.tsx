"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const errorParam = searchParams.get("error");

        if (errorParam) {
            setError(searchParams.get("error_description") || "Authentication failed");
            return;
        }

        if (code) {
            // Exchange code for token
            fetch(`/api/v1/auth/microsoft/callback?code=${code}&state=${state}`, {
                method: "GET",
            })
                .then(async (res) => {
                    if (res.ok) {
                        const data = await res.json();
                        localStorage.setItem("token", data.access_token);
                        router.push("/dashboard");
                    } else {
                        const data = await res.json();
                        setError(data.detail || "Authentication failed");
                    }
                })
                .catch((err) => {
                    setError("Network error occurred");
                });
        }
    }, [searchParams, router]);

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <Card className="w-[400px]">
                    <CardHeader>
                        <CardTitle className="text-red-500">Authentication Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                        <button
                            onClick={() => router.push("/login")}
                            className="mt-4 w-full rounded bg-primary px-4 py-2 text-white hover:bg-primary/90"
                        >
                            Back to Login
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
            <Card className="w-[400px]">
                <CardContent className="flex flex-col items-center py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Completing sign in...</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function MicrosoftCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
