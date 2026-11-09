"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

function VerifyEmailPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error" | "missing_token">("loading");
    const [message, setMessage] = useState("");
    const verifyCalled = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus("missing_token");
            return;
        }

        if (verifyCalled.current) return;
        verifyCalled.current = true;

        const verifyToken = async () => {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
            try {
                const res = await fetch(`${apiBaseUrl}/auth/verify-email?token=${token}`, {
                    method: "POST"
                });

                const data = await res.json();

                if (res.ok) {
                    setStatus("success");
                    toast.success("Cuenta verificada exitosamente");
                } else {
                    setStatus("error");
                    setMessage(data.detail || "Error al verificar el token");
                }
            } catch (error) {
                setStatus("error");
                setMessage("Error de conexión con el servidor");
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        {status === "loading" && <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />}
                        {status === "success" && <CheckCircle2 className="h-12 w-12 text-green-500" />}
                        {status === "error" && <XCircle className="h-12 w-12 text-red-500" />}
                        {status === "missing_token" && <Mail className="h-12 w-12 text-gray-500" />}
                    </div>
                    <CardTitle>
                        {status === "loading" && "Verificando cuenta..."}
                        {status === "success" && "¡Cuenta Verificada!"}
                        {status === "error" && "Error de Verificación"}
                        {status === "missing_token" && "Verificación de Correo"}
                    </CardTitle>
                    <CardDescription>
                        {status === "loading" && "Por favor espera mientras validamos tu token."}
                        {status === "success" && "Tu correo ha sido confirmado correctamente. Ya puedes acceder al sistema."}
                        {status === "error" && message}
                        {status === "missing_token" && "No se encontró un token de verificación. Revisa el enlace en tu correo."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {status === "success" && (
                        <Button className="w-full" onClick={() => router.push("/login")}>
                            Ir al Login
                        </Button>
                    )}
                    {(status === "error" || status === "missing_token") && (
                        <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                            Volver al Inicio
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return <Suspense fallback={<div role="status">Cargando...</div>}><VerifyEmailPageContent /></Suspense>;
}
