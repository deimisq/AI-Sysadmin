"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function MicrosoftCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState("");

    useEffect(() => {
        const code = searchParams.get("code");
        if (code) {
            handleCallback(code);
        } else {
            setError("No authorization code received");
        }
    }, [searchParams]);

    const handleCallback = async (code: string) => {
        try {
            let apiBaseUrl = "/api/v1";
            if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                apiBaseUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
            }

            const res = await fetch(`${apiBaseUrl}/auth/microsoft/callback`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code,
                    redirect_uri: `${window.location.origin}/auth/microsoft/callback`
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Authentication failed");
            }

            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            router.push("/dashboard");
        } catch (err: any) {
            console.error("Microsoft auth error:", err);
            setError(err.message || "Failed to authenticate with Microsoft");
            setTimeout(() => router.push("/login"), 3000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Microsoft Authentication</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6">
                    {error ? (
                        <div className="text-center text-red-500 space-y-2">
                            <p className="font-medium">Authentication Failed</p>
                            <p className="text-sm">{error}</p>
                            <p className="text-xs text-muted-foreground">Redirecting to login...</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="text-muted-foreground">Completing sign in...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
