import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Database, Settings as SettingsIcon } from "lucide-react";

export function BackendParameters() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Parámetros del Backend
                </CardTitle>
                <CardDescription>
                    Configuración del servidor y servicios backend
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-6 border rounded-lg text-center">
                        <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">API Configuration</h3>
                        <p className="text-sm text-muted-foreground">Endpoints y versiones</p>
                    </div>
                    <div className="p-6 border rounded-lg text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Base de Datos</h3>
                        <p className="text-sm text-muted-foreground">Conexiones y pools</p>
                    </div>
                    <div className="p-6 border rounded-lg text-center">
                        <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Performance</h3>
                        <p className="text-sm text-muted-foreground">Cache y optimización</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
