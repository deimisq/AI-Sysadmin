"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Laptop } from "lucide-react";

export default function ServerConsolePage() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full w-fit mb-4">
                        <Laptop className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle>Funcionalidad de Escritorio</CardTitle>
                    <CardDescription>
                        La consola SSH y el chat con IA requieren la aplicación de escritorio para funcionar de forma segura y directa.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Por favor, descarga la aplicación de escritorio para acceder a esta función.
                    </p>
                    <div className="flex flex-col gap-2">
                        <Button onClick={() => router.push("/")} className="w-full">
                            Descargar App
                        </Button>
                        <Button variant="outline" onClick={() => router.back()} className="w-full">
                            Volver al Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
